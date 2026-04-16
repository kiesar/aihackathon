import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { readUsers } from "@/lib/data-store";
import { sessionOptions, SessionData } from "@/lib/session";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.username) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const users = readUsers();
    const teamMembers = users
      .filter((u) => u.team === session.team)
      .map((u) => ({
        username: u.username,
        display_name: u.display_name,
        role: u.role,
      }));

    return NextResponse.json({ members: teamMembers });
  } catch (error) {
    console.error("Team members error:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}
