import { useSyncExternalStore } from "react";

/** The Worker no longer serves this phone release: where the new one comes from, if it said. */
export type UpdateRequired = { updateUrl: string | null };

let current: UpdateRequired | null = null;
const listeners = new Set<() => void>();

/** Set by the first 426; it lasts until the app restarts as a newer release. */
export function requireUpdate(state: UpdateRequired) {
  if (current) return;
  current = state;
  for (const listener of listeners) listener();
}

export function updateRequired(): UpdateRequired | null {
  return current;
}

export function subscribeUpdateRequired(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUpdateRequired(): UpdateRequired | null {
  return useSyncExternalStore(subscribeUpdateRequired, updateRequired, updateRequired);
}

/** For tests: forget a 426, as a restart on a newer release does. */
export function resetUpdateRequired() {
  current = null;
}
