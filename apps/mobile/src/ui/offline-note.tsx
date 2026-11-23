import { useLingui } from "@lingui/react/macro";
import type { UseQueryResult } from "@tanstack/react-query";
import { getCalendars } from "expo-localization";
import { View } from "react-native";
import { useKeptSince } from "../data/queries";
import { usePalette } from "../theme/palette";
import { Icon, Text } from "./primitives";

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
      <Icon name="offline" size={16} colour={p["ink-muted"]} />
      <Text className="flex-1 text-base text-ink-muted">
        {t`You’re offline. Showing your cards as of ${when}.`}
      </Text>
    </View>
  );
}
