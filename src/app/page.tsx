export default function HomePage() {
  return (
    <div className="govuk-width-container">
      <main className="govuk-main-wrapper" id="main-content" role="main">
        <h1 className="govuk-heading-xl">Disabled Students Allowance</h1>
        <p className="govuk-body-l">
          Use this service to apply for Disabled Students Allowance (DSA) or check the status of an existing application.
        </p>

        <div className="govuk-grid-row">
          <div className="govuk-grid-column-one-half">
            <h2 className="govuk-heading-m">Apply for DSA</h2>
            <p className="govuk-body">
              Complete the online application form to submit your DSA application.
            </p>
            <a href="/apply/personal-details" role="button" draggable="false" className="govuk-button govuk-button--start" data-module="govuk-button">
              Start application
              <svg className="govuk-button__start-icon" xmlns="http://www.w3.org/2000/svg" width="17.5" height="19" viewBox="0 0 33 40" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="M0 0h13l20 20-20 20H0l20-20z" />
              </svg>
            </a>
          </div>

          <div className="govuk-grid-column-one-half">
            <h2 className="govuk-heading-m">Check application status</h2>
            <p className="govuk-body">
              Use your case reference number to check the current status of your application.
            </p>
            <a href="/apply/status" className="govuk-button govuk-button--secondary">
              Check status
            </a>
          </div>
        </div>

        <hr className="govuk-section-break govuk-section-break--l govuk-section-break--visible" />

        <h2 className="govuk-heading-m">Caseworker access</h2>
        <p className="govuk-body">
          <a href="/dashboard/login" className="govuk-link">Sign in to the caseworker dashboard</a>
        </p>
      </main>
    </div>
  );
}
