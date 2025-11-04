import jwt from "jsonwebtoken";

const ACCESS_TOKEN_SECRET_FALLBACK = "dev-access-token-secret";

const getAccessTokenSecret = (): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (secret && secret.trim().length > 0) {
    return secret.trim();
  }
  return ACCESS_TOKEN_SECRET_FALLBACK;
};

export type AccessTokenPayload = {
  sub: string;
  username?: string;
  roles?: string[];
  type?: string;
  exp?: number;
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const payload = jwt.verify(token, getAccessTokenSecret(), {
    algorithms: ["HS256"],
    issuer: "flashcard-backend",
  });

  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid token payload");
  }

  return payload as AccessTokenPayload;
};
