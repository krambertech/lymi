import { msg, plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { FLAME_BOUNDS } from "@lymi/design";
import { clsx } from "clsx";
import {
  Check,
  CloudOff,
  FileArchive,
  FileSpreadsheet,
  FileText,
  LifeBuoy,
  type LucideIcon,
  Tag,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { Lantern } from "../Lantern";
import { FLAME_PARTS } from "../lantern-geometry";
import { Furigana } from "./Furigana";
import { EASE, usePlayback, useStill } from "./playback";

/** Every tile's demo: it rests on a frame that already says what it is, and plays once when told. */
export interface TileDemoProps {
  play: boolean;
}

/** A soft spring for things that move into place. */
const SETTLE = { type: "spring", stiffness: 260, damping: 26, mass: 0.8 } as const;
const SWAP = { duration: 0.32, ease: EASE } as const;
const swap = {
  initial: { opacity: 0, y: 6, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -6, filter: "blur(4px)" },
  transition: SWAP,
};

/**
 * A demo's beats while it plays. When play stops, every beat reads as not reached, so a hovered tile
 * settles back to its resting frame; with reduced motion every beat reads as reached at once.
 */
function useBeats<Beat extends string>(beats: Record<Beat, number>, play: boolean) {
  const still = useStill();
  const { at } = usePlayback(beats, play, still);
  return (beat: Beat) => still || (play && at(beat));
}

function Plate({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("rounded-xl bg-plate edge", className)}>{children}</div>;
}

/* Hints: the hint opens on a card, a way in rather than the answer. */

export function HintTile({ play }: TileDemoProps) {
  const at = useBeats({ press: 500, open: 750, lit: 1150 }, play);
  return (
    <Plate className="w-[188px] px-3 pt-2.5 pb-3 text-center">
      <p lang="ja" className="text-2xl font-medium text-ink">
        休む
      </p>
      <div className="mt-2 grid h-9 place-items-center">
        <AnimatePresence mode="wait" initial={false}>
          {at("open") ? (
            <motion.p
              key="hint"
              {...swap}
              lang="ja"
              className="flex items-center gap-1.5 rounded-lg bg-plate-nested px-3 py-1 text-lg text-ink"
            >
              {["亻", "木"].map((part, i) => (
                <span key={part} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-xs text-ink-muted">+</span>}
                  <span
                    className={clsx(
                      "transition-colors duration-500",
                      at("lit") && "text-amber-text",
                    )}
                  >
                    {part}
                  </span>
                </span>
              ))}
              <span className="text-xs text-ink-muted">=</span>休
            </motion.p>
          ) : (
            <motion.span
              key="button"
              exit={{ opacity: 0, scale: 0.94 }}
              transition={SWAP}
              className={clsx(
                "flex h-7 items-center gap-1.5 rounded-full bg-plate-nested px-3 text-xs text-ink transition-transform duration-200",
                at("press") && "scale-95",
              )}
            >
              <LifeBuoy aria-hidden="true" className="size-3.5" />
              <Trans>Show hint</Trans>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </Plate>
  );
}

/* Every script: each script's tile lifts in turn. */

function Stressed({ term }: { term: string }) {
  const mark = term.indexOf("́");
  return (
    <>
      {term.slice(0, mark - 1)}
      <span className="text-amber-text">{term.slice(mark - 1, mark + 1)}</span>
      {term.slice(mark + 1)}
    </>
  );
}

const SCRIPTS = [
  { lang: "ja", word: <Furigana term="木漏れ日" reading="こもれび" lang="ja" /> },
  { lang: "zh", word: <Furigana term="朋友" reading="péng you" lang="zh" /> },
  { lang: "ru", word: <Stressed term="молоко́" /> },
  { lang: "ar", word: <span dir="rtl">مرحبا</span> },
];

export function ScriptsTile({ play }: TileDemoProps) {
  const at = useBeats({ s0: 100, s1: 450, s2: 800, s3: 1150, s4: 1600 }, play);
  const lit = at("s4") ? -1 : at("s3") ? 3 : at("s2") ? 2 : at("s1") ? 1 : at("s0") ? 0 : -1;
  return (
    <div className="grid w-[204px] grid-cols-2 gap-1.5">
      {SCRIPTS.map((tile, i) => (
        <motion.div
          key={tile.lang}
          animate={{ y: lit === i ? -4 : 0 }}
          transition={SETTLE}
          className="grid h-[52px] place-items-center rounded-xl bg-plate edge"
        >
          <span lang={tile.lang} className="text-lg leading-[1.7] font-medium text-ink">
            {tile.word}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/* Four ways to ask: one card, asked each way once. */

function Apple({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <path d="M33 17c3-7 9-9 13-8-1 5-5 9-13 8Z" fill="oklch(0.62 0.13 145)" />
      <path
        d="M32 21c-5-4-14-4-19 2-6 7-4 19 1 26 4 6 9 9 13 8 2-1 3-1 5-1s3 0 5 1c4 1 9-2 13-8 5-7 7-19 1-26-5-6-14-6-19-2Z"
        fill="oklch(0.62 0.18 28)"
      />
    </svg>
  );
}

const ASKS = [
  { id: "picture-word", label: msg`Picture → word`, cue: "picture", answer: "term" },
  { id: "word-meaning", label: msg`Word → meaning`, cue: "term", answer: "meaning" },
  { id: "meaning-word", label: msg`Meaning → word`, cue: "meaning", answer: "term" },
  { id: "picture-meaning", label: msg`Picture → meaning`, cue: "picture", answer: "meaning" },
] as const;

export function ModesTile({ play }: TileDemoProps) {
  const { i18n, t } = useLingui();
  const at = useBeats({ m1: 900, m2: 1900, m3: 2900, back: 3900 }, play);
  const ask = ASKS[at("back") ? 0 : at("m3") ? 3 : at("m2") ? 2 : at("m1") ? 1 : 0];
  const face = (side: "picture" | "term" | "meaning") =>
    side === "picture" ? (
      <Apple className="size-10" />
    ) : side === "term" ? (
      <span lang="es">la manzana</span>
    ) : (
      t`apple`
    );
  return (
    <div className="grid justify-items-center gap-2">
      <Plate className="grid w-[156px] justify-items-center px-3 pt-2 pb-2.5">
        <div className="grid h-11 place-items-center text-lg font-medium text-ink">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={ask.id} {...swap}>
              {face(ask.cue)}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="mt-1 grid w-full border-t border-edge pt-1.5 text-center text-xs text-ink-secondary">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={ask.id} {...swap}>
              {face(ask.answer)}
            </motion.span>
          </AnimatePresence>
        </div>
      </Plate>
      <motion.span
        layout
        transition={SETTLE}
        className="rounded-full bg-ink px-2.5 py-0.5 text-2xs font-medium whitespace-nowrap text-canvas"
      >
        {i18n._(ask.label)}
      </motion.span>
    </div>
  );
}

/* Goal and streak, for a narrow tile: today's goal filling, then the run counting up. */

function Flame({ className }: { className?: string }) {
  const { left, top, right, bottom } = FLAME_BOUNDS;
  return (
    <svg
      viewBox={`${left} ${top} ${right - left} ${bottom - top}`}
      aria-hidden="true"
      className={className}
    >
      {FLAME_PARTS()}
    </svg>
  );
}

const WEEK = ["kept", "kept", "rest", "kept", "kept", "kept", "today"] as const;
const GOAL = 25;

export function StreakTile({ play }: TileDemoProps) {
  const { i18n, t } = useLingui();
  const at = useBeats({ fill: 250, lit: 1300 }, play);
  const done = at("fill") ? GOAL : 18;
  const days = at("lit") ? 13 : 12;
  return (
    <div className="grid w-full gap-3">
      <div className="flex items-end gap-2">
        <motion.span
          animate={{ scale: at("lit") ? [1, 1.2, 1] : 1 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-1 block shrink-0 origin-bottom"
        >
          <Flame className="h-8 w-auto" />
        </motion.span>
        <span className="text-[44px] leading-none font-medium tracking-[-0.04em] text-ink tabular-nums">
          {i18n.number(days)}
        </span>
        <span className="mb-1 max-w-[9ch] text-xs leading-tight text-ink-secondary">
          {t`${plural(days, { one: "day in a row", other: "days in a row" })}`}
        </span>
      </div>
      <div className="flex justify-between">
        {WEEK.map((state, i) => {
          const lit = state === "kept" || (state === "today" && at("lit"));
          return (
            <motion.span
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed week
              key={i}
              animate={{ scale: state === "today" && at("lit") ? [1, 1.35, 1] : 1 }}
              transition={{ duration: 0.5, ease: EASE }}
              className={clsx(
                "size-4 rounded-full transition-colors duration-500",
                lit && "bg-amber",
                state === "rest" && "border-2 border-dashed border-amber",
                state === "today" && !lit && "border border-dashed border-ink/30",
              )}
            />
          );
        })}
      </div>
      <div>
        <div className="h-2.5 overflow-hidden rounded-full bg-ink/10">
          <motion.div
            className="h-full origin-left rounded-full bg-amber rtl:origin-right"
            initial={false}
            animate={{ scaleX: done / GOAL }}
            transition={{ duration: 0.9, ease: EASE }}
          />
        </div>
        <p className="mt-1.5 flex items-center justify-between gap-2 text-xs text-ink-secondary">
          <span className="whitespace-nowrap tabular-nums">
            <Trans>
              {i18n.number(done)} of {i18n.number(GOAL)} today
            </Trans>
          </span>
          <span
            className={clsx(
              "flex items-center gap-1 whitespace-nowrap text-ink transition-opacity duration-300",
              at("lit") ? "opacity-100" : "opacity-0",
            )}
          >
            <Check className="size-3.5 text-success" />
            <Trans>Goal reached</Trans>
          </span>
        </p>
      </div>
    </div>
  );
}

/* Tags: cards from different decks, and the filter that pulls one tag's cards together. */

const TAGGED = [
  { id: "a", term: "aufhören", lang: "de", deck: "German", tags: ["exam", "verbs"] },
  { id: "b", term: "la factura", lang: "es", deck: "Spanish", tags: ["work"] },
  { id: "c", term: "die Prüfung", lang: "de", deck: "German B1", tags: ["exam"] },
];

function TagChip({ on, children }: { on?: boolean; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "flex h-6 items-center gap-1 rounded-full px-2 text-xs whitespace-nowrap transition-colors duration-300",
        on ? "bg-ink text-canvas" : "bg-plate-nested text-ink-secondary",
      )}
    >
      <Tag className="size-3" />
      {children}
    </span>
  );
}

export function TagsTile({ play }: TileDemoProps) {
  const at = useBeats({ pick: 250 }, play);
  const picked = at("pick");
  return (
    <div className="@container w-full rounded-xl bg-plate edge">
      <ul className="divide-y divide-edge">
        {TAGGED.map((card) => {
          const out = picked && !card.tags.includes("exam");
          return (
            <li
              key={card.id}
              className={clsx(
                "flex h-10 items-center justify-between gap-2 px-3 transition-opacity duration-300",
                out && "opacity-35",
              )}
            >
              <span className="min-w-0">
                <span lang={card.lang} className="block truncate text-sm font-medium text-ink">
                  {card.term}
                </span>
              </span>
              <span className="flex shrink-0 gap-1">
                {card.tags.map((tag, i) => (
                  <span key={tag} className={clsx(i > 0 && "@max-[230px]:hidden")}>
                    <TagChip on={picked && tag === "exam"}>{tag}</TagChip>
                  </span>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="flex h-10 items-center justify-between gap-2 border-t border-edge ps-3 pe-2 text-xs text-ink-secondary">
        <span className="truncate">
          <Trans>18 cards in 3 decks</Trans>
        </span>
        <span
          className={clsx(
            "flex h-6 shrink-0 items-center rounded-md px-2 font-medium transition-colors duration-300",
            picked ? "bg-amber text-amber-ink" : "bg-plate-nested text-ink",
          )}
        >
          <Trans>Review</Trans>
        </span>
      </p>
    </div>
  );
}

/* Insights: the day grid, a column a week, each day shaded by how much of its goal was done. */

const WEEKS_SHOWN = 20;
/** Levels 0 to 3 for each day, steadier towards today; 4 marks a rest day. Fixed, so it never jumps. */
const DAYS: number[][] = Array.from({ length: WEEKS_SHOWN }, (_, w) =>
  Array.from({ length: 7 }, (_, d) => {
    const n = Math.abs(Math.sin((w + 1) * 12.9898 + (d + 1) * 78.233) * 43758.5453) % 1;
    const steady = 0.3 + (w / WEEKS_SHOWN) * 0.62;
    if (n > steady) return w > 9 && (w + d) % 5 === 0 ? 4 : 0;
    return n < steady * 0.45 ? 3 : n < steady * 0.8 ? 2 : 1;
  }),
);
/** Today is Thursday of the last week; the days after it have not happened. */
const TODAY = 3;

export function InsightsTile({ play }: TileDemoProps) {
  const still = useStill();
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    if (play) setDrawn(true);
  }, [play]);
  const shown = drawn || still;
  return (
    <div className="w-full max-w-[420px] rounded-xl bg-plate p-3 edge">
      <div
        style={{ gridTemplateColumns: `repeat(${WEEKS_SHOWN}, minmax(0, 1fr))` }}
        className="grid gap-[3px]"
      >
        {DAYS.map((week, w) => {
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed grid
            <div key={w} className="grid gap-[3px]">
              {week.map((level, d) => {
                const last = w === WEEKS_SHOWN - 1;
                const future = last && d > TODAY;
                const today = last && d === TODAY;
                return (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: a fixed grid
                    key={d}
                    style={{ transitionDelay: shown && !still ? `${w * 30 + d * 8}ms` : "0ms" }}
                    className={clsx(
                      "aspect-square rounded-[3px] transition-[opacity,scale] duration-500",
                      shown ? "scale-100 opacity-100" : "scale-75 opacity-30",
                      future && "border border-dashed border-ink/25",
                      !future && !today && level === 0 && "bg-ink/8",
                      !future && !today && level === 1 && "bg-amber/35",
                      !future && !today && level === 2 && "bg-amber/65",
                      !future && (level === 3 || today) && "bg-amber",
                      !future && !today && level === 4 && "border-[1.5px] border-amber",
                      today && "shadow-[0_0_0_1.5px_var(--plate),0_0_0_3px_var(--ink)]",
                    )}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="mt-2.5 flex items-center justify-between gap-2 text-xs text-ink-secondary">
        <span className="truncate">
          <Trans>Day by day</Trans>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <span className="size-2.5 rounded-[3px] bg-ink/8" />
          <span className="size-2.5 rounded-[3px] bg-amber/35" />
          <span className="size-2.5 rounded-[3px] bg-amber/65" />
          <span className="size-2.5 rounded-[3px] bg-amber" />
        </span>
      </p>
    </div>
  );
}

/* Bring your decks: the apps Lymi imports from, and the deck they land in. Marks from Simple Icons (CC0). */

const APPS: { name: string; path?: string; color?: string }[] = [
  {
    name: "Anki",
    // check-styling: allow, Anki's own brand colour
    color: "#80C2EE",
    path: "m15.845 22.627-.169.131-.182.091c-.109.042-.23.069-.362.079-.27.021-.611-.036-.989-.16-.686-.223-1.537-.67-2.256-.973-.343-.145-.633-.281-.829-.254-.197.027-.44.236-.73.467-.611.486-1.311 1.145-1.91 1.546-.331.22-.644.368-.91.42-.13.026-.255.032-.37.021l-.201-.038-.196-.082-.177-.119-.143-.145a1.3 1.3 0 0 1-.187-.32c-.104-.25-.154-.593-.154-.99.001-.721.164-1.669.23-2.447.031-.37.07-.687-.016-.866-.087-.178-.359-.345-.67-.55-.65-.431-1.494-.893-2.06-1.34-.312-.246-.548-.498-.681-.735a1.3 1.3 0 0 1-.134-.345l-.025-.202.016-.213.059-.205.094-.18c.064-.097.145-.191.246-.277.207-.175.517-.33.895-.452.685-.222 1.637-.361 2.397-.539.362-.084.676-.145.819-.281.144-.138.217-.45.316-.808.209-.752.387-1.696.638-2.373.138-.373.305-.676.489-.874.091-.098.187-.176.286-.235l.185-.086.207-.051.214-.006.2.033c.113.03.226.079.339.148.231.143.473.389.706.711.424.584.85 1.446 1.253 2.114.192.318.347.598.522.692.174.094.494.068.865.052.78-.034 1.734-.157 2.455-.128.397.017.736.081.983.195.12.055.223.123.31.201l.14.148.112.181.072.201.03.202c.007.115-.005.238-.036.368-.063.263-.223.57-.457.891-.425.583-1.113 1.254-1.623 1.845-.244.281-.463.514-.498.71-.035.194.089.49.219.838.273.731.684 1.601.879 2.295.108.382.151.725.119.995-.015.131-.049.252-.095.358l-.098.179zm-1.54-18.929c-.018-.057-.07-.226-.122-.346-.17-.387-.418-.846-.544-1.216-.166-.483-.099-.88.102-1.096.201-.214.592-.308 1.086-.177.377.1.851.316 1.249.458.125.044.297.084.354.096.047-.032.193-.134.291-.221.316-.282.675-.659.988-.894.408-.305.807-.366 1.074-.241.266.124.476.468.504.977.021.391-.037.909-.049 1.331-.004.132.011.309.017.366.046.035.187.142.301.209.365.213.835.438 1.155.662.417.294.597.655.56.947-.035.293-.296.599-.773.782-.365.141-.875.246-1.28.364-.126.037-.29.106-.343.129-.019.056-.077.223-.105.351-.091.413-.159.93-.274 1.304-.151.487-.438.77-.727.826s-.661-.098-.983-.494c-.246-.303-.504-.756-.742-1.105-.074-.11-.19-.243-.229-.287-.058-.001-.235-.004-.366.009-.421.042-.933.135-1.324.141-.51.008-.867-.177-1.011-.435-.142-.257-.11-.659.167-1.088.212-.328.563-.713.822-1.047.08-.104.171-.256.202-.305",
  },
  {
    name: "Quizlet",
    // check-styling: allow, Quizlet's own brand colour
    color: "#4255FF",
    path: "M12.779.025a11.789 11.789 0 0 0-5.338.896A11.829 11.829 0 0 0 3.058 4.11 11.928 11.928 0 0 0 .427 14.363a11.92 11.92 0 0 0 2.3 4.921 11.842 11.842 0 0 0 4.24 3.378 11.783 11.783 0 0 0 10.533-.226.327.327 0 0 1 .331.018 9.136 9.136 0 0 0 5.197 1.545.332.332 0 0 0 .332-.332v-4.038a.334.334 0 0 0-.276-.331 4.732 4.732 0 0 1-1.106-.319.329.329 0 0 1-.191-.352.33.33 0 0 1 .05-.133 11.943 11.943 0 0 0 .772-11.871 11.87 11.87 0 0 0-4.042-4.628A11.793 11.793 0 0 0 12.765.018l.013.007h.001ZM4.843 11.898a7.24 7.24 0 0 1 1.205-4.005 7.18 7.18 0 0 1 3.215-2.657 7.133 7.133 0 0 1 7.815 1.558 7.239 7.239 0 0 1 1.555 7.854 7.202 7.202 0 0 1-2.643 3.234 7.147 7.147 0 0 1-9.049-.896 7.228 7.228 0 0 1-2.103-5.089l.005.001Z",
  },
  { name: "Mochi" },
  { name: "Noji" },
  { name: "Pleco" },
];
const IMPORT_FROM = 1240;

export function ImportTile({ play }: TileDemoProps) {
  const { i18n } = useLingui();
  const at = useBeats({ a0: 80, a1: 200, a2: 320, a3: 440, a4: 560, in: 900 }, play);
  return (
    <div className="grid w-full max-w-[380px] gap-2.5">
      <ul className="grid grid-cols-5 gap-1">
        {APPS.map((app, i) => (
          <motion.li
            key={app.name}
            animate={{ y: at(`a${i}` as "a0") && !at("in") ? -4 : 0 }}
            transition={SETTLE}
            className="grid min-w-0 justify-items-center gap-1"
          >
            <span className="grid aspect-square w-full max-w-11 place-items-center rounded-xl bg-plate text-md font-medium text-ink edge">
              {app.path ? (
                <svg viewBox="0 0 24 24" className="size-5" fill={app.color}>
                  <path d={app.path} />
                </svg>
              ) : (
                app.name.charAt(0)
              )}
            </span>
            <span className="max-w-full truncate text-xs text-ink-secondary">{app.name}</span>
          </motion.li>
        ))}
      </ul>
      <div className="flex h-11 items-center gap-2.5 rounded-xl bg-plate ps-2.5 pe-3 edge">
        <Lantern className="size-5 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-xs text-ink">
          <Trans>{i18n.number(IMPORT_FROM)} cards, history kept</Trans>
        </span>
        <motion.span
          animate={{ scale: at("in") ? [1, 1.3, 1] : 1 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="grid size-5 shrink-0 place-items-center rounded-full bg-success-soft"
        >
          <Check className="size-3.5 text-success" />
        </motion.span>
      </div>
    </div>
  );
}

/* The compact row: keys, the phone's shortcut, offline reviews and export, one small picture each. */

function Cap({ down, wide, children }: { down: boolean; wide?: boolean; children: ReactNode }) {
  return (
    <motion.kbd
      animate={{ y: down ? 2 : 0 }}
      transition={{ type: "spring", stiffness: 600, damping: 28 }}
      className={clsx(
        "grid h-7 shrink-0 place-items-center rounded-md bg-plate font-sans text-xs font-semibold text-ink tabular-nums transition-shadow duration-150",
        wide ? "px-2" : "w-6",
        down
          ? "shadow-[inset_0_0_0_1px_var(--edge-strong)]"
          : "shadow-[0_0_0_1px_var(--edge),0_2px_0_var(--edge-strong)]",
      )}
    >
      {children}
    </motion.kbd>
  );
}

/** The keys a review runs on: the command menu, show the answer, then a grade. */
export function KeysTile({ play }: TileDemoProps) {
  const at = useBeats({ menu: 120, space: 420, grade: 760, up: 1150 }, play);
  const down = (beat: "menu" | "space" | "grade") => at(beat) && !at("up");
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pb-0.5">
      <Cap wide down={down("menu")}>
        ⌘K
      </Cap>
      <Cap wide down={down("space")}>
        Space
      </Cap>
      <span className="flex gap-1">
        {["1", "2", "3", "4"].map((key) => (
          <Cap key={key} down={key === "3" && down("grade")}>
            {key}
          </Cap>
        ))}
      </span>
    </span>
  );
}

/** The Mac app's quick add: its three keys go down, and the card is saved. */
export function QuickAddTile({ play }: TileDemoProps) {
  const at = useBeats({ press: 150, done: 700, up: 1000 }, play);
  const down = at("press") && !at("up");
  return (
    <span className="flex w-full flex-wrap items-center gap-x-2 gap-y-1.5 pb-0.5">
      <span className="flex gap-1">
        {["⌃", "⌥", "L"].map((key) => (
          <Cap key={key} down={down}>
            {key}
          </Cap>
        ))}
      </span>
      <span
        className={clsx(
          "flex h-6 items-center gap-1 rounded-full bg-amber-soft px-2 text-xs font-medium text-amber-text transition-opacity duration-200 motion-reduce:transition-none",
          at("done") ? "opacity-100" : "opacity-0",
        )}
      >
        <Check className="size-3.5" />
        <Trans>Added</Trans>
      </span>
    </span>
  );
}

/** Reviews graded with no signal wait on the device, then sync. */
export function OfflineTile({ play }: TileDemoProps) {
  const at = useBeats({ sync: 500 }, play);
  const synced = at("sync");
  return (
    <span className="flex h-10 w-full min-w-0 items-center gap-2.5 rounded-xl bg-plate ps-2.5 pe-3 edge">
      <span className="flex shrink-0 gap-0.5 @max-xl:hidden">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ opacity: synced ? 0.35 : 1, y: synced ? -2 : 0 }}
            transition={{ ...SETTLE, delay: synced ? i * 0.06 : 0 }}
            className="h-4 w-3 rounded-[3px] bg-plate-nested edge"
          />
        ))}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-ink">
        {synced ? (
          <>
            <Check className="size-4 shrink-0 text-amber-text" />
            <span className="truncate">
              <Trans>Synced</Trans>
            </span>
          </>
        ) : (
          <>
            <CloudOff className="size-4 shrink-0 text-ink-muted" />
            <span className="truncate">
              <Trans>3 reviews saved</Trans>
            </span>
          </>
        )}
      </span>
    </span>
  );
}

/** The three files a deck can leave as, by their real extensions. */
export function ExportTile({ play }: TileDemoProps) {
  const at = useBeats({ f0: 100, f1: 240, f2: 380, rest: 850 }, play);
  const files: { id: "f0" | "f1" | "f2"; icon: LucideIcon; file: string }[] = [
    { id: "f0", icon: FileArchive, file: ".apkg" },
    { id: "f1", icon: FileText, file: ".zip" },
    { id: "f2", icon: FileSpreadsheet, file: ".csv" },
  ];
  return (
    <span className="flex flex-wrap gap-1.5">
      {files.map((f) => (
        <motion.span
          key={f.id}
          animate={{ y: at(f.id) && !at("rest") ? 3 : 0 }}
          transition={SETTLE}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-plate ps-1.5 pe-2.5 text-xs font-medium text-ink edge"
        >
          <f.icon className="size-4 text-amber-text" />
          {f.file}
        </motion.span>
      ))}
    </span>
  );
}
