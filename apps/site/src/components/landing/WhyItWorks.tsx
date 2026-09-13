/**
 * A quiet explanation of the scheduling idea. The figure stays deliberately lighter than a
 * product dashboard: two fine curves, three review moments, and the prose below rather than
 * connector lines drawn through the page.
 */

const FADED = "M34 14 C48 42 64 60 90 66 C136 73 222 75 306 76";
const REVIEWED =
  "M34 14 C46 29 58 40 70 45 L70 14 C88 27 108 35 130 38 L130 14 C160 24 194 30 228 33 L228 14 C254 20 281 23 306 25";

const NOTES = [
  {
    moment: "After the first recall",
    title: "Retrieving strengthens memory",
    body: "Lymi asks before it shows. Trying to retrieve an idea strengthens later recall more than simply reading it again, as Roediger and Karpicke found in 2006.",
  },
  {
    moment: "As the gaps widen",
    title: "Successful reviews buy time",
    body: "When recall goes well, the next review can wait longer. Dunlosky and colleagues rated practice testing and distributed practice as highly effective techniques in 2013.",
  },
] as const;

export function WhyItWorks() {
  const figure = useRef<HTMLElement>(null);
  const inView = useInView(figure, { once: true, amount: 0.24 });
  const still = useReducedMotion();

  return (
    <figure ref={figure} className="m-0">
      <motion.ul
        className="flex flex-wrap justify-center gap-x-7 gap-y-2 text-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: inView ? 1 : 0 }}
        transition={{ duration: still ? 0.18 : 0.35 }}
      >
        <li className="flex items-center gap-2 text-text-2">
          <span className="h-px w-7 bg-amber" aria-hidden="true" />
          Reviewed with Lymi
        </li>
        <li className="flex items-center gap-2 text-muted">
          <span className="h-px w-7 bg-muted" aria-hidden="true" />
          Learned once, never revisited
        </li>
      </motion.ul>

      <svg
        viewBox="0 0 320 104"
        className="mx-auto mt-8 w-full max-w-[920px]"
        role="img"
        aria-label="Recall over thirty days. A card learned once fades quickly. A card reviewed on days 3, 8, and 19 returns to full recall each time, then fades more slowly as the gaps grow."
      >
        <title>How well-timed reviews change recall</title>

        <g stroke="var(--edge)" strokeWidth="0.55">
          <line x1="34" y1="14" x2="306" y2="14" />
          <line x1="34" y1="46" x2="306" y2="46" />
          <line x1="34" y1="78" x2="306" y2="78" />
        </g>

        <g fill="var(--muted)" fontSize="4.2" textAnchor="end">
          <text x="29" y="16">
            100%
          </text>
          <text x="29" y="48">
            50%
          </text>
          <text x="29" y="80">
            0%
          </text>
        </g>

        <motion.path
          d={FADED}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="0.9"
          strokeLinecap="round"
          initial={still ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: still ? 1 : inView ? 1 : 0, opacity: inView ? 1 : 0 }}
          transition={{ duration: still ? 0.18 : 1.8, ease: [0.19, 1, 0.22, 1] }}
        />
        <motion.path
          d={REVIEWED}
          fill="none"
          stroke="var(--amber)"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={still ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: still ? 1 : inView ? 1 : 0, opacity: inView ? 1 : 0 }}
          transition={{
            duration: still ? 0.18 : 2.6,
            delay: still || !inView ? 0 : 0.22,
            ease: [0.19, 1, 0.22, 1],
          }}
        />

        {[70, 130, 228].map((x, index) => (
          <motion.circle
            key={x}
            cx={x}
            cy={14}
            r="1.65"
            fill="var(--flame-core)"
            stroke="var(--amber)"
            strokeWidth="0.45"
            initial={{ opacity: 0 }}
            animate={{ opacity: inView ? 1 : 0 }}
            transition={{
              duration: 0.2,
              delay: still || !inView ? 0 : 0.9 + index * 0.52,
            }}
          />
        ))}

        <g fill="var(--muted)" fontSize="4.2">
          <text x="34" y="92">
            DAY 0
          </text>
          <text x="306" y="92" textAnchor="end">
            DAY 30
          </text>
        </g>
      </svg>

      <div className="mx-auto mt-8 grid max-w-[860px] gap-8 @2xl:grid-cols-2 @2xl:gap-12">
        {NOTES.map((note, index) => (
          <motion.div
            key={note.title}
            className="border-t border-edge pt-5"
            initial={still ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : still ? 0 : 8 }}
            transition={{
              duration: still ? 0.18 : 0.48,
              delay: still || !inView ? 0 : 1.3 + index * 0.55,
              ease: [0.19, 1, 0.22, 1],
            }}
          >
            <p className="text-xs text-amber-text">{note.moment}</p>
            <h3 className="mt-2 text-lg font-medium text-text">{note.title}</h3>
            <p className="mt-2 text-base text-text-2">{note.body}</p>
          </motion.div>
        ))}
      </div>
    </figure>
  );
}

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
