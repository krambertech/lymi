import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { type DeckRow, tagEdits } from "@lymi/client/deck-list";
import { backlogOf } from "@lymi/core/analytics";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../components/ui/toast";
import { api, errorMessage } from "./api";
import { deckCardsQuery } from "./queries";
import { captureAnalytics } from "./telemetry";

type Edit = { cardId: string; tags: string[] };
type Change = { add: string[]; remove: string[] };

/** Puts tags on, or takes them off, many of a deck's cards in one go, with an Undo. */
export function useTagCards(deckId: string) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const cardsKey = deckCardsQuery(deckId).queryKey;

  /** Cards a failed call never reached come back unsaved, beside whatever earlier calls saved. */
  const send = async (edits: Edit[]) => {
    try {
      const out = await api.editCards(edits);
      const saved = new Set(out.results.flatMap((r) => (r.status === "error" ? [] : [r.id])));
      return { saved, error: undefined };
    } catch (error) {
      return { saved: new Set<string>(), error };
    }
  };

  const place = (edits: Edit[]) => {
    void qc.cancelQueries({ queryKey: cardsKey, exact: true });
    const byId = new Map(edits.map((e) => [e.cardId, e.tags]));
    qc.setQueryData<DeckRow[]>(cardsKey, (prev) =>
      prev?.map((row) => {
        const tags = byId.get(row.card.id);
        return tags ? { ...row, card: { ...row.card, tags } } : row;
      }),
    );
  };

  const write = useMutation({
    mutationFn: ({
      edits,
    }: {
      edits: Edit[];
      undo: Edit[];
      offerUndo: boolean;
      full: number;
      change?: Change;
    }) => send(edits),
    onMutate: ({ edits }) => place(edits),
    onSuccess: ({ saved, error }, { edits, undo, offerUndo, full, change }) => {
      const id = `tag-cards-${deckId}`;
      const sent = edits.length;
      const count = saved.size;
      // Earlier calls may have saved, so only the cards that did not go back to their old tags.
      const failed = undo.filter((e) => !saved.has(e.cardId));
      if (failed.length > 0) place(failed);
      if (change && count > 0)
        captureAnalytics("cards_tagged", {
          cards: backlogOf(count),
          added: change.add.length,
          removed: change.remove.length,
        });
      if (failed.length > 0) {
        const unsaved = failed.length;
        toast.add({
          id,
          type: "error",
          title:
            error && count === 0
              ? errorMessage(error)
              : t`Couldn’t change the tags on ${unsaved} of ${sent} cards. Try again.`,
        });
        return;
      }
      if (!offerUndo) return;
      toast.add({
        id,
        title: t`Changed the tags on ${plural(count, { one: "# card", other: "# cards" })}`,
        description:
          full > 0
            ? t`${plural(full, { one: "# card", other: "# cards" })} already had 20 tags, so a tag was left off.`
            : undefined,
        actionProps: {
          children: t`Undo`,
          onClick: () => {
            toast.close(id);
            write.mutate({ edits: undo, undo: edits, offerUndo: false, full: 0 });
          },
        },
      });
    },
    // A refetch settles any card the server wrote differently from the cache, such as a tag respelled.
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: cardsKey, exact: true }),
        qc.invalidateQueries({ queryKey: ["tags"] }),
      ]),
  });

  /** Applies the change to these rows; a card it leaves as it was is not sent. */
  const apply = (rows: readonly DeckRow[], change: Change) => {
    const { edits, undo, full } = tagEdits(rows, change);
    if (edits.length > 0) write.mutate({ edits, undo, offerUndo: true, full, change });
    // Every chosen card already held twenty, so nothing was sent, which the learner should hear.
    else if (full > 0)
      toast.add({
        id: `tag-cards-${deckId}`,
        title: t`${plural(full, { one: "# card", other: "# cards" })} already had 20 tags, so a tag was left off.`,
      });
  };

  return { apply, pending: write.isPending };
}
