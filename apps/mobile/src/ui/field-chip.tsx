import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { type Palette, usePalette } from "../theme/palette";
import { Icon, type IconName } from "./icons";
import { Press, Text } from "./primitives";
import { useOnGlass } from "./surface";

interface FaceProps {
  icon: IconName;
  children: string;
  /** Holds a value, or is switched on: ink text and a stronger edge. A pill, as the glass around it is round. */
  on?: boolean;
  /** Ends in a chevron, for a chip that opens a list. */
  opens?: boolean;
  /** The AI's colour, for the chip that says the AI will fill the card in. */
  tone?: "default" | "ai";
}

/** How a field chip looks, for a menu's trigger, which iOS presses itself. */
export function FieldChipFace({
  icon,
  children,
  on = false,
  opens = false,
  tone = "default",
}: FaceProps) {
  const p = usePalette();
  const glass = useOnGlass();
  const ink: keyof Palette = tone === "ai" && on ? "ai" : on ? "text" : "text-2";
  const box =
    tone === "ai" && on
      ? "bg-ai-soft border-transparent"
      : on
        ? `${glass ? "bg-glass-chosen" : "bg-plate"} border-edge-2`
        : `${glass ? "bg-glass-plate" : "bg-plate-2"} border-edge`;
  return (
    <View
      className={`min-h-9 max-w-56 flex-row items-center gap-1.5 rounded-full border ps-3 pe-3.5 ${box}`}
    >
      <Icon name={icon} size={16} colour={on ? p[ink] : p.muted} />
      <Text
        className="shrink text-sm font-medium"
        style={{ color: p[ink] }}
        numberOfLines={1}
        maxFontSizeMultiplier={1.6}
      >
        {children}
      </Text>
      {opens && <Icon name="down" size={14} colour={p.muted} />}
    </View>
  );
}

interface FieldChipProps extends FaceProps {
  onPress: () => void;
  /** Read for a chip that switches something on or off. */
  checked?: boolean;
  accessibilityLabel?: string;
}

/**
 * One optional field or setting of a card, as a chip in the row above the keyboard: its icon and
 * label while empty, its value once set. The web's FieldChip; the hit area reaches 44 pt.
 */
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

/** The chips' row: one line that runs to the screen's edges and scrolls sideways once it outgrows them. */
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
