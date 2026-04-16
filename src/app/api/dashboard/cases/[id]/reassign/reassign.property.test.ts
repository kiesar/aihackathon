import { describe, expect, vi, beforeEach } from "vitest";
import { it, fc } from "@fast-check/vitest";
import type { Case, WorkflowStateName, User } from "@/types";

// Mock data-store and iron-session before importing the route
vi.mock("@/lib/data-store", () => ({
  readCases: vi.fn(),
  writeCases: vi.fn(),
  readUsers: vi.fn(),
}));

const mockSession: Record<string, unknown> = {};

vi.mock("iron-session", () => ({
  getIronSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}));

import { POST } from "./route";
import { readCases, writeCases, readUsers } from "@/lib/data-store";
import { NextRequest } from "next/server";

const mockedReadCases = vi.mocked(readCases);
const mockedWriteCases = vi.mocked(writeCases);
const mockedReadUsers = vi.mocked(readUsers);

// ── Constants ───────────────────────────────────────────────

const TEAM_A_CASEWORKERS = ["jsmith", "mbrown", "cjones"];

const TEAM_USERS: User[] = [
  { username: "jsmith", password_hash: "", role: "caseworker", team: "team_a", display_name: "Jane Smith" },
  { username: "mbrown", password_hash: "", role: "caseworker", team: "team_a", display_name: "Mark Brown" },
  { username: "cjones", password_hash: "", role: "caseworker", team: "team_a", display_name: "Chris Jones" },
  { username: "awilson", password_hash: "", role: "team_leader", team: "team_a", display_name: "Alice Wilson" },
];

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

// ── Helpers ─────────────────────────────────────────────────

function makeCase(overrides: Partial<Case> = {}): Case {
  return {
    case_id: "DSA-2026-00001",
    case_type: "dsa_application",
    status: "awaiting_evidence",
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

function buildRequest(caseId: string, body: unknown) {
  return new NextRequest(
    `http://localhost/api/dashboard/cases/${caseId}/reassign`,
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }
  );
}

// ── Arbitraries ─────────────────────────────────────────────

const arbWorkflowState = fc.constantFrom(...ALL_WORKFLOW_STATES);

const arbCaseId = fc
  .tuple(
    fc.integer({ min: 2024, max: 2027 }),
    fc.integer({ min: 1, max: 99999 })
  )
  .map(([year, seq]) => `DSA-${year}-${String(seq).padStart(5, "0")}`);

/**
 * Generate a pair of distinct caseworkers from team_a for reassignment.
 * The first is the current assignee, the second is the new assignee.
 */
const arbReassignPair = fc
  .tuple(
    fc.constantFrom(...TEAM_A_CASEWORKERS),
    fc.constantFrom(...TEAM_A_CASEWORKERS)
  )
  .filter(([from, to]) => from !== to);

// ── Tests ───────────────────────────────────────────────────

describe("Reassignment — Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.username = "awilson";
    mockSession.role = "team_leader";
    mockSession.team = "team_a";
    mockedReadUsers.mockReturnValue(TEAM_USERS);
  });

  // Feature: dsa-allowance-service, Property 27: Reassignment appends correct timeline entry
  // **Validates: Requirements 9.5**
  describe("Property 27: Reassignment appends correct timeline entry", () => {
    it.prop(
      [arbCaseId, arbWorkflowState, arbReassignPair],
      { numRuns: 100 }
    )(
      "for any reassignment, the timeline contains an entry with previous assignee, new assignee, and timestamp",
      async (caseId, status, [previousAssignee, newAssignee]) => {
        // Reset mocks between property iterations
        mockedWriteCases.mockClear();
        mockedReadCases.mockClear();

        const testCase = makeCase({
          case_id: caseId,
          status,
          assigned_to: previousAssignee,
        });
        mockedReadCases.mockReturnValue([testCase]);

        const beforeTime = new Date().toISOString();

        const res = await POST(
          buildRequest(caseId, { newAssignee }),
          { params: Promise.resolve({ id: caseId }) }
        );

        const afterTime = new Date().toISOString();

        expect(res.status).toBe(200);
        const body = await res.json();

        // The case should now be assigned to the new assignee
        expect(body.caseRecord.assigned_to).toBe(newAssignee);

        // Timeline should have at least one entry
        expect(body.caseRecord.timeline.length).toBeGreaterThanOrEqual(1);

        // Find the reassignment timeline entry
        const reassignEntry = body.caseRecord.timeline.find(
          (e: { event: string }) => e.event === "reassigned"
        );
        expect(reassignEntry).toBeDefined();

        // The note should contain both the previous and new assignee
        expect(reassignEntry.note).toContain(previousAssignee);
        expect(reassignEntry.note).toContain(newAssignee);

        // The timestamp should be a valid ISO date between before and after
        expect(reassignEntry.date).toBeDefined();
        const entryDate = new Date(reassignEntry.date);
        expect(entryDate.getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
        expect(entryDate.getTime()).toBeLessThanOrEqual(new Date(afterTime).getTime());

        // The actor should be the team leader who performed the reassignment
        expect(reassignEntry.actor).toBe("awilson");

        // writeCases should have been called to persist the change
        expect(mockedWriteCases).toHaveBeenCalledTimes(1);
      }
    );
  });
});
