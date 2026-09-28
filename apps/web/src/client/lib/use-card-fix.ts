import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { FixInput } from "@lymi/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../components/ui/toast";
import { api, type FixResult } from "./api";
import { refreshAfterCardWrite } from "./card-writes";
import { shortQuote } from "./short-quote";

/** Accepts a drafted fix and offers Undo in a toast, which reverses exactly what it wrote. */
export function useCardFix() {
  const { t } = useLingui();
  const qc = useQueryClient();
  // The toast outlives the sheet, and a mutation's own callbacks still run after unmount.
  const undo = useMutation({
    mutationFn: (id: string) => api.undoFix(id),
    onSuccess: async (_r, id) => {
      toast.close(`fix-${id}`);
      await refreshAfterCardWrite(qc);
    },
    onError: (_e, id) =>
      toast.add({
        id: `fix-${id}`,
        type: "error",
        title: t`Couldn’t undo the change. Check your connection and try again.`,
      }),
  });

  const title = (cause: FixInput["cause"], result: FixResult) => {
    if (cause === "several_answers") return t`Question changed`;
    if (cause === "no_anchor") return t`Hook added`;
    const added = result.added.length;
    if (cause === "confused_pair" && added === 0) return t`Both cards are already in your decks.`;
    const skipped = result.skipped[0];
    if (!skipped) {
      return cause === "two_things"
        ? t`Split into 2 cards`
        : t`${plural(added, { one: "Added # card", other: "Added # cards" })}`;
    }
    const term = shortQuote(skipped.term);
    const deckName = skipped.deckName;
    return cause === "two_things"
      ? t`Changed the card. “${term}” is already in ${deckName}.`
      : t`Added 1 card. “${term}” is already in ${deckName}.`;
  };

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FixInput }) => api.acceptFix(id, input),
    onSuccess: async (result, { id, input }) => {
      const changed = result.added.length > 0 || !!result.edited;
      toast.add({
        id: `fix-${id}`,
        title: title(input.cause, result),
        actionProps: changed ? { children: t`Undo`, onClick: () => undo.mutate(id) } : undefined,
      });
      await refreshAfterCardWrite(qc, result.edited?.id);
    },
  });
}
