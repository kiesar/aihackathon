import { describe, it, expect } from "vitest";
import { sessionOptions, SESSION_TIMEOUT_MS } from "./session";

describe("session config", () => {
  it("has a cookie name", () => {
    expect(sessionOptions.cookieName).toBe("dsa_session");
  });

  it("has a password of at least 32 characters", () => {
    expect(typeof sessionOptions.password).toBe("string");
    expect((sessionOptions.password as string).length).toBeGreaterThanOrEqual(32);
  });

  it("sets httpOnly on the cookie", () => {
    expect(sessionOptions.cookieOptions?.httpOnly).toBe(true);
  });

  it("sets sameSite to lax", () => {
    expect(sessionOptions.cookieOptions?.sameSite).toBe("lax");
  });

  it("defines an 8-hour timeout in milliseconds", () => {
    expect(SESSION_TIMEOUT_MS).toBe(8 * 60 * 60 * 1000);
  });
});
