import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Pause, Play } from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { clipUrl, timingUrl } from "../../lib/learn/clips";
import {
  glossPieces,
  type SentenceBars,
  sentenceAt,
  sentenceBars,
  type Timing,
} from "../../lib/learn/passage";
import {
  loudness,
  playSound,
  type SoundEnd,
  setSoundRate,
  stopSound,
  usePlaying,
} from "../../lib/learn/player";
import { useLesson } from "./lesson-context";
import { Word } from "./Word";

const timings = new Map<string, Promise<Timing>>();

function loadTiming(url: string): Promise<Timing> {
  let pending = timings.get(url);
  if (!pending) {
    pending = fetch(url).then((response) => {
      if (!response.ok) throw new Error(`${url} answered ${response.status}`);
      return response.json() as Promise<Timing>;
    });
    pending.catch(() => timings.delete(url));
    timings.set(url, pending);
  }
  return pending;
}

export const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export function usePassage(clip: string, sentences = 1) {
  const { slug } = useLesson();
  const src = clipUrl(slug, clip);
  const key = `passage:${slug}:${clip}`;
  const [loaded, setLoaded] = useState<Timing | null>(null);
  const [t, setT] = useState(0);
  const [heard, setHeard] = useState(false);
  const [rate, setRate] = useState(1);
  const playing = usePlaying(key);
  useEffect(() => {
    let live = true;
    loadTiming(timingUrl(slug, clip))
      .then((timing) => live && setLoaded(timing))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [slug, clip]);
  const playingNow = useRef(false);
  playingNow.current = playing;
  useEffect(
    () => () => {
      if (playingNow.current) stopSound();
    },
    [],
  );
  const timing = useMemo(
    () => loaded ?? { marks: Array.from({ length: sentences }, (_, i) => i), duration: sentences },
    [loaded, sentences],
  );
  const { marks, duration } = timing;
  const current = sentenceAt(marks, t);
  const play = async (from: number): Promise<{ end: SoundEnd; at: number }> => {
    setHeard(true);
    let at = from;
    const onFrame = (seconds: number) => {
      at = seconds;
      setT(seconds);
    };
    const end = await playSound(src, key, onFrame, from, rate);
    setT((now) => (now >= duration - 0.4 ? duration : now));
    return { end, at };
  };
  return {
    src,
    timing,
    loaded: loaded !== null,
    t,
    playing,
    heard,
    rate,
    play,
    toggle() {
      if (playing) return stopSound();
      void play(t >= duration - 0.4 ? 0 : t);
    },
    next() {
      void play(marks[Math.min(marks.length - 1, current + 1)] ?? 0);
    },
    previous() {
      const into = t - (marks[current] ?? 0);
      void play(marks[into > 1 ? current : Math.max(0, current - 1)] ?? 0);
    },
    setRate(next: number) {
      setRate(next);
      setSoundRate(key, next);
    },
    current,
    now: playing ? current : -1,
  };
}

export type PassageControl = ReturnType<typeof usePassage>;

export function onSentenceKey(event: KeyboardEvent, passage: PassageControl) {
  if (event.key === "ArrowRight") passage.next();
  else if (event.key === "ArrowLeft") passage.previous();
  else if (event.key === " " || event.key === "Enter") passage.toggle();
  else return;
  event.preventDefault();
}

export function PlayPause({ passage }: { passage: PassageControl }) {
  const { t } = useLingui();
  return (
    <button
      type="button"
      aria-label={passage.playing ? t`Pause` : t`Play`}
      onClick={passage.toggle}
      className={clsx(
        "grid size-12 shrink-0 cursor-pointer place-items-center rounded-full bg-(--form) text-plate transition-[scale,box-shadow] duration-150 active:scale-[0.95]",
        passage.playing && "shadow-[0_0_0_5px_var(--form-faint)]",
      )}
    >
      {passage.playing ? (
        <Pause aria-hidden="true" className="size-5 fill-current" />
      ) : (
        <Play aria-hidden="true" className="ms-0.5 size-5 fill-current" />
      )}
    </button>
  );
}

export function PassagePlayer({ passage, label }: { passage: PassageControl; label: string }) {
  const { t } = useLingui();
  const { marks, duration } = passage.timing;
  const strip = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [groups, setGroups] = useState<SentenceBars[] | null>(null);
  useEffect(() => {
    const element = strip.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(Math.round(element.clientWidth / 8) * 8));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!passage.loaded || width === 0) return;
    let live = true;
    loudness(passage.src)
      .then((sound) => live && setGroups(sentenceBars(sound, passage.timing, width)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [passage.loaded, passage.src, passage.timing, width]);
  const started = passage.t > 0 || passage.playing;
  const shown =
    groups ??
    marks.map((start, i) => ({ start, end: marks[i + 1] ?? duration, bars: [] as number[] }));
  const sentenceNumber = passage.current + 1;
  const sentenceCount = marks.length;
  const time = clock(passage.t);
  return (
    <div className="flex w-full max-w-xl items-center gap-4">
      <PlayPause passage={passage} />
      <div className="grid min-w-0 flex-1 gap-1">
        <div
          ref={strip}
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={1}
          aria-valuemax={sentenceCount}
          aria-valuenow={sentenceNumber}
          aria-valuetext={t`Sentence ${sentenceNumber} of ${sentenceCount}, ${time}`}
          onKeyDown={(event) => onSentenceKey(event, passage)}
          className="relative flex h-10 gap-1.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-edge-strong"
          />
          {shown.map((group, i) => (
            <SentenceGroup
              // oxlint-disable-next-line react/no-array-index-key -- one group per sentence, in order
              key={i}
              group={group}
              lit={started ? passage.t : -1}
              onPick={() => void passage.play(group.start)}
            />
          ))}
        </div>
        <div className="flex justify-between text-sm text-ink-muted tabular-nums">
          <span>{time}</span>
          <span>{clock(duration)}</span>
        </div>
      </div>
    </div>
  );
}

function SentenceGroup({
  group,
  lit,
  onPick,
}: {
  group: SentenceBars;
  lit: number;
  onPick: () => void;
}) {
  const bars = group.bars.length ? group.bars : Array.from({ length: 8 }, () => 0);
  const span = group.end - group.start;
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      onClick={onPick}
      style={{ flexGrow: span }}
      className="group relative flex min-w-0 basis-0 cursor-pointer items-center justify-between gap-[3px] overflow-hidden rounded-sm"
    >
      {bars.map((level, j) => {
        const at = group.start + ((j + 0.5) / bars.length) * span;
        return (
          <i
            // oxlint-disable-next-line react/no-array-index-key -- a bar's place in the sentence is its identity
            key={j}
            className={clsx(
              "block max-w-[3px] min-w-[2px] flex-1 rounded-full transition-colors duration-100",
              lit >= 0 && at <= lit
                ? "bg-(--form)"
                : "bg-ink-faint hoverable:group-hover:bg-ink-muted",
            )}
            style={{ height: `${Math.round(10 + 60 * Math.sqrt(level))}%` }}
          />
        );
      })}
    </button>
  );
}

export function Sentence({
  text,
  index,
  passage,
  glossed,
  missed,
}: {
  text: string;
  index: number;
  passage?: PassageControl | undefined;
  glossed: boolean;
  missed?: ReadonlySet<number> | undefined;
}) {
  const { glossary } = useLesson();
  const shown = glossed
    ? glossPieces(text, (word) => word in glossary).map((piece, j) =>
        "word" in piece ? (
          <Word
            // oxlint-disable-next-line react/no-array-index-key -- a sentence's pieces never reorder
            key={j}
            w={piece.word}
          />
        ) : (
          piece.text
        ),
      )
    : text;
  return (
    <span>
      <span
        className={clsx(
          "rounded-sm transition-colors duration-200 [box-decoration-break:clone]",
          passage?.now === index && "bg-(--form-soft)",
          missed?.has(index) && "underline decoration-danger decoration-2 underline-offset-[0.3em]",
        )}
      >
        {shown}
      </span>{" "}
    </span>
  );
}

export function PassageText({
  sentences,
  passage,
  glossed,
  missed,
  big,
}: {
  sentences: readonly string[];
  passage?: PassageControl | undefined;
  glossed: boolean;
  missed?: ReadonlySet<number> | undefined;
  big?: boolean;
}) {
  return (
    <p
      lang="et"
      className={clsx(
        "max-w-[46ch] text-ink",
        big ? "text-2xl/[1.7] max-sm:text-xl/[1.7]" : "text-xl/[1.75] max-sm:text-lg/[1.75]",
      )}
    >
      {sentences.map((sentence, i) => (
        <Sentence
          // oxlint-disable-next-line react/no-array-index-key -- a passage's sentences never reorder
          key={i}
          text={sentence}
          index={i}
          passage={passage}
          glossed={glossed}
          missed={missed}
        />
      ))}
    </p>
  );
}
