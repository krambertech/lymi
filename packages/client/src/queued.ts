import { clientConfig } from "./config";

/** Grades waiting to send, and whose they are; each queued write is kept under `WRITE_PREFIX`. */
export const OUTBOX_KEY = "lymi-outbox";
export const QUEUED_FOR_KEY = "lymi-queued-for";
export const WRITE_PREFIX = "lymi-writes:";

/** Keeps the outboxes for the learner now signed in, and drops them if they were another's. */
export function claimQueued(userId: string): void {
  const { storage } = clientConfig();
  try {
    const owner = storage.getItem(QUEUED_FOR_KEY);
    if (owner && owner !== userId) {
      storage.removeItem(OUTBOX_KEY);
      removeQueuedWrites();
    }
    storage.setItem(QUEUED_FOR_KEY, userId);
  } catch {}
}

/** Drops both outboxes and their owner, for a sign-out that leaves nothing behind. */
export function dropQueued(): void {
  const { storage } = clientConfig();
  try {
    storage.removeItem(OUTBOX_KEY);
    storage.removeItem(QUEUED_FOR_KEY);
    removeQueuedWrites();
  } catch {}
}

function removeQueuedWrites() {
  const { storage } = clientConfig();
  for (const name of storage.keys()) {
    if (name.startsWith(WRITE_PREFIX)) storage.removeItem(name);
  }
}
