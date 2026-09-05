import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, useMatches, useNavigate } from "@tanstack/react-router";
import { Toast } from "../components/Toast";
import { api } from "../lib/api";
import { decksQuery } from "../lib/queries";
import { DecksView } from "../views/DecksView";

export const Route = createFileRoute("/decks")({
  // After archiving a deck we land here with its id, so the Undo toast can restore it.
  validateSearch: (s: Record<string, unknown>): { archived?: string; name?: string } => ({
    ...(typeof s.archived === "string" ? { archived: s.archived } : {}),
    ...(typeof s.name === "string" ? { name: s.name } : {}),
  }),
  component: Decks,
});

function Decks() {
  const matches = useMatches();
  const hasChild = matches.some((m) => m.routeId === "/decks/$deckId");
  if (hasChild) return <Outlet />;
  return <DeckList />;
}

function DeckList() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { archived, name } = Route.useSearch();
  const decks = useQuery(decksQuery);
  const create = useMutation({
    mutationFn: (name: string) => api.createDeck({ name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decks"] }),
  });
  const clear = () => navigate({ to: "/decks", search: {}, replace: true });
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
      <DecksView
        decks={decks.data}
        creating={create.isPending}
        onCreate={(name) => create.mutateAsync(name)}
      />
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
