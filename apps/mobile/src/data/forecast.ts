import { decksQuery } from "@lymi/client/queries";
import { hashKey, type QueryClient } from "@tanstack/react-query";

/** A pause in grading, as the reminders settle on, so a session refetches once rather than per card. */
export const FORECAST_SETTLE_MS = 20_000;

const DUE = hashKey(decksQuery.queryKey);

/**
 * Refetches the Insights forecast that the widgets and the reminders read whenever the due counts
 * are invalidated or change, which every grade, Undo, archive, restore, replayed write and new review day
 * already does, so no caller can move a card's due date and leave tomorrow's count behind.
 */
export function followDueCounts(qc: QueryClient, settle = FORECAST_SETTLE_MS): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let counts = qc.getQueryData(decksQuery.queryKey);
  const unsubscribe = qc.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.query.queryHash !== DUE) return;
    // Query reports only the first invalidation while one is pending, so changed counts arriving
    // count too; structural sharing keeps the reference when a refetch changed nothing.
    if (event.action.type === "success") {
      if (event.query.state.data === counts) return;
      counts = event.query.state.data;
    } else if (event.action.type !== "invalidate") return;
    clearTimeout(timer);
    timer = setTimeout(() => void qc.invalidateQueries({ queryKey: ["insights"] }), settle);
  });
  return () => {
    clearTimeout(timer);
    unsubscribe();
  };
}
