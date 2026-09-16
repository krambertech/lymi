import { useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArchivedSectionsDialog,
  ArchiveSectionDialog,
  SectionNameDialog,
} from "../components/section-dialogs";
import { api, errorMessage, type Section } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import {
  archivedSectionsQuery,
  deckCardsQuery,
  decksQuery,
  joinLinkQuery,
  sectionsQuery,
} from "../lib/queries";
import { useArchiveDeck } from "../lib/use-archive-deck";
import { useSectionActions } from "../lib/use-sections";
import { type DeckSettingsPatch, DeckSettingsView } from "../views/deck-settings-view";

export const Route = createFileRoute("/library/$deckId/settings")({
  component: DeckSettings,
});

function DeckSettings() {
  const { t } = useLingui();
  const { deckId } = Route.useParams();
  const qc = useQueryClient();
  const decks = useQuery(decksQuery);
  const cards = useQuery(deckCardsQuery(deckId));
  const deck = decks.data?.find((d) => d.id === deckId);
  useDocumentTitle(t`Deck settings`);
  // The oldest card with a meaning, so the direction rows read the same way twice running.
  const isOwner = deck?.role === "owner";
  const joinLink = useQuery({ ...joinLinkQuery(deckId), enabled: isOwner });
  const sections = useQuery({ ...sectionsQuery(deckId), enabled: isOwner });
  const sectionActions = useSectionActions(deckId);
  const [naming, setNaming] = useState<{ section?: Section | undefined } | null>(null);
  const [archiving, setArchiving] = useState<Section | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  // Fetched up front, so the way to archived sections shows only when there are some.
  const archived = useQuery({ ...archivedSectionsQuery(deckId), enabled: isOwner });
  const example = cards.data?.filter((c) => c.card.meaning).at(-1)?.card;

  const [saved, setSaved] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const save = useMutation({
    mutationFn: (patch: DeckSettingsPatch) => api.updateDeck(deckId, patch),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["decks"] }),
        qc.invalidateQueries({ queryKey: ["queue"] }),
        qc.invalidateQueries({ queryKey: ["decks", deckId, "cards"] }),
      ]);
      setSaved(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setSaved(false), 2500);
    },
  });

  const archive = useArchiveDeck(deckId, deck?.name);

  const turnOn = useMutation({
    mutationFn: () => api.turnOnJoinLink(deckId),
    onSuccess: (value) => {
      qc.setQueryData(joinLinkQuery(deckId).queryKey, value);
      // Turning the link on is an Activity row.
      void qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
  const turnOff = useMutation({
    mutationFn: () => api.turnOffJoinLink(deckId),
    onSuccess: () => {
      qc.setQueryData(joinLinkQuery(deckId).queryKey, (prev) => ({
        link: null,
        members: prev?.members ?? 0,
      }));
      void qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
  const sharingError = turnOn.isError
    ? t`Could not turn on the join link. Try again.`
    : turnOff.isError
      ? t`Could not turn off the join link. Try again.`
      : joinLink.isError
        ? t`Could not load the join link.`
        : undefined;

  return (
    <>
      <DeckSettingsView
        deck={deck}
        example={example ? { term: example.term, meaning: example.meaning } : undefined}
        onSave={(patch) => save.mutate(patch)}
        saving={save.isPending}
        saved={saved}
        error={save.isError ? errorMessage(save.error) : undefined}
        onArchive={() => archive.mutate()}
        sections={
          isOwner
            ? {
                sections: sections.data?.sections ?? [],
                onCreate: () => setNaming({}),
                onRename: (section) => setNaming({ section }),
                onMove: (section, by) => {
                  const ids = (sections.data?.sections ?? []).map((s) => s.id);
                  const from = ids.indexOf(section.id);
                  const to = from + by;
                  if (from < 0 || to < 0 || to >= ids.length) return;
                  ids.splice(from, 1);
                  ids.splice(to, 0, section.id);
                  sectionActions.reorder.mutate(ids);
                },
                onArchive: (section) =>
                  section.total > 0
                    ? setArchiving(section)
                    : sectionActions.archive.mutate({ section, cards: "keep" }),
                onShowArchived: () => setShowArchived(true),
                archivedCount: archived.data?.sections.length ?? 0,
              }
            : undefined
        }
        sharing={
          isOwner
            ? {
                deckName: deck.name,
                link: joinLink.data?.link,
                members: joinLink.data?.members ?? 0,
                onTurnOn: () => turnOn.mutate(),
                onTurnOff: () => turnOff.mutate(),
                pending: turnOn.isPending ? "on" : turnOff.isPending ? "off" : undefined,
                error: sharingError,
              }
            : undefined
        }
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
          <ArchiveSectionDialog
            section={archiving}
            onOpenChange={(open) => !open && setArchiving(null)}
            onArchive={(choice) => {
              if (archiving) sectionActions.archive.mutate({ section: archiving, cards: choice });
              setArchiving(null);
            }}
          />
          <ArchivedSectionsDialog
            open={showArchived}
            onOpenChange={setShowArchived}
            sections={archived.data?.sections}
            onRestore={(section) => sectionActions.restore.mutate(section)}
            restoring={
              sectionActions.restore.isPending ? sectionActions.restore.variables?.id : undefined
            }
            error={archived.isError ? errorMessage(archived.error) : undefined}
          />
        </>
      )}
    </>
  );
}
