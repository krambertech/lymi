/**
 * The key the duplicate rule compares. Trimmed, whitespace collapsed, case-folded,
 * Unicode-normalised so "é" typed two ways is one string. Accents are kept: "pesca" and
 * "pèsca" are different words. See ADR 0004.
 */
export function normaliseTerm(term: string): string {
  return term.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/** A picture description that contains the term or the meaning would show the answer before reveal. */
export function revealsAnswer(
  card: { term: string; meaning?: string | null | undefined },
  description: string,
): boolean {
  return revealedAnswer(card, description) !== null;
}

/** Which field a description gives away, and that field's text, so a refusal can name it. */
export function revealedAnswer(
  card: { term: string; meaning?: string | null | undefined },
  description: string,
): { field: "term" | "meaning"; text: string } | null {
  const text = normaliseTerm(description);
  for (const field of ["term", "meaning"] as const) {
    const answer = card[field] ?? "";
    const key = normaliseTerm(answer);
    if (key.length >= 3 && text.includes(key)) return { field, text: answer };
  }
  return null;
}

/** Pronunciation is generated for a term up to this long; a longer one is a passage, not a word to say. */
export const SPOKEN_TERM_MAX = 200;

/** Whether a card's term can be spoken: it has a language and is short enough. */
export function canSpeakTerm(card: {
  term: string;
  language?: string | null | undefined;
}): boolean {
  return !!card.language && Array.from(card.term).length <= SPOKEN_TERM_MAX;
}
