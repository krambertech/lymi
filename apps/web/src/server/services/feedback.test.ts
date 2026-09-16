import { FEEDBACK_DAILY_LIMIT, newId } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { type Db, schema } from "../db";
import type { Bindings } from "../env";
import type { ServiceContext } from "./context";
import { clearLocalEmailOutbox, latestLocalEmail } from "./email";
import { type FeedbackRequest, sendFeedback } from "./feedback";
import { learner, testDb } from "./test-db";

type FeedbackEnv = Pick<Bindings, "PRODUCT_URL" | "EMAIL" | "CF_VERSION_METADATA">;

function fakeEnv(productUrl: string, send = vi.fn().mockResolvedValue({ messageId: "message-1" })) {
  return {
    env: {
      PRODUCT_URL: productUrl,
      EMAIL: { send },
      CF_VERSION_METADATA: { id: "version-1", tag: "v42", timestamp: "2026-09-16T00:00:00Z" },
    } as FeedbackEnv,
    send,
  };
}

const note: FeedbackRequest = {
  kind: "bug",
  message: "The flame stopped at three days.",
  screen: "/today",
  language: "uk",
  browser: "Safari/17",
};

let db: Db;
let dispose: () => Promise<void>;
let nextLearner = 0;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60_000);

afterAll(async () => {
  await dispose();
});

async function person(name: string): Promise<ServiceContext> {
  nextLearner += 1;
  return learner(db, `feedback-${name.toLowerCase()}-${nextLearner}`, name);
}

const stored = (ctx: ServiceContext) =>
  db.select().from(schema.feedback).where(eq(schema.feedback.userId, ctx.userId));

const audits = (ctx: ServiceContext) =>
  db
    .select({ action: schema.auditLog.action, payload: schema.auditLog.payload })
    .from(schema.auditLog)
    .where(eq(schema.auditLog.userId, ctx.userId));

describe("feedback", () => {
  afterEach(() => {
    clearLocalEmailOutbox();
    vi.restoreAllMocks();
  });

  it("stores the note with what it was written on and sends it to the operator inbox", async () => {
    const ctx = await person("Sent");
    const { env } = fakeEnv("http://127.0.0.1:4173");

    await expect(sendFeedback(ctx, env, note)).resolves.toEqual({ delivery: "outbox" });

    await expect(stored(ctx)).resolves.toMatchObject([
      {
        kind: "bug",
        message: "The flame stopped at three days.",
        screen: "/today",
        appVersion: "v42",
        browser: "Safari/17",
        language: "uk",
        delivery: "outbox",
      },
    ]);
    expect(latestLocalEmail("hello@lymi.app")).toMatchObject({
      kind: "feedback",
      subject: "Lymi feedback: Bug",
    });
  });

  it("keeps the note and says so when the provider refuses", async () => {
    const ctx = await person("Failed");
    const { env } = fakeEnv(
      "https://my.lymi.app",
      vi.fn().mockRejectedValue(Object.assign(new Error("down"), { code: "E_DELIVERY_FAILED" })),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendFeedback(ctx, env, note)).rejects.toMatchObject({ code: "unavailable" });

    await expect(stored(ctx)).resolves.toMatchObject([
      { message: "The flame stopped at three days.", delivery: "failed" },
    ]);
    await expect(audits(ctx)).resolves.toEqual([
      { action: "send_feedback", payload: { kind: "bug", delivery: "failed" } },
    ]);
  });

  it("audits the kind and where it went, never what the learner wrote", async () => {
    const ctx = await person("Audited");
    const { env } = fakeEnv("http://127.0.0.1:4173");

    await sendFeedback(ctx, env, { ...note, kind: "idea", message: "A private wish." });

    const rows = await audits(ctx);
    expect(rows).toContainEqual({
      action: "send_feedback",
      payload: { kind: "idea", delivery: "outbox" },
    });
    expect(JSON.stringify(rows)).not.toContain("A private wish.");
  });

  it("refuses the note past the day's limit and leaves the next day free", async () => {
    const ctx = await person("Capped");
    const { env, send } = fakeEnv("http://127.0.0.1:4173");
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    // D1 binds at most 100 parameters per statement, so the day is filled one row at a time.
    for (let i = 0; i < FEEDBACK_DAILY_LIMIT; i += 1) {
      await db.insert(schema.feedback).values({
        id: newId(),
        userId: ctx.userId,
        kind: "other",
        message: "Earlier today.",
        screen: "/today",
        appVersion: "v42",
        browser: "Safari/17",
        language: "en",
        localDate: today,
        delivery: "outbox",
      });
    }

    await expect(sendFeedback(ctx, env, note)).rejects.toMatchObject({ code: "conflict" });
    expect(send).not.toHaveBeenCalled();
    await expect(stored(ctx)).resolves.toHaveLength(FEEDBACK_DAILY_LIMIT);

    // The cap counts one learner-local day, so a note written the next day goes through.
    await db
      .update(schema.feedback)
      .set({ localDate: tomorrow })
      .where(eq(schema.feedback.userId, ctx.userId));
    await expect(sendFeedback(ctx, env, note)).resolves.toEqual({ delivery: "outbox" });
  });
});
