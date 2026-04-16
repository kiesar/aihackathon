import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { readCases } from "@/lib/data-store";
import { sessionOptions, SessionData } from "@/lib/session";
import {
  createWorkflowEngine,
  WorkflowEngineError,
} from "@/services/workflow/workflow-engine";
import { MockNotificationService } from "@/services/notifications";
import type { WorkflowStateName } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.username) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { id } = await params;

    // Parse request body
    let body: {
      toState?: WorkflowStateName;
      note?: string;
      decisionReason?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { toState, note, decisionReason } = body;

    // Validate required fields
    if (!toState) {
      return NextResponse.json(
        { error: "toState is required" },
        { status: 400 }
      );
    }

    if (!note || note.trim().length === 0) {
      return NextResponse.json(
        { error: "Enter a note before updating the case status" },
        { status: 400 }
      );
    }

    // Validate decisionReason for terminal states
    if (
      (toState === "approved" || toState === "rejected") &&
      (!decisionReason || decisionReason.trim().length === 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a decision reason before approving or rejecting this case",
        },
        { status: 400 }
      );
    }

    // Apply transition
    const workflowEngine = createWorkflowEngine();
    const updatedCase = await workflowEngine.applyTransition(
      id,
      toState,
      note.trim(),
      session.username,
      decisionReason?.trim()
    );

    // Send outcome notification for approved/rejected
    if (toState === "approved" || toState === "rejected") {
      const notificationService = new MockNotificationService();
      await notificationService.sendOutcome(
        updatedCase.applicant,
        updatedCase.case_id,
        toState
      );
    }

    return NextResponse.json({ caseRecord: updatedCase });
  } catch (error) {
    if (error instanceof WorkflowEngineError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("Transition error:", error);
    return NextResponse.json(
      { error: "Sorry, there is a problem with the service. Try again later." },
      { status: 500 }
    );
  }
}
