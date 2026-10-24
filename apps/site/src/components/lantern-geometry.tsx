import {
  EMBER,
  FLAME_CORE,
  FLAME_CORE_BASE,
  FLAME_DEPTH,
  FLAME_OUTER,
  type Ink,
  LANTERN_BAIL,
  LANTERN_FRAME,
  LANTERN_GLASS,
  type Shape,
} from "@lymi/design";
import { type ReactNode, useId } from "react";

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

const { body, spill } = FLAME_DEPTH;
const BASE = `translate(60 ${FLAME_CORE_BASE})`;
const UNBASE = `translate(-60 -${FLAME_CORE_BASE})`;

/**
 * The flame alone. The lantern wears it, and the streak borrows the same drawing. Its gradient and
 * feather need ids of their own, so two flames on a page never paint with each other's.
 */
export function FlameParts() {
  // A url(#…) reference cannot hold the punctuation React puts in its ids.
  const id = `flame${useId().replace(/[^\w-]/g, "")}`;
  return (
    <g className="flame">
      <defs>
        <radialGradient
          id={`${id}body`}
          gradientUnits="userSpaceOnUse"
          cx={body.cx}
          cy={body.cy}
          r={body.rx}
          gradientTransform={`translate(${body.cx} ${body.cy}) scale(1 ${body.ry / body.rx}) translate(${-body.cx} ${-body.cy})`}
        >
          <stop offset={body.stops[0]} stopColor="var(--flame-heart)" />
          <stop offset={body.stops[1]} stopColor="var(--amber)" />
          <stop offset={body.stops[2]} stopColor="var(--flame-rim)" />
        </radialGradient>
        <filter id={`${id}feather`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={spill.blur} />
        </filter>
      </defs>
      <path d={FLAME_OUTER.d} fill={`url(#${id}body)`} />
      <g className="flame-core">
        <path
          d={FLAME_CORE.d}
          transform={`${BASE} scale(${spill.scaleX} ${spill.scaleY}) ${UNBASE}`}
          fill={PAINT["flame-core"]}
          opacity={spill.opacity}
          filter={`url(#${id}feather)`}
        />
        {draw(FLAME_CORE, "core")}
      </g>
    </g>
  );
}

/** The flame, or the ember that replaces it when nothing is due. Wears the glow. */
function light(lit: boolean) {
  return (
    <g className="lantern-light" key="light">
      {lit ? <FlameParts /> : draw(EMBER, "ember")}
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
