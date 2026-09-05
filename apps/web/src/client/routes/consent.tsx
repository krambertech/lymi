import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { identifyApp } from "../components/AppMark";
import { buttonClass } from "../components/Button";
import { authClient } from "../lib/auth";
import { meQuery } from "../lib/queries";
import { ConnectedView } from "../views/ConnectedView";
import { ConsentView } from "../views/ConsentView";

const Search = z.object({
  client_id: z.string().optional(),
  scope: z.string().optional(),
});

export const Route = createFileRoute("/consent")({
  validateSearch: Search,
  component: Consent,
});

type Outcome = { granted: { read: boolean; write: boolean } } | { refused: true };

/**
 * The OAuth consent stop. An MCP client (Claude Desktop, Codex) sent the learner here from
 * its sign-in. Read access is what a connector needs to work at all; write access is the
 * learner's choice. Reviews are never on offer.
 *
 * The decision does not end the page. The client's redirect is usually a custom scheme, so
 * the browser hands off to the app and this tab stays open; it shows the outcome instead of
 * the form it just submitted.
 */
function Consent() {
  const { client_id: clientId, scope } = Route.useSearch();
  const me = useQuery(meQuery);
  const requested = new Set((scope ?? "").split(" ").filter(Boolean));
  const [allowWrite, setAllowWrite] = useState(requested.has("write"));
  const [busy, setBusy] = useState<"allow" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const client = useQuery({
    queryKey: ["oauth-client", clientId],
    enabled: Boolean(clientId),
    retry: false,
    queryFn: async () => {
      const res = await authClient.oauth2.publicClient({ query: { client_id: clientId ?? "" } });
      if (res.error) throw new Error(res.error.message ?? "Could not load the app's details");
      return res.data;
    },
  });

  const app = identifyApp(clientId, client.data?.client_name);

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
    // Show the ending first, then hand off. An http(s) redirect leaves this page at once; a
    // custom scheme opens the app and leaves the tab here, on the screen below.
    setOutcome(
      accepting ? { granted: { read: true, write: granted.includes("write") } } : { refused: true },
    );
    window.location.assign(target);
  }

  if (outcome) {
    return (
      <ConnectedView
        app={app}
        refused={"refused" in outcome}
        scopes={"granted" in outcome ? outcome.granted : undefined}
        action={
          "granted" in outcome ? (
            <Link to="/settings" className={buttonClass("secondary", "sm")}>
              Manage connected apps
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <ConsentView
      app={app}
      // Only a name we do not have yet holds the screen. A recognised host already named
      // the app, and a metadata fetch that fails should not strand the decision.
      loading={client.isPending && Boolean(clientId) && !app.recognised}
      email={me.data?.email}
      writeRequested={requested.has("write")}
      allowWrite={allowWrite}
      onAllowWrite={setAllowWrite}
      busy={busy}
      unusable={!clientId}
      error={
        error ??
        (clientId ? null : "This link is missing the app that asked. Start again from the app.")
      }
      onDecide={(accept) => void decide(accept)}
    />
  );
}

/** The consent endpoint answers with the client's redirect URI, under one of two names. */
function redirectTargetOf(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  if ("url" in data && typeof data.url === "string") return data.url;
  if ("redirect_uri" in data && typeof data.redirect_uri === "string") return data.redirect_uri;
  return null;
}
