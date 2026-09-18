import { useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "../components/ui/toast";
import { api, errorMessage } from "./api";

/**
 * Leaves a shared deck and returns to the deck list. No Undo: getting back in needs the join
 * link or the deck's public page, which the owner may have turned off since, so the dialog asks
 * first instead.
 */
export function useLeaveDeck(deckId: string, name: string | undefined) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => api.leaveDeck(deckId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decks"] });
      qc.invalidateQueries({ queryKey: ["queue"] });
      navigate({ to: "/library" });
      const deckName = name ?? t`Deck`;
      toast.add({ id: `leave-deck-${deckId}`, title: t`Left “${deckName}”` });
    },
    onError: (error) => {
      toast.add({ id: `leave-deck-${deckId}`, type: "error", title: errorMessage(error) });
    },
  });
}
