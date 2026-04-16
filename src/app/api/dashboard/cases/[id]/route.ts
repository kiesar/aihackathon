import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { readCases, readWorkflowStates } from "@/lib/data-store";
import { sessionOptions, SessionData } from "@/lib/session";
import { createPolicyEngine } from "@/services/policy/policy-engine";
import { createWorkflowEngine } from "@/services/workflow/workflow-engine";
import type {
  Case,
  PolicyExtract,
  WorkflowTransition,
  WorkflowStateName,
} from "@/types";

export interface CaseDetailResponse {
  caseRecord: Case;
  policyExtracts: PolicyExtract[];
  relevantClauses: PolicyExtract[];
  permittedTransitions: WorkflowTransition[];
  requiredAction: string;
  evidenceDaysOutstanding: number | null;
  evidenceFlag: "none" | "reminder" | "escalation";
}

function calculateEvidenceInfo(
  caseRecord: Case,
  now: Date
): { days: number | null; flag: "none" | "reminder" | "escalation" } {
  if (
    caseRecord.status !== "awaiting_evidence" ||
    !caseRecord.evidence_requested_date
  ) {
    return { days: null, flag: "none" };
  }

  const requested = new Date(caseRecord.evidence_requested_date);
  const elapsed = Math.floor(
    (now.getTime() - requested.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (elapsed >= 56) {
    return { days: elapsed, flag: "escalation" };
  }
  if (elapsed >= 28) {
    return { days: elapsed, flag: "reminder" };
  }
  return { days: elapsed, flag: "none" };
}

function getRequiredAction(currentState: WorkflowStateName): string {
  const states = readWorkflowStates();
  const stateDef = states.find((s) => s.state_id === currentState);
  return stateDef?.required_action ?? "No action defined for this state.";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.username) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { id } = await params;
    const allCases = readCases();
    const caseRecord = allCases.find((c) => c.case_id === id);

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const policyEngine = createPolicyEngine();
    const workflowEngine = createWorkflowEngine();

    const policyExtracts = policyEngine.getPoliciesForCase(caseRecord.case_type);
    const relevantClauses = policyEngine.getRelevantClauses(
      caseRecord.case_type,
      caseRecord.status
    );
    const permittedTransitions = workflowEngine.getPermittedTransitions(
      caseRecord.status
    );
    const requiredAction = getRequiredAction(caseRecord.status);

    // Sort timeline entries chronologically (ascending by date) per Requirement 7.2
    const sortedTimeline = [...caseRecord.timeline].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const sortedCaseRecord = { ...caseRecord, timeline: sortedTimeline };

    const now = new Date();
    const { days, flag } = calculateEvidenceInfo(caseRecord, now);

    const response: CaseDetailResponse = {
      caseRecord: sortedCaseRecord,
      policyExtracts,
      relevantClauses,
      permittedTransitions,
      requiredAction,
      evidenceDaysOutstanding: days,
      evidenceFlag: flag,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Case detail error:", error);
    return NextResponse.json(
      { error: "Sorry, there is a problem with the service. Try again later." },
      { status: 500 }
    );
  }
}
