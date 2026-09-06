import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * The forgetting curve, drawn as the lantern rather than as a chart: one card is left alone
 * and its light goes out, one is revisited and each return both re-lights it and makes the
 * next fade slower.
 *
 * The two series are named in a legend above the plot rather than beside their own lines.
 * Floating labels inside the drawing sat on top of the curves at every width that mattered,
 * and a legend cannot collide with anything. The shape is illustrative; the evidence named
 * underneath is for the method, not for a result Lymi has been measured to produce.
 */

const FADED = "M34 18 C48 52 62 74 86 82 C126 90 214 91 306 91";
const LIT =
  "M34 18 C45 38 56 48 67 52 L67 18 C85 34 104 44 124 47 L124 18 C154 30 190 38 224 41 L224 18 C252 27 282 30 306 32";
const SPARKS = [67, 124, 224];

export function MemoryGraph() {
  const box = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const seen = useInView(box, { amount: 0.5, once: true });
  // Drawn is the resting state, and the curve replays from nothing the first time it scrolls
  // into view. That way a crawler, a link preview or a background tab still gets the finished
  // chart instead of an empty grid, and nobody watching sees it jump.
  const [replay, setReplay] = useState(false);
  useEffect(() => {
    if (seen && !still) setReplay(true);
  }, [seen, still]);

  return (
    <figure ref={box} className="m-0">
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
        <li className="flex items-center gap-2 text-text-2">
          <span className="h-0.5 w-6 rounded-full bg-amber" />
          Reviewed on Lymi's schedule
        </li>
        <li className="flex items-center gap-2 text-muted">
          <span className="h-0.5 w-6 rounded-full bg-faint" />
          Seen once, never again
        </li>
      </ul>

      <svg
        viewBox="0 0 320 112"
        className="mt-5 w-full max-w-[560px]"
        role="img"
        aria-label="Two memory curves over thirty days. A card that is never revisited fades to nothing within a week. A card that is reviewed returns to full recall at each review and fades more slowly each time."
      >
        <title>What happens to a card you never come back to</title>

        <line x1="34" y1="18" x2="306" y2="18" stroke="var(--edge)" strokeWidth="1" />
        <line x1="34" y1="54.5" x2="306" y2="54.5" stroke="var(--edge)" strokeWidth="1" />
        <line x1="34" y1="91" x2="306" y2="91" stroke="var(--edge-2)" strokeWidth="1" />
        <line x1="34" y1="18" x2="34" y2="91" stroke="var(--edge-2)" strokeWidth="1" />

        <g fill="var(--faint)" fontSize="7.5" textAnchor="end">
          <text x="28" y="21">
            100%
          </text>
          <text x="28" y="57">
            50%
          </text>
          <text x="28" y="94">
            0%
          </text>
        </g>

        <path d={FADED} fill="none" stroke="var(--faint)" strokeWidth="1.8" strokeLinecap="round" />

        <motion.path
          d={LIT}
          fill="none"
          stroke="var(--amber)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: replay ? [0, 1] : 1 }}
          transition={still ? { duration: 0 } : { duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        />

        {SPARKS.map((x, i) => (
          <motion.circle
            key={x}
            cx={x}
            cy={18}
            r="3"
            fill="var(--flame-core)"
            initial={false}
            animate={{ opacity: replay ? [0, 1] : 1, scale: replay ? [0, 1] : 1 }}
            style={{ originX: `${x}px`, originY: "18px" }}
            transition={still ? { duration: 0 } : { duration: 0.3, delay: 0.35 + i * 0.34 }}
          />
        ))}

        <g fill="var(--faint)" fontSize="7.5">
          <text x="34" y="105">
            DAY 0
          </text>
          <text x="306" y="105" textAnchor="end">
            DAY 30
          </text>
        </g>
      </svg>

      <figcaption className="mt-4 max-w-[52ch] text-sm text-text-2">
        Each return makes the next fade slower. That is the whole trick.
      </figcaption>
    </figure>
  );
}
