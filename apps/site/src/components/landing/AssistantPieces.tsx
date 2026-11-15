import { Trans } from "@lingui/react/macro";
import { FileText, Folder, LifeBuoy, Link2, Repeat } from "lucide-react";
import { motion } from "motion/react";
import { type ReactNode, useMemo } from "react";
import { Lantern } from "../Lantern";
import { appear, EASE, usePlayback } from "./playback";
import { useShowcaseStage } from "./Showcase";

/*
 * The things a learner hands an assistant, and what comes back from Lymi, for the demos on the
 * assistant pages. Only cards are white; everything else sits on the demo's ground.
 */

/** A photo of a textbook page, as the learner sent it. */
export function PagePhoto({ lines, page }: { lines: readonly string[]; page: ReactNode }) {
  return (
    <div className="w-[168px] rotate-[2deg] rounded-md bg-canvas px-3.5 pt-2 pb-3 edge-drop">
      <p className="text-2xs text-ink-muted">{page}</p>
      <ul className="notes-hand mt-0.5 text-lg leading-[1.1] text-ink-secondary">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

/** A file or a link sent with the ask, as a chip. */
export function Attached({
  icon = <FileText aria-hidden="true" />,
  name,
  hint,
}: {
  icon?: ReactNode;
  name: string;
  hint: ReactNode;
}) {
  return (
    <span className="flex w-fit items-center gap-2.5 rounded-xl bg-plate py-2 ps-2 pe-4 edge-drop">
      <span className="grid size-8 place-items-center rounded-lg bg-plate-nested text-ink-secondary [&_svg]:size-4">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-medium text-ink">{name}</span>
        <span className="text-2xs text-ink-muted">{hint}</span>
      </span>
    </span>
  );
}

/** A link to a page, as a chip. */
export function LinkChip({ url }: { url: string }) {
  return <Attached icon={<Link2 aria-hidden="true" />} name={url} hint={<Trans>Web page</Trans>} />;
}

/** A folder of files, a few names showing. */
export function FolderChip({ name, files }: { name: string; files: readonly string[] }) {
  return (
    <div className="w-[220px] rounded-xl bg-plate p-2 edge-drop">
      <p className="flex items-center gap-2 px-1.5 pt-0.5 pb-1.5 text-sm font-medium text-ink">
        <Folder aria-hidden="true" className="size-4 text-ink-secondary" />
        {name}
      </p>
      <ul className="grid gap-0.5">
        {files.map((file) => (
          <li
            key={file}
            className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs text-ink-secondary"
          >
            <FileText aria-hidden="true" className="size-3.5" />
            {file}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A few lines of code, as the learner has them open. */
export function CodeChip({ name, lines }: { name: string; lines: readonly string[] }) {
  return (
    <div className="w-[248px] rounded-xl bg-plate p-3 edge-drop">
      <p className="text-2xs text-ink-muted">{name}</p>
      <pre className="mt-1 overflow-hidden font-mono text-xs leading-relaxed text-ink">
        {lines.join("\n")}
      </pre>
    </div>
  );
}

/** A post on X, quoted in the chat. */
export function Post({ text, lang }: { text: string; lang: string }) {
  return (
    <div className="w-[260px] rounded-xl bg-plate p-3 edge-drop">
      <p className="flex items-center gap-1.5 text-2xs text-ink-muted">
        <Link2 aria-hidden="true" className="size-3" />
        <Trans>Post on X</Trans>
      </p>
      <p lang={lang} className="mt-1 text-sm text-pretty text-ink">
        {text}
      </p>
    </div>
  );
}

/** A routine that runs on a schedule, switched on. */
export function RoutineChip({ when }: { when: ReactNode }) {
  return (
    <span className="flex w-fit items-center gap-2.5 rounded-xl bg-plate py-2 ps-2 pe-3 edge-drop">
      <span className="grid size-8 place-items-center rounded-lg bg-plate-nested text-ink-secondary">
        <Repeat aria-hidden="true" className="size-4" />
      </span>
      <span className="text-sm font-medium text-ink">{when}</span>
      <span aria-hidden="true" className="ms-1 h-5 w-8 shrink-0 rounded-full bg-success p-0.5">
        <span className="block size-4 translate-x-3 rounded-full bg-plate rtl:-translate-x-3" />
      </span>
    </span>
  );
}

export interface MiniCard {
  label: string;
  term: string;
  meaning: string;
}

/** Cards that landed in a deck, side by side, with a note such as what was skipped. */
export function CardsResult({
  cards,
  lang,
  note,
}: {
  cards: readonly MiniCard[];
  lang: string;
  note?: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <ul className="grid grid-cols-2 gap-2">
        {cards.map((card) => (
          <li key={card.term} className="min-w-0 rounded-xl bg-plate px-3 pt-2 pb-2.5 edge-drop">
            <p className="truncate text-2xs text-ink-muted">{card.label}</p>
            <p
              lang={lang}
              className="mt-0.5 truncate text-md font-medium tracking-[-0.015em] text-ink"
            >
              {card.term}
            </p>
            <p className="truncate text-xs text-ink-secondary">{card.meaning}</p>
          </li>
        ))}
      </ul>
      {note && <p className="text-xs text-ink-secondary">{note}</p>}
    </div>
  );
}

/** A new deck, its card count and the sections it was built in. */
export function DeckResult({
  name,
  count,
  sections,
  more,
}: {
  name: string;
  count: ReactNode;
  sections: readonly string[];
  /** Sections not shown, as a plain count after the named ones. */
  more?: number;
}) {
  return (
    <div className="rounded-2xl bg-plate p-3.5 edge-drop">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-md font-medium tracking-[-0.015em] text-ink">{name}</p>
        <p className="shrink-0 text-xs text-ink-secondary tabular-nums">{count}</p>
      </div>
      <ol className="mt-3 flex flex-wrap gap-1.5">
        {sections.map((section, i) => (
          <li
            key={section}
            className="flex items-center gap-1.5 rounded-full bg-plate-nested py-1 ps-1 pe-2.5 text-xs text-ink"
          >
            <span className="grid size-5 place-items-center rounded-full bg-plate text-2xs text-ink-secondary tabular-nums">
              {i + 1}
            </span>
            {section}
          </li>
        ))}
        {more ? (
          <li className="flex items-center rounded-full bg-plate-nested px-2.5 py-1 text-xs text-ink-secondary tabular-nums">
            +{more}
          </li>
        ) : null}
      </ol>
    </div>
  );
}

/** What is due today: the count, how long it takes, and in which decks. */
export function DueResult({
  count,
  time,
  decks,
}: {
  count: number;
  time: ReactNode;
  decks: readonly { name: string; due: number }[];
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-plate p-3.5 edge-drop">
      <div className="grid shrink-0 place-items-center">
        <Lantern className="size-9" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2">
          <span className="text-3xl font-medium tracking-[-0.03em] text-ink tabular-nums">
            {count}
          </span>
          <span className="text-sm text-ink-secondary">{time}</span>
        </p>
        <ul className="mt-1 flex flex-wrap gap-x-3 text-xs text-ink-secondary">
          {decks.map((deck) => (
            <li key={deck.name} className="tabular-nums">
              {deck.name} · {deck.due}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** The cards forgotten most, with how often. */
export function SlippingResult({
  words,
  lang,
}: {
  words: readonly { term: string; meaning: string; forgot: ReactNode }[];
  lang: string;
}) {
  return (
    <ul className="grid gap-1.5">
      {words.map((word) => (
        <li
          key={word.term}
          className="flex items-center justify-between gap-3 rounded-xl bg-plate px-3 py-2 edge-drop"
        >
          <span className="min-w-0">
            <span lang={lang} className="block truncate text-md font-medium text-ink">
              {word.term}
            </span>
            <span className="block truncate text-xs text-ink-secondary">{word.meaning}</span>
          </span>
          <span className="shrink-0 rounded-full bg-amber-soft px-2 py-0.5 text-xs font-medium text-amber-text tabular-nums">
            {word.forgot}
          </span>
        </li>
      ))}
    </ul>
  );
}

export interface Line {
  /** Who says it: the assistant, or the learner answering. */
  who: "assistant" | "you";
  text: string;
}

/**
 * A practice conversation in the chat, built from the learner's cards: Lymi hands over the cards,
 * then each turn is its own message, the assistant's on the left and the learner's on the right in
 * the same dark bubble as their request. A spoken one is a VoiceScene instead.
 */
export function ConversationResult({
  lines,
  lang,
  source,
}: {
  lines: readonly Line[];
  /** The language the lines are in, when it is not the page's. */
  lang?: string;
  /** Which of the learner's cards it used. */
  source: ReactNode;
}) {
  const { playing, still } = useShowcaseStage();
  // The turns arrive one after another, after the source line the exchange reveals first.
  const beats = useMemo(
    () => Object.fromEntries(lines.map((_, i) => [`turn${i}`, 1700 + i * 1200])),
    [lines],
  );
  const { at } = usePlayback(beats, playing, still);
  return (
    <div className="flex flex-col gap-2.5">
      <p className="flex min-w-0 items-center gap-2 text-xs text-ink-secondary">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-plate edge-drop">
          <Lantern className="size-4" />
        </span>
        <span className="truncate">{source}</span>
      </p>
      <ol lang={lang} className="flex flex-col gap-2">
        {lines.map((line, i) => (
          <motion.li
            key={line.text}
            initial={false}
            animate={appear(at(`turn${i}`))}
            transition={{ duration: still ? 0 : 0.45, ease: EASE }}
            className={
              line.who === "assistant"
                ? "w-fit max-w-[92%] rounded-2xl rounded-ss-md bg-plate px-4 py-2.5 text-md text-pretty text-ink edge-drop"
                : "w-fit max-w-[85%] self-end rounded-2xl rounded-ee-md bg-ink px-4 py-2.5 text-md text-pretty text-canvas"
            }
          >
            {line.text}
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

/** A card with the hint the assistant added, shown before the card turns over. */
export function HintResult({ term, hint }: { term: string; hint: ReactNode }) {
  return (
    <div className="rounded-2xl bg-plate p-4 edge-drop">
      <p className="text-xl font-medium tracking-[-0.02em] text-ink">{term}</p>
      <p className="mt-3 flex items-start gap-2 rounded-lg bg-plate-nested px-3 py-2 text-sm text-pretty text-ink">
        <LifeBuoy aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-secondary" />
        <span>{hint}</span>
      </p>
    </div>
  );
}
