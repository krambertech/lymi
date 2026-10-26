import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, Copy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { Pick } from "./MaterialToCards";
import { EASE, usePlayback, useStill } from "./playback";

/** Each scene plays its beats once while `play` is true; reduced motion shows the last beat. */
interface SceneProps {
  play: boolean;
}

function useScene<Beat extends string>(beats: Record<Beat, number>, play: boolean) {
  return usePlayback(beats, play, useStill());
}

const ENTER = {
  initial: { opacity: 0, y: 10, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.45, ease: EASE },
};

function Appear({
  on,
  children,
  className,
}: {
  on: boolean;
  children: ReactNode;
  className?: string;
}) {
  const still = useStill();
  return (
    <AnimatePresence initial={false}>
      {on && (
        <motion.div {...ENTER} initial={still ? false : ENTER.initial} className={className}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The product's mark on a field the AI wrote. */
export function AiChip() {
  return (
    <span className="inline-flex h-5 shrink-0 items-center rounded-xs bg-ai-soft px-1.5 text-2xs font-medium text-ai">
      AI
    </span>
  );
}

function Caret() {
  return (
    <span
      aria-hidden="true"
      className="ms-0.5 h-5 w-0.5 animate-pulse bg-amber motion-reduce:hidden"
    />
  );
}

/* A word: type it, and the rest fills in. */

const WORD = "Feierabend";
const WORD_BEATS = {
  ...Object.fromEntries(Array.from(WORD, (_, i) => [`c${i}`, 250 + i * 85])),
  meaning: 1400,
  example: 1850,
  hint: 2300,
} as Record<string, number>;

function Field({ label, children, on }: { label: ReactNode; children: ReactNode; on: boolean }) {
  return (
    <div className="rounded-lg bg-plate px-3 py-2 edge">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted">{label}</span>
        {on && <AiChip />}
      </div>
      <div
        className={clsx(
          "mt-0.5 min-h-5 text-sm text-pretty text-text transition-[opacity,filter] duration-500",
          on ? "opacity-100" : "opacity-0 blur-[4px]",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function WordScene({ play }: SceneProps) {
  const { at } = useScene(WORD_BEATS, play);
  const typed = Array.from(WORD)
    .filter((_, i) => at(`c${i}`))
    .join("");
  return (
    <div className="grid w-full max-w-[340px] gap-1.5">
      <div className="rounded-lg bg-plate px-3 py-2 edge-2">
        <span className="text-xs text-muted">
          <Trans>Term</Trans>
        </span>
        <p
          lang="de"
          className="mt-0.5 flex h-7 items-center text-xl font-medium tracking-[-0.025em] text-text"
        >
          {typed}
          {!at("meaning") && <Caret />}
        </p>
      </div>
      <Field label={<Trans>Meaning</Trans>} on={at("meaning")}>
        <Trans>The evening after work</Trans>
      </Field>
      <Field label={<Trans>Example</Trans>} on={at("example")}>
        <span lang="de">Nach Feierabend gehe ich joggen.</span>
      </Field>
      <Field label={<Trans>Hint</Trans>} on={at("hint")}>
        <Trans>Feier (party) + Abend (evening): the evening that’s yours.</Trans>
      </Field>
    </div>
  );
}

/* A lesson: a photo of notes becomes cards. */

const NOTES = [
  {
    line: "Osmosis → more solute",
    term: "osmosis",
    meaning: msg`Water moving across a membrane toward more solute`,
  },
  {
    line: "Diffusion: high → low",
    term: "diffusion",
    meaning: msg`Particles spreading from high to low concentration`,
  },
  { line: "Mitochondria = ATP", term: "mitochondria", meaning: null },
  {
    line: "Active transport (ATP!)",
    term: "active transport",
    meaning: msg`Moving molecules against the gradient, using energy`,
  },
];
const LESSON_BEATS = {
  l0: 500,
  c0: 900,
  l1: 1300,
  c1: 1700,
  l2: 2100,
  c2: 2500,
  l3: 2900,
  c3: 3300,
};
const CORNERS = [
  "top-0 start-0 border-s-2 border-t-2 rounded-ss-md",
  "top-0 end-0 border-e-2 border-t-2 rounded-se-md",
  "bottom-0 start-0 border-s-2 border-b-2 rounded-es-md",
  "bottom-0 end-0 border-e-2 border-b-2 rounded-ee-md",
];

/** A ruled page of notes in the camera's frame; `lit(i)` highlights a line once it has been read. */
function NotesPage({ lit }: { lit: (i: number) => boolean }) {
  return (
    <div className="relative -rotate-3 p-3">
      {CORNERS.map((corner) => (
        <span
          key={corner}
          aria-hidden="true"
          className={clsx("absolute size-5 border-amber", corner)}
        />
      ))}
      <div className="w-[212px] rounded-sm bg-plate px-4 pt-3 pb-4 shadow-[0_14px_30px_-12px_oklch(0.3_0.03_60/0.35)] edge">
        <p className="flex justify-between text-xs text-muted">
          <span>
            <Trans>Biology · week 6</Trans>
          </span>
          <span>p. 14</span>
        </p>
        <ul className="mt-2 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_27px,var(--edge)_27px,var(--edge)_28px)]">
          {NOTES.map((note, i) => (
            <li
              key={note.term}
              className="flex h-7 items-end pb-0.5 text-[13px] whitespace-nowrap text-text-2"
            >
              <Pick on={lit(i)}>{note.line}</Pick>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function LessonScene({ play }: SceneProps) {
  const { i18n } = useLingui();
  const { at } = useScene(LESSON_BEATS, play);
  return (
    <div className="grid w-full max-w-[500px] items-center gap-5 @2xl:grid-cols-[auto_minmax(0,1fr)] @2xl:gap-4">
      <div className="justify-self-center">
        <NotesPage lit={(i) => at(`l${i}` as keyof typeof LESSON_BEATS)} />
      </div>
      <div className="grid min-h-[196px] grid-cols-[minmax(0,1fr)] content-start gap-1.5">
        {NOTES.map((note, i) => (
          <Appear key={note.term} on={at(`c${i}` as keyof typeof LESSON_BEATS)}>
            {note.meaning ? (
              <div className="flex items-start gap-2.5 rounded-lg bg-plate px-3 py-2 edge">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-good" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text">{note.term}</p>
                  <p className="truncate text-xs text-text-2">{i18n._(note.meaning)}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-lg bg-plate/60 px-3 py-2 edge">
                <Copy aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-muted">{note.term}</p>
                  <p className="truncate text-xs text-muted">
                    <Trans>Already in Biology</Trans>
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-plate-2 px-2 py-0.5 text-2xs font-medium text-text-2">
                  <Trans>Duplicate</Trans>
                </span>
              </div>
            )}
          </Appear>
        ))}
      </div>
    </div>
  );
}
