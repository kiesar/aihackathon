import { describe, expect, vi, beforeEach } from "vitest";
import { it, fc } from "@fast-check/vitest";
import type { Case, WorkflowStateName } from "@/types";

// Mock data-store before importing the route
vi.mock("@/lib/data-store", () => ({
  readCases: vi.fn(),
}));

import { GET } from "./[ref]/route";
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

const DISPLAY_STATUS: Record<WorkflowStateName, string> = {
  awaiting_evidence: "Awaiting evidence",
  evidence_received: "Evidence received",
  under_review: "Under review",
  awaiting_assessment: "Awaiting assessment",
  approved: "Approved",
  rejected: "Rejected",
  escalated: "Escalated",
  closed: "Closed",
};

// ── Helpers ─────────────────────────────────────────────────

function buildRequest(ref: string) {
  return new NextRequest(`http://localhost/api/cases/${ref}`);
}

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

// ── Arbitraries ─────────────────────────────────────────────

/** Arbitrary workflow state name */
const arbWorkflowState = fc.constantFrom(...ALL_WORKFLOW_STATES);

/** Arbitrary ISO date string */
const arbIsoDate = fc
  .date({
    min: new Date("2020-01-01T00:00:00.000Z"),
    max: new Date("2030-12-31T23:59:59.999Z"),
  })
  .map((d) => d.toISOString());

/** Arbitrary case reference in DSA-YYYY-NNNNN format */
const arbCaseRef = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 99999 })
  )
  .map(([year, seq]) => `DSA-${year}-${String(seq).padStart(5, "0")}`);

/** Arbitrary case with random state, reference, and last_updated */
const arbCase = fc
  .tuple(arbCaseRef, arbWorkflowState, arbIsoDate)
  .map(([caseId, status, lastUpdated]) =>
    makeCase({ case_id: caseId, status, last_updated: lastUpdated })
  );

// ── Tests ───────────────────────────────────────────────────

describe("Status Lookup — Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Feature: dsa-allowance-service, Property 11: Status lookup returns correct state and date
  // **Validates: Requirements 5.2**
  describe("Property 11: Status lookup returns correct state and date", () => {
    it.prop([arbCase], { numRuns: 100 })(
      "looking up a case by reference returns the correct Workflow_State and last_updated",
      async (testCase) => {
        mockedReadCases.mockReturnValue([testCase]);

        const res = await GET(buildRequest(testCase.case_id), {
          params: Promise.resolve({ ref: testCase.case_id }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe(testCase.status);
        expect(body.lastUpdated).toBe(testCase.last_updated);
      }
    );
  });

  // Feature: dsa-allowance-service, Property 12: Workflow_State display names are plain English
  // **Validates: Requirements 5.4**
  describe("Property 12: Workflow_State display names are plain English", () => {
    it.prop([arbWorkflowState], { numRuns: 100 })(
      "the display function returns a non-empty human-readable string different from the raw code",
      async (state) => {
        const testCase = makeCase({ status: state });
        mockedReadCases.mockReturnValue([testCase]);

        const res = await GET(buildRequest(testCase.case_id), {
          params: Promise.resolve({ ref: testCase.case_id }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();

        // Display status is non-empty
        expect(body.displayStatus).toBeTruthy();
        expect(body.displayStatus.length).toBeGreaterThan(0);

        // Display status is different from the raw state code
        expect(body.displayStatus).not.toBe(state);

        // Display status contains only human-readable characters (letters, spaces, hyphens)
        expect(body.displayStatus).toMatch(/^[A-Za-z][A-Za-z\s\-]*$/);

        // Display status matches the expected mapping
        expect(body.displayStatus).toBe(DISPLAY_STATUS[state]);
      }
    );
  });
});
