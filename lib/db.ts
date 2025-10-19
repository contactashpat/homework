import DatabaseConstructor from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const DATABASE_FILENAME = process.env.SQLITE_FILE ?? join(process.cwd(), "data", "collections.db");

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

const getOrCreateDatabase = (): DatabaseInstance => {
  const globalWithDb = globalThis as GlobalWithDb;
  if (globalWithDb.__flashcardDb__) {
    return globalWithDb.__flashcardDb__;
  }

  ensureDirectory(DATABASE_FILENAME);
  const db = new DatabaseConstructor(DATABASE_FILENAME);
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

  globalWithDb.__flashcardDb__ = db;
  return db;
};

export const getDb = (): DatabaseInstance => getOrCreateDatabase();
