import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { State } from "./fsrs";
import { fitFields, IMPORT_LIMITS, type ImportedProgress, importTags } from "./import";
import { replayProgress } from "./import-replay";
import {
  decodeTextImport,
  detectSeparators,
  encodeTextImport,
  normaliseText,
  parseDelimited,
} from "./import-text";
import { tagKey } from "./terms";
import type { Rating } from "./types";

const DAY_MS = 86_400_000;
const NOW = new Date("2026-11-18T12:00:00Z").getTime();

/** Text a learner might type on one side of a card, in any script, with no line breaks. */
const side = fc
  .string({ unit: "grapheme", minLength: 1, maxLength: 30 })
  .map((text) => text.replace(/[\s\p{Cc}]+/gu, " ").trim())
  .filter((text) => text.length > 0);

/** Letters and spaces only, so no side looks like a separator. */
const word = fc
  .stringMatching(/^[a-zа-яіїєґ]+( [a-zа-яіїєґ]+)?$/)
  .filter((text) => text.length <= 30);

describe("pasted text properties", () => {
  it("reads back every card it would write with any separators the sides don't contain", () => {
    const separators = fc.constantFrom(
      { field: "\t", row: "\n" },
      { field: ",", row: "\n" },
      { field: "\t", row: ";" },
      { field: "||", row: "##" },
    );
    fc.assert(
      fc.property(separators, fc.array(fc.tuple(side, side), { maxLength: 20 }), (seps, rows) => {
        // A side holding a separator's character is ambiguous in any delimited text: "#" beside "##".
        const marks = [...seps.field, ...seps.row];
        const clean = rows.filter(
          ([term, definition]) =>
            !marks.some((mark) => term.includes(mark) || definition.includes(mark)) &&
            !term.startsWith('"'),
        );
        const text = clean.map(([term, definition]) => `${term}${seps.field}${definition}`);
        const parsed = parseDelimited(text.join(seps.row), seps);
        expect(parsed.cards).toEqual(clean.map(([term, definition]) => ({ term, definition })));
        expect(parsed.oneSided).toBe(0);
      }),
    );
  });

  it("accounts for every row as a card, a one-sided row or a blank one", () => {
    fc.assert(
      fc.property(fc.array(fc.string({ maxLength: 20 }), { maxLength: 30 }), (lines) => {
        const text = lines.join("\n");
        const rows = normaliseText(text).split("\n");
        if (rows.length > 1 && rows.at(-1)?.trim() === "") rows.pop();
        const parsed = parseDelimited(text, { field: "\t", row: "\n" });
        expect(parsed.cards.length + parsed.oneSided + parsed.blank).toBe(rows.length);
      }),
    );
  });

  it("detects Quizlet's default separators in a Quizlet export", () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(word, word), { minLength: 2, maxLength: 20 }), (rows) => {
        const text = rows.map(([term, definition]) => `${term}\t${definition}`).join("\n");
        expect(detectSeparators(text)).toEqual({ field: "\t", row: "\n", confidence: 1 });
      }),
    );
  });

  it("normalises text once", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        expect(normaliseText(normaliseText(text))).toBe(normaliseText(text));
      }),
    );
  });

  it("decodes the learner's choices and text exactly as encoded", () => {
    const separator = fc.string({ minLength: 1, maxLength: 10 });
    const meta = fc.record({
      separators: fc.record({ field: separator, row: fc.string({ maxLength: 10 }) }),
      deckName: fc.string(),
      deckId: fc.option(fc.string({ minLength: 1 }), { nil: null }),
    });
    fc.assert(
      fc.property(meta, fc.string(), (choices, text) => {
        expect(decodeTextImport(encodeTextImport(choices, text))).toEqual({ meta: choices, text });
      }),
    );
  });
});

describe("imported field properties", () => {
  // `size: "max"` lets text reach past each limit; fast-check otherwise stops at ten characters.
  const field = (max: number) =>
    fc.option(fc.string({ maxLength: max, size: "max" }), { nil: undefined });
  const fields = fc.record({
    term: fc.string({ maxLength: 600, size: "max" }),
    meaning: field(2500),
    pronunciation: field(300),
    example: field(2500),
    exampleTranslation: field(600),
    notes: field(2500),
  });
  const codePoints = (text: string | undefined) => [...(text ?? "")].length;

  it("keeps every field inside its limit", () => {
    fc.assert(
      fc.property(fields, (input) => {
        const { fields: fitted } = fitFields(input);
        expect(codePoints(fitted.term)).toBeLessThanOrEqual(IMPORT_LIMITS.term);
        expect(codePoints(fitted.meaning)).toBeLessThanOrEqual(IMPORT_LIMITS.meaning);
        expect(codePoints(fitted.pronunciation)).toBeLessThanOrEqual(IMPORT_LIMITS.pronunciation);
        expect(codePoints(fitted.example)).toBeLessThanOrEqual(IMPORT_LIMITS.example);
        expect(codePoints(fitted.exampleTranslation)).toBeLessThanOrEqual(
          IMPORT_LIMITS.exampleTranslation,
        );
        expect(codePoints(fitted.notes)).toBeLessThanOrEqual(IMPORT_LIMITS.notes);
      }),
    );
  });

  it("changes no text it does not report as shortened", () => {
    fc.assert(
      fc.property(fields, (input) => {
        const { fields: fitted, shortened } = fitFields(input);
        if (shortened) return;
        for (const key of Object.keys(input) as (keyof typeof input)[]) {
          expect(fitted[key] ?? "").toBe(input[key] ?? "");
        }
      }),
    );
  });

  it("fits fields that already fit to the same fields", () => {
    fc.assert(
      fc.property(fields, (input) => {
        const once = fitFields(input).fields;
        expect(fitFields(once)).toEqual({ fields: once, shortened: false });
      }),
    );
  });

  it("keeps tags one learner's tag list can hold", () => {
    // Accented letters typed composed and decomposed, in either case.
    const tag = fc
      .array(fc.constantFrom("a", "B", " ", "é", "é", "É", "É", "ї", "Ї", "ї"), {
        maxLength: 50,
        size: "max",
      })
      .map((parts) => parts.join(""));
    fc.assert(
      fc.property(fc.array(tag, { maxLength: 30, size: "max" }), (tags) => {
        const kept = importTags(tags).tags;
        expect(kept.length).toBeLessThanOrEqual(IMPORT_LIMITS.tags);
        for (const each of kept) {
          expect(each).toBe(each.trim());
          expect(codePoints(each)).toBeLessThanOrEqual(IMPORT_LIMITS.tag);
        }
        expect(new Set(kept.map(tagKey)).size).toBe(kept.length);
      }),
    );
  });
});

describe("imported progress properties", () => {
  const review = fc.record({
    at: fc.integer({ min: NOW - 3 * 365 * DAY_MS, max: NOW + 30 * DAY_MS }).map((t) => new Date(t)),
    rating: fc.constantFrom<Rating>(1, 2, 3, 4),
  });
  const progress = fc.record({
    mode: fc.constant("term_to_meaning" as const),
    reviews: fc.uniqueArray(review, { selector: (r) => r.at.getTime(), maxLength: 20 }),
    due: fc.option(
      fc.integer({ min: NOW - 365 * DAY_MS, max: NOW + 365 * DAY_MS }).map((t) => new Date(t)),
      { nil: undefined },
    ),
  }) satisfies fc.Arbitrary<ImportedProgress>;

  it("replays a log the same way whatever order the file lists it in", () => {
    fc.assert(
      fc.property(
        progress.chain((p) =>
          fc.tuple(
            fc.constant(p),
            fc.shuffledSubarray(p.reviews, {
              minLength: p.reviews.length,
              maxLength: p.reviews.length,
            }),
          ),
        ),
        ([source, shuffled]) => {
          const now = new Date(NOW);
          expect(replayProgress({ ...source, reviews: shuffled }, now)).toEqual(
            replayProgress(source, now),
          );
        },
      ),
    );
  });

  it("stores each past recall once, oldest first, and none from the future", () => {
    fc.assert(
      fc.property(progress, (source) => {
        const { reviews } = replayProgress(source, new Date(NOW));
        const past = source.reviews.filter((r) => r.at.getTime() <= NOW);
        expect(reviews).toHaveLength(past.length);
        for (let i = 1; i < reviews.length; i++) {
          expect(reviews[i]?.reviewedAt.getTime()).toBeGreaterThan(
            reviews[i - 1]?.reviewedAt.getTime() ?? 0,
          );
        }
      }),
    );
  });

  it("keeps the source's due date unless it falls before the last recall", () => {
    fc.assert(
      fc.property(progress, (source) => {
        const { state, reviews } = replayProgress(source, new Date(NOW));
        if (reviews.length === 0) {
          expect(state.state).toBe(State.New);
          return;
        }
        const last = reviews.at(-1)?.reviewedAt.getTime() ?? 0;
        if (source.due && source.due.getTime() >= last) {
          expect(state.due.getTime()).toBe(source.due.getTime());
        }
        expect(state.due.getTime()).toBeGreaterThanOrEqual(last);
      }),
    );
  });
});
