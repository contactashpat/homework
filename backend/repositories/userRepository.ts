import { randomUUID } from "node:crypto";
import { getDb } from "../db";

export type UserRecord = {
  id: string;
  username: string;
  passwordHash: string;
  roles: string[];
  googleSub: string | null;
  createdAt: string;
  updatedAt: string;
};

const mapUserRow = (row: any): UserRecord => ({
  id: String(row.id),
  username: String(row.username),
  passwordHash: String(row.password_hash),
  roles: JSON.parse(row.roles ?? "[]") as string[],
  googleSub: row.google_sub ? String(row.google_sub) : null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const findUserByUsername = (username: string): UserRecord | null => {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, username, password_hash, roles, created_at, updated_at, google_sub
       FROM users WHERE username = ?`,
    )
    .get(username);
  return row ? mapUserRow(row) : null;
};

export const findUserById = (id: string): UserRecord | null => {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, username, password_hash, roles, created_at, updated_at, google_sub
       FROM users WHERE id = ?`,
    )
    .get(id);
  return row ? mapUserRow(row) : null;
};

export const findUserByGoogleSub = (googleSub: string): UserRecord | null => {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, username, password_hash, roles, created_at, updated_at, google_sub
       FROM users WHERE google_sub = ?`,
    )
    .get(googleSub);
  return row ? mapUserRow(row) : null;
};

export const upsertGoogleUser = (payload: {
  sub: string;
  email: string;
  passwordHash: string;
  roles?: string[];
}): UserRecord => {
  const db = getDb();
  const now = new Date().toISOString();
  const normalizedRoles = payload.roles ?? ["user"];
  const rolesJson = JSON.stringify(normalizedRoles);

  const existingBySub = findUserByGoogleSub(payload.sub);
  if (existingBySub) {
    db.prepare(
      `UPDATE users
       SET username = @username,
           roles = @roles,
           updated_at = @updatedAt
       WHERE id = @id`,
    ).run({
      id: existingBySub.id,
      username: payload.email,
      roles: rolesJson,
      updatedAt: now,
    });
    return findUserById(existingBySub.id)!;
  }

  const existingByEmail = findUserByUsername(payload.email);
  if (existingByEmail) {
    db.prepare(
      `UPDATE users
       SET google_sub = @googleSub,
           roles = @roles,
           updated_at = @updatedAt
       WHERE id = @id`,
    ).run({
      id: existingByEmail.id,
      googleSub: payload.sub,
      roles: rolesJson,
      updatedAt: now,
    });
    return findUserById(existingByEmail.id)!;
  }

  const insert = db.prepare(
    `INSERT INTO users (id, username, password_hash, roles, created_at, updated_at, google_sub)
     VALUES (@id, @username, @passwordHash, @roles, @createdAt, @updatedAt, @googleSub)`,
  );

  const newUser = {
    id: randomUUID(),
    username: payload.email,
    passwordHash: payload.passwordHash,
    roles: rolesJson,
    createdAt: now,
    updatedAt: now,
    googleSub: payload.sub,
  };

  insert.run(newUser);

  return mapUserRow({
    id: newUser.id,
    username: newUser.username,
    password_hash: newUser.passwordHash,
    roles: newUser.roles,
    created_at: newUser.createdAt,
    updated_at: newUser.updatedAt,
    google_sub: newUser.googleSub,
  });
};
