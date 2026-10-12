import { Children, Fragment, type ReactNode } from "react";
import { View } from "react-native";
import { usePalette } from "../theme/palette";
import { Icon, type IconName } from "./icons";
import { Plate, Press, RowArrow, Text } from "./primitives";

/** Rows that belong together on one plate, split by full-width hairlines. */
export function Rows({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <Plate className="overflow-hidden">
      {rows.map((row, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows are given in order and never reorder
        <Fragment key={i}>
          {i > 0 && <View className="h-px bg-edge" />}
          {row}
        </Fragment>
      ))}
    </Plate>
  );
}

interface RowFaceProps {
  label: string;
  /** A Lucide icon in the slot every row keeps, so labels line up. */
  icon: IconName;
  /** What a setting is now, at the end before the chevron. */
  value?: string | undefined;
  /**
   * How the row ends: a chevron when it opens a page or a sheet, an arrow out when it leaves the
   * app for the web, nothing when it acts in place.
   */
  end?: "open" | "web" | "none";
  destructive?: boolean;
}

/** What a row shows, for a control that brings its own press, such as a Select. */
export function RowFace({ label, icon, value, end = "open", destructive = false }: RowFaceProps) {
  const p = usePalette();
  return (
    <View className="min-h-[52px] flex-row items-center gap-3 py-3 ps-4 pe-4">
      <Icon name={icon} size={20} colour={destructive ? p.danger : p["text-2"]} />
      <Text
        className="flex-1 text-md"
        style={{ color: destructive ? p.danger : p.text }}
        numberOfLines={2}
      >
        {label}
      </Text>
      {value && (
        <Text className="text-md text-muted" style={{ fontVariant: ["tabular-nums"] }}>
          {value}
        </Text>
      )}
      {end === "open" ? (
        <RowArrow />
      ) : end === "web" ? (
        <Icon name="web" size={18} colour={p.muted} strokeWidth={2.25} />
      ) : null}
    </View>
  );
}

/** One row of a page's list: 52 pt, and the whole row is the target. */
export function Row({ onPress, ...face }: RowFaceProps & { onPress: () => void }) {
  const end = face.end ?? "open";
  return (
    <Press
      onPress={onPress}
      scale={0.99}
      accessibilityRole={end === "none" ? "button" : "link"}
      accessibilityLabel={face.value ? `${face.label}, ${face.value}` : face.label}
    >
      <RowFace {...face} />
    </Press>
  );
}
