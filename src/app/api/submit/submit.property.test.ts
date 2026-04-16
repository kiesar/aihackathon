import { describe, expect } from "vitest";
import { it, fc } from "@fast-check/vitest";
import { generateCaseReference } from "./route";
import type { Case } from "@/types";

// ── Helpers ─────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const CASE_REF_REGEX = /^DSA-\d{4}-\d{5}$/;

/**
 * Build a minimal Case stub with just the case_id set.
 * generateCaseReference only inspects case_id, so other fields
 * can be stubbed with safe defaults.
 */
function stubCase(caseId: string): Case {
  return {
    case_id: caseId,
    case_type: "dsa_application",
    status: "awaiting_evidence",
    applicant: {
      name: "Test User",
      forenames: "Test",
      surname: "User",
      reference: "",
      date_of_birth: "2000-01-01",
      sex: "male",
      address: { line1: "1 High St", postcode: "SW1A 1AA" },
      university: "UCL",
      course: "CS",
      notification_channel: "email",
      email: "test@example.com",
    },
    assigned_to: "jsmith",
    created_date: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    timeline: [],
    case_notes: "",
  };
}

// ── Arbitraries ─────────────────────────────────────────────

/** Generate a list of unique sequence numbers for existing cases in the current year. */
const arbExistingSeqs = fc
  .uniqueArray(fc.integer({ min: 1, max: 99998 }), { minLength: 0, maxLength: 50 })
  .map((seqs) =>
    seqs.map((seq) =>
      stubCase(`DSA-${CURRENT_YEAR}-${String(seq).padStart(5, "0")}`)
    )
  );

// ── Tests ───────────────────────────────────────────────────

describe("Submission Service — Property Tests", () => {
  // Feature: dsa-allowance-service, Property 9: Case reference format and uniqueness
  // **Validates: Requirements 4.1, 4.6**
  describe("Property 9: Case reference format and uniqueness", () => {
    it.prop([arbExistingSeqs], { numRuns: 100 })(
      "each generated Case_Reference matches DSA-YYYY-NNNNN and is distinct from all existing references",
      (existingCases) => {
        const ref = generateCaseReference(existingCases);

        // (a) Format: matches DSA-YYYY-NNNNN
        expect(ref).toMatch(CASE_REF_REGEX);

        // Year portion is the current year
        const yearPart = parseInt(ref.split("-")[1], 10);
        expect(yearPart).toBe(CURRENT_YEAR);

        // Sequence portion is a valid 5-digit zero-padded number
        const seqPart = parseInt(ref.split("-")[2], 10);
        expect(seqPart).toBeGreaterThanOrEqual(1);
        expect(seqPart).toBeLessThanOrEqual(99999);

        // (b) Uniqueness: distinct from every existing case_id
        const existingIds = existingCases.map((c) => c.case_id);
        expect(existingIds).not.toContain(ref);
      }
    );

    it.prop(
      [fc.integer({ min: 2, max: 20 })],
      { numRuns: 100 }
    )(
      "generating N references sequentially produces N distinct values all matching DSA-YYYY-NNNNN",
      (n) => {
        const refs: string[] = [];
        let cases: Case[] = [];

        for (let i = 0; i < n; i++) {
          const ref = generateCaseReference(cases);

          // Format check on every generated reference
          expect(ref).toMatch(CASE_REF_REGEX);

          refs.push(ref);
          cases = [...cases, stubCase(ref)];
        }

        // All references are unique
        const uniqueRefs = new Set(refs);
        expect(uniqueRefs.size).toBe(n);
      }
    );
  });
});
