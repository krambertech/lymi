import lockupSvg from "../../public/brand/lockup-dark.svg?raw";

export const SHARE_WIDTH = 1200;
export const SHARE_HEIGHT = 630;

const PAD = 80;
const MAX_LINE = SHARE_WIDTH - PAD * 2;
const CANVAS = "#151210";
const TEXT = "#f3f0eb";

/** The tray hues by index, mirrored from `.deck-hero-tint[data-hue]` in styles.css. */
const HUES = [25, 110, 150, 195, 235, 280, 320, 350];

export interface ShareContent {
  name: string;
  /** Language, level and card count, already in the page language. */
  facts: string;
  byline: string;
  /** The deck's tray hue index, so the preview wears the colour its page and tile do. */
  hue: number;
}

/** OKLCH to an sRGB hex, since the renderer reads no CSS colour function. Clipped, not mapped. */
export function oklchToHex(l: number, c: number, h: number): string {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return `#${linear
    .map((v) => {
      const clipped = Math.min(1, Math.max(0, v));
      const srgb = clipped <= 0.0031308 ? 12.92 * clipped : 1.055 * clipped ** (1 / 2.4) - 0.055;
      return Math.round(srgb * 255)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
}

// The dark palette's `--muted`, and the pool the deck's hue makes on the dark canvas.
const MUTED = oklchToHex(0.7, 0.022, 70);
const poolColor = (hue: number) => oklchToHex(0.3, 0.055, HUES[hue % HUES.length] ?? 25);

export function escapeXml(text: string): string {
  return text.replace(
    /[<>&"']/g,
    (ch) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[ch] as string,
  );
}

/**
 * Onest's advance widths, roughly, per character class at one em. The renderer breaks no lines
 * itself, so the page measures its own; a little wide is safe, a little narrow overflows.
 */
function charWidth(ch: string): number {
  if (ch === " ") return 0.28;
  if (/[iljtfrI.,:;!'’|()[\]]/.test(ch)) return 0.32;
  if (/[mwMW]/.test(ch)) return 0.88;
  if (/[A-ZА-ЯЁЄІЇҐÄÖÜÕŠŽ]/.test(ch)) return 0.68;
  if (/[0-9]/.test(ch)) return 0.6;
  if (/[⺀-鿿가-힯豈-﫿＀-￯]/.test(ch)) return 1;
  return 0.57;
}

export function textWidth(text: string, size: number, tracking = 0): number {
  const chars = [...text];
  return chars.reduce((sum, ch) => sum + charWidth(ch) * size, 0) + tracking * size * chars.length;
}

/** Word-wraps, breaking a word longer than the line mid-way rather than letting it run off. */
export function wrapWords(text: string, size: number, maxWidth: number, tracking = 0): string[] {
  const fits = (line: string) => textWidth(line, size, tracking) <= maxWidth;
  const lines: string[] = [];
  let current = "";
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const joined = current ? `${current} ${word}` : word;
    if (fits(joined)) {
      current = joined;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    while (!fits(current)) {
      const chars = [...current];
      let cut = chars.length - 1;
      while (cut > 1 && !fits(chars.slice(0, cut).join(""))) cut--;
      lines.push(chars.slice(0, cut).join(""));
      current = chars.slice(cut).join("");
    }
  }
  if (current) lines.push(current);
  return lines;
}

const TITLE_TRACKING = -0.03;
/** Sizes tried in turn, with how many lines each may take before the next, smaller one is tried. */
const TITLE_STEPS: { size: number; lines: number }[] = [
  { size: 96, lines: 1 },
  { size: 84, lines: 2 },
  { size: 68, lines: 2 },
  { size: 56, lines: 3 },
];

/** The name laid out at the largest size that fits, cut with an ellipsis if even the smallest does not. */
export function layoutTitle(name: string): { size: number; lines: string[] } {
  for (const step of TITLE_STEPS) {
    const lines = wrapWords(name, step.size, MAX_LINE, TITLE_TRACKING);
    if (lines.length <= step.lines) return { size: step.size, lines };
  }
  const last = TITLE_STEPS[TITLE_STEPS.length - 1] as { size: number; lines: number };
  const lines = wrapWords(name, last.size, MAX_LINE, TITLE_TRACKING).slice(0, last.lines);
  let tail = `${lines[last.lines - 1] ?? ""}…`;
  while (textWidth(tail, last.size, TITLE_TRACKING) > MAX_LINE && tail.length > 2) {
    tail = `${[...tail].slice(0, -2).join("").trimEnd()}…`;
  }
  lines[last.lines - 1] = tail;
  return { size: last.size, lines };
}

const lockupBody = lockupSvg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

/**
 * The deck's link preview: the lockup, the name as large as it fits, and the facts beneath, on
 * the dark canvas with a pool of the deck's own hue. Everything sits inside the middle 630 px,
 * so an app that crops the preview square keeps the name.
 */
export function deckShareSvg(content: ShareContent): string {
  const title = layoutTitle(content.name);
  const lineHeight = title.size * 1.04;
  const baselineOfLast = 436;
  const firstBaseline = baselineOfLast - (title.lines.length - 1) * lineHeight;
  const titleText = title.lines
    .map(
      (line, i) =>
        `<text x="${PAD}" y="${(firstBaseline + i * lineHeight).toFixed(1)}" fill="${TEXT}" font-family="Onest" font-weight="500" font-size="${title.size}" letter-spacing="${(TITLE_TRACKING * title.size).toFixed(2)}">${escapeXml(line)}</text>`,
    )
    .join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SHARE_WIDTH} ${SHARE_HEIGHT}" width="${SHARE_WIDTH}" height="${SHARE_HEIGHT}">
  <defs><radialGradient id="pool" gradientUnits="userSpaceOnUse" cx="360" cy="260" r="720"><stop offset="0" stop-color="${poolColor(content.hue)}"/><stop offset="1" stop-color="${CANVAS}"/></radialGradient></defs>
  <rect width="${SHARE_WIDTH}" height="${SHARE_HEIGHT}" fill="${CANVAS}"/>
  <rect width="${SHARE_WIDTH}" height="${SHARE_HEIGHT}" fill="url(#pool)"/>
  <g transform="translate(${PAD} 64) scale(0.64)">${lockupBody}</g>
  ${titleText}
  <text x="${PAD}" y="504" fill="${MUTED}" font-family="Onest" font-size="34" letter-spacing="-0.34">${escapeXml(content.facts)}</text>
  <text x="${PAD}" y="556" fill="${MUTED}" font-family="Onest" font-size="28">${escapeXml(content.byline)}</text>
</svg>
`;
}
