export const SCHEME = "app.lymi.desktop";
export const SESSION_COOKIE = "session_token";

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

export function sessionChange(
  hasSession: boolean,
  change: { name: string; cause: string; removed: boolean },
): boolean | null {
  if (!change.name.endsWith(SESSION_COOKIE)) return null;
  if (change.cause === "overwrite" || change.cause === "expired-overwrite") return null;
  const now = !change.removed;
  return now === hasSession ? null : now;
}
