import { Trans } from "@lingui/react/macro";
import { AppWindow, Globe, LayoutGrid, Sheet, SquareTerminal, Zap } from "lucide-react";
import { useInView } from "motion/react";
import { type ComponentType, type ReactNode, useEffect, useId, useRef } from "react";
import { buttonClass } from "../Button";
import { Lantern } from "../Lantern";
import { useStill } from "./playback";

/** The diagram's own units; the HTML nodes sit at the same points in percent. */
const W = 600;
const H = 320;
const HUB = { x: W / 2, y: H / 2, r: 42 };
const ROWS = [54, H / 2, H - 54];
/** Node centres on each side. */
const SIDE = 56;
const NODE_R = 24;
const PULSE_S = 2.4;

interface Endpoint {
  id: string;
  icon: ComponentType<{ className?: string }>;
  tint: string;
  name: ReactNode;
}

function NodeIcon({ node }: { node: Endpoint }) {
  return (
    <span className="flex w-[96px] flex-col items-center gap-2">
      <span className={`grid size-12 place-items-center rounded-2xl ${node.tint}`}>
        <node.icon className="size-5" />
      </span>
      <span className="text-xs whitespace-nowrap text-text-2">{node.name}</span>
    </span>
  );
}

/** Light runs in from anything on the left, through Lymi, and out to anything on the right. */
function Flow() {
  const id = useId();
  const still = useStill();
  const drawing = useRef<SVGSVGElement>(null);
  const inView = useInView(drawing);

  // The pulses are SVG animations, which CSS cannot pause; off screen they stop.
  useEffect(() => {
    if (inView) drawing.current?.unpauseAnimations();
    else drawing.current?.pauseAnimations();
  }, [inView]);
  const ins: Endpoint[] = [
    {
      id: "shortcut",
      icon: Zap,
      tint: "bg-[oklch(0.5_0.13_45)] text-white",
      name: <Trans>Shortcut</Trans>,
    },
    {
      id: "sheet",
      icon: Sheet,
      tint: "bg-[oklch(0.5_0.11_150)] text-white",
      name: <Trans>Spreadsheet</Trans>,
    },
    {
      id: "script",
      icon: SquareTerminal,
      tint: "bg-[oklch(0.38_0.01_60)] text-white",
      name: <Trans>Script</Trans>,
    },
  ];
  const outs: Endpoint[] = [
    {
      id: "site",
      icon: Globe,
      tint: "bg-[oklch(0.5_0.11_235)] text-white",
      name: <Trans>Your website</Trans>,
    },
    {
      id: "widget",
      icon: LayoutGrid,
      tint: "bg-amber text-amber-ink",
      name: <Trans>Widget</Trans>,
    },
    {
      id: "app",
      icon: AppWindow,
      tint: "bg-[oklch(0.5_0.13_300)] text-white",
      name: <Trans>Your app</Trans>,
    },
  ];
  const from = SIDE + NODE_R + 6;
  const inPath = (y: number) =>
    `M ${from} ${y} C ${from + 90} ${y}, ${HUB.x - 120} ${HUB.y}, ${HUB.x - HUB.r - 4} ${HUB.y}`;
  const outPath = (y: number) =>
    `M ${HUB.x + HUB.r + 4} ${HUB.y} C ${HUB.x + 120} ${HUB.y}, ${W - from - 90} ${y}, ${W - from} ${y}`;

  const pulse = (d: string, begin: number) => (
    <path
      d={d}
      pathLength={100}
      fill="none"
      stroke="var(--amber)"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeDasharray="14 120"
      strokeDashoffset={114}
      filter={`url(#${id}-glow)`}
    >
      <animate
        attributeName="stroke-dashoffset"
        values="114;0"
        dur={`${PULSE_S}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
        calcMode="spline"
        keyTimes="0;1"
        keySplines="0.45 0 0.55 1"
      />
    </path>
  );

  return (
    <div className="relative mx-auto aspect-[600/320] w-full max-w-[600px]" aria-hidden="true">
      <svg
        ref={drawing}
        viewBox={`0 0 ${W} ${H}`}
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
        {[76, 108].map((r) => (
          <circle key={r} cx={HUB.x} cy={HUB.y} r={r} fill="none" stroke="var(--edge)" />
        ))}
        {ROWS.map((y, i) => (
          <g key={y}>
            <path d={inPath(y)} fill="none" stroke="var(--edge-2)" strokeWidth={1.25} />
            <path d={outPath(y)} fill="none" stroke="var(--edge-2)" strokeWidth={1.25} />
            {!still && pulse(inPath(y), i * 0.8)}
            {!still && pulse(outPath(y), PULSE_S / 2 + i * 0.8)}
          </g>
        ))}
        {!still && (
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
        <circle
          cx={HUB.x}
          cy={HUB.y}
          r={HUB.r}
          fill="var(--canvas)"
          stroke="var(--edge-2)"
          strokeWidth={1}
        />
      </svg>

      <span
        className="absolute grid size-[12%] -translate-x-1/2 -translate-y-1/2 place-items-center"
        style={{ left: "50%", top: "50%" }}
      >
        <Lantern glow flicker className="size-[80%]" />
      </span>

      {ins.map((node, i) => (
        <span
          key={node.id}
          className="absolute -translate-x-1/2 -translate-y-6"
          style={{ left: `${(SIDE / W) * 100}%`, top: `${((ROWS[i] ?? 0) / H) * 100}%` }}
        >
          <NodeIcon node={node} />
        </span>
      ))}
      {outs.map((node, i) => (
        <span
          key={node.id}
          className="absolute -translate-x-1/2 -translate-y-6"
          style={{ left: `${((W - SIDE) / W) * 100}%`, top: `${((ROWS[i] ?? 0) / H) * 100}%` }}
        >
          <NodeIcon node={node} />
        </span>
      ))}
    </div>
  );
}

/** The public API on a night plate: what it is in a line, and how far it reaches. */
export function ApiSection() {
  return (
    <section data-nav="landing" className="px-5 py-20 @2xl:px-10 @4xl:py-28">
      <div
        data-theme="dark"
        className="mx-auto grid max-w-[1040px] items-center gap-10 rounded-[24px] bg-sheet p-7 text-text edge @2xl:p-10 @4xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] @4xl:gap-6"
      >
        <div>
          <h2 className="max-w-[16ch] text-3xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-4xl">
            <Trans>Open by design.</Trans>
          </h2>
          <p className="mt-4 max-w-[38ch] text-md text-pretty text-text-2">
            <Trans>
              Lymi has a public API with keys you can limit. Add cards from a shortcut, a
              spreadsheet or a script, and show what’s due on your own site or in your own app.
            </Trans>
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <a href="/docs/quickstart" className={buttonClass("secondary")}>
              <Trans>Quickstart</Trans>
            </a>
            <a href="/docs/api" className={buttonClass("ghost")}>
              <Trans>API reference</Trans>
            </a>
          </div>
        </div>
        <div className="flex justify-center py-2">
          {/* The diagram keeps its proportions and shrinks as a whole on a phone, so its labels never collide. */}
          <div className="w-[600px] shrink-0 @max-xl:[zoom:0.54] @xl:@max-4xl:[zoom:0.85] @4xl:w-full">
            <Flow />
          </div>
        </div>
      </div>
    </section>
  );
}
