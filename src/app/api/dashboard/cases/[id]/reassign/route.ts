import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { readCases, writeCases, readUsers } from "@/lib/data-store";
import { sessionOptions, SessionData } from "@/lib/session";

export async function POST(
  request: NextRequest,
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

    if (session.role !== "team_leader") {
      return NextResponse.json(
        { error: "Only team leaders can reassign cases" },
        { status: 403 }
      );
    }

    const { id } = await params;

    let body: { newAssignee?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { newAssignee } = body;

    if (!newAssignee || newAssignee.trim().length === 0) {
      return NextResponse.json(
        { error: "newAssignee is required" },
        { status: 400 }
      );
    }

    // Validate the new assignee exists and is in the same team
    const users = readUsers();
    const assigneeUser = users.find((u) => u.username === newAssignee);
    if (!assigneeUser) {
      return NextResponse.json(
        { error: "The specified user does not exist" },
        { status: 400 }
      );
    }
    if (assigneeUser.team !== session.team) {
      return NextResponse.json(
        { error: "The specified user is not in your team" },
        { status: 400 }
      );
    }

    // Find and update the case
    const cases = readCases();
    const caseIndex = cases.findIndex((c) => c.case_id === id);
    if (caseIndex === -1) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    const caseRecord = cases[caseIndex];
    const previousAssignee = caseRecord.assigned_to;

    if (previousAssignee === newAssignee) {
      return NextResponse.json(
        { error: "Case is already assigned to this user" },
        { status: 400 }
      );
    }

    // Update assigned_to and append timeline entry
    caseRecord.assigned_to = newAssignee;
    caseRecord.last_updated = new Date().toISOString();
    caseRecord.timeline.push({
      date: new Date().toISOString(),
      event: "reassigned",
      note: `Reassigned from ${previousAssignee} to ${newAssignee}`,
      actor: session.username,
    });

    cases[caseIndex] = caseRecord;
    writeCases(cases);

    return NextResponse.json({ caseRecord });
  } catch (error) {
    console.error("Reassign error:", error);
    return NextResponse.json(
      { error: "Sorry, there is a problem with the service. Try again later." },
      { status: 500 }
    );
  }
}
