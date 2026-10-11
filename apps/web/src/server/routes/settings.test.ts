import { ApiKeyCreatedOut, SettingsOut } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import { json, type Session, type TestApp, testApp } from "../test-app";

/** Getting set up through the route; the goal rules are `services/settings.test.ts`. */
let app: TestApp;
let learner: Session;
let key: string;

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("onboarding");
  const made = await app.fetch("/api/keys", {
    ...json({ name: "Lesson notes script", scope: "write" }),
    as: learner,
  });
  key = ApiKeyCreatedOut.parse(await made.json()).key;
});

const answers = { learningKind: "language", learningLanguage: "pt-BR", dailyGoal: 25 };

describe("PUT /api/settings/onboarding", () => {
  it("saves the answers for the learner", async () => {
    const response = await app.fetch("/api/settings/onboarding", {
      ...json(answers, { method: "PUT" }),
      as: learner,
    });
    expect(response.status).toBe(200);
    const settings = SettingsOut.parse(await response.json());
    expect(settings).toMatchObject(answers);
    expect(settings.onboardedAt).not.toBeNull();
  });

  it("refuses a kind it does not know", async () => {
    const response = await app.fetch("/api/settings/onboarding", {
      ...json({ ...answers, learningKind: "hobby" }, { method: "PUT" }),
      as: learner,
    });
    expect(response.status).toBe(400);
  });

  it("is the learner's own, whatever a key's scope", async () => {
    const response = await app.fetch("/api/settings/onboarding", {
      ...json(answers, { method: "PUT", headers: { "x-api-key": key } }),
    });
    expect(response.status).toBe(403);
  });
});
