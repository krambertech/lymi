import { createMMKV } from "react-native-mmkv";

// Everything the phone keeps between launches, in one place so signing out can find it all.

/** The grade and write outboxes, by the keys `@lymi/client` gives them. */
export const outboxStore = createMMKV({ id: "lymi-outboxes" });

/** The query cache as of the last sync, so a cold launch offline opens on it. ADR 0023. */
export const cacheStore = createMMKV({ id: "lymi-cache" });

/** The app language chosen on this phone, until the account's setting arrives. */
export const languageStore = createMMKV({ id: "lymi-language" });
export const LANGUAGE_KEY = "language";

/** Add a word's choices that carry over to the next card. */
export const captureStore = createMMKV({ id: "lymi-capture" });
export const CAPTURE_KEYS = { deck: "deck", enrich: "enrich" } as const;

/** The day Today's rest-day banner was closed on, so it stays away until that day ends. */
export const todayStore = createMMKV({ id: "lymi-today" });
export const REST_DISMISSED_KEY = "rest-dismissed";

/** This phone's own choices, which outlast a sign-out: the theme and the reminder time. */
export const deviceStore = createMMKV({ id: "lymi-device" });
export const DEVICE_KEYS = { theme: "theme", reminder: "reminder" } as const;

/** What the review has shown once on this phone, such as how to take back a grade. */
export const reviewStore = createMMKV({ id: "lymi-review" });
export const UNDO_HINT_KEY = "undo-hint";
