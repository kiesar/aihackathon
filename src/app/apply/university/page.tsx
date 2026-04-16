"use client";

import { useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useFormContext } from "@/lib/form-context";
import { validateRequired, ValidationError } from "@/lib/validation";

export default function UniversityPage() {
  const router = useRouter();
  const { formData, updateUniversity } = useFormContext();
  const { university } = formData;

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const [universityName, setUniversityName] = useState(university.universityName);
  const [courseName, setCourseName] = useState(university.courseName);

  function getErrorForField(field: string): string | undefined {
    return errors.find((e) => e.field === field)?.message;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const newErrors: ValidationError[] = [];

    const uniErr = validateRequired(universityName, "universityName", "your university name");
    if (uniErr) newErrors.push(uniErr);

    const courseErr = validateRequired(courseName, "courseName", "your course name");
    if (courseErr) newErrors.push(courseErr);

    setErrors(newErrors);

    if (newErrors.length > 0) {
      setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }

    updateUniversity({ universityName, courseName });
    router.push("/apply/contact");
  }

  const universityNameError = getErrorForField("universityName");
  const courseNameError = getErrorForField("courseName");

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

        <h1 className="govuk-heading-l">University details</h1>

        <form onSubmit={handleSubmit} noValidate>
          {/* University name */}
          <div className={`govuk-form-group${universityNameError ? " govuk-form-group--error" : ""}`}>
            <label className="govuk-label" htmlFor="universityName">
              University name
            </label>
            {universityNameError && (
              <p id="universityName-error" className="govuk-error-message">
                <span className="govuk-visually-hidden">Error:</span> {universityNameError}
              </p>
            )}
            <input
              className={`govuk-input${universityNameError ? " govuk-input--error" : ""}`}
              id="universityName"
              name="universityName"
              type="text"
              value={universityName}
              onChange={(e) => setUniversityName(e.target.value)}
              aria-describedby={universityNameError ? "universityName-error" : undefined}
            />
          </div>

          {/* Course name */}
          <div className={`govuk-form-group${courseNameError ? " govuk-form-group--error" : ""}`}>
            <label className="govuk-label" htmlFor="courseName">
              Course name
            </label>
            {courseNameError && (
              <p id="courseName-error" className="govuk-error-message">
                <span className="govuk-visually-hidden">Error:</span> {courseNameError}
              </p>
            )}
            <input
              className={`govuk-input${courseNameError ? " govuk-input--error" : ""}`}
              id="courseName"
              name="courseName"
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              aria-describedby={courseNameError ? "courseName-error" : undefined}
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
