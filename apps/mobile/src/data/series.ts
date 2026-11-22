import { useLingui } from "@lingui/react/macro";
import { api, errorMessage, type Series } from "@lymi/client/api";
import { seriesQuery } from "@lymi/client/queries";
import type { SeriesDeleteInput } from "@lymi/core";
import { isolate } from "@lymi/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { alert } from "../ui/alert";
import { toast } from "../ui/toast-host";
import type { MoveBack } from "./move-undo";

/**
 * The series writes Library makes, as the web's useSeriesActions. A series moves decks between
 * reviews, so each write refreshes the decks, the series and the review queue once it lands.
 */
export function useSeriesActions() {
  const { t } = useLingui();
  const qc = useQueryClient();
  const alertFailed = (error: unknown) => alert(t`That didn’t go through`, errorMessage(error));
  const refresh = () =>
    Promise.all(
      [["decks"], ["series"], ["queue"]].map((queryKey) => qc.invalidateQueries({ queryKey })),
    );

  const name = useMutation({
    meta: { failure: "inline" },
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
    meta: { failure: "inline" },
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
    onError: (error, _ids, context) => {
      if (context?.before) qc.setQueryData(seriesQuery.queryKey, context.before);
      alertFailed(error);
    },
    onSuccess: (saved) => qc.setQueryData(seriesQuery.queryKey, saved),
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: ({ series, decks }: { series: Series } & SeriesDeleteInput) =>
      api.deleteSeries(series.id, { decks }),
    onError: alertFailed,
    onSettled: refresh,
  });

  // A deck picks its series from the deck, as the web's Move to series does.
  const moveDeck = useMutation({
    meta: { failure: "caller" },
    mutationFn: ({ deckId, seriesId }: { deckId: string; seriesId: string | null }) =>
      api.updateDeck(deckId, { seriesId }),
    onSettled: refresh,
  });

  /** Undo of a move: the old series' order back, or the deck moved back by id. */
  const undo = useMutation({
    mutationFn: async ({ deckId, back }: { deckId: string; back: MoveBack }) => {
      if (back.kind === "order")
        await api.setSeriesDecks(back.series.id, { deckIds: back.deckIds });
      else await api.updateDeck(deckId, { seriesId: back.seriesId });
    },
    onSettled: refresh,
  });
  const undoMove = (deckId: string, back: MoveBack) => undo.mutate({ deckId, back });

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
          ? t`Moved “${{ deckName: isolate(deckName) }}” to ${{ seriesName: isolate(seriesName) }}`
          : t`Took “${{ deckName: isolate(deckName) }}” out of its series`,
      action: { label: t`Undo`, onPress: undo },
    });
}
