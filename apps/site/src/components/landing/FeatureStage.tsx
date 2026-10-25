import type { MessageDescriptor } from "@lingui/core";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { LifeBuoy, type LucideIcon, Volume2 } from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { AiChip } from "./CardScenes";
import { Furigana } from "./Furigana";
import { EASE, usePlayback, useStill } from "./playback";

interface DemoProps {
  play: boolean;
}

export interface StageItem {
  id: string;
  icon: LucideIcon;
  title: MessageDescriptor;
  body: MessageDescriptor;
  /** The tray hue behind the demo, from Explore's shelf colours. */
  hue: number;
  Demo: (props: DemoProps) => ReactNode;
}

/** A segmented control for a choice the demo makes on its own until the visitor makes it. */
function Segments<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly [T, ReactNode][];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-full bg-plate-2 p-1 edge-inset">
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={clsx(
            "h-8 flex-1 rounded-full text-xs transition-colors",
            value === id
              ? "bg-plate font-medium text-text edge"
              : "text-text-2 hoverable:hover:text-text",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* AI follows your lead: what you tell it, or what your cards already show it. */

const LEAD_MS = 3200;

export function LeadDemo({ play }: DemoProps) {
  const still = useStill();
  const [mode, setMode] = useState<"told" | "shown">("told");
  const [picked, setPicked] = useState(false);
  useEffect(() => {
    if (!play || still || picked) return;
    const timer = window.setInterval(
      () => setMode((m) => (m === "told" ? "shown" : "told")),
      LEAD_MS,
    );
    return () => window.clearInterval(timer);
  }, [play, still, picked]);

  const card = (term: string, lang: string, meaning: ReactNode, note: ReactNode) => (
    <div className="rounded-xl bg-plate px-4 py-3 edge">
      <div className="flex items-center justify-between gap-3">
        <p lang={lang} className="text-lg font-medium tracking-[-0.02em] text-text">
          {term}
        </p>
        <AiChip />
      </div>
      <p className="mt-1 text-sm text-text-2">{meaning}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </div>
  );

  return (
    <div className="grid w-full max-w-[340px] gap-3">
      <Segments
        options={[
          ["told", <Trans key="told">Deck instructions</Trans>],
          ["shown", <Trans key="shown">Your own cards</Trans>],
        ]}
        value={mode}
        onChange={(next) => {
          setPicked(true);
          setMode(next);
        }}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={still ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="grid gap-2"
        >
          {mode === "told" ? (
            <>
              <div className="rounded-xl bg-plate-2 px-4 py-3 edge-inset">
                <p className="text-xs text-muted">
                  <Trans>Instructions</Trans>
                </p>
                <p className="mt-1 text-sm text-text">
                  <Trans>Mexican Spanish, informal examples, and the plural in the notes.</Trans>
                </p>
              </div>
              {card(
                "la chamba",
                "es",
                <Trans>Work, a job (informal, Mexico)</Trans>,
                <Trans>Plural: las chambas</Trans>,
              )}
            </>
          ) : (
            <>
              <div className="rounded-xl bg-plate-2 px-4 py-3 edge-inset">
                <p className="text-xs text-muted">
                  <Trans>Cards you wrote</Trans>
                </p>
                <p lang="de" className="mt-1 text-sm text-text">
                  der Bahnhof · die Bahnhöfe
                </p>
                <p lang="de" className="text-sm text-text">
                  die Stadt · die Städte
                </p>
              </div>
              {card(
                "das Gleis",
                "de",
                <Trans>Platform, track</Trans>,
                <span lang="de">die Gleise</span>,
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* Memory tricks: a hint gives a way in, not the answer. 休 is a person leaning on a tree. */

const TRICK_BEATS = { press: 1100, shown: 1350, split: 1700 };

export function TrickDemo({ play }: DemoProps) {
  const { at } = usePlayback(TRICK_BEATS, play, useStill());
  const [opened, setOpened] = useState(false);
  const shown = opened || at("shown");
  return (
    <div className="w-full max-w-[340px] rounded-2xl bg-plate p-5 edge">
      <p lang="ja" className="text-xs text-muted">
        日本語
      </p>
      <p lang="ja" className="mt-4 text-center text-4xl font-medium text-text">
        休む
      </p>
      <div className="mt-6 grid min-h-[120px] place-items-center">
        <AnimatePresence mode="wait" initial={false}>
          {shown ? (
            <motion.div
              key="hint"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="w-full rounded-xl bg-plate-2 px-4 py-3"
            >
              <p
                lang="ja"
                aria-hidden="true"
                className="flex items-center justify-center gap-2.5 text-3xl text-text"
              >
                <span
                  className={clsx(
                    "transition-colors duration-500",
                    (opened || at("split")) && "text-amber-text",
                  )}
                >
                  亻
                </span>
                <span className="text-lg text-muted">+</span>
                <span
                  className={clsx(
                    "transition-colors duration-500",
                    (opened || at("split")) && "text-amber-text",
                  )}
                >
                  木
                </span>
                <span className="text-lg text-muted">=</span>
                <span>休</span>
              </p>
              <p className="mt-2 flex items-start gap-2 text-sm text-pretty text-text-2">
                <LifeBuoy aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-text" />
                <Trans>A person leaning on a tree is taking a rest.</Trans>
              </p>
            </motion.div>
          ) : (
            <motion.button
              key="button"
              type="button"
              exit={{ opacity: 0 }}
              onClick={() => setOpened(true)}
              className={clsx(
                "flex h-10 items-center gap-2 rounded-full bg-plate-2 px-4 text-sm text-text transition-transform hoverable:hover:bg-hover",
                at("press") && "scale-95",
              )}
            >
              <LifeBuoy aria-hidden="true" className="size-4" />
              <Trans>Show hint</Trans>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* Native AI voice: real clips, each drawing its own waveform. */

const CLIPS = [
  { id: "de", lang: "de", term: "Feierabend", clip: "/audio/hand/feierabend.mp3" },
  { id: "ja", lang: "ja", term: "木漏れ日", clip: "/audio/hand/komorebi.mp3" },
  { id: "pt", lang: "pt-PT", term: "saudade", clip: "/audio/hand/saudade.mp3" },
  { id: "ko", lang: "ko", term: "눈치", clip: "/audio/hand/nunchi.mp3" },
];
const BARS = 28;

/** A clip's loudness in even slices, so the waveform is drawn from the recording itself. */
async function peaksOf(url: string): Promise<number[]> {
  const buffer = await fetch(url).then((r) => r.arrayBuffer());
  const context = new AudioContext();
  const data = (await context.decodeAudioData(buffer)).getChannelData(0);
  void context.close();
  const step = Math.floor(data.length / BARS);
  const peaks = Array.from({ length: BARS }, (_, i) => {
    let max = 0;
    for (let j = i * step; j < (i + 1) * step; j += 16) max = Math.max(max, Math.abs(data[j] ?? 0));
    return max;
  });
  const top = Math.max(...peaks) || 1;
  return peaks.map((p) => Math.max(0.1, p / top));
}

export function VoiceDemo({ play }: DemoProps) {
  const { t } = useLingui();
  const [peaks, setPeaks] = useState<Record<string, number[]>>({});
  const [playing, setPlaying] = useState<{ id: string; at: number } | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!play) return;
    for (const c of CLIPS) {
      peaksOf(c.clip)
        .then((p) => setPeaks((all) => ({ ...all, [c.id]: p })))
        .catch(() => {});
    }
  }, [play]);
  useEffect(() => () => audio.current?.pause(), []);

  const start = (id: string, url: string) => {
    audio.current?.pause();
    const clip = new Audio(url);
    audio.current = clip;
    let frame = 0;
    const tick = () => {
      if (audio.current !== clip) return;
      setPlaying({ id, at: clip.duration ? clip.currentTime / clip.duration : 0 });
      frame = requestAnimationFrame(tick);
    };
    const done = () => {
      cancelAnimationFrame(frame);
      if (audio.current === clip) setPlaying(null);
    };
    clip.addEventListener("ended", done);
    clip.addEventListener("error", done);
    clip.play().then(tick, done);
  };

  return (
    <div className="grid w-full max-w-[380px] gap-2">
      {CLIPS.map((c) => {
        const on = playing?.id === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => start(c.id, c.clip)}
            aria-label={t`Hear ${c.term}`}
            className="flex h-14 items-center gap-3 rounded-xl bg-plate ps-2 pe-4 text-start edge transition-[background-color,scale] duration-150 active:scale-[0.98] hoverable:hover:bg-hover"
          >
            <span
              className={clsx(
                "grid size-10 shrink-0 place-items-center rounded-full transition-colors",
                on ? "bg-amber text-amber-ink" : "bg-plate-2 text-text",
              )}
            >
              <Volume2 aria-hidden="true" className="size-4" />
            </span>
            <span
              lang={c.lang}
              className="w-[104px] shrink-0 truncate text-lg font-medium text-text"
            >
              {c.term}
            </span>
            <span aria-hidden="true" className="flex h-6 flex-1 items-center gap-[2px]">
              {(peaks[c.id] ?? Array.from({ length: BARS }, () => 0.1)).map((p, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: bars in a fixed order
                  key={i}
                  style={{ height: `${p * 100}%` }}
                  className={clsx(
                    "flex-1 rounded-full",
                    on && i / BARS < (playing?.at ?? 0) ? "bg-amber" : "bg-edge-2",
                  )}
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* Multilingual: each script drawn the way a learner needs it. */

/** The stressed vowel and its mark lit, so the eye lands where the voice does. */
function Stressed({ term }: { term: string }) {
  const mark = term.indexOf("́");
  if (mark < 1) return <>{term}</>;
  return (
    <>
      {term.slice(0, mark - 1)}
      <span className="text-amber-text">{term.slice(mark - 1, mark + 1)}</span>
      {term.slice(mark + 1)}
    </>
  );
}

export function MultiDemo(_: DemoProps) {
  const tiles = [
    {
      lang: "ja",
      word: <Furigana term="木漏れ日" reading="こもれび" lang="ja" />,
      note: <Trans>Furigana</Trans>,
    },
    {
      lang: "zh",
      word: <Furigana term="朋友" reading="péng you" lang="zh" />,
      note: <Trans>Pinyin</Trans>,
    },
    { lang: "ru", word: <Stressed term="молоко́" />, note: <Trans>Stress marks</Trans> },
    { lang: "ar", word: <span dir="rtl">مرحبا</span>, note: <Trans>Right to left</Trans> },
  ];
  return (
    <div className="grid w-full max-w-[360px] gap-3">
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((tile) => (
          <div
            key={tile.lang}
            className="flex flex-col items-center gap-2 rounded-xl bg-plate px-2 pt-4 pb-3 edge"
          >
            <span lang={tile.lang} className="text-[26px] leading-[1.6] font-medium text-text">
              {tile.word}
            </span>
            <span className="text-xs text-muted">{tile.note}</span>
          </div>
        ))}
      </div>
      <p className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-text-2">
        <Trans>Meanings in</Trans>
        {[
          ["en", "English"],
          ["uk", "Українська"],
          ["ru", "Русский"],
        ].map(([lang, name]) => (
          <span key={lang} lang={lang} className="rounded-full bg-plate px-2.5 py-1 text-text edge">
            {name}
          </span>
        ))}
      </p>
    </div>
  );
}

/* Pictures and four ways to ask: one card, asked each way a deck can ask it. */

const MODES = ["term_to_meaning", "meaning_to_term", "image_to_term", "image_to_meaning"] as const;
type Mode = (typeof MODES)[number];
const MODE_MS = 1800;

function Apple({ className }: { className?: string }) {
  const { t } = useLingui();
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={t`An apple`} className={className}>
      <path d="M33 17c3-7 9-9 13-8-1 5-5 9-13 8Z" fill="oklch(0.62 0.13 145)" />
      <path
        d="M32 19c-2-4-3-7-3-10"
        fill="none"
        stroke="oklch(0.42 0.05 60)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M32 21c-5-4-14-4-19 2-6 7-4 19 1 26 4 6 9 9 13 8 2-1 3-1 5-1s3 0 5 1c4 1 9-2 13-8 5-7 7-19 1-26-5-6-14-6-19-2Z"
        fill="oklch(0.62 0.18 28)"
      />
      <path
        d="M20 29c-2 3-2 8 0 11"
        fill="none"
        stroke="oklch(1 0 0 / 0.45)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PicturesDemo({ play }: DemoProps) {
  const still = useStill();
  const [mode, setMode] = useState<Mode>("term_to_meaning");
  const [picked, setPicked] = useState(false);
  useEffect(() => {
    if (!play || still || picked) return;
    const timer = window.setInterval(
      () => setMode((m) => MODES[(MODES.indexOf(m) + 1) % MODES.length] as Mode),
      MODE_MS,
    );
    return () => window.clearInterval(timer);
  }, [play, still, picked]);

  const term = <span lang="es">la manzana</span>;
  const meaning = <Trans>apple</Trans>;
  const picture = <Apple className="size-16" />;
  const faces: Record<Mode, { cue: ReactNode; answer: ReactNode }> = {
    term_to_meaning: { cue: term, answer: meaning },
    meaning_to_term: { cue: meaning, answer: term },
    image_to_term: { cue: picture, answer: term },
    image_to_meaning: { cue: picture, answer: meaning },
  };
  const labels: Record<Mode, ReactNode> = {
    term_to_meaning: <Trans>Word → meaning</Trans>,
    meaning_to_term: <Trans>Meaning → word</Trans>,
    image_to_term: <Trans>Picture → word</Trans>,
    image_to_meaning: <Trans>Picture → meaning</Trans>,
  };
  const face = faces[mode];

  return (
    <div className="grid w-full max-w-[340px] gap-3">
      <div className="rounded-2xl bg-plate p-5 text-center edge">
        <div className="grid h-24 place-items-center text-3xl font-medium tracking-[-0.025em] text-text">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={mode}
              initial={still ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              {face.cue}
            </motion.span>
          </AnimatePresence>
        </div>
        <p className="mt-3 border-t border-edge pt-3 text-md text-text-2">{face.answer}</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {MODES.map((each) => (
          <button
            key={each}
            type="button"
            aria-pressed={mode === each}
            onClick={() => {
              setPicked(true);
              setMode(each);
            }}
            className={clsx(
              "h-9 rounded-full px-2 text-xs transition-colors",
              mode === each
                ? "bg-text font-medium text-canvas"
                : "bg-plate text-text-2 edge hoverable:hover:text-text",
            )}
          >
            {labels[each]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Long enough to watch a demo finish and read its line. */
const DWELL_MS = 5000;

/**
 * One item at a time on a tray, with the list beside it. It moves on by itself until the visitor
 * picks an item, and holds still while pointed at or focused.
 */
export function FeatureStage({ items }: { items: StageItem[] }) {
  const { i18n } = useLingui();
  const still = useStill();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: 0.45 });
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(false);
  const item = items[index] as StageItem;
  const auto = !still && !picked;

  return (
    <div
      ref={root}
      className="landing-stage mt-12 grid gap-4 @4xl:mt-14 @4xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] @4xl:gap-8"
    >
      <div
        style={{ "--tray-h": item.hue } as CSSProperties}
        className="use-case-tile relative grid min-h-[340px] place-items-center overflow-hidden rounded-[24px] p-6 transition-[background-color] duration-700 ease-out @4xl:min-h-[380px]"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={item.id}
            initial={still ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
            transition={{ duration: 0.4, ease: EASE }}
            className="flex w-full justify-center"
          >
            <item.Demo play={inView} />
          </motion.div>
        </AnimatePresence>
        {auto && (
          <span
            aria-hidden="true"
            key={`${item.id}-bar`}
            onAnimationEnd={() => setIndex((i) => (i + 1) % items.length)}
            style={{
              animationDuration: `${DWELL_MS}ms`,
            }}
            className="landing-dwell absolute inset-x-0 bottom-0 h-0.5 bg-text/20 ltr:origin-left rtl:origin-right"
          />
        )}
      </div>

      <ul className="grid content-center gap-0.5">
        {items.map((each, i) => {
          const on = i === index;
          return (
            <li key={each.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setPicked(true);
                  setIndex(i);
                }}
                className={clsx(
                  "grid min-h-11 w-full grid-cols-[auto_minmax(0,1fr)] gap-x-3 rounded-xl px-3 py-2.5 text-start transition-colors duration-200",
                  on ? "bg-plate edge" : "hoverable:hover:bg-hover",
                )}
              >
                <span
                  className={clsx(
                    "grid size-8 place-items-center rounded-md transition-colors",
                    on ? "bg-amber-soft text-amber-text" : "bg-plate-2 text-text-2",
                  )}
                >
                  <each.icon aria-hidden="true" className="size-4" />
                </span>
                <span className="self-center">
                  <span className="block text-md font-medium text-text">{i18n._(each.title)}</span>
                  <span
                    className={clsx(
                      "block text-sm text-pretty",
                      on ? "text-text-2" : "hidden text-muted @4xl:block",
                    )}
                  >
                    {i18n._(each.body)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
