import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { appPreviewEnabled } from "./env";
import type { AppEnv } from "./index";

const cookieName = "__Host-lymi-preview";

export function equalPreviewKeys(actual: string | undefined, expected: string): boolean {
  if (!actual || actual.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i += 1) {
    difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return difference === 0;
}

/** A leaked workers.dev hostname is not enough to open a pull-request app preview. */
export const requirePreviewAccess = createMiddleware<AppEnv>(async (c, next) => {
  if (!appPreviewEnabled(c.env) || c.req.path === "/api/health" || c.req.path === "/_preview") {
    await next();
    return;
  }

  if (equalPreviewKeys(getCookie(c, cookieName), c.env.APP_PREVIEW_KEY ?? "")) {
    await next();
    return;
  }

  return c.text("Open this app preview from its GitHub deployment link.", 403, {
    "cache-control": "no-store",
  });
});

export function openPreview(c: Context<AppEnv>) {
  if (!appPreviewEnabled(c.env)) return c.json({ error: "Not found" }, 404);
  if (!equalPreviewKeys(c.req.query("key"), c.env.APP_PREVIEW_KEY ?? "")) {
    return c.text("This app preview link is not valid.", 403, { "cache-control": "no-store" });
  }

  setCookie(c, cookieName, c.env.APP_PREVIEW_KEY ?? "", {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  c.header("cache-control", "no-store");
  c.header("referrer-policy", "no-referrer");
  return c.redirect(new URL("/api/dev/sign-in?as=learner", c.env.PRODUCT_URL).toString(), 303);
}
