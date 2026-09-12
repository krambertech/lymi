import type { Card } from "@lymi/core/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, useMatches, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Toast } from "../components/Toast";
import { useAddCard } from "../lib/add-card";
import { api } from "../lib/api";
import { cardHistoryQuery, deckCardsQuery, decksQuery } from "../lib/queries";
import { DeckDetailView } from "../views/DeckDetailView";
import { describeEvent } from "../views/WordView";

export const Route = createFileRoute("/library/$deckId")({
  // The open word lives in the URL, so the phone's back gesture closes it and a link from
  // anywhere can open one.
  validateSearch: (s: Record<string, unknown>): { card?: string } => ({
    ...(typeof s.card === "string" ? { card: s.card } : {}),
  }),
  component: Deck,
});

/** Settings is a child route, so it replaces the deck rather than sitting under it. */
function Deck() {
  const matches = useMatches();
  if (matches.some((m) => m.routeId === "/library/$deckId/settings")) return <Outlet />;
  return <DeckPage />;
}

function DeckPage() {
  const { deckId } = Route.useParams();
  const { card: openCardId } = Route.useSearch();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const decks = useQuery(decksQuery);
  const cards = useQuery(deckCardsQuery(deckId));
  const history = useQuery({ ...cardHistoryQuery(openCardId ?? ""), enabled: !!openCardId });
  const deck = decks.data?.find((d) => d.id === deckId);
  const add = useAddCard();
  const [undo, setUndo] = useState<{ id: string; term: string } | null>(null);

  const events = useMemo(() => history.data?.events.map(describeEvent), [history.data]);

  // Opening pushes one entry so Back closes the word; walking and closing replace it, so the
  // history never fills with words and Back after a close does not reopen one.
  const setOpen = (id: string | null) =>
    navigate({
      to: "/library/$deckId",
      params: { deckId },
      search: id ? { card: id } : {},
      replace: !!openCardId,
    });
  const [saveError, setSaveError] = useState<{
    id: string;
    patch: Parameters<typeof api.updateCard>[1];
    term: string;
  } | null>(null);
  const [audioError, setAudioError] = useState(false);
  const playAudio = (card: Card) => {
    setAudioError(false);
    new Audio(api.audioUrl(card.id)).play().catch(() => setAudioError(true));
  };

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
  const save = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.updateCard>[1] }) =>
      api.updateCard(id, patch),
    onSuccess: (_card, { id }) => {
      setSaveError(null);
      invalidate();
      qc.invalidateQueries({ queryKey: ["cards", id, "history"] });
    },
    // The editor has already closed, so the draft lives here until it lands or is given up.
    onError: (_e, { id, patch }) => {
      const term = cards.data?.find((c) => c.card.id === id)?.card.term ?? "the word";
      setSaveError({ id, patch, term });
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
        onSettings={() => navigate({ to: "/library/$deckId/settings", params: { deckId } })}
        onArchiveDeck={() => archiveDeck.mutate()}
        openCardId={openCardId ?? null}
        onOpen={setOpen}
        states={history.data?.states}
        reviews={history.data?.reviews}
        events={events}
        onPlayAudio={playAudio}
        onSaveCard={(id, patch) => save.mutate({ id, patch })}
        decks={decks.data}
        onMove={(id, toDeck) => {
          setOpen(null);
          save.mutate({ id, patch: { deckId: toDeck } });
        }}
      />
      {saveError && (
        <Toast
          key={`save-${saveError.id}`}
          onDismiss={() => setSaveError(null)}
          action={{
            label: "Retry",
            onClick: () => save.mutate({ id: saveError.id, patch: saveError.patch }),
          }}
        >
          Couldn’t save “{saveError.term}”. Check the connection.
        </Toast>
      )}
      {audioError && (
        <Toast key="audio" onDismiss={() => setAudioError(false)}>
          Pronunciation audio is unavailable. Try again in a moment.
        </Toast>
      )}
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
