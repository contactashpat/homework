import DatabaseConstructor, { Database } from "better-sqlite3";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const DEFAULT_DATABASE_FILENAME = join(process.cwd(), "data", "collections.db");
const FALLBACK_DATABASE_FILENAME = join(
  tmpdir(),
  "flashcard-app",
  "collections.db",
);
const DEFAULT_SEED_FILE = join(
  process.cwd(),
  "data",
  "country-capitals-collection.json",
);

let cachedDb: Database | null = null;

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
      ["EROFS", "EACCES", "EPERM"].includes(
        (error as NodeJS.ErrnoException).code ?? "",
      ),
  );

const isSqliteCantOpenError = (error: unknown): boolean =>
  error instanceof Error &&
  /(SQLITE_CANTOPEN|unable to open database file)/i.test(error.message ?? "");

const createSchema = (db: Database) => {
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

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id TEXT PRIMARY KEY,
      total_questions INTEGER NOT NULL,
      correct_answers INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at ON quiz_attempts (created_at);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      roles TEXT NOT NULL,
      google_sub TEXT UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      jti TEXT NOT NULL UNIQUE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON refresh_tokens (jti);
  `);
};

const ensureUsersTableColumns = (db: Database) => {
  try {
    const columns = db
      .prepare("PRAGMA table_info(users)")
      .all() as Array<{ name?: string }>;
    const hasGoogleSub = columns.some((column) => column.name === "google_sub");
    if (!hasGoogleSub) {
      db.exec("ALTER TABLE users ADD COLUMN google_sub TEXT");
      const hasIndex = db
        .prepare(
          "SELECT 1 FROM pragma_index_list('users') WHERE name = 'idx_users_google_sub'",
        )
        .get();
      if (!hasIndex) {
        db.exec(
          "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub)",
        );
      }
    }
  } catch (error) {
    console.error("Failed to ensure google_sub column on users table:", error);
  }
};

const isValidString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const seedCollections = (db: Database) => {
  try {
    const existingCategory = db
      .prepare("SELECT 1 FROM categories LIMIT 1")
      .get();
    if (existingCategory) {
      return;
    }

    if (!existsSync(DEFAULT_SEED_FILE)) {
      return;
    }

    const raw = readFileSync(DEFAULT_SEED_FILE, "utf-8");
    const parsed = JSON.parse(raw) as {
      collections?: Array<{
        name?: unknown;
        locked?: unknown;
        cards?: Array<{
          front?: unknown;
          back?: unknown;
          learned?: unknown;
          img?: unknown;
        }>;
      }>;
    };
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

    const transactionalSeed = db.transaction(() => {
      parsed.collections?.forEach((collection) => {
        if (!collection || !isValidString(collection.name)) {
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
          if (!card || !isValidString(card.front) || !isValidString(card.back)) {
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
    console.error("Failed to seed default collections:", error);
  }
};

const seedUsers = (db: Database) => {
  try {
    const existingUser = db.prepare("SELECT 1 FROM users LIMIT 1").get();
    if (existingUser) {
      return;
    }

    const insertUser = db.prepare(
      `INSERT INTO users (id, username, password_hash, roles, created_at, updated_at)
       VALUES (@id, @username, @passwordHash, @roles, @createdAt, @updatedAt)`,
    );

    const defaultUser = {
      id: randomUUID(),
      username: "admin@example.com",
      passwordHash: bcrypt.hashSync("admin123", 12),
      roles: JSON.stringify(["admin"]),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    insertUser.run(defaultUser);
    console.info(
      "Seeded default admin user (admin@example.com / admin123). Change this in production!",
    );
  } catch (error) {
    console.error("Failed to seed default users:", error);
  }
};

export const getDb = (): Database => {
  if (cachedDb) {
    return cachedDb;
  }

  const candidates = process.env.SQLITE_FILE
    ? [process.env.SQLITE_FILE]
    : [DEFAULT_DATABASE_FILENAME, FALLBACK_DATABASE_FILENAME];

  let db: Database | undefined;
  let lastError: unknown;

  for (const filename of candidates) {
    try {
      ensureDirectory(filename);
      db = new DatabaseConstructor(filename);
      if (!process.env.SQLITE_FILE && filename === FALLBACK_DATABASE_FILENAME) {
        console.warn(
          `SQLite database '${filename}' is not writable. Using temporary fallback.`,
        );
      }
      break;
    } catch (error) {
      lastError = error;
      if (
        filename === DEFAULT_DATABASE_FILENAME &&
        !process.env.SQLITE_FILE &&
        (isReadOnlyFsError(error) || isSqliteCantOpenError(error))
      ) {
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

  createSchema(db);
  ensureUsersTableColumns(db);
  seedCollections(db);
  seedUsers(db);

  cachedDb = db;
  return db;
};
