import { AddCardOutcomeOut, DeckOut } from "@lymi/core";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { json, type Session, type TestApp, testApp } from "../test-app";

const voicing = vi.hoisted(() => ({
  failure: new Error("R2 is unavailable"),
  report: vi.fn(),
}));

vi.mock("../services/published-audio", async (original) => ({
  ...(await original<typeof import("../services/published-audio")>()),
  voicePublishedDecks: () => Promise.reject(voicing.failure),
}));

vi.mock("../posthog", async (original) => ({
  ...(await original<typeof import("../posthog")>()),
  reportServerException: voicing.report,
}));

let app: TestApp;
let publisher: Session;

beforeAll(async () => {
  app = await testApp({ publishers: ["voicing@lymi.local"] });
  publisher = await app.signUp("voicing");
}, 60_000);

describe("publishing a deck", () => {
  it("answers even when voicing it fails, and reports the failure", async () => {
    const deck = await app.fetch("/api/decks", {
      ...json({ name: "Estonian", defaultLanguage: "et" }),
      as: publisher,
    });
    const { id } = DeckOut.parse(await deck.json());
    const card = await app.fetch("/api/cards", {
      ...json({ deckId: id, term: "tere", meaning: "hello" }),
      as: publisher,
    });
    AddCardOutcomeOut.parse(await card.json());

    const published = await app.fetch(`/api/decks/${id}/publication`, {
      ...json(
        {
          slug: "voicing-fails",
          summary: "Words and phrases for your first weeks in Estonia.",
          category: "languages",
          meaningLanguage: "en",
          publisher: "Lymi",
        },
        { method: "PUT" },
      ),
      as: publisher,
    });

    expect(published.status, await published.clone().text()).toBe(200);
    expect(voicing.report).toHaveBeenCalledWith(expect.anything(), voicing.failure, {
      route: "decks/publish-audio",
      method: "PUT",
    });
  });
});
