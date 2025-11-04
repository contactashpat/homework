import { NextResponse } from "next/server";
import { readAccessToken } from "../../../lib/auth/cookies";
import { verifyAccessToken } from "../../../lib/auth/token";

export async function GET() {
  try {
    const token = readAccessToken();
    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (payload.type !== "access" || !payload.sub) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: String(payload.sub),
        username: String(payload.username ?? ""),
        roles: Array.isArray(payload.roles) ? payload.roles : [],
      },
    });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
