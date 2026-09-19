import { OkOut } from "@lymi/core";
import { and, eq } from "@lymi/core/db";
import { beforeAll, describe, expect, it } from "vitest";
import { schema } from "../db";
import { json, type Session, type TestApp, testApp } from "../test-app";

let app: TestApp;
let operator: Session;
let learner: Session;

beforeAll(async () => {
  app = await testApp({ operators: ["operator@lymi.local"] });
  operator = await app.signUp("operator");
  learner = await app.signUp("learner");
}, 60_000);

const send = (as: Session | undefined, body: unknown) =>
  app.fetch("/api/email/test", { ...json(body), as });

describe("POST /api/email/test", () => {
  it("sends an operator's test email to the outbox and records the send", async () => {
    const response = await send(operator, { to: operator.email, language: "en" });
    expect(response.status).toBe(200);
    expect(OkOut.parse(await response.json())).toEqual({ ok: true });

    const outbox = await app.fetch("/api/dev/outbox", json({ to: operator.email }));
    expect(outbox.status).toBe(200);
    expect(await outbox.json()).toMatchObject({
      message: {
        kind: "test",
        to: operator.email,
        language: "en",
        subject: "Test email from Lymi",
        text: expect.stringContaining("Lymi can send account emails"),
      },
    });

    const recorded = await app.db
      .select()
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.userId, operator.userId),
          eq(schema.auditLog.action, "send_transactional_email"),
        ),
      );
    expect(recorded).toMatchObject([
      { actor: "user", entity: "account", payload: { kind: "test", delivery: "outbox" } },
    ]);
  });

  it("refuses a learner who is not an operator", async () => {
    const response = await send(learner, { to: learner.email, language: "en" });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Only a Lymi operator can send a test email." });
    expect(
      (await app.fetch("/api/dev/outbox", json({ to: learner.email }))).status,
      "nothing was written for the refused learner",
    ).toBe(404);
  });

  it("needs a session", async () => {
    const response = await send(undefined, { to: "anyone@lymi.local", language: "en" });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Sign in required" });
  });

  it("rejects a body the schema refuses before the service runs", async () => {
    const response = await send(operator, { to: "not-an-address", language: "fi" });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { issues: { path: string[] }[] };
    expect(body.issues.map((issue) => issue.path.join("."))).toEqual(["to", "language"]);
  });
});
