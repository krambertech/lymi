import { useLingui } from "@lingui/react/macro";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, useMatches, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DeleteSeriesDialog, SeriesSheet } from "../components/series-dialogs";
import { toast } from "../components/ui/toast";
import { useAddCard } from "../lib/add-card";
import { errorMessage, type Series } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import { publicSiteUrl } from "../lib/origins";
import {
  archivedDecksQuery,
  deckCardsQuery,
  decksQuery,
  meQuery,
  seriesQuery,
} from "../lib/queries";
import { Streak } from "../lib/streak";
import { useSeriesActions } from "../lib/use-series";
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
  const { t } = useLingui();
  useDocumentTitle(t`Library`);
  const decks = useQuery(decksQuery);
  const series = useQuery(seriesQuery);
  const me = useQuery(meQuery);
  // Deleting a series can archive decks, so Library says where they went.
  const archivedDecks = useQuery(archivedDecksQuery);
  const leave = useSignOut();
  const add = useAddCard();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const actions = useSeriesActions();
  // `null` is the new-series sheet; a series is that series' edit sheet.
  const [editing, setEditing] = useState<Series | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Series | null>(null);

  // Fetched here and persisted, so a deck opens offline after a visit to Library.
  useEffect(() => {
    for (const d of decks.data ?? []) {
      void qc.prefetchQuery({ ...deckCardsQuery(d.id), staleTime: 30_000 });
    }
  }, [decks.data, qc]);

  const saving = actions.create.isPending || actions.rename.isPending || actions.setDecks.isPending;
  const [saveError, setSaveError] = useState<string | undefined>();

  return (
    <>
      <LibraryView
        decks={decks.data}
        failed={decks.isError && decks.data === undefined}
        onRetry={() => void decks.refetch()}
        retrying={decks.isFetching}
        series={series.data}
        archivedCount={archivedDecks.data?.length}
        onAdd={() => add.openCard()}
        onCreateDeck={add.openDeck}
        onImport={() => void navigate({ to: "/settings", hash: "import" })}
        onNewSeries={() => setEditing(null)}
        onEditSeries={setEditing}
        onDeleteSeries={setDeleting}
        onMoveSeries={(s, by) => {
          const ids = (series.data ?? []).map((x) => x.id);
          const from = ids.indexOf(s.id);
          const to = from + by;
          if (from < 0 || to < 0 || to >= ids.length) return;
          ids.splice(from, 1);
          ids.splice(to, 0, s.id);
          actions.reorder.mutate(ids);
        }}
        onSetSeriesDecks={(id, deckIds) => {
          const target = series.data?.find((s) => s.id === id);
          const arrived = decks.data?.find((d) => deckIds.includes(d.id) && d.seriesId !== id);
          // Where the arriving deck came from, so Undo puts back exactly the list it left.
          const left = arrived?.seriesId
            ? series.data?.find((s) => s.id === arrived.seriesId)
            : undefined;
          const before = target?.deckIds ?? [];
          actions.setDecks.mutate(
            { id, deckIds },
            {
              onSuccess: () => {
                if (!arrived || !target) return;
                const deckName = arrived.name;
                const seriesName = target.name;
                const toastId = `move-${arrived.id}`;
                toast.add({
                  id: toastId,
                  title: t`Moved “${deckName}” to ${seriesName}`,
                  actionProps: {
                    children: t`Undo`,
                    onClick: () => {
                      toast.close(toastId);
                      if (left) actions.setDecks.mutate({ id: left.id, deckIds: left.deckIds });
                      else actions.setDecks.mutate({ id, deckIds: before });
                    },
                  },
                });
              },
            },
          );
        }}
        onRemoveFromSeries={(deckId) => {
          const deck = decks.data?.find((d) => d.id === deckId);
          if (deck) actions.moveDeck.mutate({ deck, seriesId: null });
        }}
        name={me.data?.name}
        email={me.data?.email}
        docsUrl={publicSiteUrl("/docs")}
        onSignOut={leave.signOut}
        signingOut={leave.busy}
        streakButton={<Streak variant="phone" />}
      />
      <SeriesSheet
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(undefined);
            setSaveError(undefined);
          }
        }}
        series={editing ?? undefined}
        decks={decks.data ?? []}
        allSeries={series.data ?? []}
        pending={saving}
        error={saveError}
        onSubmit={async ({ name, deckIds }) => {
          setSaveError(undefined);
          try {
            if (!editing) {
              await actions.create.mutateAsync({ name, deckIds });
            } else {
              // Decks first: a refused deck list then leaves the name as it was too.
              const same =
                deckIds.length === editing.deckIds.length &&
                deckIds.every((id, i) => id === editing.deckIds[i]);
              if (!same) {
                await actions.setDecks.mutateAsync({ id: editing.id, deckIds, quiet: true });
              }
              if (name !== editing.name) await actions.rename.mutateAsync({ id: editing.id, name });
            }
            setEditing(undefined);
          } catch (error) {
            setSaveError(errorMessage(error));
          }
        }}
      />
      <DeleteSeriesDialog
        series={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDelete={(choice) => {
          if (deleting) actions.remove.mutate({ series: deleting, decks: choice });
          setDeleting(null);
        }}
      />
    </>
  );
}
