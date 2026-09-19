import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useAddCard } from "../lib/add-card";
import { useDocumentTitle } from "../lib/document-title";
import { publicSiteUrl } from "../lib/origins";
import {
  connectedAppsQuery,
  decksQuery,
  roundsQuery,
  seriesQuery,
  streakQuery,
} from "../lib/queries";
import { Streak } from "../lib/streak";
import { TodayView } from "../views/today-view";

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
  const add = useAddCard();
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
    />
  );
}
