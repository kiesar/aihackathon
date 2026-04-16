import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Case, WorkflowStateName } from "@/types";

// Mock data-store before importing the route
vi.mock("@/lib/data-store", () => ({
  readCases: vi.fn(),
}));

import { GET } from "./route";
import { readCases } from "@/lib/data-store";
import { NextRequest } from "next/server";

const mockedReadCases = vi.mocked(readCases);

function makeCase(overrides: Partial<Case> = {}): Case {
  return {
    case_id: "DSA-2026-00001",
    case_type: "dsa_application",
    status: "awaiting_evidence" as WorkflowStateName,
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

function buildRequest(ref: string) {
  return new NextRequest(`http://localhost/api/cases/${ref}`);
}

describe("GET /api/cases/[ref]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns case status for a valid reference", async () => {
    const testCase = makeCase();
    mockedReadCases.mockReturnValue([testCase]);

    const res = await GET(buildRequest("DSA-2026-00001"), {
      params: Promise.resolve({ ref: "DSA-2026-00001" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("awaiting_evidence");
    expect(body.displayStatus).toBe("Awaiting evidence");
    expect(body.lastUpdated).toBe("2026-01-12T14:30:00.000Z");
    expect(body.decisionReason).toBeUndefined();
  });

  it("returns 404 for an unknown reference", async () => {
    mockedReadCases.mockReturnValue([]);

    const res = await GET(buildRequest("DSA-2026-99999"), {
      params: Promise.resolve({ ref: "DSA-2026-99999" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("No application found");
  });

  it("includes decisionReason for approved cases", async () => {
    const testCase = makeCase({
      status: "approved",
      decision_reason: "All evidence satisfactory",
    });
    mockedReadCases.mockReturnValue([testCase]);

    const res = await GET(buildRequest("DSA-2026-00001"), {
      params: Promise.resolve({ ref: "DSA-2026-00001" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("approved");
    expect(body.displayStatus).toBe("Approved");
    expect(body.decisionReason).toBe("All evidence satisfactory");
  });

  it("includes decisionReason for rejected cases", async () => {
    const testCase = makeCase({
      status: "rejected",
      decision_reason: "Insufficient evidence",
    });
    mockedReadCases.mockReturnValue([testCase]);

    const res = await GET(buildRequest("DSA-2026-00001"), {
      params: Promise.resolve({ ref: "DSA-2026-00001" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("rejected");
    expect(body.displayStatus).toBe("Rejected");
    expect(body.decisionReason).toBe("Insufficient evidence");
  });

  it("does not include decisionReason for non-terminal states", async () => {
    const testCase = makeCase({ status: "under_review" });
    mockedReadCases.mockReturnValue([testCase]);

    const res = await GET(buildRequest("DSA-2026-00001"), {
      params: Promise.resolve({ ref: "DSA-2026-00001" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("under_review");
    expect(body.displayStatus).toBe("Under review");
    expect(body.decisionReason).toBeUndefined();
  });

  it("returns correct display names for all workflow states", async () => {
    const stateMap: Record<WorkflowStateName, string> = {
      awaiting_evidence: "Awaiting evidence",
      evidence_received: "Evidence received",
      under_review: "Under review",
      awaiting_assessment: "Awaiting assessment",
      approved: "Approved",
      rejected: "Rejected",
      escalated: "Escalated",
      closed: "Closed",
    };

    for (const [state, display] of Object.entries(stateMap)) {
      const testCase = makeCase({ status: state as WorkflowStateName });
      mockedReadCases.mockReturnValue([testCase]);

      const res = await GET(buildRequest("DSA-2026-00001"), {
        params: Promise.resolve({ ref: "DSA-2026-00001" }),
      });

      const body = await res.json();
      expect(body.displayStatus).toBe(display);
    }
  });
});
