import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useWide } from "./useWide";

/**
 * The science, drawn as one annotated figure rather than a chart with two paragraphs parked
 * underneath it.
 *
 * A chart and separate prose leaves the reader to work out which sentence is about which part
 * of the picture, and mostly they do not bother. Here each finding hangs off the moment on the
 * curve that demonstrates it: the first return explains retrieval, the widening gap explains
 * spacing, and a dropped line runs from each to the note about it.
 */

/** The plot, in viewBox units. x 34 to 306, y 18 (full recall) to 96 (none). */
const FADED = "M34 18 C48 48 62 68 86 76 C126 86 214 88 306 88";
const LIT =
  "M34 18 C45 34 56 44 67 48 L67 18 C85 32 104 40 124 43 L124 18 C154 28 190 34 224 37 L224 18 C252 24 282 27 306 29";

/** Where each note points, and what it says. The x values are review days on the lit curve. */
const NOTES = [
  {
    x: 67,
    day: "Day 3",
    anchorY: 48,
    title: "Recalling beats re-reading",
    body: "Lymi asks before it shows, because pulling something back out of memory does more for keeping it than looking at it again. Roediger and Karpicke measured that in 2006.",
  },
  {
    x: 224,
    day: "Day 19",
    anchorY: 37,
    title: "The gaps do the work",
    body: "Each recall that goes well pushes the next one further out, so the same handful of reviews covers a whole month. Dunlosky and colleagues rated spacing and recall the two most useful techniques they reviewed in 2013.",
  },
];

const BASE_Y = 118;
/** Where the leader turns and runs across to its note, clear of the day labels. */
const ELBOW_Y = 106;
const VIEW_W = 320;
/** The left edge of each note column, in viewBox units, for the leader to land on. */
const NOTE_X = [4, 170];

export function WhyItWorks() {
  const box = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const wide = useWide();
  const seen = useInView(box, { amount: 0.35, once: true });
  // Drawn is the resting state; the curve rewinds and redraws the first time it scrolls into
  // view. A crawler, a link preview and a background tab all get the finished figure.
  const [replay, setReplay] = useState(false);
  useEffect(() => {
    if (seen && !still) setReplay(true);
  }, [seen, still]);

  return (
    <div ref={box}>
      <figure className="m-0">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <li className="flex items-center gap-2 text-text-2">
            <span className="h-0.5 w-6 rounded-full bg-amber" />
            Reviewed on Lymi's schedule
          </li>
          <li className="flex items-center gap-2 text-muted">
            <span className="h-0.5 w-6 rounded-full bg-faint" />
            Learned once, never revisited
          </li>
        </ul>

        <svg
          viewBox={`0 0 ${VIEW_W} ${BASE_Y + 2}`}
          className="mt-6 w-full"
          role="img"
          aria-label="Recall over thirty days. A card that is never revisited fades to nothing within a week. A card reviewed on days 3, 8 and 19 returns to full recall each time and falls away more slowly after every return, so the gaps between reviews grow."
        >
          <title>What thirty days does to a card</title>

          <line x1="34" y1="18" x2="306" y2="18" stroke="var(--edge)" strokeWidth="1" />
          <line x1="34" y1="53" x2="306" y2="53" stroke="var(--edge)" strokeWidth="1" />
          <line x1="34" y1="88" x2="306" y2="88" stroke="var(--edge-2)" strokeWidth="1" />
          <line x1="34" y1="18" x2="34" y2="88" stroke="var(--edge-2)" strokeWidth="1" />

          <g fill="var(--faint)" fontSize="7" textAnchor="end">
            <text x="28" y="21">
              100%
            </text>
            <text x="28" y="56">
              50%
            </text>
            <text x="28" y="91">
              0%
            </text>
          </g>

          <path
            d={FADED}
            fill="none"
            stroke="var(--faint)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

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

          {/* Every review is a spark; the two the notes are about drop a line to their note. */}
          {[67, 124, 224].map((x) => (
            <motion.circle
              key={x}
              cx={x}
              cy={18}
              r="3"
              fill="var(--flame-core)"
              initial={false}
              animate={{ opacity: replay ? [0, 1] : 1 }}
              transition={still ? { duration: 0 } : { duration: 0.3, delay: 0.4 + x / 320 }}
            />
          ))}

          {/* A leader from the moment on the curve, turning below the plot to land on the left
              edge of the note that explains it. The elbow is what makes the two one thing. */}
          {wide &&
            NOTES.map((n, i) => (
              <g key={n.x}>
                <path
                  d={`M${n.x} ${n.anchorY + 5} V${ELBOW_Y} H${NOTE_X[i]} V${BASE_Y}`}
                  fill="none"
                  stroke="var(--edge-2)"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
                <circle cx={n.x} cy={n.anchorY} r="2" fill="var(--amber)" />
              </g>
            ))}

          <g fill="var(--faint)" fontSize="7">
            <text x="34" y="97">
              DAY 0
            </text>
            <text x="306" y="97" textAnchor="end">
              DAY 30
            </text>
          </g>
        </svg>

        {/* Two even columns, each picked out by the leader that lands on its left edge. */}
        <div className="-mt-1 grid gap-x-8 gap-y-8 @2xl:grid-cols-2">
          {NOTES.map((n) => (
            <div key={n.x}>
              <p className="text-2xs tracking-[0.07em] text-amber-text uppercase">{n.day}</p>
              <h3 className="mt-1.5 text-lg font-medium text-text">{n.title}</h3>
              <p className="mt-2 text-base text-text-2">{n.body}</p>
            </div>
          ))}
        </div>

        <figcaption className="mt-8 max-w-[64ch] text-xs text-faint">
          Lymi schedules with FSRS, a modern spaced-repetition algorithm built on both findings. The
          curves are illustrative: the evidence is for the methods, not a measurement of what Lymi
          produces.
        </figcaption>
      </figure>
    </div>
  );
}
