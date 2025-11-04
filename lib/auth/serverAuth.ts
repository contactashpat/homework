import { cookies } from "next/headers";
import { readAccessToken } from "./cookies";
import { verifyAccessToken } from "./token";

export type CurrentUser = {
  id: string;
  username: string;
  roles: string[];
};

export const getCurrentUser = async (): Promise<CurrentUser | null> => {
  try {
    const token = readAccessToken(cookies());
    if (!token) {
      return null;
    }

    const payload = verifyAccessToken(token);
    if (payload.type !== "access" || !payload.sub) {
      return null;
    }

    return {
      id: String(payload.sub),
      username: String(payload.username ?? ""),
      roles: Array.isArray(payload.roles) ? payload.roles : [],
    };
  } catch (error) {
    return null;
  }
};
