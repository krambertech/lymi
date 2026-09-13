import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useAddCard } from "../lib/add-card";
import { publicSiteUrl } from "../lib/origins";
import { decksQuery, meQuery, streakQuery } from "../lib/queries";
import { Streak } from "../lib/streak";
import { useSignOut } from "../lib/use-sign-out";
import { TodayView } from "../views/TodayView";

export const Route = createFileRoute("/today")({
  component: Today,
});

function Today() {
  const decks = useQuery(decksQuery);
  // The same query as the pill, so the flame in the chrome and the week on the page always agree.
  const streak = useQuery(streakQuery);
  const me = useQuery(meQuery);
  const add = useAddCard();
  const leave = useSignOut();
  return (
    <TodayView
      decks={decks.data}
      streak={streak.data}
      streakButton={<Streak variant="phone" />}
      name={me.data?.name}
      email={me.data?.email}
      docsUrl={publicSiteUrl("/docs")}
      onAdd={() => add.openCard()}
      onCreateDeck={add.openDeck}
      onSignOut={leave.signOut}
      signingOut={leave.busy}
    />
  );
}
