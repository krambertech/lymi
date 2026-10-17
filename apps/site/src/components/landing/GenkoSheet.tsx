import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import { Furigana } from "./Furigana";

type Glyph = { text: string; reading?: string };
type Column = { glyphs: Glyph[]; known?: boolean };

const kana = (text: string): Glyph[] => [...text].map((g) => ({ text: g }));

/** A beginner's first pages, right to left: kana, then words in kanji that become known. */
const COLUMNS: Column[] = [
  { glyphs: kana("あいうえお") },
  { glyphs: kana("アイウエオ") },
  { glyphs: [{ text: "食", reading: "た" }, { text: "べ" }, { text: "る" }], known: true },
  {
    glyphs: [
      { text: "毎", reading: "まい" },
      { text: "日", reading: "にち" },
    ],
    known: true,
  },
  {
    glyphs: [
      { text: "日", reading: "に" },
      { text: "本", reading: "ほん" },
      { text: "語", reading: "ご" },
    ],
    known: true,
  },
  {
    glyphs: [
      { text: "漢", reading: "かん" },
      { text: "字", reading: "じ" },
    ],
  },
];

const ROWS = 7;
const STROKE_MS = 120;
const COLUMN_MS = 260;
const KNOWN_FROM_MS = 5200;
const KNOWN_STEP_MS = 650;

/** When each glyph is inked, and when each known column lets its furigana go. */
function timeline() {
  let at = 400;
  let known = KNOWN_FROM_MS;
  return COLUMNS.map((column) => {
    const ink = column.glyphs.map(() => {
      const t = at;
      at += STROKE_MS;
      return t;
    });
    at += COLUMN_MS;
    const fades = column.known ? known : null;
    if (column.known) known += KNOWN_STEP_MS;
    return { ink, fades };
  });
}

const TIMES = timeline();
const ms = (value: number) => `${value}ms`;

/**
 * The hero's sheet of genkō yōshi, the squared paper Japanese is practised on. Kana ink in first;
 * then kanji with their furigana in the paper's own reading gutter, which fades from each word as
 * it becomes known, as Lymi's review does. Played by CSS, so it runs from the prerendered page.
 */
export function GenkoSheet() {
  const { t } = useLingui();
  return (
    <figure className="relative mx-auto w-full max-w-[470px] [--cell:clamp(2.25rem,9.5vw,3.25rem)]">
      <p className="sr-only">
        {t`Japanese written on squared manuscript paper: あいうえお, アイウエオ, then 食べる, 毎日, 日本語 and 漢字 with their readings beside the kanji. The readings fade from the words already known.`}
      </p>
      <div className="relative">
        <div
          aria-hidden="true"
          dir="ltr"
          className="rounded-2xl bg-plate p-4 shadow-[0_18px_50px_-30px_var(--color-veil)] edge @2xl:p-5"
        >
          <div className="flex flex-row-reverse justify-center border-y border-edge-2 font-mincho text-text">
            {COLUMNS.map((column, c) => {
              const time = TIMES[c] as (typeof TIMES)[number];
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: columns in a fixed order
                <div key={c} className="flex border-s border-edge-2 first:border-e">
                  <div className="grid">
                    {Array.from({ length: ROWS }, (_, r) => {
                      const glyph = column.glyphs[r];
                      const markHere = column.known && r === column.glyphs.length;
                      return (
                        <span
                          // biome-ignore lint/suspicious/noArrayIndexKey: squares in a fixed order
                          key={r}
                          className="grid size-(--cell) place-items-center border-b border-edge last:border-b-0 text-[calc(var(--cell)*0.6)] leading-none"
                        >
                          {glyph && (
                            <span
                              className="genko-ink"
                              style={{ "--ink": ms(time.ink[r] ?? 0) } as CSSProperties}
                            >
                              {glyph.text}
                            </span>
                          )}
                          {markHere && time.fades !== null && (
                            <span
                              className="genko-mark grid size-[calc(var(--cell)*0.42)] place-items-center rounded-full bg-good-soft text-state-known"
                              style={{ "--known": ms(time.fades + 500) } as CSSProperties}
                            >
                              <Check strokeWidth={2.5} className="size-[70%]" />
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                  {/* The reading gutter: furigana runs down beside its kanji, as on the paper. */}
                  <div className="grid w-[calc(var(--cell)*0.42)]">
                    {Array.from({ length: ROWS }, (_, r) => {
                      const reading = column.glyphs[r]?.reading;
                      return (
                        <span
                          // biome-ignore lint/suspicious/noArrayIndexKey: squares in a fixed order
                          key={r}
                          className="grid h-(--cell) place-items-center"
                        >
                          {reading && (
                            <span
                              className={clsx(
                                "text-[calc(var(--cell)*0.26)] leading-[1.05] text-state-learning-text [writing-mode:vertical-rl]",
                                column.known ? "genko-known" : "genko-ink",
                              )}
                              style={
                                {
                                  "--ink": ms((time.ink[r] ?? 0) + 180),
                                  "--known": ms(time.fades ?? 0),
                                } as CSSProperties
                              }
                            >
                              {reading}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* The card the last word became, still learning, so its reading stays. */}
        <div
          aria-hidden="true"
          className="genko-ink absolute -bottom-24 start-2 w-[min(15rem,62%)] @2xl:-bottom-10 -rotate-3 rounded-2xl bg-plate p-4 shadow-[0_24px_60px_-28px_var(--color-veil)] edge @2xl:-start-8"
          style={{ "--ink": ms(KNOWN_FROM_MS + 3 * KNOWN_STEP_MS + 400) } as CSSProperties}
        >
          <p className="flex items-center justify-between gap-2 text-xs font-medium tracking-[0.06em] text-muted uppercase">
            <span>
              <span lang="ja">日本語</span> · <Trans>noun</Trans>
            </span>
            <span className="rounded-full bg-state-learning-soft px-2 py-0.5 text-2xs tracking-normal text-state-learning-text normal-case">
              <Trans>Learning</Trans>
            </span>
          </p>
          <p lang="ja" className="mt-3 text-4xl leading-[1.25] font-medium text-text">
            <Furigana term="漢字" reading="かんじ" lang="ja" />
          </p>
          <p className="mt-2 border-t border-edge pt-2 text-md text-text-2">
            <Trans>Chinese characters</Trans>
          </p>
        </div>
      </div>

      <figcaption className="mt-30 flex flex-wrap @2xl:mt-16 items-center justify-center gap-x-5 gap-y-2 text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-state-learning" />
          <Trans>Furigana while you learn a word</Trans>
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-state-known" />
          <Trans>Gone once you know it</Trans>
        </span>
      </figcaption>
    </figure>
  );
}
