import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import type { Scene, SceneLine, Token } from "./estonian-scenes";

/** Time to read a line before the next one is said. */
const LINE_MS = 1700;
const EASE = [0.22, 1, 0.36, 1] as const;

function Word({ token, language }: { token: Token; language: string }) {
  const { i18n } = useLingui();
  const id = useId();
  if (typeof token === "string") return <span lang={language}>{token}</span>;
  return (
    <span className="group/word relative inline-block">
      <button
        type="button"
        lang={language}
        aria-describedby={id}
        className="cursor-help rounded-xs underline decoration-edge-2 decoration-dotted underline-offset-[5px] transition-colors duration-150 hoverable:hover:bg-amber-soft hoverable:hover:decoration-transparent focus-visible:bg-amber-soft"
      >
        {token.text}
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full start-1/2 z-20 mb-2 -translate-x-1/2 translate-y-1 rounded-sm bg-text px-2.5 py-1 text-sm font-normal whitespace-nowrap text-canvas opacity-0 transition-[opacity,translate] duration-150 ease-out group-focus-within/word:translate-y-0 group-focus-within/word:opacity-100 hoverable:group-hover/word:translate-y-0 hoverable:group-hover/word:opacity-100"
      >
        {i18n._(token.gloss)}
      </span>
    </span>
  );
}

function Line({ line, language }: { line: SceneLine; language: string }) {
  const { i18n } = useLingui();
  return (
    <div className="group/line grid grid-cols-[28px_minmax(0,1fr)] items-start gap-3">
      {/* As tall as the line's first row, so the speaker centres on it. */}
      <span className="flex h-[1.3em] items-center text-xl">
        {line.speaker === "you" ? (
          <span className="grid size-7 place-items-center rounded-full bg-amber-soft text-[0.5625rem] font-medium text-amber-text">
            <Trans>You</Trans>
          </span>
        ) : (
          <img
            src={`/avatars/${line.speaker.avatar}.svg`}
            alt={line.speaker.name}
            width={28}
            height={28}
            className="size-7 rounded-full"
          />
        )}
      </span>
      <div className="min-w-0">
        <p className="text-xl leading-[1.3] font-medium tracking-[-0.02em] text-pretty text-text">
          {line.tokens.map((token, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a line's words are fixed, so the index is the identity
            <Word key={i} token={token} language={language} />
          ))}
        </p>
        <p className="mt-0.5 text-sm text-muted opacity-0 transition-opacity duration-200 group-focus-within/line:opacity-100 hoverable:group-hover/line:opacity-100">
          {i18n._(line.translation)}
        </p>
      </div>
    </div>
  );
}

interface Props {
  scenes: Scene[];
  /** BCP 47 tag of the conversations. */
  language: string;
}

/**
 * Short conversations that play out line by line once they are on screen. A word shows its meaning
 * and a line its translation under the pointer or keyboard focus; choosing a scene plays it again.
 */
export function ConversationScenes({ scenes, language }: Props) {
  const { t, i18n } = useLingui();
  const still = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const [sceneId, setSceneId] = useState(scenes[0]?.id);
  const scene = scenes.find((s) => s.id === sceneId) ?? (scenes[0] as Scene);
  const [shown, setShown] = useState({ id: scene.id, run: 0, count: 0 });
  const [seen, setSeen] = useState(false);
  const count = still ? scene.lines.length : shown.id === scene.id ? shown.count : 0;
  const playing = seen && count < scene.lines.length;
  const done = count >= scene.lines.length;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setSeen(true);
      },
      // Starts once the card's top is a third of the way up the screen, however tall it is.
      { rootMargin: "0px 0px -33% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || still) return;
    const next = window.setTimeout(
      () => setShown((s) => ({ ...s, count: (s.id === scene.id ? s.count : 0) + 1 })),
      count === 0 ? 450 : LINE_MS,
    );
    return () => window.clearTimeout(next);
  }, [playing, still, count, scene.id]);

  const play = (id: string) => {
    setSceneId(id);
    setShown((s) => ({ id, run: s.run + 1, count: 0 }));
    setSeen(true);
  };

  return (
    <div ref={root} className="mx-auto w-full max-w-[460px] rounded-xl bg-plate edge">
      <fieldset className="m-0 flex min-w-0 gap-5 border-0 border-b border-edge px-5 pt-4 @2xl:px-6">
        <legend className="sr-only">{t`Conversation`}</legend>
        {scenes.map((s) => {
          const active = s.id === scene.id;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={active}
              onClick={() => play(s.id)}
              className={clsx(
                "-mb-px border-b-2 pb-3 text-sm transition-colors duration-150",
                active
                  ? "border-text font-medium text-text"
                  : "border-transparent text-muted hoverable:hover:text-text",
              )}
            >
              {i18n._(s.title)}
            </button>
          );
        })}
      </fieldset>

      {/* Every line is laid out from the start so the card never changes height. */}
      <ol className="m-0 flex list-none flex-col gap-3 p-5 @2xl:p-6">
        {scene.lines.map((line, i) => {
          const said = i < count;
          const current = i === count - 1 || done;
          return (
            <motion.li
              // biome-ignore lint/suspicious/noArrayIndexKey: lines are said in order and never reorder
              key={`${scene.id}-${shown.run}-${i}`}
              className={clsx(!said && "invisible")}
              aria-hidden={!said || undefined}
              initial={false}
              animate={
                said
                  ? { opacity: current ? 1 : 0.45, y: 0, filter: "blur(0px)" }
                  : { opacity: 0, y: still ? 0 : 10, filter: still ? "blur(0px)" : "blur(6px)" }
              }
              transition={{ duration: still ? 0 : 0.55, ease: EASE }}
            >
              <Line line={line} language={language} />
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
