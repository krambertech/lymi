import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, Copy, Sparkle, Volume2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Pick } from "./MaterialToCards";
import { EASE, usePlayback, useStill } from "./playback";

export interface DemoProps {
  play: boolean;
}

/**
 * The product's badge on a field AI wrote: `SourceChip size="xs"` in the app, its sparkle and its
 * word on the violet `ai` tokens.
 */
function AiBadge({ arriving }: { arriving?: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex h-[17px] shrink-0 items-center gap-1 rounded-full bg-ai-soft px-1.5 text-2xs font-medium whitespace-nowrap text-ai",
        arriving && "ai-badge-in",
      )}
    >
      <Sparkle aria-hidden="true" className="size-2.5" />
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

function typing(word: string, from: number, step = 85) {
  return Object.fromEntries(Array.from(word, (_, i) => [`c${i}`, from + i * step]));
}

function typed(word: string, at: (beat: string) => boolean) {
  return Array.from(word)
    .filter((_, i) => at(`c${i}`))
    .join("");
}

/** A field AI fills: the band crosses it, the text clears, and the badge lands by the label. */
function AiField({ label, children, on }: { label: ReactNode; children: ReactNode; on: boolean }) {
  return (
    <div data-on={on} className="ai-sweep rounded-lg bg-plate px-3 py-2 edge">
      <div className="flex h-[17px] items-center justify-between gap-3">
        <span className="text-xs text-ink-muted">{label}</span>
        {on && <AiBadge arriving />}
      </div>
      <div
        className={clsx(
          "mt-0.5 min-h-5 text-sm text-pretty text-ink transition-[opacity,filter] duration-300 motion-reduce:transition-none",
          on ? "opacity-100" : "opacity-0 blur-[4px]",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* A word: type it, and the rest fills in. */

const WORD = "Feierabend";
const WORD_BEATS: Record<string, number> = {
  ...typing(WORD, 250),
  meaning: 1400,
  example: 1900,
  hint: 2400,
};

export function WordDemo({ play }: DemoProps) {
  const { at } = usePlayback(WORD_BEATS, play, useStill());
  return (
    <div className="grid w-full max-w-[340px] gap-1.5">
      <div className="rounded-lg bg-plate px-3 py-2 edge-strong">
        <span className="text-xs text-ink-muted">
          <Trans>Term</Trans>
        </span>
        <p
          lang="de"
          className="mt-0.5 flex h-7 items-center text-xl font-medium tracking-[-0.025em] text-ink"
        >
          {typed(WORD, at)}
          {!at("meaning") && <Caret />}
        </p>
      </div>
      <AiField label={<Trans>Meaning</Trans>} on={at("meaning")}>
        <Trans>The evening after work</Trans>
      </AiField>
      <AiField label={<Trans>Example</Trans>} on={at("example")}>
        <span lang="de">Nach Feierabend gehe ich joggen.</span>
      </AiField>
      <AiField label={<Trans>Hint</Trans>} on={at("hint")}>
        <Trans>Feier (party) + Abend (evening): the evening that’s yours.</Trans>
      </AiField>
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
const LESSON_BEATS: Record<string, number> = {
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

export function LessonDemo({ play }: DemoProps) {
  const { i18n } = useLingui();
  const still = useStill();
  const { at } = usePlayback(LESSON_BEATS, play, still);
  return (
    <div className="grid w-full max-w-[500px] items-center gap-5 @2xl:grid-cols-[auto_minmax(0,1fr)] @2xl:gap-4">
      <div className="relative -rotate-3 justify-self-center p-3">
        {CORNERS.map((corner) => (
          <span
            key={corner}
            aria-hidden="true"
            className={clsx("absolute size-5 border-amber", corner)}
          />
        ))}
        <div className="w-[212px] rounded-sm bg-plate px-4 pt-3 pb-4 edge-drop">
          <p className="flex justify-between text-xs text-ink-muted">
            <span>
              <Trans>Biology · week 6</Trans>
            </span>
            <span>p. 14</span>
          </p>
          <ul className="mt-2 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_27px,var(--edge)_27px,var(--edge)_28px)]">
            {NOTES.map((note, i) => (
              <li
                key={note.term}
                className="flex h-7 items-end pb-0.5 text-[13px] whitespace-nowrap text-ink-secondary"
              >
                <Pick on={at(`l${i}`)}>{note.line}</Pick>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="grid min-h-[196px] grid-cols-[minmax(0,1fr)] content-start gap-1.5">
        {NOTES.map((note, i) => (
          <AnimatePresence key={note.term} initial={false}>
            {at(`c${i}`) && (
              <motion.div
                initial={still ? false : { opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                {note.meaning ? (
                  <div
                    data-on="true"
                    className="ai-sweep flex items-start gap-2.5 rounded-lg bg-plate px-3 py-2 edge"
                  >
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center justify-between gap-2 text-sm font-medium text-ink">
                        {note.term}
                        <AiBadge arriving />
                      </p>
                      <p className="truncate text-xs text-ink-secondary">{i18n._(note.meaning)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 rounded-lg bg-plate/60 px-3 py-2 edge">
                    <Copy aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-muted">{note.term}</p>
                      <p className="truncate text-xs text-ink-muted">
                        <Trans>Already in Biology</Trans>
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-plate-nested px-2 py-0.5 text-2xs font-medium text-ink-secondary">
                      <Trans>Duplicate</Trans>
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>
    </div>
  );
}

/* AI follows your lead: it reads how the deck is written, then writes the next card the same way. */

interface Lead {
  id: "cards" | "told";
  lang: string;
  /** What the deck already holds: two of the learner's cards, or the instructions they gave. */
  source: (lit: (i: number) => boolean) => ReactNode;
  typed: string;
  /** The term as AI leaves it, in the deck's pattern. */
  term: ReactNode;
  meaning: ReactNode;
  extra: ReactNode;
  caption: ReactNode;
}

function OwnCard({ children }: { children: ReactNode }) {
  return (
    <li lang="de" className="flex h-8 items-center text-md font-medium text-ink">
      {children}
    </li>
  );
}

const LEADS: Lead[] = [
  {
    id: "cards",
    lang: "de",
    source: (lit) => (
      <>
        <p className="text-xs text-ink-muted">
          <Trans>Cards you wrote</Trans>
        </p>
        <ul className="mt-0.5 divide-y divide-edge">
          <OwnCard>
            <Pick on={lit(0)}>der</Pick>&nbsp;Bahnhof&nbsp;·&nbsp;
            <Pick on={lit(1)}>die Bahnhöfe</Pick>
          </OwnCard>
          <OwnCard>
            <Pick on={lit(0)}>die</Pick>&nbsp;Stadt&nbsp;·&nbsp;<Pick on={lit(1)}>die Städte</Pick>
          </OwnCard>
        </ul>
      </>
    ),
    typed: "Gleis",
    term: "das Gleis · die Gleise",
    meaning: <Trans>Platform, track</Trans>,
    extra: <span lang="de">Der Zug fährt von Gleis 4.</span>,
    caption: <Trans>Article and plural, the way you write them</Trans>,
  },
  {
    id: "told",
    lang: "es",
    source: (lit) => (
      <>
        <p className="text-xs text-ink-muted">
          <Trans>Deck instructions</Trans>
        </p>
        <p className="mt-1.5 text-md leading-snug text-pretty text-ink">
          <Trans>
            <Pick on={lit(0)}>Mexican Spanish</Pick>, <Pick on={lit(1)}>informal examples</Pick>.
          </Trans>
        </p>
      </>
    ),
    typed: "chamba",
    term: "la chamba",
    meaning: <Trans>Work, a job (informal, Mexico)</Trans>,
    extra: <span lang="es">Ando buscando chamba, güey.</span>,
    caption: <Trans>What you asked for, on every card</Trans>,
  },
];

const LEAD_TYPE_AT = 1150;
const leadBeats = (word: string): Record<string, number> => ({
  h0: 300,
  h1: 700,
  ...typing(word, LEAD_TYPE_AT, 70),
  term: 1900,
  meaning: 2300,
  extra: 2700,
});
/** A variant plays, rests, then the other takes its place. */
const LEAD_MS = 5600;
/** Each visit to the item starts on the other variant, since the stage moves on before one swaps. */
let leadVisits = 0;

function LeadRun({ lead, play }: { lead: Lead; play: boolean }) {
  const { at } = usePlayback(leadBeats(lead.typed), play, useStill());
  const done = at("term");
  return (
    <div className="grid gap-2">
      <div className="min-h-[92px] rounded-xl bg-plate-nested px-4 py-3 edge-inset">
        {lead.source((i) => at(`h${i}`))}
      </div>
      <div data-on={done} className="ai-sweep rounded-xl bg-plate px-4 py-3 edge">
        <div className="flex h-7 items-center justify-between gap-3">
          <p
            lang={lead.lang}
            className="flex items-center text-lg font-medium tracking-[-0.02em] whitespace-nowrap text-ink"
          >
            {done ? lead.term : typed(lead.typed, at)}
            {!done && <Caret />}
          </p>
          {done && <AiBadge arriving />}
        </div>
        {[
          ["meaning", lead.meaning, "text-ink-secondary"] as const,
          ["extra", lead.extra, "text-ink-muted"] as const,
        ].map(([beat, line, tone]) => (
          <p
            key={beat}
            className={clsx(
              "mt-1 min-h-5 text-sm transition-[opacity,filter] duration-300 motion-reduce:transition-none",
              tone,
              at(beat) ? "opacity-100" : "opacity-0 blur-[4px]",
            )}
          >
            {line}
          </p>
        ))}
      </div>
      <p
        className={clsx(
          "flex items-center justify-center gap-1.5 pt-1 text-xs text-ink-secondary transition-opacity duration-300 motion-reduce:transition-none",
          at("extra") ? "opacity-100" : "opacity-0",
        )}
      >
        <Sparkle aria-hidden="true" className="size-3 text-ai" />
        {lead.caption}
      </p>
    </div>
  );
}

export function LeadDemo({ play }: DemoProps) {
  const still = useStill();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(leadVisits++ % LEADS.length);
  }, []);
  useEffect(() => {
    if (!play || still) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % LEADS.length), LEAD_MS);
    return () => window.clearInterval(timer);
  }, [play, still]);
  const lead = LEADS[index] as Lead;

  return (
    <div className="w-full max-w-[340px]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={lead.id}
          initial={still ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          <LeadRun lead={lead} play={play} />
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
  const frame = useRef(0);

  useEffect(() => {
    if (!play) return;
    for (const c of CLIPS) {
      peaksOf(c.clip)
        .then((p) => setPeaks((all) => ({ ...all, [c.id]: p })))
        .catch(() => {});
    }
  }, [play]);
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
    <div className="grid w-full max-w-[380px] gap-2">
      {CLIPS.map((c) => {
        const on = playing?.id === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => start(c.id, c.clip)}
            aria-label={t`Hear ${c.term}`}
            className="flex h-14 items-center gap-3 rounded-xl bg-plate ps-2 pe-4 text-start edge transition-[background-color,scale] duration-150 active:scale-[0.98] hoverable:hover:bg-plate-hover"
          >
            <span
              className={clsx(
                "grid size-10 shrink-0 place-items-center rounded-full transition-colors",
                on ? "bg-amber text-amber-ink" : "bg-plate-nested text-ink",
              )}
            >
              <Volume2 aria-hidden="true" className="size-4" />
            </span>
            <span
              lang={c.lang}
              className="w-[104px] shrink-0 truncate text-lg font-medium text-ink"
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
                    on && i / BARS < (playing?.at ?? 0) ? "bg-amber" : "bg-edge-strong",
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
