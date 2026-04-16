// DSA Allowance Service — Core Data Models

// ── Case Types ──────────────────────────────────────────────

export type CaseType = "dsa_application" | "allowance_review" | "compliance_check";

export type WorkflowStateName =
  | "awaiting_evidence"
  | "evidence_requested"
  | "evidence_received"
  | "under_review"
  | "awaiting_assessment"
  | "approved"
  | "rejected"
  | "escalated"
  | "closed";

export type TimelineEventType =
  | "case_created"
  | "evidence_requested"
  | "evidence_received"
  | "state_transition"
  | "reminder_sent"
  | "escalated"
  | "reassigned"
  | "decision_made"
  | "notification_sent";

// ── Applicant ───────────────────────────────────────────────

export interface Address {
  line1: string;
  line2?: string;
  line3?: string;
  postcode: string;
}

export interface Applicant {
  name: string;
  forenames: string;
  surname: string;
  reference: string;
  date_of_birth: string;
  sex: "male" | "female" | "non-binary" | "prefer_not_to_say";
  address: Address;
  university: string;
  course: string;
  notification_channel: "email" | "sms";
  email?: string;
  phone?: string;
}

// ── Cost & Application Data ─────────────────────────────────

export interface CostItem {
  id: string;
  description: string;
  amount: number;
  supplier: string;
}

export interface ApplicationFormData {
  cost_items: CostItem[];
  total_amount: number;
  declaration_confirmed: boolean;
  submitted_at: string;
}

// ── Timeline ────────────────────────────────────────────────

export interface TimelineEntry {
  date: string;
  event: TimelineEventType;
  note: string;
  actor?: string;
}

// ── Case ────────────────────────────────────────────────────

export interface Case {
  case_id: string;
  case_type: CaseType;
  status: WorkflowStateName;
  applicant: Applicant;
  assigned_to: string;
  created_date: string;
  last_updated: string;
  timeline: TimelineEntry[];
  case_notes: string;
  application_data?: ApplicationFormData;
  evidence_requested_date?: string;
  decision_reason?: string;
}

// ── Workflow ────────────────────────────────────────────────

export interface WorkflowTransition {
  to_state: WorkflowStateName;
  display_label: string;
  requires_note: true;
  requires_decision_reason?: boolean;
}

export interface WorkflowStateDefinition {
  state_id: WorkflowStateName;
  display_name: string;
  applicable_case_types: CaseType[];
  required_action: string;
  allowed_transitions: WorkflowTransition[];
  escalation_threshold_days?: number;
}

// ── Policy ──────────────────────────────────────────────────

export interface PolicyExtract {
  policy_id: string;
  title: string;
  applicable_case_types: CaseType[];
  body: string;
  relevant_states?: WorkflowStateName[];
}

// ── User ────────────────────────────────────────────────────

export interface User {
  username: string;
  password_hash: string;
  role: "caseworker" | "team_leader";
  team: string;
  display_name: string;
}

// ── AI Summary ──────────────────────────────────────────────

export interface AISummaryRequest {
  caseId: string;
  caseType: CaseType;
  currentState: WorkflowStateName;
  applicantName: string;
  timelineSummary: string;
  caseNotes: string;
}

export interface AISummaryResponse {
  summary: string;
  outstandingEvidence: string[];
  recommendedAction: string;
  generatedAt: string;
  isAiGenerated: true;
}
