import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { useEffect } from "react";
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
  const qc = useQueryClient();

  // Fetched here and persisted, so a deck opens offline after a visit to Library.
  useEffect(() => {
    for (const d of decks.data ?? []) {
      void qc.prefetchQuery({ ...deckCardsQuery(d.id), staleTime: 30_000 });
    }
  }, [decks.data, qc]);

  return (
    <LibraryView
      decks={decks.data}
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
