import { describe, it, expect } from "vitest";
import { validateRequired, validateDateOfBirth, ValidationError } from "@/lib/validation";

/**
 * Tests for the Personal Details page validation logic.
 * The page validates: forenames (required), surname (required),
 * sex (required), and date of birth (DD/MM/YYYY, age >= 16).
 * Customer Reference Number is optional.
 */

// Helper that mirrors the page's validation logic
function validatePersonalDetails(input: {
  forenames: string;
  surname: string;
  sex: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  const forenamesErr = validateRequired(input.forenames, "forenames", "your forename(s)");
  if (forenamesErr) errors.push(forenamesErr);

  const surnameErr = validateRequired(input.surname, "surname", "your surname");
  if (surnameErr) errors.push(surnameErr);

  const sexErr = validateRequired(input.sex, "sex", "your sex");
  if (sexErr) errors.push(sexErr);

  const dobString =
    input.dobDay && input.dobMonth && input.dobYear
      ? `${input.dobDay.padStart(2, "0")}/${input.dobMonth.padStart(2, "0")}/${input.dobYear}`
      : "";
  const dobErr = validateDateOfBirth(dobString, "dateOfBirth");
  if (dobErr) errors.push(dobErr);

  return errors;
}

describe("Personal Details — Validation", () => {
  const validInput = {
    forenames: "Jane",
    surname: "Smith",
    sex: "female",
    dobDay: "15",
    dobMonth: "06",
    dobYear: "1990",
  };

  it("accepts valid input with no errors", () => {
    const errors = validatePersonalDetails(validInput);
    expect(errors).toHaveLength(0);
  });

  it("requires forenames", () => {
    const errors = validatePersonalDetails({ ...validInput, forenames: "" });
    expect(errors.some((e) => e.field === "forenames")).toBe(true);
  });

  it("requires surname", () => {
    const errors = validatePersonalDetails({ ...validInput, surname: "" });
    expect(errors.some((e) => e.field === "surname")).toBe(true);
  });

  it("requires sex", () => {
    const errors = validatePersonalDetails({ ...validInput, sex: "" });
    expect(errors.some((e) => e.field === "sex")).toBe(true);
  });

  it("requires date of birth", () => {
    const errors = validatePersonalDetails({
      ...validInput,
      dobDay: "",
      dobMonth: "",
      dobYear: "",
    });
    expect(errors.some((e) => e.field === "dateOfBirth")).toBe(true);
  });

  it("rejects invalid date of birth (e.g. 31/02/2000)", () => {
    const errors = validatePersonalDetails({
      ...validInput,
      dobDay: "31",
      dobMonth: "02",
      dobYear: "2000",
    });
    expect(errors.some((e) => e.field === "dateOfBirth")).toBe(true);
  });

  it("rejects applicant under 16 years old", () => {
    const now = new Date();
    const errors = validatePersonalDetails({
      ...validInput,
      dobDay: String(now.getDate()),
      dobMonth: String(now.getMonth() + 1),
      dobYear: String(now.getFullYear() - 10),
    });
    const dobErr = errors.find((e) => e.field === "dateOfBirth");
    expect(dobErr).toBeDefined();
    expect(dobErr!.message).toContain("at least 16");
  });

  it("collects all errors when all required fields are blank", () => {
    const errors = validatePersonalDetails({
      forenames: "",
      surname: "",
      sex: "",
      dobDay: "",
      dobMonth: "",
      dobYear: "",
    });
    const fields = errors.map((e) => e.field);
    expect(fields).toContain("forenames");
    expect(fields).toContain("surname");
    expect(fields).toContain("sex");
    expect(fields).toContain("dateOfBirth");
  });

  it("pads single-digit day and month correctly for validation", () => {
    // Day "5" and month "3" should become "05/03/YYYY"
    const errors = validatePersonalDetails({
      ...validInput,
      dobDay: "5",
      dobMonth: "3",
    });
    expect(errors).toHaveLength(0);
  });
});
