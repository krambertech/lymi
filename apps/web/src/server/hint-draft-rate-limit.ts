import type { MiddlewareHandler } from "hono";
import { type Budget, count, tooManyRequests, windowFull } from "./auth-rate-limit";
import type { AppEnv } from "./index";

/** Per learner and hour: far above anyone writing hints by hand, a ceiling on what a loop could spend. */
const LEARNER: Budget = { max: 60, window: 60 * 60 };

/**
 * Meters hint drafts, which each cost a model call and are never cached. An ask counts before it
 * runs, so asks sent together cannot all slip past the check during the model's two seconds.
 */
export const limitHintDrafts: MiddlewareHandler<AppEnv> = async (c, next) => {
  const key = `ratelimit:hint-drafts:${c.get("user").id}`;
  const full = await windowFull(c.env.SESSIONS, key, LEARNER);
  if (full !== null) return tooManyRequests(full);
  await count(c.env.SESSIONS, key, LEARNER);
  await next();
};
