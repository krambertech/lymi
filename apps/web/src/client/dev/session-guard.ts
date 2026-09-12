/**
 * Local development only. The query cache persists in localStorage across reloads, which is
 * right for one learner and wrong the moment the developer becomes another one: Today would
 * hydrate the previous persona's decks and name until each query refetched. The dev sign-in
 * sets a `lymi_dev_persona` cookie; when it differs from the one last seen here, the cache
 * and the offline outbox are thrown away before the app mounts.
 */
const SEEN_KEY = "lymi-dev-persona";
const PERSISTED = ["lymi-query-cache", "lymi-outbox"];

export function guardPersistedCache(): void {
  const current = /(?:^|;\s*)lymi_dev_persona=([^;]*)/.exec(document.cookie)?.[1] ?? "";
  try {
    const seen = localStorage.getItem(SEEN_KEY) ?? "";
    if (seen === current) return;
    for (const key of PERSISTED) localStorage.removeItem(key);
    localStorage.setItem(SEEN_KEY, current);
  } catch {}
}

/** Called before navigating to a sign-in URL, so the persister cannot write the old cache back. */
export function forgetPersistedCache(): void {
  try {
    for (const key of PERSISTED) localStorage.removeItem(key);
    localStorage.removeItem(SEEN_KEY);
  } catch {}
}
