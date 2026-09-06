import { clsx } from "clsx";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
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

/** The demo plays itself: ask, reveal, answer, next. Touching it takes it off autoplay. */
const BEATS = { reveal: 1800, answer: 1500, next: 1400 } as const;

const SPRING = { type: "spring", duration: 0.5, bounce: 0.2 } as const;

/**
 * One review, played out. It runs on its own so the mechanic is visible without asking for
 * a click, and every control still works, which hands it over to anyone who wants to answer
 * for themselves. The first click stops the autoplay for good, so the demo never fights the
 * reader for the card.
 */
export function ReviewDemo() {
  const box = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  // Nothing plays until it is on screen, so the reader never arrives mid-sentence.
  const seen = useInView(box, { amount: 0.5 });

  const [index, setIndex] = useState(0);
  // Opens revealed: the grades and the meaning are the point, and the loop rewinds to the
  // question on its next pass. A reader who never gets the animation still sees how it works.
  const [revealed, setRevealed] = useState(true);
  const [answered, setAnswered] = useState<number | null>(null);
  const [auto, setAuto] = useState(true);

  const card = DECK[index % DECK.length];
  const chosen = answered === null ? null : GRADES[answered];

  const answer = useCallback((n: number) => {
    setAuto(false);
    setRevealed(true);
    setAnswered(n);
  }, []);

  // One timer walking the loop, reset whenever the state it is waiting on changes.
  useEffect(() => {
    if (!auto || !seen || still) return;
    let t: number;
    if (!revealed) {
      t = window.setTimeout(() => setRevealed(true), BEATS.reveal);
    } else if (answered === null) {
      // Vary the answer, so it does not look like a recording of the same click.
      t = window.setTimeout(() => setAnswered(1 + ((index * 7) % 3)), BEATS.answer);
    } else {
      t = window.setTimeout(() => {
        setIndex((i) => i + 1);
        setRevealed(false);
        setAnswered(null);
      }, BEATS.next);
    }
    return () => window.clearTimeout(t);
  }, [auto, seen, still, revealed, answered, index]);

  // The app grades with 1 to 4 and reveals with Space. The demo answers to the same keys
  // while it has focus, so the shortcut is learned here rather than described later.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " " && !revealed) {
        e.preventDefault();
        setAuto(false);
        setRevealed(true);
        return;
      }
      const n = Number.parseInt(e.key, 10);
      if (revealed && n >= 1 && n <= 4) {
        e.preventDefault();
        answer(n - 1);
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [revealed, answer]);

  if (!card) return null;

  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: the panel takes focus so 1-4 and Space work
    <div ref={box} tabIndex={0} className="rounded-md outline-offset-4">
      <div className="mx-auto flex max-w-[380px] items-center justify-between text-2xs tracking-[0.06em] text-faint uppercase">
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
                    transition={still ? { duration: 0 } : { duration: 0.28 }}
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
                    onClick={() => {
                      setAuto(false);
                      setRevealed(true);
                    }}
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
                  animate={{ opacity: revealed ? 1 : 0.3, scale: answered === n ? 1.05 : 1 }}
                  transition={still ? { duration: 0 } : { duration: 0.22 }}
                  className={clsx(
                    "flex flex-1 flex-col items-center gap-0.5 py-2 edge",
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

      <div className="mx-auto mt-4 flex h-5 max-w-[380px] items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={chosen ? `${index}-${chosen.name}` : `${index}-rest`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={still ? { duration: 0 } : { duration: 0.24 }}
            className="text-center text-xs text-muted"
            aria-live="polite"
          >
            {chosen ? (
              <>
                <span className="text-amber-text">{chosen.name}</span>. Back in {chosen.said}.
              </>
            ) : (
              "Watch it, or answer it yourself."
            )}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
