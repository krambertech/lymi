import { Trans } from "@lingui/react/macro";
import { motion, useInView } from "motion/react";
import { type ReactNode, useMemo, useRef } from "react";
import type { Locale } from "../../lib/routes";
import { Field } from "./JapaneseAi";
import { appear, usePlayback, useStill } from "./playback";

const Pl = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span lang="pl" className={className}>
    {children}
  </span>
);

const ENRICH_BEATS = { typed: 900, example: 1700, notes: 2500 };

/** What AI writes for the word each reader types; data per edition, as the decks' notes are. */
const WRITTEN: Record<Locale, { term: string; meaning: string; example: string; notes: string }> = {
  en: {
    term: "pies",
    meaning: "Dog",
    example: "Nie mam psa, ale mam kota.",
    notes: "Genitive: psa. Plural: psy. The e drops out in every form but this one.",
  },
  uk: {
    term: "dywan",
    meaning: "Килим",
    example: "Kot śpi na dywanie.",
    notes: "Не диван: диван польською — kanapa. Родовий: dywanu.",
  },
  ru: {
    term: "dywan",
    meaning: "Ковёр",
    example: "Kot śpi na dywanie.",
    notes: "Не диван: диван по-польски — kanapa. Родительный: dywanu.",
  },
};

/** A word typed after a lesson; AI writes an example, and the note a reader of this edition needs. */
export function EnrichPolish({ locale }: { locale: Locale }) {
  const root = useRef<HTMLDivElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.5 });
  const beats = useMemo(() => ENRICH_BEATS, []);
  const { at } = usePlayback(beats, inView, still);
  const card = WRITTEN[locale];

  return (
    <div ref={root} className="grid gap-2 rounded-xl bg-plate-2 p-3 edge-inset @2xl:p-4">
      <Field label={<Trans>Term</Trans>}>
        <Pl className="min-h-[1.4em] text-2xl font-medium text-text">
          {at("typed") ? card.term : card.term.slice(0, 3)}
        </Pl>
      </Field>
      <Field label={<Trans>Meaning</Trans>}>
        <span lang={locale} className="min-h-[1.5em] text-md text-text">
          {card.meaning}
        </span>
      </Field>
      <Field label={<Trans>Example</Trans>} wrote={at("example")}>
        <motion.span
          initial={false}
          animate={appear(at("example"))}
          className="min-h-[1.5em] text-md text-text"
        >
          <Pl>{card.example}</Pl>
        </motion.span>
      </Field>
      <Field label={<Trans>Notes</Trans>} wrote={at("notes")}>
        <motion.span
          initial={false}
          animate={appear(at("notes"))}
          lang={locale}
          className="min-h-[1.5em] text-md text-text"
        >
          {card.notes}
        </motion.span>
      </Field>
    </div>
  );
}
