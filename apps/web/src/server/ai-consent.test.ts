import { AddCardOutcomeOut, DeckOut, formatClientHeader, SettingsOut } from "@lymi/core";
import { beforeAll, expect, it } from "vitest";
import type { EnrichmentQueue } from "./services/enrichment";
import {
  json,
  PRODUCT_URL,
  PUBLIC_SITE_URL,
  type Session,
  type TestApp,
  testApp,
} from "./test-app";

let app: TestApp;
let session: Session;
const phone = { "x-lymi-client": formatClientHeader({ platform: "ios", version: "1.0.0" }) };

beforeAll(async () => {
  const queue: EnrichmentQueue = { create: async () => undefined };
  app = await testApp({ env: { OPENAI_API_KEY: "test", ENRICH_WORKFLOW: queue } as never });
  session = await app.signUp("ai-choice");
}, 60_000);

const addFromPhone = async (deckId: string, term: string) => {
  const response = await app.fetch("/api/cards", {
    ...json({ deckId, term }, { headers: phone }),
    as: session,
  });
  const outcome = AddCardOutcomeOut.parse(await response.json());
  if (outcome.status !== "added") throw new Error("not added");
  return outcome.card.enrichmentStatus;
};

it("enriches a phone's card only once the learner allows AI from the phone", async () => {
  const made = await app.fetch("/api/decks", {
    ...json({ name: "Eesti", defaultLanguage: "et" }),
    as: session,
  });
  const deckId = DeckOut.parse(await made.json()).id;
  expect(await addFromPhone(deckId, "kohvik")).toBeNull();

  const allowed = await app.fetch("/api/settings/ai-consent", {
    ...json(
      { version: 1, allowed: true, updated_at: Date.now(), place: "add" },
      { method: "PUT", headers: phone },
    ),
    as: session,
  });
  expect(allowed.status).toBe(200);
  expect(SettingsOut.parse(await allowed.json()).aiConsent).toBe(true);
  expect(await addFromPhone(deckId, "raamat")).toBe("working");
});

it("changes the choice only from the product or the phone", async () => {
  for (const origin of [PUBLIC_SITE_URL, "https://unrelated.example"]) {
    const denied = await app.fetch("/api/settings/ai-consent", {
      ...json(
        { version: 1, allowed: true, updated_at: Date.now() },
        { method: "PUT", headers: { origin } },
      ),
      as: session,
    });
    expect(denied.status).toBe(403);
  }
  const web = await app.fetch("/api/settings/ai-consent", {
    ...json(
      { version: 1, allowed: false, updated_at: Date.now() },
      { method: "PUT", headers: { origin: PRODUCT_URL } },
    ),
    as: session,
  });
  expect(SettingsOut.parse(await web.json()).aiConsent).toBe(false);
  const anonymous = await app.fetch(
    "/api/settings/ai-consent",
    json({ version: 1, allowed: true, updated_at: Date.now() }, { method: "PUT" }),
  );
  expect(anonymous.status).toBe(401);
});
