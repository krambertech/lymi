/**
 * The key the duplicate rule compares. Trimmed, whitespace collapsed, case-folded,
 * Unicode-normalised so "é" typed two ways is one string. Accents are kept: "pesca" and
 * "pèsca" are different words. See ADR 0004.
 */
export function normaliseTerm(term: string): string {
  return term.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
