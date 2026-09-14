import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, Lock } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { EASE, usePlayback } from "./playback";

/** Known share of the active section at each beat; the next section opens at 80. */
const STEPS = [46, 58, 69, 82] as const;
const OPENS_AT = 80;
const BEATS = { step1: 700, step2: 1300, step3: 1900, open: 2400 };

const SECTIONS: { name: MessageDescriptor; cards: number }[] = [
  { name: msg`Greetings`, cards: 24 },
  { name: msg`Numbers and time`, cards: 30 },
  { name: msg`Food and drink`, cards: 28 },
  { name: msg`Getting around`, cards: 32 },
];

/** A deck in sections, as one student sees it: the active one fills up and the next one opens. */
export function SeriesDemo() {
  const { t, i18n } = useLingui();
  const still = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const { at } = usePlayback(BEATS, inView, still);
  const step = at("step3") ? 3 : at("step2") ? 2 : at("step1") ? 1 : 0;
  const known = STEPS[step] as number;
  const opened = at("open");
  const move = { duration: still ? 0 : 0.5, ease: EASE };

  return (
    <div ref={ref} className="mx-auto flex w-full max-w-[440px] flex-col gap-3">
      <div
        role="img"
        aria-label={t`A deck in four sections. Greetings is done, Numbers and time is 82% known, so Food and drink opens next. Getting around stays locked.`}
        className="rounded-2xl bg-plate p-5 edge @2xl:p-6"
      >
        <p className="text-lg font-medium tracking-[-0.02em] text-text">
          <Trans>Estonian A1 · Autumn course</Trans>
        </p>
        <p className="mt-0.5 text-sm text-muted">
          <Plural value={SECTIONS.length} one="# section" other="# sections" />
        </p>

        <ol className="mt-5 flex flex-col gap-2">
          {SECTIONS.map((section, i) => {
            const name = i18n._(section.name);
            const state =
              i === 0 ? "done" : i === 1 ? "active" : i === 2 && opened ? "ready" : "locked";
            return (
              <li
                key={name}
                className={clsx(
                  "rounded-lg px-3.5 py-3 transition-colors duration-500",
                  state === "active" || state === "ready" ? "bg-plate-2" : "",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "grid size-7 shrink-0 place-items-center rounded-full text-xs tabular-nums transition-colors duration-500",
                      state === "done" && "bg-good-soft text-good",
                      state === "active" && "bg-text text-canvas",
                      state === "ready" && "bg-amber-soft text-amber-text",
                      state === "locked" && "text-muted edge-2",
                    )}
                  >
                    {state === "done" ? (
                      <Check className="size-3.5" strokeWidth={2.5} />
                    ) : state === "locked" ? (
                      <Lock className="size-3" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={clsx(
                        "truncate text-md",
                        state === "locked" ? "text-muted" : "font-medium text-text",
                      )}
                    >
                      {name}
                    </p>
                    <p className="text-xs text-muted tabular-nums">
                      {state === "done" && <Trans>All known</Trans>}
                      {state === "active" && <Trans>{known}% known</Trans>}
                      {state === "ready" && <Trans>Ready to start</Trans>}
                      {state === "locked" && (
                        <Plural value={section.cards} one="# card" other="# cards" />
                      )}
                    </p>
                  </div>
                  {state === "ready" && (
                    <motion.span
                      className="shrink-0 rounded-md bg-amber px-3 py-1.5 text-sm font-medium text-amber-ink"
                      initial={still ? false : { opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={move}
                    >
                      <Trans>Start</Trans>
                    </motion.span>
                  )}
                </div>
                {state === "active" && (
                  <div className="relative mt-3 ms-10 h-1.5 rounded-full bg-plate">
                    <div
                      className="h-full rounded-full bg-state-known transition-[width] duration-500 ease-out motion-reduce:transition-none"
                      style={{ width: `${known}%` }}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 h-3.5 w-px bg-text-2"
                      style={{ insetInlineStart: `${OPENS_AT}%` }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted">
        <span aria-hidden="true" className="h-3 w-px bg-text-2" />
        <Trans>The next section opens at 80% known</Trans>
      </p>
    </div>
  );
}
