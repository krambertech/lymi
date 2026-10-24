/** The link scheme the system browser hands the sign-in back on; `DESKTOP_APP_SCHEME` on the server. */
export const SCHEME = "app.lymi.desktop";
/** The end of Better Auth's session cookie name, whatever its prefix. */
export const SESSION_COOKIE = "session_token";

/**
 * The one-time code and state in an `app.lymi.desktop://auth/callback#token=…` link. The page sends
 * `scheme:/auth/callback`; the browser hands macOS `scheme://auth/callback`; both are read.
 */
export function parseCallback(link: string): { identifier: string; state: string } | null {
  const url = URL.parse(link);
  const path = url && `${url.host ? `/${url.host}` : ""}${url.pathname}`;
  if (url?.protocol !== `${SCHEME}:` || path !== "/auth/callback") return null;
  if (!url.hash.startsWith("#token=")) return null;
  try {
    const token = decodeURIComponent(url.hash.slice("#token=".length));
    const { identifier, state } = JSON.parse(Buffer.from(token, "base64url").toString()) as {
      identifier?: unknown;
      state?: unknown;
    };
    return typeof identifier === "string" && typeof state === "string" && identifier && state
      ? { identifier, state }
      : null;
  } catch {
    return null;
  }
}

export interface CookieDetails {
  url: string;
  name: string;
  value: string;
  path?: string;
  domain?: string;
  httpOnly?: boolean;
  secure?: boolean;
  expirationDate?: number;
  sameSite?: "unspecified" | "no_restriction" | "lax" | "strict";
}

/** A `Set-Cookie` header as Electron's `cookies.set` takes it, scoped to the product. */
export function cookieOf(header: string, productUrl: string, now = Date.now()): CookieDetails {
  const [pair = "", ...attributes] = header.split(";").map((part) => part.trim());
  const split = pair.indexOf("=");
  const cookie: CookieDetails = {
    url: productUrl,
    name: pair.slice(0, split),
    value: pair.slice(split + 1),
  };
  for (const attribute of attributes) {
    const at = attribute.indexOf("=");
    const name = (at === -1 ? attribute : attribute.slice(0, at)).toLowerCase();
    const value = at === -1 ? "" : attribute.slice(at + 1);
    if (name === "path") cookie.path = value;
    else if (name === "domain") cookie.domain = value;
    else if (name === "httponly") cookie.httpOnly = true;
    else if (name === "secure") cookie.secure = true;
    // Max-Age wins over Expires, as in a browser; without either the cookie ends with the app.
    else if (name === "max-age") cookie.expirationDate = now / 1000 + Number(value);
    else if (name === "expires" && cookie.expirationDate === undefined) {
      const at = Date.parse(value);
      if (!Number.isNaN(at)) cookie.expirationDate = at / 1000;
    } else if (name === "samesite") {
      const sameSite = value.toLowerCase();
      cookie.sameSite =
        sameSite === "none" ? "no_restriction" : sameSite === "strict" ? "strict" : "lax";
    }
  }
  return cookie;
}

/**
 * Whether a session cookie change is a sign-in or sign-out, given whether a session was held. The
 * daily refresh rewrites the cookie in place, an overwrite then an insert, and is neither.
 */
export function sessionChange(
  hasSession: boolean,
  change: { name: string; cause: string; removed: boolean },
): boolean | null {
  if (!change.name.endsWith(SESSION_COOKIE)) return null;
  if (change.cause === "overwrite" || change.cause === "expired-overwrite") return null;
  const now = !change.removed;
  return now === hasSession ? null : now;
}
