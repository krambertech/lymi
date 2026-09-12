import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, useMatches, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Toast } from "../components/Toast";
import { useAddCard } from "../lib/add-card";
import { api } from "../lib/api";
import { deckCardsQuery, decksQuery } from "../lib/queries";
import { LibraryView } from "../views/LibraryView";

export const Route = createFileRoute("/library")({
  // Archiving a deck lands here with its id, so the Undo toast can restore it.
  validateSearch: (s: Record<string, unknown>): { archived?: string; name?: string } => ({
    ...(typeof s.archived === "string" ? { archived: s.archived } : {}),
    ...(typeof s.name === "string" ? { name: s.name } : {}),
  }),
  component: Library,
});

function Library() {
  const matches = useMatches();
  const hasChild = matches.some((m) => m.routeId === "/library/$deckId");
  if (hasChild) return <Outlet />;
  return <DeckList />;
}

function DeckList() {
  const { t } = useLingui();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { archived, name } = Route.useSearch();
  const decks = useQuery(decksQuery);
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

  const deckName = name ?? t`deck`;
  const clear = () => navigate({ to: "/library", search: {}, replace: true });
  const restore = useMutation({
    mutationFn: (id: string) => api.restoreDeck(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decks"] });
      qc.invalidateQueries({ queryKey: ["queue"] });
      clear();
    },
  });
  return (
    <>
      <LibraryView
        decks={decks.data}
        known={progress.known}
        learning={progress.learning}
        onAdd={add.openCard}
        onCreateDeck={add.openDeck}
      />
      {archived && (
        <Toast
          key={archived}
          onDismiss={clear}
          action={{ label: t`Undo`, onClick: () => restore.mutate(archived) }}
        >
          <Trans>Archived “{deckName}”</Trans>
        </Toast>
      )}
    </>
  );
}
