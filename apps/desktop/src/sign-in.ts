import { createHash, randomBytes } from "node:crypto";
import type { SignInProvider } from "@lymi/client/desktop";
import type { Session } from "electron";
import { app, shell } from "electron";
import { cookieOf, parseCallback } from "./callback.js";

const verifiers = new Map<string, string>();

const base64Url = (bytes: Buffer) => bytes.toString("base64url");

export async function requestSignIn(productUrl: string, provider?: SignInProvider | null) {
  const state = base64Url(randomBytes(12));
  const verifier = base64Url(randomBytes(32));
  verifiers.set(state, verifier);
  const url = new URL("/desktop/sign-in", productUrl);
  url.searchParams.set("client_id", "electron");
  url.searchParams.set("code_challenge", base64Url(createHash("sha256").update(verifier).digest()));
  url.searchParams.set("state", state);
  if (provider) url.searchParams.set("provider", provider);
  if (url.hostname === "localhost") console.log(`sign-in ${url}`);
  if (process.env.LYMI_DEV_BROWSER !== "off")
    await shell.openExternal(url.toString(), { activate: true });
}

export async function completeSignIn(link: string, productUrl: string, ses: Session) {
  const callback = parseCallback(link);
  if (!callback) throw new Error("the sign-in link could not be read");
  const verifier = verifiers.get(callback.state);
  if (!verifier) throw new Error("no sign-in is waiting for this link");
  const { identifier, state } = callback;
  const res = await fetch(new URL("/api/auth/electron/token", productUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": `Lymi for Mac/${app.getVersion()}`,
    },
    body: JSON.stringify({ token: identifier, state, code_verifier: verifier }),
  });
  if (!res.ok) throw new Error(`the token exchange answered ${res.status}`);
  verifiers.delete(state);
  for (const header of res.headers.getSetCookie())
    await ses.cookies.set(cookieOf(header, productUrl));
}
