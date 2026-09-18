import { useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "../components/ui/toast";
import { ApiError, api } from "./api";

/**
 * Adding a published deck, from wherever Explore offers it. The edition is the learner's own
 * meaning language where the deck is published in it, chosen on the server; an old pin never
 * moves. ADR 0015, ADR 0020.
 *
 * `land` decides where the press leaves the learner: pressing Add on a deck's own page means
 * they want that deck, so it opens in Library; pressing it in a list means they are still
 * browsing, so the list stays put and a toast says where the deck went.
 */
export function useAddPublishedDeck({ land }: { land: "library" | "here" }) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: ({ slug }: { slug: string; name: string }) => api.addPublishedDeck(slug),
    onSuccess: async ({ deckId }, { name }) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["decks"] }),
        qc.invalidateQueries({ queryKey: ["explore"] }),
      ]);
      if (land === "library") {
        navigate({ to: "/library/$deckId", params: { deckId } });
        return;
      }
      toast.add({
        id: `added-${deckId}`,
        title: t`“${name}” is in your library`,
        actionProps: {
          children: t`Open`,
          onClick: () => navigate({ to: "/library/$deckId", params: { deckId } }),
        },
      });
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title:
          error instanceof ApiError && error.status === 404
            ? t`This deck is no longer published.`
            : t`Could not add the deck. Check your connection and try again.`,
      });
    },
  });
}
