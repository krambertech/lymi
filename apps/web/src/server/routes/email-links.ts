import { Hono } from "hono";
import { readUnsubscribeLink } from "../email/links";
import { describe } from "../http";
import type { AppEnv } from "../index";
import { readFlip, stopLearningEmails } from "../services";

/**
 * What an email links to. The links are signed, so these sit before the session check: most
 * readers open them on a phone with no session. Reading changes nothing, because mail scanners
 * follow every link; stopping takes a POST.
 */
export const emailLinks = new Hono<AppEnv>();

emailLinks.get("/flip/:token", describe({ hide: true, open: true }), async (c) => {
  const session = await c.get("auth").api.getSession({ headers: c.req.raw.headers });
  const view = await readFlip(c.env, c.get("db"), c.req.param("token"), session?.user.id ?? null);
  c.header("cache-control", "no-store");
  return c.json(view, view.status === "invalid" ? 404 : 200);
});

/** RFC 8058's one-click POST, and the footer page's button. */
emailLinks.post("/unsubscribe/:token", describe({ hide: true, open: true }), async (c) => {
  const link = await readUnsubscribeLink(c.env.BETTER_AUTH_SECRET, c.req.param("token"));
  if (!link) return c.json({ error: "This link isn’t valid." }, 404);
  const form = c.req.header("content-type")?.includes("form") ? await c.req.text() : "";
  const via = form.includes("One-Click") ? "one_click" : "footer";
  await stopLearningEmails(c.env, c.get("db"), link.user, link.kind, via);
  return c.json({ ok: true });
});
