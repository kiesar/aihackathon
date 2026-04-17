"use client";

import { useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// ── Types ────────────────────────────────────────────────────

interface SelectedFile {
  name: string;
  size: number;
  type: string;
  previewUrl: string | null; // object URL for images
  rawFile: File;             // kept for sending to extraction API
}

interface ExtractedField {
  key: string;
  label: string;
  value: string;
  confidence: "high" | "medium" | "low";
  required: boolean;
}

type Step = "upload" | "review" | "success";

// ── Expected field templates per document type ───────────────
// These define what information is REQUIRED from each evidence type.
// Extracted values are merged in; missing required fields stay blank
// so the student knows exactly what to complete.

interface FieldTemplate {
  key: string;
  label: string;
  required: boolean;
  hint?: string;
}

const FIELD_TEMPLATES: Record<string, FieldTemplate[]> = {
  diagnostic: [
    { key: "document_type",   label: "Document type",          required: true },
    { key: "document_date",   label: "Document date",          required: true,  hint: "e.g. 12 March 2026" },
    { key: "issuing_body",    label: "Issuing organisation",   required: true,  hint: "e.g. NHS Trust, GP Practice, Assessment Centre" },
    { key: "person_name",     label: "Name on document",       required: true,  hint: "Must match your application name" },
    { key: "diagnosis",       label: "Diagnosis / condition",  required: true,  hint: "e.g. Dyslexia, ADHD, SpLD" },
    { key: "reference_number",label: "Reference number",       required: false, hint: "If shown on the document" },
    { key: "recommendations", label: "Recommendations",        required: false, hint: "e.g. assistive technology, extra time" },
  ],
  invoice: [
    { key: "document_type",   label: "Document type",          required: true },
    { key: "document_date",   label: "Invoice date",           required: true,  hint: "e.g. 10 April 2026" },
    { key: "issuing_body",    label: "Supplier name",          required: true },
    { key: "reference_number",label: "Invoice number",         required: true,  hint: "e.g. INV-2026-00441" },
    { key: "item_description",label: "Item / service description", required: true },
    { key: "amount",          label: "Amount (exc. VAT) £",    required: true,  hint: "e.g. 349.00" },
    { key: "vat",             label: "VAT £",                  required: false, hint: "Leave blank if VAT exempt" },
    { key: "total",           label: "Total (inc. VAT) £",     required: true,  hint: "e.g. 418.80" },
  ],
  quote: [
    { key: "document_type",   label: "Document type",          required: true },
    { key: "document_date",   label: "Quote date",             required: true,  hint: "e.g. 10 April 2026" },
    { key: "issuing_body",    label: "Supplier name",          required: true },
    { key: "reference_number",label: "Quote reference",        required: false, hint: "e.g. QT-2026-00441" },
    { key: "item_description",label: "Item / service description", required: true },
    { key: "amount",          label: "Amount (exc. VAT) £",    required: true,  hint: "e.g. 349.00" },
    { key: "vat",             label: "VAT £",                  required: false, hint: "Leave blank if VAT exempt" },
    { key: "total",           label: "Total (inc. VAT) £",     required: true,  hint: "e.g. 418.80" },
  ],
  bank: [
    { key: "document_type",   label: "Document type",          required: true },
    { key: "issuing_body",    label: "Bank / institution",     required: true },
    { key: "person_name",     label: "Account holder name",    required: true },
    { key: "statement_period",label: "Statement period",       required: true,  hint: "e.g. 1 January 2026 – 31 March 2026" },
    { key: "sort_code",       label: "Sort code",              required: false, hint: "e.g. 20-00-00" },
    { key: "account_number",  label: "Account number",         required: false },
    { key: "closing_balance", label: "Closing balance £",      required: true,  hint: "e.g. 1240.55" },
  ],
  address: [
    { key: "document_type",   label: "Document type",          required: true },
    { key: "document_date",   label: "Document date",          required: true,  hint: "Must be within the last 3 months" },
    { key: "issuing_body",    label: "Issuing organisation",   required: true,  hint: "e.g. Local Council, utility provider" },
    { key: "person_name",     label: "Name on document",       required: true },
    { key: "address_line1",   label: "Address line 1",         required: true },
    { key: "postcode",        label: "Postcode",               required: true },
  ],
  default: [
    { key: "document_type",   label: "Document type",          required: true },
    { key: "document_date",   label: "Document date",          required: true,  hint: "e.g. 12 March 2026" },
    { key: "issuing_body",    label: "Issuing organisation",   required: true },
    { key: "reference_number",label: "Reference number",       required: false, hint: "If shown on the document" },
    { key: "person_name",     label: "Name on document",       required: false },
  ],
};

/** Pick the right template based on description and file name keywords */
function pickTemplate(description: string, fileName: string): FieldTemplate[] {
  const t = (description + " " + fileName).toLowerCase();
  if (t.includes("diagnostic") || t.includes("assessment") || t.includes("medical") || t.includes("gp") || t.includes("disability") || t.includes("dyslexia") || t.includes("adhd")) {
    return FIELD_TEMPLATES.diagnostic;
  }
  if (t.includes("invoice") || t.includes("inv-")) return FIELD_TEMPLATES.invoice;
  if (t.includes("quote") || t.includes("quotation") || t.includes("qt-")) return FIELD_TEMPLATES.quote;
  if (t.includes("bank") || t.includes("statement") || t.includes("income")) return FIELD_TEMPLATES.bank;
  if (t.includes("address") || t.includes("utility") || t.includes("council")) return FIELD_TEMPLATES.address;
  return FIELD_TEMPLATES.default;
}

/**
 * Merge extracted fields into the template.
 * Template fields that were extracted get the extracted value + confidence.
 * Template fields not extracted stay blank with low confidence.
 * Extra extracted fields not in the template are appended at the end.
 */
function mergeFieldsWithTemplate(
  template: FieldTemplate[],
  extracted: ExtractedField[]
): ExtractedField[] {
  const extractedMap = new Map(extracted.map((f) => [f.key, f]));

  const merged: ExtractedField[] = template.map((t) => {
    const found = extractedMap.get(t.key);
    return {
      key: t.key,
      label: t.label,
      value: found?.value ?? "",
      confidence: found?.confidence ?? "low",
      required: t.required,
    };
  });

  // Append any extra extracted fields not covered by the template
  for (const ef of extracted) {
    if (!template.find((t) => t.key === ef.key)) {
      merged.push({ ...ef, required: false });
    }
  }

  return merged;
}

// ── Helpers ──────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function confidenceBadge(confidence: "high" | "medium" | "low") {
  const map = {
    high:   { cls: "govuk-tag govuk-tag--green",  label: "High confidence" },
    medium: { cls: "govuk-tag govuk-tag--yellow", label: "Medium confidence" },
    low:    { cls: "govuk-tag govuk-tag--red",    label: "Low confidence — please verify" },
  };
  const { cls, label } = map[confidence];
  return <strong className={cls} style={{ fontSize: "12px", marginLeft: "8px" }}>{label}</strong>;
}

// ── Main component ───────────────────────────────────────────

function EvidenceContent() {
  const searchParams = useSearchParams();
  const caseReference = searchParams.get("ref") || "";

  const [step, setStep] = useState<Step>("upload");

  // Step 1 — upload
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [description, setDescription] = useState("");
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadErrorRef = useRef<HTMLDivElement>(null);

  // Step 2 — review
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [reviewErrors, setReviewErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const reviewErrorRef = useRef<HTMLDivElement>(null);

  // ── File selection ──────────────────────────────────────

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles: SelectedFile[] = [];
    for (let i = 0; i < selected.length; i++) {
      const f = selected[i];
      if (f.size > 10 * 1024 * 1024) {
        setUploadErrors([`${f.name} is too large. Maximum file size is 10MB.`]);
        return;
      }
      const isImage = f.type.startsWith("image/");
      newFiles.push({
        name: f.name,
        size: f.size,
        type: f.type,
        previewUrl: isImage ? URL.createObjectURL(f) : null,
        rawFile: f,
      });
    }
    setFiles((prev) => [...prev, ...newFiles]);
    setUploadErrors([]);
    // Reset input so the same file can be re-selected after removal
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  function removeFile(index: number) {
    setFiles((prev) => {
      const removed = prev[index];
      if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  // ── Step 1 → Step 2: extract ────────────────────────────

  async function handleProceedToReview() {
    const errors: string[] = [];
    if (!caseReference) errors.push("Case reference is missing. Please go back to the status page.");
    if (files.length === 0) errors.push("Select at least one file to upload.");
    if (!description.trim()) errors.push("Enter a description of the evidence you are uploading.");

    if (errors.length > 0) {
      setUploadErrors(errors);
      setTimeout(() => uploadErrorRef.current?.focus(), 0);
      return;
    }

    setUploadErrors([]);
    setExtracting(true);
    setExtractError("");

    // Determine the expected field template immediately from description + filename
    const primary = files[0];
    const template = pickTemplate(description, primary.name);

    try {
      // Send the primary file as multipart/form-data for real OCR/PDF extraction
      const formData = new FormData();
      formData.append("file", primary.rawFile);
      formData.append("fileName", primary.name);
      formData.append("fileType", primary.type);
      formData.append("description", description.trim());

      const res = await fetch("/api/cases/evidence/extract", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const rawExtracted: ExtractedField[] = (data.fields || []).map(
          (f: ExtractedField) => ({ ...f, required: false })
        );
        // Merge extracted values into the template so all expected fields are shown
        setExtractedFields(mergeFieldsWithTemplate(template, rawExtracted));
        setExtractError("");
      } else {
        // Extraction failed — show the template with all fields blank so the
        // student knows exactly what information is needed
        setExtractError(
          "We could not automatically extract information from your file. Please complete the required fields below."
        );
        setExtractedFields(mergeFieldsWithTemplate(template, []));
      }
    } catch {
      setExtractError(
        "We could not automatically extract information from your file. Please complete the required fields below."
      );
      setExtractedFields(mergeFieldsWithTemplate(template, []));
    } finally {
      setExtracting(false);
      setStep("review");
    }
  }

  // ── Step 2 → submit ─────────────────────────────────────

  function handleFieldChange(key: string, value: string) {
    setExtractedFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, value } : f))
    );
  }

  async function handleSubmit() {
    const errors: string[] = [];

    // Check all required fields have a value
    const missingRequired = extractedFields.filter(
      (f) => f.required && (!f.value || f.value.trim().length === 0)
    );
    if (missingRequired.length > 0) {
      errors.push(
        `Please complete the following required fields: ${missingRequired.map((f) => f.label).join(", ")}`
      );
    }

    // Warn about low-confidence fields still showing placeholder text
    const unverified = extractedFields.filter(
      (f) => f.confidence === "low" && f.value.toLowerCase().includes("unable to extract")
    );
    if (unverified.length > 0) {
      errors.push(
        `Please enter values for: ${unverified.map((f) => f.label).join(", ")}`
      );
    }

    if (errors.length > 0) {
      setReviewErrors(errors);
      setTimeout(() => reviewErrorRef.current?.focus(), 0);
      return;
    }

    setReviewErrors([]);
    setSubmitting(true);

    try {
      const res = await fetch("/api/cases/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseReference,
          description: description.trim(),
          files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
          extractedFields,
        }),
      });

      if (res.ok) {
        // Revoke all object URLs
        files.forEach((f) => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
        setStep("success");
      } else {
        const data = await res.json();
        setReviewErrors([data.error || "Failed to submit evidence. Please try again."]);
        setTimeout(() => reviewErrorRef.current?.focus(), 0);
      }
    } catch {
      setReviewErrors(["Sorry, there is a problem with the service. Try again later."]);
      setTimeout(() => reviewErrorRef.current?.focus(), 0);
    } finally {
      setSubmitting(false);
    }
  }

  // ── No case reference ───────────────────────────────────

  if (!caseReference) {
    return (
      <div className="govuk-width-container">
        <main className="govuk-main-wrapper" id="main-content" role="main">
          <h1 className="govuk-heading-l">Upload evidence</h1>
          <p className="govuk-body">
            No case reference provided. Please{" "}
            <a href="/apply/status" className="govuk-link">check your application status</a>{" "}
            first, then use the upload evidence link.
          </p>
        </main>
      </div>
    );
  }

  // ── Success ─────────────────────────────────────────────

  if (step === "success") {
    return (
      <div className="govuk-width-container">
        <main className="govuk-main-wrapper" id="main-content" role="main">
          <div className="govuk-panel govuk-panel--confirmation">
            <h1 className="govuk-panel__title">Evidence submitted</h1>
            <div className="govuk-panel__body">
              For case reference<br /><strong>{caseReference}</strong>
            </div>
          </div>
          <h2 className="govuk-heading-m">What happens next</h2>
          <p className="govuk-body">
            Your evidence and the extracted information have been submitted and attached to your case.
            A caseworker will review them as part of your application.
          </p>
          <p className="govuk-body">
            You can <a href="/apply/status" className="govuk-link">check the status of your application</a> at any time.
          </p>
        </main>
      </div>
    );
  }

  // ── Step 2: Review extracted information ────────────────

  if (step === "review") {
    return (
      <div className="govuk-width-container">
        <main className="govuk-main-wrapper" id="main-content" role="main">

          {/* Progress indicator */}
          <p className="govuk-body govuk-hint">Step 2 of 2</p>
          <h1 className="govuk-heading-l">Review extracted information</h1>

          {/* AI label */}
          <div className="govuk-inset-text">
            <p className="govuk-body">
              <strong className="govuk-tag govuk-tag--purple">AI-extracted</strong>{" "}
              We have automatically extracted key information from your document.
              Please check each field carefully, correct any errors, and then submit.
            </p>
          </div>

          {extractError && (
            <div className="govuk-warning-text">
              <span className="govuk-warning-text__icon" aria-hidden="true">!</span>
              <strong className="govuk-warning-text__text">
                <span className="govuk-visually-hidden">Warning</span>
                {extractError}
              </strong>
            </div>
          )}

          {reviewErrors.length > 0 && (
            <div className="govuk-error-summary" aria-labelledby="review-error-title" role="alert" tabIndex={-1} ref={reviewErrorRef}>
              <h2 className="govuk-error-summary__title" id="review-error-title">There is a problem</h2>
              <div className="govuk-error-summary__body">
                <ul className="govuk-list govuk-error-summary__list">
                  {reviewErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            </div>
          )}

          <div className="govuk-grid-row">
            {/* Left: file preview */}
            <div className="govuk-grid-column-one-half">
              <h2 className="govuk-heading-m">Document preview</h2>
              {files.map((f, i) => (
                <div key={i} style={{ marginBottom: "20px", border: "1px solid #b1b4b6", padding: "12px" }}>
                  <p className="govuk-body govuk-!-font-weight-bold" style={{ marginBottom: "8px" }}>
                    {f.name} <span className="govuk-hint" style={{ display: "inline" }}>({formatFileSize(f.size)})</span>
                  </p>
                  {f.previewUrl ? (
                    <img
                      src={f.previewUrl}
                      alt={`Preview of ${f.name}`}
                      style={{ maxWidth: "100%", maxHeight: "400px", display: "block" }}
                    />
                  ) : (
                    <div style={{ background: "#f3f2f1", padding: "40px", textAlign: "center" }}>
                      <p className="govuk-body govuk-hint">
                        {f.type === "application/pdf" ? "📄 PDF document" : "📎 Document"}<br />
                        Preview not available for this file type
                      </p>
                    </div>
                  )}
                </div>
              ))}
              <p className="govuk-body govuk-hint">
                Description: {description}
              </p>
            </div>

            {/* Right: extracted fields */}
            <div className="govuk-grid-column-one-half">
              <h2 className="govuk-heading-m">Extracted information</h2>
              <p className="govuk-body">
                Check each field. Fields marked <strong className="govuk-tag govuk-tag--red" style={{ fontSize: "12px" }}>Low confidence</strong> need your attention.
                {" "}Fields marked <span style={{ color: "#d4351c" }}>*</span> are required.
              </p>

              {extractedFields.filter((f) => f.required && (!f.value || f.value.trim().length === 0)).length > 0 && (
                <div className="govuk-warning-text">
                  <span className="govuk-warning-text__icon" aria-hidden="true">!</span>
                  <strong className="govuk-warning-text__text">
                    <span className="govuk-visually-hidden">Warning</span>
                    {extractedFields.filter((f) => f.required && (!f.value || f.value.trim().length === 0)).length} required{" "}
                    {extractedFields.filter((f) => f.required && (!f.value || f.value.trim().length === 0)).length === 1 ? "field" : "fields"}{" "}
                    could not be extracted and must be completed before submitting.
                  </strong>
                </div>
              )}

              {extractedFields.length === 0 && !extractError && (
                <p className="govuk-body govuk-hint">No fields were extracted. You can submit without extracted information.</p>
              )}

              {extractedFields.map((field) => {
                const isMissing = field.required && (!field.value || field.value.trim().length === 0);
                return (
                <div
                  key={field.key}
                  className={`govuk-form-group${isMissing ? " govuk-form-group--error" : ""}`}
                  style={{ marginBottom: "16px" }}
                >
                  <label className="govuk-label" htmlFor={`field-${field.key}`}>
                    {field.label}
                    {field.required && (
                      <span style={{ color: "#d4351c", marginLeft: "4px" }} aria-hidden="true">*</span>
                    )}
                    {field.value && confidenceBadge(field.confidence)}
                  </label>
                  {field.required && isMissing && (
                    <p id={`field-${field.key}-error`} className="govuk-error-message">
                      <span className="govuk-visually-hidden">Error:</span> {field.label} is required
                    </p>
                  )}
                  {FIELD_TEMPLATES.default.find(() => true) && (() => {
                    // Find hint from any template
                    const allTemplates = Object.values(FIELD_TEMPLATES).flat();
                    const hint = allTemplates.find((t) => t.key === field.key)?.hint;
                    return hint ? (
                      <div id={`field-${field.key}-hint`} className="govuk-hint" style={{ fontSize: "14px" }}>
                        {hint}
                      </div>
                    ) : null;
                  })()}
                  <input
                    className={`govuk-input${isMissing ? " govuk-input--error" : ""}`}
                    id={`field-${field.key}`}
                    name={field.key}
                    type="text"
                    value={field.value}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    aria-describedby={`field-${field.key}-hint${isMissing ? ` field-${field.key}-error` : ""}`}
                    required={field.required}
                  />
                  {!isMissing && (
                    <div className="govuk-hint" style={{ fontSize: "13px", marginTop: "4px" }}>
                      {field.confidence === "low"
                        ? "Not extracted — please enter manually."
                        : field.confidence === "medium"
                        ? "Extracted with medium confidence — please verify."
                        : "Extracted with high confidence."}
                    </div>
                  )}
                </div>
                );
              })}

              <div style={{ marginTop: "24px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="govuk-button"
                  disabled={submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? "Submitting…" : "Confirm and submit"}
                </button>
                <button
                  type="button"
                  className="govuk-button govuk-button--secondary"
                  disabled={submitting}
                  onClick={() => setStep("upload")}
                >
                  Back to upload
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Step 1: Upload ───────────────────────────────────────

  return (
    <div className="govuk-width-container">
      <a href="/apply/status" className="govuk-back-link" onClick={(e) => { e.preventDefault(); window.history.back(); }}>
        Back
      </a>
      <main className="govuk-main-wrapper" id="main-content" role="main">

        <p className="govuk-body govuk-hint">Step 1 of 2</p>
        <h1 className="govuk-heading-l">Upload evidence</h1>
        <p className="govuk-body">
          Case reference: <strong>{caseReference}</strong>
        </p>
        <p className="govuk-body">
          Upload supporting documents for your DSA application. Accepted formats: PDF, JPG, PNG, DOC, DOCX. Maximum 10MB per file.
        </p>

        {uploadErrors.length > 0 && (
          <div className="govuk-error-summary" aria-labelledby="upload-error-title" role="alert" tabIndex={-1} ref={uploadErrorRef}>
            <h2 className="govuk-error-summary__title" id="upload-error-title">There is a problem</h2>
            <div className="govuk-error-summary__body">
              <ul className="govuk-list govuk-error-summary__list">
                {uploadErrors.map((err, i) => <li key={i}><a href="#file-upload">{err}</a></li>)}
              </ul>
            </div>
          </div>
        )}

        {/* Description */}
        <div className={`govuk-form-group${uploadErrors.some(e => e.includes("description")) ? " govuk-form-group--error" : ""}`}>
          <label className="govuk-label" htmlFor="evidence-description">
            Description of evidence
          </label>
          <div className="govuk-hint" id="evidence-description-hint">
            Briefly describe what you are uploading, for example "Diagnostic report from GP" or "Supplier quote for assistive technology"
          </div>
          <textarea
            className="govuk-textarea"
            id="evidence-description"
            name="description"
            rows={3}
            aria-describedby="evidence-description-hint"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* File upload */}
        <div className={`govuk-form-group${uploadErrors.some(e => e.includes("file")) ? " govuk-form-group--error" : ""}`}>
          <label className="govuk-label" htmlFor="file-upload">
            Select files
          </label>
          <div className="govuk-hint" id="file-upload-hint">
            You can select multiple files. Images will show a preview on the next screen.
          </div>
          <input
            className="govuk-file-upload"
            id="file-upload"
            name="file-upload"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            ref={fileInputRef}
            aria-describedby="file-upload-hint"
            onChange={handleFileChange}
          />
        </div>

        {/* Selected files list */}
        {files.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <h2 className="govuk-heading-s">Selected files ({files.length})</h2>
            <table className="govuk-table">
              <thead className="govuk-table__head">
                <tr className="govuk-table__row">
                  <th scope="col" className="govuk-table__header">File name</th>
                  <th scope="col" className="govuk-table__header">Size</th>
                  <th scope="col" className="govuk-table__header">Action</th>
                </tr>
              </thead>
              <tbody className="govuk-table__body">
                {files.map((f, i) => (
                  <tr key={i} className="govuk-table__row">
                    <td className="govuk-table__cell">{f.name}</td>
                    <td className="govuk-table__cell">{formatFileSize(f.size)}</td>
                    <td className="govuk-table__cell">
                      <button
                        type="button"
                        className="govuk-link"
                        style={{ border: "none", background: "none", cursor: "pointer", color: "#d4351c", textDecoration: "underline" }}
                        onClick={() => removeFile(i)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          type="button"
          className="govuk-button"
          data-module="govuk-button"
          disabled={extracting}
          onClick={handleProceedToReview}
        >
          {extracting ? "Extracting information…" : "Continue"}
        </button>

        {extracting && (
          <p className="govuk-body govuk-hint" style={{ marginTop: "8px" }}>
            We are extracting key information from your document. This may take a moment.
          </p>
        )}
      </main>
    </div>
  );
}

export default function EvidencePage() {
  return (
    <Suspense>
      <EvidenceContent />
    </Suspense>
  );
}
