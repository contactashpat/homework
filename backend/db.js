const DatabaseConstructor = require("better-sqlite3");
const { existsSync, mkdirSync } = require("node:fs");
const { dirname, join } = require("node:path");
const { tmpdir } = require("node:os");

const DEFAULT_DATABASE_FILENAME = join(process.cwd(), "data", "collections.db");
const FALLBACK_DATABASE_FILENAME = join(
  tmpdir(),
  "flashcard-app",
  "collections.db",
);

const ensureDirectory = (filePath) => {
  const directory = dirname(filePath);
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
};

const isReadOnlyFsError = (error) =>
  Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      ["EROFS", "EACCES", "EPERM"].includes(error.code),
  );

const isSqliteCantOpenError = (error) =>
  error instanceof Error &&
  /(SQLITE_CANTOPEN|unable to open database file)/i.test(error.message ?? "");

let cachedDb;

const createUsersSchema = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      roles TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `);
};

const getDb = () => {
  if (cachedDb) {
    return cachedDb;
  }

  const candidates = process.env.SQLITE_FILE
    ? [process.env.SQLITE_FILE]
    : [DEFAULT_DATABASE_FILENAME, FALLBACK_DATABASE_FILENAME];

  let db;
  let lastError;

  for (const filename of candidates) {
    try {
      ensureDirectory(filename);
      db = new DatabaseConstructor(filename);
      break;
    } catch (error) {
      lastError = error;
      if (
        filename === DEFAULT_DATABASE_FILENAME &&
        !process.env.SQLITE_FILE &&
        (isReadOnlyFsError(error) || isSqliteCantOpenError(error))
      ) {
        // eslint-disable-next-line no-console
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
    throw new Error("Failed to initialize SQLite database for backend.");
  }

  db.pragma("journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON;");

  createUsersSchema(db);

  cachedDb = db;
  return db;
};

module.exports = { getDb };
