/**
 * What is due today, as Today and the widgets count it. While the decks are as of the
 * last sync, their counts miss every grade since, so the draw's count on the device stands instead.
 */
export function dueToday(
  decks: readonly { due: number }[],
  left: number | undefined,
  kept: boolean,
): number {
  return kept && left !== undefined ? left : decks.reduce((n, d) => n + d.due, 0);
}
