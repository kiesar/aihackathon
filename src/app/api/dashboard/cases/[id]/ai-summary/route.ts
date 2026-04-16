import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { readCases } from "@/lib/data-store";
import { sessionOptions, SessionData } from "@/lib/session";
import { MockAISummaryService } from "@/services/ai-summary";
import type { AISummaryRequest } from "@/types";

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

    // Build timeline summary for the AI prompt context
    const timelineSummary = caseRecord.timeline
      .map((t) => `${t.date}: [${t.event}] ${t.note}${t.actor ? ` (by ${t.actor})` : ""}`)
      .join("\n");

    const summaryRequest: AISummaryRequest = {
      caseId: caseRecord.case_id,
      caseType: caseRecord.case_type,
      currentState: caseRecord.status,
      applicantName: caseRecord.applicant.name,
      timelineSummary,
      caseNotes: caseRecord.case_notes,
    };

    const aiService = new MockAISummaryService();
    const summary = await aiService.getSummary(summaryRequest);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("AI summary error:", error);
    return NextResponse.json(
      { error: "Sorry, there is a problem with the service. Try again later." },
      { status: 500 }
    );
  }
}
