import { NextRequest, NextResponse } from "next/server";
import type { ExtractedEvidenceField } from "@/types";

interface ExtractRequest {
  fileName: string;
  fileType: string;
  description: string;
}

/**
 * Mocked AI extraction endpoint.
 *
 * In production this would send the file content to an LLM or OCR service.
 * The mock returns realistic pre-written fields keyed by description keywords
 * and file type, so the UI can demonstrate the full review-and-correct flow.
 *
 * The interface matches what a real extraction service would return, so
 * swapping the mock for a real call requires only changing this handler.
 */
export async function POST(request: NextRequest) {
  try {
    let body: ExtractRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { fileName = "", fileType = "", description = "" } = body;
    const desc = description.toLowerCase();
    const name = fileName.toLowerCase();

    // Simulate a short processing delay
    await new Promise((r) => setTimeout(r, 800));

    let fields: ExtractedEvidenceField[] = [];

    // ── Diagnostic / medical report ──────────────────────────
    if (
      desc.includes("diagnostic") ||
      desc.includes("medical") ||
      desc.includes("gp") ||
      desc.includes("disability") ||
      name.includes("diagnostic") ||
      name.includes("medical")
    ) {
      fields = [
        { key: "document_type",    label: "Document type",      value: "Diagnostic report",          confidence: "high" },
        { key: "issuing_body",     label: "Issuing organisation",value: "NHS Trust / GP Practice",    confidence: "medium" },
        { key: "document_date",    label: "Document date",      value: "12 March 2026",               confidence: "high" },
        { key: "patient_name",     label: "Patient name",       value: "As per application",          confidence: "medium" },
        { key: "diagnosis",        label: "Diagnosis / condition",value: "Specific Learning Difficulty (SpLD)", confidence: "medium" },
        { key: "recommendations",  label: "Recommendations",    value: "Assistive technology, extra time in examinations", confidence: "low" },
      ];
    }

    // ── Supplier quote / invoice ─────────────────────────────
    else if (
      desc.includes("quote") ||
      desc.includes("invoice") ||
      desc.includes("supplier") ||
      desc.includes("cost") ||
      name.includes("quote") ||
      name.includes("invoice")
    ) {
      fields = [
        { key: "document_type",    label: "Document type",      value: "Supplier quote",              confidence: "high" },
        { key: "supplier_name",    label: "Supplier name",      value: "Assistive Technology Ltd",    confidence: "high" },
        { key: "document_date",    label: "Document date",      value: "10 April 2026",               confidence: "high" },
        { key: "item_description", label: "Item description",   value: "Screen reader software (annual licence)", confidence: "high" },
        { key: "amount",           label: "Amount (£)",         value: "£349.00",                     confidence: "high" },
        { key: "vat",              label: "VAT",                value: "£69.80",                      confidence: "medium" },
        { key: "total",            label: "Total (inc. VAT)",   value: "£418.80",                     confidence: "high" },
        { key: "quote_reference",  label: "Quote reference",    value: "QT-2026-00441",               confidence: "medium" },
      ];
    }

    // ── Bank statement / proof of income ────────────────────
    else if (
      desc.includes("bank") ||
      desc.includes("income") ||
      desc.includes("statement") ||
      name.includes("bank") ||
      name.includes("statement")
    ) {
      fields = [
        { key: "document_type",    label: "Document type",      value: "Bank statement",              confidence: "high" },
        { key: "bank_name",        label: "Bank / institution", value: "Barclays Bank PLC",           confidence: "high" },
        { key: "account_holder",   label: "Account holder",     value: "As per application",          confidence: "medium" },
        { key: "statement_period", label: "Statement period",   value: "1 January 2026 – 31 March 2026", confidence: "high" },
        { key: "closing_balance",  label: "Closing balance",    value: "£1,240.55",                   confidence: "medium" },
      ];
    }

    // ── Proof of address ────────────────────────────────────
    else if (
      desc.includes("address") ||
      desc.includes("utility") ||
      desc.includes("council") ||
      name.includes("address")
    ) {
      fields = [
        { key: "document_type",    label: "Document type",      value: "Proof of address",            confidence: "high" },
        { key: "issuing_body",     label: "Issuing organisation",value: "Local Council / Utility provider", confidence: "medium" },
        { key: "document_date",    label: "Document date",      value: "15 February 2026",            confidence: "high" },
        { key: "address_line1",    label: "Address line 1",     value: "As per application",          confidence: "medium" },
        { key: "postcode",         label: "Postcode",           value: "As per application",          confidence: "medium" },
      ];
    }

    // ── Generic fallback ─────────────────────────────────────
    else {
      const isPdf = fileType === "application/pdf" || name.endsWith(".pdf");
      fields = [
        { key: "document_type",    label: "Document type",      value: isPdf ? "PDF document" : "Document", confidence: "medium" },
        { key: "document_date",    label: "Document date",      value: "Unable to extract — please enter manually", confidence: "low" },
        { key: "issuing_body",     label: "Issuing organisation",value: "Unable to extract — please enter manually", confidence: "low" },
        { key: "reference_number", label: "Reference number",   value: "Unable to extract — please enter manually", confidence: "low" },
      ];
    }

    return NextResponse.json({
      fields,
      isAiExtracted: true,
      extractedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Evidence extraction error:", error);
    return NextResponse.json(
      { error: "Sorry, there is a problem extracting information from the file. You can still submit manually." },
      { status: 500 }
    );
  }
}
