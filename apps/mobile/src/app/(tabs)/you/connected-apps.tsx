import { useLingui } from "@lingui/react/macro";
import { api, type ConnectedApp, errorMessage } from "@lymi/client/api";
import { identifyApp, listedApp } from "@lymi/client/app-marks";
import { connectedAppsQuery } from "@lymi/client/queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { openBrowserAsync } from "expo-web-browser";
import { Alert, View } from "react-native";
import { usePalette } from "../../../theme/palette";
import { ActionMenu } from "../../../ui/action-menu";
import { Chip } from "../../../ui/chip";
import { EmptyState } from "../../../ui/empty-state";
import { LoadFailed, useLoadFailed } from "../../../ui/load-failed";
import { Icon, Plate, SectionTitle, Text } from "../../../ui/primitives";
import { Rows } from "../../../ui/row";
import { Screen } from "../../../ui/screen";
import { Skeleton } from "../../../ui/skeleton";
import { toast } from "../../../ui/toast-host";
import { AppMark } from "../../../you/app-mark";
import { DocRow } from "../../../you/doc-row";

const SITE = "https://lymi.app";
const site = (path: string) => `${SITE}${path}`;

/**
 * The other half of the consent screen, as the web's Settings has it: each app the learner let in,
 * what it may do and the host that identifies it, and the way to cut it off, asked first in iOS's
 * alert. connected-apps.md, ADR 0036.
 */
export default function ConnectedApps() {
  const { t } = useLingui();
  const qc = useQueryClient();
  const apps = useQuery(connectedAppsQuery);
  const failed = useLoadFailed(apps);
  const disconnect = useMutation({
    mutationFn: (id: string) => api.disconnect(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connected-apps"] }),
    onError: (e) => toast.add({ title: errorMessage(e), error: true }),
  });
  const ask = (id: string, name: string) =>
    Alert.alert(
      t`Disconnect ${name}?`,
      t`It can’t reach your decks from its next request. To use it again, connect it from the app.`,
      [
        { text: t`Stay connected`, style: "cancel" },
        { text: t`Disconnect`, style: "destructive", onPress: () => disconnect.mutate(id) },
      ],
    );

  return (
    <Screen
      title={t`Connected apps`}
      back={{ label: t`You`, to: "/you" }}
      description={t`Connect ChatGPT or Claude so it can turn your notes, PDFs or textbook into Lymi cards.`}
    >
      {failed ? (
        <LoadFailed
          query={apps}
          failed={t`Couldn’t load your connected apps`}
          offline={t`Your connected apps need a connection`}
        />
      ) : !apps.data ? (
        <Skeleton height={64} />
      ) : apps.data.length === 0 ? (
        <EmptyState
          kind="start"
          icon="apps"
          title={t`No apps connected`}
          body={t`For example, paste a lesson and ask: “Make Estonian cards from this.” Setup takes a minute.`}
          action={{
            label: t`How to connect`,
            onPress: () => void openBrowserAsync(site("/docs/mcp")),
          }}
        />
      ) : (
        <>
          <Plate className="overflow-hidden">
            {apps.data.map((item, i) => (
              <AppRow
                key={item.id}
                item={item}
                first={i === 0}
                disconnecting={disconnect.isPending && disconnect.variables === item.id}
                onDisconnect={ask}
              />
            ))}
          </Plate>
          <Text className="-mt-4 px-1 text-base text-muted">
            {t`Read lists decks and cards. Read and write also adds, edits and archives them. You choose access when the app signs in. To change it, disconnect and sign in again.`}
          </Text>
          <View>
            <SectionTitle>{t`Docs`}</SectionTitle>
            <Rows>
              <DocRow
                icon="lesson"
                label={t`How to connect`}
                line={t`For Claude, ChatGPT and Gemini`}
                url={site("/docs/mcp")}
              />
            </Rows>
          </View>
        </>
      )}
    </Screen>
  );
}

/** One app: its mark and name, what it may do, then its host and when it was let in. */
function AppRow({
  item,
  first,
  disconnecting,
  onDisconnect,
}: {
  item: ConnectedApp;
  first: boolean;
  disconnecting: boolean;
  onDisconnect: (id: string, name: string) => void;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const app = identifyApp(item.clientId, item.name, site);
  const listed = listedApp(app);
  const name = listed.title ?? t`An app`;
  const connected = i18n.date(new Date(item.createdAt), { day: "numeric", month: "short" });
  return (
    <View
      className={`min-h-[68px] flex-row items-center gap-3 py-3 ps-4 pe-3 ${first ? "" : "border-t border-edge"}`}
    >
      <AppMark app={{ ...app, name: listed.title }} />
      <View className="flex-1 gap-0.5">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="shrink text-md font-medium text-text" numberOfLines={1}>
            {name}
          </Text>
          <Chip size="sm">{item.scope === "write" ? t`Read and write` : t`Read`}</Chip>
        </View>
        {/* Unverified sits with the address, since the address is what was not recognised. */}
        {(listed.unverified || listed.host) && (
          <View className="flex-row items-center gap-1">
            {listed.unverified && (
              <Icon name="alert" size={13} colour={listed.borrowed ? p.danger : p.muted} />
            )}
            {/* A long host gives up its middle, so the domain that identifies it stays. */}
            <Text className="flex-1 text-sm text-muted" numberOfLines={1} ellipsizeMode="middle">
              {listed.unverified && (
                <Text style={listed.borrowed ? { color: p.danger } : undefined}>
                  {listed.host ? `${t`Unverified`} · ` : t`Unverified`}
                </Text>
              )}
              {listed.host}
            </Text>
          </View>
        )}
        <Text className="text-sm text-muted" numberOfLines={1}>
          {t`connected ${connected}`}
        </Text>
      </View>
      <ActionMenu
        label={t`Options for ${name}`}
        symbol="ellipsis"
        look="row"
        disabled={disconnecting}
        items={[
          {
            label: t`Disconnect`,
            icon: "linkOff",
            destructive: true,
            onSelect: () => onDisconnect(item.id, name),
          },
        ]}
      />
    </View>
  );
}
