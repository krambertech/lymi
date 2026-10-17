import type { Context } from "hono";
import { isLoopbackUrl } from "../shared/origins";
import { type Budget, count, windowFull } from "./auth-rate-limit";
import type { AppEnv } from "./index";

/** Per caller and hour, more than a visitor plays through a deck page and less than a crawl wants. */
const CALLER: Budget = { max: 30, window: 60 * 60 };
/** Across every caller and day, which caps what visitors can spend on voice calls. */
const EVERYONE: Budget = { max: 500, window: 24 * 60 * 60 };

/**
 * Meters the clips a public deck page makes on first play: the seconds to wait when a budget is
 * spent, or null after counting this one. Stored clips are free and never reach here. #759.
 */
export async function spendPublicAudio(c: Context<AppEnv>): Promise<number | null> {
  const checks = [{ key: "ratelimit:public-audio:everyone", budget: EVERYONE }];
  // Every loopback request arrives from one address, so a local run would count as one caller.
  if (!isLoopbackUrl(c.env.PRODUCT_URL)) {
    const caller = c.req.header("cf-connecting-ip") ?? "unknown";
    checks.push({ key: `ratelimit:public-audio:ip:${caller}`, budget: CALLER });
  }
  for (const { key, budget } of checks) {
    const full = await windowFull(c.env.SESSIONS, key, budget);
    if (full !== null) {
      const spent = budget === EVERYONE ? "everyone" : "caller";
      console.warn(JSON.stringify({ event: "public_audio_budget_spent", budget: spent }));
      return full;
    }
  }
  for (const { key, budget } of checks) await count(c.env.SESSIONS, key, budget);
  return null;
}
