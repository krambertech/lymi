/**
 * How a learner who stops listening could still pick the answer: by the shape of the options, by
 * the place the answer takes, or by a cheap rule such as "the longest one". The lesson checks run
 * these over a quiz's simulated runs and a gap passage's gaps.
 */

/** One round as a learner sees it: the options' visible text, where the answer is, what it plays. */
export interface PickRound {
  options: readonly string[];
  answer: number;
  /** The text of the round's clip, when it has one. */
  heard?: string | undefined;
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
  pick: (options: readonly string[], heard?: string) => number[];
  /** How a quiz stops the rule working. */
  fix: string;
  /** The rounds the rule says something about; every round when absent. */
  applies?: (round: PickRound) => boolean;
}

/** How many letters two words share at their start. */
const sharedStart = (a: string, b: string) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
};

/** Whether the clip says the answer as written, so matching what is heard is the task itself. */
const saidAsWritten = (round: PickRound) =>
  ` ${plain(round.heard ?? "")} `.includes(` ${plain(round.options[round.answer] ?? "")} `);

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
    fix: "choose wrong options as long as the answer, or longer and shorter than it in turn",
    pick: (options) => byLength(options, (length, lengths) => length === Math.max(...lengths)),
  },
  {
    name: "pick the shortest",
    fix: "choose wrong options as long as the answer, or longer and shorter than it in turn",
    pick: (options) => byLength(options, (length, lengths) => length === Math.min(...lengths)),
  },
  {
    name: "pick the middle length",
    fix: "choose wrong options as long as the answer, or longer and shorter than it in turn",
    pick: (options) =>
      byLength(
        options,
        (length, lengths) => length > Math.min(...lengths) && length < Math.max(...lengths),
      ),
  },
  {
    name: "pick the one with no one-letter neighbour",
    fix: "give the answer a wrong option one letter away from it, as the others have",
    pick: (options) => {
      const alone = all(options).filter(
        (i) => !options.some((other, j) => j !== i && oneLetterApart(options[i] as string, other)),
      );
      return alone.length ? alone : all(options);
    },
  },
  {
    name: "pick the one sharing the most leading letters with a word heard",
    fix: "choose wrong options that start the way the heard word does, such as other forms of it",
    pick: (options, heard = "") => {
      const words = plain(heard).split(" ");
      const shared = options.map((option) =>
        Math.max(...words.map((word) => sharedStart(plain(option), word))),
      );
      const most = Math.max(...shared);
      return most > 0 ? all(options).filter((i) => shared[i] === most) : all(options);
    },
    applies: (round) => round.heard !== undefined && !saidAsWritten(round),
  },
];

/**
 * A strategy's expected share right over the rounds it applies to, and chance's, from 0 to 1, and
 * how many rounds that was.
 */
export function strategyScore(strategy: Strategy, rounds: readonly PickRound[]) {
  const scored = rounds.filter((round) => strategy.applies?.(round) ?? true);
  let score = 0;
  let chance = 0;
  for (const round of scored) {
    const picked = strategy.pick(round.options, round.heard);
    if (picked.includes(round.answer)) score += 1 / picked.length;
    chance += 1 / round.options.length;
  }
  const of = Math.max(1, scored.length);
  return { score: score / of, chance: chance / of, rounds: scored.length };
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
