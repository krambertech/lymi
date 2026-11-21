/**
 * How a learner who stops listening could still pick the answer: by the shape of the options, by
 * the place the answer takes, or by a cheap rule such as "the longest one". The lesson checks run
 * these over a quiz's simulated runs and a gap passage's gaps.
 */

/** One round as a learner sees it: the options' visible text and where the answer is. */
export interface PickRound {
  options: readonly string[];
  answer: number;
}

/** Lower case, letters, digits and single spaces: what a learner compares by eye. */
export const plain = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const letters = (text: string) => plain(text).replace(/ /g, "").length;

/**
 * Whether one option is the other plus one or two letters at its start or end, as kooli is kool
 * plus i. Such options let the learner pick by shape: the one between the others. A one-letter
 * option is an ending or a sound, not a word with letters added, and digits are not letters.
 */
export function nearPair(a: string, b: string): boolean {
  const [short, long] = [plain(a), plain(b)].sort((x, y) => x.length - y.length) as [
    string,
    string,
  ];
  const size = long.length - short.length;
  if (letters(short) < 2 || (size !== 1 && size !== 2)) return false;
  const extra = long.startsWith(short)
    ? long.slice(short.length)
    : long.endsWith(short)
      ? long.slice(0, size)
      : "";
  return /^\p{L}+$/u.test(extra);
}

/** Whether two options are one letter apart: one changed, added or dropped. */
export function oneLetterApart(a: string, b: string): boolean {
  const [x, y] = [[...plain(a)], [...plain(b)]].sort((p, q) => p.length - q.length) as [
    string[],
    string[],
  ];
  if (y.length - x.length > 1) return false;
  let i = 0;
  while (i < x.length && x[i] === y[i]) i++;
  if (x.length === y.length)
    return i < x.length && x.slice(i + 1).join("") === y.slice(i + 1).join("");
  return x.slice(i).join("") === y.slice(i + 1).join("");
}

/** A rule a learner could follow without listening: the options it would pick from at random. */
export interface Strategy {
  name: string;
  pick: (options: readonly string[]) => number[];
}

const all = (options: readonly string[]) => options.map((_, i) => i);
const byLength = (
  options: readonly string[],
  keep: (length: number, lengths: number[]) => boolean,
) => {
  const lengths = options.map(letters);
  const picked = all(options).filter((i) => keep(lengths[i] as number, lengths));
  return picked.length ? picked : all(options);
};

export const STRATEGIES: readonly Strategy[] = [
  {
    name: "pick the longest",
    pick: (options) => byLength(options, (length, lengths) => length === Math.max(...lengths)),
  },
  {
    name: "pick the shortest",
    pick: (options) => byLength(options, (length, lengths) => length === Math.min(...lengths)),
  },
  {
    name: "pick the middle length",
    pick: (options) =>
      byLength(
        options,
        (length, lengths) => length > Math.min(...lengths) && length < Math.max(...lengths),
      ),
  },
  {
    name: "pick the one with no one-letter neighbour",
    pick: (options) => {
      const alone = all(options).filter(
        (i) => !options.some((other, j) => j !== i && oneLetterApart(options[i] as string, other)),
      );
      return alone.length ? alone : all(options);
    },
  },
];

/** A strategy's expected share right over the rounds, and chance's, from 0 to 1. */
export function strategyScore(strategy: Strategy, rounds: readonly PickRound[]) {
  let score = 0;
  let chance = 0;
  for (const round of rounds) {
    const picked = strategy.pick(round.options);
    if (picked.includes(round.answer)) score += 1 / picked.length;
    chance += 1 / round.options.length;
  }
  return { score: score / rounds.length, chance: chance / rounds.length };
}

/**
 * The most a place may take of the answers among `count` options: about twice its fair share, and
 * three in four when there are only two.
 */
export const fairCap = (count: number): number => (count === 2 ? 0.75 : 2 / count);

/** How often the answer takes each place, among rounds of `count` options. */
export function placeShares(rounds: readonly PickRound[], count: number): number[] {
  const of = rounds.filter((round) => round.options.length === count);
  const counts = Array.from({ length: count }, () => 0);
  for (const round of of) counts[round.answer] = (counts[round.answer] ?? 0) + 1;
  return counts.map((each) => each / of.length);
}

/** A small seeded random source, so a simulated run comes out the same every time. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
