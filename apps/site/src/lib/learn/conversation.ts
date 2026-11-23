import { type ConversationTurn, type LessonVoice, turnSentences } from "./clips";
import type { Timing } from "./passage";

export type SpeakerNames = Readonly<Partial<Record<LessonVoice, string>>>;

export function speakersOf(turns: readonly ConversationTurn[]): LessonVoice[] {
  return turns.flatMap((turn) => turnSentences(turn).map(() => turn.voice));
}

export interface NumberedTurn {
  voice: LessonVoice;
  sentences: readonly string[];
  first: number;
}

export function numberTurns(turns: readonly ConversationTurn[]): NumberedTurn[] {
  let first = 0;
  return turns.map((turn) => {
    const sentences = turnSentences(turn);
    const numbered = { voice: turn.voice, sentences, first };
    first += sentences.length;
    return numbered;
  });
}

export interface Lane {
  voice: LessonVoice;
  pieces: { sentence: number; start: number; end: number }[];
}

export function speakerLanes(
  speakers: readonly LessonVoice[],
  { marks, duration }: Timing,
): Lane[] {
  const lanes = new Map<LessonVoice, Lane>();
  speakers.forEach((voice, sentence) => {
    const lane = lanes.get(voice) ?? { voice, pieces: [] };
    lanes.set(voice, lane);
    lane.pieces.push({
      sentence,
      start: marks[sentence] ?? 0,
      end: marks[sentence + 1] ?? duration,
    });
  });
  return [...lanes.values()];
}

export type ExamPlays =
  | { status: "ready"; left: number }
  | { status: "playing"; left: number }
  | { status: "cut"; left: number; at: number };

export type ExamEvent =
  | { type: "started" }
  | { type: "ended" }
  | { type: "cut"; at: number }
  | { type: "restarted"; plays: number };

export const startExam = (plays: number): ExamPlays => ({ status: "ready", left: plays });

export function examReducer(state: ExamPlays, event: ExamEvent): ExamPlays {
  switch (event.type) {
    case "started":
      switch (state.status) {
        case "ready":
          return state.left > 0 ? { status: "playing", left: state.left - 1 } : state;
        case "cut":
          return { status: "playing", left: state.left };
        case "playing":
          return state;
      }
    case "ended":
      return state.status === "playing" ? { status: "ready", left: state.left } : state;
    case "cut":
      if (state.status !== "playing") return state;
      return event.at > 0
        ? { status: "cut", left: state.left, at: event.at }
        : { status: "ready", left: state.left + 1 };
    case "restarted":
      return startExam(event.plays);
  }
}
