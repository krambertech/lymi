import type { MessageDescriptor } from "@lingui/core";
import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useEffect, useState } from "react";
import { EASE, useStill } from "./playback";

/** A sentence using a card's word, with the word marked `*like this*` in it and in its meaning. */
export interface Example {
  text: string;
  meaning: MessageDescriptor;
}

interface Props {
  /** The front card's id; its sentences replace the last card's. */
  front: string | undefined;
  examples: Record<string, Example[]>;
  /** The sentences' language. */
  lang: string;
}

/**
 * Places in the bands above and below the stack. Each card starts from a different one, so the
 * sentences move about between cards; a meaning opens away from the stack.
 */
const SPOTS = [
  { at: "top-0 start-0", align: "start", above: true },
  { at: "bottom-0 end-0 text-end", align: "end", above: false },
  { at: "top-[2%] end-0 text-end", align: "end", above: true },
  { at: "bottom-[1%] start-[4%]", align: "start", above: false },
] as const;

/** A stable number per card, so the server and the browser pick the same places. */
function seed(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return h;
}

/** Text with its marked run, the word as the sentence bends it, lit. */
function Marked({ text }: { text: string }) {
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

/**
 * Faint sentences drifting around a hand of cards, each using the word on top; they sharpen as
 * they arrive and blur as they leave. Pointing at one, or tapping it, shows what it means.
 */
export function HandExamples({ front, examples, lang }: Props) {
  const { i18n } = useLingui();
  const still = useStill();
  const [open, setOpen] = useState<string | null>(null);
  const [hover, setHover] = useState(true);
  const lines = (front && examples[front]) || [];
  const start = front ? seed(front) : 0;
  // A page read in the sentences' own language has nothing to translate them into.
  const translated = !i18n.locale.startsWith(lang.split("-")[0] ?? lang);

  useEffect(() => setHover(window.matchMedia("(hover: hover)").matches), []);

  // A tapped meaning closes on the next tap anywhere.
  useEffect(() => {
    if (!open || hover) return;
    const close = () => setOpen(null);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open, hover]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -inset-y-2">
      <AnimatePresence initial={false}>
        {lines.map((line, i) => {
          const spot = SPOTS[(start + i) % SPOTS.length] ?? SPOTS[0];
          const key = `${front}-${line.text}`;
          const shown = open === key;
          return (
            <motion.div
              key={key}
              initial={still ? false : { opacity: 0, filter: "blur(8px)" }}
              animate={{ opacity: shown ? 1 : open ? 0.3 : 0.7, filter: "blur(0px)" }}
              exit={
                still
                  ? { opacity: 0, transition: { duration: 0 } }
                  : { opacity: 0, filter: "blur(6px)" }
              }
              transition={{
                duration: open ? 0.25 : 1.1,
                ease: EASE,
                delay: still || open ? 0 : 0.3 + i * 0.18,
              }}
              className={clsx("absolute max-w-[min(17em,48%)]", spot.at)}
            >
              <div
                className={clsx("hand-drift relative", shown && "[animation-play-state:paused]")}
                style={{ animationDelay: `${-(i * 2.3 + start) % 9}s` }}
              >
                <p
                  lang={lang}
                  onPointerEnter={(e) => translated && e.pointerType === "mouse" && setOpen(key)}
                  onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(null)}
                  // A touch opens it on lifting, so a scroll that starts on a sentence leaves it shut.
                  onPointerDown={(e) => !hover && e.stopPropagation()}
                  onPointerUp={(e) =>
                    translated && e.pointerType !== "mouse" && setOpen(shown ? null : key)
                  }
                  className={clsx(
                    "pointer-events-auto relative cursor-default text-sm leading-relaxed text-balance transition-colors duration-200 ease-out [word-break:auto-phrase] before:absolute before:-inset-2 before:content-[''] @4xl:text-[15px]",
                    shown ? "text-ink-secondary" : "text-ink-faint",
                  )}
                >
                  <Marked text={line.text} />
                </p>
                <AnimatePresence>
                  {shown && (
                    <motion.p
                      initial={still ? false : { opacity: 0, y: spot.above ? 4 : -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, transition: { duration: 0.12 } }}
                      transition={{ duration: 0.2, ease: EASE }}
                      className={clsx(
                        "absolute w-max max-w-[16em] text-sm leading-snug text-balance text-ink-muted",
                        spot.above ? "bottom-full mb-1" : "top-full mt-1",
                        spot.align === "end" ? "end-0" : "start-0",
                      )}
                    >
                      <Marked text={i18n._(line.meaning)} />
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
