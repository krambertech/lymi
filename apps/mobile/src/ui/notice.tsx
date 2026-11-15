import { type ReactNode, useEffect } from "react";
import { AccessibilityInfo, Platform, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { usePalette } from "../theme/palette";
import type { IconName } from "./icons";
import { Icon, Text } from "./primitives";

export type NoticeTone = "neutral" | "good" | "warning" | "danger";

interface Props {
  tone?: NoticeTone;
  /** The notice in a few words; without one, the body stands alone in `ink`. */
  title?: string;
  /** Overrides the tone's own icon. */
  icon?: IconName;
  /** A string is read out with the title; rich text, such as a link, stays for VoiceOver to swipe to. */
  children?: ReactNode;
  /** Part of the screen from the start, so VoiceOver reaches it by swiping and it doesn't talk over the title. */
  quiet?: boolean;
}

/** A message inside a screen, read out as it appears. A notice is part of the page, so it stays until its state changes. */
export function Notice({ tone = "neutral", title, icon, children, quiet = false }: Props) {
  const p = usePalette();
  const look = {
    neutral: { box: "bg-plate-nested", icon: "alert" as const, mark: p["ink-secondary"] },
    good: { box: "bg-success-soft", icon: "check" as const, mark: p.success },
    warning: { box: "bg-amber-soft", icon: "alert" as const, mark: p["amber-mark"] },
    danger: { box: "bg-danger-soft", icon: "alert" as const, mark: p.danger },
  }[tone];
  const spoken = [title, typeof children === "string" ? children : null].filter(Boolean).join(". ");
  // iOS ignores accessibilityLiveRegion, so VoiceOver hears the notice through an announcement.
  useEffect(() => {
    if (spoken && !quiet && Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibility(spoken);
    }
  }, [spoken, quiet]);
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      className={`flex-row items-start gap-2.5 rounded-md px-3.5 py-3 ${look.box}`}
      accessibilityRole={tone === "danger" ? "alert" : undefined}
      accessibilityLiveRegion={tone === "danger" ? "assertive" : "polite"}
    >
      <View className="pt-0.5">
        <Icon name={icon ?? look.icon} size={16} colour={look.mark} />
      </View>
      <View className="flex-1 gap-1">
        {title && (
          <Text
            className={`text-base font-medium ${tone === "danger" ? "text-danger" : "text-ink"}`}
          >
            {title}
          </Text>
        )}
        {children && (
          <Text className={`text-base ${title ? "text-ink-secondary" : "text-ink"}`}>
            {children}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}
