import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Flashcard, FlashcardCategory } from "../../../types";
import { withBackendAuth, buildInternalApiUrl } from "../../../lib/internalApi";
import { readAccessToken } from "../../../lib/auth/cookies";

export const dynamic = "force-dynamic";

export async function GET() {
  const accessToken = readAccessToken(cookies());
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const target = buildInternalApiUrl("/internal-api/collections");
  const response = await fetch(
    target,
    withBackendAuth({ cache: "no-store" }, accessToken),
  );
  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: response.status },
    );
  }
  const payload = (await response.json()) as {
    categories: FlashcardCategory[];
    flashcards: Flashcard[];
  };
  return NextResponse.json(payload);
}

type UpsertPayload = {
  categories?: FlashcardCategory[];
  flashcards?: Flashcard[];
};

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as UpsertPayload;
    if (!Array.isArray(payload.categories) || !Array.isArray(payload.flashcards)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const accessToken = readAccessToken(cookies());
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const target = buildInternalApiUrl("/internal-api/collections");
    const backendResponse = await fetch(
      target,
      withBackendAuth({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }, accessToken),
    );

    if (!backendResponse.ok) {
      const text = await backendResponse.text();
      return NextResponse.json(
        { error: "Failed to persist collections", details: text },
        { status: backendResponse.status },
      );
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
