import { EMAIL_KINDS } from "@lymi/core/analytics";
import { Hono } from "hono";
import { deliveryProblem, verifyResendWebhook } from "../email/resend";
import { describe } from "../http";
import type { AppEnv } from "../index";
import { trackProductEvent } from "../posthog";
import { accountIdForEmail } from "../services";
import { analyticsContextFor } from "../services/analytics-context";

/**
 * Resend's delivery webhook. It is signed rather than authenticated, so it sits before the
 * session check, and it answers 404 until `RESEND_WEBHOOK_SECRET` is configured.
 */
export const emailEvents = new Hono<AppEnv>();

/** True when this delivery id was already handled; storage trouble lets the event through. */
async function seenBefore(sessions: KVNamespace | undefined, id: string): Promise<boolean> {
  if (!sessions || !id) return false;
  const key = `email-event:${id}`;
  try {
    if (await sessions.get(key)) return true;
    await sessions.put(key, "1", { expirationTtl: 60 * 60 * 24 * 3 });
  } catch {}
  return false;
}

const isKind = (kind: string | null): kind is (typeof EMAIL_KINDS)[number] =>
  (EMAIL_KINDS as readonly (string | null)[]).includes(kind);

emailEvents.post("/", describe({ hide: true, open: true }), async (c) => {
  const secret = c.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return c.json({ error: "Not found" }, 404);
  const raw = await c.req.text();
  const signed = await verifyResendWebhook(
    secret,
    {
      id: c.req.header("svix-id") ?? null,
      timestamp: c.req.header("svix-timestamp") ?? null,
      signature: c.req.header("svix-signature") ?? null,
    },
    raw,
  );
  if (!signed) return c.json({ error: "Invalid signature" }, 401);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const problem = deliveryProblem(body);
  if (!problem) return c.json({ ok: true });
  // Resend retries a delivery it is unsure of under the same id; count each event once.
  if (await seenBefore(c.env.SESSIONS, c.req.header("svix-id") ?? "")) return c.json({ ok: true });

  const kind = isKind(problem.kind) ? problem.kind : undefined;
  console.error(JSON.stringify({ event: `email_${problem.type}`, kind: kind ?? "unknown" }));
  const db = c.get("db");
  for (const address of problem.to) {
    const userId = await accountIdForEmail(db, address);
    if (!userId) continue;
    c.executionCtx.waitUntil(
      trackProductEvent(
        c.env,
        userId,
        { name: problem.type === "bounced" ? "email_bounced" : "email_complained", kind },
        undefined,
        analyticsContextFor(db, userId),
      ),
    );
  }
  return c.json({ ok: true });
});
