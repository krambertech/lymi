import { Trans } from "@lingui/react/macro";
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
import { type ComponentType, type ReactNode, useEffect, useId, useRef } from "react";
import { buttonClass } from "../Button";
import { Lantern } from "../Lantern";
import { EASE, useStill } from "./playback";

/** The pipeline's own units; the HTML nodes sit at the same points in percent. */
const W = 1000;
const H = 300;
const HUB = { x: 520, y: 150, r: 40 };
const PULSE_S = 2.8;

interface Node {
  id: string;
  icon: ComponentType<{ className?: string }>;
  tint: string;
  x: number;
  y: number;
  name?: ReactNode;
  /** A node at the faded edge, there to say the pipeline carries on. */
  ghost?: boolean;
}

/** Light runs in from anything on the left, through Lymi, and out to anything on the right. */
function Pipeline() {
  const id = useId();
  const still = useStill();
  const drawing = useRef<SVGSVGElement>(null);
  const shown = useInView(drawing, { amount: 0.35, once: true });
  const inView = useInView(drawing);

  // The pulses are SVG animations, which CSS cannot pause; off screen they stop.
  useEffect(() => {
    if (inView) drawing.current?.unpauseAnimations();
    else drawing.current?.pauseAnimations();
  }, [inView]);

  const ins: Node[] = [
    { id: "hook", icon: Webhook, tint: "bg-plate-2 text-text-2", x: 50, y: 92, ghost: true },
    {
      id: "shortcut",
      icon: Zap,
      tint: "bg-[oklch(0.5_0.13_45)] text-white",
      x: 180,
      y: 214,
      name: <Trans>Shortcut</Trans>,
    },
    {
      id: "sheet",
      icon: Sheet,
      tint: "bg-[oklch(0.5_0.11_150)] text-white",
      x: 262,
      y: 70,
      name: <Trans>Spreadsheet</Trans>,
    },
    {
      id: "script",
      icon: SquareTerminal,
      tint: "bg-[oklch(0.38_0.01_60)] text-white",
      x: 352,
      y: 238,
      name: <Trans>Script</Trans>,
    },
  ];
  const outs: Node[] = [
    {
      id: "widget",
      icon: LayoutGrid,
      tint: "bg-amber text-amber-ink",
      x: 690,
      y: 66,
      name: <Trans>Widget</Trans>,
    },
    {
      id: "site",
      icon: Globe,
      tint: "bg-[oklch(0.5_0.11_235)] text-white",
      x: 770,
      y: 222,
      name: <Trans>Your website</Trans>,
    },
    {
      id: "app",
      icon: AppWindow,
      tint: "bg-[oklch(0.5_0.13_300)] text-white",
      x: 862,
      y: 112,
      name: <Trans>Your app</Trans>,
    },
    { id: "phone", icon: Smartphone, tint: "bg-plate-2 text-text-2", x: 960, y: 232, ghost: true },
  ];

  const inPath = (n: Node) => {
    const mid = (n.x + HUB.x) / 2;
    return `M ${n.x} ${n.y} C ${mid} ${n.y}, ${mid} ${HUB.y}, ${HUB.x - HUB.r - 2} ${HUB.y}`;
  };
  const outPath = (n: Node) => {
    const mid = (n.x + HUB.x) / 2;
    return `M ${HUB.x + HUB.r + 2} ${HUB.y} C ${mid} ${HUB.y}, ${mid} ${n.y}, ${n.x} ${n.y}`;
  };
  // Everything draws in from the left edge to the right, the hub lighting as the inputs reach it.
  const delayAt = (x: number) => (still ? 0 : (x / W) * 1.1);

  const route = (d: string, key: string, x: number, ghost?: boolean) => (
    <motion.path
      key={key}
      d={d}
      fill="none"
      stroke="var(--edge-2)"
      strokeWidth={1.25}
      strokeDasharray={ghost ? "3 5" : undefined}
      initial={still ? false : { pathLength: 0, opacity: 0 }}
      animate={shown ? { pathLength: 1, opacity: 1 } : undefined}
      transition={{ duration: 0.9, ease: EASE, delay: delayAt(x) }}
    />
  );

  const pulse = (d: string, key: string, begin: number) => (
    <path
      key={key}
      d={d}
      pathLength={100}
      fill="none"
      stroke="var(--amber)"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeDasharray="12 140"
      strokeDashoffset={12}
      filter={`url(#${id}-glow)`}
    >
      <animate
        attributeName="stroke-dashoffset"
        values="12;-100"
        dur={`${PULSE_S}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
        calcMode="spline"
        keyTimes="0;1"
        keySplines="0.45 0 0.55 1"
      />
    </path>
  );

  const node = (n: Node) => (
    <motion.span
      key={n.id}
      className="absolute flex -translate-x-1/2 -translate-y-6 flex-col items-center gap-2"
      style={{ left: `${(n.x / W) * 100}%`, top: `${(n.y / H) * 100}%` }}
      initial={still ? false : { opacity: 0, y: 8, scale: 0.9 }}
      animate={shown ? { opacity: n.ghost ? 0.55 : 1, y: 0, scale: 1 } : undefined}
      transition={{ duration: 0.6, ease: EASE, delay: delayAt(n.x) + 0.15 }}
    >
      <span className={clsx("grid size-12 place-items-center rounded-2xl", n.tint)}>
        <n.icon className="size-5" />
      </span>
      {n.name && <span className="text-xs whitespace-nowrap text-text-2">{n.name}</span>}
    </motion.span>
  );

  const live = ins.concat(outs).filter((n) => !n.ghost);
  return (
    <div
      aria-hidden="true"
      className="relative -mx-7 h-[180px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_14%,black_86%,transparent)] @xl:h-[300px] @2xl:-mx-10"
    >
      {/* Narrower than the pipeline, the card shows its middle at a smaller scale, the ends running off either edge. */}
      <div className="absolute top-0 left-1/2 h-[300px] w-[1000px] origin-top -translate-x-1/2 scale-[0.6] @xl:scale-100 @4xl:w-full">
        <svg
          ref={drawing}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          <defs>
            <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {ins.map((n) => route(inPath(n), `in-${n.id}`, n.x, n.ghost))}
          {outs.map((n) => route(outPath(n), `out-${n.id}`, n.x - 120, n.ghost))}
          {!still &&
            shown &&
            live.map((n, i) =>
              n.x < HUB.x
                ? pulse(inPath(n), `p-${n.id}`, 1.2 + i * 0.7)
                : pulse(outPath(n), `p-${n.id}`, 1.2 + PULSE_S / 2 + i * 0.5),
            )}
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
            stroke="var(--edge-2)"
            strokeWidth={1}
            initial={still ? false : { opacity: 0, scale: 0.8 }}
            animate={shown ? { opacity: 1, scale: 1 } : undefined}
            transition={{ duration: 0.6, ease: EASE, delay: delayAt(HUB.x) }}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        </svg>
        <motion.span
          className="absolute grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center"
          style={{ left: `${(HUB.x / W) * 100}%`, top: `${(HUB.y / H) * 100}%` }}
          initial={still ? false : { opacity: 0 }}
          animate={shown ? { opacity: 1 } : undefined}
          transition={{ duration: 0.6, ease: EASE, delay: delayAt(HUB.x) + 0.2 }}
        >
          <Lantern glow flicker className="size-10" />
        </motion.span>
        {ins.map(node)}
        {outs.map(node)}
      </div>
    </div>
  );
}

/** The public API on a night plate: what it is in a line, then the pipeline it opens. */
export function ApiSection() {
  return (
    <section data-nav="landing" className="px-5 py-20 @2xl:px-10 @4xl:py-28">
      <div
        data-theme="dark"
        className="mx-auto max-w-[1040px] overflow-hidden rounded-[24px] bg-sheet p-7 text-text edge @2xl:p-10"
      >
        <div className="flex flex-col gap-6 @4xl:flex-row @4xl:items-end @4xl:justify-between">
          <div>
            <h2 className="max-w-[16ch] text-3xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-4xl">
              <Trans>Open by design.</Trans>
            </h2>
            <p className="mt-4 max-w-[46ch] text-md text-pretty text-text-2">
              <Trans>
                Lymi has a public API with keys you can limit. Add cards from a shortcut, a
                spreadsheet or a script, and show what’s due on your own site or in your own app.
              </Trans>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <a href="/docs/quickstart" className={buttonClass("secondary")}>
              <Trans>Quickstart</Trans>
            </a>
            <a href="/docs/api" className={buttonClass("ghost")}>
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
