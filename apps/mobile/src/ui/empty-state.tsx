import { useWindowDimensions, View } from "react-native";
import { usePalette } from "../theme/palette";
import type { IconName } from "./icons";
import { Button, Icon, Text } from "./primitives";

/**
 * Why a place has nothing to show, which decides how it looks: nothing has been made yet, a search
 * or filter matched nothing, the read failed, or it needs a connection the phone does not have.
 */
export type EmptyKind = "start" | "noMatch" | "failed" | "offline";

/**
 * Where it sits: `page` when the whole screen is empty, large and centred in the free space;
 * `inline` inside a plate or list that is already on the screen, which is its surface.
 */
export type EmptySize = "page" | "inline";

interface Props {
  kind: EmptyKind;
  size?: EmptySize;
  /** What is missing or what went wrong, by name: "No decks match “map”", not "Nothing here". */
  title: string;
  /** How to fill it, or the fix. */
  body?: string;
  /** The one thing to press, such as Try again or Clear search. */
  action?: { label: string; onPress: () => void; busy?: boolean };
  /** Overrides the kind's own icon, for a start state that names its place. */
  icon?: IconName;
  /**
   * Fills the room it is given rather than most of the window, for a page whose free space is
   * smaller than the screen, such as search above the keyboard.
   */
  fill?: boolean;
}

const ICON: Record<EmptyKind, IconName> = {
  start: "explore",
  noMatch: "noMatch",
  failed: "alert",
  offline: "offline",
};

/**
 * A place with nothing to show says why and how to fill it, and looks temporary so it is never
 * mistaken for content. phone.md "Empty states".
 */
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
  const ink = alarm ? p.danger : p["text-2"];
  const disc = alarm ? "bg-danger-soft" : "bg-plate-2";

  // The icon sits in a soft disc, red for a failure: never the lantern, which only says the streak.
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
      // A whole empty page holds it in the middle of the room the bars leave.
      style={page && !fill ? { minHeight: height * 0.62 } : undefined}
      accessibilityLiveRegion="polite"
    >
      <View className={page ? "pb-4" : "pb-2"}>{mark}</View>
      <Text
        className={`text-center font-medium text-text ${page ? "text-2xl tracking-tight" : "text-lg"}`}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {body && (
        <Text className={`text-center text-text-2 ${page ? "text-md" : "text-base"}`}>{body}</Text>
      )}
      {button && <View className={page ? "pt-5" : "pt-3"}>{button}</View>}
    </View>
  );
}
