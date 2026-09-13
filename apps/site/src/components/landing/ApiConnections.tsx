import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import {
  AppWindow,
  Globe,
  LayoutGrid,
  type LucideIcon,
  MessageCircle,
  Sheet,
  Smartphone,
} from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { Lantern } from "../Lantern";

interface Place {
  id: string;
  label: MessageDescriptor;
  icon: LucideIcon;
}

/** Where cards come from, along the top. */
const SOURCES: readonly Place[] = [
  { id: "shortcuts", label: msg`Shortcuts`, icon: Smartphone },
  { id: "spreadsheets", label: msg`Spreadsheets`, icon: Sheet },
  { id: "ai-assistants", label: msg`AI assistants`, icon: MessageCircle },
];

/** Where they can show up, along the bottom. */
const DESTINATIONS: readonly Place[] = [
  { id: "widgets", label: msg`Widgets`, icon: LayoutGrid },
  { id: "websites", label: msg`Websites`, icon: Globe },
  { id: "own-app", label: msg`Your own app`, icon: AppWindow },
];

/** One card's trip: in from a source, through Lymi, out to a destination. The paths cross on purpose. */
const TRIPS = [
  { from: 0, to: 1 },
  { from: 1, to: 2 },
  { from: 2, to: 0 },
] as const;

interface Geometry {
  width: number;
  height: number;
  /** Centre of each column of tiles, in diagram pixels. */
  columns: readonly [number, number, number];
  topY: number;
  bottomY: number;
  tileHalf: number;
  lanternHalf: number;
  /** How far apart the rails meet the lantern's tile, so they fan out instead of stacking. */
  fan: number;
  /** Phones stack each tile's icon over its label so three fit across. */
  stacked: boolean;
}

const WIDE: Geometry = {
  width: 480,
  height: 440,
  columns: [84, 240, 396],
  topY: 36,
  bottomY: 404,
  tileHalf: 22,
  lanternHalf: 48,
  fan: 22,
  stacked: false,
};

const COMPACT: Geometry = {
  width: 320,
  height: 400,
  columns: [52, 160, 268],
  topY: 32,
  bottomY: 368,
  tileHalf: 31,
  lanternHalf: 40,
  fan: 16,
  stacked: true,
};

/** Rails tuck this far under a tile, so no seam shows at the edge. */
const TUCK = 3;

const inPath = (g: Geometry, slot: number) => {
  const x0 = g.columns[slot] ?? g.width / 2;
  const y0 = g.topY + g.tileHalf - TUCK;
  const x1 = g.width / 2 + (slot - 1) * g.fan;
  const y1 = g.height / 2 - g.lanternHalf + TUCK;
  const mid = (y0 + y1) / 2;
  return `M ${x0} ${y0} C ${x0} ${mid}, ${x1} ${mid}, ${x1} ${y1}`;
};

const outPath = (g: Geometry, slot: number) => {
  const x0 = g.width / 2 + (slot - 1) * g.fan;
  const y0 = g.height / 2 + g.lanternHalf - TUCK;
  const x1 = g.columns[slot] ?? g.width / 2;
  const y1 = g.bottomY - g.tileHalf + TUCK;
  const mid = (y0 + y1) / 2;
  return `M ${x0} ${y0} C ${x0} ${mid}, ${x1} ${mid}, ${x1} ${y1}`;
};

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_TRAVEL = "cubic-bezier(0.65, 0, 0.35, 1)";
const EASE_SWELL = "cubic-bezier(0.37, 0, 0.63, 1)";
const LIT_RAIL: Keyframe[] = [
  { opacity: 0 },
  { opacity: 1, offset: 0.2 },
  { opacity: 1, offset: 0.7 },
  { opacity: 0 },
];

/** Lymi between the tools that add cards and the places that show them, at two sizes. */
export function ApiConnections() {
  return (
    <>
      <div className="@xl:hidden">
        <Diagram g={COMPACT} />
      </div>
      <div className="hidden @xl:block">
        <Diagram g={WIDE} />
      </div>
    </>
  );
}

/**
 * One card at a time leaves a source, drops into the lantern, whose flame swells, and comes out
 * at a destination. Everything that moves animates transform, opacity or offset-distance through
 * WAAPI, so React never re-renders mid-trip. A hidden diagram never comes into view, so only the
 * one on screen runs.
 */
function Diagram({ g }: { g: Geometry }) {
  const { i18n, t } = useLingui();
  const root = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLSpanElement>(null);
  const lantern = useRef<HTMLSpanElement>(null);
  const sourceTiles = useRef<(HTMLLIElement | null)[]>([]);
  const destinationTiles = useRef<(HTMLLIElement | null)[]>([]);
  const inRails = useRef<(SVGSVGElement | null)[]>([]);
  const outRails = useRef<(SVGSVGElement | null)[]>([]);
  const visible = useInView(root, { amount: 0.5 });
  const still = useReducedMotion();

  useEffect(() => {
    if (!visible || still) return;
    const card = dot.current;
    const flame = lantern.current?.querySelector(".flame");
    if (!card || !flame) return;

    let stopped = false;
    const running = new Set<Animation>();
    const timers = new Set<number>();

    const play = (
      el: Element | null | undefined,
      frames: Keyframe[],
      options: KeyframeAnimationOptions,
    ) => {
      if (!el || stopped) return;
      const animation = el.animate(frames, options);
      running.add(animation);
      animation.finished.then(() => running.delete(animation)).catch(() => {});
    };
    const at = (ms: number, step: () => void) =>
      new Promise<void>((resolve) => {
        const id = window.setTimeout(() => {
          timers.delete(id);
          if (!stopped) step();
          resolve();
        }, ms);
        timers.add(id);
      });

    const trip = (index: number) => {
      const { from, to } = TRIPS[index] ?? TRIPS[0];
      return Promise.all([
        // The source sends: a small press, and its rail lights for the length of the trip in.
        at(0, () => {
          play(sourceTiles.current[from], [{ scale: 1 }, { scale: 0.96 }, { scale: 1 }], {
            duration: 420,
            easing: EASE_OUT,
          });
          play(inRails.current[from], LIT_RAIL, { duration: 1700, easing: "linear" });
        }),
        // The card rides the curve and slips under the lantern's tile.
        at(140, () => {
          card.style.offsetPath = `path("${inPath(g, from)}")`;
          play(
            card,
            [
              { offsetDistance: "0%", opacity: 1 },
              { offsetDistance: "100%", opacity: 1 },
            ],
            { duration: 1050, easing: EASE_TRAVEL },
          );
        }),
        // It lands: the flame swells over its own flicker and eases back.
        at(1150, () => {
          play(
            flame,
            [
              { transform: "scale(1, 1)", easing: EASE_SWELL },
              { transform: "scale(1.12, 1.26)", offset: 0.38, easing: EASE_SWELL },
              { transform: "scale(1, 1)" },
            ],
            { duration: 1200, composite: "add" },
          );
        }),
        // Out the other side, to where it will be shown.
        at(1500, () => {
          play(outRails.current[to], LIT_RAIL, { duration: 1600, easing: "linear" });
          card.style.offsetPath = `path("${outPath(g, to)}")`;
          play(
            card,
            [
              { offsetDistance: "0%", opacity: 1 },
              { offsetDistance: "100%", opacity: 1 },
            ],
            { duration: 1000, easing: EASE_TRAVEL },
          );
        }),
        // The destination takes it.
        at(2460, () => {
          play(destinationTiles.current[to], [{ scale: 1 }, { scale: 1.04 }, { scale: 1 }], {
            duration: 520,
            easing: EASE_OUT,
          });
        }),
        at(3600, () => {}),
      ]);
    };

    (async () => {
      let index = 0;
      while (!stopped) {
        await trip(index);
        index = (index + 1) % TRIPS.length;
      }
    })();

    return () => {
      stopped = true;
      for (const id of timers) window.clearTimeout(id);
      for (const animation of running) animation.cancel();
    };
  }, [visible, still, g]);

  const viewBox = `0 0 ${g.width} ${g.height}`;
  const tileClass = clsx(
    "absolute flex -translate-x-1/2 -translate-y-1/2 items-center rounded-lg bg-canvas edge",
    g.stacked
      ? "w-[100px] flex-col gap-1.5 px-1.5 py-2.5 text-center"
      : "gap-2.5 px-3.5 py-3 whitespace-nowrap",
  );
  const tile = (place: Place) => (
    <>
      <place.icon
        aria-hidden="true"
        strokeWidth={1.75}
        className="size-[18px] shrink-0 text-text-2"
      />
      <span className={clsx("text-text", g.stacked ? "text-xs leading-4" : "text-sm")}>
        {i18n._(place.label)}
      </span>
    </>
  );

  return (
    <div ref={root} className="relative mx-auto" style={{ width: g.width, height: g.height }}>
      <svg aria-hidden="true" viewBox={viewBox} className="absolute inset-0 size-full">
        {SOURCES.map((place, i) => (
          <path
            key={place.id}
            d={inPath(g, i)}
            className="fill-none stroke-edge-2"
            strokeDasharray="3 5"
          />
        ))}
        {DESTINATIONS.map((place, i) => (
          <path
            key={place.id}
            d={outPath(g, i)}
            className="fill-none stroke-edge-2"
            strokeDasharray="3 5"
          />
        ))}
      </svg>

      {/* Lit copies of each rail, one layer apiece so lighting one is a composited fade. */}
      {SOURCES.map((place, i) => (
        <svg
          key={place.id}
          ref={(el) => {
            inRails.current[i] = el;
          }}
          aria-hidden="true"
          viewBox={viewBox}
          className="absolute inset-0 size-full opacity-0"
        >
          <path d={inPath(g, i)} className="fill-none stroke-amber" strokeWidth={1.5} />
        </svg>
      ))}
      {DESTINATIONS.map((place, i) => (
        <svg
          key={place.id}
          ref={(el) => {
            outRails.current[i] = el;
          }}
          aria-hidden="true"
          viewBox={viewBox}
          className="absolute inset-0 size-full opacity-0"
        >
          <path d={outPath(g, i)} className="fill-none stroke-amber" strokeWidth={1.5} />
        </svg>
      ))}

      <span
        aria-hidden="true"
        ref={dot}
        className="absolute top-0 left-0 size-2.5 rounded-full border-2 border-plate bg-amber opacity-0 [offset-anchor:center] [offset-rotate:0deg]"
      />

      <span
        ref={lantern}
        aria-hidden="true"
        className="absolute grid place-items-center rounded-2xl bg-canvas edge"
        style={{
          left: g.width / 2 - g.lanternHalf,
          top: g.height / 2 - g.lanternHalf,
          width: g.lanternHalf * 2,
          height: g.lanternHalf * 2,
        }}
      >
        <Lantern variant="lit" flicker className={g.stacked ? "size-12" : "size-14"} />
      </span>

      <ul aria-label={t`Where cards come from`} className="contents">
        {SOURCES.map((place, i) => (
          <li
            key={place.id}
            ref={(el) => {
              sourceTiles.current[i] = el;
            }}
            className={tileClass}
            style={{ left: g.columns[i], top: g.topY }}
          >
            {tile(place)}
          </li>
        ))}
      </ul>
      <ul aria-label={t`Where cards can show up`} className="contents">
        {DESTINATIONS.map((place, i) => (
          <li
            key={place.id}
            ref={(el) => {
              destinationTiles.current[i] = el;
            }}
            className={tileClass}
            style={{ left: g.columns[i], top: g.bottomY }}
          >
            {tile(place)}
          </li>
        ))}
      </ul>
    </div>
  );
}
