/**
 * OCR text extraction and field parsing utilities.
 *
 * Handles two extraction paths:
 *  - PDF files: text extracted via pdf-parse (no OCR needed for digital PDFs)
 *  - Images (JPG, PNG): text extracted via tesseract.js OCR
 *
 * After raw text is obtained, field-level parsing uses regex patterns to
 * identify dates, monetary amounts, reference numbers, organisation names,
 * and other structured values commonly found in DSA evidence documents.
 */

import type { ExtractedEvidenceField } from "@/types";

// ── Raw text extraction ──────────────────────────────────────

/**
 * Extract raw text from a PDF buffer using pdf-parse.
 * Falls back gracefully if the PDF is image-only (scanned).
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Dynamic import avoids issues with Next.js edge runtime
  const pdfParse = (await import("pdf-parse")).default;
  try {
    const data = await pdfParse(buffer);
    return data.text ?? "";
  } catch {
    return "";
  }
}

/**
 * Extract raw text from an image buffer using tesseract.js.
 * Uses the English language pack bundled with tesseract.js.
 */
export async function extractTextFromImage(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    // tesseract.js accepts a Buffer directly
    const { data } = await worker.recognize(buffer);
    return data.text ?? "";
  } finally {
    await worker.terminate();
  }
}

// ── Field parsing ────────────────────────────────────────────

/**
 * Confidence scoring based on how many regex groups matched.
 */
function score(value: string): "high" | "medium" | "low" {
  if (!value || value.trim().length === 0) return "low";
  if (value.includes("Unable to extract")) return "low";
  return "high";
}

/**
 * Try each pattern in order, return the first match or fallback.
 */
function firstMatch(text: string, patterns: RegExp[], group = 1): string {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[group]) return m[group].trim();
  }
  return "";
}

/**
 * Find all non-overlapping matches and join them.
 */
function allMatches(text: string, pattern: RegExp, group = 1): string {
  const results: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  while ((m = re.exec(text)) !== null) {
    if (m[group]) results.push(m[group].trim());
  }
  return results.join(", ");
}

// ── Date patterns ────────────────────────────────────────────

const DATE_PATTERNS = [
  // "12 March 2026", "12th March 2026"
  /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/i,
  // "March 12, 2026"
  /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/i,
  // "12/03/2026" or "12-03-2026"
  /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/,
  // "2026-03-12"
  /\b(\d{4}-\d{2}-\d{2})\b/,
];

// ── Money patterns ───────────────────────────────────────────

const MONEY_PATTERNS = [
  /(?:total|amount|price|cost|fee|charge)[^\n£$]*[£$]\s*([\d,]+\.?\d{0,2})/i,
  /[£$]\s*([\d,]+\.\d{2})\b/,
  /\b([\d,]+\.\d{2})\s*(?:GBP|USD|EUR)\b/i,
];

const VAT_PATTERNS = [
  /(?:VAT|tax)[^\n£$]*[£$]\s*([\d,]+\.?\d{0,2})/i,
  /(?:VAT|tax)\s*@\s*\d+%[^\n£$]*[£$]\s*([\d,]+\.?\d{0,2})/i,
];

const TOTAL_PATTERNS = [
  /(?:total|grand total|total due|amount due)[^\n£$]*[£$]\s*([\d,]+\.?\d{0,2})/i,
  /(?:total|grand total)[^\n]*\n[^\n£$]*[£$]\s*([\d,]+\.?\d{0,2})/i,
];

// ── Reference patterns ───────────────────────────────────────

const REF_PATTERNS = [
  /(?:ref(?:erence)?|invoice\s*(?:no|number|#)|quote\s*(?:no|number|#)|order\s*(?:no|number|#))[:\s#]*([A-Z0-9\-\/]{4,20})/i,
  /\b([A-Z]{2,4}[-\/]\d{4}[-\/]\d{3,6})\b/,
  /\b(INV|QT|ORD|REF|DSA)[-\/]?\d{4,10}\b/i,
];

// ── Organisation / name patterns ─────────────────────────────

const ORG_PATTERNS = [
  /(?:from|issued by|prepared by|supplier|provider|organisation|company)[:\s]+([A-Z][A-Za-z\s&.,'-]{3,60}?)(?:\n|Ltd|Limited|PLC|NHS|Trust|Council|University)/i,
  /^([A-Z][A-Za-z\s&.,'-]{3,60}(?:Ltd|Limited|PLC|NHS|Trust|Council|University))/m,
];

const PERSON_PATTERNS = [
  /(?:patient|applicant|name|dear\s+(?:Mr|Mrs|Ms|Dr))[:\s.]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
  /(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/,
];

// ── Document type detection ──────────────────────────────────

function detectDocumentType(text: string, fileName: string, description: string): string {
  const t = (text + " " + fileName + " " + description).toLowerCase();

  if (t.includes("diagnostic") || t.includes("assessment report") || t.includes("learning difficulty") || t.includes("dyslexia") || t.includes("adhd")) {
    return "Diagnostic / assessment report";
  }
  if (t.includes("invoice") || t.includes("inv-") || t.includes("tax invoice")) {
    return "Invoice";
  }
  if (t.includes("quote") || t.includes("quotation") || t.includes("qt-")) {
    return "Supplier quote";
  }
  if (t.includes("bank statement") || t.includes("account statement") || t.includes("sort code")) {
    return "Bank statement";
  }
  if (t.includes("payslip") || t.includes("pay slip") || t.includes("salary") || t.includes("earnings")) {
    return "Payslip";
  }
  if (t.includes("council tax") || t.includes("utility") || t.includes("electricity") || t.includes("gas bill") || t.includes("water bill")) {
    return "Proof of address (utility / council tax)";
  }
  if (t.includes("letter") && (t.includes("nhs") || t.includes("hospital") || t.includes("gp") || t.includes("doctor"))) {
    return "Medical letter";
  }
  if (t.includes("prescription")) {
    return "Prescription";
  }
  if (t.includes("passport") || t.includes("driving licence") || t.includes("national insurance")) {
    return "Identity document";
  }
  return "Document";
}

// ── Main field extraction ────────────────────────────────────

/**
 * Parse raw OCR/PDF text into structured ExtractedEvidenceField array.
 * Uses regex heuristics to identify common field types.
 */
export function parseFieldsFromText(
  text: string,
  fileName: string,
  description: string
): ExtractedEvidenceField[] {
  const fields: ExtractedEvidenceField[] = [];

  // Document type
  const docType = detectDocumentType(text, fileName, description);
  fields.push({
    key: "document_type",
    label: "Document type",
    value: docType,
    confidence: docType !== "Document" ? "high" : "medium",
  });

  // Date
  const dateVal = firstMatch(text, DATE_PATTERNS);
  fields.push({
    key: "document_date",
    label: "Document date",
    value: dateVal || "Unable to extract — please enter manually",
    confidence: score(dateVal),
  });

  // Issuing organisation
  const orgVal = firstMatch(text, ORG_PATTERNS);
  fields.push({
    key: "issuing_body",
    label: "Issuing organisation",
    value: orgVal || "Unable to extract — please enter manually",
    confidence: orgVal ? "medium" : "low",
  });

  // Reference number
  const refVal = firstMatch(text, REF_PATTERNS);
  if (refVal) {
    fields.push({
      key: "reference_number",
      label: "Reference number",
      value: refVal,
      confidence: "high",
    });
  }

  // Person name (patient / applicant)
  const personVal = firstMatch(text, PERSON_PATTERNS);
  if (personVal) {
    fields.push({
      key: "person_name",
      label: "Name on document",
      value: personVal,
      confidence: "medium",
    });
  }

  // Monetary amounts — only add if found
  const amountVal = firstMatch(text, MONEY_PATTERNS);
  if (amountVal) {
    fields.push({
      key: "amount",
      label: "Amount (£)",
      value: `£${amountVal}`,
      confidence: "high",
    });
  }

  const vatVal = firstMatch(text, VAT_PATTERNS);
  if (vatVal) {
    fields.push({
      key: "vat",
      label: "VAT",
      value: `£${vatVal}`,
      confidence: "medium",
    });
  }

  const totalVal = firstMatch(text, TOTAL_PATTERNS);
  if (totalVal && totalVal !== amountVal) {
    fields.push({
      key: "total",
      label: "Total (inc. VAT)",
      value: `£${totalVal}`,
      confidence: "high",
    });
  }

  // UK postcode
  const postcodeMatch = text.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/i);
  if (postcodeMatch) {
    fields.push({
      key: "postcode",
      label: "Postcode",
      value: postcodeMatch[1].toUpperCase(),
      confidence: "high",
    });
  }

  // UK sort code
  const sortCodeMatch = text.match(/\b(\d{2}[-\s]\d{2}[-\s]\d{2})\b/);
  if (sortCodeMatch) {
    fields.push({
      key: "sort_code",
      label: "Sort code",
      value: sortCodeMatch[1],
      confidence: "high",
    });
  }

  // UK account number
  const accountMatch = text.match(/(?:account\s*(?:no|number|#)?)[:\s]*(\d{8})\b/i);
  if (accountMatch) {
    fields.push({
      key: "account_number",
      label: "Account number",
      value: accountMatch[1],
      confidence: "high",
    });
  }

  return fields;
}
