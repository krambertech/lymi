import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import {
  AppWindow,
  Globe,
  LayoutGrid,
  Sheet,
  Smartphone,
  SquareTerminal,
  Webhook,
  Zap,
} from "lucide-react";
import { motion, useInView } from "motion/react";
import { type ComponentType, type ReactNode, useEffect, useRef, useState } from "react";
import { buttonClass } from "../Button";
import { Lantern } from "../Lantern";
import { EASE, useStill } from "./playback";

interface Stop {
  id: string;
  icon: ComponentType<{ className?: string }>;
  x: number;
  y: number;
  name?: ReactNode;
  /** What a place shows once it has read the API. */
  due?: number;
  /** At the faded edge, there to say the line carries on. */
  ghost?: boolean;
}

/** One drawing of the pipeline: its own units, where everything sits, and how the lines bend. */
interface Layout {
  w: number;
  h: number;
  hub: { x: number; y: number; r: number };
  ins: Stop[];
  outs: Stop[];
  inPath: (n: Stop) => string;
  outPath: (n: Stop) => string;
}

/** One card leaves each source per lap, so one lands every third of it. */
const LAP_S = 3.6;

const NAMES = {
  shortcut: <Trans>Shortcut</Trans>,
  sheet: <Trans>Spreadsheet</Trans>,
  script: <Trans>Script</Trans>,
  widget: <Trans>Widget</Trans>,
  app: <Trans>Your app</Trans>,
  site: <Trans>Your website</Trans>,
};

const WIDE_HUB = { x: 500, y: 150, r: 42 };
/** Left to right, the ends running off the plate. */
const WIDE: Layout = {
  w: 1000,
  h: 320,
  hub: WIDE_HUB,
  ins: [
    { id: "hook", icon: Webhook, x: 30, y: 250, ghost: true },
    { id: "shortcut", icon: Zap, x: 128, y: 150, name: NAMES.shortcut },
    { id: "sheet", icon: Sheet, x: 262, y: 52, name: NAMES.sheet },
    { id: "script", icon: SquareTerminal, x: 286, y: 252, name: NAMES.script },
  ],
  outs: [
    { id: "widget", icon: LayoutGrid, x: 716, y: 50, name: NAMES.widget, due: 12 },
    { id: "app", icon: AppWindow, x: 738, y: 250, name: NAMES.app, due: 12 },
    { id: "site", icon: Globe, x: 872, y: 148, name: NAMES.site, due: 12 },
    { id: "phone", icon: Smartphone, x: 972, y: 52, ghost: true },
  ],
  inPath: (n) => {
    const mid = (n.x + WIDE_HUB.x) / 2;
    return `M ${n.x} ${n.y} C ${mid} ${n.y}, ${mid} ${WIDE_HUB.y}, ${WIDE_HUB.x - WIDE_HUB.r} ${WIDE_HUB.y}`;
  },
  outPath: (n) => {
    const mid = (n.x + WIDE_HUB.x) / 2;
    return `M ${WIDE_HUB.x + WIDE_HUB.r} ${WIDE_HUB.y} C ${mid} ${WIDE_HUB.y}, ${mid} ${n.y}, ${n.x} ${n.y}`;
  },
};

const TALL_HUB = { x: 168, y: 206, r: 38 };
/** Where a line meets the lantern's ring: straight above or below, or 45° to one side. */
const meet = (n: Stop, above: boolean) => {
  const side = Math.sign(Math.round(n.x - TALL_HUB.x));
  const reach = side === 0 ? TALL_HUB.r : TALL_HUB.r * Math.SQRT1_2;
  return {
    x: TALL_HUB.x + side * TALL_HUB.r * Math.SQRT1_2,
    y: TALL_HUB.y + (above ? -reach : reach),
  };
};
/** Top to bottom on a phone, where the wide drawing would shrink its labels past reading. */
const TALL: Layout = {
  w: 336,
  h: 420,
  hub: TALL_HUB,
  ins: [
    { id: "shortcut", icon: Zap, x: 74, y: 28, name: NAMES.shortcut },
    { id: "sheet", icon: Sheet, x: 254, y: 28, name: NAMES.sheet },
    { id: "script", icon: SquareTerminal, x: 168, y: 96, name: NAMES.script },
  ],
  outs: [
    { id: "widget", icon: LayoutGrid, x: 80, y: 322, name: NAMES.widget, due: 12 },
    { id: "app", icon: AppWindow, x: 252, y: 322, name: NAMES.app, due: 12 },
    { id: "site", icon: Globe, x: 168, y: 390, name: NAMES.site, due: 12 },
  ],
  inPath: (n) => {
    const end = meet(n, true);
    return `M ${n.x} ${n.y} C ${n.x} ${n.y + 80}, ${end.x} ${end.y - 50}, ${end.x} ${end.y}`;
  },
  outPath: (n) => {
    const start = meet(n, false);
    return `M ${start.x} ${start.y} C ${start.x} ${start.y + 44}, ${n.x} ${n.y - 60}, ${n.x} ${n.y}`;
  },
};

/** Whether the plate is too narrow for the wide drawing; read after hydration. */
function useTall() {
  const [tall, setTall] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    setTall(query.matches);
    const change = () => setTall(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  return tall;
}

/** Cards run in from every source, the count at the lantern rises, and what is due runs out. */
function Pipeline() {
  const { i18n } = useLingui();
  const still = useStill();
  const tall = useTall();
  const { w: W, h: H, hub: HUB, ins: INS, outs: OUTS, inPath, outPath } = tall ? TALL : WIDE;
  const drawing = useRef<SVGSVGElement>(null);
  // The frame outlives a switch between the wide and tall drawings, so it does the watching.
  const frame = useRef<HTMLDivElement>(null);
  const shown = useInView(frame, { amount: 0.35, once: true });
  const inView = useInView(frame);
  const [added, setAdded] = useState(1284);

  // SVG animations ignore CSS play state; off screen they stop, and the count with them.
  useEffect(() => {
    if (inView) drawing.current?.unpauseAnimations();
    else drawing.current?.pauseAnimations();
  }, [inView]);
  useEffect(() => {
    if (!inView || !shown || still) return;
    const timer = window.setInterval(() => setAdded((n) => n + 1), (LAP_S / 3) * 1000);
    return () => window.clearInterval(timer);
  }, [inView, shown, still]);

  // The wide drawing arrives left to right, the tall one top to bottom.
  const delayOf = (n: { x: number; y: number }) => (still ? 0 : (tall ? n.y / H : n.x / W) * 1.1);
  const route = (d: string, n: Stop) => (
    <motion.path
      key={`r-${n.id}`}
      d={d}
      fill="none"
      stroke="var(--ink-muted)"
      strokeOpacity={0.55}
      strokeWidth={1.25}
      strokeDasharray={n.ghost ? "3 5" : undefined}
      initial={still ? false : { pathLength: 0, opacity: 0 }}
      animate={shown ? { pathLength: 1, opacity: n.ghost ? 0.6 : 1 } : undefined}
      transition={{ duration: 0.9, ease: EASE, delay: Math.min(delayOf(n), delayOf(HUB)) }}
    />
  );
  const motionProps = (begin: number) => ({
    dur: `${LAP_S}s`,
    begin: `${begin}s`,
    repeatCount: "indefinite" as const,
  });

  const live = (stops: Stop[]) => stops.filter((n) => !n.ghost);
  const tile = (n: Stop) => (
    <motion.span
      key={n.id}
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: n.x, top: n.y }}
      initial={still ? false : { opacity: 0, scale: 0.92 }}
      animate={shown ? { opacity: n.ghost ? 0.5 : 1, scale: 1 } : undefined}
      transition={{ duration: 0.6, ease: EASE, delay: delayOf(n) + 0.15 }}
    >
      <span
        className={clsx(
          "flex h-11 items-center gap-2 rounded-xl bg-plate whitespace-nowrap text-ink edge",
          // Between a phone and a full plate the drawing is shown at 78%, so its words are set larger.
          tall ? "text-sm" : "text-md @4xl:text-sm",
          n.name ? "ps-3 pe-3.5" : "w-11 justify-center text-ink-secondary",
        )}
      >
        <n.icon className="size-4 shrink-0 text-ink-secondary" />
        {n.name}
        {n.due && (
          <span
            className={clsx(
              "rounded-full bg-amber-soft px-2 py-0.5 font-medium text-amber-text",
              tall ? "text-xs" : "text-md @4xl:text-xs",
            )}
          >
            <Trans>{n.due} due</Trans>
          </span>
        )}
      </span>
    </motion.span>
  );

  return (
    <div
      ref={frame}
      aria-hidden="true"
      className={clsx(
        "relative -mx-7 overflow-hidden @2xl:-mx-10",
        tall
          ? "h-[420px]"
          : "h-[250px] [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] @4xl:h-[320px]",
      )}
    >
      {/* Narrower than the wide drawing, the plate shows its middle smaller, the ends running off. */}
      <div
        key={tall ? "tall" : "wide"}
        style={{ width: W, height: H }}
        className={clsx(
          "absolute top-0 left-1/2 origin-top -translate-x-1/2",
          !tall && "scale-[0.78] @4xl:scale-100",
        )}
      >
        <svg
          ref={drawing}
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 size-full overflow-visible"
        >
          {INS.map((n) => route(inPath(n), n))}
          {OUTS.map((n) => route(outPath(n), n))}
          {!still &&
            shown &&
            live(INS).map((n, i) => (
              // Cards on their way in are ink; what is due on its way out is amber, like its chips.
              <circle key={`c-${n.id}`} r={3.5} fill="var(--ink)" opacity={0}>
                <animateMotion
                  path={inPath(n)}
                  calcMode="spline"
                  keyTimes="0;1"
                  keySplines="0.45 0 0.55 1"
                  {...motionProps(1.2 + (i * LAP_S) / 3)}
                />
                <animate
                  attributeName="opacity"
                  values="0;1;1;0"
                  keyTimes="0;0.2;0.86;1"
                  {...motionProps(1.2 + (i * LAP_S) / 3)}
                />
              </circle>
            ))}
          {!still &&
            shown &&
            live(OUTS).map((n, i) => (
              <circle key={`d-${n.id}`} r={3.5} fill="var(--amber)" opacity={0}>
                <animateMotion
                  path={outPath(n)}
                  calcMode="spline"
                  keyTimes="0;1"
                  keySplines="0.45 0 0.55 1"
                  {...motionProps(1.8 + (i * LAP_S) / 3)}
                />
                <animate
                  attributeName="opacity"
                  values="0;1;1;0"
                  keyTimes="0;0.15;0.8;1"
                  {...motionProps(1.8 + (i * LAP_S) / 3)}
                />
              </circle>
            ))}
          {!still && shown && (
            <circle
              cx={HUB.x}
              cy={HUB.y}
              r={HUB.r + 10}
              fill="none"
              stroke="var(--amber)"
              strokeOpacity={0.4}
              strokeWidth={1}
              className="landing-ring"
            />
          )}
          <motion.circle
            cx={HUB.x}
            cy={HUB.y}
            r={HUB.r}
            fill="var(--canvas)"
            stroke="var(--edge-strong)"
            strokeWidth={1}
            initial={still ? false : { opacity: 0, scale: 0.8 }}
            animate={shown ? { opacity: 1, scale: 1 } : undefined}
            transition={{ duration: 0.6, ease: EASE, delay: delayOf(HUB) }}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        </svg>
        <motion.span
          className="absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center"
          style={{ left: HUB.x, top: HUB.y }}
          initial={still ? false : { opacity: 0 }}
          animate={shown ? { opacity: 1 } : undefined}
          transition={{ duration: 0.6, ease: EASE, delay: delayOf(HUB) + 0.2 }}
        >
          <Lantern glow flicker className="size-11" />
        </motion.span>
        <motion.p
          className={clsx(
            "absolute whitespace-nowrap text-ink-secondary",
            tall ? "text-sm" : "text-md @4xl:text-sm",
            tall ? "-translate-y-1/2 text-start" : "-translate-x-1/2 text-center",
          )}
          style={
            tall
              ? { left: HUB.x + HUB.r + 16, top: HUB.y }
              : { left: HUB.x, top: HUB.y + HUB.r + 18 }
          }
          initial={still ? false : { opacity: 0 }}
          animate={shown ? { opacity: 1 } : undefined}
          transition={{ duration: 0.6, ease: EASE, delay: delayOf(HUB) + 0.4 }}
        >
          <span className="block text-lg font-medium text-ink tabular-nums">
            {added.toLocaleString(i18n.locale)}
          </span>
          <Trans>cards added</Trans>
        </motion.p>
        {INS.map(tile)}
        {OUTS.map(tile)}
      </div>
    </div>
  );
}

/** The public API on a night plate: the claim and its two links, then the pipeline it opens. */
export function ApiSection() {
  return (
    <section data-nav="landing" className="px-5 py-4 @2xl:px-10 @4xl:py-8">
      <div
        data-theme="dark"
        className="mx-auto max-w-[1040px] overflow-hidden rounded-[24px] bg-sheet p-7 text-ink edge @2xl:p-10"
      >
        <div className="flex flex-col gap-6 @4xl:flex-row @4xl:items-start @4xl:justify-between">
          <div>
            <h2 className="max-w-[16ch] text-3xl font-medium tracking-[-0.03em] text-balance text-ink @2xl:text-4xl">
              <Trans>Open by design.</Trans>
            </h2>
            <p className="mt-4 max-w-[46ch] text-md text-pretty text-ink-secondary">
              <Trans>
                Lymi has a public API with keys you can limit. Add cards from a shortcut, a
                spreadsheet or a script, and show what’s due on your own site or in your own app.
              </Trans>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <a
              href="/docs/quickstart"
              className={buttonClass("secondary", "md", "@max-xl:min-h-11")}
            >
              <Trans>Quickstart</Trans>
            </a>
            <a href="/docs/api" className={buttonClass("ghost", "md", "@max-xl:min-h-11")}>
              <Trans>API reference</Trans>
            </a>
          </div>
        </div>
        <div className="mt-8">
          <Pipeline />
        </div>
      </div>
    </section>
  );
}
