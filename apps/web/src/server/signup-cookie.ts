import { parse } from "hono/utils/cookie";
import { cookiePrefix } from "../shared/cookies";
import { isLoopbackUrl } from "../shared/origins";

/**
 * Which browser created an unconfirmed password account. Sign-up hands out no session, so
 * this cookie is the only thing that tells the learner who signed up from anyone else who
 * later opens the confirmation link. Issue 251.
 *
 * It outlives the confirmation link so a learner who confirms a day later keeps their
 * password, and it is signed so it cannot be planted on a shared machine.
 */
const MAX_AGE_SECONDS = 60 * 60 * 25;

export function signUpCookieName(productUrl: string): string {
  return isLoopbackUrl(productUrl) ? `${cookiePrefix(productUrl)}-signup` : "__Host-lymi-signup";
}

export function signUpCookieAttributes(productUrl: string) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: !isLoopbackUrl(productUrl),
    maxAge: MAX_AGE_SECONDS,
  } as const;
}

export async function signUpCookieValue(secret: string, userId: string): Promise<string> {
  return `${userId}.${await sign(userId, secret)}`;
}

/** Whether this request came from the browser that created the account being confirmed. */
export async function signedUpHere(
  productUrl: string,
  secret: string,
  userId: string,
  headers: Headers | undefined,
): Promise<boolean> {
  const cookie = headers?.get("cookie");
  if (!cookie) return false;
  const value = parse(cookie)[signUpCookieName(productUrl)];
  if (!value) return false;
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return false;
  const [claimed, signature] = [value.slice(0, separator), value.slice(separator + 1)];
  if (claimed !== userId) return false;
  return timingSafeEqual(signature, await sign(userId, secret));
}

async function sign(userId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`signup:${userId}`));
  return [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let same = 0;
  for (let i = 0; i < a.length; i += 1) same |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return same === 0;
}
