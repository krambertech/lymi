import { ApiKeyCreatedOut, OkOut } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import { json, type Session, type TestApp, testApp } from "../test-app";

/**
 * Writing to Lymi without leaving it. The note goes to the operator inbox with the learner as its
 * reply-to, which is also how the outbox finds it. Limits and audit are `services/feedback.test.ts`.
 */
let app: TestApp;
let learner: Session;
let key: string;

const note = {
  kind: "idea",
  message: "Let a deck hold a picture.",
  screen: "/today",
  language: "en",
};

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("learner");
  const made = await app.fetch("/api/keys", {
    ...json({ name: "Lesson notes script", scope: "write" }),
    as: learner,
  });
  key = ApiKeyCreatedOut.parse(await made.json()).key;
}, 60_000);

describe("POST /api/feedback", () => {
  it("sends the learner's note to the operator inbox, answerable to the learner", async () => {
    const response = await app.fetch("/api/feedback", { ...json(note), as: learner });
    expect(response.status).toBe(200);
    expect(OkOut.parse(await response.json())).toEqual({ ok: true });

    const outbox = await app.fetch("/api/dev/outbox", json({ to: learner.email }));
    expect(outbox.status).toBe(200);
    expect(await outbox.json()).toMatchObject({
      message: {
        kind: "feedback",
        to: "hello@lymi.app",
        replyTo: learner.email,
        subject: "Lymi feedback: Idea",
        text: expect.stringContaining("Let a deck hold a picture."),
      },
    });
  });

  it("is the learner's to send, never a key's", async () => {
    const response = await app.fetch(
      "/api/feedback",
      json(note, { headers: { "x-api-key": key } }),
    );
    expect(response.status).toBe(403);
  });

  it("needs a session", async () => {
    expect((await app.fetch("/api/feedback", json(note))).status).toBe(401);
  });

  it("refuses an empty note", async () => {
    const response = await app.fetch("/api/feedback", {
      ...json({ ...note, message: " " }),
      as: learner,
    });
    expect(response.status).toBe(400);
  });
});
