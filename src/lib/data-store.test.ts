import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  readCases,
  writeCases,
  readUsers,
  writeUsers,
  readWorkflowStates,
  writeWorkflowStates,
  readPolicyExtracts,
  writePolicyExtracts,
} from "./data-store";
import type { Case, User, WorkflowStateDefinition, PolicyExtract } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");

// Back up original files before tests and restore after
const backups: Record<string, string> = {};
const files = ["cases.json", "users.json", "workflow-states.json", "policy-extracts.json"];

beforeEach(() => {
  for (const file of files) {
    const fp = path.join(DATA_DIR, file);
    if (fs.existsSync(fp)) {
      backups[file] = fs.readFileSync(fp, "utf-8");
    }
  }
});

afterEach(() => {
  for (const file of files) {
    const fp = path.join(DATA_DIR, file);
    if (backups[file] !== undefined) {
      fs.writeFileSync(fp, backups[file], "utf-8");
    }
  }
  // Clean up any leftover temp files
  const tmpFiles = fs.readdirSync(DATA_DIR).filter((f) => f.startsWith(".tmp-"));
  for (const f of tmpFiles) {
    fs.unlinkSync(path.join(DATA_DIR, f));
  }
});

describe("data-store", () => {
  describe("readCases / writeCases", () => {
    it("reads the seed cases file (empty array)", () => {
      const cases = readCases();
      expect(cases).toEqual([]);
    });

    it("round-trips a case array", () => {
      const testCase: Case = {
        case_id: "DSA-2025-00001",
        case_type: "dsa_application",
        status: "awaiting_evidence",
        applicant: {
          name: "Test User",
          forenames: "Test",
          surname: "User",
          reference: "",
          date_of_birth: "2000-01-15",
          sex: "male",
          address: { line1: "1 Test St", postcode: "SW1A 1AA" },
          university: "Test University",
          course: "Computer Science",
          notification_channel: "email",
          email: "test@example.com",
        },
        assigned_to: "jsmith",
        created_date: "2025-01-01T00:00:00.000Z",
        last_updated: "2025-01-01T00:00:00.000Z",
        timeline: [],
        case_notes: "",
      };

      writeCases([testCase]);
      const result = readCases();
      expect(result).toHaveLength(1);
      expect(result[0].case_id).toBe("DSA-2025-00001");
      expect(result[0].applicant.name).toBe("Test User");
    });
  });

  describe("readUsers / writeUsers", () => {
    it("reads the seed users file", () => {
      const users = readUsers();
      expect(users.length).toBeGreaterThan(0);
      expect(users[0]).toHaveProperty("username");
      expect(users[0]).toHaveProperty("password_hash");
      expect(users[0]).toHaveProperty("role");
    });

    it("round-trips a user array", () => {
      const original = readUsers();
      const newUser: User = {
        username: "testuser",
        password_hash: "$2b$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012",
        role: "caseworker",
        team: "team_b",
        display_name: "Test User",
      };
      writeUsers([...original, newUser]);
      const result = readUsers();
      expect(result).toHaveLength(original.length + 1);
      expect(result[result.length - 1].username).toBe("testuser");
    });
  });

  describe("readWorkflowStates / writeWorkflowStates", () => {
    it("reads the seed workflow states", () => {
      const states = readWorkflowStates();
      expect(states.length).toBeGreaterThan(0);
      const stateIds = states.map((s) => s.state_id);
      expect(stateIds).toContain("awaiting_evidence");
      expect(stateIds).toContain("approved");
      expect(stateIds).toContain("rejected");
    });

    it("each state has required fields", () => {
      const states = readWorkflowStates();
      for (const state of states) {
        expect(state).toHaveProperty("state_id");
        expect(state).toHaveProperty("display_name");
        expect(state).toHaveProperty("required_action");
        expect(state).toHaveProperty("allowed_transitions");
        expect(Array.isArray(state.allowed_transitions)).toBe(true);
      }
    });
  });

  describe("readPolicyExtracts / writePolicyExtracts", () => {
    it("reads the seed policy extracts", () => {
      const extracts = readPolicyExtracts();
      expect(extracts.length).toBeGreaterThan(0);
      expect(extracts[0]).toHaveProperty("policy_id");
      expect(extracts[0]).toHaveProperty("title");
      expect(extracts[0]).toHaveProperty("body");
    });

    it("round-trips a policy extract array", () => {
      const original = readPolicyExtracts();
      const newExtract: PolicyExtract = {
        policy_id: "POL-TEST-001",
        title: "Test Policy",
        applicable_case_types: ["dsa_application"],
        body: "This is a test policy.",
        relevant_states: ["under_review"],
      };
      writePolicyExtracts([...original, newExtract]);
      const result = readPolicyExtracts();
      expect(result).toHaveLength(original.length + 1);
      expect(result[result.length - 1].policy_id).toBe("POL-TEST-001");
    });
  });

  describe("atomic writes", () => {
    it("does not leave temp files after a successful write", () => {
      writeCases([]);
      const tmpFiles = fs.readdirSync(DATA_DIR).filter((f) => f.startsWith(".tmp-"));
      expect(tmpFiles).toHaveLength(0);
    });

    it("writes valid JSON that can be re-read", () => {
      writeCases([]);
      const raw = fs.readFileSync(path.join(DATA_DIR, "cases.json"), "utf-8");
      expect(() => JSON.parse(raw)).not.toThrow();
    });
  });
});
