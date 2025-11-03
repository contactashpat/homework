const { randomUUID } = require("node:crypto");
const { getDb } = require("../db");

const deserializeRoles = (rolesText) => {
  try {
    const parsed = JSON.parse(rolesText);
    return Array.isArray(parsed)
      ? parsed.map((role) => (typeof role === "string" ? role : null)).filter(Boolean)
      : [];
  } catch {
    return [];
  }
};

const mapUserRow = (row) => {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    roles: deserializeRoles(row.roles),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const findUserByUsername = (username) => {
  if (typeof username !== "string") {
    return null;
  }
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, username, password_hash, roles, created_at, updated_at
       FROM users
       WHERE username = ?`,
    )
    .get(username);
  return mapUserRow(row);
};

const countUsers = () => {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(1) as count FROM users").get();
  return typeof row?.count === "number" ? row.count : 0;
};

const listUsers = () => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, username, roles, created_at, updated_at
       FROM users
       ORDER BY username ASC`,
    )
    .all();
  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    roles: deserializeRoles(row.roles),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

const createUser = ({ username, passwordHash, roles }) => {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();

  db.prepare(
    `INSERT INTO users (id, username, password_hash, roles, created_at, updated_at)
     VALUES (@id, @username, @passwordHash, @roles, @createdAt, @updatedAt)`,
  ).run({
    id,
    username,
    passwordHash,
    roles: JSON.stringify(roles ?? []),
    createdAt: now,
    updatedAt: now,
  });

  return findUserByUsername(username);
};

const updateUserCredentials = ({ id, passwordHash, roles }) => {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE users
     SET password_hash = @passwordHash,
         roles = @roles,
         updated_at = @updatedAt
     WHERE id = @id`,
  ).run({
    id,
    passwordHash,
    roles: JSON.stringify(roles ?? []),
    updatedAt: now,
  });
};

const upsertUser = ({ username, passwordHash, roles }) => {
  const existing = findUserByUsername(username);
  if (!existing) {
    return createUser({ username, passwordHash, roles });
  }

  updateUserCredentials({
    id: existing.id,
    passwordHash,
    roles,
  });

  return findUserByUsername(username);
};

const deleteUser = (username) => {
  const db = getDb();
  db.prepare(`DELETE FROM users WHERE username = ?`).run(username);
};

module.exports = {
  findUserByUsername,
  upsertUser,
  countUsers,
  listUsers,
  deleteUser,
};
