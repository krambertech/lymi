import { api, type Series } from "@lymi/client/api";
import { seriesQuery } from "@lymi/client/queries";
import type { SeriesDeleteInput } from "@lymi/core";
import { onlineManager, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

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
    mutationFn: ({ series, name }: { series: Series | undefined; name: string }) =>
      series ? api.renameSeries(series.id, name) : api.createSeries({ name }),
    onSettled: refresh,
  });

  const setDecks = useMutation({
    mutationFn: ({ series, deckIds }: { series: Series; deckIds: string[] }) =>
      api.setSeriesDecks(series.id, { deckIds }),
    onSettled: refresh,
  });

  const move = useMutation({
    mutationFn: ({ series, by }: { series: Series; by: -1 | 1 }) => {
      const ids = (qc.getQueryData<Series[]>(seriesQuery.queryKey) ?? []).map((s) => s.id);
      const from = ids.indexOf(series.id);
      ids.splice(from, 1);
      ids.splice(from + by, 0, series.id);
      return api.reorderSeries(ids);
    },
    onSuccess: (order) => qc.setQueryData(seriesQuery.queryKey, order),
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: ({ series, decks }: { series: Series } & SeriesDeleteInput) =>
      api.deleteSeries(series.id, { decks }),
    onSettled: refresh,
  });

  return { name, setDecks, move, remove };
}

/**
 * Whether the phone can reach Lymi. Series writes go straight to the Worker rather than through the
 * write outbox, so they need a connection, and a screen says so rather than leaving a spinner.
 */
export function useOnline() {
  return useSyncExternalStore(onlineManager.subscribe.bind(onlineManager), () =>
    onlineManager.isOnline(),
  );
}
