import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./motion";

/**
 * The forgetting curve, drawn as the lantern rather than as a chart: one card is left alone
 * and its light goes out, one is revisited and each return both re-lights it and makes the
 * next fade slower. The shape is illustrative. The evidence named underneath is for the
 * method, not for anything Lymi has been measured to do.
 */
export function MemoryGraph() {
  const lit = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = lit.current;
    if (!path || prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    const len = path.getTotalLength();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          path.style.strokeDasharray = `${len} ${len}`;
          path.style.strokeDashoffset = String(len);
          path.getBoundingClientRect();
          path.style.transition = "stroke-dashoffset 1.5s var(--ease-out)";
          path.style.strokeDashoffset = "0";
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(path);
    return () => io.disconnect();
  }, []);

  return (
    <figure className="m-0">
      <svg
        viewBox="0 0 340 136"
        className="w-full"
        role="img"
        aria-label="Two memory curves over thirty days. A card that is never revisited fades to nothing within a week. A card that is reviewed returns to full recall at each review and fades more slowly each time."
      >
        <title>What happens to a card you never come back to</title>
        <defs>
          <linearGradient id="lymi-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--muted)" stopOpacity="0.9" />
            <stop offset="1" stopColor="var(--muted)" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="lymi-lit" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--amber)" />
            <stop offset="1" stopColor="var(--flame-core)" />
          </linearGradient>
        </defs>

        <line x1="40" y1="22" x2="322" y2="22" stroke="var(--edge)" strokeWidth="1" />
        <line x1="40" y1="65" x2="322" y2="65" stroke="var(--edge)" strokeWidth="1" />
        <line x1="40" y1="108" x2="322" y2="108" stroke="var(--edge-2)" strokeWidth="1" />
        <line x1="40" y1="22" x2="40" y2="108" stroke="var(--edge-2)" strokeWidth="1" />

        <g fill="var(--faint)" fontSize="8" textAnchor="end" className="tabular-nums">
          <text x="33" y="25">
            100%
          </text>
          <text x="33" y="68">
            50%
          </text>
          <text x="33" y="111">
            0%
          </text>
        </g>

        <path
          d="M40 22 C55 62 70 88 96 98 C138 107 226 108 322 108"
          fill="none"
          stroke="url(#lymi-fade)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <text x="150" y="100" fill="var(--muted)" fontSize="9">
          seen once, never again
        </text>

        <path
          ref={lit}
          d="M40 22 C52 46 64 58 76 62 L76 22 C96 42 116 54 138 58 L138 22 C170 36 210 46 246 49 L246 22 C278 30 306 34 322 36"
          fill="none"
          stroke="url(#lymi-lit)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="76" cy="22" r="2.8" fill="var(--flame-core)" />
        <circle cx="138" cy="22" r="2.8" fill="var(--flame-core)" />
        <circle cx="246" cy="22" r="2.8" fill="var(--flame-core)" />
        <text x="322" y="32" fill="var(--amber-text)" fontSize="9" textAnchor="end">
          reviewed four times
        </text>

        <g fill="var(--faint)" fontSize="8" className="tabular-nums">
          <text x="40" y="124">
            DAY 0
          </text>
          <text x="322" y="124" textAnchor="end">
            DAY 30
          </text>
        </g>
      </svg>
      <figcaption className="mt-3 text-sm text-muted">
        Each return makes the next fade slower. That is the whole trick.
      </figcaption>
    </figure>
  );
}
