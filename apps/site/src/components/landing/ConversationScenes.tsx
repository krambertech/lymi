import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Languages, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../Button";
import type { Scene, SceneLine, Token } from "./estonian-scenes";

/** Time to read a line before the next one is said. */
const LINE_MS = 1800;
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

function Line({
  line,
  language,
  translated,
}: {
  line: SceneLine;
  language: string;
  translated: boolean;
}) {
  const { i18n } = useLingui();
  return (
    <div className="grid grid-cols-[44px_minmax(0,1fr)] items-start gap-4 @2xl:grid-cols-[132px_minmax(0,1fr)] @2xl:gap-8">
      {/* As tall as the line's first row, so the speaker centres on it at any type size. */}
      <p className="flex h-[1.15em] items-center gap-2.5 text-2xl @2xl:text-4xl">
        {line.speaker === "you" ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-soft text-2xs font-medium text-amber-text">
            <Trans>You</Trans>
          </span>
        ) : (
          <>
            <img
              src={`/avatars/${line.speaker.avatar}.svg`}
              alt=""
              width={32}
              height={32}
              className="size-8 shrink-0 rounded-full"
            />
            <span className="hidden text-sm text-muted @2xl:inline">{line.speaker.name}</span>
          </>
        )}
      </p>
      <div className="min-w-0">
        <p className="text-2xl leading-[1.15] font-medium tracking-[-0.025em] text-pretty text-text @2xl:text-4xl">
          {line.tokens.map((token, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a line's words are fixed, so the index is the identity
            <Word key={i} token={token} language={language} />
          ))}
        </p>
        <AnimatePresence initial={false}>
          {translated && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="overflow-hidden pt-2 text-md text-muted"
            >
              {i18n._(line.translation)}
            </motion.p>
          )}
        </AnimatePresence>
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
 * Short conversations that play out line by line once the block is on screen. Every word can be
 * pointed at or tapped for its meaning, and the whole exchange can be translated at once.
 */
export function ConversationScenes({ scenes, language }: Props) {
  const { t, i18n } = useLingui();
  const still = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const [sceneId, setSceneId] = useState(scenes[0]?.id);
  const scene = scenes.find((s) => s.id === sceneId) ?? (scenes[0] as Scene);
  const [shown, setShown] = useState({ id: scene.id, count: 0 });
  const [seen, setSeen] = useState(false);
  const [translated, setTranslated] = useState(false);
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
      // Starts once the top of the scene is a third of the way up the screen, however tall it is.
      { rootMargin: "0px 0px -33% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || still) return;
    const next = window.setTimeout(
      () => setShown((s) => ({ id: scene.id, count: (s.id === scene.id ? s.count : 0) + 1 })),
      count === 0 ? 500 : LINE_MS,
    );
    return () => window.clearTimeout(next);
  }, [playing, still, count, scene.id]);

  const next = scenes[(scenes.indexOf(scene) + 1) % scenes.length] as Scene;
  const nextTitle = i18n._(next.title);

  return (
    <div ref={root} className="mx-auto flex max-w-[860px] flex-col gap-10">
      <fieldset className="m-0 flex min-w-0 flex-wrap justify-center gap-1.5 border-0 p-0">
        <legend className="sr-only">{t`Conversation`}</legend>
        {scenes.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={s.id === scene.id}
            onClick={() => {
              setSceneId(s.id);
              setShown({ id: s.id, count: 0 });
              setSeen(true);
            }}
            className={clsx(
              "h-9 rounded-full px-3.5 text-sm transition-colors duration-150",
              s.id === scene.id
                ? "bg-text font-medium text-canvas"
                : "bg-plate text-text-2 edge hoverable:hover:bg-hover hoverable:hover:text-text",
            )}
          >
            {i18n._(s.title)}
          </button>
        ))}
      </fieldset>

      {/* Every line is laid out from the start so the scene never jumps; lines not yet said stay hidden. */}
      <ol className="m-0 flex list-none flex-col gap-7 p-0 @2xl:gap-9">
        {scene.lines.map((line, i) => {
          const said = i < count;
          const current = i === count - 1 || done;
          return (
            <motion.li
              // biome-ignore lint/suspicious/noArrayIndexKey: lines are said in order and never reorder
              key={`${scene.id}-${i}`}
              className={clsx(
                "transition-opacity duration-300 hoverable:hover:opacity-100",
                !said && "invisible",
              )}
              aria-hidden={!said || undefined}
              initial={false}
              animate={
                said
                  ? { opacity: current ? 1 : 0.4, y: 0, filter: "blur(0px)" }
                  : { opacity: 0, y: still ? 0 : 18, filter: still ? "blur(0px)" : "blur(8px)" }
              }
              transition={{ duration: still ? 0 : 0.6, ease: EASE }}
            >
              <Line line={line} language={language} translated={translated} />
            </motion.li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={translated}
          onClick={() => setTranslated((v) => !v)}
        >
          <Languages aria-hidden="true" />
          {translated ? <Trans>Hide translations</Trans> : <Trans>Show translations</Trans>}
        </Button>
        {done && (
          <>
            <Button variant="ghost" size="sm" onClick={() => setShown({ id: scene.id, count: 0 })}>
              <RotateCcw aria-hidden="true" />
              <Trans>Play again</Trans>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSceneId(next.id);
                setShown({ id: next.id, count: 0 });
              }}
            >
              <Trans>Next: {nextTitle}</Trans>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
