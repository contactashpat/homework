import { NextResponse } from "next/server";
import { buildInternalApiUrl } from "../../../../lib/internalApi";
import { clearAuthCookies, readRefreshToken } from "../../../../lib/auth/cookies";

export async function POST() {
  const refreshToken = readRefreshToken();

  if (refreshToken) {
    await fetch(buildInternalApiUrl("/internal-api/auth/logout"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {
      /* swallow errors */
    });
  }

  const response = NextResponse.json({ status: "ok" });
  clearAuthCookies(response);
  return response;
}
