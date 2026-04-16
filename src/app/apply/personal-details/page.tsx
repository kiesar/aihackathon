"use client";

import { useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useFormContext } from "@/lib/form-context";
import { validateRequired, validateDateOfBirth, ValidationError } from "@/lib/validation";

const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export default function PersonalDetailsPage() {
  const router = useRouter();
  const { formData, updatePersonalDetails } = useFormContext();
  const { personalDetails } = formData;

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // Local form state initialised from context
  const [customerReference, setCustomerReference] = useState(personalDetails.customerReference);
  const [forenames, setForenames] = useState(personalDetails.forenames);
  const [surname, setSurname] = useState(personalDetails.surname);
  const [sex, setSex] = useState(personalDetails.sex);
  const [dobDay, setDobDay] = useState(personalDetails.dobDay);
  const [dobMonth, setDobMonth] = useState(personalDetails.dobMonth);
  const [dobYear, setDobYear] = useState(personalDetails.dobYear);

  function getErrorForField(field: string): string | undefined {
    return errors.find((e) => e.field === field)?.message;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const newErrors: ValidationError[] = [];

    // Forenames — required
    const forenamesErr = validateRequired(forenames, "forenames", "your forename(s)");
    if (forenamesErr) newErrors.push(forenamesErr);

    // Surname — required
    const surnameErr = validateRequired(surname, "surname", "your surname");
    if (surnameErr) newErrors.push(surnameErr);

    // Sex — required
    const sexErr = validateRequired(sex, "sex", "your sex");
    if (sexErr) newErrors.push(sexErr);

    // Date of birth — required + format + age check
    const dobString = dobDay && dobMonth && dobYear
      ? `${dobDay.padStart(2, "0")}/${dobMonth.padStart(2, "0")}/${dobYear}`
      : "";
    const dobErr = validateDateOfBirth(dobString, "dateOfBirth");
    if (dobErr) newErrors.push(dobErr);

    setErrors(newErrors);

    if (newErrors.length > 0) {
      // Focus the error summary
      setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }

    // Save to context and navigate
    updatePersonalDetails({
      customerReference,
      forenames,
      surname,
      sex,
      dobDay,
      dobMonth,
      dobYear,
    });

    router.push("/apply/address");
  }

  const forenamesError = getErrorForField("forenames");
  const surnameError = getErrorForField("surname");
  const sexError = getErrorForField("sex");
  const dobError = getErrorForField("dateOfBirth");

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

        <h1 className="govuk-heading-l">Personal details</h1>

        <form onSubmit={handleSubmit} noValidate>
          {/* Customer Reference Number (optional) */}
          <div className="govuk-form-group">
            <label className="govuk-label" htmlFor="customerReference">
              Customer Reference Number (optional)
            </label>
            <input
              className="govuk-input govuk-input--width-20"
              id="customerReference"
              name="customerReference"
              type="text"
              value={customerReference}
              onChange={(e) => setCustomerReference(e.target.value)}
            />
          </div>

          {/* Forename(s) */}
          <div className={`govuk-form-group${forenamesError ? " govuk-form-group--error" : ""}`}>
            <label className="govuk-label" htmlFor="forenames">
              Forename(s)
            </label>
            {forenamesError && (
              <p id="forenames-error" className="govuk-error-message">
                <span className="govuk-visually-hidden">Error:</span> {forenamesError}
              </p>
            )}
            <input
              className={`govuk-input${forenamesError ? " govuk-input--error" : ""}`}
              id="forenames"
              name="forenames"
              type="text"
              value={forenames}
              onChange={(e) => setForenames(e.target.value)}
              aria-describedby={forenamesError ? "forenames-error" : undefined}
            />
          </div>

          {/* Surname */}
          <div className={`govuk-form-group${surnameError ? " govuk-form-group--error" : ""}`}>
            <label className="govuk-label" htmlFor="surname">
              Surname
            </label>
            {surnameError && (
              <p id="surname-error" className="govuk-error-message">
                <span className="govuk-visually-hidden">Error:</span> {surnameError}
              </p>
            )}
            <input
              className={`govuk-input${surnameError ? " govuk-input--error" : ""}`}
              id="surname"
              name="surname"
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              aria-describedby={surnameError ? "surname-error" : undefined}
            />
          </div>

          {/* Sex (radio group) */}
          <div className={`govuk-form-group${sexError ? " govuk-form-group--error" : ""}`}>
            <fieldset
              className="govuk-fieldset"
              aria-describedby={sexError ? "sex-error" : undefined}
            >
              <legend className="govuk-fieldset__legend">Sex</legend>
              {sexError && (
                <p id="sex-error" className="govuk-error-message">
                  <span className="govuk-visually-hidden">Error:</span> {sexError}
                </p>
              )}
              <div className="govuk-radios" id="sex">
                {SEX_OPTIONS.map((option) => (
                  <div className="govuk-radios__item" key={option.value}>
                    <input
                      className="govuk-radios__input"
                      id={`sex-${option.value}`}
                      name="sex"
                      type="radio"
                      value={option.value}
                      checked={sex === option.value}
                      onChange={(e) => setSex(e.target.value)}
                    />
                    <label
                      className="govuk-label govuk-radios__label"
                      htmlFor={`sex-${option.value}`}
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Date of Birth */}
          <div className={`govuk-form-group${dobError ? " govuk-form-group--error" : ""}`}>
            <fieldset
              className="govuk-fieldset"
              role="group"
              aria-describedby={`dateOfBirth-hint${dobError ? " dateOfBirth-error" : ""}`}
            >
              <legend className="govuk-fieldset__legend">Date of birth</legend>
              <div id="dateOfBirth-hint" className="govuk-hint">
                For example, 27 3 2007
              </div>
              {dobError && (
                <p id="dateOfBirth-error" className="govuk-error-message">
                  <span className="govuk-visually-hidden">Error:</span> {dobError}
                </p>
              )}
              <div className="govuk-date-input" id="dateOfBirth">
                <div className="govuk-date-input__item">
                  <div className="govuk-form-group">
                    <label className="govuk-label govuk-date-input__label" htmlFor="dobDay">
                      Day
                    </label>
                    <input
                      className={`govuk-input govuk-date-input__input govuk-input--width-2${dobError ? " govuk-input--error" : ""}`}
                      id="dobDay"
                      name="dobDay"
                      type="text"
                      inputMode="numeric"
                      value={dobDay}
                      onChange={(e) => setDobDay(e.target.value)}
                    />
                  </div>
                </div>
                <div className="govuk-date-input__item">
                  <div className="govuk-form-group">
                    <label className="govuk-label govuk-date-input__label" htmlFor="dobMonth">
                      Month
                    </label>
                    <input
                      className={`govuk-input govuk-date-input__input govuk-input--width-2${dobError ? " govuk-input--error" : ""}`}
                      id="dobMonth"
                      name="dobMonth"
                      type="text"
                      inputMode="numeric"
                      value={dobMonth}
                      onChange={(e) => setDobMonth(e.target.value)}
                    />
                  </div>
                </div>
                <div className="govuk-date-input__item">
                  <div className="govuk-form-group">
                    <label className="govuk-label govuk-date-input__label" htmlFor="dobYear">
                      Year
                    </label>
                    <input
                      className={`govuk-input govuk-date-input__input govuk-input--width-4${dobError ? " govuk-input--error" : ""}`}
                      id="dobYear"
                      name="dobYear"
                      type="text"
                      inputMode="numeric"
                      value={dobYear}
                      onChange={(e) => setDobYear(e.target.value)}
                    />
                  </div>
                </div>
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
