import { NextRequest, NextResponse } from "next/server";
import { readCases, writeCases } from "@/lib/data-store";
import { MockNotificationService } from "@/services/notifications";

interface EvidencePayload {
  caseReference: string;
  description: string;
  files: Array<{ name: string; size: number; type: string }>;
}

export async function POST(request: NextRequest) {
  try {
    let body: EvidencePayload;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { caseReference, description, files } = body;

    if (!caseReference) {
      return NextResponse.json(
        { error: "Case reference is required" },
        { status: 400 }
      );
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: "A description of the evidence is required" },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "At least one file must be uploaded" },
        { status: 400 }
      );
    }

    const cases = readCases();
    const caseIndex = cases.findIndex((c) => c.case_id === caseReference);

    if (caseIndex === -1) {
      return NextResponse.json(
        { error: "No application found for that reference number" },
        { status: 404 }
      );
    }

    const caseRecord = cases[caseIndex];

    // Only allow evidence upload when status is awaiting_evidence or evidence_requested
    if (
      caseRecord.status !== "awaiting_evidence" &&
      caseRecord.status !== "evidence_requested"
    ) {
      return NextResponse.json(
        { error: "Evidence cannot be uploaded for this case at its current stage" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const fileNames = files.map((f) => f.name).join(", ");

    // Update case: transition to evidence_received, add timeline entry
    caseRecord.status = "evidence_received";
    caseRecord.last_updated = now;
    caseRecord.timeline.push({
      date: now,
      event: "evidence_received",
      note: `Evidence uploaded by applicant: ${description.trim()}. Files: ${fileNames}`,
    });

    cases[caseIndex] = caseRecord;
    writeCases(cases);

    // Send notification to applicant confirming evidence received
    const notificationService = new MockNotificationService();
    const confirmMsg = `Evidence received for case ${caseReference}. A caseworker will review your documents.`;
    console.log(`[Notification] Evidence confirmation: ${confirmMsg}`);

    return NextResponse.json(
      { message: "Evidence uploaded successfully", caseReference },
      { status: 200 }
    );
  } catch (error) {
    console.error("Evidence upload error:", error);
    return NextResponse.json(
      { error: "Sorry, there is a problem with the service. Try again later." },
      { status: 500 }
    );
  }
}
