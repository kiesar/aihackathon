import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { readCases } from "@/lib/data-store";
import { sessionOptions, SessionData } from "@/lib/session";

/**
 * Evidence preview endpoint for caseworkers.
 *
 * In a production system this would serve the actual file from object storage
 * (e.g. S3, Azure Blob). In this prototype, files are stored as metadata only,
 * so this endpoint returns a structured JSON response describing the file and
 * its extracted fields — enough to demonstrate the caseworker preview flow.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; subIdx: string; fileIdx: string }> }
) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.username) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { id, subIdx, fileIdx } = await params;
    const subIndex = parseInt(subIdx, 10);
    const fileIndex = parseInt(fileIdx, 10);

    const allCases = readCases();
    const caseRecord = allCases.find((c) => c.case_id === id);

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const submissions = caseRecord.evidence_submissions ?? [];
    if (subIndex < 0 || subIndex >= submissions.length) {
      return NextResponse.json({ error: "Evidence submission not found" }, { status: 404 });
    }

    const submission = submissions[subIndex];
    if (fileIndex < 0 || fileIndex >= submission.files.length) {
      return NextResponse.json({ error: "File not found in submission" }, { status: 404 });
    }

    const file = submission.files[fileIndex];

    // Return file metadata + extracted fields as a preview payload.
    // A real implementation would redirect to a signed URL or stream the file.
    return NextResponse.json({
      caseId: id,
      submissionIndex: subIndex,
      fileIndex,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
      },
      submittedAt: submission.submitted_at,
      description: submission.description,
      extractedFields: submission.extracted_fields ?? [],
      note: "File content is not stored in this prototype. In production, this endpoint would serve the file from object storage.",
    });
  } catch (error) {
    console.error("Evidence preview error:", error);
    return NextResponse.json(
      { error: "Sorry, there is a problem with the service. Try again later." },
      { status: 500 }
    );
  }
}
