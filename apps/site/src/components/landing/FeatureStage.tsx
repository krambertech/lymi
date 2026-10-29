import type { MessageDescriptor } from "@lingui/core";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { type LucideIcon, Volume2 } from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { AiChip } from "./CardScenes";
import { EASE, useStill } from "./playback";

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

/* Native AI voice: real clips, each drawing its own waveform. */

const CLIPS = [
  { id: "de", lang: "de", term: "Feierabend", clip: "/audio/hand/feierabend.mp3" },
  { id: "ja", lang: "ja", term: "木漏れ日", clip: "/audio/hand/komorebi.mp3" },
  { id: "pt", lang: "pt-PT", term: "saudade", clip: "/audio/hand/saudade.mp3" },
  { id: "ko", lang: "ko", term: "눈치", clip: "/audio/hand/nunchi.mp3" },
];
const COMPACT_CLIPS = CLIPS.slice(0, 2);
const BARS = 28;
const SWEEP_MS = 1600;

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

interface VoiceProps extends DemoProps {
  /** Two clips in small rows, for a bento tile. */
  compact?: boolean;
  /** Runs the first clip's line once, without sound, when play turns on. */
  sweep?: boolean;
}

export function VoiceDemo({ play, compact, sweep }: VoiceProps) {
  const { t } = useLingui();
  const still = useStill();
  const clips = compact ? COMPACT_CLIPS : CLIPS;
  const [peaks, setPeaks] = useState<Record<string, number[]>>({});
  const [playing, setPlaying] = useState<{ id: string; at: number } | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const frame = useRef(0);

  useEffect(() => {
    if (!play && !compact) return;
    for (const c of clips) {
      peaksOf(c.clip)
        .then((p) => setPeaks((all) => ({ ...all, [c.id]: p })))
        .catch(() => {});
    }
  }, [play, compact, clips]);
  useEffect(() => {
    if (!sweep || !play || still) return;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const at = (now - startedAt) / SWEEP_MS;
      if (at >= 1) return setPlaying(null);
      setPlaying({ id: "de", at });
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [sweep, play, still]);
  useEffect(
    () => () => {
      const clip = audio.current;
      audio.current = null;
      clip?.pause();
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  const start = (id: string, url: string) => {
    audio.current?.pause();
    const clip = new Audio(url);
    audio.current = clip;
    cancelAnimationFrame(frame.current);
    const tick = () => {
      if (audio.current !== clip) return;
      setPlaying({ id, at: clip.duration ? clip.currentTime / clip.duration : 0 });
      frame.current = requestAnimationFrame(tick);
    };
    const done = () => {
      cancelAnimationFrame(frame.current);
      if (audio.current === clip) setPlaying(null);
    };
    clip.addEventListener("ended", done);
    clip.addEventListener("error", done);
    clip.play().then(tick, done);
  };

  return (
    <div className={clsx("grid w-full gap-2", compact ? "max-w-[220px] gap-1.5" : "max-w-[380px]")}>
      {clips.map((c) => {
        const on = playing?.id === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => start(c.id, c.clip)}
            aria-label={t`Hear ${c.term}`}
            className={clsx(
              "flex items-center rounded-xl bg-plate text-start edge transition-[background-color,scale] duration-150 active:scale-[0.98] hoverable:hover:bg-hover",
              compact ? "h-10 gap-2 ps-1.5 pe-3" : "h-14 gap-3 ps-2 pe-4",
            )}
          >
            <span
              className={clsx(
                "grid shrink-0 place-items-center rounded-full transition-colors",
                compact ? "size-7" : "size-10",
                on ? "bg-amber text-amber-ink" : "bg-plate-2 text-text",
              )}
            >
              <Volume2 aria-hidden="true" className={compact ? "size-3.5" : "size-4"} />
            </span>
            <span
              lang={c.lang}
              className={clsx(
                "shrink-0 truncate font-medium text-text",
                compact ? "w-[78px] text-sm" : "w-[104px] text-lg",
              )}
            >
              {c.term}
            </span>
            <span
              aria-hidden="true"
              className={clsx("flex flex-1 items-center gap-[2px]", compact ? "h-5" : "h-6")}
            >
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
            data-paused={!inView || undefined}
            onAnimationEnd={() => setIndex((i) => (i + 1) % items.length)}
            style={{ animationDuration: `${DWELL_MS}ms` }}
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
