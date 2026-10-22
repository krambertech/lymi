import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { motion, useInView } from "motion/react";
import { useMemo, useRef } from "react";
import { Field } from "./JapaneseAi";
import { appear, EASE, usePlayback, useStill } from "./playback";

const BEATS = { typed: 1000, meaning: 1700, forms: 2400, example: 3100, hook: 3800 };

/** A word typed after a lesson; the AI fills each empty field, starting with its three forms. */
export function EnrichEstonian() {
  const root = useRef<HTMLDivElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.5 });
  const beats = useMemo(() => BEATS, []);
  const { at } = usePlayback(beats, inView, still);

  return (
    <div ref={root} className="grid gap-2 rounded-xl bg-plate-2 p-3 edge-inset @2xl:p-4">
      <Field label={<Trans>Term</Trans>}>
        <span lang="et" className="min-h-[1.4em] text-2xl font-medium text-text">
          {at("typed") ? "sõber" : "sõb"}
        </span>
      </Field>
      <Field label={<Trans>Meaning</Trans>} wrote={at("meaning")}>
        <motion.span
          initial={false}
          animate={appear(at("meaning"))}
          className="min-h-[1.5em] text-md text-text"
        >
          <Trans>Friend</Trans>
        </motion.span>
      </Field>
      <Field label={<Trans>Notes</Trans>} wrote={at("forms")}>
        <motion.span
          lang="et"
          initial={false}
          animate={appear(at("forms"))}
          className="min-h-[1.5em] text-md text-text italic"
        >
          sõber · sõbra · sõpra
        </motion.span>
      </Field>
      <Field label={<Trans>Example</Trans>} wrote={at("example")}>
        <motion.span
          lang="et"
          initial={false}
          animate={appear(at("example"))}
          className="min-h-[1.5em] text-md text-text"
        >
          Ma lähen <span className="text-amber-text">sõbraga</span> kinno.
        </motion.span>
      </Field>
      <Field label={<Trans>Memory hook</Trans>} wrote={at("hook")}>
        <motion.span
          initial={false}
          animate={appear(at("hook"))}
          className="min-h-[1.5em] text-md text-text"
        >
          <Trans>
            <span lang="et">Sõber</span> sounds like “sober”: the friend who gets you home.
          </Trans>
        </motion.span>
      </Field>
    </div>
  );
}

const NOTE_ROWS = [
  { term: "broneerima", gloss: msg`to book`, card: 0 },
  { term: "ühistransport", gloss: msg`public transport`, card: 1 },
  { term: "palun" },
  { term: "kallis", gloss: msg`expensive`, card: 2 },
] as const;

const NOTE_BEATS = {
  pick0: 600,
  card0: 1400,
  pick1: 1800,
  card1: 2600,
  skip: 3000,
  pick2: 3600,
  card2: 4400,
};
const NOTE_PICKS = ["pick0", "pick1", "pick2"] as const;
const NOTE_CARDS = ["card0", "card1", "card2"] as const;

/** A photographed page of class notes; its new words land as cards, and the one already kept is skipped. */
export function NotesToCardsEstonian() {
  const { t, i18n } = useLingui();
  const root = useRef<HTMLDivElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.5 });
  const beats = useMemo(() => NOTE_BEATS, []);
  const { at } = usePlayback(beats, inView, still);
  const made = [
    { term: "broneerima", meaning: t`To book; to reserve` },
    { term: "ühistransport", meaning: t`Public transport` },
    { term: "kallis", meaning: t`Expensive; dear` },
  ];

  return (
    <div
      ref={root}
      className="mt-12 grid items-center gap-8 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @4xl:mt-16 @4xl:gap-14"
    >
      <div
        lang="et"
        aria-hidden="true"
        className="relative mx-2 my-3 -rotate-2 rounded-xs bg-[oklch(0.97_0.006_85)] notes-hand px-6 py-5 text-[26px] leading-[2.1] text-[oklch(0.25_0.02_60)] shadow-[0_0_0_1px_var(--color-edge),0_24px_40px_-24px_oklch(0_0_0/0.45)]"
      >
        <span className="absolute -start-2.5 -top-2.5 size-4 rounded-ss-sm border-s-2 border-t-2 border-amber" />
        <span className="absolute -end-2.5 -top-2.5 size-4 rounded-se-sm border-e-2 border-t-2 border-amber" />
        <span className="absolute -start-2.5 -bottom-2.5 size-4 rounded-es-sm border-s-2 border-b-2 border-amber" />
        <span className="absolute -end-2.5 -bottom-2.5 size-4 rounded-ee-sm border-e-2 border-b-2 border-amber" />
        <p className="mb-1 flex justify-between border-b border-[oklch(0.25_0.02_60/0.25)] font-sans text-xs leading-8 font-bold">
          <span>Eesti keel · teisipäev</span>
          <span>A2</span>
        </p>
        {NOTE_ROWS.map((row) => (
          <p
            key={row.term}
            className={clsx(
              "flex items-baseline justify-between gap-3 rounded-xs px-1 transition-colors duration-500",
              // A row lights while it is being read and clears once its card has landed.
              "card" in row &&
                at(NOTE_PICKS[row.card]) &&
                !at(NOTE_CARDS[row.card]) &&
                "bg-[oklch(0.85_0.12_80/0.55)]",
              !("card" in row) && at("skip") && "text-[oklch(0.25_0.02_60/0.4)] line-through",
            )}
          >
            <span>{row.term}</span>
            <span lang={i18n.locale} className="text-xl text-[oklch(0.45_0.02_60)]">
              {"card" in row ? `= ${t(row.gloss)}` : ""}
            </span>
          </p>
        ))}
      </div>
      <div className="grid gap-2">
        {made.map((card, i) => (
          <motion.div
            key={card.term}
            initial={false}
            animate={appear(at(NOTE_CARDS[i] as (typeof NOTE_CARDS)[number]))}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex items-baseline justify-between gap-3 rounded-lg bg-plate px-4 py-3.5 edge"
          >
            <span lang="et" className="truncate text-xl font-medium text-text">
              {card.term}
            </span>
            <span className="shrink-0 text-md text-text-2">{card.meaning}</span>
          </motion.div>
        ))}
        <motion.p
          initial={false}
          animate={appear(at("skip"))}
          className="flex items-baseline justify-between gap-3 px-4 pt-1 text-sm text-muted"
        >
          <span lang="et">palun</span>
          <Trans>Already in your deck, so it’s skipped</Trans>
        </motion.p>
      </div>
    </div>
  );
}
