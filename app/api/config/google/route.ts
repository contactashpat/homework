export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

const env = globalThis?.process?.env ?? {};

const resolveGoogleClientId = (): string | null => {
  const raw = env["NEXT_PUBLIC_GOOGLE_CLIENT_ID"] ?? env["GOOGLE_CLIENT_ID"];
  if (!raw) {
    return null;
  }
  const [first] = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return first ?? null;
};

export async function GET() {
  const clientId = resolveGoogleClientId();
  if (!clientId) {
    return NextResponse.json(
      { error: "Google Sign-In is not configured" },
      { status: 503 },
    );
  }

  return NextResponse.json({ clientId });
}
