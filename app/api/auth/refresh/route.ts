import { NextResponse } from "next/server";
import { buildInternalApiUrl } from "../../../../lib/internalApi";
import {
  clearAuthCookies,
  readRefreshToken,
  setAuthCookies,
} from "../../../../lib/auth/cookies";

export async function POST() {
  const refreshToken = readRefreshToken();
  if (!refreshToken) {
    return NextResponse.json({ error: "Missing refresh token" }, { status: 401 });
  }

  const backendResponse = await fetch(buildInternalApiUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await backendResponse.json().catch(() => ({}));

  if (!backendResponse.ok) {
    const response = NextResponse.json(
      { error: data?.error ?? "Unable to refresh session" },
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
