import MarkdownIt, { type Token } from "markdown-it";

// Notes are a Markdown subset; docs/design/library-decks-and-cards.md#notes owns the rules.
// A subpath of its own, `@lymi/core/notes`, so only a bundle that reads notes carries markdown-it.

export type NoteInline =
  | { type: "text"; value: string }
  | { type: "break" }
  | { type: "strong" | "emphasis"; children: NoteInline[] };

export type NoteList = { type: "list"; ordered: boolean; start: number; items: NoteBlock[][] };

export type NoteBlock = { type: "paragraph"; children: NoteInline[] } | NoteList;

// The zero preset reads nothing but paragraphs and text, and HTML stays off; the subset is switched on by name.
const markdown = new MarkdownIt("zero").enable(["list", "newline", "emphasis", "escape"]);

function inlines(tokens: readonly Token[]): NoteInline[] {
  const root: NoteInline[] = [];
  const stack: NoteInline[][] = [root];
  for (const token of tokens) {
    const into = stack.at(-1) ?? root;
    if (token.type === "text") {
      if (token.content) into.push({ type: "text", value: token.content });
    } else if (token.type === "softbreak" || token.type === "hardbreak")
      into.push({ type: "break" });
    else if (token.type === "strong_open" || token.type === "em_open") {
      const children: NoteInline[] = [];
      into.push({ type: token.type === "strong_open" ? "strong" : "emphasis", children });
      stack.push(children);
    } else if (token.type === "strong_close" || token.type === "em_close") stack.pop();
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
const MARKUP = /[*_\\]|^[ \t]*(?:[-+]|\d{1,9}[.)])(?:[ \t]|$)/m;

/**
 * A note's words without Markdown syntax, one line per line, for search and quoting. Both
 * collapse whitespace, so a note with no markup skips the parse, which a search runs per card.
 */
export function notesToText(source: string): string {
  return MARKUP.test(source) ? blockText(parseNotes(source)) : source;
}
