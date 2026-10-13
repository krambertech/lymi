import { useLingui } from "@lingui/react/macro";
import { decksQuery } from "@lymi/client/queries";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { API_URL, sessionHeaders } from "../auth/client";
import { CAPTURE_KEYS, captureStore } from "../data/kept";

/** The app group Share to Lymi reads from, which expo-widgets already names after the app. */
const GROUP = `group.${Constants.expoConfig?.ios?.bundleIdentifier}`;
/** The keychain item the share extension reads: `apps/mobile/targets/share/Shared.swift`. */
const ITEM = { key: "state", options: { keychainService: "lymi-share", accessGroup: GROUP } };

/**
 * What Share to Lymi needs to add a card without opening the app. The extension cannot run
 * Lingui, so the app formats its strings, with `{term}` and `{deck}` left for it to fill.
 */
export interface ShareState {
  v: 1;
  apiUrl: string;
  /** The session cookie and this release's name; null while signed out. */
  headers: Record<string, string> | null;
  /** The decks the learner owns, the only ones they can add to, in their order. */
  decks: { id: string; name: string }[];
  /** The deck Add a word used last. */
  deckId: string | null;
  enrich: boolean;
  strings: Record<string, string>;
}

function useShareStrings(): Record<string, string> {
  const { t } = useLingui();
  const term = "{term}";
  const deck = "{deck}";
  return {
    close: t`Close`,
    add: t`Add to ${deck}`,
    deck: t`Deck`,
    term: t`Term`,
    meaning: t`Meaning`,
    meaningByAi: t`Leave it empty and the AI fills it in`,
    meaningByHand: t`What it means`,
    source: t`Source`,
    aiOn: t`AI fills in`,
    aiOff: t`AI off`,
    aiLabel: t`Fill in the rest with AI`,
    moved: t`Moved to ${deck}, the deck for this language`,
    added: t`Added “${term}” to ${deck}`,
    skipped: t`“${term}” is already in ${deck}`,
    signedOut: t`Open Lymi and sign in to add words from other apps.`,
    noDecks: t`Create a deck on the web first, then add cards here.`,
    noText: t`Select a word or phrase, then share it to Lymi.`,
    unreachable: t`Lymi can’t be reached. Check your connection and try again.`,
    update: t`Update Lymi to add words from other apps.`,
    failed: t`That didn’t work. Try again.`,
  };
}

function write(state: ShareState) {
  SecureStore.setItemAsync(ITEM.key, JSON.stringify(state), ITEM.options).catch((e: unknown) =>
    console.warn("share state", e),
  );
}

/**
 * Keeps Share to Lymi's copy of the session, the decks and its strings current. Signed out, it
 * keeps only the strings, so the sheet can say to sign in.
 */
export function ShareSync({ signedIn }: { signedIn: boolean }) {
  const strings = useShareStrings();
  const decks = useQuery({ ...decksQuery, enabled: signedIn });
  const [active, setActive] = useState(0);
  const [deckId, setDeckId] = useState(() => captureStore.getString(CAPTURE_KEYS.deck) ?? null);
  const [enrich, setEnrich] = useState(() => captureStore.getBoolean(CAPTURE_KEYS.enrich) ?? true);

  // The session cookie is refreshed while the app runs, so it is copied again on each return.
  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      (s) => s === "active" && setActive((n) => n + 1),
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const listener = captureStore.addOnValueChangedListener((key) => {
      if (key === CAPTURE_KEYS.deck) setDeckId(captureStore.getString(key) ?? null);
      if (key === CAPTURE_KEYS.enrich) setEnrich(captureStore.getBoolean(key) ?? true);
    });
    return () => listener.remove();
  }, []);

  const owned = signedIn
    ? (decks.data ?? [])
        .filter((d) => d.role === "owner" && !d.archivedAt)
        .map((d) => ({ id: d.id, name: d.name }))
    : [];
  const decksKey = JSON.stringify(owned);
  const loaded = decks.data !== undefined;
  const stringsKey = JSON.stringify(strings);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `active` asks for a fresh cookie.
  useEffect(() => {
    let live = true;
    const base = {
      v: 1 as const,
      apiUrl: API_URL,
      decks: JSON.parse(decksKey) as ShareState["decks"],
      deckId,
      enrich,
      strings: JSON.parse(stringsKey) as Record<string, string>,
    };
    if (!signedIn) {
      write({ ...base, headers: null });
      return;
    }
    // Until the decks arrive the sheet would say there are none.
    if (!loaded) return;
    void sessionHeaders().then((headers) => {
      if (live) write({ ...base, headers: headers.cookie ? headers : null });
    });
    return () => {
      live = false;
    };
  }, [signedIn, loaded, decksKey, stringsKey, deckId, enrich, active]);

  return null;
}
