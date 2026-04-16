import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPolicyEngine } from "./policy-engine";
import type { PolicyExtract } from "@/types";

vi.mock("@/lib/data-store", () => ({
  readPolicyExtracts: vi.fn(),
}));

import { readPolicyExtracts } from "@/lib/data-store";

const mockReadPolicyExtracts = readPolicyExtracts as ReturnType<typeof vi.fn>;

const POLICY_EXTRACTS: PolicyExtract[] = [
  {
    policy_id: "POL-BR-001",
    title: "DSA Eligibility Criteria",
    applicable_case_types: ["dsa_application"],
    body: "Eligibility criteria body.",
    relevant_states: ["awaiting_evidence", "evidence_received", "under_review"],
  },
  {
    policy_id: "POL-BR-002",
    title: "Evidence Requirements",
    applicable_case_types: ["dsa_application", "allowance_review"],
    body: "Evidence requirements body.",
    relevant_states: ["awaiting_evidence", "evidence_received"],
  },
  {
    policy_id: "POL-BR-003",
    title: "Cost Item Assessment Guidelines",
    applicable_case_types: ["dsa_application"],
    body: "Cost assessment body.",
    relevant_states: ["under_review", "awaiting_assessment"],
  },
  {
    policy_id: "POL-BR-004",
    title: "Escalation Policy",
    applicable_case_types: ["dsa_application", "allowance_review", "compliance_check"],
    body: "Escalation policy body.",
    relevant_states: ["awaiting_evidence", "escalated"],
  },
  {
    policy_id: "POL-BR-005",
    title: "Compliance Check Procedures",
    applicable_case_types: ["compliance_check"],
    body: "Compliance check body.",
    relevant_states: ["under_review", "awaiting_assessment"],
  },
];

describe("PolicyEngine", () => {
  const engine = createPolicyEngine();

  beforeEach(() => {
    vi.clearAllMocks();
    mockReadPolicyExtracts.mockReturnValue(POLICY_EXTRACTS);
  });

  describe("getPoliciesForCase", () => {
    it("returns all policies applicable to dsa_application", () => {
      const policies = engine.getPoliciesForCase("dsa_application");
      expect(policies).toHaveLength(4);
      expect(policies.map((p) => p.policy_id)).toEqual([
        "POL-BR-001",
        "POL-BR-002",
        "POL-BR-003",
        "POL-BR-004",
      ]);
    });

    it("returns all policies applicable to compliance_check", () => {
      const policies = engine.getPoliciesForCase("compliance_check");
      expect(policies).toHaveLength(2);
      expect(policies.map((p) => p.policy_id)).toEqual([
        "POL-BR-004",
        "POL-BR-005",
      ]);
    });

    it("returns all policies applicable to allowance_review", () => {
      const policies = engine.getPoliciesForCase("allowance_review");
      expect(policies).toHaveLength(2);
      expect(policies.map((p) => p.policy_id)).toEqual([
        "POL-BR-002",
        "POL-BR-004",
      ]);
    });

    it("does not include policies for other case types", () => {
      const policies = engine.getPoliciesForCase("compliance_check");
      for (const p of policies) {
        expect(p.applicable_case_types).toContain("compliance_check");
      }
    });

    it("returns empty array when no policies match", () => {
      mockReadPolicyExtracts.mockReturnValue([]);
      const policies = engine.getPoliciesForCase("dsa_application");
      expect(policies).toEqual([]);
    });
  });

  describe("getRelevantClauses", () => {
    it("returns policies matching both case type and state", () => {
      const clauses = engine.getRelevantClauses("dsa_application", "under_review");
      expect(clauses).toHaveLength(2);
      expect(clauses.map((c) => c.policy_id)).toEqual([
        "POL-BR-001",
        "POL-BR-003",
      ]);
    });

    it("returns policies for awaiting_evidence state", () => {
      const clauses = engine.getRelevantClauses("dsa_application", "awaiting_evidence");
      expect(clauses).toHaveLength(3);
      for (const c of clauses) {
        expect(c.applicable_case_types).toContain("dsa_application");
        expect(c.relevant_states).toContain("awaiting_evidence");
      }
    });

    it("returns empty array when state does not match any policy", () => {
      const clauses = engine.getRelevantClauses("compliance_check", "approved");
      expect(clauses).toEqual([]);
    });

    it("excludes policies without relevant_states", () => {
      const extracts: PolicyExtract[] = [
        {
          policy_id: "POL-NO-STATES",
          title: "No states policy",
          applicable_case_types: ["dsa_application"],
          body: "Body.",
        },
        ...POLICY_EXTRACTS,
      ];
      mockReadPolicyExtracts.mockReturnValue(extracts);

      const clauses = engine.getRelevantClauses("dsa_application", "under_review");
      expect(clauses.find((c) => c.policy_id === "POL-NO-STATES")).toBeUndefined();
    });

    it("returns empty array when no policies exist", () => {
      mockReadPolicyExtracts.mockReturnValue([]);
      const clauses = engine.getRelevantClauses("dsa_application", "under_review");
      expect(clauses).toEqual([]);
    });
  });
});
