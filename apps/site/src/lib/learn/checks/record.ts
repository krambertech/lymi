/**
 * What a lesson's render passed to the kit, recorded by the wrappers `lesson-checks.test.ts` puts
 * around the kit's parts. A part's props hold what the page itself can't show: a quiz's items and
 * the order its runs take in the browser.
 */

export interface PartCall {
  /** The kit part: Quiz, GapPassage, Dialogue, Listening, Reading, Chips, Compare. */
  part: string;
  props: Record<string, unknown>;
}

export interface Recording {
  parts: PartCall[];
  /** Every `Word` on the page, as written in `w`, and whether the glossary has it. */
  words: { word: string; glossed: boolean; clip: string | null }[];
  /** Every clip the render asked for a URL of. */
  clips: { lesson: string; id: string }[];
  /** Every URL handed to the player, as a press plays it; a server render plays nothing. */
  played: string[];
  /** The props the lesson gave `LessonView`. */
  view: Record<string, unknown> | null;
}

export const recording: Recording = { parts: [], words: [], clips: [], played: [], view: null };

export function resetRecording() {
  recording.parts = [];
  recording.words = [];
  recording.clips = [];
  recording.played = [];
  recording.view = null;
}

/** Wraps a kit component so each render records its props, then renders the real one. */
export function recorded<P extends Record<string, unknown>, R>(
  part: string,
  component: (props: P) => R,
): (props: P) => R {
  return (props: P) => {
    recording.parts.push({ part, props });
    return component(props);
  };
}
