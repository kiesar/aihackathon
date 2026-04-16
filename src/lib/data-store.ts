import fs from "fs";
import path from "path";
import {
  Case,
  User,
  WorkflowStateDefinition,
  PolicyExtract,
} from "@/types";

// ── File paths ──────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), "data");

const PATHS = {
  cases: path.join(DATA_DIR, "cases.json"),
  users: path.join(DATA_DIR, "users.json"),
  workflowStates: path.join(DATA_DIR, "workflow-states.json"),
  policyExtracts: path.join(DATA_DIR, "policy-extracts.json"),
} as const;

// ── Generic helpers ─────────────────────────────────────────

/**
 * Read and parse a JSON file. Returns the parsed value typed as T.
 * Throws if the file does not exist or contains invalid JSON.
 */
function readJsonFile<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

/**
 * Write data to a JSON file atomically.
 *
 * Writes to a temporary file in the same directory first, then renames
 * it over the target. This prevents corruption if the process is
 * interrupted mid-write.
 */
function writeJsonFile<T>(filePath: string, data: T): void {
  const json = JSON.stringify(data, null, 2) + "\n";
  const dir = path.dirname(filePath);
  const tmpPath = path.join(
    dir,
    `.tmp-${path.basename(filePath)}-${process.pid}-${Date.now()}`
  );

  fs.writeFileSync(tmpPath, json, "utf-8");

  try {
    fs.renameSync(tmpPath, filePath);
  } catch {
    // Clean up the temp file if rename fails
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    throw new Error(`Failed to atomically write ${filePath}`);
  }
}

// ── Cases ───────────────────────────────────────────────────

export function readCases(): Case[] {
  return readJsonFile<Case[]>(PATHS.cases);
}

export function writeCases(cases: Case[]): void {
  writeJsonFile(PATHS.cases, cases);
}

// ── Users ───────────────────────────────────────────────────

export function readUsers(): User[] {
  return readJsonFile<User[]>(PATHS.users);
}

export function writeUsers(users: User[]): void {
  writeJsonFile(PATHS.users, users);
}

// ── Workflow States ─────────────────────────────────────────

export function readWorkflowStates(): WorkflowStateDefinition[] {
  return readJsonFile<WorkflowStateDefinition[]>(PATHS.workflowStates);
}

export function writeWorkflowStates(states: WorkflowStateDefinition[]): void {
  writeJsonFile(PATHS.workflowStates, states);
}

// ── Policy Extracts ─────────────────────────────────────────

export function readPolicyExtracts(): PolicyExtract[] {
  return readJsonFile<PolicyExtract[]>(PATHS.policyExtracts);
}

export function writePolicyExtracts(extracts: PolicyExtract[]): void {
  writeJsonFile(PATHS.policyExtracts, extracts);
}
