import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { FileText, Tag } from "lucide-react";
import { motion, useInView } from "motion/react";
import { type ReactNode, useMemo, useRef } from "react";
import { Field } from "./JapaneseAi";
import { Pinyin } from "./Pinyin";
import { appear, EASE, usePlayback, useStill } from "./playback";

const Zh = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span lang="zh-Hans" className={className}>
    {children}
  </span>
);

const ENRICH_BEATS = { typed: 900, reading: 1600, example: 2400, hint: 3200 };

/** A word typed after a lesson; AI fills each empty field and marks it, and known characters lose their pinyin. */
export function EnrichChinese() {
  const root = useRef<HTMLDivElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.5 });
  const beats = useMemo(() => ENRICH_BEATS, []);
  const { at } = usePlayback(beats, inView, still);

  return (
    <div ref={root} className="grid gap-2 rounded-xl bg-plate-2 p-3 edge-inset @2xl:p-4">
      <Field label={<Trans>Term</Trans>}>
        <Zh className="min-h-[1.4em] text-2xl font-medium text-text">
          {at("typed") ? "换乘" : "换"}
        </Zh>
      </Field>
      <Field label={<Trans>Pinyin</Trans>} wrote={at("reading")}>
        <motion.span
          initial={false}
          animate={appear(at("reading"))}
          className="min-h-[1.5em] text-md text-text"
        >
          huànchéng
        </motion.span>
      </Field>
      <Field label={<Trans>Meaning</Trans>}>
        <span className="min-h-[1.5em] text-md text-text">
          <Trans>To change lines (metro, trains)</Trans>
        </span>
      </Field>
      <Field label={<Trans>Example</Trans>} wrote={at("example")}>
        <motion.span
          initial={false}
          animate={appear(at("example"))}
          className="min-h-[2.2em] text-2xl leading-[1.9] text-text"
        >
          {/* The term's size, not the other fields': any smaller and each syllable's pinyin spaces its character out. */}
          <Zh>
            <Pinyin
              term="我们在这里换乘二号线。"
              pinyin="wǒ men zài zhè lǐ huàn chéng èr hào xiàn"
              hidden={(i) => i <= 4}
            />
          </Zh>
        </motion.span>
        <span className="text-xs text-muted">
          <Trans>
            No pinyin over <Zh>我们在这里</Zh>: you know those characters.
          </Trans>
        </span>
      </Field>
      <Field label={<Trans>Hint</Trans>} wrote={at("hint")}>
        <motion.span
          initial={false}
          animate={appear(at("hint"))}
          className="min-h-[1.5em] text-md text-text"
        >
          <Trans>
            <Zh>换</Zh> to swap, <Zh>乘</Zh> to ride: you swap the line you ride.
          </Trans>
        </motion.span>
      </Field>
    </div>
  );
}

const NOTE_ROWS: { zh: string; gloss: MessageDescriptor; pick?: number }[] = [
  { zh: "打车", gloss: msg`take a taxi`, pick: 0 },
  { zh: "堵车", gloss: msg`traffic jam` },
  { zh: "地铁站", gloss: msg`metro station`, pick: 1 },
  { zh: "换乘", gloss: msg`to change lines`, pick: 2 },
  { zh: "快到了", gloss: msg`almost there` },
];

const NOTE_MADE = [
  { term: "打车", pinyin: "dǎ chē", meaning: msg`To take a taxi` },
  { term: "地铁站", pinyin: "dì tiě zhàn", meaning: msg`Metro station` },
  { term: "换乘", pinyin: "huàn chéng", meaning: msg`To change lines` },
];

const NOTE_BEATS = { pick0: 600, card0: 1400, pick1: 1800, card1: 2600, pick2: 3000, card2: 3800 };
const NOTE_PICKS = ["pick0", "pick1", "pick2"] as const;
const NOTE_CARDS = ["card0", "card1", "card2"] as const;
/** A Tuesday, for the notebook's date in the reader's language. */
const LESSON_DAY = new Date(2026, 9, 20);

/** A tutor's notes in a notebook; the words picked out land as cards with pinyin. */
export function NotesToCardsChinese() {
  const { i18n } = useLingui();
  const root = useRef<HTMLDivElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.5 });
  const beats = useMemo(() => NOTE_BEATS, []);
  const { at } = usePlayback(beats, inView, still);
  const picking = (pick: number | undefined) => {
    const p = NOTE_PICKS[pick ?? -1];
    const c = NOTE_CARDS[pick ?? -1];
    return !!p && !!c && at(p) && !at(c);
  };

  return (
    <div ref={root} className="grid items-center gap-6 @xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div
        aria-hidden="true"
        className="relative mx-2 my-3 rotate-1 rounded-xs bg-[oklch(0.97_0.006_85)] px-5 py-5 text-base leading-10 whitespace-nowrap text-[oklch(0.25_0.02_60)] shadow-[0_0_0_1px_var(--color-edge),0_24px_40px_-24px_oklch(0_0_0/0.45)]"
      >
        <p className="notes-hand mb-1 flex justify-between gap-4 border-b border-[oklch(0.25_0.02_60/0.25)] text-xl">
          <span>
            <Trans>Lesson 4 · getting around</Trans>
          </span>
          <span>{i18n.date(LESSON_DAY, { weekday: "short" })}</span>
        </p>
        {NOTE_ROWS.map((row) => (
          <p
            key={row.zh}
            className={clsx(
              "flex items-baseline justify-between gap-2 rounded-xs px-1 transition-colors duration-500",
              picking(row.pick) && "bg-[oklch(0.85_0.12_80/0.55)]",
            )}
          >
            <Zh className="text-lg">{row.zh}</Zh>
            <span className="notes-hand text-xl text-[oklch(0.45_0.02_60)]">
              {i18n._(row.gloss)}
            </span>
          </p>
        ))}
      </div>
      <ul className="grid gap-2">
        {NOTE_MADE.map((card, i) => (
          <motion.li
            key={card.term}
            initial={false}
            animate={appear(at(NOTE_CARDS[i] ?? "card2"))}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex items-end justify-between gap-3 rounded-lg bg-plate px-4 py-2 edge"
          >
            <Zh className="text-[26px] leading-[1.7] font-medium whitespace-nowrap text-text">
              <Pinyin term={card.term} pinyin={card.pinyin} />
            </Zh>
            <span className="mb-2 truncate text-md text-text-2">{i18n._(card.meaning)}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

interface PlecoCard {
  term: string;
  traditional: string;
  numbers: string;
  pinyin: string;
  definition: MessageDescriptor;
}

/** A Pleco export: `//` lines name categories, and each card line is simplified[traditional], pinyin and definition. */
const PLECO_EXPORT: { category: MessageDescriptor; cards: PlecoCard[] }[] = [
  {
    category: msg`Restaurant`,
    cards: [
      {
        term: "服务员",
        traditional: "服務員",
        numbers: "fu2wu4yuan2",
        pinyin: "fú wù yuán",
        definition: msg`waiter`,
      },
      {
        term: "好吃",
        traditional: "好吃",
        numbers: "hao3chi1",
        pinyin: "hǎo chī",
        definition: msg`tasty`,
      },
    ],
  },
  {
    category: msg`Lesson 4`,
    cards: [
      {
        term: "银行",
        traditional: "銀行",
        numbers: "yin2hang2",
        pinyin: "yín háng",
        definition: msg`bank`,
      },
    ],
  },
];

const PLECO_BEATS = { l0: 500, c0: 1200, l1: 1700, c1: 2400, l2: 2900, c2: 3600 };
const PLECO_LINES = ["l0", "l1", "l2"] as const;
const PLECO_CARDS = ["c0", "c1", "c2"] as const;

/** A Pleco export, read line by line; each card lands with its category as a tag and the other script as a note. */
export function PlecoImport() {
  const { i18n } = useLingui();
  const root = useRef<HTMLDivElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.4 });
  const beats = useMemo(() => PLECO_BEATS, []);
  const { at } = usePlayback(beats, inView, still);
  const cards = PLECO_EXPORT.flatMap(({ category, cards }) =>
    cards.map((card) => ({ ...card, category })),
  );
  const reading = (i: number) => {
    const line = PLECO_LINES[i];
    const card = PLECO_CARDS[i];
    return !!line && !!card && at(line) && !at(card);
  };

  return (
    <div className="mt-12 @4xl:mt-16">
      <div
        ref={root}
        className="grid items-start gap-5 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @3xl:gap-10"
      >
        <div aria-hidden="true" className="rounded-xl bg-plate p-4 edge">
          <p className="flex items-center gap-2 border-b border-edge pb-3 text-sm text-text-2">
            <FileText className="size-4 text-muted" />
            pleco-flashcards.txt
          </p>
          <div className="mt-3 grid gap-1 text-sm leading-7 @2xl:text-md">
            {PLECO_EXPORT.map(({ category, cards: lines }) => (
              <div key={category.id} className="grid gap-1">
                <p className="text-muted">
                  {"// "}
                  {i18n._(category)}
                </p>
                {lines.map((line) => {
                  const i = cards.findIndex((c) => c.term === line.term);
                  return (
                    <p
                      key={line.term}
                      // A line wraps between its fields, never inside one, so the file never scrolls sideways.
                      className={clsx(
                        "-mx-1.5 flex flex-wrap gap-x-2 rounded-xs px-1.5 transition-colors duration-500 *:whitespace-nowrap",
                        reading(i) && "bg-amber-soft",
                      )}
                    >
                      <Zh className="text-text">
                        {line.term}[{line.traditional}]
                      </Zh>
                      <span className="text-text-2">{line.numbers}</span>
                      <span className="text-muted">{i18n._(line.definition)}</span>
                    </p>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <ul className="grid gap-2">
          {cards.map((card, i) => (
            <motion.li
              key={card.term}
              initial={false}
              animate={appear(at(PLECO_CARDS[i] ?? "c2"))}
              transition={{ duration: 0.5, ease: EASE }}
              className="rounded-lg bg-plate px-4 pt-2 pb-3 edge"
            >
              <div className="flex items-end justify-between gap-3">
                <Zh className="text-[28px] leading-[1.7] font-medium text-text">
                  <Pinyin term={card.term} pinyin={card.pinyin} />
                </Zh>
                <span className="mb-2 truncate text-md text-text-2">{i18n._(card.definition)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-plate-2 px-2 py-0.5 text-text-2 edge-inset">
                  <Tag aria-hidden="true" className="size-3" />
                  {i18n._(card.category)}
                </span>
                {card.traditional !== card.term && (
                  <span className="rounded-full bg-plate-2 px-2 py-0.5 text-text-2 edge-inset">
                    <Trans>
                      Note: <span lang="zh-Hant">{card.traditional}</span>
                    </Trans>
                  </span>
                )}
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
