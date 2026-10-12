import { configureClient, type KeyValueStore } from "@lymi/client";
import { api, type Draw } from "@lymi/client/api";
import { flushOutbox, outboxSize, recordGrade } from "@lymi/client/grades";
import { streakWith } from "@lymi/client/review-day";
import { drawState } from "@lymi/client/review-draw";
import { resetUpdateRequired, updateRequired } from "@lymi/client/update-required";
import { DeckOut, formatClientHeader, modeKey, REVIEW_MODE_KEYS, ReviewMode } from "@lymi/core";
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
let deckId: string;
let offline = false;
/** Changes a response on its way to the client, as a newer Worker's would differ. */
let rewrite: ((path: string, body: Record<string, unknown>) => void) | null = null;

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("phone-client");
  const deck = await app.fetch("/api/decks", {
    ...json({ name: "Lesson 5", defaultLanguage: "et" }),
    as: learner,
  });
  deckId = DeckOut.parse(await deck.json()).id;
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
    headers: () => ({
      cookie: learner.cookie,
      "x-lymi-client": formatClientHeader({ platform: "ios", version: "1.0.0", build: "1" }),
    }),
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
    const response = await app.fetch(`${url.pathname}${url.search}`, init);
    if (!rewrite || !response.ok) return response;
    const body = (await response.json()) as Record<string, unknown>;
    rewrite(url.pathname, body);
    return Response.json(body, { status: response.status });
  });
}, 60_000);

afterEach(() => {
  offline = false;
  rewrite = null;
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

  it("turns 426 into Update Lymi and keeps a grade made after it for the updated app", async () => {
    const grade = await nextGrade();
    app.env.PHONE_MINIMUM_VERSION_IOS = "1.1.0";
    app.env.PHONE_UPDATE_URL_IOS = "itms-beta://";
    try {
      await expect(api.decks()).rejects.toMatchObject({ status: 426 });
      expect(updateRequired()).toEqual({ updateUrl: "itms-beta://" });
      expect(await recordGrade(grade)).toBe("queued");
      expect(outboxSize()).toBe(1);
    } finally {
      delete app.env.PHONE_MINIMUM_VERSION_IOS;
      resetUpdateRequired();
    }

    // The updated release sends what the old one kept.
    expect(await flushOutbox()).toBe(1);
    expect(outboxSize()).toBe(0);
    expect((await api.streak()).today.attempts).toBe(3);
  });

  it("reads an unknown value in an open field safely", async () => {
    // The tests before grade every card, so this one brings its own to draw.
    const added = await app.fetch("/api/cards/batch", {
      ...json({ cards: [{ deckId, term: "lind", meaning: "lind" }] }),
      as: learner,
    });
    expect(added.status).toBe(200);
    const audio = { cue: "audio", target: "term" };
    rewrite = (path, body) => {
      if (path === "/api/review/draw") {
        const draw = body as unknown as Draw;
        const [first] = draw.cards;
        if (!first?.modes[0]) throw new Error("The draw is empty");
        const unknown = { ...first.modes[0], mode: audio, stateId: "state_audio" };
        first.modes.push(unknown as never);
        draw.cards.push({
          ...first,
          card: { ...first.card, id: "card_audio" },
          modes: [unknown],
        } as never);
        draw.log.push({
          cardId: "card_audio",
          mode: audio,
          rating: 1,
          stateBefore: 2,
          at: new Date().toISOString(),
        } as never);
      }
      if (path === "/api/review/queue") {
        const queue = body as { items: { mode: unknown }[] };
        queue.items.push({ ...queue.items[0], mode: audio });
      }
      if (path === "/api/stats/streak") (body.today as { outcome: string }).outcome = "paused";
    };

    // A mode this release cannot ask is left out; its grade still counts toward today.
    const draw = await api.draw();
    const modes = draw.cards.flatMap((c) => c.modes.map((m) => m.mode));
    expect(modes.every((mode) => ReviewMode.safeParse(mode).success)).toBe(true);
    expect(draw.cards.map((c) => c.card.id)).not.toContain("card_audio");
    const state = drawState(draw, [], new Date(), undefined);
    expect(REVIEW_MODE_KEYS).toContain(state.next?.mode);
    expect(state.attempts).toBe(draw.log.length);

    const queue = await api.queue();
    expect(queue.items.every((item) => ReviewMode.safeParse(item.mode).success)).toBe(true);

    // An outcome this release does not know reads as a day not yet satisfied.
    const streak = await api.streak();
    expect(streakWith(streak, streak.today.attempts, false).today.outcome).toBe("paused");
  });
});
