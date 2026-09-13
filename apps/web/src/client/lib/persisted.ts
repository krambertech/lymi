import { clearCardImages } from "./card-images";

/**
 * What the client keeps for one learner: in localStorage, the query cache that survives
 * reloads and offline starts, the outbox of grades made offline, how many cards the learner
 * has revealed while the reveal hint still counts, and the local-only marker of which persona
 * the developer last became; in Cache Storage, the card pictures kept for offline review.
 * All of it belongs to whoever was signed in,
 * so it is cleared when the learner changes: on sign-out, and before any sign-in starts.
 * A grade still waiting in the outbox at sign-out is dropped with it; it could only ever
 * have belonged to the learner who left.
 */
const KEYS = ["lymi-query-cache", "lymi-outbox", "lymi-reveals", "lymi-dev-persona"];

export function clearPersistedLearnerState(): void {
  try {
    for (const key of KEYS) localStorage.removeItem(key);
  } catch {}
  void clearCardImages().catch(() => undefined);
}
