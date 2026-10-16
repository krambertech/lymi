import { LESSON_READS_PER_DAY, newId } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import { testGateway } from "../../test/ai-gateway";
import { schema } from "../db";
import { type Session, type TestApp, testApp } from "../test-app";

/** Refusals at /api/lesson-reads. What a read finds is `services/lessons.test.ts`. */
let app: TestApp;
let operator: Session;
let stranger: Session;
const resized: number[] = [];

const pdf = () => new File([new TextEncoder().encode("%PDF-1.4 /Type /Page")], "lesson.pdf");
const photo = () => new File([new Uint8Array([0xff, 0xd8, 0xff])], "page.jpg");

function upload(files: File[], as: Session) {
  const form = new FormData();
  for (const file of files) form.append("file", file);
  return app.fetch("/api/lesson-reads", { method: "POST", body: form, as });
}

beforeAll(async () => {
  app = await testApp({
    operators: ["lesson-operator@lymi.local"],
    env: {
      ...testGateway,
      ANTHROPIC_API_KEY: "key",
      IMAGES: {
        input() {
          resized.push(1);
          throw new Error("A refused read must not reach image processing");
        },
      } as unknown as ImagesBinding,
    },
  });
  operator = await app.signUp("lesson-operator");
  stranger = await app.signUp("lesson-stranger");
}, 60_000);

describe("POST /api/lesson-reads", () => {
  it("refuses a learner at today's limit before touching their photos", async () => {
    const today = new Date().toISOString().slice(0, 10);
    await app.db.insert(schema.lessonReads).values(
      Array.from({ length: LESSON_READS_PER_DAY }, () => ({
        id: newId(),
        userId: stranger.userId,
        localDate: today,
      })),
    );
    const response = await upload([photo(), photo()], stranger);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "daily_limit" });
    expect(resized).toEqual([]);
  });

  it("refuses a fourth PDF", async () => {
    const response = await upload([pdf(), pdf(), pdf(), pdf()], operator);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("3 PDFs") });
  });
});

describe("POST /api/lesson-reads/answers", () => {
  const check = (as: Session) =>
    app.fetch("/api/lesson-reads/answers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question: "Only the verbs?",
        answer: "only verbs",
        terms: [{ id: "t1", term: "jooma", gloss: "to drink" }],
      }),
      as,
    });

  it("checks an answer only after a recent read", async () => {
    const reader = await app.signUp("lesson-answerer");
    const refused = await check(reader);
    expect(refused.status).toBe(403);
    expect(await refused.json()).toMatchObject({ code: "no_recent_read" });

    await app.db
      .insert(schema.lessonReads)
      .values({ id: newId(), userId: reader.userId, localDate: "2026-01-01" });
    expect((await check(reader)).status).toBe(200);
  });
});
