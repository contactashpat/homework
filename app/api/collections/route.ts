import { NextResponse } from "next/server";
import { getCollectionsFromDb, replaceCollectionsInDb } from "../../../lib/collectionsRepository";
import type { Flashcard, FlashcardCategory } from "../../../types";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = getCollectionsFromDb();
  return NextResponse.json(state);
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

    replaceCollectionsInDb(payload.categories, payload.flashcards);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
