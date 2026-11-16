import { type HTMLMotionProps, motion } from "motion/react";
import type { ReactNode } from "react";

interface Props extends Omit<HTMLMotionProps<"li">, "className" | "children"> {
  /** The deck or language and the kind of word, as the card's label shows it. */
  label: ReactNode;
  term: string;
  meaning: ReactNode;
  /** The language of the term. */
  lang?: string | undefined;
}

/**
 * A card at the size of a chat reply or a tile: white and lifted, its label in the product's
 * uppercase, then the term and its meaning. An item in a list of cards; motion props let each
 * one land on its own beat.
 */
export function SmallCard({ label, term, meaning, lang, ...beat }: Props) {
  return (
    <motion.li {...beat} className="min-w-0 rounded-xl bg-plate px-3 pt-2 pb-2.5 edge-drop">
      <p className="truncate text-2xs font-medium tracking-[0.06em] text-ink-muted uppercase">
        {label}
      </p>
      <p lang={lang} className="mt-0.5 truncate text-md font-medium tracking-[-0.015em] text-ink">
        {term}
      </p>
      <p className="truncate text-xs text-ink-secondary">{meaning}</p>
    </motion.li>
  );
}
