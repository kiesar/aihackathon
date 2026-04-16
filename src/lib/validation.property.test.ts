import { describe, expect } from "vitest";
import { it, fc } from "@fast-check/vitest";
import {
  validateDateOfBirth,
  validatePostcode,
  validateCostAmount,
} from "./validation";

// ── Helpers ─────────────────────────────────────────────────

/** Check whether a year is a leap year */
function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Days in a given month (1-indexed) for a given year */
function daysInMonth(month: number, year: number): number {
  const dim = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return dim[month - 1];
}

/** Compute age today given a birth date */
function ageOn(day: number, month: number, year: number): number {
  const today = new Date();
  const todayD = today.getDate();
  const todayM = today.getMonth() + 1;
  const todayY = today.getFullYear();
  let age = todayY - year;
  if (todayM < month || (todayM === month && todayD < day)) {
    age--;
  }
  return age;
}

// ── Arbitraries ─────────────────────────────────────────────

/** Generate a valid DD/MM/YYYY date string where age >= 16 */
const arbValidDob = fc
  .record({
    year: fc.integer({ min: 1900, max: new Date().getFullYear() - 16 }),
    month: fc.integer({ min: 1, max: 12 }),
  })
  .chain(({ year, month }) =>
    fc.record({
      year: fc.constant(year),
      month: fc.constant(month),
      day: fc.integer({ min: 1, max: daysInMonth(month, year) }),
    })
  )
  .filter(({ day, month, year }) => ageOn(day, month, year) >= 16)
  .map(({ day, month, year }) => {
    const dd = String(day).padStart(2, "0");
    const mm = String(month).padStart(2, "0");
    return `${dd}/${mm}/${year}`;
  });

/** Generate a valid DD/MM/YYYY date string where age < 16 */
const arbUnderageDob = fc
  .record({
    year: fc.integer({ min: new Date().getFullYear() - 15, max: new Date().getFullYear() }),
    month: fc.integer({ min: 1, max: 12 }),
  })
  .chain(({ year, month }) =>
    fc.record({
      year: fc.constant(year),
      month: fc.constant(month),
      day: fc.integer({ min: 1, max: daysInMonth(month, year) }),
    })
  )
  .filter(({ day, month, year }) => ageOn(day, month, year) < 16 && ageOn(day, month, year) >= 0)
  .map(({ day, month, year }) => {
    const dd = String(day).padStart(2, "0");
    const mm = String(month).padStart(2, "0");
    return `${dd}/${mm}/${year}`;
  });

/** Generate an invalid date format string (not DD/MM/YYYY) */
const arbInvalidDateFormat = fc.oneof(
  // Wrong separators
  fc.tuple(
    fc.integer({ min: 1, max: 28 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1900, max: 2020 })
  ).map(([d, m, y]) => `${d}-${m}-${y}`),
  // YYYY-MM-DD format
  fc.tuple(
    fc.integer({ min: 1900, max: 2020 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 })
  ).map(([y, m, d]) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`),
  // Random non-date strings
  fc.stringOf(fc.constantFrom("a", "b", "c", "1", "2", " "), { minLength: 1, maxLength: 15 }),
);

/** Generate an impossible calendar date in DD/MM/YYYY format (e.g. 31/02/2000) */
const arbInvalidCalendarDate = fc.oneof(
  // Month out of range
  fc.integer({ min: 13, max: 99 }).map((m) => `15/${String(m).padStart(2, "0")}/2000`),
  // Day 0
  fc.integer({ min: 1, max: 12 }).map((m) => `00/${String(m).padStart(2, "0")}/2000`),
  // Feb 29 on non-leap year
  fc.constantFrom("29/02/2001", "29/02/1900", "29/02/2003"),
  // Day 31 on 30-day months
  fc.constantFrom("31/04/2000", "31/06/2000", "31/09/2000", "31/11/2000"),
);

// UK postcode regex — same as in validation.ts
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

/** Generate a valid UK postcode */
const arbValidPostcode = fc.oneof(
  // A9 9AA format (e.g. M1 1AA)
  fc.tuple(
    fc.constantFrom("A", "B", "E", "G", "L", "M", "N", "S", "W"),
    fc.integer({ min: 0, max: 9 }),
    fc.integer({ min: 0, max: 9 }),
    fc.constantFrom("A", "B", "D", "E", "F", "G", "H", "J", "L", "N", "P", "R", "S", "T", "U", "W"),
    fc.constantFrom("A", "B", "D", "E", "F", "G", "H", "J", "L", "N", "P", "R", "S", "T", "U", "W"),
    fc.constantFrom(" ", ""),
  ).map(([a, n1, n2, l1, l2, sp]) => `${a}${n1}${sp}${n2}${l1}${l2}`),
  // AA9 9AA format (e.g. SW1 1AA)
  fc.tuple(
    fc.constantFrom("SW", "EC", "WC", "SE", "NW", "BR", "CR", "DA"),
    fc.integer({ min: 0, max: 9 }),
    fc.integer({ min: 0, max: 9 }),
    fc.constantFrom("A", "B", "D", "E", "H", "J", "L", "N", "P", "R", "T", "W"),
    fc.constantFrom("A", "B", "D", "E", "H", "J", "L", "N", "P", "R", "T", "W"),
    fc.constantFrom(" ", ""),
  ).map(([aa, n1, n2, l1, l2, sp]) => `${aa}${n1}${sp}${n2}${l1}${l2}`),
  // AA9A 9AA format (e.g. SW1A 1AA)
  fc.tuple(
    fc.constantFrom("SW", "EC", "WC"),
    fc.integer({ min: 0, max: 9 }),
    fc.constantFrom("A", "B", "C", "E", "H", "V", "W"),
    fc.integer({ min: 0, max: 9 }),
    fc.constantFrom("A", "B", "D", "E", "H", "J", "L", "N", "P", "R", "T", "W"),
    fc.constantFrom("A", "B", "D", "E", "H", "J", "L", "N", "P", "R", "T", "W"),
    fc.constantFrom(" ", ""),
  ).map(([aa, n1, a, n2, l1, l2, sp]) => `${aa}${n1}${a}${sp}${n2}${l1}${l2}`),
);

/** Generate a string that does NOT match the UK postcode regex */
const arbInvalidPostcode = fc.oneof(
  // Pure digits
  fc.stringOf(fc.constantFrom("0", "1", "2", "3", "4", "5"), { minLength: 3, maxLength: 8 }),
  // All letters
  fc.stringOf(fc.constantFrom("A", "B", "C", "D", "E", "F"), { minLength: 3, maxLength: 8 }),
  // Too short
  fc.constantFrom("A", "1", "AB"),
  // Clearly wrong patterns
  fc.constantFrom("123 456", "AAAA AAAA", "1A1 A1A", "!!!!", "AB CD EF"),
).filter((s) => !UK_POSTCODE_REGEX.test(s.trim()));

/** Generate a valid cost amount string (positive, ≤ 2 decimal places) */
const arbValidCostAmount = fc.oneof(
  // Integer amounts
  fc.integer({ min: 1, max: 999999 }).map(String),
  // 1 decimal place
  fc.tuple(
    fc.integer({ min: 0, max: 99999 }),
    fc.integer({ min: 0, max: 9 })
  ).filter(([whole, dec]) => whole > 0 || dec > 0)
   .map(([whole, dec]) => `${whole}.${dec}`),
  // 2 decimal places
  fc.tuple(
    fc.integer({ min: 0, max: 99999 }),
    fc.integer({ min: 0, max: 99 })
  ).filter(([whole, dec]) => whole > 0 || dec > 0)
   .map(([whole, dec]) => `${whole}.${String(dec).padStart(2, "0")}`),
);

/** Generate an invalid cost amount string */
const arbInvalidCostAmount = fc.oneof(
  // Zero
  fc.constant("0"),
  // Negative (as string)
  fc.integer({ min: 1, max: 9999 }).map((n) => `-${n}`),
  // More than 2 decimal places
  fc.tuple(
    fc.integer({ min: 0, max: 999 }),
    fc.integer({ min: 100, max: 999 })
  ).map(([whole, dec]) => `${whole}.${dec}`),
  // Non-numeric
  fc.stringOf(fc.constantFrom("a", "b", "c", "x"), { minLength: 1, maxLength: 5 }),
);

// ── Tests ───────────────────────────────────────────────────

describe("Validation — Property Tests", () => {

  // Feature: dsa-allowance-service, Property 3: Date of birth validation
  // **Validates: Requirements 1.5**
  describe("Property 3: Date of birth validation", () => {
    it.prop([arbValidDob], { numRuns: 100 })(
      "accepts any real DD/MM/YYYY date where age >= 16",
      (dob) => {
        const result = validateDateOfBirth(dob);
        expect(result).toBeNull();
      }
    );

    it.prop([arbUnderageDob], { numRuns: 100 })(
      "rejects any real DD/MM/YYYY date where age < 16",
      (dob) => {
        const result = validateDateOfBirth(dob);
        expect(result).not.toBeNull();
        expect(result!.field).toBe("dateOfBirth");
      }
    );

    it.prop([arbInvalidDateFormat], { numRuns: 100 })(
      "rejects any string that is not in DD/MM/YYYY format",
      (input) => {
        const result = validateDateOfBirth(input);
        expect(result).not.toBeNull();
      }
    );

    it.prop([arbInvalidCalendarDate], { numRuns: 100 })(
      "rejects DD/MM/YYYY strings that are not real calendar dates",
      (input) => {
        const result = validateDateOfBirth(input);
        expect(result).not.toBeNull();
      }
    );
  });

  // Feature: dsa-allowance-service, Property 4: Postcode format validation
  // **Validates: Requirements 1.6**
  describe("Property 4: Postcode format validation", () => {
    it.prop([arbValidPostcode], { numRuns: 100 })(
      "accepts any string matching the UK postcode regex",
      (postcode) => {
        // Sanity check: our generator produces valid postcodes
        expect(UK_POSTCODE_REGEX.test(postcode.trim())).toBe(true);
        const result = validatePostcode(postcode);
        expect(result).toBeNull();
      }
    );

    it.prop([arbInvalidPostcode], { numRuns: 100 })(
      "rejects any string that does not match the UK postcode regex",
      (input) => {
        const result = validatePostcode(input);
        expect(result).not.toBeNull();
        expect(result!.field).toBe("postcode");
      }
    );
  });

  // Feature: dsa-allowance-service, Property 6: Cost amount validation
  // **Validates: Requirements 2.3**
  describe("Property 6: Cost amount validation", () => {
    it.prop([arbValidCostAmount], { numRuns: 100 })(
      "accepts any positive numeric string with <= 2 decimal places",
      (amount) => {
        const result = validateCostAmount(amount);
        expect(result).toBeNull();
      }
    );

    it.prop([arbInvalidCostAmount], { numRuns: 100 })(
      "rejects zero, negative, >2 decimal places, or non-numeric strings",
      (amount) => {
        const result = validateCostAmount(amount);
        expect(result).not.toBeNull();
        expect(result!.field).toBe("amount");
      }
    );
  });
});
