import { NextRequest, NextResponse } from "next/server";
import { readCases, writeCases } from "@/lib/data-store";
import { MockNotificationService } from "@/services/notifications";
import type {
  Case,
  Applicant,
  ApplicationFormData,
  CostItem,
  TimelineEntry,
} from "@/types";
import {
  validateRequired,
  validateDateOfBirth,
  validatePostcode,
  validateCostAmount,
  validateEmail,
  validateUkPhoneNumber,
} from "@/lib/validation";

// ── Case Reference Generation ───────────────────────────────

/**
 * Generate a unique case reference in format DSA-YYYY-NNNNN.
 * Reads existing cases to find the highest sequence number for the
 * current year, then increments by 1.
 */
export function generateCaseReference(existingCases: Case[]): string {
  const year = new Date().getFullYear();
  const prefix = `DSA-${year}-`;

  let maxSeq = 0;
  for (const c of existingCases) {
    if (c.case_id.startsWith(prefix)) {
      const seq = parseInt(c.case_id.slice(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(5, "0");
  return `${prefix}${nextSeq}`;
}

// ── Payload Validation ──────────────────────────────────────

interface SubmitPayload {
  personalDetails: {
    customerReference: string;
    forenames: string;
    surname: string;
    sex: string;
    dobDay: string;
    dobMonth: string;
    dobYear: string;
  };
  address: {
    line1: string;
    line2: string;
    line3: string;
    postcode: string;
  };
  university: {
    universityName: string;
    courseName: string;
  };
  contact: {
    notificationChannel: string;
    email: string;
    phone: string;
  };
  costs: Array<{
    id: string;
    description: string;
    amount: string;
    supplier: string;
  }>;
  declarationConfirmed?: boolean;
}

interface ValidationErrorItem {
  field: string;
  message: string;
}

export function validateSubmitPayload(
  data: SubmitPayload
): ValidationErrorItem[] {
  const errors: ValidationErrorItem[] = [];

  // Personal details
  const pd = data.personalDetails;
  if (!pd) {
    errors.push({ field: "personalDetails", message: "Personal details are required" });
    return errors;
  }

  const forenamesErr = validateRequired(pd.forenames, "forenames", "your forename(s)");
  if (forenamesErr) errors.push(forenamesErr);

  const surnameErr = validateRequired(pd.surname, "surname", "your surname");
  if (surnameErr) errors.push(surnameErr);

  const sexErr = validateRequired(pd.sex, "sex", "your sex");
  if (sexErr) errors.push(sexErr);

  const validSexValues = ["male", "female", "non-binary", "prefer_not_to_say", "Male", "Female", "Non-binary", "Prefer not to say"];
  if (pd.sex && !validSexValues.includes(pd.sex)) {
    errors.push({ field: "sex", message: "Select a valid option for sex" });
  }

  const dobStr = `${(pd.dobDay || "").padStart(2, "0")}/${(pd.dobMonth || "").padStart(2, "0")}/${pd.dobYear || ""}`;
  const dobErr = validateDateOfBirth(dobStr, "dateOfBirth");
  if (dobErr) errors.push(dobErr);

  // Address
  const addr = data.address;
  if (!addr) {
    errors.push({ field: "address", message: "Address is required" });
    return errors;
  }

  const line1Err = validateRequired(addr.line1, "line1", "address line 1");
  if (line1Err) errors.push(line1Err);

  const postcodeErr = validatePostcode(addr.postcode, "postcode");
  if (postcodeErr) errors.push(postcodeErr);

  // University
  const uni = data.university;
  if (!uni) {
    errors.push({ field: "university", message: "University details are required" });
    return errors;
  }

  const uniNameErr = validateRequired(uni.universityName, "universityName", "your university name");
  if (uniNameErr) errors.push(uniNameErr);

  const courseErr = validateRequired(uni.courseName, "courseName", "your course name");
  if (courseErr) errors.push(courseErr);

  // Contact
  const contact = data.contact;
  if (!contact) {
    errors.push({ field: "contact", message: "Contact details are required" });
    return errors;
  }

  if (!contact.notificationChannel || !["email", "sms"].includes(contact.notificationChannel)) {
    errors.push({ field: "notificationChannel", message: "Select a notification channel (email or sms)" });
  } else if (contact.notificationChannel === "email") {
    const emailErr = validateEmail(contact.email, "email");
    if (emailErr) errors.push(emailErr);
  } else if (contact.notificationChannel === "sms") {
    const phoneErr = validateUkPhoneNumber(contact.phone, "phone");
    if (phoneErr) errors.push(phoneErr);
  }

  // Costs
  if (!data.costs || !Array.isArray(data.costs) || data.costs.length === 0) {
    errors.push({ field: "costs", message: "You must add at least one cost item" });
  } else {
    if (data.costs.length > 10) {
      errors.push({ field: "costs", message: "You can add up to 10 cost items" });
    }
    for (let i = 0; i < data.costs.length; i++) {
      const item = data.costs[i];
      const descErr = validateRequired(item.description, `costs[${i}].description`, "a description");
      if (descErr) errors.push(descErr);

      const amtErr = validateCostAmount(item.amount, `costs[${i}].amount`);
      if (amtErr) errors.push(amtErr);

      const supErr = validateRequired(item.supplier, `costs[${i}].supplier`, "a supplier name");
      if (supErr) errors.push(supErr);
    }
  }

  // Declaration
  if (!data.declarationConfirmed) {
    errors.push({ field: "declarationConfirmed", message: "You must confirm the declaration before submitting" });
  }

  return errors;
}

// ── Sex value mapping ───────────────────────────────────────

function mapSex(value: string): "male" | "female" | "non-binary" | "prefer_not_to_say" {
  const map: Record<string, "male" | "female" | "non-binary" | "prefer_not_to_say"> = {
    "Male": "male",
    "Female": "female",
    "Non-binary": "non-binary",
    "Prefer not to say": "prefer_not_to_say",
    "male": "male",
    "female": "female",
    "non-binary": "non-binary",
    "prefer_not_to_say": "prefer_not_to_say",
  };
  return map[value] ?? "prefer_not_to_say";
}

// ── Route Handler ───────────────────────────────────────────

const DEFAULT_CASEWORKER = "jsmith";

export async function POST(request: NextRequest) {
  try {
    let body: SubmitPayload;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate
    const errors = validateSubmitPayload(body);
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    // Read existing cases
    const cases = readCases();

    // Generate unique case reference
    const caseReference = generateCaseReference(cases);
    const now = new Date().toISOString();

    // Build applicant
    const pd = body.personalDetails;
    const dobStr = `${pd.dobYear}-${pd.dobMonth.padStart(2, "0")}-${pd.dobDay.padStart(2, "0")}`;

    const applicant: Applicant = {
      name: `${pd.forenames} ${pd.surname}`,
      forenames: pd.forenames,
      surname: pd.surname,
      reference: pd.customerReference || "",
      date_of_birth: dobStr,
      sex: mapSex(pd.sex),
      address: {
        line1: body.address.line1,
        line2: body.address.line2 || undefined,
        line3: body.address.line3 || undefined,
        postcode: body.address.postcode,
      },
      university: body.university.universityName,
      course: body.university.courseName,
      notification_channel: body.contact.notificationChannel as "email" | "sms",
      email: body.contact.email || undefined,
      phone: body.contact.phone || undefined,
    };

    // Build cost items
    const costItems: CostItem[] = body.costs.map((c) => ({
      id: c.id,
      description: c.description,
      amount: parseFloat(c.amount),
      supplier: c.supplier,
    }));

    const totalAmount = costItems.reduce((sum, item) => sum + item.amount, 0);
    const roundedTotal = Math.round(totalAmount * 100) / 100;

    // Build application data
    const applicationData: ApplicationFormData = {
      cost_items: costItems,
      total_amount: roundedTotal,
      declaration_confirmed: true,
      submitted_at: now,
    };

    // Build initial timeline entry
    const timelineEntry: TimelineEntry = {
      date: now,
      event: "case_created",
      note: "Application submitted by applicant",
    };

    // Build case record
    const newCase: Case = {
      case_id: caseReference,
      case_type: "dsa_application",
      status: "awaiting_evidence",
      applicant,
      assigned_to: DEFAULT_CASEWORKER,
      created_date: now,
      last_updated: now,
      timeline: [timelineEntry],
      case_notes: "",
      application_data: applicationData,
    };

    // Persist
    cases.push(newCase);
    writeCases(cases);

    // Send confirmation notification
    const notificationService = new MockNotificationService();
    await notificationService.sendConfirmation(applicant, caseReference);

    return NextResponse.json({ caseReference }, { status: 201 });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "Sorry, there is a problem with the service. Try again later." },
      { status: 500 }
    );
  }
}
