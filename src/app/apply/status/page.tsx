"use client";

import { useState, FormEvent } from "react";

interface StatusResult {
  status: string;
  displayStatus: string;
  lastUpdated: string;
  decisionReason?: string;
}

export default function StatusCheckPage() {
  const [caseReference, setCaseReference] = useState("");
  const [result, setResult] = useState<StatusResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    const trimmed = caseReference.trim();
    if (!trimmed) {
      setError("Enter your case reference number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(trimmed)}`);
      if (res.status === 404) {
        const body = await res.json();
        setError(body.error || "No application found for that reference number. Check the reference and try again.");
        return;
      }
      if (!res.ok) {
        setError("Sorry, there is a problem with the service. Try again later.");
        return;
      }
      const data: StatusResult = await res.json();
      setResult(data);
    } catch {
      setError("Sorry, there is a problem with the service. Try again later.");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  const isTerminal = result?.status === "approved" || result?.status === "rejected";
  const canUploadEvidence = result?.status === "awaiting_evidence" || result?.status === "evidence_requested";

  return (
    <div className="govuk-width-container">
      <main className="govuk-main-wrapper" id="main-content" role="main">
        <h1 className="govuk-heading-l">Check the status of your application</h1>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div
              className="govuk-error-summary"
              aria-labelledby="error-summary-title"
              role="alert"
              tabIndex={-1}
              data-module="govuk-error-summary"
            >
              <h2 className="govuk-error-summary__title" id="error-summary-title">
                There is a problem
              </h2>
              <div className="govuk-error-summary__body">
                <ul className="govuk-list govuk-error-summary__list">
                  <li>
                    <a href="#case-reference">{error}</a>
                  </li>
                </ul>
              </div>
            </div>
          )}

          <div className={`govuk-form-group${error ? " govuk-form-group--error" : ""}`}>
            <label className="govuk-label" htmlFor="case-reference">
              Case reference number
            </label>
            <div className="govuk-hint" id="case-reference-hint">
              This is the reference you received when you submitted your application, for example DSA-2026-00001
            </div>
            {error && (
              <p className="govuk-error-message" id="case-reference-error">
                <span className="govuk-visually-hidden">Error:</span> {error}
              </p>
            )}
            <input
              className={`govuk-input govuk-input--width-20${error ? " govuk-input--error" : ""}`}
              id="case-reference"
              name="caseReference"
              type="text"
              value={caseReference}
              onChange={(e) => setCaseReference(e.target.value)}
              aria-describedby={`case-reference-hint${error ? " case-reference-error" : ""}`}
            />
          </div>

          <button
            type="submit"
            className="govuk-button"
            data-module="govuk-button"
            disabled={loading}
          >
            {loading ? "Checking…" : "Check status"}
          </button>
        </form>

        {result && (
          <div className="govuk-panel govuk-panel--confirmation" style={{ backgroundColor: isTerminal ? (result.status === "approved" ? "#00703c" : "#d4351c") : "#1d70b8" }}>
            <h2 className="govuk-panel__title">
              {result.displayStatus}
            </h2>
            <div className="govuk-panel__body">
              Last updated: {formatDate(result.lastUpdated)}
            </div>
          </div>
        )}

        {result && isTerminal && (
          <div>
            <h2 className="govuk-heading-m">Decision details</h2>
            <dl className="govuk-summary-list">
              <div className="govuk-summary-list__row">
                <dt className="govuk-summary-list__key">Outcome</dt>
                <dd className="govuk-summary-list__value">{result.displayStatus}</dd>
              </div>
              <div className="govuk-summary-list__row">
                <dt className="govuk-summary-list__key">Decision date</dt>
                <dd className="govuk-summary-list__value">{formatDate(result.lastUpdated)}</dd>
              </div>
              {result.decisionReason && (
                <div className="govuk-summary-list__row">
                  <dt className="govuk-summary-list__key">Decision reason</dt>
                  <dd className="govuk-summary-list__value">{result.decisionReason}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {result && canUploadEvidence && (
          <div style={{ marginTop: "30px" }}>
            <h2 className="govuk-heading-m">Upload evidence</h2>
            <p className="govuk-body">
              Your application requires supporting evidence. You can upload your documents below.
            </p>
            <a
              href={`/apply/evidence?ref=${encodeURIComponent(caseReference.trim())}`}
              className="govuk-button"
            >
              Upload evidence
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
