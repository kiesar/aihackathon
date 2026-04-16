import { describe, expect } from "vitest";
import { it, fc } from "@fast-check/vitest";
import {
  validateRequired,
  validateEmail,
  validateUkPhoneNumber,
  ValidationError,
} from "./validation";

// ── Helper: mirrors the contact page's validation logic ─────

function validateContact(input: {
  notificationChannel: string;
  email: string;
  phone: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  const channelErr = validateRequired(
    input.notificationChannel,
    "notificationChannel",
    "how you would like to be contacted"
  );
  if (channelErr) errors.push(channelErr);

  if (input.notificationChannel === "email") {
    const emailErr = validateEmail(input.email, "email");
    if (emailErr) errors.push(emailErr);
  }

  if (input.notificationChannel === "sms") {
    const phoneErr = validateUkPhoneNumber(input.phone, "phone");
    if (phoneErr) errors.push(phoneErr);
  }

  return errors;
}

// ── Arbitraries ─────────────────────────────────────────────

/** Generate a valid email address */
const arbValidEmail = fc
  .tuple(
    fc.stringOf(fc.constantFrom("a", "b", "c", "d", "1", "2", "."), { minLength: 1, maxLength: 10 }),
    fc.stringOf(fc.constantFrom("a", "b", "c", "x", "y"), { minLength: 1, maxLength: 8 }),
    fc.constantFrom("com", "co.uk", "org", "ac.uk", "net"),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`)
  .filter((e) => validateEmail(e) === null);

/** Generate a valid UK mobile phone number */
const arbValidPhone = fc
  .tuple(
    fc.constantFrom("07"),
    fc.stringOf(fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9"), {
      minLength: 9,
      maxLength: 9,
    }),
  )
  .map(([prefix, digits]) => `${prefix}${digits}`)
  .filter((p) => validateUkPhoneNumber(p) === null);

/** Generate an arbitrary string that is NOT a valid email */
const arbInvalidEmail = fc.oneof(
  fc.constant(""),
  fc.constant("   "),
  fc.stringOf(fc.constantFrom("a", "b", "1", " "), { minLength: 1, maxLength: 10 }).filter(
    (s) => validateEmail(s) !== null
  ),
);

/** Generate an arbitrary string that is NOT a valid UK mobile phone */
const arbInvalidPhone = fc.oneof(
  fc.constant(""),
  fc.constant("   "),
  fc.stringOf(fc.constantFrom("0", "1", "2", "a", "b"), { minLength: 1, maxLength: 8 }).filter(
    (s) => validateUkPhoneNumber(s) !== null
  ),
);

// ── Tests ───────────────────────────────────────────────────

// Feature: dsa-allowance-service, Property 1: Notification channel conditional validation
// **Validates: Requirements 1.3**
describe("Property 1: Notification channel conditional validation", () => {
  it.prop(
    [arbValidEmail, fc.string({ minLength: 0, maxLength: 15 })],
    { numRuns: 100 },
  )(
    "when email channel is selected with a valid email, validation passes with no email or phone errors",
    (validEmail, anyPhone) => {
      const errors = validateContact({
        notificationChannel: "email",
        email: validEmail,
        phone: anyPhone,
      });
      expect(errors.some((e) => e.field === "email")).toBe(false);
      expect(errors.some((e) => e.field === "phone")).toBe(false);
      expect(errors.some((e) => e.field === "notificationChannel")).toBe(false);
    },
  );

  it.prop(
    [arbInvalidEmail, fc.string({ minLength: 0, maxLength: 15 })],
    { numRuns: 100 },
  )(
    "when email channel is selected with an invalid/missing email, validation produces an email error",
    (badEmail, anyPhone) => {
      const errors = validateContact({
        notificationChannel: "email",
        email: badEmail,
        phone: anyPhone,
      });
      expect(errors.some((e) => e.field === "email")).toBe(true);
      // Phone should never be required when email channel is selected
      expect(errors.some((e) => e.field === "phone")).toBe(false);
    },
  );

  it.prop(
    [arbValidPhone, fc.string({ minLength: 0, maxLength: 15 })],
    { numRuns: 100 },
  )(
    "when SMS channel is selected with a valid phone, validation passes with no email or phone errors",
    (validPhone, anyEmail) => {
      const errors = validateContact({
        notificationChannel: "sms",
        email: anyEmail,
        phone: validPhone,
      });
      expect(errors.some((e) => e.field === "phone")).toBe(false);
      expect(errors.some((e) => e.field === "email")).toBe(false);
      expect(errors.some((e) => e.field === "notificationChannel")).toBe(false);
    },
  );

  it.prop(
    [arbInvalidPhone, fc.string({ minLength: 0, maxLength: 15 })],
    { numRuns: 100 },
  )(
    "when SMS channel is selected with an invalid/missing phone, validation produces a phone error",
    (badPhone, anyEmail) => {
      const errors = validateContact({
        notificationChannel: "sms",
        email: anyEmail,
        phone: badPhone,
      });
      expect(errors.some((e) => e.field === "phone")).toBe(true);
      // Email should never be required when SMS channel is selected
      expect(errors.some((e) => e.field === "email")).toBe(false);
    },
  );

  it.prop(
    [
      fc.constantFrom("email" as const, "sms" as const),
      fc.string({ minLength: 0, maxLength: 15 }),
      fc.string({ minLength: 0, maxLength: 15 }),
    ],
    { numRuns: 100 },
  )(
    "for any channel selection, only the corresponding contact field is validated — the other is never checked",
    (channel, anyEmail, anyPhone) => {
      const errors = validateContact({
        notificationChannel: channel,
        email: anyEmail,
        phone: anyPhone,
      });

      if (channel === "email") {
        // Phone field should never produce an error
        expect(errors.some((e) => e.field === "phone")).toBe(false);
      } else {
        // Email field should never produce an error
        expect(errors.some((e) => e.field === "email")).toBe(false);
      }
    },
  );
});
