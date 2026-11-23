let failed = false;
const listeners = new Set<() => void>();

export function reportLoadFailure(): void {
  failed = true;
  for (const listener of listeners) listener();
}

export function subscribeToLoadFailure(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("astro:hydration-error", reportLoadFailure);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0)
      window.removeEventListener("astro:hydration-error", reportLoadFailure);
  };
}

export const loadFailed = (): boolean => failed;

const CODE = /\/_astro\/[^?]+\.js/;
const REFETCH_MS = 4000;

export async function reloadAfterFailure(): Promise<void> {
  const code = performance
    .getEntriesByType("resource")
    .map(({ name }) => name)
    .filter((name) => CODE.test(name));
  const refetchedPastTheBrowserCache = Promise.allSettled(
    code.map((url) => fetch(url, { cache: "reload" })),
  );
  const timeout = new Promise((resolve) => setTimeout(resolve, REFETCH_MS));
  await Promise.race([refetchedPastTheBrowserCache, timeout]);
  window.location.reload();
}
