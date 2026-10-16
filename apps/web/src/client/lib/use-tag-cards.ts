import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { type DeckRow, retag } from "@lymi/client/deck-list";
import { backlogOf } from "@lymi/core/analytics";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../components/ui/toast";
import { api, errorMessage } from "./api";
import { deckCardsQuery } from "./queries";
import { captureAnalytics } from "./telemetry";

/** One bulk edit carries at most this many cards. */
const PER_CALL = 200;

type Edit = { cardId: string; tags: string[] };
type Change = { add: string[]; remove: string[] };

/** Puts tags on, or takes them off, many of a deck's cards in one go, with an Undo. */
export function useTagCards(deckId: string) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const cardsKey = deckCardsQuery(deckId).queryKey;

  const send = async (edits: Edit[]) => {
    const results = [];
    for (let i = 0; i < edits.length; i += PER_CALL) {
      const chunk = edits.slice(i, i + PER_CALL);
      const out = await api.editCards(chunk.map(({ cardId, tags }) => ({ cardId, tags })));
      results.push(...out.results);
    }
    return results.filter((r) => r.status === "error").length;
  };

  const place = (edits: Edit[]) => {
    void qc.cancelQueries({ queryKey: cardsKey, exact: true });
    const before = qc.getQueryData<DeckRow[]>(cardsKey);
    const byId = new Map(edits.map((e) => [e.cardId, e.tags]));
    qc.setQueryData<DeckRow[]>(cardsKey, (prev) =>
      prev?.map((row) => {
        const tags = byId.get(row.card.id);
        return tags ? { ...row, card: { ...row.card, tags } } : row;
      }),
    );
    return { restore: () => qc.setQueryData(cardsKey, before) };
  };

  const write = useMutation({
    mutationFn: ({
      edits,
    }: {
      edits: Edit[];
      undo: Edit[] | null;
      full: number;
      change?: Change;
    }) => send(edits),
    onMutate: ({ edits }) => place(edits),
    onSuccess: (failed, { edits, undo, full, change }, context) => {
      const id = `tag-cards-${deckId}`;
      const sent = edits.length;
      if (failed > 0) {
        context?.restore();
        toast.add({
          id,
          type: "error",
          title: t`Couldn’t change the tags on ${failed} of ${sent} cards. Try again.`,
        });
        return;
      }
      if (!undo) return;
      const count = edits.length;
      if (change)
        captureAnalytics("cards_tagged", {
          cards: backlogOf(count),
          added: change.add.length,
          removed: change.remove.length,
        });
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
            write.mutate({ edits: undo, undo: null, full: 0 });
          },
        },
      });
    },
    onError: (error, _vars, context) => {
      context?.restore();
      toast.add({ id: `tag-cards-${deckId}`, type: "error", title: errorMessage(error) });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });

  /** Applies the change to these rows; a card it leaves as it was is not sent. */
  const apply = (rows: readonly DeckRow[], change: Change) => {
    const edits: Edit[] = [];
    const undo: Edit[] = [];
    let full = 0;
    for (const row of rows) {
      const next = retag(row.card.tags, change.add, change.remove);
      if (next.full) full += 1;
      if (next.tags.join("\n") === row.card.tags.join("\n")) continue;
      edits.push({ cardId: row.card.id, tags: next.tags });
      undo.push({ cardId: row.card.id, tags: [...row.card.tags] });
    }
    if (edits.length > 0) write.mutate({ edits, undo, full, change });
  };

  return { apply, pending: write.isPending };
}
