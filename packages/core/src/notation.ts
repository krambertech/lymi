// Inline math and code on cards; docs/proposals/math-chemistry-and-code-on-cards.md owns the rules.
// No markdown-it here, so a bundle that reads term, meaning or example stays small.

export type NotationSpan =
  | { type: "math"; tex: string; source: string }
  | { type: "code"; value: string; source: string };

export type FieldInline = { type: "text"; value: string } | NotationSpan;

export type Scan = { span: NotationSpan; end: number } | { literal: string; end: number };

const isSpace = (char: string | undefined) => char !== undefined && /\s/.test(char);
const isDigit = (char: string | undefined) => char !== undefined && char >= "0" && char <= "9";

function run(src: string, pos: number, max: number, char: string): number {
  let end = pos;
  while (end < max && src[end] === char) end++;
  return end;
}

function math(src: string, pos: number, end: number, tex: string): Scan | undefined {
  return tex.trim() ? { span: { type: "math", tex, source: src.slice(pos, end) }, end } : undefined;
}

/** Pandoc's rule: no space after the opening `$`, no space before the closing one, no digit after it. */
function dollar(src: string, pos: number, max: number): Scan | undefined {
  const after = run(src, pos, max, "$");
  // A `$$` run is display math, which only notes read and only at a line start.
  if (after - pos > 1) return { literal: src.slice(pos, after), end: after };
  if (after >= max || isSpace(src[after])) return undefined;
  for (let i = after; i < max; i++) {
    if (src[i] === "\\") i++;
    else if (src[i] === "$") {
      // The first unescaped `$` decides: "$5 and $x$" keeps "$5 and " as text, as Pandoc does.
      if (isSpace(src[i - 1]) || (i + 1 < max && isDigit(src[i + 1]))) return undefined;
      return math(src, pos, i + 1, src.slice(after, i));
    }
  }
  return undefined;
}

function parenthesis(src: string, pos: number, max: number): Scan | undefined {
  const close = src.indexOf("\\)", pos + 2);
  if (close < 0 || close + 2 > max) return undefined;
  return math(src, pos, close + 2, src.slice(pos + 2, close));
}

/** Single backticks only: a longer run stays text, so a stray fence never swallows a field. */
function backtick(src: string, pos: number, max: number): Scan | undefined {
  const after = run(src, pos, max, "`");
  if (after - pos > 1) return { literal: src.slice(pos, after), end: after };
  for (let i = after; i < max; ) {
    if (src[i] !== "`") {
      i++;
      continue;
    }
    const end = run(src, i, max, "`");
    if (end - i === 1) {
      const value = src.slice(after, i).replace(/\r?\n/g, " ");
      return value.trim()
        ? { span: { type: "code", value, source: src.slice(pos, end) }, end }
        : undefined;
    }
    i = end;
  }
  return undefined;
}

/**
 * Reads the inline math or code that starts at `pos`, or a `$$` or backtick run that must stay
 * text. Returns undefined when nothing there is notation, so the caller keeps the character.
 */
export function scanNotation(src: string, pos: number, max = src.length): Scan | undefined {
  const char = src[pos];
  if (char === "$") return dollar(src, pos, max);
  if (char === "`") return backtick(src, pos, max);
  if (char === "\\" && src[pos + 1] === "(") return parenthesis(src, pos, max);
  return undefined;
}

const NOTATION = /[$`]|\\\(/;

/**
 * A term, meaning, example or hint as text with its inline math and code. `\$` and `` \` `` are
 * a literal `$` and backtick; no other backslash changes what was typed.
 */
export function parseFieldNotation(field: string): FieldInline[] {
  if (!NOTATION.test(field)) return field ? [{ type: "text", value: field }] : [];
  const nodes: FieldInline[] = [];
  let text = "";
  const flush = () => {
    if (text) nodes.push({ type: "text", value: text });
    text = "";
  };
  for (let i = 0; i < field.length; ) {
    if (field[i] === "\\" && (field[i + 1] === "$" || field[i + 1] === "`")) {
      text += field[i + 1];
      i += 2;
      continue;
    }
    const scan = scanNotation(field, i);
    if (!scan) {
      text += field[i];
      i++;
    } else if ("literal" in scan) {
      text += scan.literal;
      i = scan.end;
    } else {
      flush();
      nodes.push(scan.span);
      i = scan.end;
    }
  }
  flush();
  return nodes;
}
