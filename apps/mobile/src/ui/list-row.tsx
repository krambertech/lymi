import { unisolate } from "@lymi/core";
import type { ReactNode } from "react";
import { View } from "react-native";
import { usePalette } from "../theme/palette";
import { Icon } from "./icons";
import { Press, RowArrow, Text } from "./primitives";

export interface ListRowFaceProps {
  first: boolean;
  title: string;
  mark?: ReactNode;
  line?: string | undefined;
  count?: number | undefined;
  end: "open" | "add" | "none";
}

export function ListRowFace({ first, title, mark, line, count, end }: ListRowFaceProps) {
  const p = usePalette();
  return (
    <View
      className={`flex-row items-center gap-3 py-3.5 ps-5 pe-4 ${first ? "" : "border-t border-edge"}`}
    >
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-1.5">
          {mark}
          <Text className="shrink text-md font-medium text-ink" numberOfLines={1}>
            {title}
          </Text>
        </View>
        {line && <Text className="text-base text-ink-muted">{line}</Text>}
      </View>
      {count !== undefined && end !== "add" && (
        <Text
          className={`text-2xl font-medium ${count > 0 ? "text-ink" : "text-ink-muted"}`}
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {count}
        </Text>
      )}
      {end === "add" && (
        <View className="size-8 items-center justify-center rounded-full bg-plate-nested">
          <Icon name="plus" size={16} colour={p["ink-secondary"]} strokeWidth={2.5} />
        </View>
      )}
      {end === "open" ? <RowArrow /> : <View className="w-[18px]" />}
    </View>
  );
}

export function listRowLabel(title: string, count?: number | string, line?: string) {
  return [title, count, line].filter((part) => part !== undefined).join(". ");
}

export function ListRow({
  countLabel,
  onPress,
  hint,
  ...face
}: ListRowFaceProps & {
  countLabel?: string;
  onPress?: (() => void) | undefined;
  hint?: string | undefined;
}) {
  const label = listRowLabel(face.title, countLabel ?? face.count, face.line);
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={unisolate(label)}>
        <ListRowFace {...face} />
      </View>
    );
  }
  return (
    <Press
      scale={0.99}
      onPress={onPress}
      accessibilityRole={face.end === "add" ? "button" : "link"}
      accessibilityLabel={unisolate(label)}
      accessibilityHint={hint}
    >
      <ListRowFace {...face} />
    </Press>
  );
}
