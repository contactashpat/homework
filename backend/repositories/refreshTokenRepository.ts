import { getDb } from "../db";

export type RefreshTokenRecord = {
  id: string;
  userId: string;
  jti: string;
  tokenHash: string;
  expiresAt: string;
  revoked: boolean;
  createdAt: string;
  revokedAt: string | null;
};

const mapRefreshTokenRow = (row: any): RefreshTokenRecord => ({
  id: String(row.id),
  userId: String(row.user_id),
  jti: String(row.jti),
  tokenHash: String(row.token_hash),
  expiresAt: String(row.expires_at),
  revoked: Boolean(row.revoked),
  createdAt: String(row.created_at),
  revokedAt: row.revoked_at ? String(row.revoked_at) : null,
});

export const createRefreshToken = (payload: {
  id: string;
  userId: string;
  jti: string;
  tokenHash: string;
  expiresAt: string;
}) => {
  const db = getDb();
  db.prepare(
    `INSERT INTO refresh_tokens (id, user_id, jti, token_hash, expires_at, revoked, created_at)
     VALUES (@id, @userId, @jti, @tokenHash, @expiresAt, 0, @createdAt)`,
  ).run({
    ...payload,
    createdAt: new Date().toISOString(),
  });
};

export const findRefreshTokenByJti = (
  jti: string,
): RefreshTokenRecord | null => {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, user_id, jti, token_hash, expires_at, revoked, created_at, revoked_at
       FROM refresh_tokens WHERE jti = ?`,
    )
    .get(jti);
  return row ? mapRefreshTokenRow(row) : null;
};

export const revokeRefreshTokenByJti = (jti: string) => {
  const db = getDb();
  db.prepare(
    `UPDATE refresh_tokens
     SET revoked = 1, revoked_at = @revokedAt
     WHERE jti = @jti`,
  ).run({
    jti,
    revokedAt: new Date().toISOString(),
  });
};

export const revokeAllTokensForUser = (userId: string) => {
  const db = getDb();
  db.prepare(
    `UPDATE refresh_tokens
     SET revoked = 1, revoked_at = @revokedAt
     WHERE user_id = @userId`,
  ).run({
    userId,
    revokedAt: new Date().toISOString(),
  });
};
