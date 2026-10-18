import { useId, useRef, useState } from "react";
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { ALWAYS } from "../theme/motion";
import { usePalette } from "../theme/palette";

/** Slack, in points, so a scroll that stops a hair short of an edge still counts as there. */
const NEAR = 2;

/**
 * Which ends of the card's scroll still hide text, so each fade shows only while something is under
 * it. State changes only when an edge is reached or left, never per frame.
 */
export function useScrollEdges() {
  const box = useRef({ view: 0, content: 0, at: 0 });
  const [more, setMore] = useState({ above: false, below: false });
  const update = (next: Partial<typeof box.current>) => {
    const b = Object.assign(box.current, next);
    const above = b.at > NEAR;
    const below = b.view > 0 && b.at + b.view < b.content - NEAR;
    setMore((m) => (m.above === above && m.below === below ? m : { above, below }));
  };
  return {
    more,
    onLayout: (e: LayoutChangeEvent) => update({ view: e.nativeEvent.layout.height }),
    onContentSizeChange: (_w: number, h: number) => update({ content: h }),
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) =>
      update({ at: e.nativeEvent.contentOffset.y }),
  };
}

/**
 * The card's plate colour thinning to nothing over `height`, laid over the scroll's top or foot, so
 * text going under an edge softens away rather than being cut through.
 */
export function ScrollFade({
  edge,
  height,
  shown,
}: {
  edge: "top" | "bottom";
  height: number;
  shown: boolean;
}) {
  const plate = usePalette().plate;
  const id = useId();
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(shown ? 1 : 0, { duration: 150, reduceMotion: ALWAYS }),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      // A plain style, since Uniwind's `absolute` drops an edge class beside an inline style.
      style={[{ position: "absolute", left: 0, right: 0, [edge]: 0, height }, style]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient
            id={id}
            x1="0"
            y1={edge === "top" ? "1" : "0"}
            x2="0"
            y2={edge === "top" ? "0" : "1"}
          >
            <Stop offset="0" stopColor={plate} stopOpacity={0} />
            <Stop offset="1" stopColor={plate} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}
