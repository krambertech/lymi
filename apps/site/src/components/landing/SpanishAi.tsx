import { Trans } from "@lingui/react/macro";
import { motion, useInView } from "motion/react";
import { type ReactNode, useMemo, useRef } from "react";
import type { Locale } from "../../lib/routes";
import { Field } from "./JapaneseAi";
import { appear, usePlayback, useStill } from "./playback";

const Es = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span lang="es" className={className}>
    {children}
  </span>
);

const ENRICH_BEATS = { typed: 900, example: 1700, notes: 2500 };

/** What AI writes for the word each reader types; data per edition, as the decks' notes are. */
const WRITTEN: Record<Locale, { term: string; meaning: string; example: string; notes: string }> = {
  en: {
    term: "tener",
    meaning: "To have",
    example: "Tengo dos hermanos.",
    notes: "Present: tengo, tienes. Preterite: tuve. Tener hambre, to be hungry.",
  },
  uk: {
    term: "tener",
    meaning: "Мати",
    example: "Tengo dos hermanos.",
    notes: "Теперішній час: tengo, tienes. Претерит: tuve. Tener hambre: бути голодним.",
  },
  ru: {
    term: "tener",
    meaning: "Иметь",
    example: "Tengo dos hermanos.",
    notes: "Настоящее время: tengo, tienes. Претерит: tuve. Tener hambre: быть голодным.",
  },
};

/** A verb typed after a lesson; AI writes an example, and the irregular forms in this edition's labels. */
export function EnrichSpanish({ locale }: { locale: Locale }) {
  const root = useRef<HTMLDivElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.5 });
  const beats = useMemo(() => ENRICH_BEATS, []);
  const { at } = usePlayback(beats, inView, still);
  const card = WRITTEN[locale];

  return (
    <div ref={root} className="grid gap-2 rounded-xl bg-plate-nested p-3 edge-inset @2xl:p-4">
      <Field label={<Trans>Term</Trans>}>
        <Es className="min-h-[1.4em] text-2xl font-medium text-ink">
          {at("typed") ? card.term : card.term.slice(0, 3)}
        </Es>
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
          <Es>{card.example}</Es>
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
