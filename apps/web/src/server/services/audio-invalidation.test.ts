import { CardInput } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type Db, schema } from "../db";
import { pronunciationAudio } from "./audio";
import { addCards, getCard, updateCard } from "./cards";
import { createDeck } from "./decks";
import { learner, testDb } from "./test-db";

describe("Japanese generated audio invalidation", () => {
  let db: Db;
  let dispose: () => Promise<void>;
  let bucket: R2Bucket;
  beforeAll(async () => {
    const test = await testDb();
    db = test.db;
    dispose = test.dispose;
    bucket = test.env.AUDIO;
  }, 60_000);
  afterAll(async () => {
    await dispose();
  });

  it.each(["meaning", "pronunciation"] as const)(
    "clears generated audio for a %s edit but preserves a recording",
    async (field) => {
      const ctx = await learner(db, `audio-${field}`, "Test learner");
      const deck = await createDeck(ctx, { name: "Japanese", defaultLanguage: "ja" });
      const [added] = await addCards(ctx, [
        CardInput.parse({
          deckId: deck.id,
          term: "上手",
          pronunciation: "じょうず",
          meaning: "skilled",
          language: "ja",
        }),
      ]);
      if (added?.status !== "added") throw new Error("Card not added");
      const id = added.card.id;
      await db
        .update(schema.cards)
        .set({ audioKey: "old.mp3", audioSource: "generated" })
        .where(eq(schema.cards.id, id));
      await updateCard(
        ctx,
        id,
        field === "meaning" ? { meaning: "good at something" } : { pronunciation: "うわて" },
      );
      expect((await getCard(ctx, id)).audioKey).toBeNull();
      await db
        .update(schema.cards)
        .set({ audioKey: "recorded.mp3", audioSource: "recorded" })
        .where(eq(schema.cards.id, id));
      await updateCard(
        ctx,
        id,
        field === "meaning" ? { meaning: "skilled" } : { pronunciation: "じょうず" },
      );
      expect((await getCard(ctx, id)).audioKey).toBe("recorded.mp3");
    },
  );

  it("does not attach audio after the meaning changes during synthesis", async () => {
    const ctx = await learner(db, "audio-stale", "Test learner");
    const deck = await createDeck(ctx, { name: "Japanese", defaultLanguage: "ja" });
    const [added] = await addCards(ctx, [
      CardInput.parse({
        deckId: deck.id,
        term: "上手",
        pronunciation: "じょうず",
        meaning: "skilled",
        language: "ja",
      }),
    ]);
    if (added?.status !== "added") throw new Error("Card not added");
    const id = added.card.id;
    const clip = await pronunciationAudio(ctx, id, {
      bucket,
      providers: () => [
        {
          provider: "elevenlabs",
          model: "eleven_v4",
          voice: "Hiroki",
          locale: "ja-JP",
          contentType: "audio/mpeg",
          extension: "mp3",
          speech: async () => {
            await updateCard(ctx, id, { meaning: "the upper hand" });
            return new Response(new Uint8Array([1, 2, 3]));
          },
        },
      ],
    });
    await clip.body.cancel();
    expect((await getCard(ctx, id)).audioKey).toBeNull();
  });
  it("uses actual R2 conditional writes and serves a cached contextual clip on replay", async () => {
    const ctx = await learner(db, "audio-r2", "Test learner");
    const deck = await createDeck(ctx, { name: "Japanese", defaultLanguage: "ja" });
    const [added] = await addCards(ctx, [
      CardInput.parse({
        deckId: deck.id,
        term: "橋",
        pronunciation: "はし",
        meaning: "bridge",
        language: "ja",
      }),
    ]);
    if (added?.status !== "added") throw new Error("Card not added");
    const speech = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const generate = vi.fn(async () => ({
      previousText: "川を渡る",
      inputTokens: 300,
      outputTokens: 400,
    }));
    const deps = {
      bucket,
      leadIns: {
        writer: { model: "gemini-2.5-flash-lite", write: generate },
        decide: { run: async () => ({ answers: { ambiguous: { noul: 0.9 } } }) },
      },
      providers: () => [
        {
          provider: "elevenlabs" as const,
          model: "eleven_v4",
          voice: "Hiroki",
          locale: "ja-JP",
          contentType: "audio/mpeg" as const,
          extension: "mp3" as const,
          speech,
        },
      ],
    };
    const first = await pronunciationAudio(ctx, added.card.id, deps);
    await first.body.cancel();
    const replay = await pronunciationAudio(ctx, added.card.id, deps);
    await replay.body.cancel();
    expect(replay.key).toBe(first.key);
    expect(generate).toHaveBeenCalledOnce();
    expect(speech).toHaveBeenCalledOnce();
    expect(speech).toHaveBeenCalledWith({
      text: "はし",
      language: "ja",
      previousText: "川を渡る",
      usage: expect.any(Function),
    });
  });
});
