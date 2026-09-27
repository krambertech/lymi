import { and, eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TextProvider, TextRequest } from "../ai";
import { type Db, schema } from "../db";
import {
  DIAGNOSIS_THRESHOLD,
  type DiagnosisInput,
  diagnosisRequest,
  readReply,
  settle,
} from "../diagnosis/prompt";
import { addCards, updateCard } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import {
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

  it("writes nothing for a draw without a runner", async () => {
    const { ctx } = await setup();
    await reviewRounds(ctx);
    await reviewDraw(ctx, {});
    expect(await rowsOf(ctx)).toEqual([]);
  });
});
