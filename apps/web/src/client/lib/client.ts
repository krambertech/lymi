import { t } from "@lingui/core/macro";
import { configureClient, type KeyValueStore } from "@lymi/client";

// Each method reaches localStorage itself, so a blocked one throws inside the outbox's own catch.
const browserStorage: KeyValueStore = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
  keys: () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? ""),
  subscribe(listener) {
    const onStorage = (e: StorageEvent) => listener(e.key);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  },
};

/** The web calls its own origin with the session cookie, and keeps the outboxes in localStorage. */
export function configureWebClient() {
  configureClient({
    storage: browserStorage,
    messages: {
      unreachable: () => t`Couldn’t reach Lymi. Check your connection and try again.`,
      signIn: () => t`Sign in to continue.`,
      ownerOnly: () => t`Only the deck’s owner can change this.`,
      gone: () => t`That’s no longer here. Reload to see what changed.`,
      failed: () => t`That didn’t go through. Reload and try again.`,
    },
  });
}
