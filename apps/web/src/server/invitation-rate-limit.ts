import type { MiddlewareHandler } from "hono";
import { isLoopbackUrl } from "../shared/origins";
import { type Budget, count, tooManyRequests, windowFull } from "./auth-rate-limit";
import type { AppEnv } from "./index";

/** Per owner and day, well above a class and well under what a mailer would want. */
const OWNER: Budget = { max: 60, window: 24 * 60 * 60 };
/** Per address and day, whoever sends, so cancel-and-invite-again cannot flood a mailbox. */
const ADDRESS: Budget = { max: 3, window: 24 * 60 * 60 };

/**
 * Meters invitation sends. The pending cap bounds how many wait, not how many were sent, and
 * cancelling makes room, so sending has a budget of its own. Only a message that went out
 * counts: a refusal for an address already in the deck costs nothing.
 */
export const limitInvitationSends: MiddlewareHandler<AppEnv> = async (c, next) => {
  const checks = [{ key: `ratelimit:invitations:owner:${c.get("user").id}`, budget: OWNER }];
  // A local run invites the same few addresses all day; the owner budget still holds there.
  if (!isLoopbackUrl(c.env.PRODUCT_URL)) {
    const address = await addressOf(c.req.raw);
    if (address) checks.push({ key: `ratelimit:invitations:address:${address}`, budget: ADDRESS });
  }
  for (const { key, budget } of checks) {
    const full = await windowFull(c.env.SESSIONS, key, budget);
    if (full !== null) return tooManyRequests(full);
  }
  await next();
  if (c.res.status !== 201) return;
  for (const { key, budget } of checks) await count(c.env.SESSIONS, key, budget);
};

/** The address in the body, read from a clone so the validator still gets it. */
async function addressOf(request: Request): Promise<string | null> {
  try {
    const body = (await request.clone().json()) as { email?: unknown };
    return typeof body.email === "string" && body.email.trim()
      ? body.email.trim().toLowerCase().slice(0, 254)
      : null;
  } catch {
    return null;
  }
}
