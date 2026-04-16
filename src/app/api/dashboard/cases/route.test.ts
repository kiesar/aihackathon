import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Case, WorkflowStateName } from "@/types";

// Mock data-store and iron-session
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
import { readCases, readUsers } from "@/lib/data-store";
import { NextRequest } from "next/server";

const mockedReadCases = vi.mocked(readCases);
const mockedReadUsers = vi.mocked(readUsers);

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

function buildRequest(query = "") {
  return new NextRequest(`http://localhost/api/dashboard/cases${query ? `?${query}` : ""}`);
}

describe("GET /api/dashboard/cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up authenticated session
    mockSession.username = "jsmith";
    mockSession.role = "caseworker";
    mockSession.team = "team_a";
  });

  it("returns 401 when not authenticated", async () => {
    mockSession.username = undefined;
    mockedReadCases.mockReturnValue([]);

    const res = await GET(buildRequest());
    expect(res.status).toBe(401);
  });

  it("returns only cases assigned to the authenticated user", async () => {
    const myCase = makeCase({ case_id: "DSA-2026-00001", assigned_to: "jsmith" });
    const otherCase = makeCase({ case_id: "DSA-2026-00002", assigned_to: "mbrown" });
    mockedReadCases.mockReturnValue([myCase, otherCase]);

    const res = await GET(buildRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalCount).toBe(1);
    expect(body.cases).toHaveLength(1);
    expect(body.cases[0].case_id).toBe("DSA-2026-00001");
  });

  it("filters by status query param", async () => {
    const case1 = makeCase({ case_id: "DSA-2026-00001", status: "awaiting_evidence" });
    const case2 = makeCase({ case_id: "DSA-2026-00002", status: "under_review" });
    mockedReadCases.mockReturnValue([case1, case2]);

    const res = await GET(buildRequest("status=under_review"));
    const body = await res.json();
    expect(body.totalCount).toBe(1);
    expect(body.cases[0].case_id).toBe("DSA-2026-00002");
  });

  it("sorts by created_date descending by default", async () => {
    const older = makeCase({ case_id: "DSA-2026-00001", created_date: "2026-01-01T00:00:00.000Z" });
    const newer = makeCase({ case_id: "DSA-2026-00002", created_date: "2026-02-01T00:00:00.000Z" });
    mockedReadCases.mockReturnValue([older, newer]);

    const res = await GET(buildRequest());
    const body = await res.json();
    expect(body.cases[0].case_id).toBe("DSA-2026-00002");
    expect(body.cases[1].case_id).toBe("DSA-2026-00001");
  });

  it("sorts by created_date ascending when requested", async () => {
    const older = makeCase({ case_id: "DSA-2026-00001", created_date: "2026-01-01T00:00:00.000Z" });
    const newer = makeCase({ case_id: "DSA-2026-00002", created_date: "2026-02-01T00:00:00.000Z" });
    mockedReadCases.mockReturnValue([older, newer]);

    const res = await GET(buildRequest("sort=created_date&order=asc"));
    const body = await res.json();
    expect(body.cases[0].case_id).toBe("DSA-2026-00001");
    expect(body.cases[1].case_id).toBe("DSA-2026-00002");
  });

  it("sorts by last_updated when requested", async () => {
    const case1 = makeCase({ case_id: "DSA-2026-00001", last_updated: "2026-03-01T00:00:00.000Z" });
    const case2 = makeCase({ case_id: "DSA-2026-00002", last_updated: "2026-01-01T00:00:00.000Z" });
    mockedReadCases.mockReturnValue([case1, case2]);

    const res = await GET(buildRequest("sort=last_updated&order=asc"));
    const body = await res.json();
    expect(body.cases[0].case_id).toBe("DSA-2026-00002");
    expect(body.cases[1].case_id).toBe("DSA-2026-00001");
  });

  it("calculates escalation flag for 56+ days outstanding", async () => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const escalatedCase = makeCase({
      case_id: "DSA-2026-00001",
      status: "awaiting_evidence",
      evidence_requested_date: sixtyDaysAgo.toISOString(),
    });
    mockedReadCases.mockReturnValue([escalatedCase]);

    const res = await GET(buildRequest());
    const body = await res.json();
    expect(body.cases[0].evidence_flag).toBe("escalation");
    expect(body.cases[0].days_outstanding).toBeGreaterThanOrEqual(60);
    expect(body.escalationCount).toBe(1);
  });

  it("calculates reminder flag for 28-55 days outstanding", async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const reminderCase = makeCase({
      case_id: "DSA-2026-00001",
      status: "awaiting_evidence",
      evidence_requested_date: thirtyDaysAgo.toISOString(),
    });
    mockedReadCases.mockReturnValue([reminderCase]);

    const res = await GET(buildRequest());
    const body = await res.json();
    expect(body.cases[0].evidence_flag).toBe("reminder");
    expect(body.cases[0].days_outstanding).toBeGreaterThanOrEqual(30);
    expect(body.escalationCount).toBe(0);
  });

  it("returns no flag for cases under 28 days", async () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const recentCase = makeCase({
      case_id: "DSA-2026-00001",
      status: "awaiting_evidence",
      evidence_requested_date: tenDaysAgo.toISOString(),
    });
    mockedReadCases.mockReturnValue([recentCase]);

    const res = await GET(buildRequest());
    const body = await res.json();
    expect(body.cases[0].evidence_flag).toBe("none");
  });

  it("returns no flag for non-awaiting_evidence cases even with evidence_requested_date", async () => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const reviewCase = makeCase({
      case_id: "DSA-2026-00001",
      status: "under_review",
      evidence_requested_date: sixtyDaysAgo.toISOString(),
    });
    mockedReadCases.mockReturnValue([reviewCase]);

    const res = await GET(buildRequest());
    const body = await res.json();
    expect(body.cases[0].evidence_flag).toBe("none");
    expect(body.cases[0].days_outstanding).toBeNull();
  });

  it("returns correct totalCount and escalationCount", async () => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const cases = [
      makeCase({ case_id: "DSA-2026-00001", status: "awaiting_evidence", evidence_requested_date: sixtyDaysAgo.toISOString() }),
      makeCase({ case_id: "DSA-2026-00002", status: "under_review" }),
      makeCase({ case_id: "DSA-2026-00003", status: "awaiting_evidence", evidence_requested_date: sixtyDaysAgo.toISOString() }),
    ];
    mockedReadCases.mockReturnValue(cases);

    const res = await GET(buildRequest());
    const body = await res.json();
    expect(body.totalCount).toBe(3);
    expect(body.escalationCount).toBe(2);
  });

  it("returns empty list when no cases assigned", async () => {
    mockedReadCases.mockReturnValue([]);

    const res = await GET(buildRequest());
    const body = await res.json();
    expect(body.totalCount).toBe(0);
    expect(body.escalationCount).toBe(0);
    expect(body.cases).toEqual([]);
  });
});

describe("GET /api/dashboard/cases?view=team", () => {
  const teamUsers = [
    { username: "jsmith", password_hash: "", role: "caseworker" as const, team: "team_a", display_name: "Jane Smith" },
    { username: "mbrown", password_hash: "", role: "caseworker" as const, team: "team_a", display_name: "Mark Brown" },
    { username: "awilson", password_hash: "", role: "team_leader" as const, team: "team_a", display_name: "Alice Wilson" },
    { username: "other", password_hash: "", role: "caseworker" as const, team: "team_b", display_name: "Other User" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.username = "awilson";
    mockSession.role = "team_leader";
    mockSession.team = "team_a";
    mockedReadUsers.mockReturnValue(teamUsers);
  });

  it("returns all team cases for team leader with view=team", async () => {
    const case1 = makeCase({ case_id: "DSA-2026-00001", assigned_to: "jsmith" });
    const case2 = makeCase({ case_id: "DSA-2026-00002", assigned_to: "mbrown" });
    const case3 = makeCase({ case_id: "DSA-2026-00003", assigned_to: "other" });
    mockedReadCases.mockReturnValue([case1, case2, case3]);

    const res = await GET(buildRequest("view=team"));
    const body = await res.json();
    expect(body.totalCount).toBe(2);
    expect(body.cases.map((c: { case_id: string }) => c.case_id).sort()).toEqual(["DSA-2026-00001", "DSA-2026-00002"]);
  });

  it("includes assigned_to in team view response items", async () => {
    const case1 = makeCase({ case_id: "DSA-2026-00001", assigned_to: "jsmith" });
    mockedReadCases.mockReturnValue([case1]);

    const res = await GET(buildRequest("view=team"));
    const body = await res.json();
    expect(body.cases[0].assigned_to).toBe("jsmith");
  });

  it("includes stateCounts in team view response", async () => {
    const cases = [
      makeCase({ case_id: "DSA-2026-00001", assigned_to: "jsmith", status: "awaiting_evidence" }),
      makeCase({ case_id: "DSA-2026-00002", assigned_to: "mbrown", status: "awaiting_evidence" }),
      makeCase({ case_id: "DSA-2026-00003", assigned_to: "jsmith", status: "under_review" }),
    ];
    mockedReadCases.mockReturnValue(cases);

    const res = await GET(buildRequest("view=team"));
    const body = await res.json();
    expect(body.stateCounts).toEqual({
      awaiting_evidence: 2,
      under_review: 1,
    });
  });

  it("falls back to caseworker view when role is not team_leader", async () => {
    mockSession.username = "jsmith";
    mockSession.role = "caseworker";
    mockSession.team = "team_a";

    const case1 = makeCase({ case_id: "DSA-2026-00001", assigned_to: "jsmith" });
    const case2 = makeCase({ case_id: "DSA-2026-00002", assigned_to: "mbrown" });
    mockedReadCases.mockReturnValue([case1, case2]);

    const res = await GET(buildRequest("view=team"));
    const body = await res.json();
    expect(body.totalCount).toBe(1);
    expect(body.cases[0].case_id).toBe("DSA-2026-00001");
    expect(body.stateCounts).toBeUndefined();
  });

  it("applies status filter in team view", async () => {
    const cases = [
      makeCase({ case_id: "DSA-2026-00001", assigned_to: "jsmith", status: "awaiting_evidence" }),
      makeCase({ case_id: "DSA-2026-00002", assigned_to: "mbrown", status: "under_review" }),
    ];
    mockedReadCases.mockReturnValue(cases);

    const res = await GET(buildRequest("view=team&status=under_review"));
    const body = await res.json();
    expect(body.totalCount).toBe(1);
    expect(body.cases[0].case_id).toBe("DSA-2026-00002");
  });
});
