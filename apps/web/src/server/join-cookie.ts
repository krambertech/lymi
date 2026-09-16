import { parse, serialize } from "hono/utils/cookie";
import { cookiePrefix } from "../shared/cookies";
import { isLoopbackUrl } from "../shared/origins";

/**
 * A join link or a published deck carried through sign-in. Google's callback is a cross-site
 * top-level redirect, so the cookie is `SameSite=Lax`. ADR 0011.
 *
 * It lasts a day rather than the ten minutes Google needs, because a password account joins
 * when its confirmation link creates the first session, which can be a day after the sign-up
 * that set this. A learner who confirms on another device still lands signed in, and the join
 * page then admits them on the next visit. Issue 251.
 */
const MAX_AGE_SECONDS = 60 * 60 * 25;

/** A published deck's slug is stored after this prefix; a bare value is a join link token. */
const PUBLICATION_PREFIX = "p.";

export type Admission =
  | { kind: "link"; token: string }
  | {
      kind: "publication";
      slug: string;
      /** The edition the visitor chose before signing in. A slug holds no dot, so this parses. */
      meaningLanguage?: string | undefined;
    };

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

export function addCookie(
  productUrl: string,
  slug: string,
  meaningLanguage?: string | undefined,
): string {
  const value = meaningLanguage ? `${slug}.${meaningLanguage}` : slug;
  return joinCookie(productUrl, `${PUBLICATION_PREFIX}${value}`);
}

export function clearedJoinCookie(productUrl: string): string {
  return serialize(cookieName(productUrl), "", { ...attributes(productUrl), maxAge: 0 });
}

export function admissionFrom(productUrl: string, headers: Headers | undefined): Admission | null {
  const header = headers?.get("cookie");
  if (!header) return null;
  const value = parse(header, cookieName(productUrl))[cookieName(productUrl)];
  if (!value) return null;
  if (!value.startsWith(PUBLICATION_PREFIX)) return { kind: "link", token: value };
  const [slug, meaningLanguage] = value.slice(PUBLICATION_PREFIX.length).split(".");
  return { kind: "publication", slug: slug ?? "", meaningLanguage };
}
