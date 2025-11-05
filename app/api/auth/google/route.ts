import { NextResponse } from "next/server";
import { buildInternalApiUrl } from "../../../../lib/internalApi";
import { setAuthCookies, clearAuthCookies } from "../../../../lib/auth/cookies";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    credential?: string;
  };

  if (typeof body.credential !== "string" || body.credential.trim().length === 0) {
    return NextResponse.json(
      { error: "Google credential is required" },
      { status: 400 },
    );
  }

  const backendResponse = await fetch(
    buildInternalApiUrl("/internal-api/auth/google"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: body.credential }),
    },
  );

  const data = await backendResponse.json().catch(() => ({}));

  if (!backendResponse.ok) {
    const response = NextResponse.json(
      { error: data?.error ?? "Google authentication failed" },
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
