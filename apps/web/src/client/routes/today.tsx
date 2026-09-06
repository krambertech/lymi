import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { decksQuery, historyQuery } from "../lib/queries";
import { TodayView } from "../views/TodayView";

export const Route = createFileRoute("/today")({
  component: Today,
});

function Today() {
  const decks = useQuery(decksQuery);
  const history = useQuery(historyQuery);
  return <TodayView decks={decks.data} history={history.data?.days} />;
}
