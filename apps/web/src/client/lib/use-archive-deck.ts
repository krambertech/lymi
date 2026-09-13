import { useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "../components/ui/toast";
import { api } from "./api";

/** Archives a deck, returns to the deck list, and offers Undo there. */
export function useArchiveDeck(deckId: string, name: string | undefined) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toastId = `archive-deck-${deckId}`;
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["decks"] });
    qc.invalidateQueries({ queryKey: ["queue"] });
  };
  // The toast outlives the deck screen, and a mutation's own callbacks still run after unmount.
  const restore = useMutation({
    mutationFn: () => api.restoreDeck(deckId),
    onSuccess: () => {
      invalidate();
      toast.close(toastId);
    },
  });
  return useMutation({
    mutationFn: () => api.archiveDeck(deckId),
    onSuccess: () => {
      invalidate();
      navigate({ to: "/library" });
      const deckName = name ?? t`Deck`;
      toast.add({
        id: toastId,
        title: t`Archived “${deckName}”`,
        actionProps: { children: t`Undo`, onClick: () => restore.mutate() },
      });
    },
  });
}
