import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAddCard } from "../lib/add-card";
import { useDocumentTitle } from "../lib/document-title";
import { publicSiteUrl } from "../lib/origins";
import {
  connectedAppsQuery,
  decksQuery,
  exploreQuery,
  roundsQuery,
  seriesQuery,
  settingsQuery,
  streakQuery,
} from "../lib/queries";
import { useRestDismissal } from "../lib/rest-day";
import { Streak } from "../lib/streak";
import { isGuiding, TodayView } from "../views/today-view";

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
  const ready = explore.data?.decks.filter((deck) => !explore.data.added[deck.slug]);
  const add = useAddCard();
  const rest = useRestDismissal(streak.data?.today.date);
  const settings = useQuery(settingsQuery);
  // An account with nothing in it that has not got set up starts there; it never comes back after.
  const welcome = settings.data?.onboardedAt === null && decks.data?.length === 0 && guiding;
  if (welcome) return <Navigate to="/welcome" replace />;
  // Until settings say whether to go there, an empty account shows nothing rather than the guide.
  if (settings.isPending && decks.data?.length === 0 && guiding) return null;
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
      failed={(decks.isError && !decks.data) || (streak.isError && !streak.data)}
      onRetry={() => {
        void decks.refetch();
        void streak.refetch();
      }}
      retrying={decks.isFetching || streak.isFetching}
      ready={ready}
      restDismissed={rest.dismissed}
      onDismissRest={rest.dismiss}
    />
  );
}
