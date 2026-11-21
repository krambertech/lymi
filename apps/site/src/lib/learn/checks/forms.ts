import { CLIPS, clipText } from "../clips";
import { type Element, isElement } from "./html";
import type { Rendered } from "./lessons";

/**
 * Every Estonian word form the course shows or says, checked once in Sõnaveeb (ÕS 2025). The value
 * is the headword Sõnaveeb names the form under, or "by hand: <source>" for a form someone checked
 * elsewhere, such as a name. `pnpm --filter @lymi/site lesson:forms` adds what Sõnaveeb confirms.
 */
export const VERIFIED_FORMS_PATH = "apps/site/src/lib/learn/verified-forms.json";

/** The word forms in a piece of Estonian, lower case. A part of a word, joined by a hyphen or a dot, is left out. */
export function formsIn(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/\p{L}+/gu)) {
    const before = text[(match.index ?? 0) - 1];
    const after = text[(match.index ?? 0) + match[0].length];
    // A part of a word: an ending such as -vad, a stem such as loe-, a syllable such as ma·ja.
    if ([before, after].some((next) => next === "-" || next === "‑" || next === "·")) continue;
    if (match[0].length < 2) continue;
    out.push(match[0].toLowerCase());
  }
  return out;
}

/** Where each form of a lesson comes from, for a failure to point at. */
export function lessonForms(page: Rendered): Map<string, string> {
  const found = new Map<string, string>();
  const add = (text: string, from: string) => {
    for (const form of formsIn(text)) if (!found.has(form)) found.set(form, from);
  };
  for (const [id, clip] of Object.entries(CLIPS[page.slug] ?? {}))
    add(clipText(clip), `clip ${page.slug}/${id}`);
  const glossary = (page.recording.view?.glossary ?? {}) as Record<string, { show?: string }>;
  for (const [key, gloss] of Object.entries(glossary)) add(gloss.show ?? key, `glossary "${key}"`);
  for (const { word } of page.recording.words) add(word, `<Word w="${word}" />`);
  for (const { part, props } of page.recording.parts) {
    if (part === "Dialogue")
      for (const turn of props.turns as { line?: string; replies?: { line: string }[] }[]) {
        if (turn.line) add(turn.line, `dialogue "${String(props.id)}"`);
        for (const reply of turn.replies ?? [])
          add(reply.line, `dialogue "${String(props.id)}" reply`);
      }
    if (part === "GapPassage") {
      for (const gap of props.gaps as {
        before: string;
        after: string;
        answer: string;
        options?: string[];
      }[])
        add(
          [gap.before, gap.answer, gap.after, ...(gap.options ?? [])].join(" "),
          `gaps "${String(props.id)}"`,
        );
      for (const word of (props.spare as string[] | undefined) ?? [])
        add(word, `gaps "${String(props.id)}" spare`);
    }
    if (part === "Quiz")
      for (const item of props.items as {
        options?: unknown[];
        before?: string;
        after?: string;
      }[]) {
        if (typeof item.before !== "string") continue;
        // A gap round sets its gap against the text around it: s + aa + da is saada.
        for (const option of item.options ?? [])
          if (typeof option === "string")
            add(`${item.before}${option}${item.after ?? ""}`, `quiz "${String(props.id)}"`);
      }
  }
  // Each outermost Estonian element as one text, so a word split across spans stays whole.
  const outermost = (element: Element, inEstonian: boolean) => {
    if (element.lang === "et" && !inEstonian) {
      add(estonianText(element), 'text in lang="et"');
      return;
    }
    for (const child of element.children)
      if (isElement(child)) outermost(child, element.lang === "et");
  };
  outermost(page.tree, false);
  return found;
}

const BLOCKS = new Set([
  "div",
  "p",
  "li",
  "ul",
  "ol",
  "dl",
  "dt",
  "dd",
  "br",
  "tr",
  "td",
  "th",
  "h1",
  "h2",
  "h3",
  "h4",
  "figcaption",
  "fieldset",
  "legend",
]);

/**
 * An element's Estonian text, leaving out any child in another language. Blocks, and the items
 * of a flex or grid box, are separate words; spans inside a word, such as a lit ending, are not.
 */
function estonianText(element: Element): string {
  const apart = /(?:^|\s)(?:inline-)?(?:flex|grid)(?:\s|$)/.test(element.attrs.class ?? "");
  return element.children
    .map((child) => {
      if (!isElement(child)) return child.text;
      if (child.lang !== "et" || child.tag === "svg") return " ";
      const text = estonianText(child);
      return apart || BLOCKS.has(child.tag) ? ` ${text} ` : text;
    })
    .join("");
}
