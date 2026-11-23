import { Children, Fragment, type ReactElement, type ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";
import { usePalette } from "../theme/palette";
import { Icon, type IconName } from "./icons";
import { Plate, Press, RowArrow, Text } from "./primitives";

const ACCESSIBILITY_SIZES = 28 / 17;

export function useAccessibilitySizes() {
  return useWindowDimensions().fontScale >= ACCESSIBILITY_SIZES;
}

export function Rows({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  if (rows.length === 0) return null;
  return (
    <Plate className="overflow-hidden">
      {rows.map((row, i) => (
        // oxlint-disable-next-line react/no-array-index-key -- rows are given in order and never reorder
        <Fragment key={i}>
          {i > 0 && <View className="h-px bg-edge" />}
          {row}
        </Fragment>
      ))}
    </Plate>
  );
}

interface BaseRowFaceProps {
  label: string;
  icon: IconName;
  value?: string | undefined;
  stacked?: boolean;
  destructive?: boolean;
}

type RowEndProps =
  | { end?: "open" | "web" | "none"; control?: undefined }
  | { end?: undefined; control: ReactElement };

type RowFaceProps = BaseRowFaceProps & RowEndProps;

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
  const large = useAccessibilitySizes();
  const stacked = under || large;
  const name = (
    <Text
      className="text-md"
      style={{ color: destructive ? p.danger : p.ink }}
      accessible={!control}
    >
      {label}
    </Text>
  );
  const now = value && (
    <Text
      className="text-md text-ink-muted"
      numberOfLines={stacked ? 2 : 1}
      style={[{ fontVariant: ["tabular-nums"] }, !stacked && { flexShrink: 1, maxWidth: "42%" }]}
    >
      {value}
    </Text>
  );
  return (
    <View className="min-h-[52px] flex-row items-center gap-3 py-3 ps-4 pe-4">
      <Icon name={icon} size={20} colour={destructive ? p.danger : p["ink-secondary"]} />
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
        <Icon name="web" size={18} colour={p["ink-muted"]} strokeWidth={2.25} />
      ) : null}
    </View>
  );
}

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
