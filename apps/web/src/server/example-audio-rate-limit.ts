import type { Context } from "hono";
import { type Budget, count, windowFull } from "./auth-rate-limit";
import type { AppEnv } from "./index";

/** New example clips a learner can have made in a day; a stored clip plays free. */
const LEARNER: Budget = { max: 100, window: 24 * 60 * 60 };

/** What a learner has left of today's new example clips, spent only by a clip that was stored. */
export interface ExampleAllowance {
  /** The seconds to wait once today's clips are spent, or null while some are left. */
  left(): Promise<number | null>;
  spend(): Promise<void>;
}

export function exampleAudioAllowance(c: Context<AppEnv>): ExampleAllowance {
  const key = `ratelimit:example-audio:user:${c.get("user").id}`;
  return {
    left: async () => {
      const full = await windowFull(c.env.SESSIONS, key, LEARNER);
      if (full !== null) console.warn(JSON.stringify({ event: "example_audio_budget_spent" }));
      return full;
    },
    spend: () => count(c.env.SESSIONS, key, LEARNER),
  };
}
