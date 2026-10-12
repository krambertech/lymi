import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api } from "@lymi/client/api";
import { exploreQuery } from "@lymi/client/queries";
import { type ExploreOut, type Shelf, shelvesOf } from "@lymi/core/catalog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { API_URL } from "../auth/client";
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

export function useShelfLabel() {
  const { i18n } = useLingui();
  return (shelf: Pick<Shelf, "key" | "language">) =>
    shelf.language
      ? languageName(shelf.language)
      : i18n._(SUBJECT_LABELS[shelf.key] ?? UNCATEGORISED_LABEL);
}

// Prototype only: the production catalogue as lymi.app/explore showed it on 12 Oct 2026, so the
// layouts can be judged at their real size while the local Worker holds one published deck.
const SAMPLE = require("./sample-catalogue.json") as ExploreOut;

/** Explore's catalogue grouped into shelves, and where its pictures load from. */
export function useCatalogue() {
  const query = useQuery(exploreQuery);
  const sample = __DEV__ && (query.data?.decks.length ?? 0) < 10;
  const data = sample ? SAMPLE : query.data;
  const [addedHere, setAddedHere] = useState<Record<string, string>>({});
  const shelves = useMemo(() => shelvesOf(data?.decks ?? []), [data]);
  return {
    shelves,
    added: { ...data?.added, ...addedHere },
    loading: !data && query.isPending,
    failed: !data && query.isError,
    retry: () => query.refetch(),
    imageBase: sample ? "https://my.lymi.app" : API_URL,
    sample,
    markAdded: (slug: string) => setAddedHere((a) => ({ ...a, [slug]: slug })),
  };
}

/** Adds a published deck in the edition the shelf showed; the sample only pretends. */
export function useAddDeck(sample: boolean, onAdded: (slug: string, deckId: string) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, edition }: { slug: string; edition: string }) => {
      if (sample) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        return { slug, deckId: slug };
      }
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
