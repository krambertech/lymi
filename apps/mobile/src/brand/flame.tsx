import {
  EMBER,
  EMBER_AT_FLAME_SIZE,
  FLAME_BOUNDS,
  FLAME_CORE,
  FLAME_OUTER,
  STREAK_FLAME_SIZE,
  type StreakFlameState,
} from "@lymi/design";
import Svg, { G, Path } from "react-native-svg";
import { usePalette } from "../theme/palette";

const { left, right, top, bottom } = FLAME_BOUNDS;
const ASPECT = (right - left) / (bottom - top);

/** The lantern's flame on its own, cropped to its box: the streak's mark. Out shows the ember. */
export function Flame({ height, state = "lit" }: { height: number; state?: StreakFlameState }) {
  const p = usePalette();
  const scale = STREAK_FLAME_SIZE[state];
  return (
    <Svg
      width={height * ASPECT}
      height={height}
      viewBox={`${left} ${top} ${right - left} ${bottom - top}`}
      style={{ overflow: "visible" }}
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
  );
}
