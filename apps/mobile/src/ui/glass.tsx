import { unisolate } from "@lymi/core";
import { GlassView } from "expo-glass-effect";
import type { ReactNode } from "react";
import { ActivityIndicator, View, type ViewStyle } from "react-native";
import { useGlass } from "../theme/glass";
import { usePalette, useRoom } from "../theme/palette";
import { Icon, type IconName } from "./icons";
import { Press, Text } from "./primitives";

const SIZE = 44;

export function useFrost() {
  const sheet = usePalette().sheet;
  return useGlass() ? `${sheet}80` : sheet;
}

export function GlassSurface({
  tint,
  style,
  children,
}: {
  tint: "room" | "amber";
  style: ViewStyle;
  children: ReactNode;
}) {
  const p = usePalette();
  const glass = useGlass();
  const amber = useRoom() === "dark" ? p.amber : `${p.amber}d9`;
  if (glass)
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
  label: string;
  primary?: boolean;
  busy?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

export function GlassButton({
  icon,
  label,
  primary = false,
  busy = false,
  disabled = false,
  onPress,
}: GlassButtonProps) {
  const p = usePalette();
  const lit = primary && !disabled;
  const ink = disabled ? p["ink-muted"] : lit ? p["amber-ink"] : p.ink;
  return (
    <Press
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
      accessibilityLabel={unisolate(label)}
      accessibilityState={{ busy, disabled }}
    >
      <GlassSurface
        tint={lit ? "amber" : "room"}
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {busy ? (
          <ActivityIndicator size="small" color={ink} />
        ) : (
          <Icon name={icon} size={20} colour={ink} strokeWidth={lit ? 2.25 : 2} />
        )}
      </GlassSurface>
    </Press>
  );
}

export function GlassPill({ icon, children }: { icon: IconName; children: string }) {
  const p = usePalette();
  return (
    <GlassSurface
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
      <Icon name={icon} size={18} colour={p["ink-secondary"]} />
      <Text className="shrink text-md font-medium text-ink" numberOfLines={1}>
        {children}
      </Text>
      <Icon name="down" size={16} colour={p["ink-muted"]} />
    </GlassSurface>
  );
}
