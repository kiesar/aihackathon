import type { SessionOptions } from "iron-session";

/**
 * Session payload stored in the encrypted iron-session cookie.
 */
export interface SessionData {
  username: string;
  role: "caseworker" | "team_leader";
  team: string;
  lastActivity: string; // ISO timestamp
}

/**
 * iron-session configuration.
 *
 * The password must be at least 32 characters. In production this
 * would come from an environment variable; for the hackathon
 * prototype a hard-coded value is acceptable.
 */
export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ??
    "dsa-allowance-service-secret-key-at-least-32-chars!",
  cookieName: "dsa_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  },
};

/**
 * 8-hour session timeout in milliseconds.
 */
export const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000;
