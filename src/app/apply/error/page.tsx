"use client";

export default function ErrorPage() {
  return (
    <div className="govuk-width-container">
      <main className="govuk-main-wrapper" id="main-content" role="main">
        <h1 className="govuk-heading-l">Sorry, there is a problem with the service</h1>
        <p className="govuk-body">Try again later.</p>
        <p className="govuk-body">
          If you have already submitted your application, your data has not been lost. Please try again in a few minutes.
        </p>
        <p className="govuk-body">
          <a className="govuk-link" href="/apply/check-answers">
            Return to check your answers
          </a>
        </p>
      </main>
    </div>
  );
}
