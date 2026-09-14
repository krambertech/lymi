import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Volume2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { KeyboardEvent, ReactNode } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Scene, SceneLine, Token } from "./estonian-scenes";
import { SectionTitle } from "./FeatureSection";

/** Time to read and hear a line before the next one is said. */
const LINE_MS = 1900;
/** How long a finished conversation stays before the next situation begins. */
const SCENE_REST_MS = 4200;

interface WordProps {
  token: Token;
  language: string;
  open: boolean;
  /** Where the meaning sits, so a word at a bubble's edge keeps it on screen. */
  align: "start" | "center" | "end";
  onToggle: () => void;
}

function Word({ token, language, open, align, onToggle }: WordProps) {
  const { i18n } = useLingui();
  const id = useId();
  const tip = useRef<HTMLSpanElement>(null);
  // Nudges the meaning back inside the screen when a word sits at the start or end of a wrapped row.
  const keepOnScreen = () => {
    const el = tip.current;
    if (!el) return;
    el.style.marginInlineStart = "0px";
    const { left, right } = el.getBoundingClientRect();
    const gutter = 8;
    const shift =
      left < gutter ? gutter - left : right > innerWidth - gutter ? innerWidth - gutter - right : 0;
    el.style.marginInlineStart = `${shift}px`;
  };
  if (typeof token === "string") return <span lang={language}>{token}</span>;
  return (
    <span className="group/word relative inline-block">
      {/* Reached by arrow keys from the line's play button, so a line is one tab stop. */}
      <button
        type="button"
        tabIndex={-1}
        data-word=""
        lang={language}
        aria-describedby={id}
        aria-expanded={open}
        onPointerEnter={keepOnScreen}
        onFocus={keepOnScreen}
        onClick={() => {
          keepOnScreen();
          onToggle();
        }}
        className={clsx(
          "cursor-help rounded-xs underline decoration-edge-2 decoration-dotted underline-offset-[5px] transition-colors duration-150 hoverable:hover:bg-amber-soft hoverable:hover:decoration-transparent focus-visible:bg-amber-soft",
          open && "bg-amber-soft decoration-transparent",
        )}
      >
        {token.text}
      </button>
      <span
        ref={tip}
        id={id}
        role="tooltip"
        className={clsx(
          "pointer-events-none absolute bottom-full z-20 mb-2 translate-y-1 rounded-md bg-text px-3.5 py-2 text-base leading-tight font-normal tracking-normal whitespace-nowrap text-canvas opacity-0 transition-[opacity,translate] duration-150 ease-out group-focus-within/word:translate-y-0 group-focus-within/word:opacity-100 @2xl:text-lg hoverable:group-hover/word:translate-y-0 hoverable:group-hover/word:opacity-100",
          align === "start" && "-start-1",
          align === "end" && "-end-1",
          align === "center" && "start-1/2 -translate-x-1/2",
          open && "translate-y-0 opacity-100",
        )}
      >
        {i18n._(token.gloss)}
      </span>
    </span>
  );
}

function Bubble({
  line,
  language,
  index,
  playing,
  onPlay,
}: {
  line: SceneLine;
  language: string;
  index: number;
  playing: boolean;
  onPlay: () => void;
}) {
  const { t, i18n } = useLingui();
  const translationId = useId();
  const self = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const you = line.speaker === "you";
  const glossed = line.tokens.flatMap((token, i) => (typeof token === "string" ? [] : [i]));

  // A tapped word's meaning stays until the visitor taps elsewhere.
  useEffect(() => {
    if (open === null) return;
    const close = (e: PointerEvent) => {
      if (!self.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const move = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") return setOpen(null);
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const stops = [
      ...(self.current?.querySelectorAll<HTMLElement>("[data-word], [data-play]") ?? []),
    ];
    const at = stops.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    e.preventDefault();
    stops[(at + (e.key === "ArrowRight" ? 1 : -1) + stops.length) % stops.length]?.focus();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: arrow keys move between the buttons inside
    <div
      ref={self}
      onKeyDown={move}
      className={clsx("group/line flex flex-col", you ? "items-end" : "items-start")}
    >
      {/* Each bubble drifts on its own slow loop, so the exchange feels spoken rather than stacked. */}
      <div
        className="scene-bubble flex max-w-[92%] items-center gap-2"
        style={{ animationDelay: `${-index * 1.1}s` }}
      >
        <p
          className={clsx(
            "rounded-[22px] px-5 py-3 text-xl leading-snug font-medium tracking-[-0.015em] text-text @2xl:text-2xl",
            you ? "order-2 rounded-ee-md bg-plate-2" : "rounded-es-md bg-plate edge",
          )}
        >
          {line.tokens.map((token, i) => (
            <Word
              // biome-ignore lint/suspicious/noArrayIndexKey: a line's words are fixed, so the index is the identity
              key={i}
              token={token}
              language={language}
              open={open === i}
              align={i === glossed[0] ? "start" : i === glossed.at(-1) ? "end" : "center"}
              onToggle={() => setOpen((current) => (current === i ? null : i))}
            />
          ))}
        </p>
        <button
          type="button"
          data-play=""
          onClick={onPlay}
          aria-label={playing ? t`Replay this line` : t`Hear this line`}
          aria-describedby={translationId}
          className={clsx(
            "relative grid size-9 shrink-0 place-items-center rounded-full transition-[opacity,background-color,color,scale] duration-150 ease-out active:scale-95 hoverable:hover:bg-hover",
            "before:absolute before:-inset-1 before:content-['']",
            playing ? "text-amber-text" : "text-muted hoverable:hover:text-text",
            you && "order-1",
            // A fine pointer finds it on the line; a touch screen, which cannot hover, always shows it.
            "group-focus-within/line:opacity-100 hoverable:opacity-0 hoverable:group-hover/line:opacity-100",
            playing && "opacity-100",
          )}
        >
          <Volume2 aria-hidden="true" className={clsx("size-4", playing && "scene-playing")} />
        </button>
      </div>
      <p
        id={translationId}
        className={clsx(
          "mt-1 px-2 text-sm text-muted opacity-0 transition-opacity duration-200 group-focus-within/line:opacity-100 hoverable:group-hover/line:opacity-100",
          open !== null && "opacity-100",
        )}
      >
        {i18n._(line.translation)}
      </p>
    </div>
  );
}

interface Props {
  title: ReactNode;
  body: ReactNode;
  scenes: Scene[];
  /** BCP 47 tag of the conversations. */
  language: string;
}

/**
 * Everyday conversations as floating lines. The situations sit beside them; each one plays out
 * once it is on screen, every line can be heard, and every word shows its meaning.
 */
export function ConversationScenes({ title, body, scenes, language }: Props) {
  const { t, i18n } = useLingui();
  const still = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [sceneId, setSceneId] = useState(scenes[0]?.id);
  const scene = scenes.find((s) => s.id === sceneId) ?? (scenes[0] as Scene);
  const [shown, setShown] = useState({ id: scene.id, run: 0, count: 0 });
  const [seen, setSeen] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [held, setHeld] = useState(false);
  const count = still ? scene.lines.length : shown.id === scene.id ? shown.count : 0;
  const saying = seen && count < scene.lines.length;
  const done = count >= scene.lines.length;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const hold = () => setHeld(true);
    const release = () => setHeld(false);
    el.addEventListener("pointerenter", hold);
    el.addEventListener("pointerleave", release);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setSeen(true);
      },
      // Starts once the section's top is a third of the way up the screen, however tall it is.
      { rootMargin: "0px 0px -33% 0px" },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      el.removeEventListener("pointerenter", hold);
      el.removeEventListener("pointerleave", release);
    };
  }, []);

  useEffect(() => {
    if (!saying || still) return;
    const next = window.setTimeout(
      () => setShown((s) => ({ ...s, count: (s.id === scene.id ? s.count : 0) + 1 })),
      count === 0 ? 450 : LINE_MS,
    );
    return () => window.clearTimeout(next);
  }, [saying, still, count, scene.id]);

  // A finished conversation rests, then the next situation plays, unless the visitor is reading or listening.
  useEffect(() => {
    if (!done || still || held || playing || !seen) return;
    const upcoming = scenes[(scenes.indexOf(scene) + 1) % scenes.length] as Scene;
    const rest = window.setTimeout(() => {
      setSceneId(upcoming.id);
      setShown((s) => ({ id: upcoming.id, run: s.run + 1, count: 0 }));
    }, SCENE_REST_MS);
    return () => window.clearTimeout(rest);
  }, [done, still, held, playing, seen, scene, scenes]);

  useEffect(() => () => audio.current?.pause(), []);

  const play = useCallback((id: string) => {
    audio.current?.pause();
    const clip = new Audio(`/audio/hand/${id}.mp3`);
    audio.current = clip;
    setPlaying(id);
    const stop = () => setPlaying((current) => (current === id ? null : current));
    clip.addEventListener("ended", stop);
    clip.addEventListener("error", stop);
    clip.play().catch(stop);
  }, []);

  const choose = (id: string) => {
    audio.current?.pause();
    setPlaying(null);
    setSceneId(id);
    setShown((s) => ({ id, run: s.run + 1, count: 0 }));
    setSeen(true);
  };

  return (
    <section
      ref={root}
      className="overflow-x-clip border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28"
    >
      <div className="mx-auto grid max-w-[1040px] items-center gap-12 @4xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] @4xl:gap-20">
        <div className="max-w-[420px]">
          <SectionTitle>{title}</SectionTitle>
          <p className="mt-5 text-md text-pretty text-text-2">{body}</p>
          <fieldset className="m-0 mt-9 flex min-w-0 flex-col gap-1 border-0 p-0">
            <legend className="sr-only">{t`Conversation`}</legend>
            {scenes.map((s) => {
              const active = s.id === scene.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => choose(s.id)}
                  className="group/scene grid grid-cols-[12px_minmax(0,1fr)] items-baseline gap-3 rounded-md py-2 text-start"
                >
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "size-2 translate-y-[-1px] rounded-full transition-colors duration-150",
                      active ? "bg-text" : "bg-edge-2 hoverable:group-hover/scene:bg-muted",
                    )}
                  />
                  <span>
                    <span
                      className={clsx(
                        "block text-lg font-medium tracking-[-0.015em] transition-colors duration-150",
                        active ? "text-text" : "text-muted hoverable:group-hover/scene:text-text-2",
                      )}
                    >
                      {i18n._(s.title)}
                    </span>
                    <span className="block text-sm text-muted">{i18n._(s.detail)}</span>
                  </span>
                </button>
              );
            })}
          </fieldset>
        </div>

        {/* Every situation is laid out in the same cell, so the block is as tall as the longest one and never jumps. */}
        <div className="grid">
          {scenes
            .filter((s) => s.id !== scene.id)
            .map((s) => (
              <ol
                key={s.id}
                aria-hidden="true"
                className="invisible col-start-1 row-start-1 m-0 flex list-none flex-col gap-2 p-0"
              >
                {s.lines.map((line, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: lines are said in order and never reorder
                  <li key={i}>
                    <Bubble
                      line={line}
                      language={language}
                      index={i}
                      playing={false}
                      onPlay={() => {}}
                    />
                  </li>
                ))}
              </ol>
            ))}
          <ol className="col-start-1 row-start-1 m-0 flex list-none flex-col gap-2 p-0">
            {scene.lines.map((line, i) => {
              const said = i < count;
              return (
                <motion.li
                  // biome-ignore lint/suspicious/noArrayIndexKey: lines are said in order and never reorder
                  key={`${scene.id}-${shown.run}-${i}`}
                  className={clsx(!said && "invisible")}
                  aria-hidden={!said || undefined}
                  initial={false}
                  animate={
                    said
                      ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
                      : still
                        ? { opacity: 0 }
                        : { opacity: 0, y: 24, scale: 0.94, filter: "blur(8px)" }
                  }
                  transition={
                    still ? { duration: 0 } : { type: "spring", duration: 0.7, bounce: 0.18 }
                  }
                  style={{
                    transformOrigin: line.speaker === "you" ? "right bottom" : "left bottom",
                  }}
                >
                  <Bubble
                    line={line}
                    language={language}
                    index={i}
                    playing={playing === line.audio}
                    onPlay={() => play(line.audio)}
                  />
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
