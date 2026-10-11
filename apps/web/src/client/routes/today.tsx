import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
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
  // An account with nothing in it that has not got set up starts at Welcome; it never comes back after.
  const unwelcomed = settings.data ? settings.data.onboardedAt === null : settings.isPending;
  // A read that failed, or one paused offline, shows Today rather than holding an empty screen.
  const reading =
    !settings.isError &&
    !decks.isError &&
    settings.fetchStatus !== "paused" &&
    decks.fetchStatus !== "paused";
  const candidate = unwelcomed && decks.data?.length === 0 && guiding && reading;
  // The persisted cache can predate finishing Welcome, so the redirect waits for this mount's reads.
  const confirmed = settings.isFetchedAfterMount && decks.isFetchedAfterMount;
  const { refetch: refetchSettings } = settings;
  const { refetch: refetchDecks } = decks;
  useEffect(() => {
    if (!candidate) return;
    void refetchSettings();
    void refetchDecks();
  }, [candidate, refetchSettings, refetchDecks]);
  if (candidate) return confirmed ? <Navigate to="/welcome" replace /> : null;
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
