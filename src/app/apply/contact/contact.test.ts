import { describe, it, expect } from "vitest";
import {
  validateRequired,
  validateEmail,
  validateUkPhoneNumber,
  ValidationError,
} from "@/lib/validation";

/**
 * Tests for the Contact Preferences page validation logic.
 * The page validates: notification channel (required), and conditionally
 * email (if email selected) or phone (if SMS selected).
 */

// Helper that mirrors the page's validation logic
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

describe("Contact Preferences — Validation", () => {
  it("accepts valid email channel with email address", () => {
    const errors = validateContact({
      notificationChannel: "email",
      email: "test@example.com",
      phone: "",
    });
    expect(errors).toHaveLength(0);
  });

  it("accepts valid SMS channel with UK phone number", () => {
    const errors = validateContact({
      notificationChannel: "sms",
      email: "",
      phone: "07700900000",
    });
    expect(errors).toHaveLength(0);
  });

  it("requires notification channel selection", () => {
    const errors = validateContact({
      notificationChannel: "",
      email: "",
      phone: "",
    });
    expect(errors.some((e) => e.field === "notificationChannel")).toBe(true);
  });

  it("requires email when email channel is selected", () => {
    const errors = validateContact({
      notificationChannel: "email",
      email: "",
      phone: "",
    });
    expect(errors.some((e) => e.field === "email")).toBe(true);
  });

  it("rejects invalid email format when email channel is selected", () => {
    const errors = validateContact({
      notificationChannel: "email",
      email: "not-an-email",
      phone: "",
    });
    expect(errors.some((e) => e.field === "email")).toBe(true);
  });

  it("requires phone when SMS channel is selected", () => {
    const errors = validateContact({
      notificationChannel: "sms",
      email: "",
      phone: "",
    });
    expect(errors.some((e) => e.field === "phone")).toBe(true);
  });

  it("rejects invalid phone format when SMS channel is selected", () => {
    const errors = validateContact({
      notificationChannel: "sms",
      email: "",
      phone: "12345",
    });
    expect(errors.some((e) => e.field === "phone")).toBe(true);
  });

  it("does not require email when SMS channel is selected", () => {
    const errors = validateContact({
      notificationChannel: "sms",
      email: "",
      phone: "07700900000",
    });
    expect(errors.some((e) => e.field === "email")).toBe(false);
  });

  it("does not require phone when email channel is selected", () => {
    const errors = validateContact({
      notificationChannel: "email",
      email: "test@example.com",
      phone: "",
    });
    expect(errors.some((e) => e.field === "phone")).toBe(false);
  });

  it("does not validate email or phone when no channel is selected", () => {
    const errors = validateContact({
      notificationChannel: "",
      email: "",
      phone: "",
    });
    // Only the channel error should be present
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("notificationChannel");
  });
});
