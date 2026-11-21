import { sentenceWords } from "../practice";

/**
 * What is wrong with an order item: every answer must use the same words, and
 * the tiles must hold them.
 */
export function orderProblems(answers: readonly string[], tiles?: readonly string[]): string[] {
  const problems: string[] = [];
  const sorted = (words: readonly string[]) =>
    [...words]
      .map((w) => w.toLowerCase())
      .sort()
      .join(" ");
  const [first, ...others] = answers;
  if (first === undefined) return ["no answers"];
  const words = sorted(sentenceWords(first));
  for (const other of others)
    if (sorted(sentenceWords(other)) !== words)
      problems.push(`"${other}" uses other words than "${first}"`);
  if (tiles) {
    const left = tiles.map((tile) => tile.toLowerCase());
    for (const word of sentenceWords(first)) {
      const at = left.indexOf(word.toLowerCase());
      if (at === -1) problems.push(`no tile for "${word}"`);
      else left.splice(at, 1);
    }
  }
  return problems;
}
