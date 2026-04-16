import { NextRequest, NextResponse } from "next/server";
import { readCases } from "@/lib/data-store";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface ChatRequest {
  message: string;
  history: ChatMessage[];
  sessionData?: Record<string, string>;
}

interface ChatResponse {
  reply: string;
  action?: "collect_field" | "confirm_submit" | "submitted" | "status_result" | "none";
  field?: string;
  sessionData?: Record<string, string>;
}

const STATUS_DISPLAY: Record<string, string> = {
  awaiting_evidence: "Awaiting evidence",
  evidence_requested: "Evidence requested",
  evidence_received: "Evidence received",
  under_review: "Under review",
  awaiting_assessment: "Awaiting assessment",
  approved: "Approved",
  rejected: "Rejected",
  escalated: "Escalated",
  closed: "Closed",
};

// Application fields in order
const FIELDS = [
  { key: "forenames", prompt: "What is your first name (forename)?", label: "Forename(s)" },
  { key: "surname", prompt: "What is your surname?", label: "Surname" },
  { key: "sex", prompt: "What is your sex? (Male, Female, Non-binary, or Prefer not to say)", label: "Sex" },
  { key: "dobDay", prompt: "What day were you born? (e.g. 15)", label: "Day of birth" },
  { key: "dobMonth", prompt: "What month were you born? (e.g. 06 or June)", label: "Month of birth" },
  { key: "dobYear", prompt: "What year were you born? (e.g. 2000)", label: "Year of birth" },
  { key: "addressLine1", prompt: "What is the first line of your address?", label: "Address line 1" },
  { key: "postcode", prompt: "What is your postcode?", label: "Postcode" },
  { key: "university", prompt: "What university do you attend?", label: "University" },
  { key: "course", prompt: "What course are you studying?", label: "Course" },
  { key: "contactMethod", prompt: "How would you like to be contacted — email or SMS?", label: "Contact method" },
  { key: "contactDetail", prompt: "", label: "Contact detail" }, // prompt set dynamically
  { key: "costDescription", prompt: "Describe the disability-related cost you need support with (e.g. 'Laptop with assistive software'):", label: "Cost description" },
  { key: "costAmount", prompt: "How much does it cost in pounds? (e.g. 999.99)", label: "Cost amount" },
  { key: "costSupplier", prompt: "Who is the supplier? (e.g. Dell Technologies)", label: "Supplier" },
  { key: "confirm", prompt: "", label: "Confirmation" }, // prompt set dynamically
];

function monthNameToNumber(m: string): string {
  const map: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04",
    may: "05", june: "06", july: "07", august: "08",
    september: "09", october: "10", november: "11", december: "12",
    jan: "01", feb: "02", mar: "03", apr: "04",
    jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  return map[m.toLowerCase()] || m;
}

function detectIntent(message: string): "apply" | "status" | "help" | "unknown" {
  const lower = message.toLowerCase();
  if (lower.includes("status") || lower.includes("check") || lower.includes("track") || lower.includes("reference") || lower.match(/dsa-\d{4}-\d{5}/i)) {
    return "status";
  }
  if (lower.includes("apply") || lower.includes("application") || lower.includes("start") || lower.includes("new") || lower.includes("submit") || lower.includes("dsa")) {
    return "apply";
  }
  if (lower.includes("help") || lower.includes("what") || lower.includes("how") || lower.includes("eligible")) {
    return "help";
  }
  return "unknown";
}

function lookupStatus(ref: string): string {
  const cases = readCases();
  const found = cases.find((c) => c.case_id === ref);
  if (!found) {
    return `I couldn't find an application with reference **${ref}**. Please check the reference number and try again. It should look like DSA-2026-00001.`;
  }
  const status = STATUS_DISPLAY[found.status] || found.status;
  const updated = new Date(found.last_updated).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  let reply = `📋 **Case ${ref}**\n\n- **Status:** ${status}\n- **Last updated:** ${updated}`;
  if (found.status === "approved" || found.status === "rejected") {
    reply += `\n- **Decision:** ${found.decision_reason || "No reason recorded"}`;
  }
  if (found.status === "awaiting_evidence" || found.status === "evidence_requested") {
    reply += `\n\nYou can upload evidence at: [Upload evidence](/apply/evidence?ref=${ref})`;
  }
  return reply;
}

function getNextField(session: Record<string, string>): typeof FIELDS[number] | null {
  for (const f of FIELDS) {
    if (!session[f.key]) return f;
  }
  return null;
}

function buildSummary(session: Record<string, string>): string {
  return `Here's a summary of your application:\n\n` +
    `- **Name:** ${session.forenames} ${session.surname}\n` +
    `- **Sex:** ${session.sex}\n` +
    `- **Date of birth:** ${session.dobDay}/${session.dobMonth}/${session.dobYear}\n` +
    `- **Address:** ${session.addressLine1}, ${session.postcode}\n` +
    `- **University:** ${session.university}\n` +
    `- **Course:** ${session.course}\n` +
    `- **Contact:** ${session.contactMethod} — ${session.contactDetail}\n` +
    `- **Cost:** ${session.costDescription} — £${session.costAmount} from ${session.costSupplier}\n\n` +
    `Does everything look correct? Type **yes** to submit or **no** to start over.`;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, sessionData } = body;
    const session = { ...sessionData } || {};
    const trimmed = message.trim();

    // If we're in the middle of an application flow
    if (session._flow === "apply") {
      // Handle confirmation
      if (session._awaitingConfirm === "true") {
        if (trimmed.toLowerCase() === "yes" || trimmed.toLowerCase() === "y") {
          // Submit the application
          try {
            const submitPayload = {
              personalDetails: {
                customerReference: "",
                forenames: session.forenames,
                surname: session.surname,
                sex: session.sex,
                dobDay: session.dobDay,
                dobMonth: session.dobMonth,
                dobYear: session.dobYear,
              },
              address: {
                line1: session.addressLine1,
                line2: "",
                line3: "",
                postcode: session.postcode,
              },
              university: {
                universityName: session.university,
                courseName: session.course,
              },
              contact: {
                notificationChannel: session.contactMethod,
                email: session.contactMethod === "email" ? session.contactDetail : "",
                phone: session.contactMethod === "sms" ? session.contactDetail : "",
              },
              costs: [{
                id: "chat-1",
                description: session.costDescription,
                amount: session.costAmount,
                supplier: session.costSupplier,
              }],
              declarationConfirmed: true,
            };

            const origin = request.nextUrl.origin;
            const res = await fetch(`${origin}/api/submit`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(submitPayload),
            });

            if (res.status === 201) {
              const data = await res.json();
              return NextResponse.json({
                reply: `✅ **Application submitted successfully!**\n\nYour case reference is: **${data.caseReference}**\n\nKeep this reference safe — you can use it to check your application status at any time.\n\nIs there anything else I can help with?`,
                action: "submitted",
                sessionData: {},
              });
            } else {
              const err = await res.json();
              const errMsg = err.errors ? err.errors.map((e: { message: string }) => e.message).join(", ") : "Unknown error";
              return NextResponse.json({
                reply: `Sorry, there was a problem submitting your application: ${errMsg}. Would you like to try again?`,
                action: "none",
                sessionData: {},
              });
            }
          } catch {
            return NextResponse.json({
              reply: "Sorry, something went wrong while submitting. Please try again or use the [online form](/apply/personal-details) instead.",
              action: "none",
              sessionData: {},
            });
          }
        } else {
          return NextResponse.json({
            reply: "No problem — let's start over. What would you like to do? You can **apply** for DSA or **check the status** of an existing application.",
            action: "none",
            sessionData: {},
          });
        }
      }

      // Collect the current field
      const nextField = getNextField(session);
      if (nextField) {
        // Handle contactDetail dynamically
        if (nextField.key === "contactDetail" && !session.contactDetail) {
          session[nextField.key] = trimmed;
        } else if (nextField.key === "confirm") {
          // We shouldn't get here — confirm is handled above
        } else {
          // Store the answer
          let value = trimmed;
          if (nextField.key === "dobMonth") {
            value = monthNameToNumber(trimmed);
          }
          if (nextField.key === "contactMethod") {
            value = trimmed.toLowerCase().includes("sms") || trimmed.toLowerCase().includes("text") ? "sms" : "email";
          }
          session[nextField.key] = value;
        }

        // Get the next field after storing
        const next = getNextField(session);
        if (!next) {
          // All fields collected — show summary
          session._awaitingConfirm = "true";
          return NextResponse.json({
            reply: buildSummary(session),
            action: "confirm_submit",
            sessionData: session,
          });
        }

        // Dynamic prompt for contactDetail
        let prompt = next.prompt;
        if (next.key === "contactDetail") {
          prompt = session.contactMethod === "sms"
            ? "What is your UK mobile phone number?"
            : "What is your email address?";
        }

        return NextResponse.json({
          reply: prompt,
          action: "collect_field",
          field: next.key,
          sessionData: session,
        });
      }
    }

    // If we're in status check flow
    if (session._flow === "status") {
      const refMatch = trimmed.match(/DSA-\d{4}-\d{5}/i);
      if (refMatch) {
        const result = lookupStatus(refMatch[0].toUpperCase());
        return NextResponse.json({
          reply: result + "\n\nIs there anything else I can help with?",
          action: "status_result",
          sessionData: {},
        });
      } else {
        return NextResponse.json({
          reply: "That doesn't look like a valid case reference. It should be in the format **DSA-2026-00001**. Please try again:",
          action: "collect_field",
          field: "caseReference",
          sessionData: session,
        });
      }
    }

    // Check for direct case reference in message
    const refMatch = trimmed.match(/DSA-\d{4}-\d{5}/i);
    if (refMatch) {
      const result = lookupStatus(refMatch[0].toUpperCase());
      return NextResponse.json({
        reply: result + "\n\nIs there anything else I can help with?",
        action: "status_result",
        sessionData: {},
      });
    }

    // Detect intent
    const intent = detectIntent(trimmed);

    if (intent === "apply") {
      const newSession: Record<string, string> = { _flow: "apply" };
      return NextResponse.json({
        reply: "Great, let's start your DSA application! I'll ask you a few questions.\n\n" + FIELDS[0].prompt,
        action: "collect_field",
        field: FIELDS[0].key,
        sessionData: newSession,
      });
    }

    if (intent === "status") {
      return NextResponse.json({
        reply: "Sure! Please enter your case reference number (e.g. **DSA-2026-00001**):",
        action: "collect_field",
        field: "caseReference",
        sessionData: { _flow: "status" },
      });
    }

    if (intent === "help") {
      return NextResponse.json({
        reply: "I can help you with:\n\n" +
          "🆕 **Apply for DSA** — I'll guide you through the application step by step\n" +
          "🔍 **Check application status** — look up your case using your reference number\n" +
          "❓ **DSA information** — Disabled Students Allowance helps with extra costs you have because of a disability. It can pay for things like specialist equipment, a note-taker, or mentoring support.\n\n" +
          "What would you like to do?",
        action: "none",
        sessionData: {},
      });
    }

    // Default greeting
    return NextResponse.json({
      reply: "👋 Hi! I'm the DSA Assistant. I can help you:\n\n" +
        "🆕 **Apply** for Disabled Students Allowance\n" +
        "🔍 **Check the status** of an existing application\n" +
        "❓ Get **help** and information about DSA\n\n" +
        "What would you like to do?",
      action: "none",
      sessionData: {},
    });
  } catch {
    return NextResponse.json({
      reply: "Sorry, something went wrong. Please try again.",
      action: "none",
      sessionData: {},
    }, { status: 500 });
  }
}