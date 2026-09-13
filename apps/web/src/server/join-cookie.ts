import { parse, serialize } from "hono/utils/cookie";
import { cookiePrefix } from "../shared/cookies";
import { isLoopbackUrl } from "../shared/origins";

/**
 * A join link carried through sign-in. Google's callback is a cross-site top-level redirect,
 * so the cookie is `SameSite=Lax`; ten minutes is enough to choose an account. ADR 0011.
 */
const MAX_AGE_SECONDS = 10 * 60;

export function cookieName(productUrl: string): string {
  return isLoopbackUrl(productUrl) ? `${cookiePrefix(productUrl)}-join` : "__Host-lymi-join";
}

export function attributes(productUrl: string) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: !isLoopbackUrl(productUrl),
  } as const;
}

export function joinCookie(productUrl: string, token: string): string {
  return serialize(cookieName(productUrl), token, {
    ...attributes(productUrl),
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearedJoinCookie(productUrl: string): string {
  return serialize(cookieName(productUrl), "", { ...attributes(productUrl), maxAge: 0 });
}

export function joinTokenFrom(productUrl: string, headers: Headers | undefined): string | null {
  const header = headers?.get("cookie");
  if (!header) return null;
  return parse(header, cookieName(productUrl))[cookieName(productUrl)] || null;
}
