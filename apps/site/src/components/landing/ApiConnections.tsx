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
  label: string;
  icon: LucideIcon;
  /** Centre of the tile, in diagram pixels. */
  x: number;
}

const WIDTH = 480;
const HEIGHT = 440;
const TOP_Y = 36;
const BOTTOM_Y = HEIGHT - 36;
const CENTRE = { x: WIDTH / 2, y: HEIGHT / 2 };
/** Half the tile height and half the lantern tile, so rails start and end at the edges. */
const TILE_HALF = 22;
const LANTERN_HALF = 48;

/** Where cards come from, along the top. */
const SOURCES: readonly Place[] = [
  { label: "Shortcuts", icon: Smartphone, x: 84 },
  { label: "Spreadsheets", icon: Sheet, x: 240 },
  { label: "AI assistants", icon: MessageCircle, x: 396 },
];

/** Where they can show up, along the bottom. */
const DESTINATIONS: readonly Place[] = [
  { label: "Widgets", icon: LayoutGrid, x: 82 },
  { label: "Websites", icon: Globe, x: 240 },
  { label: "Your own app", icon: AppWindow, x: 398 },
];

/** One card's trip: in from a source, through Lymi, out to a destination. The paths cross on purpose. */
const TRIPS = [
  { from: 0, to: 1 },
  { from: 1, to: 2 },
  { from: 2, to: 0 },
] as const;

/** How far apart the rails meet the lantern's tile, so they fan out instead of stacking. */
const FAN = 22;
/** Rails tuck this far under a tile, so no seam shows at the edge. */
const TUCK = 3;

const inPath = (x: number, slot: number) => {
  const y0 = TOP_Y + TILE_HALF - TUCK;
  const y1 = CENTRE.y - LANTERN_HALF + TUCK;
  const x1 = CENTRE.x + (slot - 1) * FAN;
  const mid = (y0 + y1) / 2;
  return `M ${x} ${y0} C ${x} ${mid}, ${x1} ${mid}, ${x1} ${y1}`;
};

const outPath = (x: number, slot: number) => {
  const y0 = CENTRE.y + LANTERN_HALF - TUCK;
  const y1 = BOTTOM_Y - TILE_HALF + TUCK;
  const x0 = CENTRE.x + (slot - 1) * FAN;
  const mid = (y0 + y1) / 2;
  return `M ${x0} ${y0} C ${x0} ${mid}, ${x} ${mid}, ${x} ${y1}`;
};

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_TRAVEL = "cubic-bezier(0.65, 0, 0.35, 1)";

/**
 * Lymi between the tools that add cards and the places that show them. One card at a time
 * leaves a source, drops into the lantern, whose flame swells, and comes out at a destination.
 * Everything that moves animates transform, opacity or offset-distance, driven by WAAPI so
 * React never re-renders mid-trip.
 */
export function ApiConnections() {
  const root = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLSpanElement>(null);
  const lantern = useRef<HTMLSpanElement>(null);
  const sourceTiles = useRef<(HTMLLIElement | null)[]>([]);
  const destinationTiles = useRef<(HTMLLIElement | null)[]>([]);
  const inRails = useRef<(SVGSVGElement | null)[]>([]);
  const outRails = useRef<(SVGSVGElement | null)[]>([]);
  const visible = useInView(root, { amount: 0.5 });
  const still = useReducedMotion();

  useEffect(() => {
    if (!visible || still) return;
    const card = chip.current;
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
      const source = SOURCES[from];
      const destination = DESTINATIONS[to];
      if (!source || !destination) return Promise.resolve();

      return Promise.all([
        // The source sends: a small press, and its rail lights for the length of the trip in.
        at(0, () => {
          play(sourceTiles.current[from], [{ scale: 1 }, { scale: 0.96 }, { scale: 1 }], {
            duration: 420,
            easing: EASE_OUT,
          });
          play(
            inRails.current[from],
            [
              { opacity: 0 },
              { opacity: 1, offset: 0.2 },
              { opacity: 1, offset: 0.7 },
              { opacity: 0 },
            ],
            {
              duration: 1700,
              easing: "linear",
            },
          );
        }),
        // The card rides the curve and slips under the lantern's tile.
        at(140, () => {
          card.style.offsetPath = `path("${inPath(source.x, from)}")`;
          play(
            card,
            [
              { offsetDistance: "0%", opacity: 1 },
              { offsetDistance: "100%", opacity: 1 },
            ],
            {
              duration: 1050,
              easing: EASE_TRAVEL,
            },
          );
        }),
        // It lands: the flame swells over its own flicker and eases back.
        at(1150, () => {
          play(
            flame,
            [
              { transform: "scale(1, 1)", easing: "cubic-bezier(0.37, 0, 0.63, 1)" },
              {
                transform: "scale(1.12, 1.26)",
                offset: 0.38,
                easing: "cubic-bezier(0.37, 0, 0.63, 1)",
              },
              { transform: "scale(1, 1)" },
            ],
            { duration: 1200, composite: "add" },
          );
        }),
        // Out the other side, to where it will be shown.
        at(1500, () => {
          play(
            outRails.current[to],
            [
              { opacity: 0 },
              { opacity: 1, offset: 0.2 },
              { opacity: 1, offset: 0.7 },
              { opacity: 0 },
            ],
            {
              duration: 1600,
              easing: "linear",
            },
          );
          card.style.offsetPath = `path("${outPath(destination.x, to)}")`;
          play(
            card,
            [
              { offsetDistance: "0%", opacity: 1 },
              { offsetDistance: "100%", opacity: 1 },
            ],
            {
              duration: 1000,
              easing: EASE_TRAVEL,
            },
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
  }, [visible, still]);

  const tile = (place: Place) => (
    <>
      <place.icon
        aria-hidden="true"
        strokeWidth={1.75}
        className="size-[18px] shrink-0 text-text-2"
      />
      <span className="text-sm text-text">{place.label}</span>
    </>
  );

  return (
    <div ref={root}>
      {/* Phones and narrow columns get the list without the diagram. */}
      <ul className="grid grid-cols-2 gap-2.5 @xl:hidden">
        {[...SOURCES, ...DESTINATIONS].map((place) => (
          <li
            key={place.label}
            className="flex items-center gap-2.5 rounded-lg bg-canvas px-3.5 py-3 edge"
          >
            {tile(place)}
          </li>
        ))}
      </ul>

      <div className="relative mx-auto hidden @xl:block" style={{ width: WIDTH, height: HEIGHT }}>
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="absolute inset-0 size-full"
        >
          {SOURCES.map((place, i) => (
            <path
              key={place.label}
              d={inPath(place.x, i)}
              className="fill-none stroke-edge-2"
              strokeDasharray="3 5"
            />
          ))}
          {DESTINATIONS.map((place, i) => (
            <path
              key={place.label}
              d={outPath(place.x, i)}
              className="fill-none stroke-edge-2"
              strokeDasharray="3 5"
            />
          ))}
        </svg>

        {/* Lit copies of each rail, one layer apiece so lighting one is a composited fade. */}
        {SOURCES.map((place, i) => (
          <svg
            key={place.label}
            ref={(el) => {
              inRails.current[i] = el;
            }}
            aria-hidden="true"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="absolute inset-0 size-full opacity-0"
          >
            <path d={inPath(place.x, i)} className="fill-none stroke-amber" strokeWidth={1.5} />
          </svg>
        ))}
        {DESTINATIONS.map((place, i) => (
          <svg
            key={place.label}
            ref={(el) => {
              outRails.current[i] = el;
            }}
            aria-hidden="true"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="absolute inset-0 size-full opacity-0"
          >
            <path d={outPath(place.x, i)} className="fill-none stroke-amber" strokeWidth={1.5} />
          </svg>
        ))}

        <span
          aria-hidden="true"
          ref={chip}
          className="absolute top-0 left-0 size-2.5 rounded-full border-2 border-plate bg-amber opacity-0 [offset-anchor:center] [offset-rotate:0deg]"
        />

        <span
          ref={lantern}
          aria-hidden="true"
          className="absolute grid size-24 place-items-center rounded-2xl bg-canvas edge"
          style={{ left: CENTRE.x - LANTERN_HALF, top: CENTRE.y - LANTERN_HALF }}
        >
          <Lantern variant="lit" flicker className="size-14" />
        </span>

        <ul aria-label="Where cards come from" className="contents">
          {SOURCES.map((place, i) => (
            <li
              key={place.label}
              ref={(el) => {
                sourceTiles.current[i] = el;
              }}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-lg bg-canvas px-3.5 py-3 whitespace-nowrap edge"
              style={{ left: place.x, top: TOP_Y }}
            >
              {tile(place)}
            </li>
          ))}
        </ul>
        <ul aria-label="Where they can show up" className="contents">
          {DESTINATIONS.map((place, i) => (
            <li
              key={place.label}
              ref={(el) => {
                destinationTiles.current[i] = el;
              }}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-lg bg-canvas px-3.5 py-3 whitespace-nowrap edge"
              style={{ left: place.x, top: BOTTOM_Y }}
            >
              {tile(place)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
