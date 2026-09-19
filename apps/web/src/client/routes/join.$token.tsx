import { useLingui } from "@lingui/react/macro";
import type { JoinPreviewOut } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ApiError, api, refusalDetail } from "../lib/api";
import { signInWithGoogle } from "../lib/auth";
import { clearPersistedLearnerState } from "../lib/persisted";
import { joinPreviewQuery } from "../lib/queries";
import { JoinView } from "../views/join-view";

const Search = z.object({
  /** Keeps the local email sign-in out of the real join page, as on /login. */
  dev: z.coerce.string().pipe(z.literal("1")).optional(),
  continue: z.coerce.string().optional(),
});

export const Route = createFileRoute("/join/$token")({
  validateSearch: Search,
  component: Join,
});

/**
 * The Worker writes the preview into the page it served (server/join-page.ts), so the first
 * paint needs no request. It only describes the URL the document was loaded at.
 */
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

function Join() {
  const { t } = useLingui();
  const { token } = Route.useParams();
  const { dev } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [failed, setFailed] = useState<string | null>(null);
  const path = `/join/${token}`;
  const preview = useQuery({
    ...joinPreviewQuery(token),
    initialData: () => (served?.path === path ? served.preview : undefined),
  });
  const returnTo = `${path}?continue=1`;

  const describe = (err: unknown) => {
    if (err instanceof ApiError && err.status === 404) {
      return t`This join link stopped working. Ask for a new one.`;
    }
    if (err instanceof ApiError && err.status === 403) {
      const invited = refusalDetail(err, "invitedEmail");
      return invited
        ? t`This invitation was sent to ${invited}. Sign in with that address to join.`
        : t`You cannot join this deck through this link.`;
    }
    return t`Could not join. Check your connection and try again.`;
  };

  const hold = useMutation({
    mutationFn: async (via: "google" | "dev") => {
      await api.holdJoinLink(token);
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

  const join = useMutation({
    mutationFn: () => api.join(token),
    onMutate: () => setFailed(null),
    onSuccess: async ({ deckId }) => {
      await qc.invalidateQueries({ queryKey: ["decks"] });
      navigate({ to: "/library/$deckId", params: { deckId } });
    },
    onError: (err) => {
      setFailed(describe(err));
      void preview.refetch();
    },
  });

  const busy = hold.isPending || join.isPending;

  return (
    <JoinView
      preview={preview.data}
      busy={busy}
      error={failed ?? (preview.isError ? describe(preview.error) : undefined)}
      onJoinWithGoogle={busy ? undefined : () => hold.mutate("google")}
      onJoin={busy ? undefined : () => join.mutate()}
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
