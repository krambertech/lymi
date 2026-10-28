import { Trans, useLingui } from "@lingui/react/macro";
import { type AppIdentity, listedApp } from "@lymi/client/app-marks";
import { isolate } from "@lymi/core";
import { clsx } from "clsx";
import { ArrowUpRight, CircleAlert, Plug } from "lucide-react";
import type { ReactNode } from "react";
import { AppMark } from "../components/app-mark";
import { AppActivity, AppConnect, type AppKey, AppPage, AppStop } from "../components/app-page";
import { Button } from "../components/button";
import { CopyField } from "../components/copy-field";
import { InlineError } from "../components/inline-error";
import { Skeleton } from "../components/skeleton";
import type { ConnectedApp } from "../lib/api";
import type { Assistant } from "../lib/assistants";
import { publicSiteUrl } from "../lib/origins";

interface Props {
  /** The assistant this page sets up; undefined for a connected app Lymi does not know. */
  assistant: Assistant | undefined;
  /** The app as its client ID identifies it, when it is connected. */
  identity: AppIdentity | null;
  /** Its grant; null when not connected, undefined while connected apps load. */
  connected: ConnectedApp | null | undefined;
  /** Lymi's MCP address, which every assistant is given. */
  address: string;
  onCopyPrompt: (prompt: string) => void;
  onDisconnect: () => void;
  disconnecting: boolean;
  error: string | null;
}

/**
 * An AI assistant's page on the template every app shares: before it connects, how to connect it
 * from inside Lymi; after, what it may do, what it did and how to stop it. docs/design/app-pages.md.
 */
export function AssistantView(props: Props) {
  const { t, i18n } = useLingui();
  const { assistant, connected } = props;
  const identity = props.identity ?? assistant?.app ?? null;
  const listed = identity ? listedApp(identity) : null;
  // A connected app keeps its own name, even one that came in through Custom MCP.
  const custom = assistant?.key === "custom" && !props.identity;
  const name = custom ? t`Custom MCP` : (listed?.title ?? t`An app`);
  const appKey: AppKey =
    assistant?.key === "claude" || assistant?.key === "chatgpt" ? assistant.key : "other";
  const since = connected && i18n.date(connected.createdAt, { day: "numeric", month: "short" });

  return (
    <AppPage
      appKey={appKey}
      name={name}
      mark={
        identity ? (
          <AppMark app={{ ...identity, name }} className="size-14" />
        ) : (
          <span className="edge grid size-14 place-items-center rounded-lg bg-plate">
            <Plug className="size-1/2 text-ink-secondary" aria-hidden="true" />
          </span>
        )
      }
      status={
        connected === undefined
          ? undefined
          : connected
            ? {
                label: t`Connected`,
                tone: "good",
                detail: (
                  <>
                    <span className="flex flex-wrap items-center gap-x-1">
                      {listed?.unverified && (
                        <>
                          <span
                            className={clsx(
                              "flex items-center gap-1",
                              listed.borrowed && "text-danger",
                            )}
                          >
                            <CircleAlert className="size-3.5" aria-hidden="true" />
                            <Trans>Unverified</Trans>
                          </span>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      <span>
                        {listed?.host ? (
                          <Trans>
                            Since {since} · <span className="font-mono">{listed.host}</span>
                          </Trans>
                        ) : (
                          <Trans>Since {since}</Trans>
                        )}
                      </span>
                    </span>
                    <span className="block">
                      {connected.scope === "write" ? (
                        <Trans>Can read and change your decks</Trans>
                      ) : (
                        <Trans>Can read your decks</Trans>
                      )}
                    </span>
                  </>
                ),
              }
            : { label: t`Not connected`, tone: "muted" }
      }
      does={
        custom ? (
          <Trans>
            Any app that can use a remote MCP server can add cards to your decks and tell you what’s
            due.
          </Trans>
        ) : (
          <Trans>
            Give {{ app: isolate(name) }} a lesson, a PDF or a chat and it adds the cards to your
            decks. It can also tell you what’s due.
          </Trans>
        )
      }
      action={
        !connected &&
        assistant?.open && (
          <Button size="sm" render={<a href={assistant.open} target="_blank" rel="noreferrer" />}>
            <Trans>Open {{ app: isolate(name) }}</Trans>
            <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        )
      }
    >
      {connected === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : connected ? (
        <>
          <AppActivity appKey={appKey} app={connected.clientId} name={name} />
          {assistant && <Connect {...props} assistant={assistant} name={name} />}
          <AppStop
            consequence={t`${{ app: isolate(name) }} can no longer read or change your decks. Cards it added stay. To give it different access, disconnect and connect it again.`}
            label={t`Disconnect ${{ app: isolate(name) }}`}
            keep={t`Stay connected`}
            onStop={props.onDisconnect}
            stopping={props.disconnecting}
          />
          {props.error && (
            <p className="text-sm" role="alert">
              <InlineError>{props.error}</InlineError>
            </p>
          )}
        </>
      ) : (
        assistant && <Connect {...props} assistant={assistant} name={name} />
      )}
    </AppPage>
  );
}

/** Things to ask once it's connected, each copied for pasting into the assistant. */
function TryAsking({ onCopy }: { onCopy: (prompt: string) => void }) {
  const { t } = useLingui();
  const prompts = [
    t`Add the words from this lesson to my deck`,
    t`What’s due today?`,
    t`Make a deck from this article`,
  ];
  return (
    <div className="grid gap-2 border-t border-edge pt-4">
      <span className="text-sm font-medium text-ink-secondary">
        <Trans>Then try asking</Trans>
      </span>
      <ul className="flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => onCopy(prompt)}
              className="inline-flex min-h-9 items-center rounded-full bg-amber-soft px-3.5 py-1.5 text-start text-sm text-amber-tint-ink transition-[background-color] duration-150 hoverable:hover:bg-amber-tint"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** How it connects: the steps for this assistant, Lymi's address and any client ID it needs. */
function Connect({
  assistant,
  name,
  address,
  onCopyPrompt,
}: Props & { assistant: Assistant; name: string }) {
  const { t } = useLingui();
  const signIn = (
    <Trans key="sign-in">Sign in to Lymi when {{ app: isolate(name) }} asks, and allow it.</Trans>
  );
  const steps = stepsFor(assistant.key, signIn);
  return (
    <AppConnect
      // Custom MCP's guide is the general one, whatever the app is called.
      name={assistant.key === "custom" ? "MCP" : name}
      intro={
        assistant.key === "custom" ? (
          <Trans>
            Add Lymi as a remote MCP server with OAuth. Lymi doesn’t let apps register themselves,
            so an app that can’t identify itself with a client ID document won’t connect.
          </Trans>
        ) : (
          <Trans>
            {{ app: isolate(name) }} reaches Lymi as a remote MCP server and signs in with your Lymi
            account. You choose what it may do when it signs in.
          </Trans>
        )
      }
      steps={steps}
      guide={publicSiteUrl(assistant.guide)}
    >
      <div className="grid gap-4 border-t border-edge pt-4">
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-ink-secondary">
            <Trans>MCP server address</Trans>
          </span>
          <CopyField value={address} label={t`MCP server address`} singleLine />
        </div>
        {assistant.clientId && (
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-ink-secondary">
              <Trans>Client ID</Trans>
            </span>
            <CopyField value={assistant.clientId} label={t`Client ID`} singleLine />
          </div>
        )}
      </div>
      <TryAsking onCopy={onCopyPrompt} />
    </AppConnect>
  );
}

const B = ({ children }: { children: ReactNode }) => (
  <span className="font-medium text-ink">{children}</span>
);
const Code = ({ children }: { children: ReactNode }) => (
  <code className="font-mono text-sm">{children}</code>
);

function stepsFor(key: Assistant["key"], signIn: ReactNode): ReactNode[] {
  switch (key) {
    case "claude":
      return [
        <Trans key="1">
          In Claude, open <B>Settings → Connectors</B>.
        </Trans>,
        <Trans key="2">
          Choose <B>Add custom connector</B> and paste Lymi’s address.
        </Trans>,
        signIn,
        <Trans key="4">
          In a chat, turn Lymi on under <B>+ → Connectors</B>.
        </Trans>,
      ];
    case "chatgpt":
      return [
        <Trans key="1">
          In ChatGPT on the web, turn on <B>Developer mode</B> under{" "}
          <B>Settings → Apps → Advanced settings</B>.
        </Trans>,
        <Trans key="2">
          In <B>Settings → Connectors</B>, choose <B>Create</B> and paste Lymi’s address.
        </Trans>,
        signIn,
        <Trans key="4">Turn the connector on in a chat.</Trans>,
      ];
    case "gemini":
      return [
        <Trans key="1">
          Add Lymi’s address and client ID under <Code>mcpServers</Code> in{" "}
          <Code>~/.gemini/settings.json</Code>, as the guide shows.
        </Trans>,
        <Trans key="2">
          Start <Code>gemini</Code> and run <Code>/mcp auth lymi</Code>.
        </Trans>,
        signIn,
      ];
    case "grok":
      return [
        <Trans key="1">
          Open <B>grok.com/connectors</B>, press <B>New Connector</B>, choose <B>Custom</B> and
          paste Lymi’s address.
        </Trans>,
        <Trans key="2">
          Paste the client ID, leave the secret empty and choose <B>None / PKCE only</B>.
        </Trans>,
        <Trans key="3">
          Press <B>Save &amp; Connect</B>, then sign in to Lymi and allow it.
        </Trans>,
      ];
    case "cursor":
      return [
        <Trans key="1">
          In <B>Cursor Settings → MCP → Add</B>, add Lymi’s address and client ID, as the guide
          shows.
        </Trans>,
        <Trans key="2">
          Press <B>Connect</B> beside Lymi.
        </Trans>,
        signIn,
      ];
    case "custom":
      return [
        <Trans key="1">In your app, add a remote MCP server with Lymi’s address.</Trans>,
        <Trans key="2">Sign in to Lymi when the app asks, and allow it.</Trans>,
      ];
  }
}
