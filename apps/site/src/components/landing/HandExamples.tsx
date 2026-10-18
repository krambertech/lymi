import { clsx } from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { Fragment } from "react";
import { EASE, useStill } from "./playback";

interface Props {
  /** The front card's id; its sentences replace the last card's. */
  front: string | undefined;
  examples: Record<string, string[]>;
}

/**
 * Places around the hand a sentence can drift in. Each card takes every other one from a different
 * start, so the sentences move about between cards. Either half holds two places above the hand,
 * which are all a phone shows.
 */
const SPOTS = [
  { at: "top-0 start-[2%]", phone: true },
  { at: "top-[4%] end-[2%] text-end", phone: true },
  { at: "top-[8%] end-[6%] text-end", phone: true },
  { at: "top-0 start-[8%]", phone: true },
  { at: "top-[44%] start-[-10%]", phone: false },
  { at: "bottom-[10%] end-[-2%] text-end", phone: false },
  { at: "top-[52%] end-[-10%] text-end", phone: false },
  { at: "bottom-0 start-[6%]", phone: false },
];

/** A stable number per card, so the server and the browser pick the same places. */
function seed(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return h;
}

/** A sentence with its marked run, the word as the sentence bends it, lit. */
function Sentence({ text }: { text: string }) {
  return text.split("*").map((run, i) =>
    i % 2 ? (
      <span key={run + String(i)} className="text-amber-text">
        {run}
      </span>
    ) : (
      <Fragment key={run + String(i)}>{run}</Fragment>
    ),
  );
}

/** Faint sentences drifting behind a hand of Japanese cards, each using the word on top; they sharpen as they arrive and blur as they leave. */
export function HandExamples({ front, examples }: Props) {
  const still = useStill();
  const lines = (front && examples[front]) || [];
  const start = front ? seed(front) : 0;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-x-4 -inset-y-2 select-none"
    >
      <AnimatePresence initial={false}>
        {lines.map((line, i) => {
          const spot = SPOTS[(start + i * 2) % SPOTS.length] ?? SPOTS[0];
          return (
            <motion.p
              key={`${front}-${line}`}
              lang="ja"
              initial={still ? false : { opacity: 0, filter: "blur(8px)" }}
              animate={{ opacity: 0.7, filter: "blur(0px)" }}
              exit={
                still
                  ? { opacity: 0, transition: { duration: 0 } }
                  : { opacity: 0, filter: "blur(6px)" }
              }
              transition={{ duration: 1.1, ease: EASE, delay: still ? 0 : 0.3 + i * 0.18 }}
              className={clsx(
                "absolute max-w-[14em] text-sm leading-relaxed text-faint @4xl:text-[15px]",
                spot?.at,
                !spot?.phone && "hidden @5xl:block",
              )}
            >
              <span
                className="hand-drift block"
                style={{ animationDelay: `${-(i * 2.3 + start) % 9}s` }}
              >
                <Sentence text={line} />
              </span>
            </motion.p>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
