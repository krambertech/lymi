import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Toast } from "../components/Toast";
import { useAddCard } from "../lib/add-card";
import { api } from "../lib/api";
import { deckCardsQuery, decksQuery } from "../lib/queries";
import { DeckDetailView } from "../views/DeckDetailView";

export const Route = createFileRoute("/library/$deckId")({
  component: DeckPage,
});

function DeckPage() {
  const { deckId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const decks = useQuery(decksQuery);
  const cards = useQuery(deckCardsQuery(deckId));
  const deck = decks.data?.find((d) => d.id === deckId);
  const add = useAddCard();
  const [undo, setUndo] = useState<{ id: string; term: string } | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["decks"] });
    qc.invalidateQueries({ queryKey: ["queue"] });
  };
  const archive = useMutation({
    mutationFn: (id: string) => api.archiveCard(id),
    onSuccess: (_r, id) => {
      const term = cards.data?.find((c) => c.card.id === id)?.card.term ?? "Card";
      setUndo({ id, term });
      invalidate();
    },
  });
  const restore = useMutation({
    mutationFn: (id: string) => api.restoreCard(id),
    onSuccess: () => {
      setUndo(null);
      invalidate();
    },
  });
  const rename = useMutation({
    mutationFn: (name: string) => api.updateDeck(deckId, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decks"] }),
  });
  const archiveDeck = useMutation({
    mutationFn: () => api.archiveDeck(deckId),
    onSuccess: () => {
      invalidate();
      navigate({ to: "/library", search: { archived: deckId, name: deck?.name ?? "Deck" } });
    },
  });

  return (
    <>
      <DeckDetailView
        deck={deck}
        cards={cards.data}
        onAdd={() => add.openCard(deckId)}
        onArchive={(id) => archive.mutate(id)}
        onReview={() => navigate({ to: "/review", search: { deck: deckId } })}
        onRename={(name) => rename.mutateAsync(name)}
        onArchiveDeck={() => archiveDeck.mutate()}
      />
      {undo && (
        <Toast
          key={undo.id}
          onDismiss={() => setUndo(null)}
          action={{ label: "Undo", onClick: () => restore.mutate(undo.id) }}
        >
          Archived “{undo.term}”
        </Toast>
      )}
    </>
  );
}
