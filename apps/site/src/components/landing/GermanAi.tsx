import { Trans } from "@lingui/react/macro";
import { motion, useInView } from "motion/react";
import { type ReactNode, useMemo, useRef } from "react";
import type { Locale } from "../../lib/routes";
import { Field } from "./JapaneseAi";
import { appear, usePlayback, useStill } from "./playback";

const De = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span lang="de" className={className}>
    {children}
  </span>
);

const ENRICH_BEATS = { typed: 900, example: 1700, notes: 2500 };

/** What AI writes for the word each reader types; data per edition, as the decks' notes are. */
const WRITTEN: Record<Locale, { term: string; meaning: string; example: string; notes: string }> = {
  en: {
    term: "fahren",
    meaning: "To go (by vehicle); to drive",
    example: "Morgen fahre ich nach Berlin.",
    notes: "Present: er fährt. Past: fuhr. Perfect: ist gefahren.",
  },
  uk: {
    term: "fahren",
    meaning: "Їхати; керувати (авто)",
    example: "Morgen fahre ich nach Berlin.",
    notes: "Теперішній час: er fährt. Претерит: fuhr. Перфект: ist gefahren.",
  },
  ru: {
    term: "fahren",
    meaning: "Ехать; водить (машину)",
    example: "Morgen fahre ich nach Berlin.",
    notes: "Настоящее время: er fährt. Претерит: fuhr. Перфект: ist gefahren.",
  },
};

/** A strong verb typed after a lesson; AI writes an example, and its forms in this edition's labels. */
export function EnrichGerman({ locale }: { locale: Locale }) {
  const root = useRef<HTMLDivElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.5 });
  const beats = useMemo(() => ENRICH_BEATS, []);
  const { at } = usePlayback(beats, inView, still);
  const card = WRITTEN[locale];

  return (
    <div ref={root} className="grid gap-2 rounded-xl bg-plate-nested p-3 edge-inset @2xl:p-4">
      <Field label={<Trans>Term</Trans>}>
        <De className="min-h-[1.4em] text-2xl font-medium text-ink">
          {at("typed") ? card.term : card.term.slice(0, 3)}
        </De>
      </Field>
      <Field label={<Trans>Meaning</Trans>}>
        <span lang={locale} className="min-h-[1.5em] text-md text-ink">
          {card.meaning}
        </span>
      </Field>
      <Field label={<Trans>Example</Trans>} wrote={at("example")}>
        <motion.span
          initial={false}
          animate={appear(at("example"))}
          className="min-h-[1.5em] text-md text-ink"
        >
          <De>{card.example}</De>
        </motion.span>
      </Field>
      <Field label={<Trans>Notes</Trans>} wrote={at("notes")}>
        <motion.span
          initial={false}
          animate={appear(at("notes"))}
          lang={locale}
          className="min-h-[1.5em] text-md text-ink"
        >
          {card.notes}
        </motion.span>
      </Field>
    </div>
  );
}
