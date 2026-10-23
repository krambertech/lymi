import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { isolate, tagKey } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MergeTagDialog, RenameTagDialog } from "../components/tag-dialogs";
import { toast } from "../components/ui/toast";
import { api, type DeckTags, errorMessage } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import { deckTagsQuery, settleDeckTags, tagsQuery } from "../lib/queries";
import { DeckTagsView } from "../views/deck-tags-view";

export const Route = createFileRoute("/library/$deckId/settings/tags")({
  component: DeckTagsPage,
});

type DeckTag = DeckTags["tags"][number];

function DeckTagsPage() {
  const { t } = useLingui();
  useDocumentTitle(t`Tags`);
  const { deckId } = Route.useParams();
  const qc = useQueryClient();
  const tags = useQuery(deckTagsQuery(deckId));
  const inUse = useQuery(tagsQuery).data?.filter((tag) => tag.own) ?? [];
  const [renaming, setRenaming] = useState<DeckTag | null>(null);
  const [merging, setMerging] = useState<DeckTag | null>(null);

  const settle = (next: DeckTags) => settleDeckTags(qc, deckId, next);
  const failed = (id: string, error: unknown) =>
    toast.add({ id, type: "error", title: errorMessage(error) });

  // Decided before the write, since the lists it reads change once the rename lands.
  const isMerge = (from: string, to: string) =>
    [...inUse, ...(tags.data?.tags ?? [])].some(
      (tag) => tagKey(tag.name) === tagKey(to) && tagKey(tag.name) !== tagKey(from),
    );

  const rename = useMutation({
    mutationFn: (input: { from: string; to: string; merge: boolean; undoing?: boolean }) =>
      api.renameDeckTag(deckId, { from: input.from, to: input.to }),
    onSuccess: async (next, { from, to, merge, undoing }) => {
      setRenaming(null);
      setMerging(null);
      await settle(next);
      if (undoing) return;
      const id = `rename-tag-${deckId}`;
      const spelled = next.tags.find((tag) => tagKey(tag.name) === tagKey(to))?.name ?? to;
      // A merge cannot be told apart again, so only a plain rename offers Undo.
      toast.add(
        merge
          ? { id, title: t`Merged “${from}” into “${spelled}”` }
          : {
              id,
              title: t`Renamed “${from}” to “${spelled}”`,
              actionProps: {
                children: t`Undo`,
                onClick: () => {
                  toast.close(id);
                  rename.mutate({ from: spelled, to: from, merge: false, undoing: true });
                },
              },
            },
      );
    },
    onError: (error) => failed(`rename-tag-${deckId}`, error),
  });

  const restore = useMutation({
    mutationFn: (tag: DeckTag) => api.restoreDeckTag(deckId, { name: tag.name }),
    onSuccess: async (next, tag) => {
      toast.close(`archive-tag-${deckId}-${tag.name}`);
      await settle(next);
    },
    onError: (error) => failed(`restore-tag-${deckId}`, error),
  });

  const archive = useMutation({
    mutationFn: (tag: DeckTag) => api.archiveDeckTag(deckId, { name: tag.name }),
    onSuccess: async (next, tag) => {
      await settle(next);
      const id = `archive-tag-${deckId}-${tag.name}`;
      const tagName = tag.name;
      toast.add({
        id,
        title: t`Archived “${{ tagName: isolate(tagName) }}” from ${plural(tag.cards, { one: "# card", other: "# cards" })}`,
        actionProps: { children: t`Undo`, onClick: () => restore.mutate(tag) },
      });
    },
    onError: (error) => failed(`archive-tag-${deckId}`, error),
  });

  return (
    <>
      <DeckTagsView
        deckId={deckId}
        tags={tags.data}
        failed={tags.isError}
        onRetry={() => void tags.refetch()}
        retrying={tags.isFetching}
        onRename={setRenaming}
        onMerge={setMerging}
        onArchive={(tag) => archive.mutate(tag)}
        onRestore={(tag) => restore.mutate(tag)}
        restoring={restore.isPending ? restore.variables?.name : undefined}
      />
      <RenameTagDialog
        tag={renaming}
        inUse={inUse}
        onOpenChange={(open) => {
          if (open) return;
          setRenaming(null);
          rename.reset();
        }}
        onSubmit={(to) =>
          renaming
            ? rename.mutateAsync({ from: renaming.name, to, merge: isMerge(renaming.name, to) })
            : Promise.resolve()
        }
        pending={rename.isPending}
        error={rename.isError && renaming ? errorMessage(rename.error) : undefined}
      />
      <MergeTagDialog
        tag={merging}
        tags={tags.data?.tags ?? []}
        onOpenChange={(open) => !open && setMerging(null)}
        onMerge={(into) =>
          merging && rename.mutate({ from: merging.name, to: into.name, merge: true })
        }
      />
    </>
  );
}
