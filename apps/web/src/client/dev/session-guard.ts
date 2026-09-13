/**
 * Local development only. The query cache persists in localStorage across reloads, which is
 * right for one learner and wrong the moment the developer becomes another one: Today would
 * hydrate the previous persona's decks and name until each query refetched. The dev sign-in
 * sets a dev persona cookie; when it differs from the one last seen here, the cache
 * and the offline outbox are thrown away before the app mounts. Sign-out and the ordinary
 * sign-in paths clear the same state through `clearPersistedLearnerState`, so a real
 * account signed in after a persona never sees the persona's data either.
 */
import { devPersonaCookieName } from "../../shared/cookies";
import { clearPersistedLearnerState } from "../lib/persisted";

const SEEN_KEY = "lymi-dev-persona";

export function guardPersistedCache(): void {
  const name = devPersonaCookieName(window.location.origin);
  const current =
    document.cookie
      .split(/;\s*/)
      .find((pair) => pair.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? "";
  try {
    const seen = localStorage.getItem(SEEN_KEY) ?? "";
    if (seen === current) return;
    clearPersistedLearnerState();
    localStorage.setItem(SEEN_KEY, current);
  } catch {}
}
