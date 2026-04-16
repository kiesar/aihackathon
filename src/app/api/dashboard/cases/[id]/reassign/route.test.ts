import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Case, User, WorkflowStateName } from "@/types";

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

const teamUsers: User[] = [
  { username: "jsmith", password_hash: "", role: "caseworker", team: "team_a", display_name: "Jane Smith" },
  { username: "mbrown", password_hash: "", role: "caseworker", team: "team_a", display_name: "Mark Brown" },
  { username: "awilson", password_hash: "", role: "team_leader", team: "team_a", display_name: "Alice Wilson" },
  { username: "other", password_hash: "", role: "caseworker", team: "team_b", display_name: "Other User" },
];

function makeCase(overrides: Partial<Case> = {}): Case {
  return {
    case_id: "DSA-2026-00001",
    case_type: "dsa_application",
    status: "awaiting_evidence" as WorkflowStateName,
    applicant: {
      name: "Jane Doe", forenames: "Jane", surname: "Doe", reference: "",
      date_of_birth: "2000-01-15", sex: "female",
      address: { line1: "1 Test St", postcode: "SW1A 1AA" },
      university: "Test Uni", course: "Test Course",
      notification_channel: "email", email: "jane@example.com",
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
  return new NextRequest(`http://localhost/api/dashboard/cases/${caseId}/reassign`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/dashboard/cases/:id/reassign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.username = "awilson";
    mockSession.role = "team_leader";
    mockSession.team = "team_a";
    mockedReadUsers.mockReturnValue(teamUsers);
  });

  it("returns 401 when not authenticated", async () => {
    mockSession.username = undefined;
    const res = await POST(buildRequest("DSA-2026-00001", { newAssignee: "mbrown" }), { params: Promise.resolve({ id: "DSA-2026-00001" }) });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not a team leader", async () => {
    mockSession.role = "caseworker";
    const res = await POST(buildRequest("DSA-2026-00001", { newAssignee: "mbrown" }), { params: Promise.resolve({ id: "DSA-2026-00001" }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 when newAssignee is missing", async () => {
    const res = await POST(buildRequest("DSA-2026-00001", {}), { params: Promise.resolve({ id: "DSA-2026-00001" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("newAssignee");
  });

  it("returns 400 when new assignee does not exist", async () => {
    const res = await POST(buildRequest("DSA-2026-00001", { newAssignee: "nonexistent" }), { params: Promise.resolve({ id: "DSA-2026-00001" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("does not exist");
  });

  it("returns 400 when new assignee is in a different team", async () => {
    const res = await POST(buildRequest("DSA-2026-00001", { newAssignee: "other" }), { params: Promise.resolve({ id: "DSA-2026-00001" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("not in your team");
  });

  it("returns 404 when case not found", async () => {
    mockedReadCases.mockReturnValue([]);
    const res = await POST(buildRequest("DSA-2026-99999", { newAssignee: "mbrown" }), { params: Promise.resolve({ id: "DSA-2026-99999" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 when reassigning to the same user", async () => {
    mockedReadCases.mockReturnValue([makeCase({ assigned_to: "mbrown" })]);
    const res = await POST(buildRequest("DSA-2026-00001", { newAssignee: "mbrown" }), { params: Promise.resolve({ id: "DSA-2026-00001" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("already assigned");
  });

  it("successfully reassigns a case and appends timeline entry", async () => {
    const testCase = makeCase({ assigned_to: "jsmith" });
    mockedReadCases.mockReturnValue([testCase]);

    const res = await POST(buildRequest("DSA-2026-00001", { newAssignee: "mbrown" }), { params: Promise.resolve({ id: "DSA-2026-00001" }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.caseRecord.assigned_to).toBe("mbrown");
    expect(body.caseRecord.timeline).toHaveLength(1);
    expect(body.caseRecord.timeline[0].event).toBe("reassigned");
    expect(body.caseRecord.timeline[0].note).toContain("jsmith");
    expect(body.caseRecord.timeline[0].note).toContain("mbrown");
    expect(body.caseRecord.timeline[0].actor).toBe("awilson");

    expect(mockedWriteCases).toHaveBeenCalledTimes(1);
  });
});
