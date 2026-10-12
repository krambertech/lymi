import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api } from "@lymi/client/api";
import { exploreQuery } from "@lymi/client/queries";
import { type PublicDeckSummary, type Shelf, shelvesOf } from "@lymi/core/catalog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { languageName } from "../data/languages";

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

/** Languages a published deck teaches that the phone's own list of offered languages leaves out. */
const MORE_LANGUAGES: Record<string, string> = { ka: "Georgian" };

function shelfLanguage(tag: string) {
  return MORE_LANGUAGES[tag] ?? languageName(tag);
}

export function useShelfLabel() {
  const { i18n } = useLingui();
  return (shelf: Pick<Shelf, "key" | "language">) =>
    shelf.language
      ? shelfLanguage(shelf.language)
      : i18n._(SUBJECT_LABELS[shelf.key] ?? UNCATEGORISED_LABEL);
}

/**
 * The shelf's name in its lymi.app address, such as "german". Core names a language through
 * Intl.DisplayNames, which Hermes lacks, so the phone takes the English name from its own list.
 */
export function shelfAddressName(shelf: Pick<Shelf, "key" | "language">): string {
  if (!shelf.language) return shelf.key;
  return shelfLanguage(shelf.language)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Lower case with the accents gone, so "cafe" finds "Café" and "zurich" finds "Zürich". */
function fold(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

/**
 * The decks every word of the query is somewhere in: the name, the summary, the card on the tray,
 * and the shelf it sits on, as the public page's search reads them. Names that match come first.
 */
export function searchDecks(
  shelves: Shelf[],
  query: string,
  label: (shelf: Shelf) => string,
): PublicDeckSummary[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const named: PublicDeckSummary[] = [];
  const rest: PublicDeckSummary[] = [];
  for (const shelf of shelves) {
    const shelfText = fold(label(shelf));
    for (const deck of shelf.decks) {
      const name = fold(deck.name);
      const all = [
        name,
        fold(deck.summary),
        fold(deck.card?.term ?? ""),
        fold(deck.card?.meaning ?? ""),
        shelfText,
      ].join(" ");
      if (!words.every((word) => all.includes(word))) continue;
      (words.every((word) => name.includes(word)) ? named : rest).push(deck);
    }
  }
  return [...named, ...rest];
}

/** The shelves whose name holds every word of the query, as "germ" finds German. */
export function searchShelves(shelves: Shelf[], query: string, label: (shelf: Shelf) => string) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return shelves.filter((shelf) => {
    const name = fold(label(shelf));
    return words.every((word) => name.includes(word));
  });
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
    retry: () => query.refetch(),
  };
}

/** Adds a published deck in the edition its page showed; the edition is pinned on the membership. */
export function useAddDeck(onAdded: (slug: string, deckId: string) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, edition }: { slug: string; edition: string }) => {
      const out = await api.addPublishedDeck(slug, edition);
      return { slug, deckId: out.deckId };
    },
    onSuccess: ({ slug, deckId }) => {
      onAdded(slug, deckId);
      client.invalidateQueries({ queryKey: exploreQuery.queryKey });
      client.invalidateQueries({ queryKey: ["decks"] });
    },
  });
}
