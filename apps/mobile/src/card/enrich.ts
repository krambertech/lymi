import { useLingui } from "@lingui/react/macro";
import { ApiError, api, type Card } from "@lymi/client/api";
import { deckCardsQuery } from "@lymi/client/queries";
import { isolate } from "@lymi/core";
import { useQueryClient } from "@tanstack/react-query";
import { useAiConsent } from "../privacy/ai-consent";
import { toast } from "../ui/toast-host";

export { canEnrich } from "./can-enrich";

/**
 * Asks the AI to fill a card's empty fields, after the learner's yes to AI. The card comes back working,
 * so its page shimmers and the deck's own poll lands the text. Render `sheet` on the page that asks.
 */
export function useEnrichCard() {
  const { t } = useLingui();
  const qc = useQueryClient();
  const consent = useAiConsent("enrich");
  const enrich = async (card: Card) => {
    // Not now leaves the card as it is; the server would refuse without the yes anyway. ADR 0039.
    if (!(consent.allowed || (await consent.ask()))) return;
    const term = card.term;
    try {
      const working = await api.enrichCard(card.id);
      qc.setQueryData(deckCardsQuery(card.deckId).queryKey, (rows) =>
        rows?.map((row) => (row.card.id === working.id ? { ...row, card: working } : row)),
      );
      void qc.invalidateQueries({ queryKey: ["cards", card.id, "history"] });
    } catch (error) {
      // Enrich shows only while a field is empty, so a refusal means the card was filled
      // meanwhile, by its own run or on another device.
      if (error instanceof ApiError && error.status === 400) {
        toast.add({
          id: `enrich-${card.id}`,
          title: t`“${{ term: isolate(term) }}” has nothing left to fill in.`,
        });
        void qc.invalidateQueries({ queryKey: deckCardsQuery(card.deckId).queryKey });
        return;
      }
      toast.add({
        id: `enrich-${card.id}`,
        error: true,
        title: t`Couldn’t enrich “${{ term: isolate(term) }}”. Check your connection and try again.`,
        action: { label: t`Retry`, onPress: () => void enrich(card) },
      });
    }
  };
  return { enrich, sheet: consent.sheet };
}
