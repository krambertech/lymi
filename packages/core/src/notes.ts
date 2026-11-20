/// <reference path="./markdown-it-ins.d.ts" />
import MarkdownIt, {
  type MarkdownIt as Markdown,
  type StateBlock,
  type StateInline,
  type Token,
} from "markdown-it";
import underline from "markdown-it-ins";
import { type NotationSpan, scanNotation } from "./notation";

// Notes are a Markdown subset; docs/design/library-decks-and-cards.md#notes owns the rules.
// A subpath of its own, `@lymi/core/notes`, so only a bundle that reads notes carries markdown-it.

export type NoteInline =
  | { type: "text"; value: string }
  | { type: "break" }
  | { type: "strong" | "emphasis" | "underline" | "strikethrough"; children: NoteInline[] }
  | { type: "link"; href: string; title?: string; children: NoteInline[] }
  | NotationSpan;

export type NoteList = { type: "list"; ordered: boolean; start: number; items: NoteBlock[][] };

export type NoteBlock =
  | { type: "paragraph"; children: NoteInline[] }
  | NoteList
  | { type: "displayMath"; tex: string; source: string }
  | { type: "codeBlock"; value: string; language?: string; source: string };

const line = (state: StateBlock, n: number) =>
  state.src.slice((state.bMarks[n] ?? 0) + (state.tShift[n] ?? 0), state.eMarks[n]);

const indented = (state: StateBlock, n: number) => (state.sCount[n] ?? 0) - state.blkIndent >= 4;

const outdented = (state: StateBlock, n: number) =>
  !state.isEmpty(n) && (state.sCount[n] ?? 0) < state.blkIndent;

/** Fenced code that must close: an unclosed fence stays text instead of swallowing the rest of the note. */
function codeBlock(state: StateBlock, start: number, end: number, silent: boolean): boolean {
  if (indented(state, start)) return false;
  const opening = /^(`{3,}|~{3,})(.*)$/.exec(line(state, start));
  const markup = opening?.[1];
  const info = opening?.[2] ?? "";
  if (!markup || (markup[0] === "`" && info.includes("`"))) return false;
  let close = start + 1;
  for (; ; close++) {
    if (close >= end || outdented(state, close)) return false;
    const text = line(state, close).trimEnd();
    if (
      !indented(state, close) &&
      text.length >= markup.length &&
      /^(`+|~+)$/.test(text) &&
      text[0] === markup[0]
    )
      break;
  }
  if (silent) return true;
  const token = state.push("code_block", "code", 0);
  token.meta = {
    type: "codeBlock",
    value: state.getLines(start + 1, close, state.sCount[start] ?? 0, false),
    ...(info.trim() ? { language: info.trim() } : {}),
    source: state.getLines(start, close + 1, state.blkIndent, false).trim(),
  } satisfies NoteBlock;
  token.map = [start, close + 1];
  state.line = close + 1;
  return true;
}

const DISPLAY = [
  ["$$", "$$"],
  ["\\[", "\\]"],
] as const;

/** `$$…$$` or `\[…\]` from a line start to a line end, with no blank line inside. */
function displayMath(state: StateBlock, start: number, end: number, silent: boolean): boolean {
  if (indented(state, start)) return false;
  const first = line(state, start);
  const pair = DISPLAY.find(([open]) => first.startsWith(open));
  if (!pair) return false;
  const [open, close] = pair;
  let last = start;
  for (;;) {
    const text = (last === start ? first.slice(open.length) : line(state, last)).trimEnd();
    if (text.endsWith(close)) break;
    last++;
    if (last >= end || state.isEmpty(last) || outdented(state, last)) return false;
  }
  const source = state.getLines(start, last + 1, state.blkIndent, false).trim();
  const tex = source.slice(open.length, -close.length).trim();
  if (!tex) return false;
  if (silent) return true;
  const token = state.push("display_math", "math", 0);
  token.meta = { type: "displayMath", tex, source } satisfies NoteBlock;
  token.map = [start, last + 1];
  state.line = last + 1;
  return true;
}

function inlineNotation(state: StateInline, silent: boolean): boolean {
  const scan = scanNotation(state.src, state.pos, state.posMax);
  if (!scan) return false;
  if (!silent) {
    if ("literal" in scan) state.pending += scan.literal;
    else state.push("notation", "", 0).meta = scan.span;
  }
  state.pos = scan.end;
  return true;
}

function reader(notation: boolean): Markdown {
  // The zero preset reads nothing but paragraphs and text, and HTML stays off; the subset is switched on by name.
  const markdown = new MarkdownIt("zero")
    .enable(["list", "newline", "emphasis", "escape", "strikethrough", "link", "autolink"])
    .use(underline);

  markdown.validateLink = (href) => /^(?:https?:\/\/|mailto:)/i.test(href);

  // Keep unsupported images literal rather than turning their destinations into links.
  const link = markdown.inline.ruler.__rules__.find((rule) => rule.name === "link")?.fn;
  if (link) {
    markdown.inline.ruler.at("link", (state, silent) =>
      state.src[state.pos - 1] === "!" ? false : link(state, silent),
    );
  }

  if (notation) {
    const alt = ["paragraph", "reference", "blockquote", "list"];
    markdown.block.ruler.before("paragraph", "code_block_fenced", codeBlock, { alt });
    markdown.block.ruler.before("paragraph", "display_math", displayMath, { alt });
    // Before escape, so `\(` opens math instead of becoming a literal parenthesis.
    markdown.inline.ruler.before("escape", "notation", inlineNotation);
  }
  return markdown;
}

const markdown = reader(false);
const notationMarkdown = reader(true);

const formatting = {
  strong_open: "strong",
  em_open: "emphasis",
  ins_open: "underline",
  s_open: "strikethrough",
} as const;

function inlines(tokens: readonly Token[]): NoteInline[] {
  const root: NoteInline[] = [];
  const stack: NoteInline[][] = [root];
  for (const token of tokens) {
    const into = stack.at(-1) ?? root;
    if (token.type === "text") {
      if (token.content) into.push({ type: "text", value: token.content });
    } else if (token.type === "notation") into.push(token.meta as NotationSpan);
    else if (token.type === "softbreak" || token.type === "hardbreak") into.push({ type: "break" });
    else if (token.type === "link_open") {
      const children: NoteInline[] = [];
      const title = token.attrGet("title");
      into.push({
        type: "link",
        href: String(token.attrGet("href") ?? ""),
        ...(title ? { title: String(title) } : {}),
        children,
      });
      stack.push(children);
    } else if (Object.hasOwn(formatting, token.type)) {
      const children: NoteInline[] = [];
      into.push({ type: formatting[token.type as keyof typeof formatting], children });
      stack.push(children);
    } else if (
      ["strong_close", "em_close", "ins_close", "s_close", "link_close"].includes(token.type)
    )
      stack.pop();
  }
  return root;
}

interface NoteOptions {
  /** Read inline and display math and code. Off until the web and the phone both render them. */
  notation?: boolean;
}

/** A note's Markdown source as blocks to render. Raw HTML and unsupported syntax arrive as text. */
export function parseNotes(source: string, { notation = false }: NoteOptions = {}): NoteBlock[] {
  const root: NoteBlock[] = [];
  const stack: NoteBlock[][] = [root];
  const lists: NoteList[] = [];
  for (const token of (notation ? notationMarkdown : markdown).parse(source, {})) {
    const into = stack.at(-1) ?? root;
    switch (token.type) {
      case "inline":
        into.push({ type: "paragraph", children: inlines(token.children ?? []) });
        break;
      case "code_block":
      case "display_math":
        into.push(token.meta as NoteBlock);
        break;
      case "bullet_list_open":
      case "ordered_list_open": {
        const list: NoteList = {
          type: "list",
          ordered: token.type === "ordered_list_open",
          start: Number(token.attrGet("start") ?? 1),
          items: [],
        };
        into.push(list);
        lists.push(list);
        break;
      }
      case "bullet_list_close":
      case "ordered_list_close":
        lists.pop();
        break;
      case "list_item_open": {
        const item: NoteBlock[] = [];
        lists.at(-1)?.items.push(item);
        stack.push(item);
        break;
      }
      case "list_item_close":
        stack.pop();
        break;
    }
  }
  return root;
}

function inlineText(nodes: readonly NoteInline[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text" || node.type === "code") return node.value;
      if (node.type === "math") return node.tex;
      return node.type === "break" ? "\n" : inlineText(node.children);
    })
    .join("");
}

function blockText(nodes: readonly NoteBlock[]): string {
  return nodes
    .map((node) => {
      if (node.type === "paragraph") return inlineText(node.children);
      if (node.type === "list") return node.items.map((item) => blockText(item)).join("\n");
      return node.type === "displayMath" ? node.tex : node.value;
    })
    .join("\n");
}

/** Any character or line start the subset could read as syntax. */
const MARKUP = /[*_\\+~[<]|^[ \t]*(?:-|\d{1,9}[.)])(?:[ \t]|$)/m;

/**
 * A note's words without Markdown syntax, one line per line, for search and quoting. Both
 * collapse whitespace, so a note with no markup skips the parse, which a search runs per card.
 */
export function notesToText(source: string): string {
  return MARKUP.test(source) ? blockText(parseNotes(source)) : source;
}
