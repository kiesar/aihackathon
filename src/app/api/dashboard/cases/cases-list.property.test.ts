import { describe, expect, vi, beforeEach } from "vitest";
import { it, fc } from "@fast-check/vitest";
import type { Case, WorkflowStateName, CaseType } from "@/types";

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
import { readCases } from "@/lib/data-store";
import { NextRequest } from "next/server";

const mockedReadCases = vi.mocked(readCases);

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

const arbUsername = fc.constantFrom("jsmith", "mbrown", "awilson", "dlee");

const arbWorkflowState = fc.constantFrom(...ALL_WORKFLOW_STATES);

const arbCaseType = fc.constantFrom(...ALL_CASE_TYPES);

const arbIsoDate = fc
  .date({
    min: new Date("2024-01-01T00:00:00.000Z"),
    max: new Date("2027-12-31T23:59:59.999Z"),
  })
  .map((d) => d.toISOString());

/** Generate a unique case_id */
const arbCaseId = fc
  .tuple(
    fc.integer({ min: 2024, max: 2027 }),
    fc.integer({ min: 1, max: 99999 })
  )
  .map(([year, seq]) => `DSA-${year}-${String(seq).padStart(5, "0")}`);

/** Generate a case with random properties */
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
const arbCaseList = fc
  .uniqueArray(arbCaseWithAssignee, {
    minLength: 0,
    maxLength: 30,
    comparator: (a, b) => a.case_id === b.case_id,
  });

// ── Tests ───────────────────────────────────────────────────

describe("Dashboard Case List — Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.username = "jsmith";
    mockSession.role = "caseworker";
    mockSession.team = "team_a";
  });

  // Feature: dsa-allowance-service, Property 13: Case list shows only assigned cases
  // **Validates: Requirements 6.1**
  describe("Property 13: Case list shows only assigned cases", () => {
    it.prop([arbCaseList], { numRuns: 100 })(
      "for any caseworker, the list contains exactly their assigned cases",
      async (cases) => {
        mockedReadCases.mockReturnValue(cases);

        const res = await GET(buildRequest());
        expect(res.status).toBe(200);
        const body: DashboardCasesResponse = await res.json();

        const expectedIds = cases
          .filter((c) => c.assigned_to === "jsmith")
          .map((c) => c.case_id)
          .sort();

        const returnedIds = body.cases.map((c) => c.case_id).sort();

        expect(returnedIds).toEqual(expectedIds);
      }
    );
  });

  // Feature: dsa-allowance-service, Property 14: Case list filter correctness
  // **Validates: Requirements 6.2**
  describe("Property 14: Case list filter correctness", () => {
    it.prop([arbCaseList, arbWorkflowState], { numRuns: 100 })(
      "for any state filter, every result has that state and no other states appear",
      async (cases, filterState) => {
        // Ensure all cases are assigned to the session user so filtering is meaningful
        const myCases = cases.map((c) => ({ ...c, assigned_to: "jsmith" }));
        mockedReadCases.mockReturnValue(myCases);

        const res = await GET(buildRequest(`status=${filterState}`));
        expect(res.status).toBe(200);
        const body: DashboardCasesResponse = await res.json();

        // Every returned case has the filtered state
        for (const item of body.cases) {
          expect(item.status).toBe(filterState);
        }

        // The count matches the expected number of cases with that state
        const expectedCount = myCases.filter(
          (c) => c.status === filterState
        ).length;
        expect(body.cases).toHaveLength(expectedCount);
      }
    );
  });

  // Feature: dsa-allowance-service, Property 15: Case list sort correctness
  // **Validates: Requirements 6.3**
  describe("Property 15: Case list sort correctness", () => {
    const arbSortField = fc.constantFrom("created_date", "last_updated");
    const arbSortOrder = fc.constantFrom("asc", "desc");

    it.prop([arbCaseList, arbSortField, arbSortOrder], { numRuns: 100 })(
      "for any sort field and direction, the list is monotonically ordered",
      async (cases, sortField, sortOrder) => {
        // Assign all cases to session user
        const myCases = cases.map((c) => ({ ...c, assigned_to: "jsmith" }));
        mockedReadCases.mockReturnValue(myCases);

        const res = await GET(
          buildRequest(`sort=${sortField}&order=${sortOrder}`)
        );
        expect(res.status).toBe(200);
        const body: DashboardCasesResponse = await res.json();

        // Check monotonic ordering
        const field = sortField === "last_updated" ? "last_updated" : "created_date";
        for (let i = 1; i < body.cases.length; i++) {
          const prev = new Date(body.cases[i - 1][field]).getTime();
          const curr = new Date(body.cases[i][field]).getTime();
          if (sortOrder === "asc") {
            expect(prev).toBeLessThanOrEqual(curr);
          } else {
            expect(prev).toBeGreaterThanOrEqual(curr);
          }
        }
      }
    );
  });

  // Feature: dsa-allowance-service, Property 16: Evidence deadline flag accuracy
  // **Validates: Requirements 6.4, 6.5, 7.6**
  describe("Property 16: Evidence deadline flag accuracy", () => {
    // Generate elapsed days covering all threshold ranges
    const arbElapsedDays = fc.integer({ min: 0, max: 120 });

    const FIXED_NOW = "2026-06-15T12:00:00.000Z";

    function mockDate() {
      const originalDate = globalThis.Date;
      const MockDateClass = class extends originalDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(FIXED_NOW);
          } else {
            // @ts-ignore
            super(...args);
          }
        }
      } as DateConstructor;
      MockDateClass.now = () => new originalDate(FIXED_NOW).getTime();
      MockDateClass.parse = originalDate.parse;
      MockDateClass.UTC = originalDate.UTC;
      globalThis.Date = MockDateClass;
      return originalDate;
    }

    it.prop([arbElapsedDays], { numRuns: 100 })(
      "for any case with evidence_requested_date, flags appear iff elapsed days exceed thresholds",
      async (elapsedDays) => {
        const nowMs = new Date(FIXED_NOW).getTime();
        // Compute evidence date by subtracting exact day-milliseconds so Math.floor matches
        const evidenceDateMs = nowMs - elapsedDays * 24 * 60 * 60 * 1000;
        const evidenceDateStr = new Date(evidenceDateMs).toISOString();

        const testCase = makeCase({
          case_id: "DSA-2026-00001",
          assigned_to: "jsmith",
          status: "awaiting_evidence",
          evidence_requested_date: evidenceDateStr,
        });
        mockedReadCases.mockReturnValue([testCase]);

        const originalDate = mockDate();

        try {
          const res = await GET(buildRequest());
          expect(res.status).toBe(200);
          const body: DashboardCasesResponse = await res.json();

          expect(body.cases).toHaveLength(1);
          const item = body.cases[0];

          if (elapsedDays >= 56) {
            expect(item.evidence_flag).toBe("escalation");
          } else if (elapsedDays >= 28) {
            expect(item.evidence_flag).toBe("reminder");
          } else {
            expect(item.evidence_flag).toBe("none");
          }

          // days_outstanding should match elapsed days
          expect(item.days_outstanding).toBe(elapsedDays);
        } finally {
          globalThis.Date = originalDate;
        }
      }
    );

    it.prop(
      [fc.constantFrom(
        "evidence_received",
        "under_review",
        "awaiting_assessment",
        "approved",
        "rejected",
        "escalated",
        "closed"
      ) as fc.Arbitrary<WorkflowStateName>, arbElapsedDays],
      { numRuns: 100 }
    )(
      "for non-awaiting_evidence cases, flag is always none regardless of evidence_requested_date",
      async (status, elapsedDays) => {
        const nowMs = new Date(FIXED_NOW).getTime();
        const evidenceDateMs = nowMs - elapsedDays * 24 * 60 * 60 * 1000;
        const evidenceDateStr = new Date(evidenceDateMs).toISOString();

        const testCase = makeCase({
          case_id: "DSA-2026-00001",
          assigned_to: "jsmith",
          status,
          evidence_requested_date: evidenceDateStr,
        });
        mockedReadCases.mockReturnValue([testCase]);

        const res = await GET(buildRequest());
        expect(res.status).toBe(200);
        const body: DashboardCasesResponse = await res.json();

        expect(body.cases).toHaveLength(1);
        expect(body.cases[0].evidence_flag).toBe("none");
        expect(body.cases[0].days_outstanding).toBeNull();
      }
    );
  });

  // Feature: dsa-allowance-service, Property 17: Case list counts are accurate
  // **Validates: Requirements 6.6**
  describe("Property 17: Case list counts are accurate", () => {
    it.prop([arbCaseList], { numRuns: 100 })(
      "total and escalation counts match actual data",
      async (cases) => {
        // Use a fixed "now" far in the future so we can control escalation flags
        const now = new Date("2026-06-15T12:00:00.000Z");

        // Give some awaiting_evidence cases an evidence_requested_date to trigger escalation
        const casesWithEvidence = cases.map((c) => {
          if (c.status === "awaiting_evidence") {
            // Set evidence_requested_date 60 days before "now" to trigger escalation
            const evidenceDate = new Date(now);
            evidenceDate.setDate(evidenceDate.getDate() - 60);
            return { ...c, assigned_to: "jsmith", evidence_requested_date: evidenceDate.toISOString() };
          }
          return { ...c, assigned_to: "jsmith" };
        });

        mockedReadCases.mockReturnValue(casesWithEvidence);

        // Mock Date for consistent flag calculation
        const originalDate = globalThis.Date;
        const MockDate = class extends originalDate {
          constructor(...args: any[]) {
            if (args.length === 0) {
              super("2026-06-15T12:00:00.000Z");
            } else {
              // @ts-ignore
              super(...args);
            }
          }
        } as DateConstructor;
        MockDate.now = () => new originalDate("2026-06-15T12:00:00.000Z").getTime();
        MockDate.parse = originalDate.parse;
        MockDate.UTC = originalDate.UTC;
        globalThis.Date = MockDate;

        try {
          const res = await GET(buildRequest());
          expect(res.status).toBe(200);
          const body: DashboardCasesResponse = await res.json();

          // totalCount matches the number of returned cases
          expect(body.totalCount).toBe(body.cases.length);

          // totalCount matches the number of cases assigned to jsmith
          const expectedTotal = casesWithEvidence.filter(
            (c) => c.assigned_to === "jsmith"
          ).length;
          expect(body.totalCount).toBe(expectedTotal);

          // escalationCount matches cases with escalation flag
          const actualEscalationCount = body.cases.filter(
            (c) => c.evidence_flag === "escalation"
          ).length;
          expect(body.escalationCount).toBe(actualEscalationCount);

          // escalationCount matches awaiting_evidence cases (all have 60-day evidence date)
          const expectedEscalationCount = casesWithEvidence.filter(
            (c) =>
              c.assigned_to === "jsmith" &&
              c.status === "awaiting_evidence" &&
              c.evidence_requested_date !== undefined
          ).length;
          expect(body.escalationCount).toBe(expectedEscalationCount);
        } finally {
          globalThis.Date = originalDate;
        }
      }
    );
  });
});
