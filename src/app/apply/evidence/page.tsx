"use client";

import { useState, FormEvent, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

function EvidenceContent() {
  const searchParams = useSearchParams();
  const caseReference = searchParams.get("ref") || "";

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < selected.length; i++) {
      const f = selected[i];
      // Max 10MB per file
      if (f.size > 10 * 1024 * 1024) {
        setErrors([`${f.name} is too large. Maximum file size is 10MB.`]);
        return;
      }
      newFiles.push({ name: f.name, size: f.size, type: f.type });
    }
    setFiles((prev) => [...prev, ...newFiles]);
    setErrors([]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const newErrors: string[] = [];

    if (!caseReference) {
      newErrors.push("Case reference is missing. Please go back to the status page and try again.");
    }
    if (files.length === 0) {
      newErrors.push("Select at least one file to upload.");
    }
    if (!description.trim()) {
      newErrors.push("Enter a description of the evidence you are uploading.");
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }

    setErrors([]);
    setSubmitting(true);

    try {
      const res = await fetch("/api/cases/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseReference,
          description: description.trim(),
          files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setFiles([]);
        setDescription("");
      } else {
        const data = await res.json();
        setErrors([data.error || "Failed to upload evidence. Please try again."]);
        setTimeout(() => errorSummaryRef.current?.focus(), 0);
      }
    } catch {
      setErrors(["Sorry, there is a problem with the service. Try again later."]);
      setTimeout(() => errorSummaryRef.current?.focus(), 0);
    } finally {
      setSubmitting(false);
    }
  }

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

  if (success) {
    return (
      <div className="govuk-width-container">
        <main className="govuk-main-wrapper" id="main-content" role="main">
          <div className="govuk-panel govuk-panel--confirmation">
            <h1 className="govuk-panel__title">Evidence uploaded</h1>
            <div className="govuk-panel__body">
              For case reference<br /><strong>{caseReference}</strong>
            </div>
          </div>
          <h2 className="govuk-heading-m">What happens next</h2>
          <p className="govuk-body">
            Your evidence has been submitted and attached to your case. A caseworker will review it as part of your application.
          </p>
          <p className="govuk-body">
            You can <a href="/apply/status" className="govuk-link">check the status of your application</a> at any time.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="govuk-width-container">
      <a href={`/apply/status`} className="govuk-back-link" onClick={(e) => { e.preventDefault(); window.history.back(); }}>
        Back
      </a>
      <main className="govuk-main-wrapper" id="main-content" role="main">
        {errors.length > 0 && (
          <div className="govuk-error-summary" aria-labelledby="error-summary-title" role="alert" tabIndex={-1} ref={errorSummaryRef}>
            <h2 className="govuk-error-summary__title" id="error-summary-title">There is a problem</h2>
            <div className="govuk-error-summary__body">
              <ul className="govuk-list govuk-error-summary__list">
                {errors.map((err, i) => (
                  <li key={i}><a href="#file-upload">{err}</a></li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <h1 className="govuk-heading-l">Upload evidence</h1>
        <p className="govuk-body">
          Case reference: <strong>{caseReference}</strong>
        </p>
        <p className="govuk-body">
          Upload supporting documents for your DSA application. Accepted formats: PDF, JPG, PNG, DOC, DOCX. Maximum 10MB per file.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {/* Description */}
          <div className="govuk-form-group">
            <label className="govuk-label" htmlFor="evidence-description">
              Description of evidence
            </label>
            <div className="govuk-hint" id="evidence-description-hint">
              Briefly describe what documents you are uploading, for example "Diagnostic report from GP" or "Supplier quotes for assistive technology"
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
          <div className="govuk-form-group">
            <label className="govuk-label" htmlFor="file-upload">
              Select files
            </label>
            <input
              className="govuk-file-upload"
              id="file-upload"
              name="file-upload"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>

          {/* File list */}
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
                        <button type="button" className="govuk-link" style={{ border: "none", background: "none", cursor: "pointer", color: "#d4351c", textDecoration: "underline" }}
                          onClick={() => removeFile(i)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button type="submit" className="govuk-button" data-module="govuk-button" disabled={submitting}>
            {submitting ? "Uploading…" : "Upload evidence"}
          </button>
        </form>
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