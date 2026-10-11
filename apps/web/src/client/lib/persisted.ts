import { dropQueued } from "@lymi/client/queued";
import { clearCardImages } from "./card-images";
import { clearQueryCache } from "./query-persister";

/**
 * What the client keeps for one learner: in IndexedDB, the query cache that survives reloads and
 * offline starts; in localStorage, the outboxes of grades and of card and deck writes made offline, whose they
 * are, how many cards the learner has revealed while the reveal hint still counts, the deck a card
 * was last added to, the day the rest-day banner was dismissed, and the local-only marker of which persona the developer last became; in
 * Cache Storage, the card pictures kept for offline review. All of it belongs to whoever was
 * signed in, so it is cleared when the learner changes: on sign-out, and before any sign-in starts.
 */
const KEYS = [
  "lymi-reveals",
  "lymi-dev-persona",
  "lymi-last-deck",
  "lymi-create-more",
  "lymi-rest-dismissed",
];

/**
 * A sign-in keeps the outboxes, because a session that lapsed offline must not cost the learner
 * what they did; `claimQueued` drops them once the account turns out to be someone else's.
 */
export function clearPersistedLearnerState(opts: { keepQueued?: boolean } = {}): void {
  try {
    for (const key of KEYS) localStorage.removeItem(key);
  } catch {}
  if (!opts.keepQueued) dropQueued();
  void clearQueryCache();
  void clearCardImages().catch(() => undefined);
}
