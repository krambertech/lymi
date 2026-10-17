import { type MessageDescriptor, setupI18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { ApiError, api } from "@lymi/client/api";
import { exploreQuery } from "@lymi/client/queries";
import type { PublicationTag } from "@lymi/core";
import {
  type CatalogSearchNames,
  catalogSearchText,
  type PublicDeckSummary,
  type Shelf,
  shelvesOf,
} from "@lymi/core/catalog";
import { onlineManager, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { englishLanguageName, languageName } from "../data/languages";
import { messages as en } from "../locales/en.po";
import { fold } from "./fold";

/** A heading per subject, as the web's; each app extracts its own catalogue. */
const SUBJECT_LABELS: Record<string, MessageDescriptor> = {
  geography: msg`Geography`,
  science: msg`Science`,
  nature: msg`Nature`,
  arts: msg`Arts`,
  driving: msg`Driving`,
  citizenship: msg`Citizenship`,
  technology: msg`Technology`,
  work: msg`Work and study`,
};
const UNCATEGORISED_LABEL = msg`More decks`;

export function useShelfLabel() {
  const { i18n } = useLingui();
  return (shelf: Pick<Shelf, "key" | "language">) =>
    shelf.language
      ? languageName(shelf.language)
      : i18n._(SUBJECT_LABELS[shelf.key] ?? UNCATEGORISED_LABEL);
}

/**
 * The shelf's name in its lymi.app address, such as "german". Core names a language through
 * Intl.DisplayNames, which Hermes lacks, so the phone spells it from its own English list.
 */
export function shelfAddressName(shelf: Pick<Shelf, "key" | "language">): string {
  if (!shelf.language) return shelf.key;
  return englishLanguageName(shelf.language)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * A label per tag on a published deck, as the web's. Exam names are proper names and read the same
 * in every language; the catalogue carries them anyway so a translator can add a word around one.
 */
const TAG_LABELS: Record<PublicationTag, MessageDescriptor> = {
  "core-words": msg({ message: "Core vocabulary", context: "deck tag" }),
  conversation: msg({ message: "Conversation", context: "deck tag" }),
  travel: msg({ message: "Travel", context: "deck tag" }),
  alphabet: msg({ message: "Alphabet", context: "deck tag" }),
  grammar: msg({ message: "Grammar", context: "deck tag" }),
  beginner: msg({ message: "For beginners", context: "deck tag" }),
  "exam-goethe-a1": msg({ message: "Goethe-Zertifikat A1", context: "deck tag" }),
  "exam-hsk-1": msg({ message: "HSK 1", context: "deck tag" }),
  "exam-topik-1": msg({ message: "TOPIK I", context: "deck tag" }),
  "exam-jlpt-n5": msg({ message: "JLPT N5", context: "deck tag" }),
  "exam-leben-in-deutschland": msg({ message: "Leben in Deutschland test", context: "deck tag" }),
  "exam-us-civics": msg({ message: "US civics test", context: "deck tag" }),
  "exam-ccse": msg({ message: "CCSE Spanish nationality test", context: "deck tag" }),
  "exam-czech-citizenship": msg({ message: "Czech citizenship test", context: "deck tag" }),
  "exam-canadian-citizenship": msg({ message: "Canadian citizenship test", context: "deck tag" }),
  "exam-us-dmv": msg({ message: "DMV written test", context: "deck tag" }),
};

/** English beside the app's language, so a tag or a shelf can be searched by its English name too. */
const english = setupI18n({ locale: "en", messages: { en } });

/** A tag's label in the app's language, or null for a tag this release does not know yet. */
export function useTagLabel() {
  const { i18n } = useLingui();
  return (tag: string) => {
    const label = TAG_LABELS[tag as PublicationTag];
    return label ? i18n._(label) : null;
  };
}

function words(query: string) {
  return fold(query).split(/\s+/).filter(Boolean);
}

/**
 * Explore's search: decks whose shared search text (core's `catalogSearchText`) holds every word,
 * names that match first, and shelves whose name holds every word in the app's language or English.
 */
export function useCatalogueSearch(shelves: Shelf[], query: string) {
  const { i18n } = useLingui();
  const label = useShelfLabel();
  const tag = useTagLabel();
  const texts = useMemo(() => {
    const names: CatalogSearchNames = {
      language: (code) => languageName(code),
      englishLanguage: (code) => englishLanguageName(code),
      subject: (key) => (SUBJECT_LABELS[key] ? i18n._(SUBJECT_LABELS[key]) : null),
      tag,
      englishTag: (key) => (TAG_LABELS[key] ? english._(TAG_LABELS[key]) : null),
    };
    const out = new Map<string, string>();
    for (const shelf of shelves)
      for (const deck of shelf.decks)
        out.set(deck.slug, fold(catalogSearchText(deck, names, i18n.locale)));
    return out;
  }, [shelves, i18n, tag]);
  return useMemo(() => {
    const asked = words(query);
    if (asked.length === 0) return { shelves: [], decks: [] };
    const named: PublicDeckSummary[] = [];
    const rest: PublicDeckSummary[] = [];
    for (const shelf of shelves) {
      for (const deck of shelf.decks) {
        const text = texts.get(deck.slug) ?? "";
        if (!asked.every((word) => text.includes(word))) continue;
        const name = fold(deck.name);
        (asked.every((word) => name.includes(word)) ? named : rest).push(deck);
      }
    }
    const found = shelves.filter((shelf) => {
      const name = fold(
        [label(shelf), shelf.language ? englishLanguageName(shelf.language) : ""].join(" "),
      );
      return asked.every((word) => name.includes(word));
    });
    return { shelves: found, decks: [...named, ...rest] };
  }, [shelves, texts, query, label]);
}

/** Explore's catalogue grouped into shelves, and the decks already in Library. */
export function useCatalogue() {
  const query = useQuery(exploreQuery);
  const data = query.data;
  const shelves = useMemo(() => shelvesOf(data?.decks ?? []), [data]);
  return {
    shelves,
    added: data?.added ?? {},
    loading: !data && query.isPending,
    failed: !data && query.isError,
    retrying: query.isFetching,
    retry: () => query.refetch(),
  };
}

/**
 * Adds a published deck in the edition its page showed; the edition is pinned on the membership.
 * As on the web, the cached queue goes so the next review draws the deck's cards too.
 */
export function useAddDeck(onAdded: (slug: string, deckId: string) => void) {
  const client = useQueryClient();
  return useMutation({
    // Adding needs a connection: offline it fails at once and says so, rather than waiting paused
    // behind a spinner that a quit would lose.
    networkMode: "always",
    mutationFn: async ({ slug, edition }: { slug: string; edition: string }) => {
      if (!onlineManager.isOnline()) throw new Offline();
      const out = await api.addPublishedDeck(slug, edition);
      return { slug, deckId: out.deckId };
    },
    onSuccess: async ({ slug, deckId }) => {
      onAdded(slug, deckId);
      client.removeQueries({ queryKey: ["queue"] });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["decks"] }),
        client.invalidateQueries({ queryKey: exploreQuery.queryKey }),
        client.invalidateQueries({ queryKey: ["rounds"] }),
      ]);
    },
  });
}

class Offline extends Error {}

/** Why an add failed, in the web's words, or that adding needs a connection. */
export function useAddFailure() {
  const { t } = useLingui();
  return (error: unknown) =>
    error instanceof Offline
      ? t`Adding a deck needs a connection. Connect and try again.`
      : error instanceof ApiError && error.status === 404
        ? t`Couldn’t add the deck. It’s no longer published.`
        : t`Couldn’t add the deck. Check your connection and try again.`;
}
