import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plug } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import type { ConnectedApp } from "../lib/api";
import { api, errorMessage } from "../lib/api";
import { publicSiteUrl } from "../lib/origins";
import { connectedAppsQuery } from "../lib/queries";
import { AppMark, identifyApp } from "./AppMark";
import { Button, buttonClass } from "./Button";
import { Chip } from "./Chip";
import { EmptySection } from "./EmptyState";
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
    <SettingsGroup
      title={t`Connected apps`}
      description={t`Assistants that signed in to Lymi, such as Claude or ChatGPT.`}
    >
      {apps.isPending && <Skeleton className="h-14 w-full" />}

      {apps.isSuccess && apps.data.length === 0 && (
        <EmptySection
          icon={<Plug />}
          title={t`No apps connected`}
          body={t`Add Lymi as an MCP server in Claude or ChatGPT and sign in when it asks.`}
          action={
            <a href={publicSiteUrl("/docs/mcp")} className={buttonClass("secondary")}>
              <Trans>How to connect</Trans>
            </a>
          }
        />
      )}

      {apps.data && apps.data.length > 0 && (
        <>
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
          <p className="max-w-[60ch] text-sm text-muted">
            <Trans>
              Read lists decks and cards. Read and write also adds, edits and archives them. Access
              is chosen when the app signs in; disconnect and sign in again to change it.
            </Trans>
          </p>
        </>
      )}

      {disconnect.isError && (
        <p className="text-sm text-danger" role="alert">
          {errorMessage(disconnect.error)}
        </p>
      )}

      <p className="text-sm text-muted">
        <Trans>
          Read Lymi’s <DocLink href={publicSiteUrl("/privacy")}>privacy policy</DocLink> or get help
          from <DocLink href={publicSiteUrl("/support")}>support</DocLink>.
        </Trans>
      </p>
    </SettingsGroup>
  );
}

/** A link into the docs, from a sentence in Settings. */
export function DocLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="text-text underline decoration-edge-2 underline-offset-2 hoverable:hover:decoration-current"
    >
      {children}
    </a>
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
        <div className="enter-fade flex gap-3">
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            <Trans>Stay connected</Trans>
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
