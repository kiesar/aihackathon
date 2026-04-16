import { describe, expect, beforeEach, vi } from "vitest";
import { it, fc } from "@fast-check/vitest";
import { createPolicyEngine } from "./policy-engine";
import type { CaseType, PolicyExtract } from "@/types";

// ── Mock data store ─────────────────────────────────────────
vi.mock("@/lib/data-store", () => ({
  readPolicyExtracts: vi.fn(),
}));

import { readPolicyExtracts } from "@/lib/data-store";

const mockReadPolicyExtracts = readPolicyExtracts as ReturnType<typeof vi.fn>;

// ── All valid case types ────────────────────────────────────
const ALL_CASE_TYPES: CaseType[] = [
  "dsa_application",
  "allowance_review",
  "compliance_check",
];

// ── Arbitraries ─────────────────────────────────────────────
const arbCaseType = fc.constantFrom(...ALL_CASE_TYPES);

const arbPolicyExtract: fc.Arbitrary<PolicyExtract> = fc.record({
  policy_id: fc.string({ minLength: 1, maxLength: 20 }).map((s) => `POL-${s}`),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  applicable_case_types: fc
    .subarray(ALL_CASE_TYPES, { minLength: 1 })
    .map((arr) => [...arr] as CaseType[]),
  body: fc.string({ minLength: 1, maxLength: 200 }),
  relevant_states: fc.constantFrom(undefined, [
    "awaiting_evidence" as const,
    "under_review" as const,
  ]),
});

const arbPolicyExtracts = fc.array(arbPolicyExtract, {
  minLength: 0,
  maxLength: 20,
});

// ── Tests ───────────────────────────────────────────────────

describe("PolicyEngine — Property Tests", () => {
  const engine = createPolicyEngine();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Feature: dsa-allowance-service, Property 19: Policy engine returns all and only matching policies
  // **Validates: Requirements 7.3**
  describe("Property 19: Policy engine returns all and only matching policies", () => {
    it.prop([arbCaseType, arbPolicyExtracts], { numRuns: 100 })(
      "getPoliciesForCase returns all extracts where case type is in applicable_case_types and none where it is not",
      (caseType, extracts) => {
        mockReadPolicyExtracts.mockReturnValue(extracts);

        const result = engine.getPoliciesForCase(caseType);

        // Every returned policy must include the queried case type
        for (const policy of result) {
          expect(policy.applicable_case_types).toContain(caseType);
        }

        // Every policy in the source that includes the case type must be returned
        const expectedIds = extracts
          .filter((p) => p.applicable_case_types.includes(caseType))
          .map((p) => p.policy_id);

        const resultIds = result.map((p) => p.policy_id);
        expect(resultIds).toEqual(expectedIds);

        // No policy without the case type should appear
        for (const policy of result) {
          expect(policy.applicable_case_types.includes(caseType)).toBe(true);
        }
      }
    );
  });
});
