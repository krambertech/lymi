import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { Lantern } from "../components/Lantern";
import { authClient } from "../lib/auth";
import { meQuery } from "../lib/queries";

const Search = z.object({
  client_id: z.string().optional(),
  scope: z.string().optional(),
});

export const Route = createFileRoute("/consent")({
  validateSearch: Search,
  component: Consent,
});

/**
 * The OAuth consent stop. An MCP client (Claude Desktop, Codex) sent the learner here from
 * its sign-in. Read access is what a connector needs to work at all; write access is the
 * learner's choice. Reviews are never on offer.
 */
function Consent() {
  const { client_id: clientId, scope } = Route.useSearch();
  const me = useQuery(meQuery);
  const requested = new Set((scope ?? "").split(" ").filter(Boolean));
  const [allowWrite, setAllowWrite] = useState(requested.has("write"));
  const [busy, setBusy] = useState<"allow" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const client = useQuery({
    queryKey: ["oauth-client", clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const res = await authClient.oauth2.publicClient({ query: { client_id: clientId ?? "" } });
      if (res.error) throw new Error(res.error.message ?? "Could not load the app's details");
      return res.data;
    },
  });

  async function decide(accept: boolean) {
    setError(null);
    const granted = [...requested].filter((s) => s !== "write" || allowWrite);
    // Nothing left that touches cards is a refusal, not a grant of nothing.
    const grantsAccess = granted.some((s) => s === "read" || s === "write");
    const accepting = accept && grantsAccess;
    setBusy(accepting ? "allow" : "deny");
    // The endpoint reads `scope` as "narrow the request to these"; omit it when unchanged.
    const narrowed = accepting && granted.length < requested.size;
    const res = await authClient.oauth2.consent({
      accept: accepting,
      ...(narrowed ? { scope: granted.join(" ") } : {}),
    });
    if (res.error) {
      setBusy(null);
      setError(res.error.message ?? "Something went wrong. Try again from the app.");
      return;
    }
    const target = redirectTargetOf(res.data);
    if (!target) {
      setBusy(null);
      setError("The app did not say where to go next. Try again from the app.");
      return;
    }
    window.location.assign(target);
  }

  const name = client.data?.client_name?.trim() || hostOf(clientId) || "An app";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 pt-safe pb-safe">
      <Lantern className="size-16" glow />
      <div className="edge w-full max-w-sm rounded-xl bg-plate p-5">
        <h1 className="text-2xl font-medium leading-tight">Let {name} use your Lymi?</h1>
        {client.data?.client_uri && (
          <p className="mt-1 truncate text-sm text-muted">{client.data.client_uri}</p>
        )}
        {me.data && (
          <p className="mt-3 text-base text-text-2">
            Signed in as <span className="font-medium text-text">{me.data.email}</span>
          </p>
        )}

        <ul className="mt-5 grid gap-3">
          <li className="flex gap-3 text-base">
            <Check />
            <div>
              <p className="font-medium">See your decks and cards</p>
              <p className="text-sm text-muted">List, search and read. Always included.</p>
            </div>
          </li>
          {requested.has("write") && (
            <li>
              <Checkbox
                checked={allowWrite}
                onChange={setAllowWrite}
                className="items-start"
                label={
                  <span className="grid gap-0.5">
                    <span className="font-medium">Add, edit and archive cards and decks</span>
                    <span className="text-sm text-muted">
                      Cards it adds land at once and show up in Activity, where you can inspect,
                      edit or archive them.
                    </span>
                  </span>
                }
              />
            </li>
          )}
        </ul>
        <p className="mt-4 text-sm text-muted">It can never grade your reviews or make API keys.</p>

        {error && (
          <p className="mt-3 text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <Button
            variant="ghost"
            className="flex-1"
            disabled={busy !== null}
            loading={busy === "deny"}
            onClick={() => void decide(false)}
          >
            Deny
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            disabled={busy !== null || !clientId}
            loading={busy === "allow"}
            onClick={() => void decide(true)}
          >
            Allow
          </Button>
        </div>
      </div>
    </div>
  );
}

function Check() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-good-soft text-good"
    >
      <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** The consent endpoint answers with the client's redirect URI, under one of two names. */
function redirectTargetOf(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  if ("url" in data && typeof data.url === "string") return data.url;
  if ("redirect_uri" in data && typeof data.redirect_uri === "string") return data.redirect_uri;
  return null;
}

function hostOf(clientId: string | undefined): string | null {
  if (!clientId) return null;
  try {
    return new URL(clientId).hostname;
  } catch {
    return null;
  }
}
