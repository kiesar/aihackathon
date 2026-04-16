import { describe, it, expect } from "vitest";
import {
  validateRequired,
  validateDateOfBirth,
  validatePostcode,
  validateCostAmount,
  validateEmail,
  validateUkPhoneNumber,
} from "./validation";

describe("validateRequired", () => {
  it("returns error for empty string", () => {
    const result = validateRequired("", "forenames", "your forename(s)");
    expect(result).toEqual({ field: "forenames", message: "Enter your forename(s)" });
  });

  it("returns error for whitespace-only string", () => {
    expect(validateRequired("   ", "surname", "your surname")).not.toBeNull();
  });

  it("returns error for undefined", () => {
    expect(validateRequired(undefined, "field", "a value")).not.toBeNull();
  });

  it("returns error for null", () => {
    expect(validateRequired(null, "field", "a value")).not.toBeNull();
  });

  it("returns null for a valid value", () => {
    expect(validateRequired("John", "forenames", "your forename(s)")).toBeNull();
  });
});

describe("validateDateOfBirth", () => {
  it("returns error for empty string", () => {
    expect(validateDateOfBirth("")).not.toBeNull();
  });

  it("returns error for invalid format (YYYY-MM-DD)", () => {
    expect(validateDateOfBirth("2000-01-15")).not.toBeNull();
  });

  it("returns error for non-existent date (31/02/2000)", () => {
    const result = validateDateOfBirth("31/02/2000");
    expect(result).not.toBeNull();
    expect(result!.message).toContain("valid date");
  });

  it("returns error for month 13", () => {
    expect(validateDateOfBirth("15/13/2000")).not.toBeNull();
  });

  it("returns error for day 0", () => {
    expect(validateDateOfBirth("00/06/2000")).not.toBeNull();
  });

  it("returns error for applicant under 16", () => {
    // Build a date that is 15 years ago today
    const now = new Date();
    const y = now.getFullYear() - 15;
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const result = validateDateOfBirth(`${d}/${m}/${y}`);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("at least 16");
  });

  it("returns null for valid date with age >= 16", () => {
    expect(validateDateOfBirth("15/01/2000")).toBeNull();
  });

  it("accepts leap day 29/02/2000", () => {
    expect(validateDateOfBirth("29/02/2000")).toBeNull();
  });

  it("rejects 29/02/2001 (not a leap year)", () => {
    expect(validateDateOfBirth("29/02/2001")).not.toBeNull();
  });

  it("returns null for someone exactly 16 today", () => {
    const now = new Date();
    const y = now.getFullYear() - 16;
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    expect(validateDateOfBirth(`${d}/${m}/${y}`)).toBeNull();
  });
});

describe("validatePostcode", () => {
  it("returns error for empty string", () => {
    expect(validatePostcode("")).not.toBeNull();
  });

  it("accepts SW1A 1AA", () => {
    expect(validatePostcode("SW1A 1AA")).toBeNull();
  });

  it("accepts EC1A 1BB", () => {
    expect(validatePostcode("EC1A 1BB")).toBeNull();
  });

  it("accepts M1 1AA (short format)", () => {
    expect(validatePostcode("M1 1AA")).toBeNull();
  });

  it("accepts B33 8TH", () => {
    expect(validatePostcode("B33 8TH")).toBeNull();
  });

  it("accepts lowercase sw1a 1aa", () => {
    expect(validatePostcode("sw1a 1aa")).toBeNull();
  });

  it("accepts without space SW1A1AA", () => {
    expect(validatePostcode("SW1A1AA")).toBeNull();
  });

  it("rejects invalid postcode 12345", () => {
    expect(validatePostcode("12345")).not.toBeNull();
  });

  it("rejects AAAA AAAA", () => {
    expect(validatePostcode("AAAA AAAA")).not.toBeNull();
  });
});

describe("validateCostAmount", () => {
  it("returns error for empty string", () => {
    expect(validateCostAmount("")).not.toBeNull();
  });

  it("accepts 125.50", () => {
    expect(validateCostAmount("125.50")).toBeNull();
  });

  it("accepts 100", () => {
    expect(validateCostAmount("100")).toBeNull();
  });

  it("accepts 0.99", () => {
    expect(validateCostAmount("0.99")).toBeNull();
  });

  it("rejects negative amount", () => {
    expect(validateCostAmount("-10")).not.toBeNull();
  });

  it("rejects zero", () => {
    const result = validateCostAmount("0");
    expect(result).not.toBeNull();
    expect(result!.message).toContain("greater than zero");
  });

  it("rejects more than 2 decimal places", () => {
    const result = validateCostAmount("10.123");
    expect(result).not.toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(validateCostAmount("abc")).not.toBeNull();
  });

  it("accepts single decimal place 5.5", () => {
    expect(validateCostAmount("5.5")).toBeNull();
  });
});

describe("validateEmail", () => {
  it("returns error for empty string", () => {
    expect(validateEmail("")).not.toBeNull();
  });

  it("accepts valid email", () => {
    expect(validateEmail("test@example.com")).toBeNull();
  });

  it("accepts email with subdomain", () => {
    expect(validateEmail("user@mail.example.co.uk")).toBeNull();
  });

  it("rejects missing @", () => {
    expect(validateEmail("testexample.com")).not.toBeNull();
  });

  it("rejects missing domain", () => {
    expect(validateEmail("test@")).not.toBeNull();
  });

  it("rejects missing TLD", () => {
    expect(validateEmail("test@example")).not.toBeNull();
  });
});

describe("validateUkPhoneNumber", () => {
  it("returns error for empty string", () => {
    expect(validateUkPhoneNumber("")).not.toBeNull();
  });

  it("accepts 07700 900000", () => {
    expect(validateUkPhoneNumber("07700 900000")).toBeNull();
  });

  it("accepts 07700900000 (no space)", () => {
    expect(validateUkPhoneNumber("07700900000")).toBeNull();
  });

  it("accepts +447700900000", () => {
    expect(validateUkPhoneNumber("+447700900000")).toBeNull();
  });

  it("accepts 00447700900000", () => {
    expect(validateUkPhoneNumber("00447700900000")).toBeNull();
  });

  it("rejects landline 020 7946 0958", () => {
    expect(validateUkPhoneNumber("020 7946 0958")).not.toBeNull();
  });

  it("rejects too few digits", () => {
    expect(validateUkPhoneNumber("0770090")).not.toBeNull();
  });

  it("rejects non-numeric", () => {
    expect(validateUkPhoneNumber("phone number")).not.toBeNull();
  });
});
