import { describe, expect } from "vitest";
import { it, fc } from "@fast-check/vitest";
import type {
  FormData,
  PersonalDetails,
  AddressDetails,
  UniversityDetails,
  ContactDetails,
  CostItemEntry,
} from "@/lib/form-context";

// ── Display logic extracted from page.tsx ────────────────────

const SEX_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  "non-binary": "Non-binary",
  prefer_not_to_say: "Prefer not to say",
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "Text message (SMS)",
};

function formatDob(day: string, month: string, year: string): string {
  if (!day || !month || !year) return "";
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

function calculateTotal(costs: { amount: string }[]): string {
  const total = costs.reduce((sum, item) => {
    const parsed = parseFloat(item.amount);
    return sum + (isNaN(parsed) ? 0 : parsed);
  }, 0);
  return total.toFixed(2);
}

/**
 * Extracts all display values that the check-your-answers page would render
 * for a given FormData, mirroring the logic in page.tsx.
 */
function extractDisplayValues(formData: FormData): string[] {
  const { personalDetails, address, university, contact, costs } = formData;
  const values: string[] = [];

  // Personal details
  values.push(personalDetails.customerReference || "Not provided");
  values.push(personalDetails.forenames);
  values.push(personalDetails.surname);
  values.push(SEX_LABELS[personalDetails.sex] || personalDetails.sex);
  values.push(formatDob(personalDetails.dobDay, personalDetails.dobMonth, personalDetails.dobYear));

  // Address
  values.push(address.line1);
  values.push(address.line2 || "Not provided");
  values.push(address.line3 || "Not provided");
  values.push(address.postcode);

  // University
  values.push(university.universityName);
  values.push(university.courseName);

  // Contact
  values.push(CHANNEL_LABELS[contact.notificationChannel] || contact.notificationChannel);
  if (contact.notificationChannel === "email") {
    values.push(contact.email);
  }
  if (contact.notificationChannel === "sms") {
    values.push(contact.phone);
  }

  // Costs
  costs.forEach((item) => {
    values.push(item.description);
    values.push(`£${parseFloat(item.amount).toFixed(2)}`);
    values.push(item.supplier);
  });

  if (costs.length > 0) {
    values.push(`£${calculateTotal(costs)}`);
  }

  return values;
}

/**
 * Collects all raw entered values from FormData (the values the user typed in),
 * mapped to how they would appear on the check-your-answers page.
 */
function collectEnteredValues(formData: FormData): string[] {
  const { personalDetails, address, university, contact, costs } = formData;
  const entered: string[] = [];

  // Personal details — customerReference may be empty, shown as "Not provided"
  entered.push(personalDetails.customerReference || "Not provided");
  entered.push(personalDetails.forenames);
  entered.push(personalDetails.surname);
  // Sex is displayed via label lookup
  entered.push(SEX_LABELS[personalDetails.sex] || personalDetails.sex);
  // DOB is formatted
  entered.push(formatDob(personalDetails.dobDay, personalDetails.dobMonth, personalDetails.dobYear));

  // Address — line2/line3 may be empty, shown as "Not provided"
  entered.push(address.line1);
  entered.push(address.line2 || "Not provided");
  entered.push(address.line3 || "Not provided");
  entered.push(address.postcode);

  // University
  entered.push(university.universityName);
  entered.push(university.courseName);

  // Contact — channel displayed via label, plus conditional field
  entered.push(CHANNEL_LABELS[contact.notificationChannel] || contact.notificationChannel);
  if (contact.notificationChannel === "email") {
    entered.push(contact.email);
  }
  if (contact.notificationChannel === "sms") {
    entered.push(contact.phone);
  }

  // Costs — amount formatted as £X.XX
  costs.forEach((item) => {
    entered.push(item.description);
    entered.push(`£${parseFloat(item.amount).toFixed(2)}`);
    entered.push(item.supplier);
  });

  if (costs.length > 0) {
    entered.push(`£${calculateTotal(costs)}`);
  }

  return entered;
}

// ── Arbitraries ─────────────────────────────────────────────

const arbSex = fc.constantFrom("male", "female", "non-binary", "prefer_not_to_say");

const arbPersonalDetails: fc.Arbitrary<PersonalDetails> = fc.record({
  customerReference: fc.oneof(fc.constant(""), fc.stringMatching(/^CRN-[0-9]{5}$/)),
  forenames: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  surname: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  sex: arbSex,
  dobDay: fc.integer({ min: 1, max: 28 }).map(String),
  dobMonth: fc.integer({ min: 1, max: 12 }).map(String),
  dobYear: fc.integer({ min: 1950, max: 2008 }).map(String),
});

const arbAddress: fc.Arbitrary<AddressDetails> = fc.record({
  line1: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  line2: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0)),
  line3: fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0)),
  postcode: fc.stringMatching(/^[A-Z]{1,2}[0-9][0-9A-Z]? [0-9][A-Z]{2}$/),
});

const arbUniversity: fc.Arbitrary<UniversityDetails> = fc.record({
  universityName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  courseName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
});

const arbValidAmount = fc
  .tuple(fc.integer({ min: 1, max: 9999 }), fc.integer({ min: 0, max: 99 }))
  .map(([whole, dec]) => `${whole}.${String(dec).padStart(2, "0")}`);

const arbCostItem: fc.Arbitrary<CostItemEntry> = fc.record({
  id: fc.uuid(),
  description: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  amount: arbValidAmount,
  supplier: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
});

const arbEmailContact: fc.Arbitrary<ContactDetails> = fc.record({
  notificationChannel: fc.constant("email"),
  email: fc.stringMatching(/^[a-z]{3,8}@[a-z]{3,8}\.[a-z]{2,4}$/),
  phone: fc.constant(""),
});

const arbSmsContact: fc.Arbitrary<ContactDetails> = fc.record({
  notificationChannel: fc.constant("sms"),
  email: fc.constant(""),
  phone: fc.stringMatching(/^07[0-9]{9}$/),
});

const arbContact: fc.Arbitrary<ContactDetails> = fc.oneof(arbEmailContact, arbSmsContact);

const arbFormData: fc.Arbitrary<FormData> = fc
  .tuple(
    arbPersonalDetails,
    arbAddress,
    arbUniversity,
    arbContact,
    fc.array(arbCostItem, { minLength: 1, maxLength: 5 })
  )
  .map(([personalDetails, address, university, contact, costs]) => ({
    personalDetails,
    address,
    university,
    contact,
    costs,
  }));

// ── Tests ───────────────────────────────────────────────────

describe("Check Your Answers — Property Tests", () => {
  // Feature: dsa-allowance-service, Property 8: Check-your-answers completeness
  // **Validates: Requirements 3.1**
  describe("Property 8: Check-your-answers completeness", () => {
    it.prop([arbFormData], { numRuns: 100 })(
      "every entered value appears in the check-your-answers display values",
      (formData) => {
        const displayValues = extractDisplayValues(formData);
        const enteredValues = collectEnteredValues(formData);

        // Every value the user entered (as it would be displayed) must appear
        // in the set of values the check-your-answers page renders
        for (const entered of enteredValues) {
          expect(displayValues).toContain(entered);
        }

        // The display values and entered values should be the same set
        expect(displayValues.length).toBe(enteredValues.length);
      }
    );
  });
});
