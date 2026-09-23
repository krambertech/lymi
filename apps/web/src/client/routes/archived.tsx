import { useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "../components/ui/toast";
import type { CardHit, DeckSummary } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import { archivedCardsQuery, archivedDecksQuery } from "../lib/queries";
import { writes } from "../lib/writes";
import { ArchivedView } from "../views/archived-view";

export const Route = createFileRoute("/archived")({
  component: Archived,
});

function Archived() {
  const { t } = useLingui();
  useDocumentTitle(t`Archived`);
  const qc = useQueryClient();
  const decks = useQuery(archivedDecksQuery);
  const cards = useQuery(archivedCardsQuery);
  // A restore moves a deck or card between every list that counts it, so all of them refetch.
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["decks"] });
    qc.invalidateQueries({ queryKey: ["cards"] });
    qc.invalidateQueries({ queryKey: ["series"] });
    qc.invalidateQueries({ queryKey: ["queue"] });
  };

  const undoDeck = useMutation({
    mutationFn: (id: string) => writes.archiveDeck(id),
    onSuccess: invalidate,
  });
  const undoCard = useMutation({
    mutationFn: (id: string) => writes.archiveCard(id),
    onSuccess: invalidate,
  });
  const restoreDeck = useMutation({
    mutationFn: (deck: DeckSummary) => writes.restoreDeck(deck.id),
    onSuccess: (_, deck) => {
      invalidate();
      toast.add({
        title: t`Restored “${deck.name}”`,
        actionProps: { children: t`Undo`, onClick: () => undoDeck.mutate(deck.id) },
      });
    },
  });
  const restoreCard = useMutation({
    mutationFn: (card: CardHit) => writes.restoreCard(card.id),
    onSuccess: (_, card) => {
      invalidate();
      toast.add({
        title: t`Restored “${card.term}”`,
        actionProps: { children: t`Undo`, onClick: () => undoCard.mutate(card.id) },
      });
    },
  });

  return (
    <ArchivedView
      decks={decks.data}
      cards={cards.data}
      error={decks.isError || cards.isError}
      onRetry={() => {
        void decks.refetch();
        void cards.refetch();
      }}
      retrying={decks.isFetching || cards.isFetching}
      onRestoreDeck={(deck) => restoreDeck.mutate(deck)}
      onRestoreCard={(card) => restoreCard.mutate(card)}
      restoring={
        restoreDeck.isPending
          ? restoreDeck.variables.id
          : restoreCard.isPending
            ? restoreCard.variables.id
            : undefined
      }
    />
  );
}
