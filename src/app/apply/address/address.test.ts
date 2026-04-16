import { describe, it, expect } from "vitest";
import { validateRequired, validatePostcode, ValidationError } from "@/lib/validation";

/**
 * Tests for the Address page validation logic.
 * The page validates: address line 1 (required) and postcode (required, UK format).
 * Address lines 2 and 3 are optional.
 */

// Helper that mirrors the page's validation logic
function validateAddress(input: {
  line1: string;
  postcode: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  const line1Err = validateRequired(input.line1, "line1", "your address line 1");
  if (line1Err) errors.push(line1Err);

  const postcodeErr = validatePostcode(input.postcode, "postcode");
  if (postcodeErr) errors.push(postcodeErr);

  return errors;
}

describe("Address — Validation", () => {
  const validInput = {
    line1: "10 Downing Street",
    postcode: "SW1A 2AA",
  };

  it("accepts valid input with no errors", () => {
    const errors = validateAddress(validInput);
    expect(errors).toHaveLength(0);
  });

  it("requires address line 1", () => {
    const errors = validateAddress({ ...validInput, line1: "" });
    expect(errors.some((e) => e.field === "line1")).toBe(true);
  });

  it("requires postcode", () => {
    const errors = validateAddress({ ...validInput, postcode: "" });
    expect(errors.some((e) => e.field === "postcode")).toBe(true);
  });

  it("rejects invalid postcode format", () => {
    const errors = validateAddress({ ...validInput, postcode: "INVALID" });
    const postcodeErr = errors.find((e) => e.field === "postcode");
    expect(postcodeErr).toBeDefined();
    expect(postcodeErr!.message).toContain("real UK postcode");
  });

  it("accepts postcode without space", () => {
    const errors = validateAddress({ ...validInput, postcode: "SW1A2AA" });
    expect(errors).toHaveLength(0);
  });

  it("accepts lowercase postcode", () => {
    const errors = validateAddress({ ...validInput, postcode: "sw1a 2aa" });
    expect(errors).toHaveLength(0);
  });

  it("collects all errors when both required fields are blank", () => {
    const errors = validateAddress({ line1: "", postcode: "" });
    const fields = errors.map((e) => e.field);
    expect(fields).toContain("line1");
    expect(fields).toContain("postcode");
  });
});
