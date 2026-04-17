import { NextRequest, NextResponse } from "next/server";
import {
  extractTextFromPdf,
  extractTextFromImage,
  parseFieldsFromText,
} from "@/lib/ocr-extract";

/**
 * Real-time evidence extraction endpoint.
 *
 * Accepts multipart/form-data with:
 *   - file      : the uploaded file (Blob)
 *   - fileName  : original file name
 *   - fileType  : MIME type
 *   - description: user-provided description
 *
 * Extraction strategy:
 *   - PDF  → pdf-parse (text layer extraction, fast and accurate for digital PDFs)
 *   - Image (JPG/PNG) → tesseract.js OCR
 *   - Other → returns low-confidence placeholder fields
 *
 * The interface is identical to the previous mock so no UI changes are needed.
 */
export async function POST(request: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    const file = formData.get("file") as Blob | null;
    const fileName = (formData.get("fileName") as string) ?? "";
    const fileType = (formData.get("fileType") as string) ?? "";
    const description = (formData.get("description") as string) ?? "";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Convert Blob → Node Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let rawText = "";
    let extractionMethod = "none";

    const isPdf =
      fileType === "application/pdf" ||
      fileName.toLowerCase().endsWith(".pdf");

    const isImage =
      fileType.startsWith("image/") ||
      /\.(jpe?g|png|bmp|tiff?|webp)$/i.test(fileName);

    if (isPdf) {
      rawText = await extractTextFromPdf(buffer);
      extractionMethod = "pdf-parse";
    } else if (isImage) {
      rawText = await extractTextFromImage(buffer, fileType);
      extractionMethod = "tesseract";
    }
    // DOC/DOCX: no open-source pure-JS parser with reliable output;
    // fall through to placeholder fields with low confidence.

    const fields = parseFieldsFromText(rawText, fileName, description);

    return NextResponse.json({
      fields,
      isAiExtracted: true,
      extractionMethod,
      rawTextLength: rawText.length,
      extractedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Evidence extraction error:", error);
    return NextResponse.json(
      {
        error:
          "Sorry, there is a problem extracting information from the file. You can still review and submit manually.",
      },
      { status: 500 }
    );
  }
}
