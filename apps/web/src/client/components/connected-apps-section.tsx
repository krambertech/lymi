import { Trans, useLingui } from "@lingui/react/macro";
import { listedApp } from "@lymi/client/app-marks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { CircleAlert, Plug } from "lucide-react";
import type { ReactNode } from "react";
import type { ConnectedApp } from "../lib/api";
import { api, errorMessage } from "../lib/api";
import { publicSiteUrl } from "../lib/origins";
import { connectedAppsQuery } from "../lib/queries";
import { useConfirmStep } from "../lib/use-confirm-step";
import { AppMark, identifyApp } from "./app-mark";
import { Button } from "./button";
import { Chip } from "./chip";
import { EmptySection } from "./empty-state";
import { InlineError } from "./inline-error";
import { SettingsGroup } from "./settings-group";
import { Skeleton } from "./skeleton";

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
      id="connected-apps"
      title={t`Connected apps`}
      description={t`Connect ChatGPT or Claude so it can turn your notes, PDFs or textbook into Lymi cards.`}
    >
      {apps.isPending && <Skeleton className="h-14 w-full" />}

      {apps.isSuccess && apps.data.length === 0 && (
        <EmptySection
          icon={<Plug />}
          title={t`No apps connected`}
          body={t`For example, paste a lesson and ask: “Make Estonian cards from this.” Setup takes a minute.`}
          action={
            <Button render={<a href={publicSiteUrl("/docs/mcp")} />}>
              <Trans>How to connect</Trans>
            </Button>
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
              Read lists decks and cards. Read and write also adds, edits and archives them. You
              choose access when the app signs in. To change it, disconnect and sign in again.
            </Trans>
          </p>
        </>
      )}

      {apps.isError && (
        <p className="text-sm text-danger" role="alert">
          {errorMessage(apps.error)}
        </p>
      )}

      {disconnect.isError && (
        <p className="text-sm" role="alert">
          <InlineError>{errorMessage(disconnect.error)}</InlineError>
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
  const listed = listedApp(app);
  const confirm = useConfirmStep();
  const connected = i18n.date(item.createdAt, { day: "numeric", month: "short" });

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-edge py-3 last:border-b-0">
      <AppMark app={{ ...app, name: listed.title }} className="size-9 rounded-sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-base font-medium">{listed.title ?? t`An app`}</span>
          <Chip size="sm">{item.scope === "write" ? t`Read and write` : t`Read`}</Chip>
        </div>
        {/* A long host truncates; the date never does, so the row always says when. */}
        <p className="flex min-w-0 items-center gap-1 text-sm text-muted">
          {/* An app Lymi did not recognise is titled by the name it gave, so the row says so. */}
          {listed.unverified && (
            <>
              <span
                className={clsx(
                  "flex shrink-0 items-center gap-1",
                  listed.borrowed && "text-danger",
                )}
              >
                <CircleAlert className="size-3.5" aria-hidden="true" />
                <Trans>Unverified</Trans>
              </span>
              <span aria-hidden="true">·</span>
            </>
          )}
          {/* An app titled by its host has it in the title already; don't print it twice. */}
          {listed.host && (
            <>
              <span className="truncate font-mono">{listed.host}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span className="shrink-0 tabular-nums">
            <Trans>connected {connected}</Trans>
          </span>
        </p>
      </div>
      {confirm.confirming ? (
        <div {...confirm.groupProps} className="enter-fade flex gap-3">
          <Button ref={confirm.safe} size="sm" variant="ghost" onClick={confirm.cancel}>
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
        <Button ref={confirm.trigger} size="sm" variant="ghost" onClick={confirm.ask}>
          <Trans>Disconnect</Trans>
        </Button>
      )}
    </li>
  );
}
