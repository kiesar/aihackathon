"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const caseReference = searchParams.get("ref");

  if (!caseReference) {
    return (
      <div className="govuk-width-container">
        <main className="govuk-main-wrapper" id="main-content" role="main">
          <h1 className="govuk-heading-l">Sorry, there is a problem with the service</h1>
          <p className="govuk-body">Try again later.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="govuk-width-container">
      <main className="govuk-main-wrapper" id="main-content" role="main">
        <div className="govuk-panel govuk-panel--confirmation">
          <h1 className="govuk-panel__title">Application submitted</h1>
          <div className="govuk-panel__body">
            Your reference number<br />
            <strong>{caseReference}</strong>
          </div>
        </div>

        <h2 className="govuk-heading-m">What happens next</h2>
        <p className="govuk-body">
          We have sent you a confirmation with your reference number via your preferred contact method.
        </p>
        <p className="govuk-body">
          A caseworker will review your application. You may be asked to provide evidence to support your application,
          such as proof of disability or cost quotes from suppliers.
        </p>
        <p className="govuk-body">
          You can{" "}
          <a className="govuk-link" href="/apply/status">
            check the status of your application
          </a>{" "}
          at any time using your reference number.
        </p>
      </main>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense>
      <ConfirmationContent />
    </Suspense>
  );
}
