import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Sparkle } from "lucide-react";
import { motion, useInView } from "motion/react";
import { type ReactNode, useMemo, useRef } from "react";
import { appear, EASE, usePlayback, useStill } from "./playback";

/** The AI's mark on a field it wrote, as the card form shows it. */
function AiMark({ on }: { on: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex h-[17px] items-center rounded-full bg-ai-soft px-1.5 text-2xs font-semibold text-ai transition-opacity duration-300",
        !on && "opacity-0",
      )}
    >
      AI
    </span>
  );
}

export function Field({
  label,
  filling,
  wrote,
  children,
}: {
  label: ReactNode;
  filling?: boolean;
  wrote?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "grid min-h-16 gap-1 rounded-md bg-plate px-4 pt-3 pb-3.5 edge transition-shadow duration-300",
        filling && "shadow-[inset_0_0_0_1px_var(--color-ai),0_0_0_4px_var(--color-ai-soft)]",
      )}
    >
      <span className="flex items-center justify-between text-xs font-medium text-ink-muted">
        {label}
        {wrote !== undefined && <AiMark on={wrote} />}
      </span>
      {children}
    </div>
  );
}

/**
 * The hint field as the card form shows it: enrichment leaves it empty, and Draft asks the AI
 * for one. `pressed` shows the press, `drafted` swaps the button for the hint and its AI mark.
 */
export function HintField({
  pressed,
  drafted,
  children,
}: {
  pressed: boolean;
  drafted: boolean;
  children: ReactNode;
}) {
  return (
    <Field label={<Trans>Hint</Trans>} wrote={drafted}>
      <span className="grid min-h-[1.5em] items-center">
        <span
          aria-hidden={drafted}
          className={clsx(
            "col-start-1 row-start-1 inline-flex h-7 items-center gap-1.5 justify-self-start rounded-md px-2.5 text-xs font-medium text-ink edge transition-[opacity,transform,background-color] duration-200",
            pressed ? "scale-95 bg-plate-hover" : "bg-plate",
            drafted && "invisible opacity-0",
          )}
        >
          <Sparkle className="size-3.5 text-ai" aria-hidden="true" />
          <Trans>Draft</Trans>
        </span>
        <motion.span
          initial={false}
          animate={appear(drafted)}
          className="col-start-1 row-start-1 text-md text-ink"
        >
          {children}
        </motion.span>
      </span>
    </Field>
  );
}

const ENRICH_BEATS = {
  typed: 1000,
  reading: 1700,
  meaning: 2400,
  example: 3100,
  draft: 4000,
  hint: 4500,
  known: 5500,
};

/** A word typed after a lesson; the AI fills each empty field, then the words already known lose their readings. */
export function EnrichJapanese() {
  const root = useRef<HTMLDivElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.5 });
  const beats = useMemo(() => ENRICH_BEATS, []);
  const { at } = usePlayback(beats, inView, still);
  const known = at("known");
  const fade = (on: boolean) =>
    clsx("transition-[opacity,visibility] duration-500", on && "invisible opacity-0");

  return (
    <div ref={root} className="grid gap-2 rounded-xl bg-plate-nested p-3 edge-inset @2xl:p-4">
      <Field label={<Trans>Term</Trans>}>
        <span lang="ja" className="min-h-[1.4em] text-2xl font-medium text-ink">
          {at("typed") ? "乗り換える" : "乗り換"}
        </span>
      </Field>
      <Field label={<Trans>Reading</Trans>} wrote={at("reading")}>
        <motion.span
          lang="ja"
          initial={false}
          animate={appear(at("reading"))}
          className="min-h-[1.5em] text-md text-ink"
        >
          のりかえる
        </motion.span>
      </Field>
      <Field label={<Trans>Meaning</Trans>} wrote={at("meaning")}>
        <motion.span
          initial={false}
          animate={appear(at("meaning"))}
          className="min-h-[1.5em] text-md text-ink"
        >
          <Trans>To change (trains, buses)</Trans>
        </motion.span>
      </Field>
      <Field label={<Trans>Example</Trans>} wrote={at("example")}>
        <motion.span
          lang="ja"
          initial={false}
          animate={appear(at("example"))}
          className="min-h-[2.2em] text-md leading-[2.2] text-ink"
        >
          <ruby>
            次<rt className={clsx("text-[0.5em] text-ink-secondary", fade(known))}>つぎ</rt>
          </ruby>
          の
          <ruby>
            駅<rt className={clsx("text-[0.5em] text-ink-secondary", fade(known))}>えき</rt>
          </ruby>
          で
          <ruby>
            乗<rt className="text-[0.5em] text-ink-secondary">の</rt>
          </ruby>
          り
          <ruby>
            換<rt className="text-[0.5em] text-ink-secondary">か</rt>
          </ruby>
          えます。
        </motion.span>
        <span
          className={clsx(
            "text-xs text-ink-muted transition-opacity duration-500",
            !known && "opacity-0",
          )}
        >
          <Trans>
            No reading over <span lang="ja">次</span> and <span lang="ja">駅</span>: you already
            know them.
          </Trans>
        </span>
      </Field>
      <HintField pressed={at("draft")} drafted={at("hint")}>
        <Trans>
          <span lang="ja">乗る</span> to get on, plus <span lang="ja">換える</span> to swap: you get
          on a different train.
        </Trans>
      </HintField>
    </div>
  );
}

const PHOTO_ROWS = [
  { kana: "でんしゃ", gloss: "train", pick: 0 },
  { kana: "ともだち", gloss: "friend", pick: 1 },
  { kana: "こうえん", gloss: "park" },
  { kana: "のりかえます", gloss: "change trains", pick: 2 },
  { kana: "えき", gloss: "station" },
] as const;

const PHOTO_BEATS = { pick0: 600, card0: 1400, pick1: 1800, card1: 2600, pick2: 3000, card2: 3800 };
const PICKS = ["pick0", "pick1", "pick2"] as const;
const CARDS = ["card0", "card1", "card2"] as const;

/** A photographed textbook page; the words picked out of it land as cards with their readings. */
export function PageToCards() {
  const { t } = useLingui();
  const root = useRef<HTMLDivElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.5 });
  const beats = useMemo(() => PHOTO_BEATS, []);
  const { at } = usePlayback(beats, inView, still);

  const made = [
    {
      term: [
        ["電", "でん"],
        ["車", "しゃ"],
      ],
      meaning: t`Train`,
    },
    {
      term: [
        ["友", "とも"],
        ["達", "だち"],
      ],
      meaning: t`Friend`,
    },
    { term: [["乗", "の"], ["り"], ["換", "か"], ["える"]], meaning: t`To change trains` },
  ];

  return (
    <div ref={root} className="grid items-center gap-6 @xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div
        lang="ja"
        aria-hidden="true"
        className="relative mx-2 my-3 -rotate-2 rounded-xs bg-[oklch(0.97_0.006_85)] px-5 py-5 text-base leading-10 text-[oklch(0.25_0.02_60)] shadow-[0_0_0_1px_var(--color-edge),0_24px_40px_-24px_oklch(0_0_0/0.45)]"
      >
        <span className="absolute -start-2.5 -top-2.5 size-4 rounded-ss-sm border-s-2 border-t-2 border-amber" />
        <span className="absolute -end-2.5 -top-2.5 size-4 rounded-se-sm border-e-2 border-t-2 border-amber" />
        <span className="absolute -start-2.5 -bottom-2.5 size-4 rounded-es-sm border-s-2 border-b-2 border-amber" />
        <span className="absolute -end-2.5 -bottom-2.5 size-4 rounded-ee-sm border-e-2 border-b-2 border-amber" />
        <p className="mb-1 flex justify-between border-b border-[oklch(0.25_0.02_60/0.25)] text-xs font-bold">
          <span>第5課　ことば</span>
          <span>p.42</span>
        </p>
        {PHOTO_ROWS.map((row) => (
          <p
            key={row.kana}
            className={clsx(
              "flex items-baseline justify-between gap-2 rounded-xs px-1 transition-colors duration-500",
              // A row lights while it is being picked and clears once its card has landed.
              "pick" in row &&
                at(PICKS[row.pick]) &&
                !at(CARDS[row.pick]) &&
                "bg-[oklch(0.85_0.12_80/0.55)]",
            )}
          >
            <span>{row.kana}</span>
            <span lang="en" className="font-sans text-xs text-[oklch(0.45_0.02_60)]">
              {row.gloss}
            </span>
          </p>
        ))}
      </div>
      <ul className="grid gap-2">
        {made.map((card, i) => (
          <motion.li
            key={card.meaning}
            initial={false}
            animate={appear(at(CARDS[i] as (typeof CARDS)[number]))}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex items-end justify-between gap-3 rounded-lg bg-plate px-4 py-3 edge"
          >
            <span
              lang="ja"
              className="text-[26px] leading-[1.7] font-medium whitespace-nowrap text-ink"
            >
              {card.term.map(([kanji, reading]) =>
                reading ? (
                  <ruby key={kanji}>
                    {kanji}
                    <rt className="text-[0.45em] text-ink-secondary">{reading}</rt>
                  </ruby>
                ) : (
                  kanji
                ),
              )}
            </span>
            <span className="mb-2 truncate text-md text-ink-secondary">{card.meaning}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
