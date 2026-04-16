"use client";

import { useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useFormContext } from "@/lib/form-context";
import {
  validateRequired,
  validateEmail,
  validateUkPhoneNumber,
  ValidationError,
} from "@/lib/validation";

const CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "sms", label: "Text message (SMS)" },
];

export default function ContactPage() {
  const router = useRouter();
  const { formData, updateContact } = useFormContext();
  const { contact } = formData;

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const [notificationChannel, setNotificationChannel] = useState(contact.notificationChannel);
  const [email, setEmail] = useState(contact.email);
  const [phone, setPhone] = useState(contact.phone);

  function getErrorForField(field: string): string | undefined {
    return errors.find((e) => e.field === field)?.message;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const newErrors: ValidationError[] = [];

    const channelErr = validateRequired(
      notificationChannel,
      "notificationChannel",
      "how you would like to be contacted"
    );
    if (channelErr) newErrors.push(channelErr);

    if (notificationChannel === "email") {
      const emailErr = validateEmail(email, "email");
      if (emailErr) newErrors.push(emailErr);
    }

    if (notificationChannel === "sms") {
      const phoneErr = validateUkPhoneNumber(phone, "phone");
      if (phoneErr) newErrors.push(phoneErr);
    }

    setErrors(newErrors);

    if (newErrors.length > 0) {
      setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }

    updateContact({ notificationChannel, email, phone });
    router.push("/apply/costs");
  }

  const channelError = getErrorForField("notificationChannel");
  const emailError = getErrorForField("email");
  const phoneError = getErrorForField("phone");

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

        <h1 className="govuk-heading-l">How would you like to be contacted?</h1>

        <form onSubmit={handleSubmit} noValidate>
          <div className={`govuk-form-group${channelError ? " govuk-form-group--error" : ""}`}>
            <fieldset
              className="govuk-fieldset"
              aria-describedby={channelError ? "notificationChannel-error" : undefined}
            >
              <legend className="govuk-fieldset__legend">
                Select your preferred contact method
              </legend>
              {channelError && (
                <p id="notificationChannel-error" className="govuk-error-message">
                  <span className="govuk-visually-hidden">Error:</span> {channelError}
                </p>
              )}
              <div className="govuk-radios" data-module="govuk-radios" id="notificationChannel">
                {/* Email option */}
                <div className="govuk-radios__item">
                  <input
                    className="govuk-radios__input"
                    id="notificationChannel-email"
                    name="notificationChannel"
                    type="radio"
                    value="email"
                    checked={notificationChannel === "email"}
                    onChange={(e) => setNotificationChannel(e.target.value)}
                    aria-controls="conditional-email"
                    aria-expanded={notificationChannel === "email"}
                  />
                  <label
                    className="govuk-label govuk-radios__label"
                    htmlFor="notificationChannel-email"
                  >
                    Email
                  </label>
                </div>

                {/* Conditional email field */}
                {notificationChannel === "email" && (
                  <div
                    className="govuk-radios__conditional"
                    id="conditional-email"
                  >
                    <div className={`govuk-form-group${emailError ? " govuk-form-group--error" : ""}`}>
                      <label className="govuk-label" htmlFor="email">
                        Email address
                      </label>
                      {emailError && (
                        <p id="email-error" className="govuk-error-message">
                          <span className="govuk-visually-hidden">Error:</span> {emailError}
                        </p>
                      )}
                      <input
                        className={`govuk-input govuk-!-width-two-thirds${emailError ? " govuk-input--error" : ""}`}
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-describedby={emailError ? "email-error" : undefined}
                        spellCheck={false}
                        autoComplete="email"
                      />
                    </div>
                  </div>
                )}

                {/* SMS option */}
                <div className="govuk-radios__item">
                  <input
                    className="govuk-radios__input"
                    id="notificationChannel-sms"
                    name="notificationChannel"
                    type="radio"
                    value="sms"
                    checked={notificationChannel === "sms"}
                    onChange={(e) => setNotificationChannel(e.target.value)}
                    aria-controls="conditional-sms"
                    aria-expanded={notificationChannel === "sms"}
                  />
                  <label
                    className="govuk-label govuk-radios__label"
                    htmlFor="notificationChannel-sms"
                  >
                    Text message (SMS)
                  </label>
                </div>

                {/* Conditional phone field */}
                {notificationChannel === "sms" && (
                  <div
                    className="govuk-radios__conditional"
                    id="conditional-sms"
                  >
                    <div className={`govuk-form-group${phoneError ? " govuk-form-group--error" : ""}`}>
                      <label className="govuk-label" htmlFor="phone">
                        UK mobile phone number
                      </label>
                      {phoneError && (
                        <p id="phone-error" className="govuk-error-message">
                          <span className="govuk-visually-hidden">Error:</span> {phoneError}
                        </p>
                      )}
                      <input
                        className={`govuk-input govuk-!-width-two-thirds${phoneError ? " govuk-input--error" : ""}`}
                        id="phone"
                        name="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        aria-describedby={phoneError ? "phone-error" : undefined}
                        autoComplete="tel"
                      />
                    </div>
                  </div>
                )}
              </div>
            </fieldset>
          </div>

          <button type="submit" className="govuk-button" data-module="govuk-button">
            Continue
          </button>
        </form>
      </main>
    </div>
  );
}
