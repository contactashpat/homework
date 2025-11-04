import { NextResponse } from "next/server";
import type { Flashcard, FlashcardCategory } from "../../../types";

export const dynamic = "force-dynamic";

const resolveInternalApiBase = () => {
  if (process.env.INTERNAL_API_BASE_URL) {
    return process.env.INTERNAL_API_BASE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    const origin = process.env.VERCEL_URL.startsWith("http")
      ? process.env.VERCEL_URL
      : `https://${process.env.VERCEL_URL}`;
    return origin.replace(/\/$/, "");
  }
  const port = process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
};

const internalApiBase = resolveInternalApiBase();

export async function GET() {
  const target = `${internalApiBase}/internal-api/collections`;
  const response = await fetch(target, { cache: "no-store" });
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

    const target = `${internalApiBase}/internal-api/collections`;
    const backendResponse = await fetch(target, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

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
