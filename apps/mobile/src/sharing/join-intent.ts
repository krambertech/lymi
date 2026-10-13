// Joining straight after sign-in is the app's own promise, never the link's: a link that asked for
// it could join a signed-in learner to any deck without a tap. The web keeps it in a cookie only
// its own page can set, for the same reason.

/** A promise older than this is let go, as a held link is. */
const KEEP_MS = 60 * 60_000;

let promised: { key: string; at: number } | null = null;

/** "Sign in to join" promises the learner, before the door, that this link joins once they are in. */
export function promiseJoin(key: string, now = Date.now()) {
  promised = { key, at: now };
}

/** True once, for the link the learner pressed "Sign in to join" on. */
export function takeJoin(key: string, now = Date.now()): boolean {
  const kept = promised;
  if (!kept || kept.key !== key || now - kept.at >= KEEP_MS) return false;
  promised = null;
  return true;
}
