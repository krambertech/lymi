import { palette } from "@lymi/design";
import { GlassView } from "expo-glass-effect";
import { useEffect } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { useGlass } from "../theme/glass";
import { usePalette, useRoom } from "../theme/palette";
import { Icon } from "./icons";
import { Press, Text } from "./primitives";

// What just happened, with at most one action, as the web's toast. phone.md "After an action".

// iOS's compact pill, so it sits over a review's card or a list without taking it over.
const HEIGHT = 44;
// Ink over the blur, as opaque as Undo's 4.5:1 needs over a white or black screen beneath.
const SMOKE = { light: "e6", dark: "f0" } as const;

interface ToastProps {
  /** One sentence, quoting at most 60 characters of the learner's text; wraps to two lines. */
  title: string;
  /** A failure carries a red icon; anything else a check. */
  error?: boolean;
  /** Usually Undo, or Try again on a failure. */
  action?: { label: string; onPress: () => void };
  /** False for a sample that sits still on a page, such as the design screen's. */
  announce?: boolean;
}

/**
 * The toast's pill: smoked glass, the text colour at 90% or more over a blur, so it stands apart from
 * the plates under it in either room. Without glass it is the text colour, as the web's toast is.
 */
export function Toast({ title, error = false, action, announce = true }: ToastProps) {
  const p = usePalette();
  const glass = useGlass();
  // iOS ignores accessibilityLiveRegion, so VoiceOver hears the toast through an announcement.
  const spoken = action ? `${title.replace(/[.!?]$/, "")}. ${action.label}` : title;
  useEffect(() => {
    if (announce && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(spoken);
  }, [announce, spoken]);
  // The pill is the other room's colour, so its red is the other room's too.
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
          // 36 pt inside the pill, reaching 44 through its hit area.
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
