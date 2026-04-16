import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData, SESSION_TIMEOUT_MS } from "@/lib/session";

/**
 * Next.js middleware that protects all /dashboard routes (except /dashboard/login).
 *
 * On every matching request it:
 * 1. Reads the encrypted session cookie
 * 2. Checks whether `lastActivity` is within the 8-hour timeout
 * 3. If expired or missing → clears session, redirects to login with ?reason=session_expired
 * 4. If valid → updates `lastActivity` and continues
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Don't protect the login page itself or auth API routes
  if (
    pathname === "/dashboard/login" ||
    pathname.startsWith("/api/auth/")
  ) {
    return NextResponse.next();
  }

  // Build a mutable response so we can update the session cookie
  const response = NextResponse.next();

  try {
    const session = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions
    );

    // No session at all → redirect to login
    if (!session.username) {
      const loginUrl = new URL("/dashboard/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Check 8-hour inactivity timeout
    const lastActivity = new Date(session.lastActivity).getTime();
    const now = Date.now();

    if (now - lastActivity > SESSION_TIMEOUT_MS) {
      // Session expired — destroy and redirect
      session.destroy();
      const loginUrl = new URL(
        "/dashboard/login?reason=session_expired",
        request.url
      );
      return NextResponse.redirect(loginUrl);
    }

    // Session is valid — update lastActivity
    session.lastActivity = new Date().toISOString();
    await session.save();

    return response;
  } catch (error) {
    console.error("Middleware session error:", error);
    // On any session error, redirect to login
    const loginUrl = new URL("/dashboard/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
}

/**
 * Only run middleware on /dashboard routes (excluding /dashboard/login
 * which is handled above) and /api/dashboard routes.
 */
export const config = {
  matcher: ["/dashboard/:path*", "/api/dashboard/:path*"],
};
