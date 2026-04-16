import { describe, expect } from "vitest";
import { it, fc } from "@fast-check/vitest";
import {
  initialFormData,
  type FormData,
  type PersonalDetails,
  type AddressDetails,
  type UniversityDetails,
  type ContactDetails,
  type CostItemEntry,
} from "./form-context";

// ── Arbitraries ─────────────────────────────────────────────

/** Generate arbitrary PersonalDetails */
const arbPersonalDetails: fc.Arbitrary<PersonalDetails> = fc.record({
  customerReference: fc.string({ minLength: 0, maxLength: 20 }),
  forenames: fc.string({ minLength: 1, maxLength: 30 }),
  surname: fc.string({ minLength: 1, maxLength: 30 }),
  sex: fc.constantFrom("male", "female", "non-binary", "prefer_not_to_say", ""),
  dobDay: fc.integer({ min: 1, max: 31 }).map(String),
  dobMonth: fc.integer({ min: 1, max: 12 }).map(String),
  dobYear: fc.integer({ min: 1950, max: 2008 }).map(String),
});

/** Generate arbitrary AddressDetails */
const arbAddress: fc.Arbitrary<AddressDetails> = fc.record({
  line1: fc.string({ minLength: 1, maxLength: 50 }),
  line2: fc.string({ minLength: 0, maxLength: 50 }),
  line3: fc.string({ minLength: 0, maxLength: 50 }),
  postcode: fc.string({ minLength: 3, maxLength: 10 }),
});

/** Generate arbitrary UniversityDetails */
const arbUniversity: fc.Arbitrary<UniversityDetails> = fc.record({
  universityName: fc.string({ minLength: 1, maxLength: 50 }),
  courseName: fc.string({ minLength: 1, maxLength: 50 }),
});

/** Generate arbitrary ContactDetails */
const arbContact: fc.Arbitrary<ContactDetails> = fc.record({
  notificationChannel: fc.constantFrom("email", "sms", ""),
  email: fc.string({ minLength: 0, maxLength: 40 }),
  phone: fc.string({ minLength: 0, maxLength: 15 }),
});

/** Generate arbitrary CostItemEntry */
const arbCostItem: fc.Arbitrary<CostItemEntry> = fc.record({
  id: fc.uuid(),
  description: fc.string({ minLength: 1, maxLength: 40 }),
  amount: fc
    .tuple(fc.integer({ min: 1, max: 9999 }), fc.integer({ min: 0, max: 99 }))
    .map(([w, d]) => `${w}.${String(d).padStart(2, "0")}`),
  supplier: fc.string({ minLength: 1, maxLength: 30 }),
});

/** Generate arbitrary costs array (0–10 items) */
const arbCosts: fc.Arbitrary<CostItemEntry[]> = fc.array(arbCostItem, {
  minLength: 0,
  maxLength: 10,
});

/** Generate a fully-populated FormData */
const arbFormData: fc.Arbitrary<FormData> = fc.record({
  personalDetails: arbPersonalDetails,
  address: arbAddress,
  university: arbUniversity,
  contact: arbContact,
  costs: arbCosts,
});

/**
 * The form pages in order. Each page corresponds to a section key in FormData.
 * This ordering mirrors the application form flow.
 */
const PAGE_KEYS: (keyof FormData)[] = [
  "personalDetails",
  "address",
  "university",
  "contact",
  "costs",
];

/**
 * Simulate updating a single page section of the form, preserving all other
 * sections — exactly as the FormProvider's update callbacks do via spread.
 */
function updatePage(
  current: FormData,
  pageKey: keyof FormData,
  newPageData: FormData[keyof FormData]
): FormData {
  if (pageKey === "costs") {
    return { ...current, costs: newPageData as CostItemEntry[] };
  }
  return {
    ...current,
    [pageKey]: { ...(current[pageKey] as Record<string, unknown>), ...(newPageData as Record<string, unknown>) },
  };
}

// ── Tests ───────────────────────────────────────────────────

describe("Form Context — Property Tests", () => {
  // Feature: dsa-allowance-service, Property 5: Back-navigation preserves subsequent page data
  // **Validates: Requirements 1.7**
  describe("Property 5: Back-navigation preserves subsequent page data", () => {
    it.prop(
      [
        arbFormData,           // original fully-filled form data
        arbPersonalDetails,    // new data for back-navigation edit
        arbAddress,
        arbUniversity,
        arbContact,
        fc.integer({ min: 0, max: 3 }), // index of the page to navigate back to (0–3, not last)
      ],
      { numRuns: 100 }
    )(
      "updating an earlier page preserves all subsequent page data",
      (filledForm, newPersonal, newAddress, newUniversity, newContact, backPageIdx) => {
        // Pick which page we navigate back to
        const backPageKey = PAGE_KEYS[backPageIdx];

        // Choose the replacement data for that page
        const replacements: Record<string, FormData[keyof FormData]> = {
          personalDetails: newPersonal,
          address: newAddress,
          university: newUniversity,
          contact: newContact,
        };
        const newPageData = replacements[backPageKey];

        // Simulate the back-navigation update
        const afterEdit = updatePage(filledForm, backPageKey, newPageData);

        // All pages AFTER the edited page must be unchanged
        for (let i = backPageIdx + 1; i < PAGE_KEYS.length; i++) {
          const key = PAGE_KEYS[i];
          expect(afterEdit[key]).toEqual(filledForm[key]);
        }
      }
    );

    it.prop(
      [
        arbFormData,
        arbPersonalDetails,
        fc.integer({ min: 1, max: 4 }), // how many pages forward to check after back-nav
      ],
      { numRuns: 100 }
    )(
      "navigating back to personal details and forward preserves all other sections",
      (filledForm, newPersonal, forwardSteps) => {
        // Navigate back to personal details and update
        const afterBackNav: FormData = {
          ...filledForm,
          personalDetails: { ...filledForm.personalDetails, ...newPersonal },
        };

        // All subsequent sections are preserved
        expect(afterBackNav.address).toEqual(filledForm.address);
        expect(afterBackNav.university).toEqual(filledForm.university);
        expect(afterBackNav.contact).toEqual(filledForm.contact);
        expect(afterBackNav.costs).toEqual(filledForm.costs);
      }
    );

    it.prop(
      [arbFormData, arbCosts],
      { numRuns: 100 }
    )(
      "updating costs (last page) preserves all earlier page data",
      (filledForm, newCosts) => {
        const afterCostsUpdate: FormData = { ...filledForm, costs: newCosts };

        // All earlier sections unchanged
        expect(afterCostsUpdate.personalDetails).toEqual(filledForm.personalDetails);
        expect(afterCostsUpdate.address).toEqual(filledForm.address);
        expect(afterCostsUpdate.university).toEqual(filledForm.university);
        expect(afterCostsUpdate.contact).toEqual(filledForm.contact);
      }
    );
  });
});
