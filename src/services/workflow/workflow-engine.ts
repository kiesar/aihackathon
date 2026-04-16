import {
  Case,
  WorkflowStateName,
  WorkflowTransition,
  TimelineEntry,
} from "@/types";
import { readWorkflowStates, readCases, writeCases } from "@/lib/data-store";

export interface WorkflowEngine {
  getPermittedTransitions(currentState: WorkflowStateName): WorkflowTransition[];
  applyTransition(
    caseId: string,
    toState: WorkflowStateName,
    note: string,
    caseworkerId: string,
    decisionReason?: string
  ): Promise<Case>;
}

export class WorkflowEngineError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "WorkflowEngineError";
    this.statusCode = statusCode;
  }
}

export function createWorkflowEngine(): WorkflowEngine {
  return {
    getPermittedTransitions(currentState: WorkflowStateName): WorkflowTransition[] {
      const states = readWorkflowStates();
      const stateDef = states.find((s) => s.state_id === currentState);
      if (!stateDef) {
        return [];
      }
      return stateDef.allowed_transitions;
    },

    async applyTransition(
      caseId: string,
      toState: WorkflowStateName,
      note: string,
      caseworkerId: string,
      decisionReason?: string
    ): Promise<Case> {
      const cases = readCases();
      const caseIndex = cases.findIndex((c) => c.case_id === caseId);

      if (caseIndex === -1) {
        throw new WorkflowEngineError(`Case not found: ${caseId}`, 404);
      }

      const caseRecord = cases[caseIndex];

      // Validate the transition is permitted
      const permitted = this.getPermittedTransitions(caseRecord.status);
      const transition = permitted.find((t) => t.to_state === toState);

      if (!transition) {
        throw new WorkflowEngineError(
          `Transition from '${caseRecord.status}' to '${toState}' is not permitted.`
        );
      }

      // Require decisionReason for approved/rejected
      if (
        (toState === "approved" || toState === "rejected") &&
        !decisionReason
      ) {
        throw new WorkflowEngineError(
          `A decision reason is required when transitioning to '${toState}'.`
        );
      }

      // Build timeline entry
      const now = new Date().toISOString();
      const timelineEntry: TimelineEntry = {
        date: now,
        event:
          toState === "approved" || toState === "rejected"
            ? "decision_made"
            : "state_transition",
        note,
        actor: caseworkerId,
      };

      // Update the case
      caseRecord.status = toState;
      caseRecord.last_updated = now;
      caseRecord.timeline.push(timelineEntry);

      if (decisionReason) {
        caseRecord.decision_reason = decisionReason;
      }

      cases[caseIndex] = caseRecord;
      writeCases(cases);

      return caseRecord;
    },
  };
}
