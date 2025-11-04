import { getDb } from "../db";

export type UserRecord = {
  id: string;
  username: string;
  passwordHash: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
};

const mapUserRow = (row: any): UserRecord => ({
  id: String(row.id),
  username: String(row.username),
  passwordHash: String(row.password_hash),
  roles: JSON.parse(row.roles ?? "[]") as string[],
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export const findUserByUsername = (username: string): UserRecord | null => {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, username, password_hash, roles, created_at, updated_at
       FROM users WHERE username = ?`,
    )
    .get(username);
  return row ? mapUserRow(row) : null;
};

export const findUserById = (id: string): UserRecord | null => {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, username, password_hash, roles, created_at, updated_at
       FROM users WHERE id = ?`,
    )
    .get(id);
  return row ? mapUserRow(row) : null;
};
