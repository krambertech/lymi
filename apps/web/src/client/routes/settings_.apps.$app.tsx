import { useLingui } from "@lingui/react/macro";
import { listedApp } from "@lymi/client/app-marks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { identifyApp } from "../components/app-mark";
import { toast } from "../components/ui/toast";
import { api, errorMessage } from "../lib/api";
import { assistantByKey, assistantOf } from "../lib/assistants";
import { useDocumentTitle } from "../lib/document-title";
import { productUrl } from "../lib/origins";
import { connectedAppsQuery } from "../lib/queries";
import { AssistantView } from "../views/assistant-view";

// `$app` is an assistant's key, or the grant id of a connected app Lymi does not know.
export const Route = createFileRoute("/settings_/apps/$app")({
  component: AssistantRoute,
});

function AssistantRoute() {
  const { t } = useLingui();
  const { app } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const apps = useQuery(connectedAppsQuery);

  const byKey = assistantByKey(app);
  const connected = apps.isSuccess
    ? (apps.data.find((item) =>
        byKey ? byKey.key !== "custom" && assistantOf(item)?.key === byKey.key : item.id === app,
      ) ?? null)
    : undefined;
  // An app Lymi does not know connected the way any MCP client does, so it gets Custom MCP's steps.
  const assistant =
    byKey ?? (connected ? (assistantOf(connected) ?? assistantByKey("custom")) : undefined);
  const identity = connected ? identifyApp(connected.clientId, connected.name) : null;
  useDocumentTitle(byKey?.app?.name ?? (identity && listedApp(identity).title) ?? t`Apps`);

  const disconnect = useMutation({
    mutationFn: (id: string) => api.disconnect(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: connectedAppsQuery.queryKey });
      // A known assistant's page stays, back at its steps; an unknown app's has nothing left to show.
      if (!byKey) await navigate({ to: "/settings", hash: "apps" });
      toast.add({ title: t`Disconnected` });
    },
  });

  const copyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.add({ title: t`Copied. Paste it into the chat.` });
    } catch {
      toast.add({ title: t`Couldn’t copy. Type it into the chat instead.` });
    }
  };

  // An old link to an app that has since been disconnected.
  if (apps.isSuccess && !assistant && !connected)
    return <Navigate to="/settings" hash="apps" replace />;

  return (
    <AssistantView
      assistant={assistant}
      identity={identity}
      connected={connected}
      address={productUrl("/mcp")}
      onCopyPrompt={(prompt) => void copyPrompt(prompt)}
      onDisconnect={() => connected && disconnect.mutate(connected.id)}
      disconnecting={disconnect.isPending}
      error={disconnect.error ? errorMessage(disconnect.error) : null}
    />
  );
}
