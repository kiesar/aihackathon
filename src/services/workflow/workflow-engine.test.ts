import { describe, it, expect, beforeEach, vi } from "vitest";
import { createWorkflowEngine, WorkflowEngineError } from "./workflow-engine";
import type { Case, WorkflowStateDefinition } from "@/types";

// Mock the data store
vi.mock("@/lib/data-store", () => ({
  readWorkflowStates: vi.fn(),
  readCases: vi.fn(),
  writeCases: vi.fn(),
}));

import { readWorkflowStates, readCases, writeCases } from "@/lib/data-store";

const mockReadWorkflowStates = readWorkflowStates as ReturnType<typeof vi.fn>;
const mockReadCases = readCases as ReturnType<typeof vi.fn>;
const mockWriteCases = writeCases as ReturnType<typeof vi.fn>;

const WORKFLOW_STATES: WorkflowStateDefinition[] = [
  {
    state_id: "awaiting_evidence",
    display_name: "Awaiting evidence",
    applicable_case_types: ["dsa_application"],
    required_action: "Wait for the applicant to submit supporting evidence.",
    allowed_transitions: [
      { to_state: "evidence_received", display_label: "Evidence received", requires_note: true },
      { to_state: "escalated", display_label: "Escalate", requires_note: true },
      { to_state: "closed", display_label: "Withdrawn", requires_note: true },
    ],
    escalation_threshold_days: 56,
  },
  {
    state_id: "under_review",
    display_name: "Under review",
    applicable_case_types: ["dsa_application"],
    required_action: "Assess the case and make a decision.",
    allowed_transitions: [
      { to_state: "awaiting_assessment", display_label: "Send for assessment", requires_note: true },
      { to_state: "approved", display_label: "Approve", requires_note: true, requires_decision_reason: true },
      { to_state: "rejected", display_label: "Reject", requires_note: true, requires_decision_reason: true },
    ],
  },
  {
    state_id: "approved",
    display_name: "Approved",
    applicable_case_types: ["dsa_application"],
    required_action: "No further action required.",
    allowed_transitions: [],
  },
  {
    state_id: "rejected",
    display_name: "Rejected",
    applicable_case_types: ["dsa_application"],
    required_action: "No further action required.",
    allowed_transitions: [],
  },
];

function makeCase(overrides: Partial<Case> = {}): Case {
  return {
    case_id: "DSA-2026-00001",
    case_type: "dsa_application",
    status: "awaiting_evidence",
    applicant: {
      name: "Jane Doe",
      forenames: "Jane",
      surname: "Doe",
      reference: "CRN-001",
      date_of_birth: "2000-01-15",
      sex: "female",
      address: { line1: "1 Test St", postcode: "SW1A 1AA" },
      university: "Test University",
      course: "Computer Science",
      notification_channel: "email",
      email: "jane@example.com",
    },
    assigned_to: "caseworker1",
    created_date: "2026-01-01T00:00:00.000Z",
    last_updated: "2026-01-01T00:00:00.000Z",
    timeline: [{ date: "2026-01-01T00:00:00.000Z", event: "case_created", note: "Case created" }],
    case_notes: "",
    ...overrides,
  };
}

describe("WorkflowEngine", () => {
  const engine = createWorkflowEngine();

  beforeEach(() => {
    vi.clearAllMocks();
    mockReadWorkflowStates.mockReturnValue(WORKFLOW_STATES);
  });

  describe("getPermittedTransitions", () => {
    it("returns allowed transitions for a valid state", () => {
      const transitions = engine.getPermittedTransitions("awaiting_evidence");
      expect(transitions).toHaveLength(3);
      expect(transitions.map((t) => t.to_state)).toEqual([
        "evidence_received",
        "escalated",
        "closed",
      ]);
    });

    it("returns empty array for terminal state", () => {
      const transitions = engine.getPermittedTransitions("approved");
      expect(transitions).toEqual([]);
    });

    it("returns empty array for unknown state", () => {
      const transitions = engine.getPermittedTransitions("nonexistent" as any);
      expect(transitions).toEqual([]);
    });
  });

  describe("applyTransition", () => {
    it("updates case state and appends timeline entry on valid transition", async () => {
      const testCase = makeCase();
      mockReadCases.mockReturnValue([testCase]);

      const result = await engine.applyTransition(
        "DSA-2026-00001",
        "evidence_received",
        "Evidence submitted by applicant",
        "caseworker1"
      );

      expect(result.status).toBe("evidence_received");
      expect(result.timeline).toHaveLength(2);
      expect(result.timeline[1].event).toBe("state_transition");
      expect(result.timeline[1].note).toBe("Evidence submitted by applicant");
      expect(result.timeline[1].actor).toBe("caseworker1");
      expect(result.timeline[1].date).toBeDefined();
      expect(result.last_updated).not.toBe("2026-01-01T00:00:00.000Z");
      expect(mockWriteCases).toHaveBeenCalledOnce();
    });

    it("sets decision_reason and event type for approved transition", async () => {
      const testCase = makeCase({ status: "under_review" });
      mockReadCases.mockReturnValue([testCase]);

      const result = await engine.applyTransition(
        "DSA-2026-00001",
        "approved",
        "All evidence satisfactory",
        "caseworker1",
        "Meets all DSA criteria"
      );

      expect(result.status).toBe("approved");
      expect(result.decision_reason).toBe("Meets all DSA criteria");
      expect(result.timeline[1].event).toBe("decision_made");
    });

    it("sets decision_reason and event type for rejected transition", async () => {
      const testCase = makeCase({ status: "under_review" });
      mockReadCases.mockReturnValue([testCase]);

      const result = await engine.applyTransition(
        "DSA-2026-00001",
        "rejected",
        "Insufficient evidence",
        "caseworker1",
        "Does not meet eligibility criteria"
      );

      expect(result.status).toBe("rejected");
      expect(result.decision_reason).toBe("Does not meet eligibility criteria");
      expect(result.timeline[1].event).toBe("decision_made");
    });

    it("throws error for invalid transition", async () => {
      const testCase = makeCase({ status: "awaiting_evidence" });
      mockReadCases.mockReturnValue([testCase]);

      await expect(
        engine.applyTransition("DSA-2026-00001", "approved", "Skip ahead", "caseworker1", "reason")
      ).rejects.toThrow(WorkflowEngineError);

      expect(mockWriteCases).not.toHaveBeenCalled();
    });

    it("throws error when case not found", async () => {
      mockReadCases.mockReturnValue([]);

      await expect(
        engine.applyTransition("DSA-9999-99999", "evidence_received", "note", "caseworker1")
      ).rejects.toThrow(WorkflowEngineError);

      expect(mockWriteCases).not.toHaveBeenCalled();
    });

    it("throws error when transitioning to approved without decisionReason", async () => {
      const testCase = makeCase({ status: "under_review" });
      mockReadCases.mockReturnValue([testCase]);

      await expect(
        engine.applyTransition("DSA-2026-00001", "approved", "Looks good", "caseworker1")
      ).rejects.toThrow(WorkflowEngineError);

      expect(mockWriteCases).not.toHaveBeenCalled();
    });

    it("throws error when transitioning to rejected without decisionReason", async () => {
      const testCase = makeCase({ status: "under_review" });
      mockReadCases.mockReturnValue([testCase]);

      await expect(
        engine.applyTransition("DSA-2026-00001", "rejected", "Not enough", "caseworker1")
      ).rejects.toThrow(WorkflowEngineError);

      expect(mockWriteCases).not.toHaveBeenCalled();
    });

    it("does not modify case on invalid transition", async () => {
      const originalTimeline = [{ date: "2026-01-01T00:00:00.000Z", event: "case_created" as const, note: "Case created" }];
      const testCase = makeCase({
        status: "awaiting_evidence",
        last_updated: "2026-01-01T00:00:00.000Z",
        timeline: [...originalTimeline],
      });
      mockReadCases.mockReturnValue([testCase]);

      try {
        await engine.applyTransition("DSA-2026-00001", "approved", "Skip", "caseworker1", "reason");
      } catch {
        // expected
      }

      // Case should remain unchanged
      expect(testCase.status).toBe("awaiting_evidence");
      expect(testCase.last_updated).toBe("2026-01-01T00:00:00.000Z");
      expect(testCase.timeline).toHaveLength(1);
    });
  });
});
