import { EMBER, LANTERN_BAIL, LANTERN_FRAME, LANTERN_GLASS, type Shape } from "@lymi/design";
import Svg, { Path, Rect } from "react-native-svg";
import { usePalette } from "../theme/palette";

/**
 * The launch screen's unlit lantern as a plain SVG, which draws in the same frame it mounts. Skia
 * draws a few frames later, so this holds the picture while the launch screen hands over.
 */
export function LanternStill({ size }: { size: number }) {
  const p = usePalette();
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Path
        d={LANTERN_BAIL.d}
        fill="none"
        stroke={p["lantern-metal"]}
        strokeWidth={LANTERN_BAIL.strokeWidth}
        strokeLinecap="round"
      />
      <Rounded shape={LANTERN_GLASS} fill={p["lantern-glass-unlit"]} />
      <Path d={EMBER.d} fill={p["edge-strong"]} />
      {LANTERN_FRAME.map((s) =>
        s.d ? (
          <Path
            key={s.d}
            d={s.d}
            fill={p["lantern-metal"]}
            stroke={s.stroke ? p["lantern-metal"] : undefined}
            strokeWidth={s.strokeWidth}
            strokeLinejoin="round"
          />
        ) : (
          <Rounded key={`${s.x}-${s.y}`} shape={s} fill={p["lantern-metal"]} />
        ),
      )}
    </Svg>
  );
}

function Rounded({ shape: s, fill }: { shape: Shape; fill: string }) {
  return <Rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} fill={fill} />;
}
