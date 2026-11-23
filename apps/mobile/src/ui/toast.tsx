import { palette } from "@lymi/design";
import { GlassView } from "expo-glass-effect";
import { useEffect } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { useGlass } from "../theme/glass";
import { usePalette, useRoom } from "../theme/palette";
import { Icon } from "./icons";
import { Press, Text } from "./primitives";

const HEIGHT = 44;
const SMOKE = { light: "e6", dark: "f0" } as const;

interface ToastProps {
  title: string;
  error?: boolean;
  action?: { label: string; onPress: () => void };
  announce?: boolean;
}

export function Toast({ title, error = false, action, announce = true }: ToastProps) {
  const p = usePalette();
  const glass = useGlass();
  const spoken = action ? `${title.replace(/[.!?]$/, "")}. ${action.label}` : title;
  useEffect(() => {
    if (announce && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(spoken);
  }, [announce, spoken]);
  const room = useRoom();
  const red = palette[room === "dark" ? "light" : "dark"].danger;
  const style: ViewStyle = {
    minHeight: HEIGHT,
    borderRadius: HEIGHT / 2,
    overflow: "hidden",
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingStart: 14,
    paddingEnd: action ? 4 : 16,
  };
  const content = (
    <>
      <Icon name={error ? "alert" : "check"} size={16} colour={error ? red : p.canvas} />
      <Text className="flex-1 text-base text-canvas" numberOfLines={2}>
        {title}
      </Text>
      {action && (
        <Press
          onPress={action.onPress}
          accessibilityRole="button"
          hitSlop={4}
          className="h-9 justify-center px-3"
        >
          <Text className="text-base font-semibold" style={{ color: p["toast-action"] }}>
            {action.label}
          </Text>
        </Press>
      )}
    </>
  );
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion={error ? "assertive" : "polite"}>
      {glass ? (
        <GlassView glassEffectStyle="regular" style={style}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: `${p.ink}${SMOKE[room]}` }]} />
          {content}
        </GlassView>
      ) : (
        <View className="bg-ink" style={style}>
          {content}
        </View>
      )}
    </View>
  );
}
