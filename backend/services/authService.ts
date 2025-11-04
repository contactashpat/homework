import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import {
  findUserByUsername,
  findUserById,
  type UserRecord,
} from "../repositories/userRepository";
import {
  createRefreshToken,
  findRefreshTokenByJti,
  revokeRefreshTokenByJti,
  revokeAllTokensForUser,
  type RefreshTokenRecord,
} from "../repositories/refreshTokenRepository";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

const getAccessTokenSecret = (): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (secret && secret.trim().length > 0) {
    return secret.trim();
  }
  console.warn(
    "ACCESS_TOKEN_SECRET is not set. Using fallback dev secret. Do not use this in production.",
  );
  return "dev-access-token-secret";
};

const getRefreshTokenSecret = (): string => {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (secret && secret.trim().length > 0) {
    return secret.trim();
  }
  console.warn(
    "REFRESH_TOKEN_SECRET is not set. Using fallback dev secret. Do not use this in production.",
  );
  return "dev-refresh-token-secret";
};

const hashToken = (token: string): string => bcrypt.hashSync(token, 12);

const verifyPassword = (password: string, hash: string): boolean =>
  bcrypt.compareSync(password, hash);

const generateAccessToken = (user: UserRecord): string =>
  jwt.sign(
    {
      sub: user.id,
      username: user.username,
      roles: user.roles,
      type: "access",
    },
    getAccessTokenSecret(),
    {
      algorithm: "HS256",
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      issuer: "flashcard-backend",
    },
  );

const buildRefreshTokenPayload = (user: UserRecord, jti: string) => ({
  sub: user.id,
  username: user.username,
  jti,
  type: "refresh",
});

const generateRefreshToken = (user: UserRecord, jti: string): string =>
  jwt.sign(
    buildRefreshTokenPayload(user, jti),
    getRefreshTokenSecret(),
    {
      algorithm: "HS256",
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
      issuer: "flashcard-backend",
    },
  );

const decodeRefreshToken = (token: string): {
  sub: string;
  username: string;
  jti: string;
  type: string;
  exp: number;
} => {
  const payload = jwt.verify(token, getRefreshTokenSecret(), {
    algorithms: ["HS256"],
    issuer: "flashcard-backend",
  });

  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid refresh token payload");
  }

  const { sub, username, jti, type, exp } = payload as any;
  if (type !== "refresh" || !sub || !jti) {
    throw new Error("Invalid refresh token payload");
  }
  return { sub, username, jti, type, exp };
};

export const authenticateUser = async (
  username: string,
  password: string,
): Promise<UserRecord | null> => {
  const user = findUserByUsername(username);
  if (!user) {
    return null;
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }
  return user;
};

export const createSessionTokens = async (
  user: UserRecord,
): Promise<{
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}> => {
  const jti = randomUUID();
  const refreshToken = generateRefreshToken(user, jti);
  const refreshTokenHash = hashToken(refreshToken);

  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000,
  ).toISOString();

  createRefreshToken({
    id: randomUUID(),
    userId: user.id,
    jti,
    tokenHash: refreshTokenHash,
    expiresAt,
  });

  const accessToken = generateAccessToken(user);

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
  };
};

export const rotateRefreshToken = async (
  token: string,
): Promise<{
  user: UserRecord;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}> => {
  const decoded = decodeRefreshToken(token);
  const record = findRefreshTokenByJti(decoded.jti);

  if (!record || record.revoked) {
    throw new Error("Refresh token has been revoked");
  }

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    revokeRefreshTokenByJti(record.jti);
    throw new Error("Refresh token has expired");
  }

  const tokenMatches = bcrypt.compareSync(token, record.tokenHash);
  if (!tokenMatches) {
    revokeAllTokensForUser(record.userId);
    throw new Error("Refresh token mismatch");
  }

  revokeRefreshTokenByJti(record.jti);

  const user = findUserById(record.userId);
  if (!user) {
    throw new Error("User not found");
  }

  const newTokens = await createSessionTokens(user);
  return { user, ...newTokens };
};

export const revokeRefreshToken = (token: string) => {
  const decoded = decodeRefreshToken(token);
  revokeRefreshTokenByJti(decoded.jti);
};

export const verifyAccessToken = (token: string): {
  sub: string;
  username: string;
  roles: string[];
} => {
  const payload = jwt.verify(token, getAccessTokenSecret(), {
    algorithms: ["HS256"],
    issuer: "flashcard-backend",
  });

  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid access token payload");
  }

  const { sub, username, roles, type } = payload as any;
  if (type !== "access" || !sub) {
    throw new Error("Invalid access token payload");
  }
  return {
    sub: String(sub),
    username: String(username ?? ""),
    roles: Array.isArray(roles) ? (roles as string[]) : [],
  };
};

export type AuthenticatedUser = {
  id: string;
  username: string;
  roles: string[];
};

export const getServiceSecret = (): string | null => {
  const secret = process.env.SERVICE_API_SECRET;
  return secret && secret.trim().length > 0 ? secret.trim() : null;
};
