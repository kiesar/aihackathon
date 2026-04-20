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
 * Extract raw text from a PDF buffer using pdf-parse v2.
 * Uses the PDFParse class with getText() method.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText({ pageJoiner: "\n" });
    const text = result.text ?? "";
    console.log(`[pdf-parse] Extracted ${text.length} chars, ${result.total} pages`);
    return text;
  } catch (err) {
    console.error("[pdf-parse] Extraction failed:", err);
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
  // "Date: 12/03/2026" or "Dated: ..."
  /(?:date[d]?|issued)[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
];

// ── Money patterns ───────────────────────────────────────────

const MONEY_PATTERNS = [
  // "Total: £349.00" or "Amount £349"
  /(?:total|amount|price|cost|fee|charge|subtotal)[^\n£$€]*[£$€]\s*([\d,]+\.?\d{0,2})/i,
  // "£349.00" standalone
  /[£$€]\s*([\d,]+\.\d{2})\b/,
  // "349.00 GBP"
  /\b([\d,]+\.\d{2})\s*(?:GBP|USD|EUR)\b/i,
  // Plain number after currency label
  /(?:£|GBP)\s*(\d[\d,]*(?:\.\d{1,2})?)/,
];

const VAT_PATTERNS = [
  /(?:VAT|tax)[^\n£$€]*[£$€]\s*([\d,]+\.?\d{0,2})/i,
  /(?:VAT|tax)\s*@\s*\d+%[^\n£$€]*[£$€]\s*([\d,]+\.?\d{0,2})/i,
  /(?:VAT|tax)[:\s]+([\d,]+\.\d{2})/i,
];

const TOTAL_PATTERNS = [
  /(?:total|grand\s*total|total\s*due|amount\s*due|balance\s*due)[^\n£$€]*[£$€]\s*([\d,]+\.?\d{0,2})/i,
  /(?:total|grand\s*total)[^\n]*\n[^\n£$€]*[£$€]\s*([\d,]+\.?\d{0,2})/i,
  /(?:total|grand\s*total)[:\s]+([\d,]+\.\d{2})/i,
];

// ── Reference patterns ───────────────────────────────────────

const REF_PATTERNS = [
  // "Invoice No: INV-2026-001" or "Reference: REF123"
  /(?:invoice\s*(?:no|number|#|num)|ref(?:erence)?(?:\s*no)?|quote\s*(?:no|number|#)|order\s*(?:no|number|#))[:\s#]*([A-Z0-9][A-Z0-9\-\/]{3,20})/i,
  // Structured codes like "INV-2026-001", "QT-2026-001"
  /\b([A-Z]{2,4}[-\/]\d{4}[-\/]\d{3,6})\b/,
  /\b(INV|QT|ORD|REF|DSA|CASE)[-\/]?\d{4,10}\b/i,
  // Any alphanumeric reference after "Ref:" or "No:"
  /(?:ref|no)[.:\s]+([A-Z0-9]{4,15})\b/i,
];

// ── Organisation / name patterns ─────────────────────────────

const ORG_PATTERNS = [
  // Explicit "Issuing Organisation: Glasgow City Council" format
  /(?:issuing\s*organisation|issuing\s*organization|organisation|organization)[:\s]+([A-Z][A-Za-z0-9\s&.,'\-]{3,60}?)(?:\n|$)/i,
  // "From: Acme Ltd" or "Supplier: Acme Ltd"
  /(?:from|issued\s*by|prepared\s*by|supplier|provider|company|practice|clinic|hospital|trust)[:\s]+([A-Z][A-Za-z0-9\s&.,'\-]{3,60}?)(?:\n|$|Ltd|Limited|PLC|NHS|Trust|Council|University|College)/i,
  // Lines ending in Ltd/PLC/NHS/Trust etc
  /^([A-Z][A-Za-z0-9\s&.,'\-]{3,60}(?:Ltd|Limited|PLC|NHS|Trust|Council|University|College|Practice|Clinic))/m,
  // "To: Student Name" — skip, look for org on next line
  /(?:^|\n)([A-Z][A-Za-z\s&.,'\-]{5,50}(?:Ltd|Limited|PLC|NHS|Trust|Council|University|College))/m,
];

const PERSON_PATTERNS = [
  // Explicit "Full Name: Emma Roberts" format
  /(?:full\s*name|name)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?:\n|$)/i,
  // "Patient: John Smith" or "Applicant: John Smith"
  /(?:patient|applicant|student|claimant)[:\s.]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
  // "Dear Mr Smith" or "Dear Ms Jones"
  /(?:dear\s+)(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  // "Mr John Smith" or "Dr Jane Doe"
  /\b(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/,
  // "To: John Smith" at start of line
  /^To[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/m,
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

  // Normalise whitespace — PDFs often have excessive spaces/newlines
  const normalised = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (normalised.length === 0) {
    console.warn("[parseFields] Empty text — no fields can be extracted");
    return fields;
  }

  console.log(`[parseFields] Working with ${normalised.length} chars of normalised text`);

  // ── Step 1: Extract explicit key-value pairs ─────────────
  // Handles structured PDFs with "Label: Value" format, e.g.:
  //   Issuing Organisation: Glasgow City Council
  //   Document Date: 10/03/2025
  //   Full Name: Emma Roberts
  const kvMap = new Map<string, string>();
  const kvPattern = /^([A-Za-z][A-Za-z\s\/]{2,40}?)\s*:\s*(.+)$/gm;
  let kvMatch: RegExpExecArray | null;
  while ((kvMatch = kvPattern.exec(normalised)) !== null) {
    const key = kvMatch[1].trim().toLowerCase().replace(/\s+/g, "_");
    const value = kvMatch[2].trim();
    kvMap.set(key, value);
    console.log(`[parseFields] KV pair: "${key}" = "${value}"`);
  }

  // Helper: look up a KV value by any of the given key aliases
  function kv(...aliases: string[]): string {
    for (const alias of aliases) {
      const val = kvMap.get(alias.toLowerCase().replace(/\s+/g, "_"));
      if (val) return val;
    }
    return "";
  }

  // Document type
  const docType = kv("document_type", "document type", "type") ||
    detectDocumentType(normalised, fileName, description);
  fields.push({
    key: "document_type",
    label: "Document type",
    value: docType,
    confidence: docType !== "Document" ? "high" : "medium",
  });

  // Date
  const dateVal = kv("document_date", "document date", "date", "dated", "issue_date", "issue date") ||
    firstMatch(normalised, DATE_PATTERNS);
  fields.push({
    key: "document_date",
    label: "Document date",
    value: dateVal || "Unable to extract — please enter manually",
    confidence: score(dateVal),
  });

  // Issuing organisation
  const orgVal = kv("issuing_organisation", "issuing organisation", "issuing_organization", "issuing organization", "organisation", "organization", "issued_by", "issued by", "supplier", "from") ||
    firstMatch(normalised, ORG_PATTERNS);
  fields.push({
    key: "issuing_body",
    label: "Issuing organisation",
    value: orgVal || "Unable to extract — please enter manually",
    confidence: orgVal ? "high" : "low",
  });

  // Person name
  const personVal = kv("full_name", "full name", "name", "patient", "applicant", "student", "claimant") ||
    firstMatch(normalised, PERSON_PATTERNS);
  if (personVal) {
    fields.push({
      key: "person_name",
      label: "Name on document",
      value: personVal,
      confidence: "high",
    });
  }

  // Address
  const addressVal = kv("address", "address_line1", "address line 1", "address_line_1");
  if (addressVal) {
    fields.push({
      key: "address_line1",
      label: "Address",
      value: addressVal,
      confidence: "high",
    });
  }

  // Postcode — KV first, then regex
  const postcodeKv = kv("postcode", "post_code", "post code", "postal_code", "postal code");
  const postcodeRegex = normalised.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/i);
  const postcodeVal = postcodeKv || (postcodeRegex ? postcodeRegex[1].toUpperCase() : "");
  if (postcodeVal) {
    fields.push({
      key: "postcode",
      label: "Postcode",
      value: postcodeVal.toUpperCase(),
      confidence: "high",
    });
  }

  // Reference number
  const refVal = kv("reference", "ref", "reference_number", "reference number", "invoice_no", "invoice no", "invoice_number", "quote_ref", "quote ref") ||
    firstMatch(normalised, REF_PATTERNS);
  if (refVal) {
    fields.push({
      key: "reference_number",
      label: "Reference number",
      value: refVal,
      confidence: "high",
    });
  }

  // Monetary amounts — KV first, then regex
  const amountKv = kv("amount", "subtotal", "sub_total", "water_bill", "water bill", "council_tax_element", "council tax element");
  const amountRegex = firstMatch(normalised, MONEY_PATTERNS);
  const amountVal = amountKv || amountRegex;
  if (amountVal) {
    fields.push({
      key: "amount",
      label: "Amount (£)",
      value: amountVal.startsWith("£") ? amountVal : `£${amountVal}`,
      confidence: "high",
    });
  }

  const vatVal = kv("vat", "tax", "vat_amount", "vat amount") || firstMatch(normalised, VAT_PATTERNS);
  if (vatVal) {
    fields.push({
      key: "vat",
      label: "VAT",
      value: vatVal.startsWith("£") ? vatVal : `£${vatVal}`,
      confidence: "medium",
    });
  }

  const totalKv = kv("total", "grand_total", "grand total", "total_due", "total due", "amount_due", "amount due", "balance_due", "balance due");
  const totalRegex = firstMatch(normalised, TOTAL_PATTERNS);
  const totalVal = totalKv || totalRegex;
  if (totalVal && totalVal !== amountVal) {
    fields.push({
      key: "total",
      label: "Total (inc. VAT)",
      value: totalVal.startsWith("£") ? totalVal : `£${totalVal}`,
      confidence: "high",
    });
  }

  // Sort code
  const sortCodeKv = kv("sort_code", "sort code");
  const sortCodeRegex = normalised.match(/\b(\d{2}[-\s]\d{2}[-\s]\d{2})\b/);
  const sortCodeVal = sortCodeKv || (sortCodeRegex ? sortCodeRegex[1] : "");
  if (sortCodeVal) {
    fields.push({
      key: "sort_code",
      label: "Sort code",
      value: sortCodeVal,
      confidence: "high",
    });
  }

  // Account number
  const accountKv = kv("account_number", "account number", "account_no", "account no");
  const accountRegex = normalised.match(/(?:account\s*(?:no|number|#)?)[:\s]*(\d{8})\b/i);
  const accountVal = accountKv || (accountRegex ? accountRegex[1] : "");
  if (accountVal) {
    fields.push({
      key: "account_number",
      label: "Account number",
      value: accountVal,
      confidence: "high",
    });
  }

  console.log(`[parseFields] Extracted ${fields.length} fields:`, fields.map(f => `${f.key}=${f.value.substring(0, 30)}`));
  return fields;
}
