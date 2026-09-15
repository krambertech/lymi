import { useLingui } from "@lingui/react/macro";
import type { SeriesArchiveInput, SeriesInput } from "@lymi/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../components/ui/toast";
import { api, type DeckSummary, errorMessage, type Series } from "./api";
import { decksQuery, seriesQuery } from "./queries";

/**
 * Every series write the app makes, with the toasts that say what happened. Moves are applied to
 * the cached decks and series at once, so a dropped deck stays where it landed while the write
 * travels, and they snap back with an error if it fails.
 */
export function useSeriesActions() {
  const { t } = useLingui();
  const qc = useQueryClient();

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["decks"] }),
      qc.invalidateQueries({ queryKey: ["series"] }),
      qc.invalidateQueries({ queryKey: ["queue"] }),
    ]);

  /** Writes a move into the cache and returns what to put back if the server refuses it. */
  const place = async (seriesId: string | null, deckIds: readonly string[], replace: boolean) => {
    await Promise.all([
      qc.cancelQueries({ queryKey: decksQuery.queryKey }),
      qc.cancelQueries({ queryKey: seriesQuery.queryKey, exact: true }),
    ]);
    const decks = qc.getQueryData<DeckSummary[]>(decksQuery.queryKey);
    const series = qc.getQueryData<Series[]>(seriesQuery.queryKey);
    const moving = new Set(deckIds);
    const leaving = new Set(
      replace && seriesId
        ? (series?.find((s) => s.id === seriesId)?.deckIds ?? []).filter((id) => !moving.has(id))
        : [],
    );
    qc.setQueryData<DeckSummary[]>(decksQuery.queryKey, (prev) => {
      if (!prev) return prev;
      const next = prev.map((deck) =>
        moving.has(deck.id)
          ? { ...deck, seriesId }
          : leaving.has(deck.id)
            ? { ...deck, seriesId: null }
            : deck,
      );
      // The server puts a deck leaving a series last in Library, so the cache does too.
      const left = (deck: DeckSummary) =>
        leaving.has(deck.id) || (seriesId === null && moving.has(deck.id));
      return [...next.filter((deck) => !left(deck)), ...next.filter(left)];
    });
    qc.setQueryData<Series[]>(seriesQuery.queryKey, (prev) =>
      prev?.map((s) => {
        const others = s.deckIds.filter((id) => !moving.has(id));
        if (s.id !== seriesId) return { ...s, deckIds: others };
        return { ...s, deckIds: replace ? [...deckIds] : [...others, ...deckIds] };
      }),
    );
    return () => {
      qc.setQueryData(decksQuery.queryKey, decks);
      qc.setQueryData(seriesQuery.queryKey, series);
    };
  };

  const failed = (id: string, error: unknown) =>
    toast.add({ id, type: "error", title: errorMessage(error) });

  const create = useMutation({
    mutationFn: (input: SeriesInput) => api.createSeries(input),
    onSettled: refresh,
  });

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.renameSeries(id, name),
    onSettled: refresh,
  });

  const setDecks = useMutation({
    mutationFn: ({ id, deckIds }: { id: string; deckIds: string[]; quiet?: boolean }) =>
      api.setSeriesDecks(id, { deckIds }),
    onMutate: ({ id, deckIds }) => place(id, deckIds, true),
    // A form that shows its own error asks for quiet, so the failure is not said twice.
    onError: (error, { quiet }, undo) => {
      undo?.();
      if (!quiet) failed("series-decks", error);
    },
    onSettled: refresh,
  });

  const moveDeck = useMutation({
    mutationFn: ({ deck, seriesId }: { deck: DeckSummary; seriesId: string | null }) =>
      api.updateDeck(deck.id, { seriesId }),
    onMutate: async ({ deck, seriesId }) => {
      // The order the deck left, so Undo puts it back in its place rather than at the end.
      const left = deck.seriesId
        ? qc.getQueryData<Series[]>(seriesQuery.queryKey)?.find((s) => s.id === deck.seriesId)
            ?.deckIds
        : undefined;
      return { undo: await place(seriesId, [deck.id], false), left };
    },
    onSuccess: (_deck, { deck, seriesId }, context) => {
      const deckName = deck.name;
      const seriesName = seriesId
        ? (qc.getQueryData<Series[]>(seriesQuery.queryKey)?.find((s) => s.id === seriesId)?.name ??
          "")
        : undefined;
      const id = `move-${deck.id}`;
      toast.add({
        id,
        title:
          seriesName !== undefined
            ? t`Moved “${deckName}” to ${seriesName}`
            : t`Took “${deckName}” out of its series`,
        actionProps: {
          children: t`Undo`,
          onClick: () => {
            toast.close(id);
            if (deck.seriesId && context?.left) {
              setDecks.mutate({ id: deck.seriesId, deckIds: context.left });
            } else {
              moveDeck.mutate({ deck: { ...deck, seriesId }, seriesId: deck.seriesId });
            }
          },
        },
      });
    },
    onError: (error, _vars, context) => {
      context?.undo();
      failed("move-deck", error);
    },
    onSettled: refresh,
  });

  const reorder = useMutation({
    mutationFn: (seriesIds: string[]) => api.reorderSeries(seriesIds),
    onMutate: async (seriesIds) => {
      await qc.cancelQueries({ queryKey: seriesQuery.queryKey, exact: true });
      const before = qc.getQueryData<Series[]>(seriesQuery.queryKey);
      const byId = new Map((before ?? []).map((s) => [s.id, s]));
      qc.setQueryData<Series[]>(
        seriesQuery.queryKey,
        seriesIds.flatMap((id) => byId.get(id) ?? []),
      );
      return () => qc.setQueryData(seriesQuery.queryKey, before);
    },
    onError: (error, _ids, undo) => {
      undo?.();
      failed("reorder-series", error);
    },
    onSettled: refresh,
  });

  const restore = useMutation({
    mutationFn: (series: Pick<Series, "id" | "name">) => api.restoreSeries(series.id),
    onSuccess: (_r, series) => toast.close(`archive-series-${series.id}`),
    onError: (error) => failed("restore-series", error),
    onSettled: refresh,
  });

  const archive = useMutation({
    mutationFn: ({ series, decks }: { series: Series } & SeriesArchiveInput) =>
      api.archiveSeries(series.id, { decks }),
    onSuccess: (_r, { series, decks }) => {
      const seriesName = series.name;
      const count = series.deckIds.length;
      toast.add({
        id: `archive-series-${series.id}`,
        title:
          decks === "archive" && count > 0
            ? t`Archived “${seriesName}” and its decks`
            : t`Archived “${seriesName}”`,
        actionProps: { children: t`Undo`, onClick: () => restore.mutate(series) },
      });
    },
    onError: (error) => failed("archive-series", error),
    onSettled: refresh,
  });

  return { create, rename, setDecks, moveDeck, reorder, archive, restore };
}
