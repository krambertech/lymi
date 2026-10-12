import { useLingui } from "@lingui/react/macro";
import { onlineManager, type UseQueryResult } from "@tanstack/react-query";
import { getCalendars } from "expo-localization";
import { useSyncExternalStore } from "react";
import { View } from "react-native";
import { usePalette } from "../theme/palette";
import { Icon, Text } from "./primitives";

const isOnline = () => onlineManager.isOnline();

/**
 * When a screen shows what was kept rather than what Lymi has now: offline, or a refresh that
 * could not land. Undefined while what it shows is current.
 */
export function useKeptSince(query: UseQueryResult): Date | undefined {
  const online = useSyncExternalStore(onlineManager.subscribe, isOnline, isOnline);
  const kept =
    query.data !== undefined && (!online || query.fetchStatus === "paused" || query.isError);
  return kept ? new Date(query.dataUpdatedAt) : undefined;
}

/**
 * One quiet line at the top of a screen that is showing what was kept, saying since when. Being
 * offline is never an error, so it carries no colour and asks nothing. phone.md "Offline".
 */
export function OfflineNote({ query }: { query: UseQueryResult }) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const since = useKeptSince(query);
  if (!since) return null;
  const today = since.toDateString() === new Date().toDateString();
  const when = today
    ? i18n.date(since, {
        hour: "numeric",
        minute: "2-digit",
        hour12: !getCalendars()[0]?.uses24hourClock,
      })
    : i18n.date(since, { day: "numeric", month: "long" });
  return (
    <View className="flex-row items-center gap-2" accessibilityRole="text">
      <Icon name="offline" size={16} colour={p.muted} />
      <Text className="flex-1 text-base text-muted">
        {t`You’re offline. Showing your cards as of ${when}.`}
      </Text>
    </View>
  );
}
