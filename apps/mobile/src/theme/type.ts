import type { TextProps } from "react-native";

type Ramp = NonNullable<TextProps["dynamicTypeRamp"]>;

// How Onest follows Dynamic Type. Each size grows on the iOS text style nearest it, so a display step
// grows less than body text, as Apple's own do; a cap per size then stops it short of breaking a
// screen. Tracking follows the size the text is drawn at, not the step it was set in.

/** Apple's point sizes per text style, from extra small to the fifth accessibility size. */
const SIZES: Record<Ramp, readonly number[]> = {
  largeTitle: [31, 32, 33, 34, 36, 38, 40, 44, 48, 52, 56, 60],
  title1: [25, 26, 27, 28, 30, 32, 34, 38, 43, 48, 53, 58],
  title2: [19, 20, 21, 22, 24, 26, 28, 34, 39, 44, 50, 56],
  title3: [17, 18, 19, 20, 22, 24, 26, 31, 37, 43, 49, 55],
  headline: [14, 15, 16, 17, 19, 21, 23, 28, 33, 40, 47, 53],
  body: [14, 15, 16, 17, 19, 21, 23, 28, 33, 40, 47, 53],
  callout: [13, 14, 15, 16, 18, 20, 22, 26, 32, 38, 44, 51],
  subheadline: [12, 13, 14, 15, 17, 19, 21, 25, 30, 36, 42, 49],
  footnote: [12, 12, 12, 13, 15, 17, 19, 23, 27, 33, 38, 44],
  caption1: [11, 11, 11, 12, 14, 16, 18, 22, 26, 32, 37, 43],
  caption2: [11, 11, 11, 11, 13, 15, 17, 20, 24, 29, 34, 40],
};
/** The default size, Large, is the fourth. */
const LARGE = 3;

/** The iOS text style each of the phone's sizes grows with. */
function rampFor(size: number): Ramp {
  if (size <= 11) return "caption2";
  if (size <= 12) return "caption1";
  if (size <= 13) return "footnote";
  if (size <= 15) return "subheadline";
  if (size <= 17) return "body";
  if (size <= 20) return "title3";
  if (size <= 22) return "title2";
  if (size <= 28) return "title1";
  return "largeTitle";
}

/** How far a size may grow: reading text the furthest, the word and the count the least. */
function capFor(size: number): number {
  if (size <= 17) return 2.4;
  if (size <= 22) return 2;
  if (size <= 28) return 1.6;
  // A tab's title keeps its line inside the 56 pt bar.
  if (size <= 34) return 1.35;
  if (size <= 46) return 1.3;
  return 1.2;
}

/** Onest's tracking in em at the size it is drawn: a hair open when small, tighter as it grows. */
const TRACKING: readonly (readonly [number, number])[] = [
  [11, 0.012],
  [14, 0.004],
  [17, 0],
  [20, -0.006],
  [28, -0.02],
  [40, -0.028],
  [56, -0.034],
  [80, -0.04],
];

function trackingEm(size: number): number {
  const i = TRACKING.findIndex(([at]) => at >= size);
  if (i === 0) return TRACKING[0]?.[1] ?? 0;
  if (i === -1) return TRACKING[TRACKING.length - 1]?.[1] ?? 0;
  const [x0, y0] = TRACKING[i - 1] ?? [0, 0];
  const [x1, y1] = TRACKING[i] ?? [0, 0];
  return y0 + ((y1 - y0) * (size - x0)) / (x1 - x0);
}

/** The setting's place in the table, read from how much body text has grown. */
function category(fontScale: number): number {
  const body = 17 * fontScale;
  let best = LARGE;
  SIZES.body.forEach((s, i) => {
    if (Math.abs(s - body) < Math.abs((SIZES.body[best] ?? 17) - body)) best = i;
  });
  return best;
}

export interface TypeFit {
  ramp: Ramp;
  /** The most the size may grow, for `maxFontSizeMultiplier`. */
  cap: number;
  /** The size it is drawn at under the current setting. */
  drawn: number;
  /** In points; iOS does not scale letter spacing with the text. */
  letterSpacing: number;
}

/** How text set at `size` is drawn under the reader's text size, at most `limit` times larger. */
export function fitType(size: number, fontScale: number, limit = Infinity): TypeFit {
  const ramp = rampFor(size);
  const sizes = SIZES[ramp];
  const grow = (sizes[category(fontScale)] ?? 1) / (sizes[LARGE] ?? 1);
  const cap = Math.max(1, Math.min(capFor(size), limit));
  const drawn = size * Math.min(grow, cap);
  return { ramp, cap, drawn, letterSpacing: trackingEm(drawn) * drawn };
}

/** Typed text grows less than read text, so a field keeps its height: reading sizes to 1.5×, display to 1.3×. */
export function inputCap(size: number): number {
  return size <= 17 ? 1.5 : 1.3;
}

/** A multi-line field's text: iOS pins it to the top, so even padding centres one line in a 44 pt box. */
export const MULTILINE = {
  fontSize: 17,
  lineHeight: 22,
  paddingTop: 11,
  paddingBottom: 11,
} as const;
