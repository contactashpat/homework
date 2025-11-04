import { NextResponse } from "next/server";
import { buildInternalApiUrl } from "../../../../lib/internalApi";
import { setAuthCookies, clearAuthCookies } from "../../../../lib/auth/cookies";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };

  if (typeof body.username !== "string" || typeof body.password !== "string") {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 },
    );
  }

  const backendResponse = await fetch(buildInternalApiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await backendResponse.json().catch(() => ({}));

  if (!backendResponse.ok) {
    const response = NextResponse.json(
      { error: data?.error ?? "Authentication failed" },
      { status: backendResponse.status },
    );
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.json({
    user: data.user,
  });

  setAuthCookies(response, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    accessTokenExpiresIn: data.accessTokenExpiresIn,
    refreshTokenExpiresIn: data.refreshTokenExpiresIn,
  });

  return response;
}
