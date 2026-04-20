import "./globals.scss";
import type { Metadata } from "next";
import ChatbotWrapper from "@/components/ChatbotWrapper";

export const metadata: Metadata = {
  title: "DSA Allowance Service",
  description: "Disabled Students Allowance application and case management service",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="govuk-template">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/govuk-frontend@5.4.0/dist/govuk/govuk-frontend.min.css"
        />
      </head>
      <body className="govuk-template__body" suppressHydrationWarning>
        <a href="#main-content" className="govuk-skip-link" data-module="govuk-skip-link">
          Skip to main content
        </a>

        <header className="govuk-header" role="banner" data-module="govuk-header">
          <div className="govuk-header__container govuk-width-container">
            <div className="govuk-header__content">
              <a href="/" className="govuk-header__link govuk-header__service-name">
                DSA Allowance Service
              </a>
            </div>
          </div>
        </header>

        {children}

        <ChatbotWrapper />

        <footer className="govuk-footer" role="contentinfo">
          <div className="govuk-width-container">
            <div className="govuk-footer__meta">
              <div className="govuk-footer__meta-item govuk-footer__meta-item--grow">
                <span className="govuk-footer__licence-description">
                  Prototype — not a real government service
                </span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
