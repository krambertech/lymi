import type { ReactNode } from "react";
import { View } from "react-native";
import { usePalette } from "../theme/palette";
import { Icon } from "./icons";
import { Press, RowArrow, Text } from "./primitives";

export interface ListRowFaceProps {
  first: boolean;
  title: string;
  mark?: ReactNode;
  /** Under the title; left out where the section already says what the count is. */
  line?: string | undefined;
  count?: number | undefined;
  /** In the count's place when there is none, such as when a deck is next due: quiet, one line. */
  aside?: string | undefined;
  end: "open" | "add" | "none";
}

/**
 * One row of a list of places, as Today and Library draw them: what it is on the start edge, how
 * many at the end, then a chevron when it opens; a row that adds shows a round plus where its count
 * would be. A row with no chevron keeps the slot so every count ends on the same line.
 */
export function ListRowFace({ first, title, mark, line, count, aside, end }: ListRowFaceProps) {
  const p = usePalette();
  return (
    <View
      className={`flex-row items-center gap-3 py-3.5 ps-5 pe-4 ${first ? "" : "border-t border-edge"}`}
    >
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-1.5">
          {mark}
          <Text className="shrink text-md font-medium text-text" numberOfLines={1}>
            {title}
          </Text>
        </View>
        {line && <Text className="text-base text-muted">{line}</Text>}
      </View>
      {count !== undefined && end !== "add" && (
        <Text
          className={`text-2xl font-medium ${count > 0 ? "text-text" : "text-muted"}`}
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {count}
        </Text>
      )}
      {count === undefined && aside && end !== "add" && (
        <Text className="text-base text-muted" numberOfLines={1}>
          {aside}
        </Text>
      )}
      {end === "add" && (
        // In the count column, round, so it lines up with the counts above and below it.
        <View className="size-8 items-center justify-center rounded-full bg-plate-2">
          <Icon name="plus" size={16} colour={p["text-2"]} strokeWidth={2.5} />
        </View>
      )}
      {end === "open" ? <RowArrow /> : <View className="w-[18px]" />}
    </View>
  );
}

/** What VoiceOver reads for a row: the title, the count or what it counts, then the line. */
export function listRowLabel(title: string, count?: number | string, line?: string) {
  return [title, count, line].filter((part) => part !== undefined).join(". ");
}

export function ListRow({
  countLabel,
  onPress,
  hint,
  ...face
}: ListRowFaceProps & {
  /** What VoiceOver reads for the count when no line says it. */
  countLabel?: string;
  onPress?: (() => void) | undefined;
  hint?: string | undefined;
}) {
  const label = listRowLabel(face.title, countLabel ?? face.count, face.line);
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label}>
        <ListRowFace {...face} />
      </View>
    );
  }
  return (
    <Press
      scale={0.99}
      onPress={onPress}
      accessibilityRole={face.end === "add" ? "button" : "link"}
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      <ListRowFace {...face} />
    </Press>
  );
}
