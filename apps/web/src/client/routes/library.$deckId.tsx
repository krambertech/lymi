import { useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, useMatches, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { EditCardSheet } from "../components/edit-card-sheet";
import { MoveToSeriesDialog } from "../components/series-dialogs";
import { toast } from "../components/ui/toast";
import { useAddCard } from "../lib/add-card";
import { api, type Card, errorMessage } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import { publicSiteUrl } from "../lib/origins";
import {
  cardHistoryQuery,
  connectedAppsQuery,
  deckCardsQuery,
  decksQuery,
  seriesQuery,
  streakQuery,
} from "../lib/queries";
import { useArchiveDeck } from "../lib/use-archive-deck";
import { useSeriesActions } from "../lib/use-series";
import { DeckDetailView } from "../views/deck-detail-view";
import { describeEvent } from "../views/word-view";

export const Route = createFileRoute("/library/$deckId")({
  // The open card lives in the URL, so the phone's back gesture closes it and a link from
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
  const { t, i18n } = useLingui();
  const { deckId } = Route.useParams();
  const { card: openCardId } = Route.useSearch();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const decks = useQuery(decksQuery);
  const cards = useQuery(deckCardsQuery(deckId));
  const streak = useQuery(streakQuery);
  const apps = useQuery({ ...connectedAppsQuery, enabled: cards.data?.length === 0 });
  const history = useQuery({ ...cardHistoryQuery(openCardId ?? ""), enabled: !!openCardId });
  const deck = decks.data?.find((d) => d.id === deckId);
  const isOwner = deck?.role === "owner";
  const series = useQuery({ ...seriesQuery, enabled: isOwner });
  const seriesActions = useSeriesActions();
  const [movingToSeries, setMovingToSeries] = useState(false);
  const add = useAddCard();
  useDocumentTitle(deck?.name);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = cards.data?.find((row) => row.card.id === editingId)?.card ?? null;

  const events = useMemo(
    () => history.data?.events.map((e) => describeEvent(e, i18n)),
    [history.data, i18n],
  );

  // Opening pushes one entry so Back closes the card; walking and closing replace it, so the
  // history never fills with cards and Back after a close does not reopen one.
  const setOpen = (id: string | null) =>
    navigate({
      to: "/library/$deckId",
      params: { deckId },
      search: id ? { card: id } : {},
      replace: !!openCardId,
    });
  const playAudio = (card: Card) => {
    toast.close("audio");
    new Audio(api.audioUrl(card.id)).play().catch(() =>
      toast.add({
        id: "audio",
        type: "error",
        title: t`Couldn’t play the pronunciation. Try again in a moment.`,
      }),
    );
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["decks"] });
    qc.invalidateQueries({ queryKey: ["queue"] });
  };
  const archive = useMutation({
    mutationFn: (id: string) => api.archiveCard(id),
    onSuccess: (_r, id) => {
      const archivedTerm = cards.data?.find((c) => c.card.id === id)?.card.term ?? t`Card`;
      invalidate();
      toast.add({
        id: `archive-${id}`,
        title: t`Archived “${archivedTerm}”`,
        actionProps: { children: t`Undo`, onClick: () => restore.mutate(id) },
      });
    },
  });
  const restore = useMutation({
    mutationFn: (id: string) => api.restoreCard(id),
    onSuccess: (_r, id) => {
      invalidate();
      toast.close(`archive-${id}`);
    },
  });
  const save = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.updateCard>[1] }) =>
      api.updateCard(id, patch),
    onSuccess: (_card, { id }) => {
      toast.close(`save-${id}`);
      invalidate();
      qc.invalidateQueries({ queryKey: ["cards", id, "history"] });
    },
    // The editor has already closed, so the draft rides on Retry until it lands or the toast leaves.
    onError: (_e, { id, patch }) => {
      const failedTerm = cards.data?.find((c) => c.card.id === id)?.card.term ?? t`the card`;
      toast.add({
        id: `save-${id}`,
        type: "error",
        title: t`Couldn’t save “${failedTerm}”. Check your connection and try again.`,
        actionProps: { children: t`Retry`, onClick: () => save.mutate({ id, patch }) },
      });
    },
  });
  const archiveDeck = useArchiveDeck(deckId, deck?.name);

  return (
    <>
      <DeckDetailView
        deck={deck}
        cards={cards.data}
        streak={streak.data}
        onAdd={() => add.openCard(deckId)}
        onArchive={(id) => archive.mutate(id)}
        onReview={() => navigate({ to: "/review", search: { deck: deckId } })}
        onSettings={() => navigate({ to: "/library/$deckId/settings", params: { deckId } })}
        onArchiveDeck={() => archiveDeck.mutate()}
        onMoveToSeries={isOwner ? () => setMovingToSeries(true) : undefined}
        seriesName={series.data?.find((s) => s.id === deck?.seriesId)?.name}
        openCardId={openCardId ?? null}
        onOpen={setOpen}
        states={history.data?.states}
        reviews={history.data?.reviews}
        events={events}
        onPlayAudio={playAudio}
        onEditCard={(card) => setEditingId(card.id)}
        decks={decks.data}
        onMove={(id, toDeck) => {
          setOpen(null);
          save.mutate({ id, patch: { deckId: toDeck } });
        }}
        connectUrl={publicSiteUrl("/docs/mcp")}
        connected={apps.isSuccess ? apps.data.length > 0 : apps.isError ? false : undefined}
      />
      <EditCardSheet
        card={editing}
        decks={decks.data}
        onClose={() => setEditingId(null)}
        onReopen={(card) => setEditingId(card.id)}
        // A card that moved is no longer in this deck's list, so it closes with the sheet.
        onSaved={(_card, movedFrom) => movedFrom && setOpen(null)}
      />
      {deck && isOwner && (
        <MoveToSeriesDialog
          open={movingToSeries}
          onOpenChange={(open) => {
            setMovingToSeries(open);
            if (!open) seriesActions.create.reset();
          }}
          deckName={deck.name}
          current={deck.seriesId}
          series={series.data}
          onMove={(seriesId) => {
            setMovingToSeries(false);
            seriesActions.moveDeck.mutate({ deck, seriesId });
          }}
          creating={seriesActions.create.isPending}
          error={
            seriesActions.create.isError ? errorMessage(seriesActions.create.error) : undefined
          }
          onCreate={async (name) => {
            // One write, so a failure never leaves an empty series behind.
            const created = await seriesActions.create.mutateAsync({ name, deckIds: [deck.id] });
            setMovingToSeries(false);
            seriesActions.create.reset();
            const deckName = deck.name;
            const seriesName = created.name;
            toast.add({
              id: `move-${deck.id}`,
              title: t`Moved “${deckName}” to ${seriesName}`,
              actionProps: {
                children: t`Undo`,
                onClick: () => {
                  toast.close(`move-${deck.id}`);
                  seriesActions.moveDeck.mutate({
                    deck: { ...deck, seriesId: created.id },
                    seriesId: deck.seriesId,
                  });
                },
              },
            });
          }}
        />
      )}
    </>
  );
}
