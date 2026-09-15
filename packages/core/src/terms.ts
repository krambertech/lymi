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
  const text = normaliseTerm(description);
  return [card.term, card.meaning]
    .map((field) => normaliseTerm(field ?? ""))
    .some((answer) => answer.length >= 3 && text.includes(answer));
}
