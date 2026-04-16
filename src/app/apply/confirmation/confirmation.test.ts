import { describe, it, expect } from "vitest";

/**
 * Tests for the Confirmation page logic.
 * Validates case reference display and error state handling.
 * Requirements: 4.3, 4.4
 */

function getConfirmationState(ref: string | null): "confirmation" | "error" {
  return ref ? "confirmation" : "error";
}

function formatReferenceDisplay(ref: string): string {
  return ref;
}

describe("Confirmation page — state selection", () => {
  it("shows confirmation when ref query param is present", () => {
    expect(getConfirmationState("DSA-2026-00001")).toBe("confirmation");
  });

  it("shows error when ref query param is null", () => {
    expect(getConfirmationState(null)).toBe("error");
  });

  it("shows confirmation for any non-empty ref value", () => {
    expect(getConfirmationState("DSA-2026-99999")).toBe("confirmation");
    expect(getConfirmationState("DSA-2025-00042")).toBe("confirmation");
  });

  it("shows error when ref is empty string (falsy)", () => {
    expect(getConfirmationState("")).toBe("error");
  });
});

describe("Confirmation page — reference display", () => {
  it("displays the case reference as provided", () => {
    expect(formatReferenceDisplay("DSA-2026-00001")).toBe("DSA-2026-00001");
  });

  it("preserves the exact format of the reference", () => {
    const ref = "DSA-2026-00042";
    expect(formatReferenceDisplay(ref)).toBe("DSA-2026-00042");
  });
});

describe("Confirmation page — case reference format validation", () => {
  const CASE_REF_PATTERN = /^DSA-\d{4}-\d{5}$/;

  it("valid case references match expected format", () => {
    expect(CASE_REF_PATTERN.test("DSA-2026-00001")).toBe(true);
    expect(CASE_REF_PATTERN.test("DSA-2025-99999")).toBe(true);
  });

  it("invalid case references do not match format", () => {
    expect(CASE_REF_PATTERN.test("DSA-26-001")).toBe(false);
    expect(CASE_REF_PATTERN.test("INVALID")).toBe(false);
    expect(CASE_REF_PATTERN.test("")).toBe(false);
  });
});
