import { describe, it, expect } from "vitest";
import { MockAISummaryService } from "./mock-ai-summary.service";
import { AISummaryRequest } from "./types";
import { CaseType, WorkflowStateName } from "../../types";

function makeRequest(
  caseType: CaseType = "dsa_application",
  currentState: WorkflowStateName = "awaiting_evidence"
): AISummaryRequest {
  return {
    caseId: "DSA-2026-00001",
    caseType,
    currentState,
    applicantName: "Jane Smith",
    timelineSummary: "Case created on 2026-01-15.",
    caseNotes: "Initial application received.",
  };
}

describe("MockAISummaryService", () => {
  const service = new MockAISummaryService();

  it("returns a summary for a known caseType + state combination", async () => {
    const response = await service.getSummary(makeRequest("dsa_application", "awaiting_evidence"));

    expect(response.summary).toBeTruthy();
    expect(response.outstandingEvidence).toBeInstanceOf(Array);
    expect(response.recommendedAction).toBeTruthy();
    expect(response.isAiGenerated).toBe(true);
    expect(response.generatedAt).toBeTruthy();
  });

  it("returns a valid ISO timestamp in generatedAt", async () => {
    const response = await service.getSummary(makeRequest());
    const parsed = new Date(response.generatedAt);
    expect(parsed.toISOString()).toBe(response.generatedAt);
  });

  it("always sets isAiGenerated to true", async () => {
    const response = await service.getSummary(makeRequest());
    expect(response.isAiGenerated).toBe(true);
  });

  it("returns a fallback summary for an unknown caseType + state combination", async () => {
    const response = await service.getSummary(
      makeRequest("compliance_check", "approved")
    );

    expect(response.summary).toBeTruthy();
    expect(response.recommendedAction).toBeTruthy();
    expect(response.isAiGenerated).toBe(true);
  });

  it("returns different summaries for different states of the same case type", async () => {
    const awaitingEvidence = await service.getSummary(
      makeRequest("dsa_application", "awaiting_evidence")
    );
    const underReview = await service.getSummary(
      makeRequest("dsa_application", "under_review")
    );

    expect(awaitingEvidence.summary).not.toBe(underReview.summary);
  });

  it("returns non-empty outstanding evidence for awaiting_evidence state", async () => {
    const response = await service.getSummary(
      makeRequest("dsa_application", "awaiting_evidence")
    );
    expect(response.outstandingEvidence.length).toBeGreaterThan(0);
  });

  it("returns empty outstanding evidence for approved state", async () => {
    const response = await service.getSummary(
      makeRequest("dsa_application", "approved")
    );
    expect(response.outstandingEvidence).toHaveLength(0);
  });
});
