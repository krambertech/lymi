import { clearCardImages } from "./card-images";

/**
 * What the client keeps for one learner: in localStorage, the query cache that survives reloads
 * and offline starts, the outboxes of grades and of card and deck writes made offline, whose they
 * are, how many cards the learner has revealed while the reveal hint still counts, the deck a card
 * was last added to, and the local-only marker of which persona the developer last became; in
 * Cache Storage, the card pictures kept for offline review. All of it belongs to whoever was
 * signed in, so it is cleared when the learner changes: on sign-out, and before any sign-in starts.
 */
/** Grades waiting to send, whose they are, and each queued write under `lymi-writes:<key>`. */
const QUEUED = ["lymi-outbox", "lymi-queued-for"];
export const WRITE_PREFIX = "lymi-writes:";
const KEYS = [
  "lymi-query-cache",
  ...QUEUED,
  "lymi-reveals",
  "lymi-dev-persona",
  "lymi-last-deck",
  "lymi-create-more",
];

/**
 * A sign-in keeps the outboxes, because a session that lapsed offline must not cost the learner
 * what they did; `claimQueued` drops them once the account turns out to be someone else's.
 */
export function clearPersistedLearnerState(opts: { keepQueued?: boolean } = {}): void {
  try {
    for (const key of KEYS) {
      if (!(opts.keepQueued && QUEUED.includes(key))) localStorage.removeItem(key);
    }
    if (!opts.keepQueued) removeQueuedWrites();
  } catch {}
  void clearCardImages().catch(() => undefined);
}

/** Keeps the outboxes for the learner now signed in, and drops them if they were another's. */
export function claimQueued(userId: string): void {
  try {
    const owner = localStorage.getItem("lymi-queued-for");
    if (owner && owner !== userId) {
      localStorage.removeItem("lymi-outbox");
      removeQueuedWrites();
    }
    localStorage.setItem("lymi-queued-for", userId);
  } catch {}
}

function removeQueuedWrites() {
  const names: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const name = localStorage.key(i);
    if (name?.startsWith(WRITE_PREFIX)) names.push(name);
  }
  for (const name of names) localStorage.removeItem(name);
}
