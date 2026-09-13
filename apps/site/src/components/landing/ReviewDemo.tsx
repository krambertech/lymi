import { clsx } from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { SAMPLE_CARDS } from "./cards";

/**
 * The four answers, with what each one costs. These intervals are the shape FSRS produces
 * for a card seen a few times. They are here to make the mechanic legible rather than to
 * promise a schedule, so the page claims nothing about them beyond what the buttons show.
 */
const GRADES = [
  { name: "Again", when: "10 min", said: "10 minutes" },
  { name: "Hard", when: "2 days", said: "2 days" },
  { name: "Good", when: "4 days", said: "4 days" },
  { name: "Easy", when: "9 days", said: "9 days" },
] as const;

const DECK = [SAMPLE_CARDS[0], SAMPLE_CARDS[3], SAMPLE_CARDS[1], SAMPLE_CARDS[6]].filter(
  (c): c is NonNullable<typeof c> => !!c,
);

const SPRING = { type: "spring", duration: 0.68, bounce: 0.14 } as const;

/** One working review that waits on an unturned card until the visitor presses it. */
export function ReviewDemo() {
  const advanceTimer = useRef<number | null>(null);
  const still = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [revealedFor, setRevealedFor] = useState(-1);
  const [answered, setAnswered] = useState<number | null>(null);

  const card = DECK[index % DECK.length];
  const chosen = answered === null ? null : GRADES[answered];
  const revealed = revealedFor === index;

  const answer = (n: number) => {
    if (!revealed || answered !== null) return;
    setAnswered(n);
    advanceTimer.current = window.setTimeout(
      () => {
        setIndex((i) => i + 1);
        setAnswered(null);
      },
      still ? 0 : 1250,
    );
  };

  useEffect(() => {
    return () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    };
  }, []);

  if (!card) return null;

  return (
    <div className="rounded-md outline-offset-4">
      <div className="mx-auto flex max-w-[380px] items-center justify-between text-2xs tracking-[0.06em] text-muted uppercase">
        <span>Tonight</span>
        <span className="tabular-nums">{DECK.length - (index % DECK.length)} due</span>
      </div>

      <div className="relative mx-auto mt-3 h-[272px] max-w-[380px]">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 26, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -22, scale: 0.96 }}
            transition={still ? { duration: 0 } : SPRING}
            className="absolute inset-0 flex flex-col bg-plate p-6 text-center edge"
            style={{ borderRadius: 14 }}
          >
            <p className="text-2xs tracking-[0.07em] text-amber-text uppercase">{card.label}</p>
            <motion.p
              className="mt-2 text-3xl font-medium tracking-[-0.03em] text-text"
              animate={{ scale: revealed ? 1 : 1.06 }}
              transition={still ? { duration: 0 } : SPRING}
            >
              {card.term}
            </motion.p>

            <div className="flex-1">
              <AnimatePresence initial={false} mode="wait">
                {revealed ? (
                  <motion.div
                    key="answer"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={still ? { duration: 0 } : { duration: 0.44 }}
                    className="mt-3 border-t border-edge pt-3"
                  >
                    <p className="text-lg text-text-2">{card.meaning}</p>
                    {card.example && (
                      <p className="mt-2 text-xs text-muted italic">{card.example}</p>
                    )}
                  </motion.div>
                ) : (
                  <motion.button
                    key="reveal"
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={still ? { duration: 0 } : { duration: 0.2 }}
                    onClick={() => setRevealedFor(index)}
                    className="mt-5 w-full rounded-sm border border-edge-2 border-dashed py-2.5 text-sm text-muted transition-colors hoverable:hover:border-amber hoverable:hover:text-text-2"
                  >
                    Show the meaning
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-4 flex gap-1.5">
              {GRADES.map((g, n) => (
                <motion.button
                  key={g.name}
                  type="button"
                  onClick={() => answer(n)}
                  disabled={!revealed || answered !== null}
                  animate={{ opacity: revealed ? 1 : 0.3, scale: answered === n ? 1.05 : 1 }}
                  transition={still ? { duration: 0 } : { duration: 0.22 }}
                  className={clsx(
                    "flex flex-1 flex-col items-center gap-0.5 py-2 edge disabled:cursor-default",
                    answered === n ? "bg-amber-soft" : "bg-plate-2 hoverable:hover:bg-hover",
                  )}
                  style={{ borderRadius: 10 }}
                >
                  <span
                    className={clsx(
                      "text-sm font-medium",
                      answered === n ? "text-amber-text" : "text-text",
                    )}
                  >
                    {g.name}
                  </span>
                  <span className="text-2xs tabular-nums text-muted">{g.when}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {chosen ? (
          <>
            <span className="text-amber-text">{chosen.name}</span>. Back in {chosen.said}.
          </>
        ) : revealed ? (
          "Choose a grade to move to the next card."
        ) : (
          "Reveal the meaning, then grade the recall."
        )}
      </p>
    </div>
  );
}
