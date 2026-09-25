import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Camera, Check, Copy, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "../Button";
import type { LearningLanguage, NoteLine } from "./language-cards";

/** One line read per beat, slow enough to follow the box down the page. */
const READ_MS = 650;
/** The frame closes in and the flash fires before the reading starts. */
const SHUTTER_MS = 560;
const IDLE = -2;
const SHOOTING = -1;
const EASE = [0.22, 1, 0.36, 1] as const;

function SourceTag({ ai }: { ai: boolean }) {
  return (
    <span
      className={clsx(
        "shrink-0 rounded-xs px-1.5 py-px text-[0.5625rem] tracking-[0.06em] uppercase",
        ai ? "bg-amber-soft text-amber-text" : "bg-plate-2 text-muted",
      )}
    >
      {ai ? <Trans>AI</Trans> : <Trans>Notes</Trans>}
    </span>
  );
}

function Row({ line, language }: { line: NoteLine; language: LearningLanguage }) {
  const { i18n } = useLingui();
  const meaning = line.gloss ?? line.meaning;

  if (line.duplicate) {
    return (
      <div className="flex items-start gap-3 py-3">
        <Copy aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <p lang={language.tag} className="truncate text-md font-medium text-muted">
            {line.term}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            <Trans>Already in your deck, so it’s skipped</Trans>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 py-3">
      <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-good" />
      <div className="min-w-0 flex-1">
        <p lang={language.tag} className="truncate text-md font-medium text-text">
          {line.term}
        </p>
        {meaning && (
          <p className="mt-0.5 flex items-center gap-2 text-sm text-text-2">
            <span className="truncate">{i18n._(meaning)}</span>
            <SourceTag ai={!line.gloss} />
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * A page of lesson notes a visitor photographs, then watches read line by line into cards. The
 * assistant does the reading; the learner's own glosses stay marked as notes, and what the
 * assistant writes is marked AI.
 */
export function NotesToCards({ notebooks }: { notebooks: LearningLanguage[] }) {
  const { t, i18n } = useLingui();
  const still = useReducedMotion();
  const [chosen, setChosen] = useState(notebooks[0]?.id);
  const language = notebooks.find((n) => n.id === chosen) ?? (notebooks[0] as LearningLanguage);
  const lines = language.notes.lines;
  // Keyed by notebook, so switching notebook puts the page back to unread without an effect.
  const [progress, setProgress] = useState({ id: language.id, read: IDLE });
  const read = progress.id === language.id ? progress.read : IDLE;
  const shooting = read === SHOOTING;
  const reading = read >= 0 && read < lines.length;
  const done = read >= lines.length;

  useEffect(() => {
    if (!shooting) return;
    const develop = window.setTimeout(() => setProgress((p) => ({ ...p, read: 0 })), SHUTTER_MS);
    return () => window.clearTimeout(develop);
  }, [shooting]);

  useEffect(() => {
    if (!reading) return;
    const tick = window.setInterval(
      () => setProgress((p) => ({ ...p, read: p.read + 1 })),
      READ_MS,
    );
    return () => window.clearInterval(tick);
  }, [reading]);

  const shoot = () => setProgress({ id: language.id, read: still ? lines.length : SHOOTING });
  const added = lines.filter((l) => !l.duplicate).length;

  return (
    <div className="flex flex-col gap-8">
      {notebooks.length > 1 && (
        <fieldset className="m-0 flex min-w-0 flex-wrap justify-center gap-1.5 border-0 p-0">
          <legend className="sr-only">{t`Whose notes`}</legend>
          {notebooks.map((n) => (
            <button
              key={n.id}
              type="button"
              aria-pressed={n.id === language.id}
              onClick={() => setChosen(n.id)}
              className={clsx(
                "h-9 rounded-full px-3.5 text-sm transition-colors duration-150",
                n.id === language.id
                  ? "bg-text font-medium text-canvas"
                  : "bg-plate text-text-2 edge hoverable:hover:bg-hover hoverable:hover:text-text",
              )}
            >
              {i18n._(n.name)}
            </button>
          ))}
        </fieldset>
      )}

      <div className="grid items-start gap-10 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @4xl:gap-12">
        <div className="group/photo relative mx-auto w-full max-w-[460px] pb-10">
          <motion.figure
            className="relative m-0 p-3.5"
            animate={shooting && !still ? { scale: [1, 0.965, 1] } : { scale: 1 }}
            transition={{ duration: SHUTTER_MS / 1000, ease: EASE }}
          >
            {/* Viewfinder corners, so the page reads as a photo being taken rather than a panel. */}
            {[
              "top-0 start-0 border-s-2 border-t-2 rounded-ss-md",
              "top-0 end-0 border-e-2 border-t-2 rounded-se-md",
              "bottom-0 start-0 border-s-2 border-b-2 rounded-es-md",
              "bottom-0 end-0 border-e-2 border-b-2 rounded-ee-md",
            ].map((corner) => (
              <span
                key={corner}
                aria-hidden="true"
                className={clsx(
                  "absolute size-6 border-text/70 transition-[margin] duration-300 ease-out",
                  read === IDLE && "hoverable:group-hover/photo:m-1.5",
                  corner,
                )}
              />
            ))}
            <div className="notes-hand relative -rotate-[1.2deg] overflow-hidden rounded-md bg-plate px-7 pt-6 pb-9 edge">
              <p lang={language.tag} className="text-2xl text-muted">
                {language.notes.heading}
              </p>
              <ul className="mt-4 flex flex-col gap-3.5">
                {lines.map((line, i) => {
                  const seen = read > i || done;
                  const current = read === i;
                  return (
                    <li key={`${language.id}-${line.term}`} className="relative">
                      <span
                        aria-hidden="true"
                        className={clsx(
                          "absolute -inset-x-2 -inset-y-0.5 rounded-sm border transition-[border-color,background-color] duration-300",
                          current
                            ? "border-text/50 bg-text/5"
                            : seen
                              ? "border-edge-2"
                              : "border-transparent",
                        )}
                      />
                      <span className="relative flex flex-wrap items-baseline gap-x-2 text-[1.625rem] leading-tight text-text @2xl:text-[2rem]">
                        <span lang={language.tag}>{line.term}</span>
                        {line.gloss && <span className="text-text-2">= {i18n._(line.gloss)}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <AnimatePresence>
                {shooting && !still && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 bg-plate"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0, 0.95, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: SHUTTER_MS / 1000, times: [0, 0.45, 0.55, 1] }}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.figure>

          {read === IDLE && (
            // The whole page takes the photo for a pointer; the round button is the keyboard way in.
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={shoot}
              className="absolute inset-x-0 top-0 bottom-10 cursor-pointer"
            />
          )}

          <div className="absolute inset-x-0 bottom-0 flex justify-center">
            {done ? (
              <Button variant="ghost" size="sm" onClick={shoot}>
                <RotateCcw data-icon="inline-start" aria-hidden="true" />
                <Trans>Take it again</Trans>
              </Button>
            ) : (
              <button
                type="button"
                onClick={shoot}
                aria-disabled={read !== IDLE || undefined}
                className="flex translate-y-2 flex-col items-center gap-2 rounded-full aria-disabled:cursor-default"
              >
                <span
                  className={clsx(
                    "grid size-16 place-items-center rounded-full bg-text text-canvas ring-4 ring-canvas transition-[scale,opacity] duration-200 ease-out",
                    read === IDLE
                      ? "hoverable:group-hover/photo:scale-110 active:scale-95"
                      : "scale-90 opacity-60",
                  )}
                >
                  <Camera aria-hidden="true" className="size-7" />
                </span>
                <span className="text-sm font-medium text-text">
                  {read === IDLE ? <Trans>Take a photo</Trans> : <Trans>Reading your notes…</Trans>}
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-xl bg-plate p-5 edge @2xl:p-6">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-lg font-medium tracking-[-0.02em] text-text">
              {i18n._(language.name)}
            </p>
            <p className="text-xs text-muted tabular-nums" aria-live="polite">
              {done ? (
                <Plural value={added} one="# card added" other="# cards added" />
              ) : (
                t`Waiting for your notes`
              )}
            </p>
          </div>

          <div className="mt-3 divide-y divide-edge border-t border-edge @4xl:min-h-[268px]">
            <AnimatePresence initial={false}>
              {lines.map((line, i) =>
                read > i || done ? (
                  <motion.div
                    key={`${language.id}-${line.term}`}
                    initial={still ? false : { opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    <Row line={line} language={language} />
                  </motion.div>
                ) : null,
              )}
            </AnimatePresence>
            {read < 0 && (
              <p className="py-10 text-center text-sm text-muted">
                <Trans>The cards from this page will land here.</Trans>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
