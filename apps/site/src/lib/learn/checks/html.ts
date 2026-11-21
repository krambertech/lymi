/**
 * A small reader for the HTML React renders on the server, enough for the lesson checks: elements,
 * their attributes and text, and the language each piece of text inherits.
 */

export interface Element {
  tag: string;
  attrs: Readonly<Record<string, string>>;
  children: Node[];
  /** The `lang` this element is in: its own, or the nearest ancestor's. */
  lang: string;
}

export type Node = Element | { text: string };

const VOID = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name.startsWith("#x") || name.startsWith("#X"))
      return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
    if (name.startsWith("#")) return String.fromCodePoint(Number.parseInt(name.slice(1), 10));
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

/** Parses server-rendered HTML into a tree under a root in `lang`. */
export function parse(html: string, lang: string): Element {
  const root: Element = { tag: "#root", attrs: {}, children: [], lang };
  const stack: Element[] = [root];
  const token =
    /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=/>]+(?:="[^"]*")?)*)\s*(\/?)>|[^<]+/g;
  for (const match of html.matchAll(token)) {
    const [whole, closing, opening, rawAttrs = "", selfClosing] = match;
    const top = stack.at(-1) as Element;
    if (whole.startsWith("<!--")) continue;
    if (closing) {
      const at = stack.map((each) => each.tag).lastIndexOf(closing.toLowerCase());
      if (at > 0) stack.length = at;
      continue;
    }
    if (opening) {
      const attrs: Record<string, string> = {};
      for (const [, name, value] of rawAttrs.matchAll(/([^\s=/>]+)(?:="([^"]*)")?/g))
        attrs[(name as string).toLowerCase()] = decode(value ?? "");
      const tag = opening.toLowerCase();
      const element: Element = { tag, attrs, children: [], lang: attrs.lang ?? top.lang };
      top.children.push(element);
      if (!selfClosing && !VOID.has(tag)) stack.push(element);
      continue;
    }
    top.children.push({ text: decode(whole) });
  }
  return root;
}

export const isElement = (node: Node): node is Element => "tag" in node;

export function* elements(node: Element): Generator<Element> {
  yield node;
  for (const child of node.children) if (isElement(child)) yield* elements(child);
}

/**
 * The text a reader sees in an element, hidden parts left out. `spaced` puts a space between
 * elements, for a button whose lines are separate blocks.
 */
export function textOf(node: Node, spaced = false): string {
  if (!isElement(node)) return node.text;
  if (node.attrs["aria-hidden"] === "true" || node.tag === "svg") return "";
  return node.children.map((child) => textOf(child, spaced)).join(spaced ? " " : "");
}

/** Every run of text with the language it is read in. */
export function* textRuns(
  node: Element,
): Generator<{ text: string; lang: string; parent: Element }> {
  for (const child of node.children) {
    if (isElement(child)) {
      if (child.tag === "svg" || child.tag === "script" || child.tag === "style") continue;
      yield* textRuns(child);
    } else if (child.text.trim()) yield { text: child.text, lang: node.lang, parent: node };
  }
}
