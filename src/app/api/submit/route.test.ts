import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateCaseReference,
  validateSubmitPayload,
} from "./route";
import type { Case } from "@/types";

// ── generateCaseReference ───────────────────────────────────

describe("generateCaseReference", () => {
  it("returns DSA-YYYY-00001 when no existing cases", () => {
    const ref = generateCaseReference([]);
    const year = new Date().getFullYear();
    expect(ref).toBe(`DSA-${year}-00001`);
  });

  it("increments from the highest existing sequence number", () => {
    const year = new Date().getFullYear();
    const cases = [
      { case_id: `DSA-${year}-00003` },
      { case_id: `DSA-${year}-00001` },
    ] as Case[];
    const ref = generateCaseReference(cases);
    expect(ref).toBe(`DSA-${year}-00004`);
  });

  it("ignores cases from a different year", () => {
    const year = new Date().getFullYear();
    const cases = [
      { case_id: `DSA-${year - 1}-00099` },
    ] as Case[];
    const ref = generateCaseReference(cases);
    expect(ref).toBe(`DSA-${year}-00001`);
  });

  it("pads the sequence number to 5 digits", () => {
    const year = new Date().getFullYear();
    const cases = [{ case_id: `DSA-${year}-00009` }] as Case[];
    const ref = generateCaseReference(cases);
    expect(ref).toBe(`DSA-${year}-00010`);
  });
});

// ── validateSubmitPayload ───────────────────────────────────

function validPayload() {
  return {
    personalDetails: {
      customerReference: "CRN123",
      forenames: "John",
      surname: "Doe",
      sex: "Male",
      dobDay: "15",
      dobMonth: "06",
      dobYear: "2000",
    },
    address: {
      line1: "10 Downing Street",
      line2: "",
      line3: "",
      postcode: "SW1A 2AA",
    },
    university: {
      universityName: "University of Testing",
      courseName: "BSc Computer Science",
    },
    contact: {
      notificationChannel: "email",
      email: "john@example.com",
      phone: "",
    },
    costs: [
      { id: "1", description: "Laptop", amount: "999.99", supplier: "Tech Co" },
    ],
    declarationConfirmed: true,
  };
}

describe("validateSubmitPayload", () => {
  it("returns no errors for a valid payload", () => {
    const errors = validateSubmitPayload(validPayload());
    expect(errors).toEqual([]);
  });

  it("returns error when forenames is missing", () => {
    const payload = validPayload();
    payload.personalDetails.forenames = "";
    const errors = validateSubmitPayload(payload);
    expect(errors.some((e) => e.field === "forenames")).toBe(true);
  });

  it("returns error when surname is missing", () => {
    const payload = validPayload();
    payload.personalDetails.surname = "";
    const errors = validateSubmitPayload(payload);
    expect(errors.some((e) => e.field === "surname")).toBe(true);
  });

  it("returns error for invalid sex value", () => {
    const payload = validPayload();
    payload.personalDetails.sex = "invalid";
    const errors = validateSubmitPayload(payload);
    expect(errors.some((e) => e.field === "sex")).toBe(true);
  });

  it("returns error for invalid date of birth", () => {
    const payload = validPayload();
    payload.personalDetails.dobDay = "32";
    const errors = validateSubmitPayload(payload);
    expect(errors.some((e) => e.field === "dateOfBirth")).toBe(true);
  });

  it("returns error when address line 1 is missing", () => {
    const payload = validPayload();
    payload.address.line1 = "";
    const errors = validateSubmitPayload(payload);
    expect(errors.some((e) => e.field === "line1")).toBe(true);
  });

  it("returns error for invalid postcode", () => {
    const payload = validPayload();
    payload.address.postcode = "INVALID";
    const errors = validateSubmitPayload(payload);
    expect(errors.some((e) => e.field === "postcode")).toBe(true);
  });

  it("returns error when university name is missing", () => {
    const payload = validPayload();
    payload.university.universityName = "";
    const errors = validateSubmitPayload(payload);
    expect(errors.some((e) => e.field === "universityName")).toBe(true);
  });

  it("returns error when notification channel is invalid", () => {
    const payload = validPayload();
    payload.contact.notificationChannel = "pigeon";
    const errors = validateSubmitPayload(payload);
    expect(errors.some((e) => e.field === "notificationChannel")).toBe(true);
  });

  it("returns error when email channel selected but email missing", () => {
    const payload = validPayload();
    payload.contact.notificationChannel = "email";
    payload.contact.email = "";
    const errors = validateSubmitPayload(payload);
    expect(errors.some((e) => e.field === "email")).toBe(true);
  });

  it("returns error when sms channel selected but phone missing", () => {
    const payload = validPayload();
    payload.contact.notificationChannel = "sms";
    payload.contact.phone = "";
    const errors = validateSubmitPayload(payload);
    expect(errors.some((e) => e.field === "phone")).toBe(true);
  });

  it("returns error when no cost items provided", () => {
    const payload = validPayload();
    payload.costs = [];
    const errors = validateSubmitPayload(payload);
    expect(errors.some((e) => e.field === "costs")).toBe(true);
  });

  it("returns error when cost amount is invalid", () => {
    const payload = validPayload();
    payload.costs[0].amount = "-5";
    const errors = validateSubmitPayload(payload);
    expect(errors.some((e) => e.field.includes("amount"))).toBe(true);
  });

  it("returns error when declaration not confirmed", () => {
    const payload = validPayload();
    payload.declarationConfirmed = false;
    const errors = validateSubmitPayload(payload);
    expect(errors.some((e) => e.field === "declarationConfirmed")).toBe(true);
  });

  it("returns error when more than 10 cost items", () => {
    const payload = validPayload();
    payload.costs = Array.from({ length: 11 }, (_, i) => ({
      id: String(i),
      description: `Item ${i}`,
      amount: "10.00",
      supplier: `Supplier ${i}`,
    }));
    const errors = validateSubmitPayload(payload);
    expect(errors.some((e) => e.field === "costs" && e.message.includes("10"))).toBe(true);
  });
});
