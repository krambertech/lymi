import { Children, Fragment, type ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";
import { usePalette } from "../theme/palette";
import { Icon, type IconName } from "./icons";
import { Plate, Press, RowArrow, Text } from "./primitives";

/** Body text at the first accessibility size, 28 pt, over its 17 pt default. */
const ACCESSIBILITY_SIZES = 28 / 17;

/** Rows that belong together on one plate, split by full-width hairlines. */
export function Rows({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  // With every row hidden, an empty plate would draw as a stray line.
  if (rows.length === 0) return null;
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
  /** The value on its own line under the label, for a value too long to sit beside it. */
  stacked?: boolean;
  /** A control that acts in place at the row's end, such as a switch or a time; it takes the chevron's place. */
  control?: ReactNode;
  destructive?: boolean;
}

/** What a row shows, for a control that brings its own press, such as a Select. */
export function RowFace({
  label,
  icon,
  value,
  end = "open",
  stacked: under = false,
  control,
  destructive = false,
}: RowFaceProps) {
  const p = usePalette();
  // At the accessibility sizes the value moves under the label, as iOS Settings does, so neither breaks mid-word.
  const large = useWindowDimensions().fontScale >= ACCESSIBILITY_SIZES;
  const stacked = under || large;
  const name = (
    <Text className="text-md" style={{ color: destructive ? p.danger : p.text }}>
      {label}
    </Text>
  );
  // A long value gives way to its label: one line beside it, at most 42% of the row, or two
  // lines under it at the accessibility sizes.
  const now = value && (
    <Text
      className="text-md text-muted"
      numberOfLines={stacked ? 2 : 1}
      style={[{ fontVariant: ["tabular-nums"] }, !stacked && { flexShrink: 1, maxWidth: "42%" }]}
    >
      {value}
    </Text>
  );
  return (
    <View className="min-h-[52px] flex-row items-center gap-3 py-3 ps-4 pe-4">
      <Icon name={icon} size={20} colour={destructive ? p.danger : p["text-2"]} />
      {stacked ? (
        <View className="flex-1 gap-0.5">
          {name}
          {now}
        </View>
      ) : (
        <>
          <View className="flex-1">{name}</View>
          {now}
        </>
      )}
      {control ? (
        control
      ) : end === "open" ? (
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
