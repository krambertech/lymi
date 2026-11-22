import { useSyncExternalStore } from "react";

export type UpdateRequired = { updateUrl: string | null };

let current: UpdateRequired | null = null;
const listeners = new Set<() => void>();

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

export function resetUpdateRequired() {
  current = null;
}
