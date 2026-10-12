import { decksQuery } from "@lymi/client/queries";
import { hashKey, type QueryClient } from "@tanstack/react-query";

/** Grades come every few seconds; the forecast only needs where the session settled. */
export const FORECAST_SETTLE_MS = 5000;

const DUE = hashKey(decksQuery.queryKey);

/**
 * Refetches the Insights forecast that the widgets and the reminders read whenever the due counts
 * are refetched, which every grade, Undo, archive, restore, replayed write and new review day
 * already does, so no caller can move a card's due date and leave tomorrow's count behind.
 */
export function followDueCounts(qc: QueryClient, settle = FORECAST_SETTLE_MS): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = qc.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "invalidate") return;
    if (event.query.queryHash !== DUE) return;
    clearTimeout(timer);
    timer = setTimeout(() => void qc.invalidateQueries({ queryKey: ["insights"] }), settle);
  });
  return () => {
    clearTimeout(timer);
    unsubscribe();
  };
}
