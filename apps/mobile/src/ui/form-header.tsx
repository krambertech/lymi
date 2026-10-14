import { type ReactNode, useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  findNodeHandle,
  type Text as RNText,
  View,
  type ViewStyle,
} from "react-native";
import { GlassButton } from "./glass";
import type { IconName } from "./icons";
import { Text } from "./primitives";

interface FormHeaderProps {
  /** Close at the start: Cancel when leaving discards something, Close when it does not; back on a page inside a form. */
  close: { label: string; onPress: () => void; icon?: "close" | "back" };
  /** VoiceOver starts on the name, as when content swaps in place and nothing else moves focus. */
  announce?: boolean;
  /** The form's name, centred at `text-md`. */
  title?: string;
  /** A line under the name, such as the series being edited. */
  subtitle?: string | undefined;
  /** What the form works in, such as Add a word's deck, in place of the name. */
  middle?: ReactNode;
  /** The form's one action, amber at the end. */
  action?: {
    icon: IconName;
    label: string;
    onPress: () => void;
    disabled?: boolean;
    busy?: boolean;
  };
  style?: ViewStyle;
}

/**
 * Every form sheet's header: close, its name or what it works in, its one action. phone.md "Sheets".
 * A form sheet lays out a header and one scroll view, so the header must not be flattened away, or
 * iOS lays the scroll view over it.
 */
export function FormHeader({
  close,
  title,
  subtitle,
  middle,
  action,
  announce = false,
  style,
}: FormHeaderProps) {
  const name = useRef<RNText>(null);
  useEffect(() => {
    if (!announce) return;
    const node = findNodeHandle(name.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  }, [announce]);
  return (
    <View
      collapsable={false}
      className="flex-row items-center justify-between gap-3 px-4 pt-5 pb-2"
      style={style}
    >
      <GlassButton icon={close.icon ?? "close"} label={close.label} onPress={close.onPress} />
      <View className="flex-1 items-center">
        {middle ?? (
          <>
            <Text
              ref={name}
              className="text-center text-md font-medium text-text"
              accessibilityRole="header"
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle && (
              <Text className="text-sm text-muted" numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </>
        )}
      </View>
      {action ? (
        <GlassButton
          icon={action.icon}
          label={action.label}
          primary
          disabled={action.disabled}
          busy={action.busy}
          onPress={action.onPress}
        />
      ) : (
        // Keeps the name centred when there is nothing to do but close.
        <View className="size-11" />
      )}
    </View>
  );
}
