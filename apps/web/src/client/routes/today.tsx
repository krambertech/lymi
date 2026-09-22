import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useAddCard } from "../lib/add-card";
import { useDocumentTitle } from "../lib/document-title";
import { publicSiteUrl } from "../lib/origins";
import {
  connectedAppsQuery,
  decksQuery,
  exploreQuery,
  roundsQuery,
  seriesQuery,
  streakQuery,
} from "../lib/queries";
import { Streak } from "../lib/streak";
import { useAddPublishedDeck } from "../lib/use-add-published-deck";
import { isGuiding, TodayView } from "../views/today-view";

/** How many published decks the row carries before Explore takes over. */
const READY_DECKS = 8;

export const Route = createFileRoute("/today")({
  component: Today,
});

function Today() {
  const { t } = useLingui();
  useDocumentTitle(t`Today`);
  const decks = useQuery(decksQuery);
  const series = useQuery(seriesQuery);
  // The same query as the rail's pill, so the flame in the chrome and the card always agree.
  const streak = useQuery(streakQuery);
  const rounds = useQuery(roundsQuery);
  const firstRun = decks.data?.every((d) => d.total === 0) ?? false;
  const apps = useQuery({ ...connectedAppsQuery, enabled: firstRun });
  // Only the guide offers ready-made decks, so nobody past it pays for the catalogue read.
  const guiding = isGuiding(streak.data);
  const explore = useQuery({ ...exploreQuery, enabled: guiding });
  const ready = explore.data?.decks
    .filter((deck) => !explore.data.added[deck.slug])
    .slice(0, READY_DECKS);
  const add = useAddCard();
  // On Today the deck lands in Library while the learner stays, so the toast is what says so.
  const addDeck = useAddPublishedDeck({ announce: "toast" });
  return (
    <TodayView
      decks={decks.data}
      series={series.data}
      streak={streak.data}
      streakCard={<Streak variant="card" />}
      rounds={rounds.data}
      connectUrl={publicSiteUrl("/docs/mcp")}
      connected={apps.isSuccess ? apps.data.length > 0 : apps.isError ? false : undefined}
      onAdd={() => add.openCard()}
      onCreateDeck={add.openDeck}
      ready={ready}
      onAddDeck={(deck) => addDeck.mutate(deck)}
      addingDeck={addDeck.isPending ? addDeck.variables?.slug : undefined}
    />
  );
}
