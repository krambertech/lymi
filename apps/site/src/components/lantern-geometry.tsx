import {
  EMBER,
  FLAME_CORE,
  FLAME_OUTER,
  type Ink,
  LANTERN_BAIL,
  LANTERN_FRAME,
  LANTERN_GLASS,
  type Shape,
} from "@lymi/design";
import type { ReactNode } from "react";

// How the site draws the lantern from @lymi/design's geometry: each ink is a CSS colour.

const PAINT: Record<Ink, string> = {
  metal: "currentColor",
  glass: "var(--glass)",
  "glass-unlit": "var(--glass-unlit)",
  amber: "var(--amber)",
  flame: "var(--amber)",
  "flame-core": "var(--flame-core)",
  ember: "var(--edge-2)",
};

function draw(s: Shape, key: string, className?: string) {
  const common = {
    fill: s.fill ? PAINT[s.fill] : "none",
    ...(s.stroke ? { stroke: PAINT[s.stroke], strokeWidth: s.strokeWidth } : {}),
    ...(s.round ? { strokeLinejoin: "round" as const } : {}),
    ...(s.stroke && !s.fill ? { strokeLinecap: "round" as const } : {}),
    ...(className ? { className } : {}),
  };
  return s.d ? (
    <path key={key} d={s.d} {...common} />
  ) : (
    <rect key={key} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} {...common} />
  );
}

/** The flame alone. The lantern wears it, and the streak borrows the same drawing. */
export function FLAME_PARTS(): ReactNode {
  return (
    <g className="flame">
      {draw(FLAME_OUTER, "flame")}
      {draw(FLAME_CORE, "core", "flame-core")}
    </g>
  );
}

/** The flame, or the ember that replaces it when nothing is due. Wears the glow. */
function light(lit: boolean) {
  return (
    <g className="lantern-light" key="light">
      {lit ? FLAME_PARTS() : draw(EMBER, "ember")}
    </g>
  );
}

export function LANTERN_PARTS(lit: boolean): ReactNode {
  return (
    <>
      <g className="lantern-bail" key="bail">
        {draw(LANTERN_BAIL, "bail")}
      </g>
      {draw({ ...LANTERN_GLASS, fill: lit ? "glass" : "glass-unlit" }, "glass")}
      {light(lit)}
      {LANTERN_FRAME.map((s, i) => draw(s, `frame-${i}`))}
    </>
  );
}
