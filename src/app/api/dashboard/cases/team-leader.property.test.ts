import { describe, expect, vi, beforeEach } from "vitest";
import { it, fc } from "@fast-check/vitest";
import type { Case, WorkflowStateName, CaseType, User } from "@/types";

// Mock data-store and iron-session before importing the route
vi.mock("@/lib/data-store", () => ({
  readCases: vi.fn(),
  readUsers: vi.fn(),
}));

const mockSession: Record<string, unknown> = {};

vi.mock("iron-session", () => ({
  getIronSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}));

import { GET } from "./route";
import type { DashboardCasesResponse } from "./route";
import { readCases, readUsers } from "@/lib/data-store";
import { NextRequest } from "next/server";

const mockedReadCases = vi.mocked(readCases);
const mockedReadUsers = vi.mocked(readUsers);

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

const ALL_CASE_TYPES: CaseType[] = [
  "dsa_application",
  "allowance_review",
  "compliance_check",
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

function buildRequest(query = "") {
  return new NextRequest(
    `http://localhost/api/dashboard/cases${query ? `?${query}` : ""}`
  );
}

// ── Arbitraries ─────────────────────────────────────────────

const TEAM_A_CASEWORKERS = ["jsmith", "mbrown"];
const TEAM_B_CASEWORKERS = ["other", "xuser"];
const ALL_USERNAMES = [...TEAM_A_CASEWORKERS, ...TEAM_B_CASEWORKERS];

const TEAM_USERS: User[] = [
  { username: "jsmith", password_hash: "", role: "caseworker", team: "team_a", display_name: "Jane Smith" },
  { username: "mbrown", password_hash: "", role: "caseworker", team: "team_a", display_name: "Mark Brown" },
  { username: "awilson", password_hash: "", role: "team_leader", team: "team_a", display_name: "Alice Wilson" },
  { username: "other", password_hash: "", role: "caseworker", team: "team_b", display_name: "Other User" },
  { username: "xuser", password_hash: "", role: "caseworker", team: "team_b", display_name: "X User" },
];

const arbUsername = fc.constantFrom(...ALL_USERNAMES);
const arbWorkflowState = fc.constantFrom(...ALL_WORKFLOW_STATES);
const arbCaseType = fc.constantFrom(...ALL_CASE_TYPES);

const arbIsoDate = fc
  .date({
    min: new Date("2024-01-01T00:00:00.000Z"),
    max: new Date("2027-12-31T23:59:59.999Z"),
  })
  .map((d) => d.toISOString());

const arbCaseId = fc
  .tuple(
    fc.integer({ min: 2024, max: 2027 }),
    fc.integer({ min: 1, max: 99999 })
  )
  .map(([year, seq]) => `DSA-${year}-${String(seq).padStart(5, "0")}`);

/** Generate a case assigned to any user from any team */
const arbCaseWithAssignee = fc
  .tuple(arbCaseId, arbCaseType, arbWorkflowState, arbUsername, arbIsoDate, arbIsoDate)
  .map(([caseId, caseType, status, assignedTo, createdDate, lastUpdated]) =>
    makeCase({
      case_id: caseId,
      case_type: caseType,
      status,
      assigned_to: assignedTo,
      created_date: createdDate,
      last_updated: lastUpdated,
    })
  );

/** Generate a list of cases with unique IDs */
const arbCaseList = fc.uniqueArray(arbCaseWithAssignee, {
  minLength: 0,
  maxLength: 30,
  comparator: (a, b) => a.case_id === b.case_id,
});

// ── Tests ───────────────────────────────────────────────────

describe("Team Leader View — Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.username = "awilson";
    mockSession.role = "team_leader";
    mockSession.team = "team_a";
    mockedReadUsers.mockReturnValue(TEAM_USERS);
  });

  // Feature: dsa-allowance-service, Property 25: Team leader view contains all team cases
  // **Validates: Requirements 9.1**
  describe("Property 25: Team leader view contains all team cases", () => {
    it.prop([arbCaseList], { numRuns: 100 })(
      "for any team, the view contains every case assigned to any team caseworker and no cases from outside the team",
      async (cases) => {
        mockedReadCases.mockReturnValue(cases);

        const res = await GET(buildRequest("view=team"));
        expect(res.status).toBe(200);
        const body: DashboardCasesResponse = await res.json();

        // team_a usernames from TEAM_USERS
        const teamAUsernames = new Set(
          TEAM_USERS.filter((u) => u.team === "team_a").map((u) => u.username)
        );

        // Expected: all cases assigned to any team_a member
        const expectedIds = cases
          .filter((c) => teamAUsernames.has(c.assigned_to))
          .map((c) => c.case_id)
          .sort();

        const returnedIds = body.cases.map((c) => c.case_id).sort();

        // Contains every team case
        expect(returnedIds).toEqual(expectedIds);

        // No cases from outside the team
        for (const item of body.cases) {
          expect(teamAUsernames.has(item.assigned_to!)).toBe(true);
        }
      }
    );
  });

  // Feature: dsa-allowance-service, Property 26: Team leader state counts are accurate
  // **Validates: Requirements 9.2**
  describe("Property 26: Team leader state counts are accurate", () => {
    it.prop([arbCaseList], { numRuns: 100 })(
      "for any set of team cases, the count per state matches the actual data",
      async (cases) => {
        mockedReadCases.mockReturnValue(cases);

        const res = await GET(buildRequest("view=team"));
        expect(res.status).toBe(200);
        const body: DashboardCasesResponse = await res.json();

        // Compute expected state counts from team cases
        const teamAUsernames = new Set(
          TEAM_USERS.filter((u) => u.team === "team_a").map((u) => u.username)
        );
        const teamCases = cases.filter((c) => teamAUsernames.has(c.assigned_to));

        const expectedCounts: Record<string, number> = {};
        for (const c of teamCases) {
          expectedCounts[c.status] = (expectedCounts[c.status] || 0) + 1;
        }

        // stateCounts should be present in team view
        expect(body.stateCounts).toBeDefined();

        // Every state in the response should match expected count
        for (const [state, count] of Object.entries(body.stateCounts!)) {
          expect(count).toBe(expectedCounts[state]);
        }

        // Every state in expected should appear in response
        for (const [state, count] of Object.entries(expectedCounts)) {
          expect(body.stateCounts![state]).toBe(count);
        }
      }
    );
  });
});
