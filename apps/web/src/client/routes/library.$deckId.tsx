import { useLingui } from "@lingui/react/macro";
import type { CardPatch } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, useMatches, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { EditCardSheet } from "../components/edit-card-sheet";
import { ExportSheet } from "../components/export-sheet";
import { LeaveDeckDialog } from "../components/leave-deck-dialog";
import {
  MoveToSectionDialog,
  SectionNameDialog,
  StartEarlyDialog,
} from "../components/section-dialogs";
import { MoveToSeriesDialog } from "../components/series-dialogs";
import { toast } from "../components/ui/toast";
import { useAddCard } from "../lib/add-card";
import { ApiError, api, type Card, errorMessage, type Section } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import { publicSiteUrl } from "../lib/origins";
import {
  cardHistoryQuery,
  connectedAppsQuery,
  deckCardsQuery,
  decksQuery,
  sectionsQuery,
  seriesQuery,
  streakQuery,
} from "../lib/queries";
import { shortQuote } from "../lib/short-quote";
import { useArchiveDeck } from "../lib/use-archive-deck";
import { useLeaveDeck } from "../lib/use-leave-deck";
import { useSectionActions } from "../lib/use-sections";
import { useSeriesActions } from "../lib/use-series";
import { writes } from "../lib/writes";
import { DeckDetailView, type DeckFailure, exportCsv } from "../views/deck-detail-view";
import { describeEvent } from "../views/word-view";

export const Route = createFileRoute("/library/$deckId")({
  // The open card lives in the URL, so the phone's back gesture closes it and a link from
  // anywhere can open one.
  validateSearch: (s: Record<string, unknown>): { card?: string } => ({
    ...(typeof s.card === "string" ? { card: s.card } : {}),
  }),
  component: Deck,
});

/** A 404: the deck was archived elsewhere, or shared with this learner and then taken back. */
const isMissing = (error: unknown) => error instanceof ApiError && error.status === 404;

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
  // The enrichment row only exists once the fill lands, so ask for the history again then.
  const settled = cards.data?.find((row) => row.card.id === openCardId)?.card.enrichmentStatus;
  useEffect(() => {
    if (openCardId && settled !== "working") {
      void qc.invalidateQueries({ queryKey: ["cards", openCardId, "history"] });
    }
  }, [openCardId, settled, qc]);
  const deck = decks.data?.find((d) => d.id === deckId);
  const isOwner = deck?.role === "owner";
  // Only a deck that has arrived and is someone else's; while the list is in flight the screen
  // must not label the owner's own deck as one they joined.
  const isMember = !!deck && deck.role !== "owner";
  const series = useQuery({ ...seriesQuery, enabled: isOwner });
  const seriesActions = useSeriesActions();
  const [movingToSeries, setMovingToSeries] = useState(false);
  const [exporting, setExporting] = useState(false);
  const sections = useQuery(sectionsQuery(deckId));
  const sectionActions = useSectionActions(deckId);
  const [naming, setNaming] = useState<{ section?: Section | undefined } | null>(null);
  const [picking, setPicking] = useState<{ cardIds: string[]; after: () => void } | null>(null);
  // The picker keeps its cards while it closes, so it never flashes "Move 0 cards".
  const lastPicking = useRef(picking);
  if (picking) lastPicking.current = picking;
  const shownPicking = picking ?? lastPicking.current;
  const [startingEarly, setStartingEarly] = useState<{
    section: Section;
    opening: Section[];
  } | null>(null);
  const sectionList = sections.data?.sections ?? [];

  // The deck, its cards and its sections stand or fall together, so one failure is one message.
  // A request that never arrived outranks a missing deck: the cached list may simply be behind.
  const unreachable =
    (decks.isError && !isMissing(decks.error)) ||
    (cards.isError && !isMissing(cards.error)) ||
    (sections.isError && !isMissing(sections.error));
  // The list answers on its own once it has been fetched, because a deck's own request can sit
  // in a paused retry, and a list still in flight never lets a deck that is merely new read as gone.
  const missing =
    isMissing(cards.error) ||
    isMissing(sections.error) ||
    (decks.isSuccess && !decks.isFetching && !deck);
  const failure: DeckFailure | undefined =
    deck && cards.data ? undefined : unreachable ? "unreachable" : missing ? "gone" : undefined;
  const retry = () => {
    void decks.refetch();
    void cards.refetch();
    void sections.refetch();
  };

  /** Start a section; one with locked sections before it asks first, since they start too. */
  const startSection = (section: Section) => {
    const at = sectionList.findIndex((s) => s.id === section.id);
    const opening = sectionList
      .slice(0, at + 1)
      .filter((s) => s.status !== "open" && (s.total > 0 || s.id === section.id));
    if (opening.length > 1) setStartingEarly({ section, opening });
    else sectionActions.start.mutate({ section, opening: 1 });
  };
  const add = useAddCard();
  useDocumentTitle(deck?.name);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = cards.data?.find((row) => row.card.id === editingId)?.card ?? null;

  const wordHistory = useMemo(
    () =>
      history.data && {
        states: history.data.states,
        reviews: history.data.reviews,
        events: history.data.events.map((e) => describeEvent(e, i18n)),
      },
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
      // The card opens over the list, so the list keeps its scroll position.
      resetScroll: false,
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
    mutationFn: (id: string) => writes.archiveCard(id),
    // Read before the write, which takes the card off the deck's list at once.
    onMutate: (id) => ({ term: cards.data?.find((c) => c.card.id === id)?.card.term }),
    onSuccess: (_r, id, before) => {
      const archivedTerm = shortQuote(before?.term ?? t`Card`);
      invalidate();
      toast.add({
        id: `archive-${id}`,
        title: t`Archived “${archivedTerm}”`,
        actionProps: { children: t`Undo`, onClick: () => restore.mutate(id) },
      });
    },
    onError: (error, id) =>
      toast.add({ id: `archive-${id}`, type: "error", title: errorMessage(error) }),
  });
  const restore = useMutation({
    mutationFn: (id: string) => writes.restoreCard(id),
    onSuccess: (_r, id) => {
      invalidate();
      toast.close(`archive-${id}`);
    },
    onError: (error, id) =>
      toast.add({ id: `archive-${id}`, type: "error", title: errorMessage(error) }),
  });
  const save = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: CardPatch }) => {
      const card = cards.data?.find((row) => row.card.id === id)?.card;
      return card ? (await writes.updateCard(card, patch)).card : api.updateCard(id, patch);
    },
    onMutate: ({ id }) => ({ term: cards.data?.find((c) => c.card.id === id)?.card.term }),
    onSuccess: (_card, { id }) => {
      toast.close(`save-${id}`);
      invalidate();
      qc.invalidateQueries({ queryKey: ["cards", id, "history"] });
    },
    // The editor has already closed, so the draft rides on Retry until it lands or the toast leaves.
    onError: (_e, { id, patch }, before) => {
      const failedTerm = before?.term ?? t`the card`;
      toast.add({
        id: `save-${id}`,
        type: "error",
        title: t`Couldn’t save “${failedTerm}”. Check your connection and try again.`,
        actionProps: { children: t`Retry`, onClick: () => save.mutate({ id, patch }) },
      });
    },
  });
  const enrich = useMutation({
    mutationFn: (card: Card) => api.enrichCard(card.id),
    // The card comes back working, so its shimmer starts before the next poll comes round.
    onSuccess: (card) =>
      qc.setQueryData(deckCardsQuery(deckId).queryKey, (rows) =>
        rows?.map((row) => (row.card.id === card.id ? { ...row, card } : row)),
      ),
    onError: (error, card) => {
      const term = shortQuote(card.term);
      // The menu only offers this while a field is empty, so a refusal means the card filled
      // itself, or another device did, between the menu opening and the tap.
      if (error instanceof ApiError && error.status === 400) {
        toast.add({ id: `enrich-${card.id}`, title: t`“${term}” has nothing left to fill in.` });
        void qc.invalidateQueries({ queryKey: ["decks", deckId, "cards"] });
        return;
      }
      toast.add({
        id: `enrich-${card.id}`,
        type: "error",
        title: t`Couldn’t enrich “${term}”. Check your connection and try again.`,
        actionProps: { children: t`Retry`, onClick: () => enrich.mutate(card) },
      });
    },
  });
  const archiveDeck = useArchiveDeck(deckId, deck?.name);
  const leaveDeck = useLeaveDeck(deckId, deck?.name);
  const [leaving, setLeaving] = useState(false);

  return (
    <>
      <DeckDetailView
        deck={deck}
        failure={failure}
        onRetry={retry}
        retryPending={decks.isFetching || cards.isFetching || sections.isFetching}
        // Held until the sections arrive, so a sectioned deck never flashes in another order.
        cards={sections.isPending ? undefined : cards.data}
        streak={streak.data}
        onReview={() => navigate({ to: "/review", search: { deck: deckId } })}
        onSettings={() => navigate({ to: "/library/$deckId/settings", params: { deckId } })}
        // Every write is the owner's; a member reads the deck and leaves it. ADR 0011.
        owner={
          isOwner
            ? {
                onAddCard: () => add.openCard(deckId),
                onArchiveCard: (id) => archive.mutate(id),
                onEditCard: (card) => setEditingId(card.id),
                onEnrichCard: (card) => enrich.mutate(card),
                onMoveCard: (id, toDeck) => {
                  setOpen(null);
                  save.mutate({ id, patch: { deckId: toDeck } });
                },
                onArchiveDeck: () => archiveDeck.mutate(),
                onExport: () => setExporting(true),
                onMoveToSeries: () => setMovingToSeries(true),
                sections: {
                  onCreate: () => setNaming({}),
                  onRename: (section) => setNaming({ section }),
                  onAddCard: (section) => add.openCard(deckId, { sectionId: section.id }),
                  onManage: () =>
                    navigate({
                      to: "/library/$deckId/settings",
                      params: { deckId },
                      hash: "sections",
                    }),
                  onPickSection: (cardIds, after) => setPicking({ cardIds, after }),
                  onMoveCards: (cardIds, section) =>
                    sectionActions.moveCards.mutate({
                      cardIds,
                      sectionId: section?.id ?? null,
                      sectionName: section?.name ?? "",
                      term:
                        cardIds.length === 1
                          ? cards.data?.find((row) => row.card.id === cardIds[0])?.card.term
                          : undefined,
                    }),
                },
              }
            : undefined
        }
        member={isMember ? { onLeave: () => setLeaving(true) } : undefined}
        seriesName={series.data?.find((s) => s.id === deck?.seriesId)?.name}
        openCardId={openCardId ?? null}
        onOpen={setOpen}
        history={wordHistory}
        onPlayAudio={playAudio}
        decks={decks.data}
        sections={sectionList}
        progress={deck?.sectionProgression === "open" ? null : sections.data?.progress}
        onStartSection={startSection}
        onReviewSection={(section) =>
          navigate({ to: "/review", search: { deck: deckId, section: section.id } })
        }
        startSectionPending={sectionActions.start.isPending}
        connectUrl={publicSiteUrl("/docs/mcp")}
        connected={apps.isSuccess ? apps.data.length > 0 : apps.isError ? false : undefined}
      />
      <EditCardSheet
        card={editing}
        decks={decks.data}
        onOpenChange={() => setEditingId(null)}
        onReopen={(card) => setEditingId(card.id)}
        // A card that moved is no longer in this deck's list, so it closes with the sheet.
        onSaved={(_card, movedFrom) => movedFrom && setOpen(null)}
      />
      {isOwner && (
        <>
          <SectionNameDialog
            open={!!naming}
            onOpenChange={(open) => {
              if (open) return;
              setNaming(null);
              sectionActions.create.reset();
              sectionActions.rename.reset();
            }}
            section={naming?.section}
            pending={sectionActions.create.isPending || sectionActions.rename.isPending}
            error={
              sectionActions.create.isError
                ? errorMessage(sectionActions.create.error)
                : sectionActions.rename.isError
                  ? errorMessage(sectionActions.rename.error)
                  : undefined
            }
            onSubmit={async (name) => {
              const renaming = naming?.section;
              if (renaming) await sectionActions.rename.mutateAsync({ id: renaming.id, name });
              else await sectionActions.create.mutateAsync({ name });
              setNaming(null);
            }}
          />
          <MoveToSectionDialog
            open={!!picking}
            onOpenChange={(open) => {
              if (open) return;
              setPicking(null);
              sectionActions.create.reset();
            }}
            count={shownPicking?.cardIds.length ?? 0}
            term={
              shownPicking?.cardIds.length === 1
                ? cards.data?.find((row) => row.card.id === shownPicking.cardIds[0])?.card.term
                : undefined
            }
            current={(() => {
              const rows = cards.data?.filter((row) => shownPicking?.cardIds.includes(row.card.id));
              const first = rows?.[0]?.card.sectionId ?? null;
              return rows?.every((row) => row.card.sectionId === first) ? first : undefined;
            })()}
            sections={sectionList}
            onMove={(section) => {
              if (!picking) return;
              sectionActions.moveCards.mutate({
                cardIds: picking.cardIds,
                sectionId: section?.id ?? null,
                sectionName: section?.name ?? "",
                term:
                  picking.cardIds.length === 1
                    ? cards.data?.find((row) => row.card.id === picking.cardIds[0])?.card.term
                    : undefined,
              });
              picking.after();
              setPicking(null);
            }}
            pending={sectionActions.create.isPending}
            error={
              sectionActions.create.isError ? errorMessage(sectionActions.create.error) : undefined
            }
            onCreate={async (name) => {
              if (!picking) return;
              // One write, so a failure never leaves an empty section behind.
              const created = await sectionActions.create.mutateAsync({
                name,
                cardIds: picking.cardIds,
              });
              const sectionName = created.name;
              toast.add({
                id: `move-cards-${deckId}`,
                title: t`Moved to ${sectionName}`,
              });
              picking.after();
              setPicking(null);
              sectionActions.create.reset();
            }}
          />
        </>
      )}
      <StartEarlyDialog
        target={startingEarly}
        onOpenChange={(open) => !open && setStartingEarly(null)}
        onStart={() => {
          if (startingEarly) {
            sectionActions.start.mutate({
              section: startingEarly.section,
              opening: startingEarly.opening.length,
            });
          }
          setStartingEarly(null);
        }}
      />
      {isMember && deck && (
        <LeaveDeckDialog
          open={leaving}
          onOpenChange={setLeaving}
          deckName={deck.name}
          onLeave={() => leaveDeck.mutate()}
          pending={leaveDeck.isPending}
        />
      )}
      {deck && isOwner && (
        <ExportSheet
          open={exporting}
          onOpenChange={setExporting}
          scope={{
            kind: "deck",
            deckId: deck.id,
            deckName: deck.name,
            onCsv: () => cards.data && exportCsv(deck.name, cards.data),
            csvLeavesPictures: cards.data?.some((row) => row.card.image) ?? false,
          }}
        />
      )}
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
          pending={seriesActions.create.isPending}
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
