import {
  EMBER,
  EMBER_AT_FLAME_SIZE,
  FLAME_BOUNDS,
  FLAME_CORE,
  FLAME_DEPTH,
  FLAME_OUTER,
  STREAK_FLAME_SIZE,
  type StreakFlameState,
} from "@lymi/design";
import { View } from "react-native";
import Svg, { Defs, G, Path, RadialGradient, Stop } from "react-native-svg";
import { usePalette } from "../theme/palette";

const { left, right, top, bottom } = FLAME_BOUNDS;
const ASPECT = (right - left) / (bottom - top);
const { body } = FLAME_DEPTH;

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
        <Defs>
          <RadialGradient
            id="flame-body"
            gradientUnits="userSpaceOnUse"
            cx={body.cx}
            cy={body.cy}
            rx={body.rx}
            ry={body.ry}
          >
            <Stop offset={body.stops[0]} stopColor={p["flame-heart"]} />
            <Stop offset={body.stops[1]} stopColor={p.amber} />
            <Stop offset={body.stops[2]} stopColor={p["flame-rim"]} />
          </RadialGradient>
        </Defs>
        {state === "out" ? (
          <G transform={EMBER_AT_FLAME_SIZE}>
            <Path d={EMBER.d} fill={p["edge-2"]} />
          </G>
        ) : (
          <G transform={`translate(60 ${bottom}) scale(${scale}) translate(-60 -${bottom})`}>
            {/* The lantern's warm edge; its core's spill is too faint to see at a streak's size. */}
            <Path d={FLAME_OUTER.d} fill="url(#flame-body)" />
            <Path d={FLAME_CORE.d} fill={p["flame-core"]} />
          </G>
        )}
      </Svg>
    </View>
  );
}
