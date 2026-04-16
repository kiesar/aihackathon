import { describe, expect } from "vitest";
import { it, fc } from "@fast-check/vitest";
import bcrypt from "bcrypt";
import { readUsers } from "./data-store";

// ── Arbitraries ─────────────────────────────────────────────

/** Generate arbitrary password strings (printable ASCII, reasonable length) */
const arbPassword = fc.string({ minLength: 1, maxLength: 72 });

/** Low cost factor for property testing (bcrypt cost 12 is too slow for 100 iterations) */
const TEST_SALT_ROUNDS = 4;

// ── Tests ───────────────────────────────────────────────────

describe("Password Storage — Property Tests", () => {
  // Feature: dsa-allowance-service, Property 28: Passwords are not stored in plain text
  // **Validates: Requirements 11.5**
  describe("Property 28: Passwords are not stored in plain text", () => {
    it.prop([arbPassword], { numRuns: 100 })(
      "hashed password is never equal to the plain text and is a valid bcrypt hash",
      async (password) => {
        // Use a low cost factor for speed; the bcrypt algorithm is identical regardless of rounds
        const hash = await bcrypt.hash(password, TEST_SALT_ROUNDS);

        // The stored hash must not equal the plain text
        expect(hash).not.toBe(password);

        // The hash must be a valid bcrypt hash (starts with $2b$ or $2a$)
        expect(hash).toMatch(/^\$2[ab]\$/);

        // bcrypt.compare should verify the password against the hash
        const matches = await bcrypt.compare(password, hash);
        expect(matches).toBe(true);
      }
    );

    it("all users in users.json have valid bcrypt hashes, not plain text", () => {
      const users = readUsers();
      expect(users.length).toBeGreaterThan(0);

      for (const user of users) {
        // password_hash must not be empty
        expect(user.password_hash).toBeTruthy();

        // password_hash must be a valid bcrypt hash
        expect(user.password_hash).toMatch(/^\$2[ab]\$/);

        // password_hash must not look like a plain text password
        // (bcrypt hashes are always 60 chars and start with $2b$ or $2a$)
        expect(user.password_hash.length).toBe(60);

        // Ensure the hash is not equal to the username (a naive plain-text check)
        expect(user.password_hash).not.toBe(user.username);
      }
    });
  });
});
