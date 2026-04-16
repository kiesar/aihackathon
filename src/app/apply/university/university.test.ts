import { describe, it, expect } from "vitest";
import { validateRequired, ValidationError } from "@/lib/validation";

/**
 * Tests for the University page validation logic.
 * The page validates: university name (required) and course name (required).
 */

// Helper that mirrors the page's validation logic
function validateUniversity(input: {
  universityName: string;
  courseName: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  const uniErr = validateRequired(input.universityName, "universityName", "your university name");
  if (uniErr) errors.push(uniErr);

  const courseErr = validateRequired(input.courseName, "courseName", "your course name");
  if (courseErr) errors.push(courseErr);

  return errors;
}

describe("University — Validation", () => {
  const validInput = {
    universityName: "University of Manchester",
    courseName: "Computer Science BSc",
  };

  it("accepts valid input with no errors", () => {
    const errors = validateUniversity(validInput);
    expect(errors).toHaveLength(0);
  });

  it("requires university name", () => {
    const errors = validateUniversity({ ...validInput, universityName: "" });
    expect(errors.some((e) => e.field === "universityName")).toBe(true);
  });

  it("requires course name", () => {
    const errors = validateUniversity({ ...validInput, courseName: "" });
    expect(errors.some((e) => e.field === "courseName")).toBe(true);
  });

  it("rejects whitespace-only university name", () => {
    const errors = validateUniversity({ ...validInput, universityName: "   " });
    expect(errors.some((e) => e.field === "universityName")).toBe(true);
  });

  it("rejects whitespace-only course name", () => {
    const errors = validateUniversity({ ...validInput, courseName: "   " });
    expect(errors.some((e) => e.field === "courseName")).toBe(true);
  });

  it("collects all errors when both fields are blank", () => {
    const errors = validateUniversity({ universityName: "", courseName: "" });
    const fields = errors.map((e) => e.field);
    expect(fields).toContain("universityName");
    expect(fields).toContain("courseName");
    expect(errors).toHaveLength(2);
  });
});
