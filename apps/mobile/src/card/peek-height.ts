import type { Card } from "@lymi/client/api";
import { splitForms } from "@lymi/client/deck-list";
import {
  drawsTermReading,
  hasReadings,
  shownTranslation,
  stripReadings,
  termShowsPronunciation,
} from "@lymi/core";
import { fitType } from "../theme/type";

/** Onest's letters average a little over half their size across. */
const lines = (text: string, size: number, width: number, most: number) =>
  Math.min(most, Math.max(1, Math.ceil((text.length * size * 0.55) / width)));

/** The padding, the deck line, the rule and the gaps between them, in points. */
const FRAME = 16 + 20 + 16 + 16 + 1 + 16 + 20;

/** The meaning's `text-xl`, which grows on its own ramp rather than by the reader's scale. */
const MEANING_SIZE = 22;
const MEANING_LEADING = 1.3;

/**
 * The peek's height, from what the card holds: iOS needs it before the peek is drawn, so it is
 * counted rather than measured, and a long card ends at the edge.
 */
export function peekHeight(card: Card, width: number, scale: number) {
  const inner = width - 40;
  const { word, forms } = splitForms(card.term);
  // Furigana stands a reading's line over each line it draws on, and then says the pronunciation.
  const drawn = drawsTermReading({ ...card, term: word });
  const shown = termShowsPronunciation({ ...card, term: word });
  const example = card.example && (hasReadings(card.example, card.language) ? 23 + 12 : 23);
  const translation = shownTranslation(card);
  const meaningSize = fitType(MEANING_SIZE, scale).drawn;
  const meaning =
    lines(card.meaning || "", meaningSize, inner, 3) * meaningSize * MEANING_LEADING;
  const text =
    lines(word, 34 * scale, inner, 2) * (drawn ? 41 + 21 : 41) +
    (forms ? 4 + 23 : 0) +
    (card.pronunciation && !shown ? 8 + 23 : 0) +
    // The translation runs on after the example, so the two wrap as one paragraph.
    (card.example && example
      ? 8 +
        lines(
          stripReadings(card.example, card.language) + (translation ? ` (${translation})` : ""),
          17 * scale,
          inner,
          translation ? 3 : 2,
        ) *
          example
      : 0);
  return Math.min(Math.round(FRAME + meaning + text * scale), 420);
}
