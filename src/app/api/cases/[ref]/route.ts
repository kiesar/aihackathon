import { NextRequest, NextResponse } from "next/server";
import { readCases } from "@/lib/data-store";
import type { WorkflowStateName } from "@/types";

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  try {
    const { ref } = await params;
    const cases = readCases();
    const found = cases.find((c) => c.case_id === ref);

    if (!found) {
      return NextResponse.json(
        { error: "No application found for that reference number. Check the reference and try again." },
        { status: 404 }
      );
    }

    const response: {
      status: WorkflowStateName;
      displayStatus: string;
      lastUpdated: string;
      decisionReason?: string;
    } = {
      status: found.status,
      displayStatus: DISPLAY_STATUS[found.status] ?? found.status,
      lastUpdated: found.last_updated,
    };

    if (
      (found.status === "approved" || found.status === "rejected") &&
      found.decision_reason
    ) {
      response.decisionReason = found.decision_reason;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Sorry, there is a problem with the service. Try again later." },
      { status: 500 }
    );
  }
}
