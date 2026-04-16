"use client";

import { useState, useRef, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("reason") === "session_expired";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push("/dashboard");
        return;
      }

      const data = await res.json();
      setError(data.error || "Enter a valid username and password");
      setTimeout(() => errorSummaryRef.current?.focus(), 0);
    } catch {
      setError("Sorry, there is a problem with the service. Try again later.");
      setTimeout(() => errorSummaryRef.current?.focus(), 0);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="govuk-width-container">
      <main className="govuk-main-wrapper" id="main-content" role="main">
        {sessionExpired && (
          <div className="govuk-inset-text">
            Your session has expired. Sign in again to continue.
          </div>
        )}

        {error && (
          <div
            className="govuk-error-summary"
            aria-labelledby="error-summary-title"
            role="alert"
            tabIndex={-1}
            ref={errorSummaryRef}
            data-module="govuk-error-summary"
          >
            <h2
              className="govuk-error-summary__title"
              id="error-summary-title"
            >
              There is a problem
            </h2>
            <div className="govuk-error-summary__body">
              <ul className="govuk-list govuk-error-summary__list">
                <li>
                  <a href="#username">{error}</a>
                </li>
              </ul>
            </div>
          </div>
        )}

        <h1 className="govuk-heading-l">Sign in</h1>

        <form onSubmit={handleSubmit} noValidate>
          <div
            className={`govuk-form-group${error ? " govuk-form-group--error" : ""}`}
          >
            <label className="govuk-label" htmlFor="username">
              Username
            </label>
            {error && (
              <p id="username-error" className="govuk-error-message">
                <span className="govuk-visually-hidden">Error:</span> {error}
              </p>
            )}
            <input
              className={`govuk-input${error ? " govuk-input--error" : ""}`}
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-describedby={error ? "username-error" : undefined}
            />
          </div>

          <div className="govuk-form-group">
            <label className="govuk-label" htmlFor="password">
              Password
            </label>
            <input
              className="govuk-input"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="govuk-button"
            data-module="govuk-button"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </main>
    </div>
  );
}
