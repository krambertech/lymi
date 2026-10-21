import { useLingui } from "@lingui/react/macro";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { XING_WORDS } from "./chinese";
import { EASE, useStill } from "./playback";

const STEP_MS = 2000;
const FIRST_MS = 500;
const HOLD_MS = 8000;

function Glyph({ zh, py }: { zh: string; py: string }) {
  return (
    <span className="grid justify-items-center">
      <span className="min-h-[1.3em] text-[length:calc(var(--k)*0.24)] leading-[1.3] whitespace-nowrap text-text-2">
        {py}
      </span>
      <span className="text-[length:var(--k)] leading-[1.05] text-text">{zh}</span>
    </span>
  );
}

/** 行 stays put while words form around it, and the pinyin over it switches between háng and xíng. */
export function ChineseReadings() {
  const { i18n } = useLingui();
  const still = useStill();
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, { amount: 0.25 });
  const [at, setAt] = useState(0);
  const heldUntil = useRef(0);
  const word = XING_WORDS[at] ?? XING_WORDS[0];

  useEffect(() => {
    if (still || !inView) return;
    const step = () => {
      if (Date.now() < heldUntil.current) return;
      setAt((i) => (i + 1) % XING_WORDS.length);
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
      {runs.map(([zh, py], i) => (
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
          <Glyph zh={zh} py={py} />
        </motion.span>
      ))}
    </AnimatePresence>
  );

  return (
    <div
      ref={stage}
      className="mt-12 rounded-2xl bg-plate-2 px-3 pt-10 pb-7 edge-inset @2xl:px-10 @2xl:pt-14 @4xl:mt-16"
    >
      <p
        lang="zh-Hans"
        className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end font-medium [--k:clamp(76px,15cqw,184px)]"
      >
        <span className="sr-only">
          {XING_WORDS.map((w) => `${w.word} (${w.pinyin})`).join(", ")}
        </span>
        <span aria-hidden="true" className="flex min-w-0 justify-end">
          {side(word.before, 24)}
        </span>
        <span aria-hidden="true" className="relative grid justify-items-center">
          <span className="grid min-h-[1.3em] text-[length:calc(var(--k)*0.24)] leading-[1.3]">
            <AnimatePresence initial={false}>
              <motion.span
                key={word.word}
                initial={still ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, transition: { duration: still ? 0 : 0.2 } }}
                transition={{ duration: 0.45, ease: EASE }}
                className="col-start-1 row-start-1 justify-self-center font-medium whitespace-nowrap text-amber-text"
              >
                {word.reading}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="text-[length:var(--k)] leading-[1.05] text-amber-mark">行</span>
        </span>
        <span aria-hidden="true" className="flex min-w-0 justify-start">
          {side(word.after, -24)}
        </span>
      </p>

      <p className="mt-5 text-center text-lg text-text-2">
        <span className="font-medium text-amber-text">{word.pinyin}</span> · {i18n._(word.meaning)}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-1.5">
        {XING_WORDS.map((w, i) => (
          <button
            key={w.word}
            type="button"
            lang="zh-Hans"
            aria-pressed={i === at}
            onClick={() => {
              heldUntil.current = Date.now() + HOLD_MS;
              setAt(i);
            }}
            className="relative h-9 rounded-full px-3.5 text-md text-muted transition-colors duration-200 hoverable:hover:text-text aria-pressed:text-text"
          >
            {i === at && (
              <motion.span
                layoutId="zh-word"
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
