import { describe, expect, vi, beforeEach } from "vitest";
import { it, fc } from "@fast-check/vitest";
import type {
  Case,
  WorkflowStateName,
  CaseType,
  TimelineEntry,
  TimelineEventType,
} from "@/types";

// ── Mocks ───────────────────────────────────────────────────

vi.mock("@/lib/data-store", () => ({
  readCases: vi.fn(),
  readWorkflowStates: vi.fn(),
  readPolicyExtracts: vi.fn(),
}));

const mockSession: Record<string, unknown> = {};

vi.mock("iron-session", () => ({
  getIronSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}));

import { GET } from "./route";
import type { CaseDetailResponse } from "./route";
import { readCases, readWorkflowStates, readPolicyExtracts } from "@/lib/data-store";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const mockedReadCases = vi.mocked(readCases);
const mockedReadWorkflowStates = vi.mocked(readWorkflowStates);
const mockedReadPolicyExtracts = vi.mocked(readPolicyExtracts);

// Load the real workflow-states.json for Property 20
const WORKFLOW_STATES_PATH = path.join(process.cwd(), "data", "workflow-states.json");
const WORKFLOW_STATES = JSON.parse(fs.readFileSync(WORKFLOW_STATES_PATH, "utf-8"));

// ── Constants ───────────────────────────────────────────────

const ALL_WORKFLOW_STATES: WorkflowStateName[] = [
  "awaiting_evidence",
  "evidence_received",
  "under_review",
  "awaiting_assessment",
  "approved",
  "rejected",
  "escalated",
  "closed",
];

const ALL_TIMELINE_EVENTS: TimelineEventType[] = [
  "case_created",
  "evidence_requested",
  "evidence_received",
  "state_transition",
  "reminder_sent",
  "escalated",
  "reassigned",
  "decision_made",
  "notification_sent",
];

// ── Helpers ─────────────────────────────────────────────────

function makeCase(overrides: Partial<Case> = {}): Case {
  return {
    case_id: "DSA-2026-00001",
    case_type: "dsa_application",
    status: "under_review",
    applicant: {
      name: "Jane Doe",
      forenames: "Jane",
      surname: "Doe",
      reference: "",
      date_of_birth: "2000-01-15",
      sex: "female",
      address: { line1: "1 Test St", postcode: "SW1A 1AA" },
      university: "Test Uni",
      course: "Test Course",
      notification_channel: "email",
      email: "jane@example.com",
    },
    assigned_to: "jsmith",
    created_date: "2026-01-10T10:00:00.000Z",
    last_updated: "2026-01-12T14:30:00.000Z",
    timeline: [],
    case_notes: "",
    ...overrides,
  };
}

function buildRequest(id: string) {
  return new NextRequest(
    `http://localhost/api/dashboard/cases/${id}`
  );
}

function buildParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ── Arbitraries ─────────────────────────────────────────────

const arbWorkflowState = fc.constantFrom(...ALL_WORKFLOW_STATES);

const arbTimelineEvent = fc.constantFrom(...ALL_TIMELINE_EVENTS);

/** Generate a timeline entry with a specific ISO date */
const arbTimelineEntry = fc
  .tuple(
    fc.date({
      min: new Date("2024-01-01T00:00:00.000Z"),
      max: new Date("2027-12-31T23:59:59.999Z"),
    }),
    arbTimelineEvent,
    fc.string({ minLength: 1, maxLength: 50 }),
    fc.option(fc.constantFrom("jsmith", "mbrown", "awilson"), { nil: undefined })
  )
  .map(([date, event, note, actor]): TimelineEntry => ({
    date: date.toISOString(),
    event,
    note,
    actor,
  }));

/** Generate a list of 2+ timeline entries (potentially unordered) */
const arbTimelineList = fc.array(arbTimelineEntry, {
  minLength: 2,
  maxLength: 20,
});

// ── Tests ───────────────────────────────────────────────────

describe("Case Detail — Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.username = "jsmith";
    mockSession.role = "caseworker";
    mockSession.team = "team_a";

    // Provide real workflow states and empty policy extracts by default
    mockedReadWorkflowStates.mockReturnValue(WORKFLOW_STATES);
    mockedReadPolicyExtracts.mockReturnValue([]);
  });

  // Feature: dsa-allowance-service, Property 18: Timeline is chronologically ordered
  // **Validates: Requirements 7.2**
  describe("Property 18: Timeline is chronologically ordered", () => {
    it.prop([arbTimelineList], { numRuns: 100 })(
      "for any case with 2+ timeline entries, entries are sorted by date ascending",
      async (timeline) => {
        const testCase = makeCase({
          case_id: "DSA-2026-00001",
          timeline,
        });
        mockedReadCases.mockReturnValue([testCase]);

        const res = await GET(buildRequest("DSA-2026-00001"), buildParams("DSA-2026-00001"));
        expect(res.status).toBe(200);

        const body: CaseDetailResponse = await res.json();
        const returnedTimeline = body.caseRecord.timeline;

        expect(returnedTimeline.length).toBeGreaterThanOrEqual(2);

        // Verify chronological ascending order
        for (let i = 1; i < returnedTimeline.length; i++) {
          const prevDate = new Date(returnedTimeline[i - 1].date).getTime();
          const currDate = new Date(returnedTimeline[i].date).getTime();
          expect(prevDate).toBeLessThanOrEqual(currDate);
        }
      }
    );
  });

  // Feature: dsa-allowance-service, Property 20: Required action matches state machine definition
  // **Validates: Requirements 7.5**
  describe("Property 20: Required action matches state machine definition", () => {
    it.prop([arbWorkflowState], { numRuns: 100 })(
      "for any state, the displayed required action matches required_action in workflow-states.json",
      async (state) => {
        const testCase = makeCase({
          case_id: "DSA-2026-00001",
          status: state,
        });
        mockedReadCases.mockReturnValue([testCase]);

        const res = await GET(buildRequest("DSA-2026-00001"), buildParams("DSA-2026-00001"));
        expect(res.status).toBe(200);

        const body: CaseDetailResponse = await res.json();

        // Look up the expected required_action from workflow-states.json
        const stateDef = WORKFLOW_STATES.find(
          (s: { state_id: string }) => s.state_id === state
        );
        const expectedAction = stateDef?.required_action ?? "No action defined for this state.";

        expect(body.requiredAction).toBe(expectedAction);
      }
    );
  });
});
