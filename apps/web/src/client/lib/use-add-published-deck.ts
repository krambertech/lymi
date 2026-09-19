import { useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "../components/ui/toast";
import { ApiError, api } from "./api";

/**
 * Adding a published deck, from wherever Explore offers it. The caller passes the edition the row
 * it pressed was read in, so the deck lands in Library saying what Explore said: the server pins
 * nothing when it is told nothing, and a membership's edition is never chosen again. ADR 0015.
 *
 * The learner always stays where they pressed. `announce` says who tells them it worked: a shelf
 * raises a toast that offers the deck, while a deck's own page shows the change itself.
 */
export function useAddPublishedDeck({ announce }: { announce: "toast" | "page" }) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: ({ slug, edition }: { slug: string; name: string; edition: string }) =>
      api.addPublishedDeck(slug, edition),
    onSuccess: async ({ deckId }, { name }) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["decks"] }),
        qc.invalidateQueries({ queryKey: ["explore"] }),
      ]);
      if (announce === "page") return;
      toast.add({
        id: `added-${deckId}`,
        title: t`Added “${name}” to Library`,
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
            ? t`Couldn’t add the deck. It’s no longer published.`
            : t`Couldn’t add the deck. Check your connection and try again.`,
      });
    },
  });
}
