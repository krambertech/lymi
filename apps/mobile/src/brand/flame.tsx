import {
  EMBER,
  EMBER_AT_FLAME_SIZE,
  FLAME_BOUNDS,
  FLAME_CORE,
  FLAME_OUTER,
  STREAK_FLAME_SIZE,
  type StreakFlameState,
} from "@lymi/design";
import { View } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { usePalette } from "../theme/palette";

const { left, right, top, bottom } = FLAME_BOUNDS;
const ASPECT = (right - left) / (bottom - top);

/**
 * The lantern's flame on its own, cropped to its box: the streak's mark. Out shows the ember. A full
 * flame grows past the box from its base, so the drawing gets room above it; iOS clips an SVG to its frame.
 */
export function Flame({ height, state = "lit" }: { height: number; state?: StreakFlameState }) {
  const p = usePalette();
  const scale = STREAK_FLAME_SIZE[state];
  const room = Math.max(1, scale);
  const width = height * ASPECT;
  return (
    <View style={{ width, height }}>
      <Svg
        width={width * room}
        height={height * room}
        viewBox={`${60 - (60 - left) * room} ${bottom - (bottom - top) * room} ${(right - left) * room} ${(bottom - top) * room}`}
        style={{ position: "absolute", bottom: 0, left: (width - width * room) / 2 }}
      >
        {state === "out" ? (
          <G transform={EMBER_AT_FLAME_SIZE}>
            <Path d={EMBER.d} fill={p["edge-2"]} />
          </G>
        ) : (
          <G transform={`translate(60 ${bottom}) scale(${scale}) translate(-60 -${bottom})`}>
            <Path d={FLAME_OUTER.d} fill={p.amber} />
            <Path d={FLAME_CORE.d} fill={p["flame-core"]} />
          </G>
        )}
      </Svg>
    </View>
  );
}
