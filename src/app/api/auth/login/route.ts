import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { readUsers } from "@/lib/data-store";
import { sessionOptions, SessionData } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    let body: { username?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        {
          error: "Enter a valid username and password",
        },
        { status: 401 }
      );
    }

    // Look up user by username
    const users = readUsers();
    const user = users.find((u) => u.username === username);

    if (!user) {
      // No indication of which field is wrong — GOV.UK guidance
      return NextResponse.json(
        {
          error: "Enter a valid username and password",
        },
        { status: 401 }
      );
    }

    // Compare password against bcrypt hash
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      return NextResponse.json(
        {
          error: "Enter a valid username and password",
        },
        { status: 401 }
      );
    }

    // Set encrypted session cookie
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    session.username = user.username;
    session.role = user.role;
    session.team = user.team;
    session.lastActivity = new Date().toISOString();

    await session.save();

    return NextResponse.json(
      {
        role: user.role,
        displayName: user.display_name,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Sorry, there is a problem with the service. Try again later." },
      { status: 500 }
    );
  }
}
