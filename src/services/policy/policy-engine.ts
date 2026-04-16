import { CaseType, PolicyExtract, WorkflowStateName } from "@/types";
import { readPolicyExtracts } from "@/lib/data-store";

export interface PolicyEngine {
  getPoliciesForCase(caseType: CaseType): PolicyExtract[];
  getRelevantClauses(
    caseType: CaseType,
    currentState: WorkflowStateName
  ): PolicyExtract[];
}

export function createPolicyEngine(): PolicyEngine {
  return {
    getPoliciesForCase(caseType: CaseType): PolicyExtract[] {
      const extracts = readPolicyExtracts();
      return extracts.filter((p) =>
        p.applicable_case_types.includes(caseType)
      );
    },

    getRelevantClauses(
      caseType: CaseType,
      currentState: WorkflowStateName
    ): PolicyExtract[] {
      const extracts = readPolicyExtracts();
      return extracts.filter(
        (p) =>
          p.applicable_case_types.includes(caseType) &&
          p.relevant_states != null &&
          p.relevant_states.includes(currentState)
      );
    },
  };
}
