import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useAddCard } from "../lib/add-card";
import { decksQuery, historyQuery, meQuery } from "../lib/queries";
import { TodayView } from "../views/TodayView";

export const Route = createFileRoute("/today")({
  component: Today,
});

function Today() {
  const decks = useQuery(decksQuery);
  const history = useQuery(historyQuery);
  const me = useQuery(meQuery);
  const add = useAddCard();
  return (
    <TodayView
      decks={decks.data}
      history={history.data?.days}
      streak={history.data?.streak}
      name={me.data?.name}
      onAdd={add.openCard}
      onCreateDeck={add.openDeck}
    />
  );
}
