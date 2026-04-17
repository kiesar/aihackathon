"use client";

import { useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// ── Types ────────────────────────────────────────────────────

interface SelectedFile {
  name: string;
  size: number;
  type: string;
  previewUrl: string | null; // object URL for images
}

interface ExtractedField {
  key: string;
  label: string;
  value: string;
  confidence: "high" | "medium" | "low";
}

type Step = "upload" | "review" | "success";

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

    try {
      // Extract from the first file (primary document)
      const primary = files[0];
      const res = await fetch("/api/cases/evidence/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: primary.name,
          fileType: primary.type,
          description: description.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setExtractedFields(data.fields || []);
      } else {
        // Non-fatal — show empty fields so user can enter manually
        setExtractError("We could not automatically extract information from your file. Please review and complete the fields below.");
        setExtractedFields([]);
      }
    } catch {
      setExtractError("We could not automatically extract information from your file. Please review and complete the fields below.");
      setExtractedFields([]);
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
    // Validate any low-confidence fields still have placeholder text
    const unverified = extractedFields.filter(
      (f) => f.confidence === "low" && f.value.toLowerCase().includes("please enter")
    );
    if (unverified.length > 0) {
      errors.push(`Please complete the following fields: ${unverified.map((f) => f.label).join(", ")}`);
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
              </p>

              {extractedFields.length === 0 && !extractError && (
                <p className="govuk-body govuk-hint">No fields were extracted. You can submit without extracted information.</p>
              )}

              {extractedFields.map((field) => (
                <div key={field.key} className="govuk-form-group" style={{ marginBottom: "16px" }}>
                  <label className="govuk-label" htmlFor={`field-${field.key}`}>
                    {field.label}
                    {confidenceBadge(field.confidence)}
                  </label>
                  <input
                    className="govuk-input"
                    id={`field-${field.key}`}
                    name={field.key}
                    type="text"
                    value={field.value}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    aria-describedby={`field-${field.key}-hint`}
                  />
                  <div id={`field-${field.key}-hint`} className="govuk-hint" style={{ fontSize: "14px", marginTop: "4px" }}>
                    {field.confidence === "low"
                      ? "We could not extract this with confidence — please verify or enter manually."
                      : field.confidence === "medium"
                      ? "Extracted with medium confidence — please verify."
                      : "Extracted with high confidence."}
                  </div>
                </div>
              ))}

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
