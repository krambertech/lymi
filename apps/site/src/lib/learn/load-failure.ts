let failed = false;
const listeners = new Set<() => void>();

export function reportLoadFailure(): void {
  failed = true;
  for (const listener of listeners) listener();
}

export function subscribeToLoadFailure(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const loadFailed = (): boolean => failed;
