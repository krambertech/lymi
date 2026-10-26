import { msg, plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { FLAME_BOUNDS } from "@lymi/design";
import { clsx } from "clsx";
import { Check, Download, FileArchive, LifeBuoy, RefreshCw, Tag, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
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
      <p lang="ja" className="text-2xl font-medium text-text">
        休む
      </p>
      <div className="mt-2 grid h-9 place-items-center">
        <AnimatePresence mode="wait" initial={false}>
          {at("open") ? (
            <motion.p
              key="hint"
              {...swap}
              lang="ja"
              className="flex items-center gap-1.5 rounded-lg bg-plate-2 px-3 py-1 text-lg text-text"
            >
              {["亻", "木"].map((part, i) => (
                <span key={part} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-xs text-muted">+</span>}
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
              <span className="text-xs text-muted">=</span>休
            </motion.p>
          ) : (
            <motion.span
              key="button"
              exit={{ opacity: 0, scale: 0.94 }}
              transition={SWAP}
              className={clsx(
                "flex h-7 items-center gap-1.5 rounded-full bg-plate-2 px-3 text-xs text-text transition-transform duration-200",
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
          <span lang={tile.lang} className="text-lg leading-[1.7] font-medium text-text">
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
        <div className="grid h-11 place-items-center text-lg font-medium text-text">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={ask.id} {...swap}>
              {face(ask.cue)}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="mt-1 grid w-full border-t border-edge pt-1.5 text-center text-xs text-text-2">
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
        className="rounded-full bg-text px-2.5 py-0.5 text-2xs font-medium whitespace-nowrap text-canvas"
      >
        {i18n._(ask.label)}
      </motion.span>
    </div>
  );
}

/* Your goal, your streak: the run as one big number, today's day lighting up. */

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
    <div className="grid min-w-0 gap-5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium whitespace-nowrap text-text">
            <Trans>
              {i18n.number(done)} of {i18n.number(GOAL)} today
            </Trans>
          </span>
          <span className="flex gap-1">
            {WEEK.map((state, i) => {
              const lit = state === "kept" || (state === "today" && at("lit"));
              return (
                <motion.span
                  // biome-ignore lint/suspicious/noArrayIndexKey: a fixed week
                  key={i}
                  animate={{ scale: state === "today" && at("lit") ? [1, 1.4, 1] : 1 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className={clsx(
                    "size-3.5 rounded-full transition-colors duration-500",
                    lit && "bg-amber",
                    state === "rest" && "border-2 border-dashed border-amber",
                    state === "today" && !lit && "border border-dashed border-text/30",
                  )}
                />
              );
            })}
          </span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-text/10">
          <motion.div
            className="h-full origin-left rounded-full bg-amber rtl:origin-right"
            initial={false}
            animate={{ scaleX: done / GOAL }}
            transition={{ duration: 0.9, ease: EASE }}
          />
        </div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-end gap-2.5">
          <motion.span
            animate={{ scale: at("lit") ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mb-2 block shrink-0 origin-bottom"
          >
            <Flame className="h-11 w-auto" />
          </motion.span>
          <span className="relative h-[72px] shrink-0 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={days}
                initial={{ y: 52, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -52, opacity: 0 }}
                transition={{ duration: 0.55, ease: EASE }}
                className="block text-[72px] leading-none font-medium tracking-[-0.045em] text-text"
              >
                {i18n.number(days)}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="mb-2 max-w-[9ch] text-sm leading-tight text-text-2">
            {t`${plural(days, { one: "day in a row", other: "days in a row" })}`}
          </span>
        </div>
        <AnimatePresence initial={false}>
          {at("lit") && (
            <motion.span
              initial={{ opacity: 0, scale: 0.6, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={SETTLE}
              className="mb-2 flex shrink-0 items-center gap-1 rounded-full bg-plate px-2.5 py-1 text-xs whitespace-nowrap text-text edge"
            >
              <Check aria-hidden="true" className="size-3.5 text-good" />
              <Trans>Goal reached</Trans>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* Tags: loose stickers that line up into a filter, one picked. */

const STICKERS = [
  { id: "verbs", tag: msg`verbs`, x: "4%", y: "8%", r: -6 },
  { id: "exam", tag: msg`exam`, x: "38%", y: "0%", r: 4 },
  { id: "travel", tag: msg`travel`, x: "68%", y: "14%", r: -3 },
  { id: "food", tag: msg`food`, x: "16%", y: "56%", r: 5 },
  { id: "week", tag: msg`week 3`, x: "52%", y: "52%", r: -5 },
];

export function TagsTile({ play }: TileDemoProps) {
  const { i18n } = useLingui();
  const still = useStill();
  const at = useBeats({ line: 150, pick: 800 }, play);
  const lined = at("line");
  return (
    <div className="relative h-[104px]">
      <div className={clsx(lined ? "flex flex-wrap gap-1.5" : "contents")}>
        {STICKERS.map((s) => (
          <motion.span
            key={s.id}
            layout={!still}
            initial={false}
            animate={{ rotate: lined ? 0 : s.r }}
            transition={SETTLE}
            style={lined ? undefined : { position: "absolute", insetInlineStart: s.x, top: s.y }}
            className={clsx(
              "flex h-9 items-center gap-1.5 rounded-full px-3 text-sm whitespace-nowrap shadow-[0_6px_14px_-8px_oklch(0.3_0.03_120/0.5)] transition-colors duration-300",
              s.id === "exam" && at("pick") ? "bg-text text-canvas" : "bg-plate text-text edge",
            )}
          >
            <Tag aria-hidden="true" className="size-3.5" />
            {i18n._(s.tag)}
          </motion.span>
        ))}
      </div>
      <span
        className={clsx(
          "absolute start-0 bottom-0 text-sm text-text-2 transition-[opacity,translate] duration-500",
          at("pick") ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
        )}
      >
        <Trans>18 cards tagged exam, from 3 decks</Trans>
      </span>
    </div>
  );
}

/* Keyboard first: three keys, pressed in turn. */

function Key({ down, children }: { down: boolean; children: ReactNode }) {
  return (
    <motion.kbd
      animate={{ y: down ? 2 : 0 }}
      transition={{ type: "spring", stiffness: 600, damping: 28 }}
      className={clsx(
        "grid size-12 place-items-center rounded-xl bg-plate text-xl text-text transition-shadow duration-150",
        down
          ? "shadow-[inset_0_0_0_1px_var(--edge-2)]"
          : "shadow-[0_0_0_1px_var(--edge),0_3px_0_var(--edge-2)]",
      )}
    >
      {children}
    </motion.kbd>
  );
}

export function KeysTile({ play }: TileDemoProps) {
  const at = useBeats({ k0: 150, k1: 320, k2: 490, up: 950 }, play);
  return (
    <span className="flex gap-1.5">
      <Key down={at("k0") && !at("up")}>⌃</Key>
      <Key down={at("k1") && !at("up")}>⌥</Key>
      <Key down={at("k2") && !at("up")}>L</Key>
    </span>
  );
}

/* Works offline: reviews wait with the signal off, then sync. */

export function OfflineTile({ play }: TileDemoProps) {
  const at = useBeats({ online: 150, synced: 1000 }, play);
  const state = at("synced") ? "synced" : at("online") ? "syncing" : "waiting";
  return (
    <span className="flex h-12 w-fit items-center gap-2.5 rounded-xl bg-plate py-2 ps-2 pe-3.5 edge">
      <span className="grid size-8 place-items-center overflow-hidden rounded-lg bg-amber-soft">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={state}
            initial={{ scale: 0.5, opacity: 0, rotate: -30 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={SETTLE}
          >
            {state === "synced" ? (
              <Check aria-hidden="true" className="size-4 text-good" />
            ) : state === "syncing" ? (
              <RefreshCw aria-hidden="true" className="size-4 animate-spin text-amber-text" />
            ) : (
              <WifiOff aria-hidden="true" className="size-4 text-amber-text" />
            )}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="grid text-sm whitespace-nowrap text-text">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={state} {...swap}>
            {state === "synced" ? (
              <Trans>All synced</Trans>
            ) : state === "syncing" ? (
              <Trans>Syncing…</Trans>
            ) : (
              <Trans>6 reviews to sync</Trans>
            )}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}

/* Bring your decks: the apps Lymi imports from. Anki and Quizlet marks are from Simple Icons (CC0). */

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

export function ImportTile({ play }: TileDemoProps) {
  const at = useBeats({ a0: 60, a1: 160, a2: 260, a3: 360, a4: 460, done: 900 }, play);
  return (
    <ul className="flex flex-wrap gap-1">
      {APPS.map((app, i) => (
        <motion.li
          key={app.name}
          animate={{ y: at(`a${i}` as "a0") && !at("done") ? -5 : 0 }}
          transition={SETTLE}
          className={clsx(
            "flex h-7 items-center gap-1 rounded-full bg-plate pe-2 text-[11px] font-medium text-text edge",
            app.path ? "ps-1.5" : "ps-2",
          )}
        >
          {app.path && (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5" fill={app.color}>
              <path d={app.path} />
            </svg>
          )}
          {app.name}
        </motion.li>
      ))}
    </ul>
  );
}

/* Your data is yours: a deck saved as a file. */

export function ExportTile({ play }: TileDemoProps) {
  const at = useBeats({ going: 100, saved: 800 }, play);
  const state = at("saved") ? "saved" : at("going") ? "going" : "file";
  return (
    <span className="flex h-12 items-center gap-2 rounded-xl bg-plate py-2 ps-2 pe-3 edge">
      <span className="grid size-8 place-items-center overflow-hidden rounded-lg bg-amber-soft text-amber-text">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={state}
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={SWAP}
          >
            {state === "saved" ? (
              <Check aria-hidden="true" className="size-4 text-good" />
            ) : state === "going" ? (
              <Download aria-hidden="true" className="size-4" />
            ) : (
              <FileArchive aria-hidden="true" className="size-4" />
            )}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="text-sm font-medium text-text">German.apkg</span>
    </span>
  );
}

/* Insights: recall as one number, with the line that got it there. */

const RECALL = [62, 66, 64, 71, 74, 72, 78, 81, 80, 84, 87];
const CHART = { w: 168, h: 64, min: 55, max: 92 };

export function InsightsTile({ play }: TileDemoProps) {
  const { i18n } = useLingui();
  const still = useStill();
  const points = RECALL.map((v, i) => [
    (i / (RECALL.length - 1)) * CHART.w,
    CHART.h - ((v - CHART.min) / (CHART.max - CHART.min)) * CHART.h,
  ]);
  const d = points.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ");
  const [ex, ey] = points[points.length - 1] as [number, number];
  // At rest the line is whole; its turn draws it again from the start.
  const draw = play && !still;
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs text-text-2">
          <Trans>Recall</Trans>
        </p>
        <p className="mt-1 text-[56px] leading-none font-medium tracking-[-0.04em] text-text">
          {i18n.number(0.87, { style: "percent" })}
        </p>
      </div>
      <svg
        viewBox={`-4 -6 ${CHART.w + 8} ${CHART.h + 12}`}
        aria-hidden="true"
        className="mb-1 h-[76px] w-auto overflow-visible"
      >
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={0}
            x2={CHART.w}
            y1={f * CHART.h}
            y2={f * CHART.h}
            stroke="currentColor"
            className="text-text/10"
          />
        ))}
        <motion.path
          key={draw ? "draw" : "rest"}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-text/60"
          initial={{ pathLength: draw ? 0 : 1 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: EASE }}
        />
        <motion.circle
          key={draw ? "dot-draw" : "dot-rest"}
          cx={ex}
          cy={ey}
          r={4.5}
          className="fill-amber"
          initial={{ opacity: draw ? 0 : 1, scale: draw ? 0.3 : 1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...SETTLE, delay: draw ? 1 : 0 }}
        />
      </svg>
    </div>
  );
}

/* Help with the ones that slip: the word, with the days it was forgotten, and today's return. */

const HISTORY = ["forgot", "knew", "forgot", "forgot", "knew"] as const;

export function SlippingTile({ play }: TileDemoProps) {
  const { t } = useLingui();
  const at = useBeats({ back: 300 }, play);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3">
        <p lang="de" className="text-3xl leading-none font-medium tracking-[-0.03em] text-text">
          aufhören
        </p>
        <span className="rounded-full bg-amber-soft px-2.5 py-1 text-xs whitespace-nowrap text-amber-text">
          <Trans>Often forgotten</Trans>
        </span>
      </div>
      <p className="mt-1 text-sm text-text-2">{t`to stop`}</p>
      <div className="mt-3 flex gap-1">
        {HISTORY.map((each, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed history
            key={i}
            className={clsx(
              "h-2 flex-1 rounded-full",
              each === "forgot" ? "bg-text/60" : "bg-text/15",
            )}
          />
        ))}
        <span
          className={clsx(
            "relative h-2 flex-1 overflow-hidden rounded-full border border-dashed transition-colors duration-300",
            at("back") ? "border-transparent" : "border-text/25",
          )}
        >
          <motion.span
            className="absolute inset-0 origin-left rounded-full bg-amber rtl:origin-right"
            initial={false}
            animate={{ scaleX: at("back") ? 1 : 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          />
        </span>
      </div>
      <div className="mt-2 grid text-xs text-text-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={at("back") ? "back" : "history"} {...swap}>
            {at("back") ? (
              <Trans>Back in today’s Often forgotten round</Trans>
            ) : (
              <Trans>Forgot on 3 of the last 5 days</Trans>
            )}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
