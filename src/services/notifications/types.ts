import { Applicant } from "../../types";

/**
 * A record of a notification sent by the service.
 */
export interface SentNotification {
  type: "email" | "sms";
  to: string;
  subject: string;
  body: string;
  timestamp: string;
}

/**
 * Notification Service interface — designed to match GOV.UK Notify shape
 * for easy swap to a real implementation.
 */
export interface NotificationService {
  sendConfirmation(applicant: Applicant, caseReference: string): Promise<void>;
  sendOutcome(
    applicant: Applicant,
    caseReference: string,
    outcome: "approved" | "rejected"
  ): Promise<void>;
  sendReminder(
    applicant: Applicant,
    caseReference: string,
    daysOutstanding: number
  ): Promise<void>;
}
