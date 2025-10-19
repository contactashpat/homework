import type { Flashcard, FlashcardCategory } from "../types";
import { getDb } from "./db";

type PersistedCollectionState = {
  categories: FlashcardCategory[];
  flashcards: Flashcard[];
};

const mapCategoryRow = (row: any): FlashcardCategory => ({
  id: String(row.id),
  name: String(row.name),
  locked: Boolean(row.locked),
  createdAt: String(row.created_at),
  parentId: row.parent_id ? String(row.parent_id) : null,
});

const mapFlashcardRow = (row: any): Flashcard => ({
  id: String(row.id),
  front: String(row.front),
  back: String(row.back),
  learned: Boolean(row.learned),
  categoryId: String(row.category_id),
  img: row.img ?? undefined,
});

export const getCollectionsFromDb = (): PersistedCollectionState => {
  const db = getDb();
  const categoryRows = db.prepare("SELECT id, name, locked, created_at, parent_id FROM categories").all();
  const flashcardRows = db.prepare(
    "SELECT id, front, back, learned, category_id, img FROM flashcards",
  ).all();

  return {
    categories: categoryRows.map(mapCategoryRow),
    flashcards: flashcardRows.map(mapFlashcardRow),
  };
};

export const replaceCollectionsInDb = (
  categories: FlashcardCategory[],
  flashcards: Flashcard[],
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
