import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { ConnectedApp } from "../lib/api";
import { api } from "../lib/api";
import { connectedAppsQuery } from "../lib/queries";
import { AppMark, identifyApp } from "./AppMark";
import { Button } from "./Button";
import { Chip } from "./Chip";
import { SettingsGroup } from "./SettingsGroup";
import { Skeleton } from "./Skeleton";

/**
 * The other half of the consent screen. A grant made there lasts until it is taken back, so
 * this is where it is taken back: the app, what it may do, and the host that identifies it.
 */
export function ConnectedAppsSection() {
  const { t } = useLingui();
  const qc = useQueryClient();
  const apps = useQuery(connectedAppsQuery);
  const disconnect = useMutation({
    mutationFn: (id: string) => api.disconnect(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connected-apps"] }),
  });

  return (
    <SettingsGroup title={t`Connected apps`}>
      <p className="max-w-[62ch] text-base text-text-2">
        <Trans>
          MCP clients that signed in to Lymi, such as Claude Desktop. Disconnecting stops an app
          renewing its access, so it is locked out within the hour and has to ask again.
        </Trans>
      </p>

      {apps.isPending && <Skeleton className="h-14 w-full" />}

      {apps.isSuccess && apps.data.length === 0 && (
        <p className="text-base text-muted">
          <Trans>Nothing connected.</Trans>
        </p>
      )}

      {apps.data && apps.data.length > 0 && (
        <ul className="grid">
          {apps.data.map((item) => (
            <AppRow
              key={item.id}
              item={item}
              disconnecting={disconnect.isPending && disconnect.variables === item.id}
              onDisconnect={() => disconnect.mutate(item.id)}
            />
          ))}
        </ul>
      )}

      {disconnect.isError && (
        <p className="text-sm text-danger" role="alert">
          {(disconnect.error as Error).message}
        </p>
      )}
    </SettingsGroup>
  );
}

function AppRow({
  item,
  disconnecting,
  onDisconnect,
}: {
  item: ConnectedApp;
  disconnecting: boolean;
  onDisconnect: () => void;
}) {
  const { t, i18n } = useLingui();
  const app = identifyApp(item.clientId, item.name);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 6000);
    return () => clearTimeout(t);
  }, [confirming]);
  const connected = i18n.date(item.createdAt, { day: "numeric", month: "short" });

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-edge py-3 last:border-b-0">
      <AppMark app={app} className="size-9 rounded-sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-base font-medium">{app.name}</span>
          <Chip size="sm">{item.scope === "write" ? t`Read and write` : t`Read`}</Chip>
        </div>
        {/* A long host truncates; the date never does, so the row always says when. */}
        <p className="flex min-w-0 items-baseline gap-1 text-sm text-muted">
          {/* An app that sent no name is titled by its host already; don't print it twice. */}
          {app.name !== app.host && app.host && (
            <>
              <span className="truncate font-mono">{app.host}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          {/* An unrecognised app is titled by its address, so its own name is a claim. */}
          {app.claimed && (
            <>
              <span className="truncate">
                <Trans>calls itself “{app.claimed}”</Trans>
              </span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span className="shrink-0 tabular-nums">
            <Trans>connected {connected}</Trans>
          </span>
        </p>
      </div>
      {confirming ? (
        <div className="enter-fade flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            <Trans>Keep</Trans>
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={disconnecting}
            aria-disabled={disconnecting}
            onClick={onDisconnect}
          >
            <Trans>Disconnect</Trans>
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
          <Trans>Disconnect</Trans>
        </Button>
      )}
    </li>
  );
}
