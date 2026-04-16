import { AISummaryRequest, AISummaryResponse, AISummaryService } from "./types";

/**
 * Pre-written summaries keyed by `${caseType}:${currentState}`.
 * Each entry provides a realistic plain-English summary, outstanding
 * evidence items, and a recommended next action.
 */
const MOCK_SUMMARIES: Record<
  string,
  Omit<AISummaryResponse, "generatedAt" | "isAiGenerated">
> = {
  // ── DSA Application ───────────────────────────────────────
  "dsa_application:awaiting_evidence": {
    summary:
      "This DSA application has been received and is awaiting supporting evidence from the applicant. " +
      "The applicant submitted cost items for assistive technology and specialist mentoring support. " +
      "No evidence documents have been received to date.",
    outstandingEvidence: [
      "Proof of disability or medical evidence (e.g. diagnostic report)",
      "Quotes from approved suppliers for requested equipment",
      "University confirmation of enrolment",
    ],
    recommendedAction:
      "Monitor for incoming evidence. If no evidence is received within 28 days, send a reminder to the applicant.",
  },
  "dsa_application:evidence_received": {
    summary:
      "Supporting evidence has been received for this DSA application. " +
      "The documents are ready for initial review to confirm completeness and relevance " +
      "before the case proceeds to full assessment.",
    outstandingEvidence: [],
    recommendedAction:
      "Begin review of the submitted evidence to confirm all required documents are present and valid.",
  },
  "dsa_application:under_review": {
    summary:
      "This DSA application is currently under review. The caseworker is assessing the submitted evidence " +
      "against the applicant's declared costs and the applicable DSA policy criteria. " +
      "All required evidence appears to have been received.",
    outstandingEvidence: [],
    recommendedAction:
      "Complete the review and either approve, reject, or send for specialist assessment if further input is needed.",
  },
  "dsa_application:awaiting_assessment": {
    summary:
      "This case has been referred for specialist assessment. The applicant's needs assessment " +
      "is being conducted to determine the appropriate level of support and equipment required.",
    outstandingEvidence: [
      "Specialist needs assessment report",
    ],
    recommendedAction:
      "Await the specialist assessment report. Follow up with the assessment centre if the report is overdue.",
  },
  "dsa_application:approved": {
    summary:
      "This DSA application has been approved. The applicant has been notified of the decision " +
      "and the approved allowance amount. Equipment and support arrangements can now proceed.",
    outstandingEvidence: [],
    recommendedAction:
      "No further action required. The case can be closed once the applicant confirms receipt of the decision.",
  },
  "dsa_application:rejected": {
    summary:
      "This DSA application has been rejected. The applicant did not meet the eligibility criteria " +
      "based on the evidence provided. The applicant has been notified and informed of their right to appeal.",
    outstandingEvidence: [],
    recommendedAction:
      "No further action required unless the applicant submits an appeal.",
  },
  "dsa_application:escalated": {
    summary:
      "This DSA application has been escalated due to evidence outstanding beyond the 56-day threshold. " +
      "The applicant has not responded to previous reminders. Team leader intervention is required.",
    outstandingEvidence: [
      "All previously requested evidence remains outstanding",
    ],
    recommendedAction:
      "Team leader to review and decide whether to close the case or make a final attempt to contact the applicant.",
  },
  "dsa_application:closed": {
    summary:
      "This DSA application has been closed. The case was either withdrawn by the applicant " +
      "or closed following an escalation period with no response.",
    outstandingEvidence: [],
    recommendedAction: "No further action required. Case is closed.",
  },

  // ── Allowance Review ──────────────────────────────────────
  "allowance_review:awaiting_evidence": {
    summary:
      "This allowance review case is awaiting updated evidence from the applicant. " +
      "A periodic review of the existing DSA allowance has been triggered and the applicant " +
      "needs to provide current documentation.",
    outstandingEvidence: [
      "Updated proof of continuing disability",
      "Current university enrolment confirmation",
      "Updated supplier quotes if equipment needs have changed",
    ],
    recommendedAction:
      "Wait for the applicant to submit updated evidence. Send a reminder if not received within 28 days.",
  },
  "allowance_review:under_review": {
    summary:
      "The allowance review is under assessment. The caseworker is comparing the updated evidence " +
      "against the original allowance to determine if adjustments are needed.",
    outstandingEvidence: [],
    recommendedAction:
      "Complete the review and determine whether the allowance should be maintained, adjusted, or revoked.",
  },
  "allowance_review:approved": {
    summary:
      "The allowance review has been completed and the allowance has been confirmed or adjusted. " +
      "The applicant has been notified of the outcome.",
    outstandingEvidence: [],
    recommendedAction: "No further action required.",
  },

  // ── Compliance Check ──────────────────────────────────────
  "compliance_check:awaiting_evidence": {
    summary:
      "A compliance check has been initiated for this case. The applicant has been asked to provide " +
      "evidence that the DSA funds are being used for their intended purpose.",
    outstandingEvidence: [
      "Receipts or invoices for purchased equipment",
      "Confirmation of attendance at support sessions",
      "Supplier delivery confirmation",
    ],
    recommendedAction:
      "Await compliance evidence from the applicant. Escalate if not received within the policy timeframe.",
  },
  "compliance_check:under_review": {
    summary:
      "Compliance evidence has been received and is under review. The caseworker is verifying " +
      "that the DSA funds have been used appropriately.",
    outstandingEvidence: [],
    recommendedAction:
      "Complete the compliance review and record the outcome.",
  },
};

/**
 * Default fallback summary used when no specific mock exists
 * for the given caseType + currentState combination.
 */
const DEFAULT_SUMMARY: Omit<AISummaryResponse, "generatedAt" | "isAiGenerated"> = {
  summary:
    "This case is currently being processed. Review the case timeline and notes " +
    "for the most up-to-date information on the applicant's submission and any outstanding actions.",
  outstandingEvidence: [
    "Check case notes for any outstanding evidence requirements",
  ],
  recommendedAction:
    "Review the case details and take the appropriate action based on the current workflow state.",
};

/**
 * Mock implementation of the AISummaryService.
 * Returns pre-written summaries keyed by caseType + currentState,
 * with a default fallback for unrecognised combinations.
 */
export class MockAISummaryService implements AISummaryService {
  async getSummary(request: AISummaryRequest): Promise<AISummaryResponse> {
    const key = `${request.caseType}:${request.currentState}`;
    const template = MOCK_SUMMARIES[key] ?? DEFAULT_SUMMARY;

    return {
      ...template,
      generatedAt: new Date().toISOString(),
      isAiGenerated: true,
    };
  }
}
