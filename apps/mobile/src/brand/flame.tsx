import Svg, { G, Path } from "react-native-svg";
import { usePalette } from "../theme/palette";
import { EMBER, FLAME_BOUNDS, FLAME_CORE, FLAME_OUTER } from "./geometry";

const { left, right, top, bottom } = FLAME_BOUNDS;
const ASPECT = (right - left) / (bottom - top);

/** The lantern's flame on its own, cropped to its box: the streak's mark. Out shows the ember. */
export function Flame({
  height,
  state = "lit",
}: {
  height: number;
  state?: "out" | "lit" | "full";
}) {
  const p = usePalette();
  const scale = state === "full" ? 1.16 : 1;
  return (
    <Svg
      width={height * ASPECT}
      height={height}
      viewBox={`${left} ${top} ${right - left} ${bottom - top}`}
      style={{ overflow: "visible" }}
    >
      {state === "out" ? (
        <G transform="translate(60 96.45) scale(2.15) translate(-60 -89.9)">
          <Path d={EMBER} fill={p["edge-2"]} />
        </G>
      ) : (
        <G transform={`translate(60 96.5) scale(${scale}) translate(-60 -96.5)`}>
          <Path d={FLAME_OUTER} fill={p.amber} />
          <Path d={FLAME_CORE} fill={p["flame-core"]} />
        </G>
      )}
    </Svg>
  );
}
