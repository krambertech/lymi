import { useQueries, useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAddCard } from "../lib/add-card";
import { publicSiteUrl } from "../lib/origins";
import { deckCardsQuery, decksQuery, meQuery } from "../lib/queries";
import { Streak } from "../lib/streak";
import { useSignOut } from "../lib/use-sign-out";
import { LibraryView } from "../views/library-view";

export const Route = createFileRoute("/library")({
  component: Library,
});

function Library() {
  const matches = useMatches();
  const hasChild = matches.some((m) => m.routeId === "/library/$deckId");
  if (hasChild) return <Outlet />;
  return <DeckList />;
}

function DeckList() {
  const decks = useQuery(decksQuery);
  const me = useQuery(meQuery);
  const leave = useSignOut();
  const add = useAddCard();

  // The stripe on each card needs the split of its states. One learner has a handful of
  // decks, so the cards go through Query per deck; a summary endpoint can replace this later.
  const cardQueries = useQueries({
    queries: (decks.data ?? []).map((d) => ({ ...deckCardsQuery(d.id), staleTime: 30_000 })),
  });
  const progress = useMemo(() => {
    const known: Record<string, number> = {};
    const learning: Record<string, number> = {};
    cardQueries.forEach((r, i) => {
      const id = decks.data?.[i]?.id;
      if (!id || !r.data) return;
      known[id] = 0;
      learning[id] = 0;
      for (const { state } of r.data) {
        const s = state?.state;
        if (s === 2) known[id]++;
        else if (s === 1 || s === 3) learning[id]++;
      }
    });
    return { known, learning };
  }, [cardQueries, decks.data]);

  return (
    <LibraryView
      decks={decks.data}
      known={progress.known}
      learning={progress.learning}
      onAdd={() => add.openCard()}
      onCreateDeck={add.openDeck}
      name={me.data?.name}
      email={me.data?.email}
      docsUrl={publicSiteUrl("/docs")}
      onSignOut={leave.signOut}
      signingOut={leave.busy}
      streakButton={<Streak variant="phone" />}
    />
  );
}
