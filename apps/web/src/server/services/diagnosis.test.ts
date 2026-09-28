import { and, eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TextProvider, TextRequest } from "../ai";
import { type Db, schema } from "../db";
import {
  DIAGNOSIS_PROMPT_VERSION,
  DIAGNOSIS_THRESHOLD,
  type DiagnosisInput,
  diagnosisRequest,
  readReply,
  repeatedNoteLines,
  settle,
  sharedFormats,
} from "../diagnosis/prompt";
import { addCards, updateCard } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import {
  DIAGNOSIS_RETRY_MS,
  type DiagnoseRunParams,
  type DiagnosisRunner,
  diagnoseCard,
  diagnosisContext,
  diagnosisRunner,
  queueDiagnoses,
  showCardWithDiagnosis,
} from "./diagnosis";
import { gradeCard, reviewDraw, reviewRounds } from "./review";
import { setReviewTimezone } from "./review-days";
import { learner, testDb } from "./test-db";

const DAY = 86_400_000;

const input: DiagnosisInput = {
  meaningLanguage: "ru",
  card: { id: "c1", term: "alustama", meaning: "начинать", language: "et", asked: [] },
  deck: {
    name: "Verbs",
    cards: [
      { id: "c2", term: "algama", meaning: "начинаться" },
      { id: "c3", term: "tooma · tuua · toon", meaning: "приносить" },
    ],
  },
  oftenForgotten: [],
};

const reply = (overrides: Record<string, unknown>) => ({
  reason: "",
  cause: "unclear",
  confidence: 0.9,
  otherCardId: null,
  cards: null,
  cueField: null,
  cue: null,
  otherAnswer: null,
  hook: null,
  ...overrides,
});

describe("readReply and settle", () => {
  it("keeps a cause with a draft that parses when it clears the threshold", () => {
    const proposal = readReply(
      reply({
        cause: "confused_pair",
        otherCardId: "c2",
        cards: [
          { term: "alustan tööd", meaning: "я начинаю работу" },
          { term: "töö algab", meaning: "работа начинается" },
        ],
      }),
      input,
    );
    expect(settle(proposal)).toEqual({
      cause: "confused_pair",
      draft: {
        otherCardId: "c2",
        cards: [
          { term: "alustan tööd", meaning: "я начинаю работу" },
          { term: "töö algab", meaning: "работа начинается" },
        ],
      },
    });
  });

  it("says unclear below the threshold, and keeps what the model named", () => {
    const proposal = readReply(
      reply({ cause: "no_anchor", confidence: DIAGNOSIS_THRESHOLD - 0.01, hook: "как алый старт" }),
      input,
    );
    expect(proposal?.proposedCause).toBe("no_anchor");
    expect(settle(proposal)).toEqual({ cause: "unclear", draft: null });
  });

  it("refuses a pair with a card the model was not shown, or a draft missing its parts", () => {
    const stranger = readReply(
      reply({
        cause: "confused_pair",
        otherCardId: "someone-else",
        cards: [
          { term: "a", meaning: "b" },
          { term: "c", meaning: "d" },
        ],
      }),
      input,
    );
    expect(stranger?.diagnosis).toBeNull();
    expect(settle(stranger)).toEqual({ cause: "unclear", draft: null });
    const split = readReply(
      reply({ cause: "two_things", cards: [{ term: "a", meaning: "b" }] }),
      input,
    );
    expect(settle(split)).toEqual({ cause: "unclear", draft: null });
  });

  it("tells the model a deck's own format is never a cause", () => {
    expect(diagnosisRequest(input).instructions).toContain("tooma · tuua · toon");
  });
});

describe("the deck's notes as the model reads them", () => {
  const adjective = (id: string, term: string, opposite: string) => ({
    id,
    term,
    meaning: null,
    notes: `мн. *${term}d*\n\n**наоборот:** ${opposite}\n\nпримеры:\n*${"x".repeat(300)}*`,
  });
  const deck = [
    adjective("a1", "pikk", "lühike"),
    adjective("a2", "lai", "kitsas"),
    adjective("a3", "kerge", "raske"),
    { id: "v1", term: "tooma", meaning: "приносить", notes: "Не путай с *viima*." },
  ];

  it("names a note line most of the deck carries, and not one a single card has", () => {
    expect(repeatedNoteLines(deck)).toEqual(["наоборот:", "примеры:"]);
    expect(repeatedNoteLines(deck.slice(2))).toEqual([]);
  });

  it("hands the model the start of each neighbour's notes and the repeated lines", () => {
    const asked = JSON.parse(
      diagnosisRequest({ ...input, deck: { name: "Words", cards: deck } }).input,
    );
    expect(asked.deck.repeatedNoteLines).toEqual(["наоборот:", "примеры:"]);
    expect(asked.deck.cards[0].notes).toContain("наоборот:** lühike");
    expect(asked.deck.cards[0].notes.length).toBeLessThanOrEqual(201);
  });

  it("names a term pattern most of the deck shares, never the one card of its kind", () => {
    const sentence = (id: string, term: string) => ({ id, term, meaning: null });
    const phrases = [
      sentence("p1", "Ma elan Tallinnas."),
      sentence("p2", "Ilm on täna ilus."),
      sentence("p3", "Kas sa tuled homme?"),
      sentence("p4", "Kus on pood? — Pood on seal."),
    ];
    expect(sharedFormats(phrases)).toEqual(["a whole sentence"]);
    expect(sharedFormats(deck)).toEqual([]);
    const asked = JSON.parse(
      diagnosisRequest({ ...input, deck: { name: "Verbs", cards: input.deck.cards } }).input,
    );
    expect(asked.deck.sharedFormats).toEqual([]);
  });

  it("tells the model an opposite is never a pair on its own", () => {
    expect(diagnosisRequest(input).instructions).toContain("Opposites are not evidence");
  });
});

describe("diagnosisRunner", () => {
  const workflow = { create: async () => undefined };
  const defer = () => {};

  it("is null without an OpenAI key or the binding, so nothing is written or queued", () => {
    expect(
      diagnosisRunner({ OPENAI_API_KEY: "sk-test", DIAGNOSE_WORKFLOW: workflow }, defer),
    ).not.toBeNull();
    expect(diagnosisRunner({ DIAGNOSE_WORKFLOW: workflow }, defer)).toBeNull();
    expect(diagnosisRunner({ OPENAI_API_KEY: " ", DIAGNOSE_WORKFLOW: workflow }, defer)).toBeNull();
    expect(diagnosisRunner({ OPENAI_API_KEY: "sk-test" }, defer)).toBeNull();
  });
});

/** A provider that answers from a fixture and records what it was asked. */
function fakeProvider(answer: unknown): TextProvider & { asked: TextRequest[] } {
  const asked: TextRequest[] = [];
  return {
    provider: "openai",
    model: "test-model",
    asked,
    complete: async (request) => {
      asked.push(request);
      return answer;
    },
  };
}

/** A runner that records each queued run and hands back the deferred work to await. */
function recordingRunner() {
  const runs: DiagnoseRunParams[] = [];
  const pending: Promise<unknown>[] = [];
  const runner: DiagnosisRunner = {
    queue: {
      create: async ({ params }) => {
        runs.push(params);
      },
    },
    defer: (work) => {
      pending.push(work);
    },
  };
  return { runner, runs, settled: () => Promise.all(pending.splice(0)) };
}

describe("diagnosing an often-forgotten card", () => {
  let db: Db;
  let dispose: () => Promise<void>;
  let people = 0;

  beforeAll(async () => {
    ({ db, dispose } = await testDb());
  }, 60_000);

  afterAll(async () => {
    await dispose();
  });

  /** A learner whose first card was forgotten on 3 of its last 5 days, and a steady second card. */
  async function setup() {
    people += 1;
    const ctx = await learner(db, `diagnosed-${people}`, `Learner ${people}`);
    await setReviewTimezone(ctx, { mode: "manual", timezone: "UTC" });
    const deck = await createDeck(ctx, { name: "Verbs", defaultLanguage: "et" });
    const outcomes = await addCards(ctx, [
      { deckId: deck.id, term: "alustama", meaning: "начинать" },
      { deckId: deck.id, term: "algama", meaning: "начинаться" },
    ]);
    const [slipping, steady] = outcomes.flatMap((o) => (o.status === "added" ? [o.card] : []));
    if (!slipping || !steady) throw new Error("no cards");
    for (const [i, rating] of ([1, 1, 3, 1] as const).entries()) {
      await gradeCard(ctx, {
        cardId: slipping.id,
        direction: "recognition",
        rating,
        reviewedAt: new Date(Date.now() - (6 - i) * DAY),
      });
    }
    return { ctx, deck, slipping, steady };
  }

  const rowsOf = (ctx: ServiceContext) =>
    db.select().from(schema.cardDiagnoses).where(eq(schema.cardDiagnoses.userId, ctx.userId));

  it("queues one diagnosis per card revision, however many draws see it", async () => {
    const { ctx, slipping } = await setup();
    const { runner, runs, settled } = recordingRunner();

    await reviewRounds(ctx, { diagnose: runner });
    await reviewDraw(ctx, { diagnose: runner });
    await settled();
    await reviewRounds(ctx, { diagnose: runner });
    await settled();

    const rows = await rowsOf(ctx);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ cardId: slipping.id, revision: 1, status: "working" });
    expect(runs).toEqual([{ userId: ctx.userId, diagnosisIds: [rows[0]?.id] }]);
  });

  it("allows a new diagnosis once the card is edited", async () => {
    const { ctx, slipping } = await setup();
    const { runner, runs, settled } = recordingRunner();
    await reviewRounds(ctx, { diagnose: runner });
    await settled();
    await updateCard(ctx, slipping.id, { meaning: "начинать (что-то)" });
    await reviewRounds(ctx, { diagnose: runner });
    await settled();
    expect((await rowsOf(ctx)).map((row) => row.revision).sort()).toEqual([1, 2]);
    expect(runs).toHaveLength(2);
  });

  it("stores the cause against the revision, audits it, and shows it on the card read", async () => {
    const { ctx, slipping, steady } = await setup();
    const { runner, settled } = recordingRunner();
    await reviewRounds(ctx, { diagnose: runner });
    await settled();
    const [row] = await rowsOf(ctx);
    if (!row) throw new Error("no diagnosis");

    const provider = fakeProvider(
      reply({
        cause: "confused_pair",
        confidence: 0.8,
        otherCardId: steady.id,
        cards: [
          { term: "alustan tööd", meaning: "я начинаю работу" },
          { term: "töö algab", meaning: "работа начинается" },
        ],
      }),
    );
    await diagnoseCard(diagnosisContext(db, ctx.userId), row.id, provider);

    const asked = JSON.parse(provider.asked[0]?.input ?? "{}");
    expect(asked.card).toMatchObject({ term: "alustama", language: "et" });
    expect(asked.deck.cards.map((c: { id: string }) => c.id)).toEqual([steady.id]);

    const card = await showCardWithDiagnosis(ctx, slipping.id);
    expect(card.diagnosis).toMatchObject({
      cause: "confused_pair",
      confidence: 0.8,
      model: "test-model",
      draft: { otherCardId: steady.id },
    });
    const audit = await db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.userId, ctx.userId), eq(schema.auditLog.entity, "diagnosis")));
    expect(audit).toMatchObject([{ actor: "ai", action: "create", entityId: row.id }]);

    // A second run of the same row changes nothing, and an edit hides the old diagnosis.
    await diagnoseCard(diagnosisContext(db, ctx.userId), row.id, provider);
    expect(provider.asked).toHaveLength(1);
    await updateCard(ctx, slipping.id, { term: "alustama (midagi)" });
    expect((await showCardWithDiagnosis(ctx, slipping.id)).diagnosis).toBeNull();
  });

  it("stores unclear with no draft below the threshold", async () => {
    const { ctx, slipping } = await setup();
    const { runner, settled } = recordingRunner();
    await reviewRounds(ctx, { diagnose: runner });
    await settled();
    const [row] = await rowsOf(ctx);
    if (!row) throw new Error("no diagnosis");
    await diagnoseCard(
      diagnosisContext(db, ctx.userId),
      row.id,
      fakeProvider(reply({ cause: "no_anchor", confidence: 0.2, hook: "алый старт" })),
    );
    const [stored] = await rowsOf(ctx);
    expect(stored).toMatchObject({
      status: "done",
      cause: "unclear",
      proposedCause: "no_anchor",
      confidence: 0.2,
      draft: null,
    });
    expect((await showCardWithDiagnosis(ctx, slipping.id)).diagnosis).toMatchObject({
      cause: "unclear",
      draft: null,
    });
  });

  it("marks the rows failed when the workflow refuses the run, so nothing waits on it", async () => {
    const { ctx, slipping } = await setup();
    const queued = await queueDiagnoses(ctx, [slipping.id], {
      create: async () => {
        throw new Error("no workflow");
      },
    });
    expect(queued).toEqual([]);
    expect(await rowsOf(ctx)).toMatchObject([{ status: "failed" }]);
  });

  it("tries a failed revision again after a day, once however many draws race", async () => {
    const { ctx, slipping } = await setup();
    const refused = { create: async () => Promise.reject(new Error("no workflow")) };
    await queueDiagnoses(ctx, [slipping.id], refused);
    const [failed] = await rowsOf(ctx);
    if (!failed) throw new Error("no diagnosis");
    const { runner, runs } = recordingRunner();

    expect(await queueDiagnoses(ctx, [slipping.id], runner.queue)).toEqual([]);

    const tomorrow = new Date(Date.now() + DIAGNOSIS_RETRY_MS + 60_000);
    const racing = await Promise.all([
      queueDiagnoses(ctx, [slipping.id], runner.queue, tomorrow),
      queueDiagnoses(ctx, [slipping.id], runner.queue, tomorrow),
    ]);
    expect(racing.flat()).toEqual([failed.id]);
    expect(runs).toEqual([{ userId: ctx.userId, diagnosisIds: [failed.id] }]);
    expect(await rowsOf(ctx)).toMatchObject([{ id: failed.id, status: "working", revision: 1 }]);
  });

  it("queues a row a cut-off run left working after a day, once however many draws race", async () => {
    const { ctx, slipping } = await setup();
    // As a draw leaves it when the isolate dies before handing the row to the workflow.
    const [stuck] = await db
      .insert(schema.cardDiagnoses)
      .values({ id: `stuck-${ctx.userId}`, userId: ctx.userId, cardId: slipping.id, revision: 1 })
      .returning();
    if (!stuck) throw new Error("no diagnosis");
    expect(stuck).toMatchObject({ status: "working" });
    const { runner, runs } = recordingRunner();

    expect(await queueDiagnoses(ctx, [slipping.id], runner.queue)).toEqual([]);

    const tomorrow = new Date(Date.now() + DIAGNOSIS_RETRY_MS + 60_000);
    const racing = await Promise.all([
      queueDiagnoses(ctx, [slipping.id], runner.queue, tomorrow),
      queueDiagnoses(ctx, [slipping.id], runner.queue, tomorrow),
    ]);
    expect(racing.flat()).toEqual([stuck.id]);
    expect(runs).toEqual([{ userId: ctx.userId, diagnosisIds: [stuck.id] }]);
    expect(await rowsOf(ctx)).toMatchObject([
      { id: stuck.id, status: "working", updatedAt: tomorrow },
    ]);
  });

  /** Queues the setup's card and settles it as a pair with the steady card. */
  async function diagnosed(ctx: ServiceContext, steadyId: string) {
    const { runner, settled } = recordingRunner();
    await reviewRounds(ctx, { diagnose: runner });
    await settled();
    const [row] = await rowsOf(ctx);
    if (!row) throw new Error("no diagnosis");
    await diagnoseCard(
      diagnosisContext(db, ctx.userId),
      row.id,
      fakeProvider(
        reply({
          cause: "confused_pair",
          otherCardId: steadyId,
          cards: [
            { term: "alustan tööd", meaning: "я начинаю работу" },
            { term: "töö algab", meaning: "работа начинается" },
          ],
        }),
      ),
    );
    return row.id;
  }

  const setRow = (id: string, values: Partial<typeof schema.cardDiagnoses.$inferInsert>) =>
    db.update(schema.cardDiagnoses).set(values).where(eq(schema.cardDiagnoses.id, id));

  it("diagnoses a row from an older prompt again, once, and keeps when it was offered", async () => {
    const { ctx, slipping, steady } = await setup();
    const id = await diagnosed(ctx, steady.id);
    expect(await rowsOf(ctx)).toMatchObject([{ promptVersion: DIAGNOSIS_PROMPT_VERSION }]);
    const { runner, runs } = recordingRunner();
    expect(await queueDiagnoses(ctx, [slipping.id], runner.queue)).toEqual([]);

    const offeredAt = new Date(Date.now() - DAY);
    await setRow(id, { promptVersion: DIAGNOSIS_PROMPT_VERSION - 1, offeredAt });
    const racing = await Promise.all([
      queueDiagnoses(ctx, [slipping.id], runner.queue),
      queueDiagnoses(ctx, [slipping.id], runner.queue),
    ]);
    expect(racing.flat()).toEqual([id]);
    expect(runs).toEqual([{ userId: ctx.userId, diagnosisIds: [id] }]);
    expect(await rowsOf(ctx)).toMatchObject([{ id, status: "working", offeredAt }]);

    await diagnoseCard(
      diagnosisContext(db, ctx.userId),
      id,
      fakeProvider(reply({ cause: "unclear", confidence: 0.8 })),
    );
    expect(await rowsOf(ctx)).toMatchObject([
      {
        id,
        status: "done",
        cause: "unclear",
        draft: null,
        promptVersion: DIAGNOSIS_PROMPT_VERSION,
        offeredAt,
      },
    ]);
  });

  it("never diagnoses again a fix the learner accepted or dismissed, or a failure within its day", async () => {
    const { ctx, slipping, steady } = await setup();
    const id = await diagnosed(ctx, steady.id);
    const { runner } = recordingRunner();
    const older = DIAGNOSIS_PROMPT_VERSION - 1;

    await setRow(id, { promptVersion: older, acceptedAt: new Date() });
    expect(await queueDiagnoses(ctx, [slipping.id], runner.queue)).toEqual([]);
    await setRow(id, { acceptedAt: null, dismissedAt: new Date() });
    expect(await queueDiagnoses(ctx, [slipping.id], runner.queue)).toEqual([]);
    await setRow(id, { dismissedAt: null, status: "failed", updatedAt: new Date() });
    expect(await queueDiagnoses(ctx, [slipping.id], runner.queue)).toEqual([]);
    expect(await rowsOf(ctx)).toMatchObject([{ id, status: "failed", promptVersion: older }]);
  });

  it("writes nothing for a draw without a runner", async () => {
    const { ctx } = await setup();
    await reviewRounds(ctx);
    await reviewDraw(ctx, {});
    expect(await rowsOf(ctx)).toEqual([]);
  });
});
