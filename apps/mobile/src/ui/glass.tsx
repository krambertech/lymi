import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { usePalette, useRoom } from "../theme/palette";
import { Icon, type IconName } from "./icons";
import { Press, Text } from "./primitives";

// Liquid Glass for chrome that floats over content: a sheet's corner buttons, the bar, capture.
// Tinted amber it marks the one standing action. Before iOS 26 it is an opaque plate. phone.md "Glass".

const SIZE = 44;

/**
 * A screen presented as a sheet gets iOS's clear glass, which shows too much through; the sheet
 * colour at 70% frosts it to match the system sheets. Before iOS 26, the sheet colour.
 */
export function useFrost() {
  const sheet = usePalette().sheet;
  return isGlassEffectAPIAvailable() ? `${sheet}b3` : sheet;
}

function Surface({
  tint,
  style,
  children,
}: {
  tint: "room" | "amber";
  style: ViewStyle;
  children: ReactNode;
}) {
  const p = usePalette();
  // Dark glass greys a translucent amber to brown, so at night it is the whole amber.
  const amber = useRoom() === "dark" ? p.amber : `${p.amber}d9`;
  if (isGlassEffectAPIAvailable())
    return (
      <GlassView
        isInteractive
        glassEffectStyle="regular"
        tintColor={tint === "amber" ? amber : undefined}
        style={style}
      >
        {children}
      </GlassView>
    );
  return (
    <View className={tint === "amber" ? "bg-amber" : "border border-edge bg-plate"} style={style}>
      {children}
    </View>
  );
}

interface GlassButtonProps {
  icon: IconName;
  /** What pressing does, for VoiceOver. */
  label: string;
  /** The one standing action, as Add in a sheet. */
  primary?: boolean;
  onPress?: () => void;
}

/** A round glass button, 44 pt, for a sheet's corners. */
export function GlassButton({ icon, label, primary = false, onPress }: GlassButtonProps) {
  const p = usePalette();
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Surface
        tint={primary ? "amber" : "room"}
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon
          name={icon}
          size={20}
          colour={primary ? p["amber-ink"] : p.text}
          strokeWidth={primary ? 2.25 : 2}
        />
      </Surface>
    </Press>
  );
}

/** A glass pill holding a short value, such as the deck a card goes to; a Select's trigger. */
export function GlassPill({ icon, children }: { icon: IconName; children: string }) {
  const p = usePalette();
  return (
    <Surface
      tint="room"
      style={{
        height: SIZE,
        borderRadius: SIZE / 2,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        maxWidth: 220,
      }}
    >
      <Icon name={icon} size={18} colour={p["text-2"]} />
      <Text className="shrink text-md font-medium text-text" numberOfLines={1}>
        {children}
      </Text>
      <Icon name="down" size={16} colour={p.muted} />
    </Surface>
  );
}
