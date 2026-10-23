import { useLingui } from "@lingui/react/macro";
import { ApiError, api, type Card } from "@lymi/client/api";
import { deckCardsQuery } from "@lymi/client/queries";
import { isolate } from "@lymi/core";
import { useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { ToastScope, toast } from "../ui/toast-host";
import { ENRICH_POLL, watchEnrichment } from "./enrich-watch";

export { canEnrich } from "./enrich-watch";

/** Asks the AI to fill a card's empty fields; the card comes back working and its page shimmers. */
export function useEnrichCard() {
  const { t } = useLingui();
  const qc = useQueryClient();
  // A review hosts its own toasts, so a failure there shows over its card rather than behind it.
  const scope = useContext(ToastScope);
  const enrich = async (card: Card) => {
    const term = card.term;
    try {
      const working = await api.enrichCard(card.id);
      // The card comes back working, so its page shimmers before the next poll comes round.
      qc.setQueryData(deckCardsQuery(card.deckId).queryKey, (rows) =>
        rows?.map((row) => (row.card.id === working.id ? { ...row, card: working } : row)),
      );
      void qc.invalidateQueries({ queryKey: ["cards", card.id, "history"] });
      void watchEnrichment(working, {
        // A deck page already polling keeps the list fresh, so this reads its copy rather than asking twice.
        read: () =>
          qc
            .fetchQuery({ ...deckCardsQuery(card.deckId), staleTime: ENRICH_POLL - 500 })
            .catch(() => null),
      }).then((settled) => {
        if (!settled) return;
        for (const queryKey of [["cards"], ["queue"]]) void qc.invalidateQueries({ queryKey });
      });
    } catch (error) {
      // The menu offers this only while a field is empty, so a refusal means the card was filled
      // meanwhile, by its own run or on another device.
      if (error instanceof ApiError && error.status === 400) {
        toast.add({
          id: `enrich-${card.id}`,
          scope,
          title: t`“${{ term: isolate(term) }}” has nothing left to fill in.`,
        });
        void qc.invalidateQueries({ queryKey: deckCardsQuery(card.deckId).queryKey });
        return;
      }
      toast.add({
        id: `enrich-${card.id}`,
        scope,
        error: true,
        title: t`Couldn’t enrich “${{ term: isolate(term) }}”. Check your connection and try again.`,
        action: { label: t`Retry`, onPress: () => void enrich(card) },
      });
    }
  };
  return enrich;
}
