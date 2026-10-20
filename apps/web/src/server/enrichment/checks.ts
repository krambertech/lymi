import { ENRICHED_FIELDS, type EnrichedField, stripReadings } from "@lymi/core";
import type { LanguageCheck } from "../languages";
import type { Filled } from "./prompt";

/**
 * What a case expects of one field. "empty" and "filled" test presence alone; an object tests
 * presence and the text. A field a case leaves out is free, but the house rules still apply.
 */
export type FieldExpectation =
  | "empty"
  | "filled"
  | {
      /** One of these, compared without case, outer spaces or a final full stop. */
      oneOf?: string[];
      /** Every one of these appears somewhere in the text, ignoring case. */
      includes?: string[];
      /** None of these appears, ignoring case. */
      excludes?: string[];
    };

export type CaseExpectations = Partial<Record<EnrichedField, FieldExpectation>>;

/** One scored rule: which field, which rule, and what the model wrote when it broke it. */
export type CheckResult = { field: EnrichedField; rule: string; pass: boolean; detail?: string };

/** What the checks need to know about the card the model wrote for. */
export type CheckedCard = {
  term: string;
  mayFill: readonly EnrichedField[];
  /** The deck teaches a language, so a meaning is a gloss rather than an explanation. */
  language: boolean;
  /** The rules the card's language module adds. */
  rules?: readonly LanguageCheck[] | undefined;
  expect: CaseExpectations;
};

const fold = (text: string) => text.trim().toLowerCase();
/** Scripts written without spaces between words, where a space-separated chunk is a whole phrase. */
const UNSPACED =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
const segmenter = new Intl.Segmenter("und", { granularity: "word" });

/** Words split on spaces, and a chunk in an unspaced script split by the word segmenter. */
export function words(text: string): number {
  let count = 0;
  for (const chunk of text.trim().split(/\s+/).filter(Boolean)) {
    if (!UNSPACED.test(chunk)) {
      count += 1;
      continue;
    }
    let inChunk = 0;
    for (const part of segmenter.segment(chunk)) if (part.isWordLike) inChunk += 1;
    count += Math.max(inChunk, 1);
  }
  return count;
}

/** A term ending in sentence punctuation reads as a sentence; an idiom without it does not. */
export function isSentence(term: string): boolean {
  return /[.!?…。！？]$/.test(term.trim());
}

/** Markdown the notes renderer shows as literal text, or that the prompt rules out. */
const NOTES_FORBIDDEN: [string, RegExp][] = [
  ["heading", /^\s{0,3}#/m],
  ["table", /^\s*\|.*\|\s*$/m],
  ["link", /\[[^\]]*\]\([^)]*\)|<https?:/],
  ["code", /`/],
  ["html", /<\/?[a-z][^>]*>/i],
];

/** Every rule one reply breaks or keeps for one card. */
export function checkCard(card: CheckedCard, reply: Filled | undefined): CheckResult[] {
  const results: CheckResult[] = [];
  const record = (field: EnrichedField, rule: string, pass: boolean, detail?: string) =>
    results.push({ field, rule, pass, ...(pass || detail === undefined ? {} : { detail }) });

  if (!reply) {
    for (const field of ENRICHED_FIELDS) record(field, "answered", false, "no entry for the card");
    return results;
  }
  for (const field of ENRICHED_FIELDS) {
    const text = reply[field]?.trim() || null;
    if (!card.mayFill.includes(field)) {
      record(field, "only mayFill", text === null, text ?? undefined);
      continue;
    }
    expectation(field, text, card.expect[field], record);
    if (text === null) continue;
    style(field, text, card, record);
  }
  return results;
}

function expectation(
  field: EnrichedField,
  text: string | null,
  expected: FieldExpectation | undefined,
  record: (field: EnrichedField, rule: string, pass: boolean, detail?: string) => void,
) {
  if (expected === undefined) return;
  if (expected === "empty") return record(field, "expected empty", text === null, text ?? "");
  record(field, "expected filled", text !== null, "null");
  if (expected === "filled" || text === null) return;
  const plain = fold(text).replace(/\.$/, "");
  if (expected.oneOf) {
    const pass = expected.oneOf.some((option) => fold(option).replace(/\.$/, "") === plain);
    record(field, "expected text", pass, text);
  }
  for (const part of expected.includes ?? []) {
    record(field, `includes ${part}`, fold(text).includes(fold(part)), text);
  }
  for (const part of expected.excludes ?? []) {
    record(field, `excludes ${part}`, !fold(text).includes(fold(part)), text);
  }
}

function style(
  field: EnrichedField,
  text: string,
  card: CheckedCard,
  record: (field: EnrichedField, rule: string, pass: boolean, detail?: string) => void,
) {
  if (field === "meaning") {
    record(field, "no quotation marks", !/^["'«“„]|["'»”]$/.test(text), text);
    if (card.language && !isSentence(card.term)) {
      const senses = text.split(";").map((sense) => sense.trim());
      record(field, "three senses at most", senses.length <= 3, text);
      record(
        field,
        "short gloss",
        senses.every((sense) => words(sense) <= 4),
        text,
      );
      record(field, "no full stop", !text.endsWith("."), text);
      if (words(card.term) === 1) {
        record(
          field,
          "not the term",
          !fold(text)
            .split(/[\s;,]+/)
            .includes(fold(card.term)),
          text,
        );
      }
    } else if (!card.language) {
      record(field, "under twelve words", words(text) < 12, text);
    }
  }
  if (field === "example") {
    record(field, "no example for a sentence", !isSentence(card.term), text);
    record(field, "under twelve words", words(stripReadings(text)) < 12, text);
  }
  if (field === "notes") {
    const lines = text.split("\n").filter((line) => line.trim());
    record(field, "four lines at most", lines.length <= 4, text);
    for (const [name, pattern] of NOTES_FORBIDDEN) {
      record(field, `no ${name}`, !pattern.test(text), text);
    }
  }
  if (field === "pronunciation") {
    record(field, "no slashes or brackets", !/^[/[]|[/\]]$/.test(text), text);
  }
  // Duplicates and search compare composed text, so a decomposed tone or accent mark would not match.
  record(field, "composed (NFC)", text === text.normalize("NFC"), text);
  for (const check of card.rules ?? []) {
    if (check.field === field) record(field, check.rule, check.pass(text), text);
  }
}

/** Pass counts per rule, so a report shows which habit fails rather than which card. */
export function tally(
  results: readonly CheckResult[],
): Map<string, { pass: number; total: number }> {
  const byRule = new Map<string, { pass: number; total: number }>();
  for (const result of results) {
    const key = `${result.field}: ${result.rule.startsWith("includes ") || result.rule.startsWith("excludes ") ? result.rule.split(" ")[0] : result.rule}`;
    const count = byRule.get(key) ?? { pass: 0, total: 0 };
    count.total += 1;
    if (result.pass) count.pass += 1;
    byRule.set(key, count);
  }
  return byRule;
}
