import type { ReactNode } from "react";
import { Image, ScrollView, View } from "react-native";
import { type Palette, usePalette } from "../theme/palette";
import { Icon, type IconName } from "./icons";
import { Press, Text } from "./primitives";
import { useOnGlass } from "./surface";

interface FaceProps {
  icon: IconName;
  children: string;
  on?: boolean;
  picture?: string | undefined;
  opens?: boolean;
  tone?: "default" | "ai";
}

export function FieldChipFace({
  icon,
  children,
  on = false,
  opens = false,
  tone = "default",
  picture,
}: FaceProps) {
  const p = usePalette();
  const glass = useOnGlass();
  const lit = tone === "ai" && on;
  const ink: keyof Palette = lit ? "ai" : "ink-secondary";
  const box = lit
    ? "bg-ai-soft border-transparent"
    : `${glass ? "bg-glass-plate" : "bg-plate-nested"} border-edge`;
  return (
    <View
      className={`min-h-9 max-w-56 flex-row items-center gap-1.5 rounded-full border ps-3 pe-3.5 ${box}`}
    >
      {picture ? (
        <Image
          source={{ uri: picture }}
          className="size-5 rounded-md"
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Icon name={icon} size={16} colour={lit ? p[ink] : p["ink-muted"]} />
      )}
      <Text
        className="shrink text-sm font-medium"
        style={{ color: p[ink] }}
        numberOfLines={1}
        maxFontSizeMultiplier={1.6}
      >
        {children}
      </Text>
      {opens && <Icon name="down" size={14} colour={p["ink-muted"]} />}
    </View>
  );
}

interface FieldChipProps extends FaceProps {
  onPress: () => void;
  checked?: boolean;
  accessibilityLabel?: string;
}

export function FieldChip({ onPress, checked, accessibilityLabel, ...face }: FieldChipProps) {
  return (
    <Press
      onPress={onPress}
      hitSlop={6}
      accessibilityRole={checked === undefined ? "button" : "switch"}
      accessibilityState={checked === undefined ? undefined : { checked }}
      accessibilityLabel={accessibilityLabel ?? face.children}
    >
      <FieldChipFace {...face} />
    </Press>
  );
}

export function FieldChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View accessibilityRole="toolbar" accessibilityLabel={label} className="-mx-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerClassName="items-center gap-2 px-4 py-1.5"
      >
        {children}
      </ScrollView>
    </View>
  );
}
