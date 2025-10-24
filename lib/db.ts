import DatabaseConstructor from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const DEFAULT_DATABASE_FILENAME = join(process.cwd(), "data", "collections.db");
const FALLBACK_DATABASE_FILENAME = join(tmpdir(), "flashcard-app", "collections.db");
const DEFAULT_SEED_FILE = join(process.cwd(), "data", "country-capitals-collection.json");

type DatabaseInstance = InstanceType<typeof DatabaseConstructor>;

type GlobalWithDb = typeof globalThis & {
  __flashcardDb__?: DatabaseInstance;
};

const ensureDirectory = (filePath: string) => {
  const directory = dirname(filePath);
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
};

const isReadOnlyFsError = (error: unknown): error is NodeJS.ErrnoException =>
  Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as NodeJS.ErrnoException).code === "string" &&
      ["EROFS", "EACCES", "EPERM"].includes((error as NodeJS.ErrnoException).code!),
  );

const isSqliteCantOpenError = (error: unknown): boolean =>
  error instanceof Error &&
  /(SQLITE_CANTOPEN|unable to open database file)/i.test(error.message ?? "");

const getOrCreateDatabase = (): DatabaseInstance => {
  const globalWithDb = globalThis as GlobalWithDb;
  if (globalWithDb.__flashcardDb__) {
    return globalWithDb.__flashcardDb__;
  }

  const candidates: string[] = process.env.SQLITE_FILE
    ? [process.env.SQLITE_FILE]
    : [DEFAULT_DATABASE_FILENAME, FALLBACK_DATABASE_FILENAME];

  let db: DatabaseInstance | undefined;
  let lastError: unknown;

  for (const filename of candidates) {
    try {
      ensureDirectory(filename);
      db = new DatabaseConstructor(filename);
      if (!process.env.SQLITE_FILE && filename === FALLBACK_DATABASE_FILENAME) {
        console.warn(`Using temporary SQLite database at '${filename}'.`);
      }
      break;
    } catch (error) {
      lastError = error;
      if (
        filename === DEFAULT_DATABASE_FILENAME &&
        !process.env.SQLITE_FILE &&
        (isReadOnlyFsError(error) || isSqliteCantOpenError(error))
      ) {
        console.warn(
          `SQLite database '${filename}' is not writable. Falling back to '${FALLBACK_DATABASE_FILENAME}'.`,
        );
        continue;
      }

      throw error;
    }
  }

  if (!db) {
    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error("Failed to initialize SQLite database.");
  }

  db.pragma("journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      locked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      parent_id TEXT
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      learned INTEGER NOT NULL DEFAULT 0,
      category_id TEXT NOT NULL,
      img TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
  `);

  seedDatabaseFromDefaultJson(db);
  globalWithDb.__flashcardDb__ = db;
  return db;
};

export const getDb = (): DatabaseInstance => getOrCreateDatabase();

type SeedCard = {
  front: unknown;
  back: unknown;
  img?: unknown;
};

type SeedCollection = {
  name: unknown;
  locked?: unknown;
  cards?: SeedCard[];
};

type SeedPayload = {
  collections?: SeedCollection[];
};

const isValidString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const seedDatabaseFromDefaultJson = (db: DatabaseInstance): void => {
  try {
    const existingCategory = db.prepare("SELECT 1 FROM categories LIMIT 1").get();
    if (existingCategory) {
      return;
    }

    if (!existsSync(DEFAULT_SEED_FILE)) {
      return;
    }

    const raw = readFileSync(DEFAULT_SEED_FILE, "utf-8");
    const parsed = JSON.parse(raw) as SeedPayload;
    if (!Array.isArray(parsed.collections) || parsed.collections.length === 0) {
      return;
    }

    const insertCategory = db.prepare(
      `INSERT INTO categories (id, name, locked, created_at, parent_id)
       VALUES (@id, @name, @locked, @createdAt, @parentId)`,
    );
    const insertFlashcard = db.prepare(
      `INSERT INTO flashcards (id, front, back, learned, category_id, img)
       VALUES (@id, @front, @back, @learned, @categoryId, @img)`,
    );

    const collections = parsed.collections as SeedCollection[];

    const transactionalSeed = db.transaction(() => {
      collections.forEach((collection) => {
        if (!isValidString(collection.name)) {
          return;
        }
        const categoryId = randomUUID();
        const createdAt = new Date().toISOString();
        insertCategory.run({
          id: categoryId,
          name: collection.name.trim(),
          locked: collection.locked === true ? 1 : 0,
          createdAt,
          parentId: null,
        });

        if (!Array.isArray(collection.cards)) {
          return;
        }

        collection.cards.forEach((card) => {
          if (!isValidString(card.front) || !isValidString(card.back)) {
            return;
          }
          insertFlashcard.run({
            id: randomUUID(),
            front: card.front.trim(),
            back: card.back.trim(),
            learned: 0,
            categoryId,
            img: isValidString(card.img) ? card.img : null,
          });
        });
      });
    });

    transactionalSeed();
  } catch (error) {
    console.error("Failed to seed SQLite database from default JSON:", error);
  }
};
