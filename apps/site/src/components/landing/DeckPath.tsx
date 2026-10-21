import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { addUrl } from "../deck/DeckView";
import { Furigana } from "./Furigana";
import type { PathStep } from "./japanese";
import { EASE, useStill } from "./playback";

/** How long each word shows on the step in play. */
const WORD_MS = 1000;
const FIRST_MS = 300;

interface Props {
  /** The steps whose decks are published, with the deck's name and card count in this edition. */
  steps: (PathStep & { name: string; count: number; edition?: string | undefined })[];
  /** The language of the words on the cards. */
  lang: string;
}

/** The beginner decks in order. The light walks the path once, and each step plays a few of its own cards. */
export function DeckPath({ steps, lang }: Props) {
  const { t, i18n } = useLingui();
  const still = useStill();
  const root = useRef<HTMLOListElement>(null);
  const inView = useInView(root, { amount: 0.2 });
  const [beat, setBeat] = useState(0);

  const lengths = steps.map((s) => s.words.length);
  const total = lengths.reduce((a, b) => a + b, 0);
  let left = Math.min(beat, total - 1);
  let active = 0;
  while (active < steps.length - 1 && left >= (lengths[active] ?? 0)) {
    left -= lengths[active] ?? 0;
    active += 1;
  }

  const done = beat >= total - 1;
  const stacked = !steps.some((step) => step.words.some((word) => word.furigana));

  useEffect(() => {
    // Once through the path, then it rests on the last word.
    if (still || !inView || done) return;
    const step = () => setBeat((b) => Math.min(b + 1, total - 1));
    const first = window.setTimeout(step, FIRST_MS);
    const timer = window.setInterval(step, WORD_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [still, inView, done, total]);

  return (
    <ol
      ref={root}
      className="relative mt-12 grid gap-10 @4xl:mt-16 @4xl:grid-cols-3 @4xl:gap-8"
      aria-label={t`Decks to start with, in order`}
    >
      {steps.map((step, i) => {
        const on = i === active;
        const word = step.words[on ? left : 0];
        return (
          <li
            key={step.slug}
            className="relative grid grid-cols-[40px_minmax(0,1fr)] gap-x-4 @4xl:grid-cols-1"
          >
            {/* The path to the next step: down the side on a phone, across on a wide screen. */}
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={clsx(
                  "absolute start-[19px] top-10 h-full w-0.5 rounded-full transition-colors duration-500 @4xl:start-10 @4xl:top-[19px] @4xl:h-0.5 @4xl:w-[calc(100%-40px+32px)]",
                  i < active ? "bg-amber" : "bg-edge-2",
                )}
              />
            )}
            <span
              aria-hidden="true"
              className={clsx(
                "relative z-10 grid size-10 place-items-center rounded-full text-sm font-semibold tabular-nums transition-colors duration-500",
                i <= active ? "bg-amber text-amber-ink" : "bg-canvas text-muted edge-2",
              )}
            >
              {i + 1}
            </span>
            <div className="min-w-0 @4xl:mt-5">
              <h3 className="text-xl font-medium tracking-[-0.02em] text-text">{step.name}</h3>
              <p className="mt-0.5 text-sm text-muted tabular-nums">
                <Plural value={step.count} one="# card" other="# cards" />
              </p>
              <p className="mt-3 max-w-[34ch] text-md text-pretty text-text-2">
                {i18n._(step.about)}
              </p>

              <div
                className={clsx(
                  "mt-5 flex h-[118px] max-w-[260px] flex-col justify-between rounded-lg bg-plate p-4 edge transition-opacity duration-500",
                  !on && "opacity-55",
                )}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {word && (
                    <motion.div
                      key={`${step.slug}-${word.term}`}
                      initial={still ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -6, transition: { duration: still ? 0 : 0.2 } }}
                      transition={{ duration: 0.45, ease: EASE }}
                      className={clsx(
                        "flex h-full",
                        // A reading over the characters needs the height, so such a word sits beside its answer; a Latin phrase sits above it.
                        stacked
                          ? "min-w-0 flex-col items-start justify-end gap-1"
                          : "items-end justify-between gap-3",
                      )}
                    >
                      <span
                        lang={lang}
                        className={clsx(
                          "font-medium text-text",
                          stacked
                            ? "max-w-full truncate leading-tight"
                            : "text-[34px] leading-[1.55]",
                          stacked && (word.term.length > 9 ? "text-[26px]" : "text-[32px]"),
                        )}
                      >
                        {word.furigana ? (
                          <Furigana term={word.term} reading={word.furigana} lang={lang} />
                        ) : (
                          word.term
                        )}
                      </span>
                      <span
                        className={clsx(
                          "max-w-full truncate text-sm text-text-2",
                          !stacked && "mb-2",
                        )}
                      >
                        {typeof word.answer === "string" ? word.answer : i18n._(word.answer)}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <a
                href={addUrl(step.slug, step.edition)}
                className="group mt-4 inline-flex items-center gap-1.5 rounded-xs text-md font-medium text-amber-text"
              >
                <Trans>Add to Lymi</Trans>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 rtl:-scale-x-100"
                />
              </a>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
