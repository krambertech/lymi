import type { MessageDescriptor } from "@lingui/core";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { motion, useInView } from "motion/react";
import { useMemo, useRef } from "react";
import { appear, EASE, usePlayback, useStill } from "./playback";

const BEATS = {
  pick0: 600,
  card0: 1400,
  pick1: 1800,
  card1: 2600,
  skip: 3000,
  pick2: 3600,
  card2: 4400,
};
const PICKS = ["pick0", "pick1", "pick2"] as const;
const CARDS = ["card0", "card1", "card2"] as const;

export interface NotebookRow {
  term: string;
  /** What the learner wrote beside it; a row without one is a word they already know. */
  gloss?: MessageDescriptor;
  /** Which of the three new cards this row becomes. */
  card?: 0 | 1 | 2;
}

interface Props {
  lang: string;
  /** The page's top line: the class and the level. */
  heading: [string, string];
  rows: readonly NotebookRow[];
  /** The three cards, as Lymi writes them; a term can differ from the notebook's, as a stress mark does. */
  cards: readonly [NotebookCard, NotebookCard, NotebookCard];
  /** The word already in the deck, so it is skipped. */
  skipped: string;
}

export interface NotebookCard {
  term: string;
  meaning: MessageDescriptor;
}

/** A photographed page of class notes; its new words land as cards, and the one already kept is skipped. */
export function NotebookToCards({ lang, heading, rows, cards, skipped }: Props) {
  const { i18n } = useLingui();
  const root = useRef<HTMLDivElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.5 });
  const beats = useMemo(() => BEATS, []);
  const { at } = usePlayback(beats, inView, still);

  return (
    <div
      ref={root}
      className="mt-12 grid items-center gap-8 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @4xl:mt-16 @4xl:gap-14"
    >
      <div
        lang={lang}
        aria-hidden="true"
        className="relative mx-2 my-3 -rotate-2 rounded-xs bg-[oklch(0.97_0.006_85)] notes-hand px-6 py-5 text-[26px] leading-[2.1] text-[oklch(0.25_0.02_60)] shadow-[0_0_0_1px_var(--color-edge),0_24px_40px_-24px_oklch(0_0_0/0.45)]"
      >
        <span className="absolute -start-2.5 -top-2.5 size-4 rounded-ss-sm border-s-2 border-t-2 border-amber" />
        <span className="absolute -end-2.5 -top-2.5 size-4 rounded-se-sm border-e-2 border-t-2 border-amber" />
        <span className="absolute -start-2.5 -bottom-2.5 size-4 rounded-es-sm border-s-2 border-b-2 border-amber" />
        <span className="absolute -end-2.5 -bottom-2.5 size-4 rounded-ee-sm border-e-2 border-b-2 border-amber" />
        <p className="mb-1 flex justify-between border-b border-[oklch(0.25_0.02_60/0.25)] font-sans text-xs leading-8 font-bold">
          <span>{heading[0]}</span>
          <span>{heading[1]}</span>
        </p>
        {rows.map((row) => (
          <p
            key={row.term}
            className={clsx(
              "flex items-baseline justify-between gap-3 rounded-xs px-1 transition-colors duration-500",
              // A row lights while it is being read and clears once its card has landed.
              row.card !== undefined &&
                at(PICKS[row.card]) &&
                !at(CARDS[row.card]) &&
                "bg-[oklch(0.85_0.12_80/0.55)]",
              row.card === undefined && at("skip") && "text-[oklch(0.25_0.02_60/0.4)] line-through",
            )}
          >
            <span>{row.term}</span>
            <span lang={i18n.locale} className="text-xl text-[oklch(0.45_0.02_60)]">
              {row.gloss ? `= ${i18n._(row.gloss)}` : ""}
            </span>
          </p>
        ))}
      </div>
      <div className="grid gap-2">
        {cards.map((card, i) => (
          <motion.div
            key={card.term}
            initial={false}
            animate={appear(at(CARDS[i] as (typeof CARDS)[number]))}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex items-baseline justify-between gap-3 rounded-lg bg-plate px-4 py-3.5 edge"
          >
            <span lang={lang} className="truncate text-xl font-medium text-ink">
              {card.term}
            </span>
            <span className="shrink-0 text-md text-ink-secondary">{i18n._(card.meaning)}</span>
          </motion.div>
        ))}
        <motion.p
          initial={false}
          animate={appear(at("skip"))}
          className="flex items-baseline justify-between gap-3 px-4 pt-1 text-sm text-ink-muted"
        >
          <span lang={lang}>{skipped}</span>
          <Trans>Already in your deck, so it’s skipped</Trans>
        </motion.p>
      </div>
    </div>
  );
}
