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

export const rightCount = (state: QuizState): number => state.results.filter(Boolean).length;

/** A typed number, read the way a learner might type it: spaces, a decimal comma, leading zeros. */
export function normalizeTyped(value: string): string {
  return value
    .replace(/\s+/g, "")
    .replace(",", ".")
    .replace(/^0+(?=\d)/, "")
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}

export function typedMatches(value: string, answers: readonly string[]): boolean {
  const typed = normalizeTyped(value);
  return typed !== "" && answers.some((answer) => normalizeTyped(answer) === typed);
}
