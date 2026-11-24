/**
 * The logic behind the practice parts: a passage heard or read with questions after it, a passage
 * with gaps, and a dialogue. docs/design/estonian-lessons.md says when a lesson uses each.
 */

/** When each sentence of a recorded passage starts, and how long the take lasts, in seconds. */
export interface Timing {
  marks: readonly number[];
  duration: number;
}

/** A clip's loudness, as `loudness()` in player.ts measures it: 12 ms steps after `lead` seconds. */
export interface Loudness {
  bars: readonly number[];
  lead: number;
}

/** One sentence's stretch of a recording, drawn as bars from 0 to 1. */
export interface SentenceBars {
  start: number;
  end: number;
  bars: number[];
}

/** Room each bar takes with its gap, and the gap between sentences, in pixels. */
const BAR = 6;
const SENTENCE_GAP = 6;

/**
 * A recording's sound as bars, a group per sentence, as many as fit `width` pixels. Each bar is
 * the loudest 12 ms step under it, so a word never vanishes between two bars.
 */
export function sentenceBars(sound: Loudness, timing: Timing, width: number): SentenceBars[] {
  const { marks, duration } = timing;
  const room = Math.max(0, width - SENTENCE_GAP * (marks.length - 1));
  const level = (from: number, to: number) => {
    const first = Math.max(0, Math.floor((from - sound.lead) / 0.012));
    const last = Math.min(sound.bars.length, Math.ceil((to - sound.lead) / 0.012));
    let loudest = 0;
    for (let i = first; i < last; i++) loudest = Math.max(loudest, sound.bars[i] ?? 0);
    return loudest;
  };
  return marks.map((start, i) => {
    const end = marks[i + 1] ?? duration;
    const count = Math.max(3, Math.floor(((end - start) / duration) * (room / BAR)));
    const step = (end - start) / count;
    return {
      start,
      end,
      bars: Array.from({ length: count }, (_, j) =>
        level(start + j * step, start + (j + 1) * step),
      ),
    };
  });
}

/** The sentence playing at `seconds`, or the last one before it. */
export function sentenceAt(marks: readonly number[], seconds: number): number {
  let at = 0;
  for (let i = 0; i < marks.length; i++) if ((marks[i] ?? 0) <= seconds + 0.05) at = i;
  return at;
}

/** A piece of a sentence: a word the lesson's glossary knows, or the text between such words. */
export type Piece = { word: string } | { text: string };

/**
 * Splits text into words the glossary has and the text around them, so a passage can open word
 * cards. Glossary keys are lowercase; a word matches in any case.
 */
export function glossPieces(text: string, has: (word: string) => boolean): Piece[] {
  const pieces: Piece[] = [];
  let plain = "";
  for (const part of text.split(/([\p{L}\p{M}-]+)/u)) {
    if (part && /^[\p{L}\p{M}-]+$/u.test(part) && has(part.toLowerCase())) {
      if (plain) pieces.push({ text: plain });
      plain = "";
      pieces.push({ word: part });
    } else plain += part;
  }
  if (plain) pieces.push({ text: plain });
  return pieces;
}

/** Punctuation that closes onto the word before it, with no space: “Tallinnas.”, “(sina)”. */
const CLOSES = /^[.,!?;:…)\]»”’]/u;
/** Punctuation that opens onto the word after it: “«Tere»”. */
const OPENS = /[([«„“‘]$/u;

/** Whether a gap's word is spaced from the text before it. */
export function spacedBefore(before: string): boolean {
  return before !== "" && !OPENS.test(before);
}

/** Whether a gap's word is spaced from the text after it. */
export function spacedAfter(after: string): boolean {
  return after !== "" && !CLOSES.test(after);
}

export function closingPunctuation(after: string): readonly [string, string] {
  const closing = /^[.,!?;:…)\]»”’]+/u.exec(after)?.[0] ?? "";
  return [closing, after.slice(closing.length)];
}

/** A gap's sentence with the word in it, spaced as it would be written. */
export function gapLine(before: string, word: string, after: string): string {
  return `${before}${spacedBefore(before) ? " " : ""}${word}${spacedAfter(after) ? " " : ""}${after}`;
}

/** Words placed in a passage's gaps, by gap id. */
export type Fills = Readonly<Record<string, string>>;

/**
 * Moves a word into a gap. `from` is "bank" or the gap the word was lifted from; `to` is a gap, or
 * null to send the word back to the bank. A word dropped on a filled gap from another gap swaps
 * with it; from the bank, it sends the gap's word back.
 */
export function placeWord(fills: Fills, word: string, from: string, to: string | null): Fills {
  const next: Record<string, string> = { ...fills };
  if (from !== "bank") delete next[from];
  if (to === null) return next;
  const bumped = fills[to];
  next[to] = word;
  if (bumped && from !== "bank" && from !== to) next[from] = bumped;
  return next;
}

/** The bank's words not in any gap, in the bank's order; a word listed twice can be placed twice. */
export function wordsLeft(bank: readonly string[], fills: Fills): string[] {
  const placed = Object.values(fills);
  return bank.filter((word) => {
    const at = placed.indexOf(word);
    if (at === -1) return true;
    placed.splice(at, 1);
    return false;
  });
}

/** A dialogue turn: the other speaker's line, or the learner's reply picked from options. */
export type Turn<Line> =
  | { who: "them"; clip: string; line: Line }
  | { who: "you"; clip: string; replies: readonly { line: Line; right?: boolean }[] };

export interface DialogueState {
  /** Turns shown so far; the turn at `shown` is the learner's to answer, or the end. */
  shown: number;
  /** The reply picked first at each of the learner's turns, by turn index. */
  picks: Readonly<Record<number, number>>;
}

/** The index of the learner's next turn from `index`, or the dialogue's length. */
export function nextReply(turns: readonly Turn<unknown>[], index: number): number {
  for (let i = index; i < turns.length; i++) if (turns[i]?.who === "you") return i;
  return turns.length;
}

export function startDialogue(turns: readonly Turn<unknown>[]): DialogueState {
  return { shown: nextReply(turns, 0), picks: {} };
}

/** The learner picks a reply; only the first pick at a turn counts. */
export function pickReply(state: DialogueState, reply: number): DialogueState {
  if (state.picks[state.shown] !== undefined) return state;
  return { ...state, picks: { ...state.picks, [state.shown]: reply } };
}

/** The right reply is said, and the dialogue runs on to the learner's next turn. */
export function sayReply(turns: readonly Turn<unknown>[], state: DialogueState): DialogueState {
  if (state.picks[state.shown] === undefined) return state;
  return { ...state, shown: nextReply(turns, state.shown + 1) };
}

/** Right or wrong at each of the learner's turns so far, in order. */
export function replyResults(
  turns: readonly Turn<unknown>[],
  state: DialogueState,
): (boolean | undefined)[] {
  return turns.flatMap((turn, i) => {
    if (turn.who !== "you") return [];
    const pick = state.picks[i];
    return [pick === undefined ? undefined : turn.replies[pick]?.right === true];
  });
}
