import { useLingui } from "@lingui/react/macro";
import { api, errorMessage } from "@lymi/client/api";
import { connectedAppsQuery } from "@lymi/client/queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { AssistantPage } from "../../../../apps/assistant-page";
import { assistantByKey, assistantOf, identityOf } from "../../../../apps/catalog";
import { API_URL } from "../../../../auth/client";
import { toast } from "../../../../ui/toast-host";

/** `[app]` is an assistant's key, or the grant id of a connected app Lymi does not know. */
export default function AssistantRoute() {
  const { t } = useLingui();
  const { app } = useLocalSearchParams<{ app: string }>();
  const qc = useQueryClient();
  const router = useRouter();
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

  const disconnect = useMutation({
    mutationFn: (id: string) => api.disconnect(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: connectedAppsQuery.queryKey });
      // A known assistant's page stays, back at its steps; an unknown app's has nothing left to show.
      if (!byKey) router.back();
      toast.add({ title: t`Disconnected` });
    },
  });

  // An old link to an app that has since been disconnected.
  if (apps.isSuccess && !assistant && !connected) return <Redirect href="/you/apps" />;

  return (
    <AssistantPage
      assistant={assistant}
      identity={connected ? identityOf(connected) : null}
      connected={connected}
      address={`${API_URL}/mcp`}
      onDisconnect={() => connected && disconnect.mutate(connected.id)}
      disconnecting={disconnect.isPending}
      error={disconnect.error ? errorMessage(disconnect.error) : null}
    />
  );
}
