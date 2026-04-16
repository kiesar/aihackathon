import { Applicant } from "../../types";
import { NotificationService, SentNotification } from "./types";

/**
 * Mock implementation of the NotificationService.
 * Logs to console and records sent notifications in an in-memory array
 * for testing assertions.
 */
export class MockNotificationService implements NotificationService {
  public sent: SentNotification[] = [];

  async sendConfirmation(
    applicant: Applicant,
    caseReference: string
  ): Promise<void> {
    const subject = "DSA Application Received";
    const body =
      `Your DSA application has been received. ` +
      `Your case reference is ${caseReference}. ` +
      `We will contact you when we need further evidence to support your application.`;

    this.record(applicant, subject, body);
  }

  async sendOutcome(
    applicant: Applicant,
    caseReference: string,
    outcome: "approved" | "rejected"
  ): Promise<void> {
    const subject =
      outcome === "approved"
        ? "DSA Application Approved"
        : "DSA Application Rejected";
    const body =
      outcome === "approved"
        ? `Your DSA application (${caseReference}) has been approved. You will receive further details about your allowance shortly.`
        : `Your DSA application (${caseReference}) has been rejected. You can contact us for more information about this decision.`;

    this.record(applicant, subject, body);
  }

  async sendReminder(
    applicant: Applicant,
    caseReference: string,
    daysOutstanding: number
  ): Promise<void> {
    const subject = "DSA Application — Evidence Reminder";
    const body =
      `Your DSA application (${caseReference}) has been awaiting evidence for ${daysOutstanding} days. ` +
      `Please submit your supporting documents as soon as possible to avoid delays.`;

    this.record(applicant, subject, body);
  }

  private record(
    applicant: Applicant,
    subject: string,
    body: string
  ): void {
    const channel = applicant.notification_channel;
    const to =
      channel === "email" ? applicant.email! : applicant.phone!;

    const notification: SentNotification = {
      type: channel,
      to,
      subject,
      body,
      timestamp: new Date().toISOString(),
    };

    this.sent.push(notification);
    console.log(
      `[Notification] ${channel.toUpperCase()} to ${to}: ${subject} — ${body}`
    );
  }
}
