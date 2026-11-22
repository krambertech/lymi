import { WEEK } from "./clips";

export type Day = (typeof WEEK)[number];

/** The day `i` days after Monday, wrapping round the week either way. */
export const weekDay = (i: number): Day => WEEK[((i % 7) + 7) % 7] as Day;

/**
 * Four different days to choose from, in the week's order: the answer, any days that must be
 * offered (such as today, the usual slip when asked for tomorrow), and random others.
 */
export function dayChoices(
  answer: Day,
  include: readonly Day[] = [],
  random: () => number = Math.random,
): Day[] {
  const picked = new Set<Day>([answer, ...include]);
  const rest = WEEK.filter((each) => !picked.has(each));
  while (picked.size < 4 && rest.length > 0) {
    const [next] = rest.splice(Math.floor(random() * rest.length), 1);
    if (next) picked.add(next);
  }
  return WEEK.filter((each) => picked.has(each));
}
