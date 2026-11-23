import { useWindowDimensions, View } from "react-native";
import { usePalette } from "../theme/palette";
import type { IconName } from "./icons";
import { Button, Icon, Text } from "./primitives";

export type EmptyKind = "start" | "noMatch" | "failed" | "offline";

export type EmptySize = "page" | "inline";

interface Props {
  kind: EmptyKind;
  size?: EmptySize;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void; busy?: boolean };
  icon?: IconName;
  fill?: boolean;
}

const ICON: Record<EmptyKind, IconName> = {
  start: "explore",
  noMatch: "noMatch",
  failed: "alert",
  offline: "offline",
};

export function EmptyState({
  kind,
  size = "page",
  title,
  body,
  action,
  icon,
  fill = false,
}: Props) {
  const p = usePalette();
  const { height } = useWindowDimensions();
  const glyph = icon ?? ICON[kind];
  const alarm = kind === "failed";
  const page = size === "page";
  const ink = alarm ? p.danger : p["ink-secondary"];
  const disc = alarm ? "bg-danger-soft" : "bg-plate-nested";

  const mark = (
    <View
      className={`${page ? "size-28" : "size-16"} items-center justify-center rounded-full ${disc}`}
    >
      <Icon name={glyph} size={page ? 48 : 28} colour={ink} strokeWidth={1.75} />
    </View>
  );

  const button = action && (
    <Button
      label={action.label}
      size={page ? "md" : "sm"}
      variant={page && kind !== "noMatch" ? "primary" : "secondary"}
      loading={action.busy}
      onPress={action.onPress}
    />
  );

  return (
    <View
      className={`items-center ${page ? "justify-center gap-2 px-6 py-8" : "gap-1.5 px-5 py-8"} ${fill ? "flex-1" : ""}`}
      style={page && !fill ? { minHeight: height * 0.62 } : undefined}
      // oxlint-disable-next-line lymi/announce-live-region -- VoiceOver reaches an empty place by swiping; only Android reads it as it appears.
      accessibilityLiveRegion="polite"
    >
      <View className={page ? "pb-4" : "pb-2"}>{mark}</View>
      <Text
        className={`text-center font-medium text-ink ${page ? "text-2xl tracking-tight" : "text-lg"}`}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {body && (
        <Text className={`text-center text-ink-secondary ${page ? "text-md" : "text-base"}`}>
          {body}
        </Text>
      )}
      {button && <View className={page ? "pt-5" : "pt-3"}>{button}</View>}
    </View>
  );
}
