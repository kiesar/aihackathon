import { describe, expect, beforeEach, vi } from "vitest";
import { it, fc } from "@fast-check/vitest";
import { createWorkflowEngine, WorkflowEngineError } from "./workflow-engine";
import type {
  Case,
  WorkflowStateName,
  WorkflowStateDefinition,
  WorkflowTransition,
} from "@/types";

// ── Mock data store ─────────────────────────────────────────
vi.mock("@/lib/data-store", () => ({
  readWorkflowStates: vi.fn(),
  readCases: vi.fn(),
  writeCases: vi.fn(),
}));

import { readWorkflowStates, readCases, writeCases } from "@/lib/data-store";

const mockReadWorkflowStates = readWorkflowStates as ReturnType<typeof vi.fn>;
const mockReadCases = readCases as ReturnType<typeof vi.fn>;
const mockWriteCases = writeCases as ReturnType<typeof vi.fn>;

// ── Full workflow states from workflow-states.json ───────────
const WORKFLOW_STATES: WorkflowStateDefinition[] = [
  {
    state_id: "awaiting_evidence",
    display_name: "Awaiting evidence",
    applicable_case_types: ["dsa_application", "allowance_review", "compliance_check"],
    required_action: "Wait for the applicant to submit supporting evidence.",
    allowed_transitions: [
      { to_state: "evidence_received", display_label: "Evidence received", requires_note: true },
      { to_state: "escalated", display_label: "Escalate", requires_note: true },
      { to_state: "closed", display_label: "Withdrawn", requires_note: true },
    ],
    escalation_threshold_days: 56,
  },
  {
    state_id: "evidence_received",
    display_name: "Evidence received",
    applicable_case_types: ["dsa_application", "allowance_review", "compliance_check"],
    required_action: "Review the submitted evidence and begin case review.",
    allowed_transitions: [
      { to_state: "under_review", display_label: "Begin review", requires_note: true },
      { to_state: "awaiting_evidence", display_label: "Further evidence needed", requires_note: true },
    ],
  },
  {
    state_id: "under_review",
    display_name: "Under review",
    applicable_case_types: ["dsa_application", "allowance_review", "compliance_check"],
    required_action: "Assess the case and make a decision or send for further assessment.",
    allowed_transitions: [
      { to_state: "awaiting_assessment", display_label: "Send for assessment", requires_note: true },
      { to_state: "approved", display_label: "Approve", requires_note: true, requires_decision_reason: true },
      { to_state: "rejected", display_label: "Reject", requires_note: true, requires_decision_reason: true },
    ],
  },
  {
    state_id: "awaiting_assessment",
    display_name: "Awaiting assessment",
    applicable_case_types: ["dsa_application", "allowance_review"],
    required_action: "Wait for the external assessment to be returned.",
    allowed_transitions: [
      { to_state: "under_review", display_label: "Assessment returned", requires_note: true },
      { to_state: "approved", display_label: "Approve post-assessment", requires_note: true, requires_decision_reason: true },
      { to_state: "rejected", display_label: "Reject post-assessment", requires_note: true, requires_decision_reason: true },
    ],
  },
  {
    state_id: "escalated",
    display_name: "Escalated",
    applicable_case_types: ["dsa_application", "allowance_review", "compliance_check"],
    required_action: "Team leader to review the escalated case and resolve.",
    allowed_transitions: [
      { to_state: "under_review", display_label: "Escalation resolved", requires_note: true },
      { to_state: "closed", display_label: "Withdrawn", requires_note: true },
    ],
  },
  {
    state_id: "approved",
    display_name: "Approved",
    applicable_case_types: ["dsa_application", "allowance_review", "compliance_check"],
    required_action: "No further action required. Case has been approved.",
    allowed_transitions: [],
  },
  {
    state_id: "rejected",
    display_name: "Rejected",
    applicable_case_types: ["dsa_application", "allowance_review", "compliance_check"],
    required_action: "No further action required. Case has been rejected.",
    allowed_transitions: [],
  },
  {
    state_id: "closed",
    display_name: "Closed",
    applicable_case_types: ["dsa_application", "allowance_review", "compliance_check"],
    required_action: "No further action required. Case has been closed.",
    allowed_transitions: [],
  },
];

// ── All valid state names ───────────────────────────────────
const ALL_STATES: WorkflowStateName[] = WORKFLOW_STATES.map((s) => s.state_id);

// ── Arbitraries ─────────────────────────────────────────────
const arbWorkflowState = fc.constantFrom(...ALL_STATES);

const arbNote = fc.string({ minLength: 1, maxLength: 200 });
const arbCaseworkerId = fc.string({ minLength: 1, maxLength: 50 });

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
    timeline: [
      { date: "2026-01-01T00:00:00.000Z", event: "case_created", note: "Case created" },
    ],
    case_notes: "",
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────

describe("WorkflowEngine — Property Tests", () => {
  const engine = createWorkflowEngine();

  beforeEach(() => {
    vi.clearAllMocks();
    mockReadWorkflowStates.mockReturnValue(WORKFLOW_STATES);
  });

  // Feature: dsa-allowance-service, Property 21: Permitted transitions match state machine
  // **Validates: Requirements 8.1**
  describe("Property 21: Permitted transitions match state machine", () => {
    it.prop([arbWorkflowState], { numRuns: 100 })(
      "getPermittedTransitions returns exactly the allowed_transitions from workflow-states.json for state %s",
      (state) => {
        const expected = WORKFLOW_STATES.find((s) => s.state_id === state)!;
        const result = engine.getPermittedTransitions(state);

        // Same number of transitions
        expect(result).toHaveLength(expected.allowed_transitions.length);

        // Same to_state values in the same order
        const resultStates = result.map((t) => t.to_state);
        const expectedStates = expected.allowed_transitions.map((t) => t.to_state);
        expect(resultStates).toEqual(expectedStates);

        // Each transition object matches fully
        result.forEach((t, i) => {
          expect(t.to_state).toBe(expected.allowed_transitions[i].to_state);
          expect(t.display_label).toBe(expected.allowed_transitions[i].display_label);
          expect(t.requires_note).toBe(expected.allowed_transitions[i].requires_note);
          expect(t.requires_decision_reason).toBe(
            expected.allowed_transitions[i].requires_decision_reason
          );
        });
      }
    );
  });

  // Feature: dsa-allowance-service, Property 22: Valid transition updates state and appends timeline entry
  // **Validates: Requirements 8.3**
  describe("Property 22: Valid transition updates state and appends timeline entry", () => {
    // Build an arbitrary that picks a state with at least one transition, then picks one of its transitions
    const arbValidTransition = arbWorkflowState
      .filter((s) => {
        const def = WORKFLOW_STATES.find((d) => d.state_id === s);
        return def !== undefined && def.allowed_transitions.length > 0;
      })
      .chain((fromState) => {
        const def = WORKFLOW_STATES.find((d) => d.state_id === fromState)!;
        return fc.record({
          fromState: fc.constant(fromState),
          transition: fc.constantFrom(...def.allowed_transitions),
          note: arbNote,
          caseworkerId: arbCaseworkerId,
        });
      });

    it.prop([arbValidTransition], { numRuns: 100 })(
      "applying a valid transition updates state, appends timeline entry, and updates last_updated",
      async ({ fromState, transition, note, caseworkerId }) => {
        const originalDate = "2026-01-01T00:00:00.000Z";
        const testCase = makeCase({
          status: fromState,
          last_updated: originalDate,
        });
        mockReadCases.mockReturnValue([testCase]);
        mockWriteCases.mockImplementation(() => {});

        const decisionReason = transition.requires_decision_reason
          ? "Decision reason for test"
          : undefined;

        const result = await engine.applyTransition(
          "DSA-2026-00001",
          transition.to_state,
          note,
          caseworkerId,
          decisionReason
        );

        // (a) New state matches the transition target
        expect(result.status).toBe(transition.to_state);

        // (b) A new timeline entry was appended
        const lastEntry = result.timeline[result.timeline.length - 1];
        expect(lastEntry.actor).toBe(caseworkerId);
        expect(lastEntry.note).toBe(note);
        expect(lastEntry.date).toBeDefined();
        expect(new Date(lastEntry.date).getTime()).not.toBeNaN();

        // (c) last_updated was changed
        expect(result.last_updated).not.toBe(originalDate);
        expect(new Date(result.last_updated).getTime()).not.toBeNaN();
      }
    );
  });

  // Feature: dsa-allowance-service, Property 24: Invalid transition leaves case unchanged
  // **Validates: Requirements 8.6**
  describe("Property 24: Invalid transition leaves case unchanged", () => {
    // Build an arbitrary that picks a state and an invalid target state (not in allowed_transitions)
    const arbInvalidTransition = arbWorkflowState.chain((fromState) => {
      const def = WORKFLOW_STATES.find((d) => d.state_id === fromState)!;
      const allowedTargets = new Set(def.allowed_transitions.map((t) => t.to_state));
      const invalidTargets = ALL_STATES.filter((s) => !allowedTargets.has(s) && s !== fromState);

      if (invalidTargets.length === 0) {
        // For states with transitions to all other states, use the state itself as invalid
        return fc.record({
          fromState: fc.constant(fromState),
          invalidTarget: fc.constant(fromState as WorkflowStateName),
          note: arbNote,
          caseworkerId: arbCaseworkerId,
        });
      }

      return fc.record({
        fromState: fc.constant(fromState),
        invalidTarget: fc.constantFrom(...invalidTargets),
        note: arbNote,
        caseworkerId: arbCaseworkerId,
      });
    });

    it.prop([arbInvalidTransition], { numRuns: 100 })(
      "attempting an invalid transition leaves the case record completely unchanged",
      async ({ fromState, invalidTarget, note, caseworkerId }) => {
        const originalDate = "2026-01-01T00:00:00.000Z";
        const originalTimeline = [
          { date: "2026-01-01T00:00:00.000Z", event: "case_created" as const, note: "Case created" },
        ];
        const testCase = makeCase({
          status: fromState,
          last_updated: originalDate,
          timeline: [...originalTimeline],
        });
        mockReadCases.mockReturnValue([testCase]);
        mockWriteCases.mockImplementation(() => {});

        // Snapshot the case before the attempt
        const statusBefore = testCase.status;
        const lastUpdatedBefore = testCase.last_updated;
        const timelineLengthBefore = testCase.timeline.length;

        try {
          await engine.applyTransition(
            "DSA-2026-00001",
            invalidTarget,
            note,
            caseworkerId,
            "reason"
          );
          // If we reach here, the transition was unexpectedly allowed — fail
          expect.unreachable("Expected WorkflowEngineError to be thrown");
        } catch (err) {
          expect(err).toBeInstanceOf(WorkflowEngineError);
        }

        // Case must remain completely unchanged
        expect(testCase.status).toBe(statusBefore);
        expect(testCase.last_updated).toBe(lastUpdatedBefore);
        expect(testCase.timeline).toHaveLength(timelineLengthBefore);
        expect(mockWriteCases).not.toHaveBeenCalled();
      }
    );
  });
});
