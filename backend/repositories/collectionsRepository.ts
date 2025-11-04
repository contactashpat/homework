import { getDb } from "../db";

type CategoryRow = {
  id: string;
  name: string;
  locked: number;
  created_at?: string | null;
  parent_id?: string | null;
};

type FlashcardRow = {
  id: string;
  front: string;
  back: string;
  learned: number;
  category_id: string;
  img?: string | null;
  created_at?: string | null;
};

type CollectionsResult = {
  categories: Array<{
    id: string;
    name: string;
    locked: boolean;
    createdAt: string;
    parentId: string | null;
  }>;
  flashcards: Array<{
    id: string;
    front: string;
    back: string;
    learned: boolean;
    categoryId: string;
    img?: string;
  }>;
};

const mapCategory = (row: CategoryRow) => ({
  id: String(row.id),
  name: String(row.name),
  locked: Boolean(row.locked),
  createdAt: row.created_at
    ? String(row.created_at)
    : new Date().toISOString(),
  parentId: row.parent_id ? String(row.parent_id) : null,
});

const mapFlashcard = (row: FlashcardRow) => ({
  id: String(row.id),
  front: String(row.front),
  back: String(row.back),
  learned: Boolean(row.learned),
  categoryId: String(row.category_id),
  img: row.img ?? undefined,
});

const runQueryWithFallback = <T>(
  primary: () => T[],
  fallback: () => T[],
): T[] => {
  try {
    return primary();
  } catch (error) {
    console.warn(
      `Primary query failed, using fallback. Reason: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return fallback();
  }
};

export const getCollections = (): CollectionsResult => {
  const db = getDb();

  const categoryRows = runQueryWithFallback<CategoryRow>(
    () =>
      db
        .prepare(
          "SELECT id, name, locked, created_at, parent_id FROM categories ORDER BY created_at ASC",
        )
        .all(),
    () =>
      db
        .prepare(
          "SELECT id, name, locked, NULL as created_at, parent_id FROM categories ORDER BY name ASC",
        )
        .all(),
  );

  const flashcardRows = runQueryWithFallback<FlashcardRow>(
    () =>
      db
        .prepare(
          "SELECT id, front, back, learned, category_id, img, created_at FROM flashcards ORDER BY created_at ASC",
        )
        .all(),
    () =>
      db
        .prepare(
          "SELECT id, front, back, learned, category_id, img, NULL as created_at FROM flashcards",
        )
        .all(),
  );

  return {
    categories: categoryRows.map(mapCategory),
    flashcards: flashcardRows.map(mapFlashcard),
  };
};

type CategoryInput = {
  id: string;
  name: string;
  locked: boolean;
  createdAt: string;
  parentId: string | null;
};

type FlashcardInput = {
  id: string;
  front: string;
  back: string;
  learned: boolean;
  categoryId: string;
  img?: string | null;
};

export const replaceCollections = (
  categories: CategoryInput[],
  flashcards: FlashcardInput[],
) => {
  const db = getDb();
  const insertCategory = db.prepare(
    `INSERT INTO categories (id, name, locked, created_at, parent_id)
     VALUES (@id, @name, @locked, @createdAt, @parentId)`,
  );
  const insertFlashcard = db.prepare(
    `INSERT INTO flashcards (id, front, back, learned, category_id, img)
     VALUES (@id, @front, @back, @learned, @categoryId, @img)`,
  );

  const transactionalReplace = db.transaction(() => {
    db.prepare("DELETE FROM flashcards").run();
    db.prepare("DELETE FROM categories").run();

    categories.forEach((category) => {
      insertCategory.run({
        id: category.id,
        name: category.name,
        locked: category.locked ? 1 : 0,
        createdAt: category.createdAt,
        parentId: category.parentId ?? null,
      });
    });

    flashcards.forEach((card) => {
      insertFlashcard.run({
        id: card.id,
        front: card.front,
        back: card.back,
        learned: card.learned ? 1 : 0,
        categoryId: card.categoryId,
        img: card.img ?? null,
      });
    });
  });

  transactionalReplace();
};

export type { CollectionsResult };
