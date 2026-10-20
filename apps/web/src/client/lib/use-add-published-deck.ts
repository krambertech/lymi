import { useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "../components/ui/toast";
import { ApiError, api } from "./api";
import { captureAnalytics } from "./telemetry";

/**
 * Adding a published deck, from wherever Explore offers it. The caller passes the edition the row
 * it pressed was read in, so the deck lands in Library saying what Explore said: the server pins
 * nothing when it is told nothing, and a membership's edition is never chosen again. ADR 0015.
 *
 * `announce` says who tells them it worked: a shelf raises a toast that offers the deck, a deck's
 * own page shows the change itself, and Today's first run opens the deck's first review at once.
 */
export function useAddPublishedDeck({ announce }: { announce: "toast" | "page" | "review" }) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: ({ slug, edition }: { slug: string; name: string; edition: string }) => {
      captureAnalytics("add_to_lymi_clicked", { deck_slug: slug });
      return api.addPublishedDeck(slug, edition);
    },
    onSuccess: async ({ deckId }, { name }) => {
      // The deck's cards join the day's review. A cached queue would open the next review on the
      // old cards before its refetch begins, so it goes rather than going stale.
      qc.removeQueries({ queryKey: ["queue"] });
      const refreshed = Promise.all([
        qc.invalidateQueries({ queryKey: ["decks"] }),
        qc.invalidateQueries({ queryKey: ["explore"] }),
        qc.invalidateQueries({ queryKey: ["rounds"] }),
      ]);
      // Leaving before the refetch lands keeps the page under the press from reshuffling first.
      if (announce === "review") {
        void navigate({ to: "/review", search: { deck: deckId } });
        return;
      }
      await refreshed;
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
