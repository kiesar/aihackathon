import { describe, expect } from "vitest";
import { it, fc } from "@fast-check/vitest";
import { MockNotificationService } from "./mock-notification.service";
import type { Applicant } from "@/types";

// ── Arbitraries ─────────────────────────────────────────────

const arbNotificationChannel = fc.constantFrom<"email" | "sms">("email", "sms");

const arbEmail = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 10, unit: "grapheme-ascii" }).filter((s) => /^[a-z0-9]+$/i.test(s)),
    fc.string({ minLength: 1, maxLength: 8, unit: "grapheme-ascii" }).filter((s) => /^[a-z0-9]+$/i.test(s))
  )
  .map(([local, domain]) => `${local}@${domain}.co.uk`);

const arbPhone = fc
  .string({ minLength: 10, maxLength: 11, unit: "grapheme-ascii" })
  .filter((s) => /^0\d{9,10}$/.test(s))
  .noBias()
  .noShrink()
  // Fallback: generate a valid phone directly
  .map((s) => s || "07700900000");

const arbPhoneSafe = fc
  .integer({ min: 7000000000, max: 7999999999 })
  .map((n) => `0${n}`);

const arbCaseReference = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 99999 })
  )
  .map(([year, seq]) => `DSA-${year}-${String(seq).padStart(5, "0")}`);

const arbApplicant = (channel: "email" | "sms"): fc.Arbitrary<Applicant> =>
  fc.record({
    name: fc.constant("Test User"),
    forenames: fc.string({ minLength: 1, maxLength: 20, unit: "grapheme-ascii" }).filter((s) => s.trim().length > 0),
    surname: fc.string({ minLength: 1, maxLength: 20, unit: "grapheme-ascii" }).filter((s) => s.trim().length > 0),
    reference: fc.string({ minLength: 0, maxLength: 10 }),
    date_of_birth: fc.constant("2000-01-15"),
    sex: fc.constantFrom("male" as const, "female" as const, "non-binary" as const, "prefer_not_to_say" as const),
    address: fc.record({
      line1: fc.constant("1 High St"),
      postcode: fc.constant("SW1A 1AA"),
    }),
    university: fc.constant("UCL"),
    course: fc.constant("Computer Science"),
    notification_channel: fc.constant(channel),
    email: channel === "email" ? arbEmail : fc.constant(undefined),
    phone: channel === "sms" ? arbPhoneSafe.map((p) => p as string) : fc.constant(undefined),
  }) as fc.Arbitrary<Applicant>;

const arbApplicantWithChannel: fc.Arbitrary<Applicant> = arbNotificationChannel.chain(
  (channel) => arbApplicant(channel)
);

// ── Tests ───────────────────────────────────────────────────

describe("MockNotificationService — Property Tests", () => {
  // Feature: dsa-allowance-service, Property 10: Notification sent on submission with correct channel
  // **Validates: Requirements 4.5**
  describe("Property 10: Notification sent on submission with correct channel", () => {
    it.prop([arbApplicantWithChannel, arbCaseReference], { numRuns: 100 })(
      "sendConfirmation is called once with the correct channel and the message contains the Case_Reference",
      async (applicant, caseReference) => {
        // Fresh service per iteration to avoid accumulation across runs
        const svc = new MockNotificationService();

        await svc.sendConfirmation(applicant, caseReference);

        // Exactly one notification sent
        expect(svc.sent).toHaveLength(1);

        const notification = svc.sent[0];

        // Correct channel used
        expect(notification.type).toBe(applicant.notification_channel);

        // Sent to the correct recipient
        if (applicant.notification_channel === "email") {
          expect(notification.to).toBe(applicant.email);
        } else {
          expect(notification.to).toBe(applicant.phone);
        }

        // Message body contains the Case_Reference
        expect(notification.body).toContain(caseReference);
      }
    );
  });
});
