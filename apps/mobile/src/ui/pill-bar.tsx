import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import type { Tabs } from "expo-router";
import { type ComponentProps, type ReactNode, useState } from "react";
import { type LayoutRectangle, useColorScheme, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../data/store";
import { usePalette } from "../theme/palette";
import type { IconName } from "./icons";
import { Icon, LIFT, Press, Text } from "./primitives";

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const ITEMS: Record<string, { label: string; icon: IconName }> = {
  today: { label: "Today", icon: "today" },
  library: { label: "Library", icon: "library" },
  you: { label: "You", icon: "you" },
};

const SPRING = { duration: 340, dampingRatio: 0.82 };

/**
 * The web's phone pill: a track with the chosen item on a plate that springs between items.
 * Under the glass chrome the track is Liquid Glass, tinted toward the room.
 */
export function PillBar({ state, navigation }: BottomTabBarProps) {
  const p = usePalette();
  const dark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const { directions } = useStore();
  const glass = directions.chrome === "glass" && isGlassEffectAPIAvailable();
  const [rects, setRects] = useState<Record<number, LayoutRectangle>>({});
  const chosen = rects[state.index];
  const plate = useAnimatedStyle(() =>
    chosen
      ? {
          opacity: 1,
          width: reduce ? chosen.width : withSpring(chosen.width, SPRING),
          transform: [{ translateX: reduce ? chosen.x : withSpring(chosen.x, SPRING) }],
        }
      : { opacity: 0 },
  );

  const items = (
    <>
      <Animated.View
        className={`absolute top-1.5 bottom-1.5 rounded-full ${glass ? "" : "border border-edge bg-chosen"}`}
        // On glass the chosen plate is a veil of the room's ink, as iOS marks its own selected tab.
        style={[
          { left: 0 },
          glass ? { backgroundColor: dark ? "#ffffff1f" : "#2013080f" } : null,
          plate,
        ]}
      />
      {state.routes.map((route, i) => {
        const item = ITEMS[route.name];
        if (!item) return null;
        const active = state.index === i;
        return (
          <Press
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onLayout={(e) => {
              const layout = e.nativeEvent.layout;
              setRects((r) => ({ ...r, [i]: layout }));
            }}
            onPress={() => {
              if (!active) navigation.navigate(route.name);
            }}
            className="h-12 flex-row items-center gap-2 rounded-full px-5"
          >
            <Icon name={item.icon} size={20} colour={active ? p.text : p["text-2"]} />
            <Text className={`text-base font-medium ${active ? "text-text" : "text-text-2"}`}>
              {item.label}
            </Text>
          </Press>
        );
      })}
    </>
  );

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-0 items-center"
      style={{ paddingBottom: Math.max(insets.bottom - 8, 12) }}
    >
      {glass ? (
        <GlassTrack>{items}</GlassTrack>
      ) : (
        <View
          className="flex-row gap-1 rounded-full border border-edge bg-plate-2 p-1.5"
          style={dark ? LIFT : undefined}
        >
          {items}
        </View>
      )}
    </View>
  );
}

function GlassTrack({ children }: { children: ReactNode }) {
  const p = usePalette();
  return (
    <GlassView
      isInteractive
      glassEffectStyle="regular"
      // A trace of the room in the glass, so it reads warm over warm content rather than system grey.
      tintColor={`${p.canvas}59`}
      style={{ flexDirection: "row", gap: 4, padding: 6, borderRadius: 999 }}
    >
      {children}
    </GlassView>
  );
}
