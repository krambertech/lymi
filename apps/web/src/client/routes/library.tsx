import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, useMatches, useNavigate } from "@tanstack/react-router";
import { Toast } from "../components/Toast";
import { useAddCard } from "../lib/add-card";
import { api } from "../lib/api";
import { decksQuery } from "../lib/queries";
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
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { archived, name } = Route.useSearch();
  const decks = useQuery(decksQuery);
  const add = useAddCard();
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
      <LibraryView decks={decks.data} onAdd={add.openCard} onCreateDeck={add.openDeck} />
      {archived && (
        <Toast
          key={archived}
          onDismiss={clear}
          action={{ label: "Undo", onClick: () => restore.mutate(archived) }}
        >
          Archived “{name ?? "deck"}”
        </Toast>
      )}
    </>
  );
}
