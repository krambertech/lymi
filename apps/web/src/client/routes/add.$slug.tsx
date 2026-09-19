import { useLingui } from "@lingui/react/macro";
import type { JoinPreviewOut } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ApiError, api } from "../lib/api";
import { signInWithGoogle } from "../lib/auth";
import { clearPersistedLearnerState } from "../lib/persisted";
import { addPreviewQuery } from "../lib/queries";
import { JoinView } from "../views/join-view";

const Search = z.object({
  /** Keeps the local email sign-in out of the real add page, as on /login. */
  dev: z.coerce.string().pipe(z.literal("1")).optional(),
  continue: z.coerce.string().optional(),
  /** The edition the public page was read in. Pinned on the membership. ADR 0015. */
  edition: z.coerce.string().max(12).optional(),
});

export const Route = createFileRoute("/add/$slug")({
  validateSearch: Search,
  component: Add,
});

/** The Worker writes the preview into the page it served (server/join-page.ts). */
const served = (() => {
  if (typeof document === "undefined") return null;
  const element = document.getElementById("lymi-join-preview");
  if (!element?.textContent) return null;
  try {
    return {
      path: window.location.pathname,
      preview: JSON.parse(element.textContent) as JoinPreviewOut,
    };
  } catch {
    return null;
  }
})();

/** Where "Add to Lymi" on a published deck's public page lands. ADR 0020. */
function Add() {
  const { t } = useLingui();
  const { slug } = Route.useParams();
  const { dev, edition } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [failed, setFailed] = useState<string | null>(null);
  const path = `/add/${slug}`;
  const preview = useQuery({
    ...addPreviewQuery(slug),
    initialData: () => (served?.path === path ? served.preview : undefined),
  });
  const returnTo = `${path}?${new URLSearchParams({ continue: "1", ...(edition && { edition }) })}`;
  // An edition the deck is not published in is ignored, so an old link still adds the original.
  const chosen = preview.data?.editions?.includes(edition ?? "") ? edition : undefined;

  const describe = (err: unknown) => {
    if (err instanceof ApiError && err.status === 404) {
      return t`This deck is no longer published.`;
    }
    if (err instanceof ApiError && err.status === 403) {
      return t`You cannot add this deck.`;
    }
    return t`Couldn’t add the deck. Check your connection and try again.`;
  };

  const hold = useMutation({
    mutationFn: async (via: "google" | "dev") => {
      await api.holdPublishedDeck(slug, chosen);
      // The account coming back may not be the one whose cache is on this device.
      clearPersistedLearnerState();
      if (via === "dev") {
        window.location.assign(`/login?${new URLSearchParams({ dev: "1", returnTo })}`);
        return;
      }
      const res = await signInWithGoogle(returnTo);
      if (res.error) throw new Error(res.error.message);
    },
    onMutate: () => setFailed(null),
    onError: (err) => {
      setFailed(describe(err));
      void preview.refetch();
    },
  });

  const add = useMutation({
    mutationFn: () => api.addPublishedDeck(slug, chosen),
    onMutate: () => setFailed(null),
    onSuccess: async ({ deckId }) => {
      // Explore holds which decks are already the learner's, so it is stale the moment this lands.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["decks"] }),
        qc.invalidateQueries({ queryKey: ["explore"] }),
      ]);
      navigate({ to: "/library/$deckId", params: { deckId } });
    },
    onError: (err) => {
      setFailed(describe(err));
      void preview.refetch();
    },
  });

  const busy = hold.isPending || add.isPending;

  return (
    <JoinView
      kind="publication"
      preview={preview.data}
      busy={busy}
      error={failed ?? (preview.isError ? describe(preview.error) : undefined)}
      onJoinWithGoogle={busy ? undefined : () => hold.mutate("google")}
      onJoin={busy ? undefined : () => add.mutate()}
      devSignIn={
        import.meta.env.DEV &&
        dev === "1" &&
        preview.data?.status === "live" &&
        preview.data.viewer === "signed-out" ? (
          <button
            type="button"
            onClick={() => hold.mutate("dev")}
            className="mt-10 rounded-sm px-2 py-1 text-xs text-faint transition-colors duration-150 hoverable:hover:text-muted"
          >
            Dev sign-in
          </button>
        ) : undefined
      }
    />
  );
}
