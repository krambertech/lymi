import type { MessageDescriptor } from "@lingui/core";
import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Volume2 } from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { EASE, useStill } from "./playback";

/** One spelling, and the words its stress makes of it. */
export interface StressPair {
  word: string;
  forms: { marked: string; meaning: MessageDescriptor; audio: string }[];
}

const STEP_MS = 2200;
const FIRST_MS = 600;
const HOLD_MS = 8000;

interface Props {
  pairs: readonly StressPair[];
  lang: string;
}

/** A word stays put while its stress mark moves from one syllable to another, and the meaning follows it. */
export function StressPairs({ pairs, lang }: Props) {
  const { t, i18n } = useLingui();
  const still = useStill();
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, { amount: 0.25 });
  const [pairAt, setPairAt] = useState(0);
  const [formAt, setFormAt] = useState(0);
  const heldUntil = useRef(0);
  const clip = useRef<HTMLAudioElement | null>(null);
  const pair = pairs[pairAt] ?? pairs[0];
  const form = pair?.forms[formAt] ?? pair?.forms[0];

  useEffect(() => {
    if (still || !inView) return;
    const step = () => {
      if (Date.now() < heldUntil.current) return;
      setFormAt((f) => (f + 1) % 2);
    };
    const first = window.setTimeout(step, FIRST_MS);
    const timer = window.setInterval(step, STEP_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [still, inView]);

  if (!pair || !form) return null;

  const play = (at: number) => {
    heldUntil.current = Date.now() + HOLD_MS;
    setFormAt(at);
    clip.current?.pause();
    clip.current = new Audio(pair.forms[at]?.audio);
    void clip.current.play().catch(() => {});
  };

  return (
    <div
      ref={stage}
      className="mt-12 rounded-2xl bg-plate-2 px-3 pt-10 pb-7 edge-inset @2xl:px-10 @2xl:pt-14 @4xl:mt-16"
    >
      <p className="sr-only">
        {pairs
          .flatMap((p) => p.forms.map((f) => `${f.marked}: ${i18n._(f.meaning)}`))
          .join(", ")}
      </p>
      <p
        aria-hidden="true"
        lang={lang}
        className="grid justify-items-center text-[clamp(64px,13cqw,168px)] leading-[1.15] font-medium tracking-[-0.03em] text-text"
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={form.marked}
            initial={still ? false : { opacity: 0, filter: "blur(6px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(6px)", transition: { duration: still ? 0 : 0.2 } }}
            transition={{ duration: 0.45, ease: EASE }}
            className="col-start-1 row-start-1 whitespace-nowrap"
          >
            {form.marked}
          </motion.span>
        </AnimatePresence>
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {pair.forms.map((f, i) => (
          <button
            key={f.marked}
            type="button"
            aria-pressed={i === formAt}
            aria-label={t`Hear ${f.marked}, ${i18n._(f.meaning)}`}
            onClick={() => play(i)}
            className={clsx(
              "inline-flex h-10 items-center gap-2 rounded-full px-4 text-md transition-colors duration-200 edge",
              i === formAt ? "bg-plate text-text" : "text-text-2 hoverable:hover:text-text",
            )}
          >
            <Volume2 aria-hidden="true" className="size-4 text-muted" />
            <span lang={lang} className="font-medium">
              {f.marked}
            </span>
            <span className="text-text-2">{i18n._(f.meaning)}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-1.5">
        {pairs.map((p, i) => (
          <button
            key={p.word}
            type="button"
            lang={lang}
            aria-pressed={i === pairAt}
            onClick={() => {
              heldUntil.current = Date.now() + HOLD_MS;
              setPairAt(i);
              setFormAt(0);
            }}
            className="relative h-9 rounded-full px-3.5 text-md text-muted transition-colors duration-200 hoverable:hover:text-text aria-pressed:text-text"
          >
            {i === pairAt && (
              <motion.span
                layoutId={`${lang}-stress-pair`}
                transition={
                  still ? { duration: 0 } : { type: "spring", duration: 0.45, bounce: 0.15 }
                }
                className="absolute inset-0 rounded-full bg-plate edge"
              />
            )}
            <span className="relative">{p.word}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
