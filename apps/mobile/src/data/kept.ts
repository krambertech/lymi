import { createMMKV } from "react-native-mmkv";

// Everything the phone keeps between launches, in one place so signing out can find it all.

/** The grade and write outboxes, by the keys `@lymi/client` gives them. */
export const outboxStore = createMMKV({ id: "lymi-outboxes" });

/** The app language chosen on this phone, until the account's setting arrives. */
export const languageStore = createMMKV({ id: "lymi-language" });
export const LANGUAGE_KEY = "language";

/** Add a word's choices that carry over to the next card. */
export const captureStore = createMMKV({ id: "lymi-capture" });
export const CAPTURE_KEYS = { deck: "deck", enrich: "enrich" } as const;

/** The day Today's rest-day banner was closed on, so it stays away until that day ends. */
export const todayStore = createMMKV({ id: "lymi-today" });
export const REST_DISMISSED_KEY = "rest-dismissed";
