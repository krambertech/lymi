import { palette } from "@lymi/design";
import { GlassView } from "expo-glass-effect";
import { View, type ViewStyle } from "react-native";
import { useGlass } from "../theme/glass";
import { usePalette, useRoom } from "../theme/palette";
import { Icon } from "./icons";
import { Press, Text } from "./primitives";

// What just happened, with at most one action, as the web's toast. phone.md "After an action".

const HEIGHT = 52;

interface ToastProps {
  /** One line, quoting at most 60 characters of the learner's text. */
  title: string;
  /** A failure carries a red icon; anything else a check. */
  error?: boolean;
  /** Usually Undo, or Try again on a failure. */
  action?: { label: string; onPress: () => void };
}

/**
 * The toast's pill: smoked glass, the text colour at 70% over a blur, so it stands apart from the
 * plates under it in either room. Without glass it is the text colour, as the web's toast is.
 */
export function Toast({ title, error = false, action }: ToastProps) {
  const p = usePalette();
  const glass = useGlass();
  // The pill is the other room's colour, so its red is the other room's too.
  const red = palette[useRoom() === "dark" ? "light" : "dark"].danger;
  const style: ViewStyle = {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingStart: 18,
    paddingEnd: action ? 6 : 18,
  };
  const content = (
    <>
      <Icon name={error ? "alert" : "check"} size={20} colour={error ? red : p.canvas} />
      <Text className="flex-1 text-md text-canvas" numberOfLines={1}>
        {title}
      </Text>
      {action && (
        <Press
          onPress={action.onPress}
          accessibilityRole="button"
          className="h-11 justify-center px-3"
        >
          <Text className="text-md font-semibold" style={{ color: p["toast-action"] }}>
            {action.label}
          </Text>
        </Press>
      )}
    </>
  );
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion={error ? "assertive" : "polite"}>
      {glass ? (
        <GlassView glassEffectStyle="regular" tintColor={`${p.text}b3`} style={style}>
          {content}
        </GlassView>
      ) : (
        <View className="bg-text" style={style}>
          {content}
        </View>
      )}
    </View>
  );
}
