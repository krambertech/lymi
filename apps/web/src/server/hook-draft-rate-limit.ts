import type { MiddlewareHandler } from "hono";
import { type Budget, count, tooManyRequests, windowFull } from "./auth-rate-limit";
import type { AppEnv } from "./index";

/** Per learner and hour: far above anyone writing hooks by hand, a ceiling on what a loop could spend. */
const LEARNER: Budget = { max: 60, window: 60 * 60 };

/** Meters hook drafts, which each cost a model call and are never cached. Only a draft that came back counts. */
export const limitHookDrafts: MiddlewareHandler<AppEnv> = async (c, next) => {
  const key = `ratelimit:hook-drafts:${c.get("user").id}`;
  const full = await windowFull(c.env.SESSIONS, key, LEARNER);
  if (full !== null) return tooManyRequests(full);
  await next();
  if (c.res.ok) await count(c.env.SESSIONS, key, LEARNER);
};
