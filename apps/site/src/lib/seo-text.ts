import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";

/** Search results cut a title near 60 characters and a description near 155. */
export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;

/**
 * The first candidate that fits, longest-first by the caller's order. When none fits, the last one
 * is cut at a word boundary, so a page always gets a complete-looking line.
 */
export function firstThatFits(candidates: readonly string[], max: number): string {
  const tidy = candidates.map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean);
  const fits = tidy.find((text) => [...text].length <= max);
  return fits ?? cutAtWord(tidy.at(-1) ?? "", max);
}

/** The text within `max` characters, cut at a word and ended with an ellipsis when it had to be cut. */
export function cutAtWord(text: string, max: number): string {
  const chars = [...text];
  if (chars.length <= max) return text;
  const cut = chars.slice(0, max - 1).join("");
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;:·]+$/, "")}…`;
}

/** The text's first sentence, or the whole text when it has one sentence. */
export function firstSentence(text: string): string {
  return text.match(/^.+?[.!?…](?=\s+\p{Lu}|$)/u)?.[0] ?? text;
}

/** A card's text short enough to quote in a description, or null when it would crowd one out. */
export function quotable(text: string | null | undefined, max = 24): string | null {
  if (!text) return null;
  const first = text.split(/\s+\/\s+|;|\n/)[0] ?? "";
  const plain = first
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(?<!\.)\.$/, "");
  return plain && [...plain].length <= max ? plain : null;
}

/** Whether a deck's name already says the language, so a title need not say it twice. */
export function namesLanguage(name: string, language: string, locale: string): boolean {
  const lower = language.toLocaleLowerCase(locale);
  const stem = lower.slice(0, Math.max(4, lower.length - 3));
  return name.toLocaleLowerCase(locale).includes(stem);
}

/** A page's title with Lymi's name after it, the way every page ends its title. */
export function branded(i18n: I18n, title: string): string {
  return i18n._(msg`${title} · Lymi`);
}
