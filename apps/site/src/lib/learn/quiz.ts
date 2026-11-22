/**
 * One quiz on a lesson page: a few rounds, each one listened to and then answered, then a score.
 * A round can't be answered before its sound has played.
 */
export type QuizState =
  | { status: "asking"; round: number; rounds: number; heard: boolean; results: readonly boolean[] }
  | {
      status: "answered";
      round: number;
      rounds: number;
      picked: string;
      right: boolean;
      results: readonly boolean[];
    }
  | { status: "finished"; rounds: number; results: readonly boolean[] };

export type QuizEvent =
  | { type: "heard" }
  | { type: "answered"; picked: string; right: boolean }
  | { type: "next" }
  | { type: "restarted" };

export function startQuiz(rounds: number): QuizState {
  return { status: "asking", round: 0, rounds, heard: false, results: [] };
}

export function quizReducer(state: QuizState, event: QuizEvent): QuizState {
  switch (event.type) {
    case "heard":
      return state.status === "asking" && !state.heard ? { ...state, heard: true } : state;
    case "answered":
      if (state.status !== "asking" || !state.heard) return state;
      return {
        status: "answered",
        round: state.round,
        rounds: state.rounds,
        picked: event.picked,
        right: event.right,
        results: [...state.results, event.right],
      };
    case "next":
      if (state.status !== "answered") return state;
      if (state.round + 1 >= state.rounds)
        return { status: "finished", rounds: state.rounds, results: state.results };
      // The next round's sound plays as it opens, so it counts as heard.
      return {
        status: "asking",
        round: state.round + 1,
        rounds: state.rounds,
        heard: true,
        results: state.results,
      };
    case "restarted":
      return startQuiz(state.rounds);
  }
}

/** Fisher–Yates: every order equally likely. */
export function shuffle<T>(list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** A run's order: `pinned` first when given, the rest shuffled. */
export function shuffledRun<T>(items: readonly T[], pinned?: T): T[] {
  return pinned === undefined
    ? shuffle(items)
    : [pinned, ...shuffle(items.filter((item) => item !== pinned))];
}

/**
 * Items that come in pairs, each pair once before any pair comes back. A pinned first item counts
 * as its pair's turn.
 */
export function eachPairFirst<T extends { pair: readonly [string, string] }>(
  items: readonly T[],
  pinned?: T,
): T[] {
  const rest = shuffle(items.filter((item) => item !== pinned));
  const seen = new Set<string>(pinned ? [pinned.pair[0]] : []);
  const first = rest.filter((item) => !seen.has(item.pair[0]) && !!seen.add(item.pair[0]));
  const later = rest.filter((item) => !first.includes(item));
  return [...(pinned ? [pinned] : []), ...first, ...later];
}

/**
 * Items in pairs as two cycles: each pair key once, then each key once more, so a run of twice the
 * keys asks every key exactly twice. A pinned first item counts as its key's first turn.
 */
export function twoCycles<T extends { pair: readonly [string, string] }>(
  items: readonly T[],
  pinned?: T,
): T[] {
  const keys = new Set(items.map((item) => item.pair[0])).size;
  const first = eachPairFirst(items, pinned).slice(0, keys);
  return [...first, ...eachPairFirst(items.filter((item) => !first.includes(item)))];
}

export const rightCount = (state: QuizState): number => state.results.filter(Boolean).length;

/**
 * A typed number, read the way a learner might type it: a currency, spaces, dashes between digits,
 * thousands separators, a decimal comma, leading zeros.
 */
export function normalizeTyped(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/€|eur(?:ot|os|o)?\b/g, "")
      .replace(/\s+/g, "")
      .replace(/(?<=\d)[-‐–]+(?=\d)/g, "")
      // A comma or point before exactly three digits groups thousands: 12,000 and 12.000 are 12000.
      .replace(/[.,](?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".")
      .replace(/^0+(?=\d)/, "")
      .replace(/\.0+$/, "")
      .replace(/(\.\d*?)0+$/, "$1")
  );
}

export function typedMatches(value: string, answers: readonly string[]): boolean {
  const typed = normalizeTyped(value);
  return typed !== "" && answers.some((answer) => normalizeTyped(answer) === typed);
}
