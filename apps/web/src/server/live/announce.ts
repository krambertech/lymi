import type { Bindings } from "../env";

type LiveEnv = Partial<Pick<Bindings, "LIVE">>;

/** Tells the learner's other tabs that something changed. A failure never fails the write. */
export async function announce(env: LiveEnv, userId: string, fromTab?: string | null) {
  if (!env.LIVE) return;
  try {
    await env.LIVE.getByName(userId).changed(fromTab || null);
  } catch (error) {
    console.error("Live announce failed", { error: error instanceof Error ? error.name : error });
  }
}

/** Opens a tab's WebSocket on the learner's channel. */
export function connect(env: Pick<Bindings, "LIVE">, userId: string, request: Request) {
  return env.LIVE.getByName(userId).fetch(request);
}
