import { createHash, randomBytes } from "node:crypto";
import type { Session } from "electron";
import { app, shell } from "electron";

/** The link scheme the system browser hands the sign-in back on; DESKTOP_APP_SCHEME on the server. */
export const SCHEME = "app.lymi.desktop";
/** The end of Better Auth's session cookie name, whatever its prefix. */
export const SESSION_COOKIE = "session_token";
/** Each sign-in started here, by its state, until its link comes back. */
const verifiers = new Map<string, string>();

const base64Url = (bytes: Buffer) => bytes.toString("base64url");

/** Opens the product's hand-off page in the system browser, where Google and passkeys work. */
export async function requestSignIn(productUrl: string) {
  const state = base64Url(randomBytes(12));
  const verifier = base64Url(randomBytes(32));
  verifiers.set(state, verifier);
  const url = new URL("/desktop/sign-in", productUrl);
  url.searchParams.set("client_id", "electron");
  url.searchParams.set("code_challenge", base64Url(createHash("sha256").update(verifier).digest()));
  url.searchParams.set("state", state);
  // A script driving local dev opens the page itself. README.md.
  if (url.hostname === "localhost") console.log(`sign-in ${url}`);
  if (process.env.LYMI_DEV_BROWSER !== "off")
    await shell.openExternal(url.toString(), { activate: true });
}

/**
 * Trades the code in an `app.lymi.desktop://auth/callback#token=…` link for a session, and copies
 * the cookies it sets into the windows' own session, so they are signed in at once.
 */
export async function completeSignIn(link: string, productUrl: string, ses: Session) {
  const url = URL.parse(link);
  // The page sends `scheme:/auth/callback`; the browser hands macOS `scheme://auth/callback`.
  const path = url && `${url.host ? `/${url.host}` : ""}${url.pathname}`;
  if (url?.protocol !== `${SCHEME}:` || path !== "/auth/callback") return false;
  if (!url.hash.startsWith("#token=")) return false;
  const token = decodeURIComponent(url.hash.slice("#token=".length));
  const { identifier, state } = JSON.parse(Buffer.from(token, "base64url").toString()) as {
    identifier?: string;
    state?: string;
  };
  const verifier = state && verifiers.get(state);
  if (!identifier || !state || !verifier) return false;
  // Node's fetch, as Better Auth's own Electron client does, with no cookie to send.
  const res = await fetch(new URL("/api/auth/electron/token", productUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // Named in the learner's list of sessions, rather than as Node.
      "user-agent": `Lymi for Mac/${app.getVersion()}`,
    },
    body: JSON.stringify({ token: identifier, state, code_verifier: verifier }),
  });
  if (!res.ok) return false;
  // Kept until the trade succeeds, so "Open Lymi for Mac again" can finish a sign-in that failed.
  verifiers.delete(state);
  for (const header of res.headers.getSetCookie())
    await ses.cookies.set(cookieOf(header, productUrl));
  return true;
}

export function cookieOf(header: string, productUrl: string): Electron.CookiesSetDetails {
  const [pair = "", ...attributes] = header.split(";").map((part) => part.trim());
  const split = pair.indexOf("=");
  const cookie: Electron.CookiesSetDetails = {
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
    else if (name === "max-age") cookie.expirationDate = Date.now() / 1000 + Number(value);
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
