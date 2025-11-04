const { getDb } = require("../db");

const mapCategory = (row) => ({
  id: String(row.id),
  name: String(row.name),
  locked: Boolean(row.locked),
  createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
  parentId: row.parent_id ? String(row.parent_id) : null,
});

const mapFlashcard = (row) => ({
  id: String(row.id),
  front: String(row.front),
  back: String(row.back),
  learned: Boolean(row.learned),
  categoryId: String(row.category_id),
  img: row.img ?? undefined,
});

const runQueryWithFallback = (db, primarySql, fallbackSql) => {
  try {
    return db.prepare(primarySql).all();
  } catch (error) {
    console.warn(
      `Primary query failed (${error instanceof Error ? error.message : error}). Falling back.`,
    );
    return db.prepare(fallbackSql).all();
  }
};

const getCollections = () => {
  const db = getDb();

  const categoryRows = runQueryWithFallback(
    db,
    "SELECT id, name, locked, created_at, parent_id FROM categories ORDER BY created_at ASC",
    "SELECT id, name, locked, NULL as created_at, parent_id FROM categories ORDER BY name ASC",
  );

  const flashcardRows = runQueryWithFallback(
    db,
    "SELECT id, front, back, learned, category_id, img FROM flashcards ORDER BY created_at ASC",
    "SELECT id, front, back, learned, category_id, img, NULL as created_at FROM flashcards",
  );

  return {
    categories: categoryRows.map(mapCategory),
    flashcards: flashcardRows.map(mapFlashcard),
  };
};

const replaceCollections = (categories, flashcards) => {
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

module.exports = { getCollections, replaceCollections };
