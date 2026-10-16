// Joining straight after sign-in is the app's own promise, never the link's: a link that asked for
// it could join a signed-in learner to any deck without a tap. The web keeps it in a cookie only
// its own page can set, for the same reason.

/** A promise older than this is let go, as a held link is. */
const KEEP_MS = 60 * 60_000;

let promised: { key: string; at: number } | null = null;

/** Join or Add to Library, pressed signed out, promises the learner, before the door, that this link joins once they are in. */
export function promiseJoin(key: string, now = Date.now()) {
  promised = { key, at: now };
}

/** Whether this link is on its way back from sign-in to join, without taking the promise. */
export function isPromised(key: string, now = Date.now()): boolean {
  return !!promised && promised.key === key && now - promised.at < KEEP_MS;
}

/** True once, for the link the learner pressed Join or Add to Library on while signed out. */
export function takeJoin(key: string, now = Date.now()): boolean {
  const kept = promised;
  if (!kept || kept.key !== key || now - kept.at >= KEEP_MS) return false;
  promised = null;
  return true;
}
