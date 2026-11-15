import type { MessageDescriptor } from "@lingui/core";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight, Check, Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import { type Exam, examPath } from "../../lib/exams";
import { trayStyle } from "../../lib/tray";

/** The tray hues a language bento walks through, from Explore's shelf colours; violet is AI's. */
export const BENTO_HUES = [235, 150, 25, 350] as const;

/** One tile on a tray, as the homepage bento sets them. `wide` runs it across the whole grid. */
export function Tile({
  hue,
  title,
  body,
  wide,
  children,
}: {
  hue: number;
  title: ReactNode;
  body: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      style={trayStyle(hue)}
      className={clsx(
        "use-case-tile flex min-w-0 flex-col gap-2 rounded-[20px] p-6 @2xl:p-7",
        wide && "@3xl:col-span-full",
      )}
    >
      <h3 className="text-xl font-medium tracking-[-0.02em] text-ink">{title}</h3>
      <p className="max-w-[44ch] text-md text-pretty text-ink-secondary">{body}</p>
      <div className="mt-auto pt-5">{children}</div>
    </div>
  );
}

/**
 * A language page's bento. "pairs": two tiles a row. "wide": the first tile spans the top and three
 * sit under it.
 */
export function LanguageBento({
  layout = "pairs",
  children,
}: {
  layout?: "pairs" | "wide";
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "mt-12 grid gap-2.5 @4xl:mt-16",
        layout === "wide" ? "@3xl:grid-cols-3" : "@3xl:grid-cols-2",
      )}
    >
      {children}
    </div>
  );
}

export interface SampleExample {
  text: string;
  translation: MessageDescriptor;
}

/** Examples as a card shows them: the sentence, its translation, and the speaker that reads it. */
export function Examples({ lang, examples }: { lang: string; examples: readonly SampleExample[] }) {
  const { i18n } = useLingui();
  return (
    <div aria-hidden="true" className="grid gap-2 @3xl:grid-cols-2">
      {examples.map((example) => (
        <div key={example.text} className="relative rounded-md bg-plate px-4 py-3.5 pe-12 edge">
          <p lang={lang} className="text-lg text-ink">
            {example.text}
          </p>
          <p className="mt-1 text-md text-ink-muted">{i18n._(example.translation)}</p>
          <span className="absolute end-3 top-3 grid size-8 place-items-center rounded-full bg-plate-nested text-ink-secondary">
            <Volume2 className="size-4" />
          </span>
        </div>
      ))}
    </div>
  );
}

/** What comes across, each with a tick. */
export function CheckList({ items }: { items: readonly ReactNode[] }) {
  return (
    <ul className="grid gap-1.5 text-md text-ink">
      {items.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of sentences
        <li key={i} className="flex items-center gap-2.5">
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-success-soft text-success">
            <Check aria-hidden="true" className="size-3" strokeWidth={3} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/** A word with its note beside it, as a card's face shows them. */
export function NoteRows({
  lang,
  rows,
}: {
  lang: string;
  rows: readonly { term: string; note: ReactNode; noteLang?: string }[];
}) {
  return (
    <div aria-hidden="true" className="grid gap-2">
      {rows.map((row) => (
        <p
          key={row.term}
          className="flex items-baseline justify-between gap-3 rounded-md bg-plate px-4 py-3 edge"
        >
          <span lang={lang} className="text-xl font-medium text-ink">
            {row.term}
          </span>
          <span lang={row.noteLang} className="text-md text-ink-secondary">
            {row.note}
          </span>
        </p>
      ))}
    </div>
  );
}

/** One word's meaning in each language the ready-made decks are written in; data, so never translated. */
export function Meanings({
  lang,
  term,
  meanings,
}: {
  lang: string;
  term: string;
  meanings: readonly { language: string; lang: string; meaning: string }[];
}) {
  return (
    <div aria-hidden="true" className="rounded-md bg-plate edge">
      <p
        lang={lang}
        className="border-b border-edge px-3.5 py-3 text-xl font-medium tracking-[-0.02em] text-ink"
      >
        {term}
      </p>
      {meanings.map((m) => (
        <p
          key={m.lang}
          className="flex items-baseline justify-between gap-3 px-3.5 py-2.5 not-last:border-b not-last:border-edge"
        >
          <span lang={m.lang} className="text-md text-ink">
            {m.meaning}
          </span>
          <span lang={m.lang} className="text-sm text-ink-muted">
            {m.language}
          </span>
        </p>
      ))}
    </div>
  );
}

/** A front, as the card shows it before the turn. */
function Face({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-[104px] content-between gap-3 rounded-md bg-plate p-3.5 edge">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      <span className="text-2xl font-medium tracking-[-0.02em] text-ink">{children}</span>
    </div>
  );
}

/** The same card asked from each side: the word, then the meaning. */
export function BothWays({
  lang,
  term,
  meaning,
}: {
  lang: string;
  term: string;
  meaning: ReactNode;
}) {
  return (
    <div aria-hidden="true" className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <Face label={<Trans>What does it mean?</Trans>}>
        <span lang={lang}>{term}</span>
      </Face>
      <ArrowRight className="size-4 text-ink-muted rtl:-scale-x-100" />
      <Face label={<Trans>How do you say it?</Trans>}>{meaning}</Face>
    </div>
  );
}

/** An exam's page, as a deck on the tile: its name and summary, read from the exam itself. */
export function ExamLink({ exam }: { exam: Exam | undefined }) {
  const { i18n } = useLingui();
  if (!exam) return null;
  return (
    <a
      href={examPath(exam, i18n.locale)}
      className="flex items-center gap-3 rounded-md bg-plate px-4 py-3.5 edge transition-[background-color,scale] duration-150 ease-out active:scale-[0.98] hoverable:hover:bg-plate-hover"
    >
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-md font-medium text-ink">{i18n._(exam.name)}</span>
        <span className="text-sm text-ink-muted">{i18n._(exam.summary)}</span>
      </span>
      <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-ink-muted rtl:-scale-x-100" />
    </a>
  );
}
