import { useLingui } from "@lingui/react/macro";
import { api, type Series } from "@lymi/client/api";
import { seriesQuery } from "@lymi/client/queries";
import type { SeriesDeleteInput } from "@lymi/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../ui/toast-host";
import type { MoveBack } from "./move-undo";

/**
 * The series writes Library makes, as the web's useSeriesActions. A series moves decks between
 * reviews, so each write refreshes the decks, the series and the review queue once it lands.
 */
export function useSeriesActions() {
  const qc = useQueryClient();
  const refresh = () =>
    Promise.all(
      [["decks"], ["series"], ["queue"]].map((queryKey) => qc.invalidateQueries({ queryKey })),
    );

  const name = useMutation({
    // A new series can take its first deck in the same write, so a failure never leaves it empty.
    mutationFn: ({
      series,
      name,
      deckIds,
    }: {
      series: Series | undefined;
      name: string;
      deckIds?: string[];
    }) => (series ? api.renameSeries(series.id, name) : api.createSeries({ name, deckIds })),
    onSettled: refresh,
  });

  const setDecks = useMutation({
    mutationFn: ({ series, deckIds }: { series: Series; deckIds: string[] }) =>
      api.setSeriesDecks(series.id, { deckIds }),
    onSettled: refresh,
  });

  // The new order shows at once, as a drag drops it, and goes back if the write fails.
  const order = useMutation({
    mutationFn: (ids: string[]) => api.reorderSeries(ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: seriesQuery.queryKey });
      const before = qc.getQueryData<Series[]>(seriesQuery.queryKey);
      if (before) {
        qc.setQueryData(
          seriesQuery.queryKey,
          ids.flatMap((id) => before.find((s) => s.id === id) ?? []),
        );
      }
      return { before };
    },
    onError: (_error, _ids, context) => {
      if (context?.before) qc.setQueryData(seriesQuery.queryKey, context.before);
    },
    onSuccess: (saved) => qc.setQueryData(seriesQuery.queryKey, saved),
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: ({ series, decks }: { series: Series } & SeriesDeleteInput) =>
      api.deleteSeries(series.id, { decks }),
    onSettled: refresh,
  });

  // A deck picks its series from the deck, as the web's Move to series does.
  const moveDeck = useMutation({
    mutationFn: ({ deckId, seriesId }: { deckId: string; seriesId: string | null }) =>
      api.updateDeck(deckId, { seriesId }),
    onSettled: refresh,
  });

  /** Undo of a move: the old series' order back, or the deck moved back by id. */
  const undoMove = (deckId: string, back: MoveBack) =>
    back.kind === "order"
      ? setDecks.mutate({ series: back.series, deckIds: back.deckIds })
      : moveDeck.mutate({ deckId, seriesId: back.seriesId });

  return { name, setDecks, order, remove, moveDeck, undoMove };
}

/**
 * Says where a moved deck went, with Undo, as the web's toast does. `seriesName` is undefined
 * when the deck left its series.
 */
export function useMoveNotice() {
  const { t } = useLingui();
  return (deckId: string, deckName: string, seriesName: string | undefined, undo: () => void) =>
    toast.add({
      id: `move-deck-${deckId}`,
      title:
        seriesName !== undefined
          ? t`Moved “${deckName}” to ${seriesName}`
          : t`Took “${deckName}” out of its series`,
      action: { label: t`Undo`, onPress: undo },
    });
}
