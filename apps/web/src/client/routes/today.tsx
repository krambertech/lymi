import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useAddCard } from "../lib/add-card";
import { useDocumentTitle } from "../lib/document-title";
import { publicSiteUrl } from "../lib/origins";
import { connectedAppsQuery, decksQuery, meQuery, roundsQuery, streakQuery } from "../lib/queries";
import { Streak } from "../lib/streak";
import { useSignOut } from "../lib/use-sign-out";
import { TodayView } from "../views/today-view";

export const Route = createFileRoute("/today")({
  component: Today,
});

function Today() {
  const { t } = useLingui();
  useDocumentTitle(t`Today`);
  const decks = useQuery(decksQuery);
  // The same query as the rail's pill, so the flame in the chrome and the card always agree.
  const streak = useQuery(streakQuery);
  const rounds = useQuery(roundsQuery);
  const me = useQuery(meQuery);
  const firstRun = decks.data?.every((d) => d.total === 0) ?? false;
  const apps = useQuery({ ...connectedAppsQuery, enabled: firstRun });
  const add = useAddCard();
  const leave = useSignOut();
  return (
    <TodayView
      decks={decks.data}
      streak={streak.data}
      streakCard={<Streak variant="card" />}
      streakButton={<Streak variant="phone" />}
      rounds={rounds.data}
      name={me.data?.name}
      email={me.data?.email}
      docsUrl={publicSiteUrl("/docs")}
      connectUrl={publicSiteUrl("/docs/mcp")}
      connected={apps.isSuccess ? apps.data.length > 0 : apps.isError ? false : undefined}
      onAdd={() => add.openCard()}
      onCreateDeck={add.openDeck}
      onSignOut={leave.signOut}
      signingOut={leave.busy}
    />
  );
}
