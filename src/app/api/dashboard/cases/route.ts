import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { readCases, readUsers } from "@/lib/data-store";
import { sessionOptions, SessionData } from "@/lib/session";
import type { Case, WorkflowStateName } from "@/types";

export interface DashboardCaseItem {
  case_id: string;
  case_type: string;
  status: WorkflowStateName;
  applicant_name: string;
  created_date: string;
  last_updated: string;
  evidence_flag: "none" | "reminder" | "escalation";
  days_outstanding: number | null;
  assigned_to?: string;
}

export interface DashboardCasesResponse {
  cases: DashboardCaseItem[];
  totalCount: number;
  escalationCount: number;
  stateCounts?: Record<string, number>;
}

function calculateEvidenceFlag(
  c: Case,
  now: Date
): { flag: "none" | "reminder" | "escalation"; days: number | null } {
  if (
    c.status !== "awaiting_evidence" ||
    !c.evidence_requested_date
  ) {
    return { flag: "none", days: null };
  }

  const requested = new Date(c.evidence_requested_date);
  const elapsed = Math.floor(
    (now.getTime() - requested.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (elapsed >= 56) {
    return { flag: "escalation", days: elapsed };
  }
  if (elapsed >= 28) {
    return { flag: "reminder", days: elapsed };
  }
  return { flag: "none", days: elapsed };
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.username) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const statusFilter = searchParams.get("status") as WorkflowStateName | null;
    const sortField = searchParams.get("sort") || "created_date";
    const sortOrder = searchParams.get("order") || "desc";
    const viewParam = searchParams.get("view");

    const allCases = readCases();
    const now = new Date();

    const isTeamView = viewParam === "team" && session.role === "team_leader";

    let filtered: Case[];
    if (isTeamView) {
      // Team leader view: show all cases assigned to any team member
      const users = readUsers();
      const teamUsernames = new Set(
        users
          .filter((u) => u.team === session.team)
          .map((u) => u.username)
      );
      filtered = allCases.filter((c) => teamUsernames.has(c.assigned_to));
    } else {
      // Caseworker view: show only own cases
      filtered = allCases.filter((c) => c.assigned_to === session.username);
    }

    // Apply status filter if provided
    if (statusFilter) {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    // Map to response items with evidence flags
    const items: DashboardCaseItem[] = filtered.map((c) => {
      const { flag, days } = calculateEvidenceFlag(c, now);
      return {
        case_id: c.case_id,
        case_type: c.case_type,
        status: c.status,
        applicant_name: c.applicant.name,
        created_date: c.created_date,
        last_updated: c.last_updated,
        evidence_flag: flag,
        days_outstanding: days,
        ...(isTeamView ? { assigned_to: c.assigned_to } : {}),
      };
    });

    // Sort
    items.sort((a, b) => {
      const field = sortField === "last_updated" ? "last_updated" : "created_date";
      const dateA = new Date(a[field]).getTime();
      const dateB = new Date(b[field]).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    const escalationCount = items.filter(
      (c) => c.evidence_flag === "escalation"
    ).length;

    const response: DashboardCasesResponse = {
      cases: items,
      totalCount: items.length,
      escalationCount,
    };

    // Include state counts for team view
    if (isTeamView) {
      const stateCounts: Record<string, number> = {};
      for (const item of items) {
        stateCounts[item.status] = (stateCounts[item.status] || 0) + 1;
      }
      response.stateCounts = stateCounts;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Dashboard cases error:", error);
    return NextResponse.json(
      { error: "Sorry, there is a problem with the service. Try again later." },
      { status: 500 }
    );
  }
}
