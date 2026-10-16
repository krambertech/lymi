import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
import type { DecisionModel } from "../lessons/keep";
import { questionLimit } from "../lessons/prompt";
import { type LessonMaterial, type LessonReader, LessonReaderError } from "../lessons/reader";
import type { AnalyticsEvent } from "./analytics";
import { addCards } from "./cards";
import { createDeck } from "./decks";
import { readLesson } from "./lessons";
import { learner, testDb } from "./test-db";

let db: Db;
let dispose: () => Promise<void>;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60_000);

afterAll(async () => {
  await dispose();
});

const material: LessonMaterial = { images: [], pdfs: [], text: "Tund 6" };

const term = (id: string, value: string, extra: Record<string, unknown> = {}) => ({
  id,
  term: value,
  kind: "word",
  meaning: "значение",
  meaningFromLesson: true,
  handwritten: false,
  heading: "2.10",
  seen: value,
  ...extra,
});

function fakeReader(reply: unknown): LessonReader & { briefs: string[] } {
  const briefs: string[] = [];
  return {
    model: "claude-haiku-5-5",
    briefs,
    async stream(_material, brief, _schema, onText) {
      briefs.push(brief);
      // Small chunks, so terms arrive across several pieces of text as they do from the model.
      const text = JSON.stringify(reply);
      for (let i = 0; i < text.length; i += 7) onText(text.slice(i, i + 7));
      return { model: "claude-haiku-5-5", inputTokens: 1000, outputTokens: 200, ms: 5 };
    },
  };
}

const fakeAi = (scores: Record<string, number>): DecisionModel => ({
  async run(_model, input) {
    const term = (input as { state: { candidate: { term: string } } }).state.candidate.term;
    return { answers: { worth: { noul: scores[term] ?? 0.9 } } };
  },
});

describe("readLesson", () => {
  it("refuses an account that is not an operator", async () => {
    const ctx = await learner(db, "lesson-stranger", "Stranger");
    await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    await expect(
      readLesson(ctx, material, {
        reader: fakeReader({}),
        ai: undefined,
        operators: new Set(),
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("greys terms already owned, flags other forms, and keeps the lesson's meaning only", async () => {
    const ctx = await learner(db, "lesson-owner", "Kateryna");
    const operators = new Set(["lesson-owner@lymi.test"]);
    const deck = await createDeck(ctx, { name: "Eesti A1", defaultLanguage: "et" });
    await addCards(ctx, [
      { deckId: deck.id, term: "küsimus · küsimuse · küsimust", meaning: "вопрос", enrich: false },
      { deckId: deck.id, term: "küsima", meaning: "спрашивать", enrich: false },
    ]);
    const reader = fakeReader({
      deck: deck.id,
      terms: [
        term("t1", "jooma · juua · joon"),
        term("t2", "küsimus · küsimuse · küsimust"),
        term("t3", "küsima · küsida · küsin"),
        term("t4", "avage", { meaningFromLesson: false }),
      ],
      questions: [
        {
          question: "Only the words you marked?",
          options: [
            { label: "All", drop: [] },
            { label: "Marked", drop: ["t1", "t9"] },
          ],
          default: 7,
        },
      ],
    });

    const read = await readLesson(
      ctx,
      material,
      { reader, ai: fakeAi({ avage: 0.05 }), operators },
      { deckId: deck.id },
    );

    const byId = Object.fromEntries(read.terms.map((t) => [t.id, t]));
    expect(byId.t1).toMatchObject({
      ticked: true,
      existing: null,
      formOf: null,
      meaning: "значение",
    });
    expect(byId.t2?.existing?.deckName).toBe("Eesti A1");
    expect(byId.t2?.ticked).toBe(false);
    expect(byId.t3?.formOf?.term).toBe("küsima");
    expect(byId.t4).toMatchObject({ ticked: false, meaning: null, gloss: "значение", keep: 0.05 });
    expect(read.questions[0]?.options[1]?.drop).toEqual(["t1"]);
    expect(read.questions[0]?.default).toBe(1);
    expect(read.usage.costUsd).toBeCloseTo(0.0002);
    expect(reader.briefs[0]).toContain("küsima — спрашивать");
  });

  it("keeps the reader's choice when no decision model is bound", async () => {
    const ctx = await learner(db, "lesson-offline", "Kateryna");
    const deck = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    const read = await readLesson(ctx, material, {
      reader: fakeReader({
        deck: deck.id,
        terms: [term("t1", "magama · magada · magan")],
        questions: [],
      }),
      ai: undefined,
      operators: new Set(["lesson-offline@lymi.test"]),
    });
    expect(read.terms[0]).toMatchObject({ keep: null, ticked: true });
  });
});

describe("reporting a read", () => {
  it("reports the read's outcome and cost, and a failed call as an error", async () => {
    const who = await learner(db, "lesson-counted", "Kateryna");
    const events: AnalyticsEvent[] = [];
    const ctx = {
      ...who,
      analytics: { writeDataPoint: () => {}, capture: (e: AnalyticsEvent) => events.push(e) },
    };
    const operators = new Set(["lesson-counted@lymi.test"]);
    const deck = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    await addCards(ctx, [
      { deckId: deck.id, term: "küsima", meaning: "спрашивать", enrich: false },
    ]);
    events.length = 0;

    await readLesson(ctx, material, {
      reader: fakeReader({
        deck: deck.id,
        terms: [term("t1", "jooma · juua · joon"), term("t2", "küsima")],
        questions: [
          {
            question: "Marked only?",
            options: [
              { label: "All", drop: [] },
              { label: "Marked", drop: ["t1"] },
            ],
            default: 0,
          },
        ],
      }),
      ai: undefined,
      operators,
    });
    expect(events).toContainEqual({
      name: "lesson_read",
      pages: 0,
      pasted: true,
      deck: "guessed",
      terms: 2,
      ticked: 1,
      existing: 1,
      questions: 1,
    });
    expect(events).toContainEqual(
      expect.objectContaining({
        name: "$ai_generation",
        $ai_span_name: "lesson_read",
        $ai_provider: "anthropic",
        $ai_input_tokens: 1000,
        $ai_output_tokens: 200,
        $ai_is_error: false,
      }),
    );

    events.length = 0;
    const failing: LessonReader = {
      model: "claude-haiku-5-5",
      async stream() {
        throw new LessonReaderError("overloaded", { status: 529 });
      },
    };
    await expect(
      readLesson(ctx, material, { reader: failing, ai: undefined, operators }),
    ).rejects.toThrow();
    expect(events.map((e) => e.name)).toEqual(["$ai_generation"]);
    expect(events[0]).toMatchObject({ $ai_is_error: true, $ai_http_status: 529 });

    events.length = 0;
    await addCards(ctx, [{ deckId: deck.id, term: "jooma", enrich: false }], null, {
      fromLesson: true,
    });
    expect(events).toContainEqual({ name: "cards_added", source: "lesson", count: 1 });
  });
});

describe("choosing the deck", () => {
  it("streams the deck the model chose, among the learner's own", async () => {
    const ctx = await learner(db, "lesson-chooser", "Kateryna");
    await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
    const eesti = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    const reader = fakeReader({
      deck: eesti.id,
      terms: [term("t1", "jooma · juua · joon")],
      questions: [],
    });
    const events: string[] = [];
    const { prepareLesson, streamLesson } = await import("./lessons");
    const lesson = await prepareLesson(ctx, material, {
      reader,
      ai: undefined,
      operators: new Set(["lesson-chooser@lymi.test"]),
    });
    await streamLesson(lesson, material, undefined, (event) => {
      events.push(event.type === "deck" ? `deck:${event.deckId}:${event.guessed}` : event.type);
    });
    expect(events[0]).toBe(`deck:${eesti.id}:true`);
    expect(events).toContain("term");
    expect(reader.briefs[0]).toContain("Italiano");
  });
});

describe("questionLimit", () => {
  it("asks nothing about a paragraph and more about a long upload", () => {
    expect(questionLimit(0, 120)).toBe(0);
    expect(questionLimit(1, 0)).toBe(2);
    expect(questionLimit(10, 0)).toBe(5);
  });
});
