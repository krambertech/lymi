import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { AnimatePresence, motion, useInView } from "motion/react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { EASE, useStill } from "./playback";
import { POLISH_FORM_WORDS as FORM_WORDS, type PolishFormWord } from "./polish";

const STEP_MS = 2400;
/** The first change comes soon after the stage is in view, so it never reads as a still picture. */
const FIRST_MS = 700;
/** A visitor's pick holds the word this long before the cycle carries on. */
const HOLD_MS = 8000;

/** Each form's name, with the questions Polish courses teach a noun's cases by. */
const SLOTS = {
  noun: [
    { asks: "kto? co?", name: msg`Nominative` },
    { asks: "kogo? czego?", name: msg`Genitive` },
    { asks: "o kim? o czym?", name: msg`Locative` },
  ],
  verb: [
    { asks: "co robić?", name: msg`Imperfective` },
    { asks: "co zrobić?", name: msg`Perfective` },
    { asks: "ja …", name: msg`Future, “I”` },
  ],
} as const satisfies Record<PolishFormWord["kind"], unknown>;

/** How many letters the forms share at the start; the rest is what changes. */
function sharedStart(forms: readonly string[]): number {
  const [first = "", ...rest] = forms;
  let at = 0;
  while (at < first.length && rest.every((form) => form[at] === first[at])) at += 1;
  return at;
}

/** A word's three forms side by side, the shared start in ink and the part that changes lit. */
export function PolishForms() {
  const { i18n } = useLingui();
  const still = useStill();
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, { amount: 0.3 });
  const [at, setAt] = useState(0);
  const heldUntil = useRef(0);
  const word = FORM_WORDS[at] ?? FORM_WORDS[0];
  const shared = word ? sharedStart(word.forms) : 0;
  const longest = Math.max(4, ...(word?.forms.map((form) => form.length) ?? []));

  useEffect(() => {
    if (still || !inView) return;
    const step = () => {
      if (Date.now() < heldUntil.current) return;
      setAt((i) => (i + 1) % FORM_WORDS.length);
    };
    const first = window.setTimeout(step, FIRST_MS);
    const timer = window.setInterval(step, STEP_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [still, inView]);

  if (!word) return null;

  return (
    <div
      ref={stage}
      className="@container mt-12 rounded-2xl bg-plate-2 px-5 pt-8 pb-7 edge-inset @2xl:px-10 @2xl:pt-12 @4xl:mt-16"
    >
      {/* The cycle is for the eye; a screen reader gets every word and its forms once. */}
      <ul className="sr-only">
        {FORM_WORDS.map((w) => (
          <li key={w.term} lang="pl">
            {w.forms.join(", ")}
          </li>
        ))}
      </ul>

      <ol
        aria-hidden="true"
        // The longest form sets the size, so every form of the word fits its column and keeps one size;
        // the row keeps the height of the largest size, so the stage holds still between words.
        style={{ "--len": longest } as CSSProperties}
        className="grid gap-4 [--h:min(56px,16cqw)] [--k:min(56px,calc(64cqw/var(--len)))] @2xl:grid-cols-3 @2xl:gap-4 @2xl:[--h:min(104px,12cqw)] @2xl:[--k:min(104px,calc(48cqw/var(--len)))]"
      >
        {SLOTS[word.kind].map((slot, i) => {
          const form = word.forms[i] ?? "";
          return (
            <li
              key={slot.asks}
              // A phone puts each form beside its name; a wide screen stands the three side by side.
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-edge not-last:border-b not-last:pb-4 @2xl:grid-cols-1 @2xl:justify-items-center @2xl:gap-1 @2xl:text-center @2xl:not-last:border-e @2xl:not-last:border-b-0 @2xl:not-last:pb-0"
            >
              <span className="grid gap-1">
                <span lang="pl" className="text-md font-medium text-text-2">
                  {slot.asks}
                </span>
                <span className="text-sm text-muted">{i18n._(slot.name)}</span>
              </span>
              <span className="grid h-[calc(var(--h)*1.25)] place-items-center overflow-hidden @2xl:w-full">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={`${word.term}-${form}`}
                    lang="pl"
                    initial={still ? false : { opacity: 0, y: 14, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{
                      opacity: 0,
                      y: -10,
                      filter: "blur(6px)",
                      transition: { duration: still ? 0 : 0.22 },
                    }}
                    transition={{ duration: 0.5, ease: EASE, delay: still ? 0 : 0.08 + i * 0.07 }}
                    className="col-start-1 row-start-1 text-[length:var(--k)] leading-none font-medium tracking-[-0.03em] whitespace-nowrap"
                  >
                    <span className="text-text">{form.slice(0, shared)}</span>
                    <span className="text-amber-mark">{form.slice(shared)}</span>
                  </motion.span>
                </AnimatePresence>
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 text-center text-lg text-text-2">
        <span lang="pl" className="font-medium text-text">
          {word.term}
        </span>{" "}
        · {word.meaning}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-1.5">
        {FORM_WORDS.map((w, i) => (
          <button
            key={w.term}
            type="button"
            lang="pl"
            aria-pressed={i === at}
            onClick={() => {
              heldUntil.current = Date.now() + HOLD_MS;
              setAt(i);
            }}
            className="relative h-9 rounded-full px-3.5 text-md text-muted transition-colors duration-200 hoverable:hover:text-text aria-pressed:text-text"
          >
            {/* One highlight that slides from word to word rather than blinking between them. */}
            {i === at && (
              <motion.span
                layoutId="polish-form-word"
                transition={
                  still ? { duration: 0 } : { type: "spring", duration: 0.45, bounce: 0.15 }
                }
                className="absolute inset-0 rounded-full bg-plate edge"
              />
            )}
            <span className="relative">{w.term}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
