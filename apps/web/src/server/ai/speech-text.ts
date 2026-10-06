export function speechText(term: string): string {
  // Spaced middle dots separate forms; an internal dot can be part of a word such as col·legi.
  return term.replace(/(?<=\S)\s+·\s+(?=\S)/gu, ", ");
}
