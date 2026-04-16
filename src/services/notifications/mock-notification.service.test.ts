import { describe, it, expect, vi } from "vitest";
import { MockNotificationService } from "./mock-notification.service";
import { Applicant } from "../../types";

function makeApplicant(
  channel: "email" | "sms",
  overrides: Partial<Applicant> = {}
): Applicant {
  return {
    name: "Jane Smith",
    forenames: "Jane",
    surname: "Smith",
    reference: "CRN-001",
    date_of_birth: "2000-01-15",
    sex: "female",
    address: { line1: "1 High St", postcode: "SW1A 1AA" },
    university: "UCL",
    course: "Computer Science",
    notification_channel: channel,
    email: channel === "email" ? "jane@example.com" : undefined,
    phone: channel === "sms" ? "07700900000" : undefined,
    ...overrides,
  };
}

describe("MockNotificationService", () => {
  it("sends confirmation via email when channel is email", async () => {
    const svc = new MockNotificationService();
    const applicant = makeApplicant("email");

    await svc.sendConfirmation(applicant, "DSA-2025-00001");

    expect(svc.sent).toHaveLength(1);
    expect(svc.sent[0].type).toBe("email");
    expect(svc.sent[0].to).toBe("jane@example.com");
    expect(svc.sent[0].body).toContain("DSA-2025-00001");
  });

  it("sends confirmation via SMS when channel is sms", async () => {
    const svc = new MockNotificationService();
    const applicant = makeApplicant("sms");

    await svc.sendConfirmation(applicant, "DSA-2025-00002");

    expect(svc.sent).toHaveLength(1);
    expect(svc.sent[0].type).toBe("sms");
    expect(svc.sent[0].to).toBe("07700900000");
    expect(svc.sent[0].body).toContain("DSA-2025-00002");
  });

  it("sends approved outcome notification", async () => {
    const svc = new MockNotificationService();
    const applicant = makeApplicant("email");

    await svc.sendOutcome(applicant, "DSA-2025-00003", "approved");

    expect(svc.sent).toHaveLength(1);
    expect(svc.sent[0].body).toContain("approved");
    expect(svc.sent[0].body).toContain("DSA-2025-00003");
  });

  it("sends rejected outcome notification", async () => {
    const svc = new MockNotificationService();
    const applicant = makeApplicant("sms");

    await svc.sendOutcome(applicant, "DSA-2025-00004", "rejected");

    expect(svc.sent).toHaveLength(1);
    expect(svc.sent[0].type).toBe("sms");
    expect(svc.sent[0].body).toContain("rejected");
    expect(svc.sent[0].body).toContain("DSA-2025-00004");
  });

  it("sends reminder with days outstanding", async () => {
    const svc = new MockNotificationService();
    const applicant = makeApplicant("email");

    await svc.sendReminder(applicant, "DSA-2025-00005", 30);

    expect(svc.sent).toHaveLength(1);
    expect(svc.sent[0].body).toContain("30 days");
    expect(svc.sent[0].body).toContain("DSA-2025-00005");
  });

  it("accumulates multiple notifications in sent array", async () => {
    const svc = new MockNotificationService();
    const applicant = makeApplicant("email");

    await svc.sendConfirmation(applicant, "DSA-2025-00006");
    await svc.sendOutcome(applicant, "DSA-2025-00006", "approved");

    expect(svc.sent).toHaveLength(2);
    expect(svc.sent[0].subject).toBe("DSA Application Received");
    expect(svc.sent[1].subject).toBe("DSA Application Approved");
  });

  it("logs to console on each send", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const svc = new MockNotificationService();
    const applicant = makeApplicant("sms");

    await svc.sendConfirmation(applicant, "DSA-2025-00007");

    expect(consoleSpy).toHaveBeenCalledOnce();
    expect(consoleSpy.mock.calls[0][0]).toContain("[Notification]");
    consoleSpy.mockRestore();
  });
});
