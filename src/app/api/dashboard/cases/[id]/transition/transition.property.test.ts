import { describe, expect, vi, beforeEach } from "vitest";
import { it, fc } from "@fast-check/vitest";
import type { Case, Applicant, WorkflowStateName } from "@/types";

// ── Mocks ───────────────────────────────────────────────────

// Mock iron-session
const mockSession: Record<string, unknown> = {};
vi.mock("iron-session", () => ({
  getIronSession: vi.fn(async () => mockSession),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({})),
}));

// Track sendOutcome calls
const sendOutcomeSpy = vi.fn();

vi.mock("@/services/notifications", () => {
  return {
    MockNotificationService: vi.fn().mockImplementation(() => ({
      sent: [],
      sendOutcome: sendOutcomeSpy,
    })),
  };
});

// Mock workflow engine
const mockApplyTransition = vi.fn();
vi.mock("@/services/workflow/workflow-engine", () => ({
  createWorkflowEngine: () => ({
    getPermittedTransitions: vi.fn(() => []),
    applyTransition: mockApplyTransition,
  }),
  WorkflowEngineError: class WorkflowEngineError extends Error {
    public readonly statusCode: number;
    constructor(message: string, statusCode = 400) {
      super(message);
      this.name = "WorkflowEngineError";
      this.statusCode = statusCode;
    }
  },
}));

// Mock data-store (required by workflow engine module resolution)
vi.mock("@/lib/data-store", () => ({
  readWorkflowStates: vi.fn(() => []),
  readCases: vi.fn(() => []),
  writeCases: vi.fn(),
}));

// Import the route handler after mocks are set up
import { POST } from "./route";

// ── Arbitraries ─────────────────────────────────────────────

const arbOutcome = fc.constantFrom<"approved" | "rejected">("approved", "rejected");

const arbNotificationChannel = fc.constantFrom<"email" | "sms">("email", "sms");

const arbEmail = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 10, unit: "grapheme-ascii" }).filter((s) => /^[a-z0-9]+$/i.test(s)),
    fc.string({ minLength: 1, maxLength: 8, unit: "grapheme-ascii" }).filter((s) => /^[a-z0-9]+$/i.test(s))
  )
  .map(([local, domain]) => `${local}@${domain}.co.uk`);

const arbPhoneSafe = fc
  .integer({ min: 7000000000, max: 7999999999 })
  .map((n) => `0${n}`);

const arbApplicant = (channel: "email" | "sms"): fc.Arbitrary<Applicant> =>
  fc.record({
    name: fc.constant("Test User"),
    forenames: fc.string({ minLength: 1, maxLength: 20, unit: "grapheme-ascii" }).filter((s) => s.trim().length > 0),
    surname: fc.string({ minLength: 1, maxLength: 20, unit: "grapheme-ascii" }).filter((s) => s.trim().length > 0),
    reference: fc.string({ minLength: 0, maxLength: 10 }),
    date_of_birth: fc.constant("2000-01-15"),
    sex: fc.constantFrom("male" as const, "female" as const, "non-binary" as const, "prefer_not_to_say" as const),
    address: fc.record({
      line1: fc.constant("1 High St"),
      postcode: fc.constant("SW1A 1AA"),
    }),
    university: fc.constant("UCL"),
    course: fc.constant("Computer Science"),
    notification_channel: fc.constant(channel),
    email: channel === "email" ? arbEmail : fc.constant(undefined),
    phone: channel === "sms" ? arbPhoneSafe.map((p) => p as string) : fc.constant(undefined),
  }) as fc.Arbitrary<Applicant>;

const arbApplicantWithChannel: fc.Arbitrary<Applicant> = arbNotificationChannel.chain(
  (channel) => arbApplicant(channel)
);

const arbNote = fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0);
const arbDecisionReason = fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0);
const arbCaseId = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 99999 })
  )
  .map(([year, seq]) => `DSA-${year}-${String(seq).padStart(5, "0")}`);

// ── Helpers ─────────────────────────────────────────────────

function makeCase(applicant: Applicant, caseId: string, status: WorkflowStateName): Case {
  return {
    case_id: caseId,
    case_type: "dsa_application",
    status,
    applicant,
    assigned_to: "caseworker1",
    created_date: "2026-01-01T00:00:00.000Z",
    last_updated: new Date().toISOString(),
    timeline: [
      { date: "2026-01-01T00:00:00.000Z", event: "case_created", note: "Case created" },
      { date: new Date().toISOString(), event: "decision_made", note: "Decision" },
    ],
    case_notes: "",
    decision_reason: "Test decision reason",
  };
}

function buildRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/dashboard/cases/test-id/transition", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Tests ───────────────────────────────────────────────────

describe("Transition Route — Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up authenticated session
    mockSession.username = "caseworker1";
    mockSession.role = "caseworker";
    mockSession.team = "team_a";
    mockSession.lastActivity = new Date().toISOString();
    sendOutcomeSpy.mockResolvedValue(undefined);
  });

  // Feature: dsa-allowance-service, Property 23: Outcome notification sent on terminal state transition
  // **Validates: Requirements 8.5**
  describe("Property 23: Outcome notification sent on terminal state transition", () => {
    it.prop(
      [arbApplicantWithChannel, arbCaseId, arbOutcome, arbNote, arbDecisionReason],
      { numRuns: 100 }
    )(
      "sendOutcome is called exactly once with the correct channel and outcome when transitioning to approved/rejected",
      async (applicant, caseId, outcome, note, decisionReason) => {
        // Clear spies for each iteration (fast-check runs many iterations within one test)
        sendOutcomeSpy.mockClear();
        mockApplyTransition.mockReset();

        // Build the case that applyTransition will return
        const updatedCase = makeCase(applicant, caseId, outcome);

        mockApplyTransition.mockResolvedValue(updatedCase);

        const request = buildRequest({
          toState: outcome,
          note,
          decisionReason,
        });

        const response = await POST(request as any, {
          params: Promise.resolve({ id: caseId }),
        });

        // Route should succeed
        expect(response.status).toBe(200);

        // sendOutcome should be called exactly once
        expect(sendOutcomeSpy).toHaveBeenCalledTimes(1);

        // Verify it was called with the correct applicant, case reference, and outcome
        const [calledApplicant, calledCaseRef, calledOutcome] = sendOutcomeSpy.mock.calls[0];

        expect(calledApplicant.notification_channel).toBe(applicant.notification_channel);
        expect(calledCaseRef).toBe(caseId);
        expect(calledOutcome).toBe(outcome);

        // Verify the channel matches the applicant's preference
        if (applicant.notification_channel === "email") {
          expect(calledApplicant.email).toBe(applicant.email);
        } else {
          expect(calledApplicant.phone).toBe(applicant.phone);
        }
      }
    );
  });
});
