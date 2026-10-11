import { configureClient, type KeyValueStore } from "@lymi/client";
import { api } from "@lymi/client/api";
import { flushOutbox, outboxSize, recordGrade } from "@lymi/client/grades";
import { drawState } from "@lymi/client/review-draw";
import { DeckOut, modeKey } from "@lymi/core";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { json, type Session, type TestApp, testApp } from "./test-app";

/**
 * The shared client configured as `apps/mobile/src/data/client.ts` configures it, against the
 * real Worker: no browser cookies, the session sent as a header, storage that outlives a quit.
 * The smoke journey covers what only the native build can show. docs/testing.md.
 */
const PHONE_ORIGIN = "https://phone.test";
let app: TestApp;
let learner: Session;
let offline = false;

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("phone-client");
  const deck = await app.fetch("/api/decks", {
    ...json({ name: "Lesson 5", defaultLanguage: "et" }),
    as: learner,
  });
  const deckId = DeckOut.parse(await deck.json()).id;
  const cards = await app.fetch("/api/cards/batch", {
    ...json({
      cards: ["maja", "kass", "koer"].map((term) => ({ deckId, term, meaning: term })),
    }),
    as: learner,
  });
  expect(cards.status).toBe(200);

  const kept = new Map<string, string>();
  const storage: KeyValueStore = {
    getItem: (key) => kept.get(key) ?? null,
    setItem: (key, value) => void kept.set(key, value),
    removeItem: (key) => void kept.delete(key),
    keys: () => [...kept.keys()],
  };
  configureClient({
    baseUrl: PHONE_ORIGIN,
    headers: () => ({ cookie: learner.cookie }),
    credentials: "omit",
    storage,
    messages: {
      unreachable: () => "unreachable",
      signIn: () => "sign in",
      ownerOnly: () => "owner only",
      gone: () => "gone",
      failed: () => "failed",
    },
  });
  // React Native's fetch reaches the Worker; offline it throws, as a dropped connection does.
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
    if (offline) throw new TypeError("Network request failed");
    const url = new URL(input);
    expect(url.origin).toBe(PHONE_ORIGIN);
    expect(init?.credentials).toBe("omit");
    return app.fetch(`${url.pathname}${url.search}`, init);
  });
}, 60_000);

afterEach(() => {
  offline = false;
});

/** The next card the review would show, and the grade the phone records for it. */
async function nextGrade() {
  const data = await api.draw();
  const state = drawState(data, [], new Date(), undefined);
  if (!state.next) throw new Error("Nothing to draw");
  const { cardId, mode } = state.next;
  const card = data.cards.find((c) => c.card.id === cardId);
  const drawn = card?.modes.find((m) => modeKey(m.mode) === mode);
  if (!drawn) throw new Error("The drawn mode is not among the card's modes");
  return {
    cardId,
    mode: drawn.mode,
    rating: 3 as const,
    reviewedAt: new Date().toISOString(),
    stateBefore: drawn.fsrsState,
  };
}

describe("the phone's shared client against the Worker", () => {
  it("reads the learner's decks and draw with the session header alone", async () => {
    const decks = await api.decks();
    expect(decks.map((d) => d.name)).toContain("Lesson 5");
    const draw = await api.draw();
    expect(draw.cards).toHaveLength(3);
  });

  it("sends a grade at once, and replays one made offline after reconnecting", async () => {
    expect(await recordGrade(await nextGrade())).toBe("sent");

    const second = await nextGrade();
    offline = true;
    expect(await recordGrade(second)).toBe("queued");
    expect(outboxSize()).toBe(1);

    offline = false;
    expect(await flushOutbox()).toBe(1);
    expect(outboxSize()).toBe(0);
    const streak = await api.streak();
    expect(streak.today.attempts).toBe(2);
  });
});
