import { useLingui } from "@lingui/react/macro";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { HI_WORDS } from "./japanese";
import { EASE, useStill } from "./playback";

const STEP_MS = 1700;
/** The first change comes soon after the stage is in view, so it never reads as a still picture. */
const FIRST_MS = 500;
/** A visitor's pick holds the word this long before the cycle carries on. */
const HOLD_MS = 8000;

/** One kanji with its reading over it, as furigana sits. */
function Glyph({ kanji, reading }: { kanji: string; reading: string }) {
  return (
    <span className="grid justify-items-center">
      <span className="min-h-[1.3em] text-[length:calc(var(--k)*0.26)] leading-[1.3] tracking-[0.04em] whitespace-nowrap text-ink-secondary">
        {reading || " "}
      </span>
      <span className="text-[length:var(--k)] leading-[1.05] text-ink">{kanji}</span>
    </span>
  );
}

/** 日 stays where it is while the word forms around it and the reading over it changes. */
export function KanjiReadings() {
  const { i18n } = useLingui();
  const still = useStill();
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, { amount: 0.25 });
  const [at, setAt] = useState(0);
  const heldUntil = useRef(0);
  const word = HI_WORDS[at] ?? HI_WORDS[0];

  useEffect(() => {
    if (still || !inView) return;
    const step = () => {
      if (Date.now() < heldUntil.current) return;
      setAt((i) => (i + 1) % HI_WORDS.length);
    };
    const first = window.setTimeout(step, FIRST_MS);
    const timer = window.setInterval(step, STEP_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [still, inView]);

  const enter = still ? false : { opacity: 0, filter: "blur(6px)" };
  const side = (runs: [string, string][], from: number) => (
    <AnimatePresence mode="popLayout" initial={false}>
      {runs.map(([kanji, reading], i) => (
        <motion.span
          // biome-ignore lint/suspicious/noArrayIndexKey: a word's runs never reorder
          key={`${word.word}-${i}`}
          initial={enter === false ? false : { ...enter, x: from }}
          animate={{ opacity: 1, filter: "blur(0px)", x: 0 }}
          exit={{
            opacity: 0,
            filter: "blur(6px)",
            x: from,
            transition: { duration: still ? 0 : 0.25 },
          }}
          transition={{ duration: 0.5, ease: EASE, delay: still ? 0 : 0.12 }}
        >
          <Glyph kanji={kanji} reading={reading} />
        </motion.span>
      ))}
    </AnimatePresence>
  );

  return (
    <div
      ref={stage}
      className="mt-12 rounded-2xl bg-plate-nested px-3 pt-10 pb-7 edge-inset @2xl:px-10 @2xl:pt-14 @4xl:mt-16"
    >
      <p
        lang="ja"
        className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end font-medium [--k:clamp(76px,15cqw,196px)]"
      >
        {/* The cycle is for the eye; a screen reader gets every word and its reading once. */}
        <span className="sr-only">
          {HI_WORDS.map((w) => `${w.word} (${w.reading})`).join(", ")}
        </span>
        <span aria-hidden="true" className="flex min-w-0 justify-end">
          {side(word.before, 24)}
        </span>
        <span aria-hidden="true" className="relative grid justify-items-center">
          <span className="grid min-h-[1.3em] text-[length:calc(var(--k)*0.26)] leading-[1.3]">
            <AnimatePresence initial={false}>
              <motion.span
                key={word.word}
                initial={still ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, transition: { duration: still ? 0 : 0.2 } }}
                transition={{ duration: 0.45, ease: EASE }}
                // A whole-word reading centres over both kanji, so it sits half a kanji back.
                style={word.whole ? { translate: "calc(var(--k) * -0.5) 0" } : undefined}
                className="col-start-1 row-start-1 justify-self-center font-medium tracking-[0.04em] whitespace-nowrap text-amber-text"
              >
                {word.reading}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="text-[length:var(--k)] leading-[1.05] text-amber-mark">日</span>
        </span>
        <span aria-hidden="true" className="flex min-w-0 justify-start">
          {side(word.after, -24)}
        </span>
      </p>

      <p className="mt-5 text-center text-lg text-ink-secondary tabular-nums">
        <span lang="ja" className="font-medium text-amber-text">
          {word.reading}
        </span>{" "}
        · {i18n._(word.meaning)}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-1.5">
        {HI_WORDS.map((w, i) => (
          <button
            key={w.word}
            type="button"
            lang="ja"
            aria-pressed={i === at}
            onClick={() => {
              heldUntil.current = Date.now() + HOLD_MS;
              setAt(i);
            }}
            className="relative h-9 rounded-full px-3.5 text-md text-ink-muted transition-colors duration-200 hoverable:hover:text-ink aria-pressed:text-ink"
          >
            {/* One highlight that slides from word to word rather than blinking between them. */}
            {i === at && (
              <motion.span
                layoutId="kanji-word"
                transition={
                  still ? { duration: 0 } : { type: "spring", duration: 0.45, bounce: 0.15 }
                }
                className="absolute inset-0 rounded-full bg-plate edge"
              />
            )}
            <span className="relative">{w.word}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
