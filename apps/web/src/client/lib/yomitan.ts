import type { ApiKeySummary } from "./api";

/** The name Settings gives the key it makes for Yomitan, so the row and the page can find it. */
export const YOMITAN_KEY_NAME = "Yomitan";

/** The audit client the server records a Yomitan key's AnkiConnect writes under, for its Activity. */
export const YOMITAN_ACTIVITY_APP = `anki-connect:${YOMITAN_KEY_NAME}`;

/** The newest key named for Yomitan, which is the one Yomitan most likely holds. */
export function yomitanKey(keys: readonly ApiKeySummary[] | undefined): ApiKeySummary | null {
  const named = (keys ?? []).filter((k) => k.name === YOMITAN_KEY_NAME);
  return named.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}
