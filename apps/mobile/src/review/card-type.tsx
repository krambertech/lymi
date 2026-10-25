import { type ReactNode, useState } from "react";
import { type LayoutChangeEvent, type TextStyle, useWindowDimensions } from "react-native";
import { fitType, INLINE_LIFT, textStart } from "../theme/type";
import { INLINE_ROOM, InlineControl, RunControl } from "../ui/inline-control";
import { Text } from "../ui/primitives";
import { TermText } from "../ui/term-text";

// The review card's type on the phone's ramp, which steps down at most twice to fit. phone.md "Review".

/** How many sizes the cue and the target have. */
const STEPS = 3;
/** The word at 38 (DESIGN.md word-phone), then 3xl and 2xl. */
const CUE = [38, 34, 28];
/** A term as the answer: 2xl, xl, lg, medium. */
const TERM = [28, 22, 20];
/** A meaning as the answer: xl, lg, md. */
const MEANING = [22, 20, 17];
/** The ramp's line height at each size, from global.css. */
const LEADING: Record<number, number> = { 17: 1.35, 20: 1.3, 22: 1.3, 28: 1.2, 34: 1.2, 38: 1.2 };

type Step = 0 | 1 | 2;

type LineStyle = TextStyle & { fontSize: number };

/** What the cue must fit: the card's line, its longest word, and the reader's text size. */
interface CueRoom {
  /** The width the cue's longest word has, in points. */
  line: number;
  /** The cue's longest word, in characters. */
  longest: number;
  fontScale: number;
}

/** The cue grows with the text size up to this, and the answer up to `ANSWER_GROWS`, so it stays below. */
const CUE_GROWS = 1.4;
const ANSWER_GROWS = 1.3;

/** One step's cue and target sizes, with the line heights that keep iOS from clipping their glyphs. */
export function typeAt(
  step: Step,
  target: "term" | "meaning",
  room: CueRoom,
): { cue: LineStyle; answer: LineStyle } {
  // Onest's letters average a little over half their size across, so a word this size fits whole.
  const whole = room.line / (Math.max(1, room.longest) * 0.58);
  const cue = Math.round(
    Math.max(20, Math.min((CUE[step] as number) * Math.min(room.fontScale, CUE_GROWS), whole)),
  );
  const answer = (target === "term" ? TERM : MEANING)[step] as number;
  const line = (size: number) => Math.round(size * (LEADING[size] ?? 1.2));
  return {
    cue: { fontSize: cue, lineHeight: line(cue), fontWeight: "500", letterSpacing: cue * -0.03 },
    // The answer takes the ramp's own tracking for its size.
    answer: {
      fontSize: answer,
      lineHeight: line(answer),
      fontWeight: target === "term" ? "500" : "400",
    },
  };
}

/**
 * A line of the card with a control after its last word, such as the speaker: it flows with the
 * text and wraps with that word, as on the web, rather than standing in a column of its own.
 */
export function CardLine({
  style,
  after,
  muted,
  grows = false,
  lang,
  term,
  hidden,
  children,
}: {
  style: LineStyle;
  /** The card's language, when the line is its term. */
  lang?: string | null;
  /** The card, when the line is its term, so a reading can be drawn over it. */
  term?: {
    term: string;
    language?: string | null | undefined;
    pronunciation?: string | null | undefined;
  } | null;
  /** Keeps the furigana's room but hides it, or leaves the stress off, as on the cue of a Known card. */
  hidden?: boolean;
  /** Follows Dynamic Type, as the answer does; the cue stays its size, already the card's largest. */
  grows?: boolean;
  after?: ReactNode;
  muted?: string;
  children: string;
}) {
  const { fontScale } = useWindowDimensions();
  // The cue is sized for the text size already; the answer grows, short of the cue.
  const limit = grows ? ANSWER_GROWS : 1;
  const drawn = fitType(style.fontSize, fontScale, limit).drawn;
  const plain = (text: string) => (
    <Text
      className="text-text"
      style={[style, textStart(lang), after ? INLINE_ROOM : null, muted ? { color: muted } : null]}
      maxFontSizeMultiplier={limit}
      lang={lang}
    >
      {text}
      {after ? (
        // An inline view stands on the baseline; this centres the 32 pt button on the line as drawn.
        <InlineControl lift={Math.round(16 - drawn * INLINE_LIFT)}>{after}</InlineControl>
      ) : null}
    </Text>
  );
  if (!term) return plain(children);
  const line = Math.round(((style.lineHeight ?? style.fontSize * 1.2) * drawn) / style.fontSize);
  return (
    <TermText
      card={term}
      plain={plain}
      hidden={hidden}
      lang={lang}
      className="text-text"
      style={[style, textStart(lang), muted ? { color: muted } : null]}
      maxFontSizeMultiplier={limit}
      after={after ? <RunControl line={line}>{after}</RunControl> : undefined}
    />
  );
}

/** The largest step that fits the room the card keeps once revealed, held through the reveal. */
export function useFitStep(revealed: boolean, takenAtReveal: number) {
  const [room, setRoom] = useState(0);
  const [heights, setHeights] = useState<(number | undefined)[]>([]);
  const fits = heights.findIndex((h) => h !== undefined && h <= room);
  const measured = heights.filter((h) => h !== undefined).length === STEPS;
  const step = (!room || fits >= 0 ? Math.max(fits, 0) : measured ? STEPS - 1 : 0) as Step;
  return {
    step,
    onRoom: (e: LayoutChangeEvent) => {
      if (!revealed) setRoom(Math.max(1, e.nativeEvent.layout.height - takenAtReveal));
    },
    onMeasured: (at: number) => (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      setHeights((hs) => (hs[at] === h ? hs : Object.assign([...hs], { [at]: h })));
    },
  };
}

export const FIT_STEPS: Step[] = [0, 1, 2];
