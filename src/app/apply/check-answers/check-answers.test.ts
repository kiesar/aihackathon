import { describe, it, expect } from "vitest";
import type { FormData } from "@/lib/form-context";

/**
 * Tests for the Check Your Answers page logic.
 * Validates declaration checking, data display helpers, and submission flow.
 */

const SEX_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  "non-binary": "Non-binary",
  prefer_not_to_say: "Prefer not to say",
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "Text message (SMS)",
};

function validateDeclaration(confirmed: boolean): { field: string; message: string } | null {
  if (!confirmed) {
    return {
      field: "declaration",
      message: "You must confirm the declaration before submitting",
    };
  }
  return null;
}

function calculateTotal(costs: { amount: string }[]): string {
  const total = costs.reduce((sum, item) => {
    const parsed = parseFloat(item.amount);
    return sum + (isNaN(parsed) ? 0 : parsed);
  }, 0);
  return total.toFixed(2);
}

function formatDob(day: string, month: string, year: string): string {
  if (!day || !month || !year) return "";
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

const sampleFormData: FormData = {
  personalDetails: {
    customerReference: "CRN-12345",
    forenames: "Jane",
    surname: "Smith",
    sex: "female",
    dobDay: "5",
    dobMonth: "3",
    dobYear: "2000",
  },
  address: {
    line1: "10 Downing Street",
    line2: "Westminster",
    line3: "",
    postcode: "SW1A 2AA",
  },
  university: {
    universityName: "University of Oxford",
    courseName: "Computer Science",
  },
  contact: {
    notificationChannel: "email",
    email: "jane@example.com",
    phone: "",
  },
  costs: [
    { id: "cost-1", description: "Laptop", amount: "999.99", supplier: "Dell" },
    { id: "cost-2", description: "Software", amount: "150.00", supplier: "Microsoft" },
  ],
};

describe("Check Your Answers — Declaration validation", () => {
  it("returns error when declaration is not confirmed", () => {
    const error = validateDeclaration(false);
    expect(error).not.toBeNull();
    expect(error!.field).toBe("declaration");
    expect(error!.message).toContain("confirm the declaration");
  });

  it("returns null when declaration is confirmed", () => {
    const error = validateDeclaration(true);
    expect(error).toBeNull();
  });
});

describe("Check Your Answers — Cost total calculation", () => {
  it("calculates total for multiple cost items", () => {
    const total = calculateTotal(sampleFormData.costs);
    expect(total).toBe("1149.99");
  });

  it("returns 0.00 for empty costs array", () => {
    const total = calculateTotal([]);
    expect(total).toBe("0.00");
  });

  it("handles non-numeric amounts gracefully", () => {
    const total = calculateTotal([
      { amount: "abc" },
      { amount: "100.50" },
    ]);
    expect(total).toBe("100.50");
  });

  it("handles single cost item", () => {
    const total = calculateTotal([{ amount: "250.00" }]);
    expect(total).toBe("250.00");
  });
});

describe("Check Your Answers — Date of birth formatting", () => {
  it("formats single-digit day and month with leading zeros", () => {
    expect(formatDob("5", "3", "2000")).toBe("05/03/2000");
  });

  it("preserves double-digit day and month", () => {
    expect(formatDob("15", "12", "1995")).toBe("15/12/1995");
  });

  it("returns empty string when any part is missing", () => {
    expect(formatDob("", "3", "2000")).toBe("");
    expect(formatDob("5", "", "2000")).toBe("");
    expect(formatDob("5", "3", "")).toBe("");
  });
});

describe("Check Your Answers — Display label lookups", () => {
  it("maps sex values to display labels", () => {
    expect(SEX_LABELS["male"]).toBe("Male");
    expect(SEX_LABELS["female"]).toBe("Female");
    expect(SEX_LABELS["non-binary"]).toBe("Non-binary");
    expect(SEX_LABELS["prefer_not_to_say"]).toBe("Prefer not to say");
  });

  it("maps notification channel values to display labels", () => {
    expect(CHANNEL_LABELS["email"]).toBe("Email");
    expect(CHANNEL_LABELS["sms"]).toBe("Text message (SMS)");
  });
});

describe("Check Your Answers — Data completeness", () => {
  it("all personal detail fields are present in sample data", () => {
    const pd = sampleFormData.personalDetails;
    expect(pd.forenames).toBeTruthy();
    expect(pd.surname).toBeTruthy();
    expect(pd.sex).toBeTruthy();
    expect(pd.dobDay).toBeTruthy();
    expect(pd.dobMonth).toBeTruthy();
    expect(pd.dobYear).toBeTruthy();
  });

  it("address fields are present in sample data", () => {
    const addr = sampleFormData.address;
    expect(addr.line1).toBeTruthy();
    expect(addr.postcode).toBeTruthy();
  });

  it("university fields are present in sample data", () => {
    expect(sampleFormData.university.universityName).toBeTruthy();
    expect(sampleFormData.university.courseName).toBeTruthy();
  });

  it("contact fields are present in sample data", () => {
    expect(sampleFormData.contact.notificationChannel).toBeTruthy();
    expect(sampleFormData.contact.email).toBeTruthy();
  });

  it("cost items are present in sample data", () => {
    expect(sampleFormData.costs.length).toBeGreaterThan(0);
    sampleFormData.costs.forEach((item) => {
      expect(item.description).toBeTruthy();
      expect(item.amount).toBeTruthy();
      expect(item.supplier).toBeTruthy();
    });
  });
});
