import { dropQueued } from "@lymi/client/queued";
import { clearCardImages } from "./card-images";
import { clearQueryCache } from "./query-persister";
import {
  ASSISTANT_OFFER_KEY,
  CREATE_MORE_KEY,
  DEV_PERSONA_KEY,
  FIRST_REVIEW_KEY,
  LAST_DECK_KEY,
  REST_DISMISSED_KEY,
  REVEALS_KEY,
} from "./storage-keys";

/**
 * What the client keeps for one learner: in IndexedDB, the query cache that survives reloads and
 * offline starts; in localStorage, the outboxes of grades and of card and deck writes made offline, whose they
 * are, how many cards the learner has revealed while the reveal nudge still counts, the deck a card
 * was last added to, the day the rest-day banner was dismissed, whether the offer to connect an AI assistant was, and the local-only marker of which persona the developer last became; in sessionStorage, the first review under way in this tab and its cards; in
 * Cache Storage, the card pictures kept for offline review. All of it belongs to whoever was
 * signed in, so it is cleared when the learner changes: on sign-out, and before any sign-in starts.
 */
const KEYS = [
  REVEALS_KEY,
  DEV_PERSONA_KEY,
  LAST_DECK_KEY,
  CREATE_MORE_KEY,
  REST_DISMISSED_KEY,
  ASSISTANT_OFFER_KEY,
];

/**
 * A sign-in keeps the outboxes, because a session that lapsed offline must not cost the learner
 * what they did; `claimQueued` drops them once the account turns out to be someone else's.
 */
export function clearPersistedLearnerState(opts: { keepQueued?: boolean } = {}): void {
  try {
    for (const key of KEYS) localStorage.removeItem(key);
  } catch {}
  try {
    // components/first-plan.tsx writes it; it would otherwise let the next account resume this one's first review.
    sessionStorage.removeItem(FIRST_REVIEW_KEY);
  } catch {}
  if (!opts.keepQueued) dropQueued();
  void clearQueryCache();
  void clearCardImages().catch(() => undefined);
}
