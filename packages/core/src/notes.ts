/// <reference path="./markdown-it-ins.d.ts" />
import MarkdownIt, { type Token } from "markdown-it";
import underline from "markdown-it-ins";

// Notes are a Markdown subset; docs/design/library-decks-and-cards.md#notes owns the rules.
// A subpath of its own, `@lymi/core/notes`, so only a bundle that reads notes carries markdown-it.

export type NoteInline =
  | { type: "text"; value: string }
  | { type: "break" }
  | { type: "strong" | "emphasis" | "underline" | "strikethrough"; children: NoteInline[] }
  | { type: "link"; href: string; title?: string; children: NoteInline[] };

export type NoteList = { type: "list"; ordered: boolean; start: number; items: NoteBlock[][] };

export type NoteBlock = { type: "paragraph"; children: NoteInline[] } | NoteList;

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
    } else if (token.type === "softbreak" || token.type === "hardbreak")
      into.push({ type: "break" });
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

/** A note's Markdown source as blocks to render. Raw HTML and unsupported syntax arrive as text. */
export function parseNotes(source: string): NoteBlock[] {
  const root: NoteBlock[] = [];
  const stack: NoteBlock[][] = [root];
  const lists: NoteList[] = [];
  for (const token of markdown.parse(source, {})) {
    const into = stack.at(-1) ?? root;
    switch (token.type) {
      case "inline":
        into.push({ type: "paragraph", children: inlines(token.children ?? []) });
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
    .map((node) =>
      node.type === "text" ? node.value : node.type === "break" ? "\n" : inlineText(node.children),
    )
    .join("");
}

function blockText(nodes: readonly NoteBlock[]): string {
  return nodes
    .map((node) =>
      node.type === "paragraph"
        ? inlineText(node.children)
        : node.items.map((item) => blockText(item)).join("\n"),
    )
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
