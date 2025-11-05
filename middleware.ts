import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ACCESS_TOKEN_COOKIE = "flashcard_access_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPrefetchRequest =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch";

  // Allow public and API routes to pass through untouched
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/internal-api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (request.method === "HEAD" || request.method === "OPTIONS") {
    return NextResponse.next();
  }

  const protectedPrefixes = ["/study", "/quiz", "/flashcards", "/progress"];
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasAccessToken = Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);
  if (hasAccessToken || isPrefetchRequest) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const redirectTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("redirect", redirectTo);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
