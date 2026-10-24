import { createHash, randomBytes } from "node:crypto";
import type { SignInProvider } from "@lymi/client/desktop";
import type { Session } from "electron";
import { app, shell } from "electron";
import { cookieOf, parseCallback } from "./callback.js";

/** Each sign-in started here, by its state, until its link comes back. */
const verifiers = new Map<string, string>();

const base64Url = (bytes: Buffer) => bytes.toString("base64url");

/**
 * Opens the product's hand-off page in the system browser, where Google and passkeys work. With a
 * provider, a signed-out browser goes straight to that provider's page rather than Lymi's login.
 */
export async function requestSignIn(productUrl: string, provider?: SignInProvider | null) {
  const state = base64Url(randomBytes(12));
  const verifier = base64Url(randomBytes(32));
  verifiers.set(state, verifier);
  const url = new URL("/desktop/sign-in", productUrl);
  url.searchParams.set("client_id", "electron");
  url.searchParams.set("code_challenge", base64Url(createHash("sha256").update(verifier).digest()));
  url.searchParams.set("state", state);
  if (provider) url.searchParams.set("provider", provider);
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
  const callback = parseCallback(link);
  const verifier = callback && verifiers.get(callback.state);
  if (!callback || !verifier) return false;
  const { identifier, state } = callback;
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
