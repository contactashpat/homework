import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const ACCESS_TOKEN_COOKIE = "flashcard_access_token";
export const REFRESH_TOKEN_COOKIE = "flashcard_refresh_token";

const isProduction = (): boolean => process.env.NODE_ENV === "production";

type CookieStore = ReturnType<typeof cookies>;

const getStore = (store?: CookieStore): CookieStore => store ?? cookies();

type TokenBundle = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
};

export const setAuthCookies = (
  response: NextResponse,
  tokens: TokenBundle,
): void => {
  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE,
    value: tokens.accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: tokens.accessTokenExpiresIn,
  });

  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE,
    value: tokens.refreshToken,
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: tokens.refreshTokenExpiresIn,
  });
};

export const clearAuthCookies = (response: NextResponse): void => {
  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });
};

export const readAccessToken = (store?: CookieStore): string | null =>
  getStore(store).get(ACCESS_TOKEN_COOKIE)?.value ?? null;

export const readRefreshToken = (store?: CookieStore): string | null =>
  getStore(store).get(REFRESH_TOKEN_COOKIE)?.value ?? null;
