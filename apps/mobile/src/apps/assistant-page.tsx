import { Trans, useLingui } from "@lingui/react/macro";
import type { ConnectedApp } from "@lymi/client/api";
import { type AppIdentity, listedApp } from "@lymi/client/app-marks";
import type { Assistant } from "@lymi/client/apps";
import { isolate } from "@lymi/core";
import type { ReactNode } from "react";
import { Linking, View } from "react-native";
import { siteUrl } from "../auth/client";
import { haptics } from "../theme/haptics";
import { clipboard } from "../ui/clipboard";
import { Button, Press, Text } from "../ui/primitives";
import { Skeleton } from "../ui/skeleton";
import { toast } from "../ui/toast-host";
import {
  AppActivity,
  AppConnect,
  type AppKey,
  AppPage,
  AppStop,
  B,
  CopyField,
  StatusLine,
  Step,
} from "./app-page";
import { AppMark, CustomMark, UnverifiedChip } from "./marks";

interface Props {
  /** The assistant this page sets up; undefined for a connected app Lymi does not know. */
  assistant: Assistant | undefined;
  /** The app as its client ID identifies it, when it is connected. */
  identity: AppIdentity | null;
  /** Its grant; null when not connected, undefined while connected apps load. */
  connected: ConnectedApp | null | undefined;
  /** Lymi's MCP address, which every assistant is given. */
  address: string;
  onDisconnect: () => void;
  disconnecting: boolean;
  error: string | null;
}

/**
 * An AI assistant's page on the template every app shares: before it connects, how to connect it
 * from the phone; after, what it may do, what it did and how to stop it. docs/design/app-pages.md.
 */
export function AssistantPage(props: Props) {
  const { t, i18n } = useLingui();
  const { assistant, connected } = props;
  const identity = props.identity ?? assistant?.app ?? null;
  const listed = identity ? listedApp(identity) : null;
  // A connected app keeps its own name, even one that came in through Custom MCP.
  const custom = assistant?.key === "custom" && !props.identity;
  const name = custom ? t`Custom MCP` : (listed?.title ?? t`An app`);
  const appKey: AppKey =
    assistant?.key === "claude" || assistant?.key === "chatgpt" ? assistant.key : "other";
  const since =
    connected && i18n.date(new Date(connected.createdAt), { day: "numeric", month: "short" });

  return (
    <AppPage
      appKey={appKey}
      name={name}
      mark={identity ? <AppMark app={{ ...identity, name }} size={56} /> : <CustomMark size={56} />}
      badge={connected && listed?.unverified && <UnverifiedChip borrowed={listed.borrowed} />}
      status={
        connected === undefined
          ? undefined
          : connected
            ? {
                label: t`Connected`,
                tone: "good",
                detail: (
                  <View className="gap-0.5">
                    <StatusLine>
                      {listed?.host ? (
                        <Trans>
                          Since {since} · <Text style={{ fontFamily: "Menlo" }}>{listed.host}</Text>
                        </Trans>
                      ) : (
                        <Trans>Since {since}</Trans>
                      )}
                    </StatusLine>
                    <StatusLine>
                      {connected.scope === "write"
                        ? t`Can read and change your decks`
                        : t`Can read your decks`}
                    </StatusLine>
                  </View>
                ),
              }
            : { label: t`Not connected`, tone: "muted" }
      }
      does={
        custom
          ? t`Any app that can use a remote MCP server can add cards to your decks and tell you what’s due.`
          : t`Give ${{ app: isolate(name) }} a lesson, a PDF or a chat and it adds the cards to your decks. It can also tell you what’s due.`
      }
      action={
        !connected &&
        assistant?.open && (
          <Button
            label={t`Open ${{ app: isolate(name) }}`}
            icon="web"
            variant="primary"
            // Through the system, so an installed Claude or ChatGPT takes the link where it is signed in.
            onPress={() => void Linking.openURL(assistant.open ?? "")}
          />
        )
      }
    >
      {connected === undefined ? (
        <Skeleton height={200} />
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
            error={props.error}
          />
        </>
      ) : (
        assistant && <Connect {...props} assistant={assistant} name={name} />
      )}
    </AppPage>
  );
}

/** Things to ask once it's connected, each copied for pasting into the assistant. */
function TryAsking() {
  const { t } = useLingui();
  const prompts = [
    t`Make cards from this lesson in my deck`,
    t`What’s due today?`,
    t`Make a deck from this article`,
  ];
  if (!clipboard) return null;
  return (
    <View className="gap-2 border-t border-edge pt-4">
      <Text className="px-1 text-sm font-medium text-ink-secondary">{t`Then try asking`}</Text>
      <View className="flex-row flex-wrap gap-2">
        {prompts.map((prompt) => (
          <Press
            key={prompt}
            onPress={() => {
              clipboard?.setString(prompt);
              haptics.press();
              toast.add({ title: t`Copied. Paste it into the chat.` });
            }}
            accessibilityRole="button"
            accessibilityHint={t`Copies it`}
            className="min-h-10 justify-center rounded-full bg-amber-soft px-3.5 py-2"
          >
            <Text className="text-sm text-amber-tint-ink">{prompt}</Text>
          </Press>
        ))}
      </View>
    </View>
  );
}

/** How it connects: the steps for this assistant, Lymi's address and any client ID it needs. */
function Connect({ assistant, name, address }: Props & { assistant: Assistant; name: string }) {
  const { t } = useLingui();
  const signIn = (
    <Step key="sign-in">
      <Trans>Sign in to Lymi when {{ app: isolate(name) }} asks, and allow it.</Trans>
    </Step>
  );
  return (
    <AppConnect
      // Custom MCP's guide is the general one, whatever the app is called.
      name={assistant.key === "custom" ? "MCP" : name}
      intro={
        assistant.key === "custom"
          ? t`Add Lymi as a remote MCP server with OAuth. Lymi doesn’t let apps register themselves, so an app that can’t identify itself with a client ID document won’t connect.`
          : t`${{ app: isolate(name) }} connects to Lymi and signs in with your Lymi account. You choose what it may do when it signs in.`
      }
      steps={stepsFor(assistant.key, signIn)}
      guide={siteUrl(assistant.guide)}
    >
      <View className="gap-4 border-t border-edge pt-4">
        <CopyField label={t`MCP server address`} value={address} />
        {assistant.clientId && <CopyField label={t`Client ID`} value={assistant.clientId} />}
      </View>
      <TryAsking />
    </AppConnect>
  );
}

const Code = ({ children }: { children: ReactNode }) => (
  <Text className="text-sm text-ink" style={{ fontFamily: "Menlo" }}>
    {children}
  </Text>
);

function stepsFor(key: Assistant["key"], signIn: ReactNode): ReactNode[] {
  switch (key) {
    case "claude":
      return [
        <Step key="1">
          <Trans>
            In Claude, open <B>Settings → Connectors</B>.
          </Trans>
        </Step>,
        <Step key="2">
          <Trans>
            Choose <B>Add custom connector</B> and paste Lymi’s address.
          </Trans>
        </Step>,
        signIn,
        <Step key="4">
          <Trans>
            In a chat, turn Lymi on under <B>+ → Connectors</B>.
          </Trans>
        </Step>,
      ];
    case "chatgpt":
      return [
        <Step key="1">
          <Trans>
            In ChatGPT on the web, turn on <B>Developer mode</B> under{" "}
            <B>Settings → Apps → Advanced settings</B>.
          </Trans>
        </Step>,
        <Step key="2">
          <Trans>
            In <B>Settings → Connectors</B>, choose <B>Create</B> and paste Lymi’s address.
          </Trans>
        </Step>,
        signIn,
        <Step key="4">
          <Trans>Turn the connector on in a chat.</Trans>
        </Step>,
      ];
    case "gemini":
      return [
        <Step key="1">
          <Trans>
            Add Lymi’s address and client ID under <Code>mcpServers</Code> in{" "}
            <Code>~/.gemini/settings.json</Code>, as the guide shows.
          </Trans>
        </Step>,
        <Step key="2">
          <Trans>
            Start <Code>gemini</Code> and run <Code>/mcp auth lymi</Code>.
          </Trans>
        </Step>,
        signIn,
      ];
    case "grok":
      return [
        <Step key="1">
          <Trans>
            Open <B>grok.com/connectors</B>, press <B>New Connector</B>, choose <B>Custom</B> and
            paste Lymi’s address.
          </Trans>
        </Step>,
        <Step key="2">
          <Trans>
            Paste the client ID, leave the secret empty and choose <B>None / PKCE only</B>.
          </Trans>
        </Step>,
        <Step key="3">
          <Trans>
            Press <B>Save &amp; Connect</B>, then sign in to Lymi and allow it.
          </Trans>
        </Step>,
      ];
    case "cursor":
      return [
        <Step key="1">
          <Trans>
            In <B>Cursor Settings → MCP → Add</B>, add Lymi’s address and client ID, as the guide
            shows.
          </Trans>
        </Step>,
        <Step key="2">
          <Trans>
            Press <B>Connect</B> beside Lymi.
          </Trans>
        </Step>,
        signIn,
      ];
    case "custom":
      return [
        <Step key="1">
          <Trans>In your app, add a remote MCP server with Lymi’s address.</Trans>
        </Step>,
        <Step key="2">
          <Trans>Sign in to Lymi when the app asks, and allow it.</Trans>
        </Step>,
      ];
  }
}
