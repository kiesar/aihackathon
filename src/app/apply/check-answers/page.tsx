"use client";

import { useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useFormContext } from "@/lib/form-context";

const SEX_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  "non-binary": "Non-binary",
  prefer_not_to_say: "Prefer not to say",
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "Text message (SMS)",
};

export default function CheckAnswersPage() {
  const router = useRouter();
  const { formData, resetForm } = useFormContext();
  const { personalDetails, address, university, contact, costs } = formData;

  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const dobDisplay =
    personalDetails.dobDay && personalDetails.dobMonth && personalDetails.dobYear
      ? `${personalDetails.dobDay.padStart(2, "0")}/${personalDetails.dobMonth.padStart(2, "0")}/${personalDetails.dobYear}`
      : "";

  function calculateTotal(): string {
    const total = costs.reduce((sum, item) => {
      const parsed = parseFloat(item.amount);
      return sum + (isNaN(parsed) ? 0 : parsed);
    }, 0);
    return total.toFixed(2);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!declarationConfirmed) {
      setErrors([
        {
          field: "declaration",
          message: "You must confirm the declaration before submitting",
        },
      ]);
      setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }

    setErrors([]);
    setSubmitting(true);

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.status === 201) {
        const data = await response.json();
        resetForm();
        router.push(`/apply/confirmation?ref=${encodeURIComponent(data.caseReference)}`);
      } else {
        router.push("/apply/error");
      }
    } catch {
      router.push("/apply/error");
    } finally {
      setSubmitting(false);
    }
  }

  const declarationError = errors.find((e) => e.field === "declaration")?.message;

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

        <h1 className="govuk-heading-l">Check your answers</h1>

        {/* Personal details */}
        <h2 className="govuk-heading-m">Personal details</h2>
        <dl className="govuk-summary-list">
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Customer Reference Number</dt>
            <dd className="govuk-summary-list__value">
              {personalDetails.customerReference || "Not provided"}
            </dd>
            <dd className="govuk-summary-list__actions">
              <a className="govuk-link" href="/apply/personal-details">
                Change<span className="govuk-visually-hidden"> customer reference number</span>
              </a>
            </dd>
          </div>
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Forename(s)</dt>
            <dd className="govuk-summary-list__value">{personalDetails.forenames}</dd>
            <dd className="govuk-summary-list__actions">
              <a className="govuk-link" href="/apply/personal-details">
                Change<span className="govuk-visually-hidden"> forenames</span>
              </a>
            </dd>
          </div>
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Surname</dt>
            <dd className="govuk-summary-list__value">{personalDetails.surname}</dd>
            <dd className="govuk-summary-list__actions">
              <a className="govuk-link" href="/apply/personal-details">
                Change<span className="govuk-visually-hidden"> surname</span>
              </a>
            </dd>
          </div>
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Sex</dt>
            <dd className="govuk-summary-list__value">
              {SEX_LABELS[personalDetails.sex] || personalDetails.sex}
            </dd>
            <dd className="govuk-summary-list__actions">
              <a className="govuk-link" href="/apply/personal-details">
                Change<span className="govuk-visually-hidden"> sex</span>
              </a>
            </dd>
          </div>
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Date of birth</dt>
            <dd className="govuk-summary-list__value">{dobDisplay}</dd>
            <dd className="govuk-summary-list__actions">
              <a className="govuk-link" href="/apply/personal-details">
                Change<span className="govuk-visually-hidden"> date of birth</span>
              </a>
            </dd>
          </div>
        </dl>

        {/* Address */}
        <h2 className="govuk-heading-m">Address</h2>
        <dl className="govuk-summary-list">
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Address line 1</dt>
            <dd className="govuk-summary-list__value">{address.line1}</dd>
            <dd className="govuk-summary-list__actions">
              <a className="govuk-link" href="/apply/address">
                Change<span className="govuk-visually-hidden"> address line 1</span>
              </a>
            </dd>
          </div>
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Address line 2</dt>
            <dd className="govuk-summary-list__value">{address.line2 || "Not provided"}</dd>
            <dd className="govuk-summary-list__actions">
              <a className="govuk-link" href="/apply/address">
                Change<span className="govuk-visually-hidden"> address line 2</span>
              </a>
            </dd>
          </div>
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Address line 3</dt>
            <dd className="govuk-summary-list__value">{address.line3 || "Not provided"}</dd>
            <dd className="govuk-summary-list__actions">
              <a className="govuk-link" href="/apply/address">
                Change<span className="govuk-visually-hidden"> address line 3</span>
              </a>
            </dd>
          </div>
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Postcode</dt>
            <dd className="govuk-summary-list__value">{address.postcode}</dd>
            <dd className="govuk-summary-list__actions">
              <a className="govuk-link" href="/apply/address">
                Change<span className="govuk-visually-hidden"> postcode</span>
              </a>
            </dd>
          </div>
        </dl>

        {/* University */}
        <h2 className="govuk-heading-m">University</h2>
        <dl className="govuk-summary-list">
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">University name</dt>
            <dd className="govuk-summary-list__value">{university.universityName}</dd>
            <dd className="govuk-summary-list__actions">
              <a className="govuk-link" href="/apply/university">
                Change<span className="govuk-visually-hidden"> university name</span>
              </a>
            </dd>
          </div>
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Course name</dt>
            <dd className="govuk-summary-list__value">{university.courseName}</dd>
            <dd className="govuk-summary-list__actions">
              <a className="govuk-link" href="/apply/university">
                Change<span className="govuk-visually-hidden"> course name</span>
              </a>
            </dd>
          </div>
        </dl>

        {/* Contact preferences */}
        <h2 className="govuk-heading-m">Contact preferences</h2>
        <dl className="govuk-summary-list">
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Preferred contact method</dt>
            <dd className="govuk-summary-list__value">
              {CHANNEL_LABELS[contact.notificationChannel] || contact.notificationChannel}
            </dd>
            <dd className="govuk-summary-list__actions">
              <a className="govuk-link" href="/apply/contact">
                Change<span className="govuk-visually-hidden"> preferred contact method</span>
              </a>
            </dd>
          </div>
          {contact.notificationChannel === "email" && (
            <div className="govuk-summary-list__row">
              <dt className="govuk-summary-list__key">Email address</dt>
              <dd className="govuk-summary-list__value">{contact.email}</dd>
              <dd className="govuk-summary-list__actions">
                <a className="govuk-link" href="/apply/contact">
                  Change<span className="govuk-visually-hidden"> email address</span>
                </a>
              </dd>
            </div>
          )}
          {contact.notificationChannel === "sms" && (
            <div className="govuk-summary-list__row">
              <dt className="govuk-summary-list__key">Phone number</dt>
              <dd className="govuk-summary-list__value">{contact.phone}</dd>
              <dd className="govuk-summary-list__actions">
                <a className="govuk-link" href="/apply/contact">
                  Change<span className="govuk-visually-hidden"> phone number</span>
                </a>
              </dd>
            </div>
          )}
        </dl>

        {/* Costs */}
        <h2 className="govuk-heading-m">Cost items</h2>
        {costs.length > 0 ? (
          <>
            {costs.map((item, index) => (
              <dl className="govuk-summary-list govuk-!-margin-bottom-4" key={item.id}>
                <div className="govuk-summary-list__row">
                  <dt className="govuk-summary-list__key">Cost item {index + 1} — Description</dt>
                  <dd className="govuk-summary-list__value">{item.description}</dd>
                  <dd className="govuk-summary-list__actions">
                    <a className="govuk-link" href="/apply/costs">
                      Change<span className="govuk-visually-hidden"> cost item {index + 1}</span>
                    </a>
                  </dd>
                </div>
                <div className="govuk-summary-list__row">
                  <dt className="govuk-summary-list__key">Cost item {index + 1} — Amount</dt>
                  <dd className="govuk-summary-list__value">£{parseFloat(item.amount).toFixed(2)}</dd>
                  <dd className="govuk-summary-list__actions">
                    <a className="govuk-link" href="/apply/costs">
                      Change<span className="govuk-visually-hidden"> cost item {index + 1} amount</span>
                    </a>
                  </dd>
                </div>
                <div className="govuk-summary-list__row">
                  <dt className="govuk-summary-list__key">Cost item {index + 1} — Supplier</dt>
                  <dd className="govuk-summary-list__value">{item.supplier}</dd>
                  <dd className="govuk-summary-list__actions">
                    <a className="govuk-link" href="/apply/costs">
                      Change<span className="govuk-visually-hidden"> cost item {index + 1} supplier</span>
                    </a>
                  </dd>
                </div>
              </dl>
            ))}
            <div className="govuk-inset-text">
              <p className="govuk-body govuk-!-font-weight-bold">
                Total: £{calculateTotal()}
              </p>
            </div>
          </>
        ) : (
          <p className="govuk-body">No cost items added.</p>
        )}

        {/* Declaration */}
        <h2 className="govuk-heading-m">Declaration</h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className={`govuk-form-group${declarationError ? " govuk-form-group--error" : ""}`}>
            <fieldset
              className="govuk-fieldset"
              aria-describedby={declarationError ? "declaration-error" : undefined}
            >
              {declarationError && (
                <p id="declaration-error" className="govuk-error-message">
                  <span className="govuk-visually-hidden">Error:</span> {declarationError}
                </p>
              )}
              <div className="govuk-checkboxes" data-module="govuk-checkboxes">
                <div className="govuk-checkboxes__item">
                  <input
                    className="govuk-checkboxes__input"
                    id="declaration"
                    name="declaration"
                    type="checkbox"
                    checked={declarationConfirmed}
                    onChange={(e) => setDeclarationConfirmed(e.target.checked)}
                    aria-describedby={declarationError ? "declaration-error" : undefined}
                  />
                  <label
                    className="govuk-label govuk-checkboxes__label"
                    htmlFor="declaration"
                  >
                    By submitting this application, I confirm that the information I have provided
                    is correct and complete to the best of my knowledge.
                  </label>
                </div>
              </div>
            </fieldset>
          </div>

          <button
            type="submit"
            className="govuk-button"
            data-module="govuk-button"
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit application"}
          </button>
        </form>
      </main>
    </div>
  );
}
