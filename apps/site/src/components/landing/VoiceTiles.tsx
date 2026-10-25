import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Volume2 } from "lucide-react";
import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { VoiceWord } from "./japanese";

const BARS = 40;

/** A clip's loudness in even slices, for a waveform drawn from the recording itself. */
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
  return peaks.map((p) => Math.max(0.06, p / top));
}

function Wave({ peaks, played }: { peaks: number[] | null; played: number }) {
  return (
    <span aria-hidden="true" className="flex h-[34px] items-center gap-[2px]">
      {(peaks ?? Array.from({ length: BARS }, () => 0.06)).map((p, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: bars in a fixed order
          key={i}
          style={{ height: `${Math.max(2 / 34, p) * 100}%` }}
          className={clsx(
            "min-h-0.5 flex-1 rounded-full transition-colors duration-100",
            i / BARS < played ? "bg-amber" : "bg-edge-2",
          )}
        />
      ))}
    </span>
  );
}

interface Props {
  words: VoiceWord[];
  lang: string;
  /** The folder under `/audio/` holding each word's clip, named by its id. */
  folder: string;
}

/** Words that play their recording, each drawing its own waveform as it plays. */
export function VoiceTiles({ words, lang, folder }: Props) {
  const { t, i18n } = useLingui();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { once: true, margin: "200px" });
  const [peaks, setPeaks] = useState<Record<string, number[]>>({});
  const [playing, setPlaying] = useState<{ id: string; at: number } | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!inView) return;
    for (const w of words) {
      peaksOf(`/audio/${folder}/${w.id}.mp3`)
        .then((p) => setPeaks((all) => ({ ...all, [w.id]: p })))
        .catch(() => {});
    }
  }, [inView, words, folder]);

  useEffect(() => () => audio.current?.pause(), []);

  const play = (id: string) => {
    audio.current?.pause();
    const clip = new Audio(`/audio/${folder}/${id}.mp3`);
    audio.current = clip;
    setPlaying({ id, at: 0 });
    let frame = 0;
    const tick = () => {
      if (audio.current !== clip) return;
      setPlaying({ id, at: clip.duration ? clip.currentTime / clip.duration : 0 });
      frame = requestAnimationFrame(tick);
    };
    const done = () => {
      cancelAnimationFrame(frame);
      setPlaying((p) => (p?.id === id ? null : p));
    };
    clip.addEventListener("ended", done);
    clip.addEventListener("error", done);
    clip.play().then(tick, done);
  };

  return (
    <div ref={root} className="mt-12 grid grid-cols-2 gap-2.5 @2xl:grid-cols-3 @4xl:mt-16">
      {words.map((w) => {
        const on = playing?.id === w.id;
        return (
          <button
            key={w.id}
            type="button"
            onClick={() => play(w.id)}
            aria-label={w.reading ? t`Play ${w.term}, ${w.reading}` : t`Play ${w.term}`}
            className="grid gap-2.5 rounded-lg bg-plate-2 p-3 text-start @md:p-4 edge-inset transition-[background-color,scale] duration-150 ease-out active:scale-[0.98] hoverable:hover:bg-hover"
          >
            {/* The word has the tile's whole width and grows with it, so здра́вствуйте fits a phone. */}
            <span
              lang={lang}
              className="min-w-0 text-xl leading-tight font-medium text-text @md:text-2xl @4xl:text-3xl"
            >
              {w.term}
            </span>
            {w.reading && (
              <span lang={lang} className="text-md text-amber-text">
                {w.reading}
              </span>
            )}
            <Wave peaks={peaks[w.id] ?? null} played={on ? (playing?.at ?? 0) : 0} />
            <span className="flex items-end justify-between gap-2">
              <span className="text-sm text-muted">{i18n._(w.meaning)}</span>
              <span
                className={clsx(
                  "grid size-8 shrink-0 place-items-center rounded-full transition-colors",
                  on ? "bg-amber text-amber-ink" : "text-text-2 edge-2",
                )}
              >
                <Volume2 aria-hidden="true" className="size-4" />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
