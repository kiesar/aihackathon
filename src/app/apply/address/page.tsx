"use client";

import { useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useFormContext } from "@/lib/form-context";
import { validateRequired, validatePostcode, ValidationError } from "@/lib/validation";

export default function AddressPage() {
  const router = useRouter();
  const { formData, updateAddress } = useFormContext();
  const { address } = formData;

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // Local form state initialised from context
  const [line1, setLine1] = useState(address.line1);
  const [line2, setLine2] = useState(address.line2);
  const [line3, setLine3] = useState(address.line3);
  const [postcode, setPostcode] = useState(address.postcode);

  function getErrorForField(field: string): string | undefined {
    return errors.find((e) => e.field === field)?.message;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const newErrors: ValidationError[] = [];

    // Address line 1 — required
    const line1Err = validateRequired(line1, "line1", "your address line 1");
    if (line1Err) newErrors.push(line1Err);

    // Postcode — required + format
    const postcodeErr = validatePostcode(postcode, "postcode");
    if (postcodeErr) newErrors.push(postcodeErr);

    setErrors(newErrors);

    if (newErrors.length > 0) {
      setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }

    // Save to context and navigate
    updateAddress({ line1, line2, line3, postcode });
    router.push("/apply/university");
  }

  const line1Error = getErrorForField("line1");
  const postcodeError = getErrorForField("postcode");

  return (
    <div className="govuk-width-container">
      <a
        href="#"
        className="govuk-back-link"
        onClick={(e) => {
          e.preventDefault();
          router.back();
        }}
      >
        Back
      </a>

      <main className="govuk-main-wrapper" id="main-content" role="main">
        {errors.length > 0 && (
          <div
            className="govuk-error-summary"
            aria-labelledby="error-summary-title"
            role="alert"
            tabIndex={-1}
            ref={errorSummaryRef}
            data-module="govuk-error-summary"
          >
            <h2 className="govuk-error-summary__title" id="error-summary-title">
              There is a problem
            </h2>
            <div className="govuk-error-summary__body">
              <ul className="govuk-list govuk-error-summary__list">
                {errors.map((err) => (
                  <li key={err.field}>
                    <a href={`#${err.field}`}>{err.message}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <h1 className="govuk-heading-l">Address</h1>

        <form onSubmit={handleSubmit} noValidate>
          {/* Address line 1 */}
          <div className={`govuk-form-group${line1Error ? " govuk-form-group--error" : ""}`}>
            <label className="govuk-label" htmlFor="line1">
              Address line 1
            </label>
            {line1Error && (
              <p id="line1-error" className="govuk-error-message">
                <span className="govuk-visually-hidden">Error:</span> {line1Error}
              </p>
            )}
            <input
              className={`govuk-input${line1Error ? " govuk-input--error" : ""}`}
              id="line1"
              name="line1"
              type="text"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              aria-describedby={line1Error ? "line1-error" : undefined}
            />
          </div>

          {/* Address line 2 (optional) */}
          <div className="govuk-form-group">
            <label className="govuk-label" htmlFor="line2">
              Address line 2 (optional)
            </label>
            <input
              className="govuk-input"
              id="line2"
              name="line2"
              type="text"
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
            />
          </div>

          {/* Address line 3 (optional) */}
          <div className="govuk-form-group">
            <label className="govuk-label" htmlFor="line3">
              Address line 3 (optional)
            </label>
            <input
              className="govuk-input"
              id="line3"
              name="line3"
              type="text"
              value={line3}
              onChange={(e) => setLine3(e.target.value)}
            />
          </div>

          {/* Postcode */}
          <div className={`govuk-form-group${postcodeError ? " govuk-form-group--error" : ""}`}>
            <label className="govuk-label" htmlFor="postcode">
              Postcode
            </label>
            {postcodeError && (
              <p id="postcode-error" className="govuk-error-message">
                <span className="govuk-visually-hidden">Error:</span> {postcodeError}
              </p>
            )}
            <input
              className={`govuk-input govuk-input--width-10${postcodeError ? " govuk-input--error" : ""}`}
              id="postcode"
              name="postcode"
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              aria-describedby={postcodeError ? "postcode-error" : undefined}
            />
          </div>

          <button type="submit" className="govuk-button" data-module="govuk-button">
            Continue
          </button>
        </form>
      </main>
    </div>
  );
}
