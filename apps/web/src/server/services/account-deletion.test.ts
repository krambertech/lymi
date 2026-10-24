import { newId } from "@lymi/core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type Db, schema } from "../db";
import type { Bindings } from "../env";
import {
  type DeletionDeps,
  deleteAccount,
  deletionSummary,
  dropUnstudiedFormerDecks,
  FORMER_OWNER_ID,
  sendDeletionCode,
} from "./account-deletion";
import { purgeCardAudio } from "./audio";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { copyFormerDecks } from "./deck-copies";
import { archiveDeck, createDeck } from "./decks";
import { clearLocalEmailOutbox, latestLocalEmail } from "./email";
import { inviteByEmail } from "./invitations";
import { join, leave } from "./members";
import { publishDeck } from "./publications";
import { gradeCard } from "./review";
import { learner, type TestBindings, testDb } from "./test-db";

let db: Db;
let raw: D1Database;
let bindings: TestBindings;
let dispose: () => Promise<void>;

const env = {
  PRODUCT_URL: "http://localhost:5241",
  EMAIL: { send: async () => ({ messageId: "" }) },
} as unknown as Pick<Bindings, "PRODUCT_URL" | "EMAIL">;

const ended: string[] = [];
const deps: DeletionDeps = {
  client: "web",
  request: undefined,
  verifyApple: null,
  endSessions: async (userId) => {
    ended.push(userId);
  },
  appleClients: null,
};

beforeAll(async () => {
  ({ db, raw, env: bindings, dispose } = await testDb());
}, 60_000);

afterAll(async () => {
  await dispose();
});

async function count(table: string, column: string, value: string) {
  const row = await raw
    .prepare(`select count(*) as n from "${table}" where "${column}" = ?`)
    .bind(value)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** A deck with one card `owner` made, which `member` joins and reviews once when given. */
async function deckWithCard(owner: ServiceContext, term: string, member?: ServiceContext) {
  const deck = await createDeck(owner, { name: `Deck ${term}`, defaultLanguage: "et" });
  const [added] = await addCards(owner, [{ deckId: deck.id, term, meaning: "hi" }]);
  if (added?.status !== "added") throw new Error("card not added");
  await gradeCard(owner, { cardId: added.card.id, direction: "recognition", rating: 3 });
  if (member) {
    await join(member, deck.id);
    await gradeCard(member, { cardId: added.card.id, direction: "recognition", rating: 3 });
  }
  return { deck, card: added.card };
}

async function stored(cardId: string) {
  const { objects } = await bindings.AUDIO.list({ prefix: `cards/${cardId}/` });
  return objects.map((object) => object.key);
}

async function codeFor(ctx: ServiceContext, email: string) {
  clearLocalEmailOutbox();
  await sendDeletionCode(ctx, env, undefined);
  const sent = latestLocalEmail(email);
  const code = sent?.text.match(/\b\d{6}\b/)?.[0];
  if (!code) throw new Error("no code sent");
  return code;
}

describe("deleting an account", () => {
  it("counts what goes and names the decks other people study", async () => {
    const olga = await learner(db, "olga", "Olga");
    const ivan = await learner(db, "ivan", "Ivan");
    await deckWithCard(olga, "tere");
    const { deck: shared } = await deckWithCard(olga, "aitäh", ivan);

    expect(await deletionSummary(olga)).toEqual({
      blocked: null,
      confirmWith: "email",
      decks: 2,
      cards: 2,
      reviews: 2,
      sharedDecks: [{ id: shared.id, name: shared.name, members: 1, published: false }],
    });
  });

  it("still hands back the cleanup when ending the sessions fails", async () => {
    const kai = await learner(db, "kai", "Kai");
    const code = await codeFor(kai, "kai@lymi.test");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const leftovers = await deleteAccount(
      kai,
      { code },
      {
        ...deps,
        endSessions: async () => {
          throw new Error("KV unavailable");
        },
      },
    );
    error.mockRestore();

    expect(leftovers).toMatchObject({ email: "kai@lymi.test", sessionsEnded: false });
    expect(await count("user", "id", kai.userId)).toBe(0);
  });

  it("needs the emailed code, and a fifth wrong one ends it", async () => {
    const mia = await learner(db, "mia", "Mia");
    const code = await codeFor(mia, "mia@lymi.test");
    const wrong = code === "000000" ? "111111" : "000000";
    await expect(sendDeletionCode(mia, env, undefined)).rejects.toMatchObject({
      reason: "code_sent",
    });

    for (let i = 0; i < 4; i++) {
      await expect(deleteAccount(mia, { code: wrong }, deps)).rejects.toMatchObject({
        reason: "code_wrong",
      });
    }
    await expect(deleteAccount(mia, { code: wrong }, deps)).rejects.toMatchObject({
      reason: "code_expired",
    });
    await expect(deleteAccount(mia, { code }, deps)).rejects.toMatchObject({
      reason: "code_expired",
    });
    expect(await count("user", "id", mia.userId)).toBe(1);
  });

  it("spends each attempt once, however many guesses arrive together", async () => {
    const ott = await learner(db, "ott", "Ott");
    const code = await codeFor(ott, "ott@lymi.test");
    const wrong = code === "000000" ? "111111" : "000000";
    const reasons: unknown[] = [];
    for (let round = 0; round < 5; round++) {
      const guesses = await Promise.allSettled(
        Array.from({ length: 12 }, () => deleteAccount(ott, { code: wrong }, deps)),
      );
      for (const g of guesses) reasons.push(g.status === "rejected" ? g.reason.reason : "deleted");
    }
    // Five attempts in all: four told "wrong", the fifth ends the code.
    expect(reasons.filter((r) => r === "code_wrong")).toHaveLength(4);
    expect(reasons.every((r) => r === "code_wrong" || r === "code_expired")).toBe(true);
    await expect(deleteAccount(ott, { code }, deps)).rejects.toMatchObject({
      reason: "code_expired",
    });
    expect(await count("user", "id", ott.userId)).toBe(1);
  });

  it("sends at most five codes a day", async () => {
    const eva = await learner(db, "eva", "Eva");
    for (let i = 0; i < 5; i++) {
      await sendDeletionCode(eva, env, undefined);
      await raw
        .prepare("update verification set created_at = 0 where identifier = ?")
        .bind(`delete-account:${eva.userId}`)
        .run();
    }
    await expect(sendDeletionCode(eva, env, undefined)).rejects.toMatchObject({
      reason: "code_limit",
    });
  });

  it("is refused to an integration", async () => {
    const lena = await learner(db, "lena", "Lena");
    const code = await codeFor(lena, "lena@lymi.test");
    await expect(deleteAccount({ ...lena, actor: "api" }, { code }, deps)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("erases the account, keeps a contentless record and leaves the decks it joined", async () => {
    const owner = await learner(db, "taavi", "Taavi");
    const nora = await learner(db, "nora", "Nora");
    const { deck: joined } = await deckWithCard(owner, "kass", nora);
    const { deck: own } = await deckWithCard(nora, "koer");
    await inviteByEmail(
      owner,
      (await createDeck(owner, { name: "Later" })).id,
      "nora@lymi.test",
      async () => {},
    );

    await raw
      .prepare(
        "insert into apikey (id, reference_id, key, created_at, updated_at) values ('nora-key', ?, 'hashed', 0, 0)",
      )
      .bind(nora.userId)
      .run();

    const code = await codeFor(nora, "nora@lymi.test");
    const leftovers = await deleteAccount(nora, { code }, deps);

    expect(leftovers).toMatchObject({
      email: "nora@lymi.test",
      confirmedWith: "email",
      keptDecks: 0,
    });
    expect(ended).toContain(nora.userId);
    expect(await count("user", "id", nora.userId)).toBe(0);
    expect(await count("decks", "id", own.id)).toBe(0);
    expect(await count("reviews", "user_id", nora.userId)).toBe(0);
    expect(await count("card_states", "user_id", nora.userId)).toBe(0);
    // The deck Nora studied is untouched for its owner, who sees her leave.
    expect(await count("decks", "id", joined.id)).toBe(1);
    expect(await count("reviews", "user_id", owner.userId)).toBe(1);
    const left = await raw
      .prepare("select count(*) as n from audit_log where user_id = ? and action = 'leave'")
      .bind(owner.userId)
      .first<{ n: number }>();
    expect(left?.n).toBe(1);
    expect(await count("deck_invitations", "email", "nora@lymi.test")).toBe(0);
    expect(await count("apikey", "reference_id", nora.userId)).toBe(0);
    const record = await raw
      .prepare("select * from account_deletions where id = ?")
      .bind(nora.userId)
      .first<Record<string, unknown>>();
    expect(record).toMatchObject({
      client: "web",
      confirmed_with: "email",
      decks: 1,
      cards: 1,
      reviews: 2,
      kept_decks: 0,
    });
  });

  it("gives each member a private copy of a deck they study, with their own progress", async () => {
    const kadri = await learner(db, "kadri", "Kadri");
    const peeter = await learner(db, "peeter", "Peeter");
    const { deck, card } = await deckWithCard(kadri, "maja", peeter);
    await raw.prepare("update cards set hook_draft = 'a draft' where id = ?").bind(card.id).run();
    await raw
      .prepare(
        "insert into card_corrections (card_id, field, user_id, ai_text, created_at) values (?, 'meaning', ?, 'the AI', 0)",
      )
      .bind(card.id, kadri.userId)
      .run();

    const code = await codeFor(kadri, "kadri@lymi.test");
    const leftovers = await deleteAccount(kadri, { code }, deps);

    expect(leftovers.keptDecks).toBe(1);
    expect(await count("user", "id", kadri.userId)).toBe(0);
    // Until the copy is made, the deck waits under the former owner and nobody can change it.
    expect(await count("former_deck_copies", "deck_id", deck.id)).toBe(1);
    const waiting = await raw
      .prepare("select user_id from decks where id = ?")
      .bind(deck.id)
      .first<{ user_id: string }>();
    expect(waiting?.user_id).toBe(FORMER_OWNER_ID);
    expect(await count("card_corrections", "card_id", card.id)).toBe(0);

    const captured: unknown[] = [];
    const events = { writeDataPoint: () => {}, capture: (event: unknown) => captured.push(event) };
    expect(await copyFormerDecks(db, events)).toEqual({ copied: 1 });
    expect(await copyFormerDecks(db, events)).toEqual({ copied: 0 });
    expect(captured).toEqual([{ name: "former_deck_copied", cards: 1 }]);

    const copy = await raw
      .prepare("select id, name from decks where user_id = ?")
      .bind(peeter.userId)
      .all<{ id: string; name: string }>();
    expect(copy.results).toEqual([{ id: expect.any(String), name: deck.name }]);
    const copied = await raw
      .prepare("select id, term, hook_draft from cards where deck_id = ?")
      .bind(copy.results[0]?.id)
      .first<{ id: string; term: string; hook_draft: string | null }>();
    expect(copied).toMatchObject({ term: "maja", hook_draft: null });
    expect(await count("card_states", "card_id", copied?.id ?? "")).toBe(1);
    expect(await count("reviews", "card_id", copied?.id ?? "")).toBe(1);
    expect(await count("deck_members", "user_id", peeter.userId)).toBe(0);
    expect(await count("deck_copy_ids", "user_id", peeter.userId)).toBe(0);
    expect(await count("former_deck_copies", "deck_id", deck.id)).toBe(0);

    const images = { delete: async () => {} } as unknown as R2Bucket;
    expect(await dropUnstudiedFormerDecks(db, images)).toBe(1);
    expect(await count("decks", "id", deck.id)).toBe(0);
    expect(await count("reviews", "user_id", peeter.userId)).toBe(1);
  });

  it("deletes an archived deck for everyone, with the members' progress in it", async () => {
    const owner = await learner(db, "rutt", "Rutt");
    const member = await learner(db, "kalev", "Kalev");
    const { deck } = await deckWithCard(owner, "kass", member);
    await archiveDeck(owner, deck.id);
    expect((await deletionSummary(owner)).sharedDecks).toEqual([]);

    await deleteAccount(owner, { code: await codeFor(owner, "rutt@lymi.test") }, deps);
    expect(await count("decks", "id", deck.id)).toBe(0);
    expect(await count("reviews", "user_id", member.userId)).toBe(0);
  });

  it("deletes the audio of the learner's cards and leaves a kept deck's", async () => {
    const owner = await learner(db, "ene", "Ene");
    const member = await learner(db, "toomas", "Toomas");
    const { card: own } = await deckWithCard(owner, "lill");
    const { card: kept } = await deckWithCard(owner, "meri", member);
    const current = `cards/${own.id}/recorded/term.mp3`;
    await raw.prepare("update cards set audio_key = ? where id = ?").bind(current, own.id).run();
    for (const key of [
      current,
      `cards/${own.id}/v1/old.mp3`,
      `cards/${kept.id}/recorded/term.mp3`,
    ]) {
      await bindings.AUDIO.put(key, "clip");
    }

    const leftovers = await deleteAccount(
      owner,
      { code: await codeFor(owner, "ene@lymi.test") },
      deps,
    );
    // The current clip goes straight away; the cron clears the rest of the folder.
    expect(leftovers.audioKeys).toEqual([current]);
    expect(await count("card_audio_purges", "card_id", own.id)).toBe(1);
    expect(await count("card_audio_purges", "card_id", kept.id)).toBe(0);
    await bindings.AUDIO.delete(leftovers.audioKeys);
    await purgeCardAudio(db, bindings.AUDIO);

    expect(await stored(own.id)).toEqual([]);
    expect(await stored(kept.id)).toEqual([`cards/${kept.id}/recorded/term.mp3`]);
    expect(await count("card_audio_purges", "card_id", own.id)).toBe(0);
  });

  it("keeps a card's audio queued while R2 refuses it", async () => {
    const owner = await learner(db, "malle", "Malle");
    const { card } = await deckWithCard(owner, "tool");
    await bindings.AUDIO.put(`cards/${card.id}/v2/speech.mp3`, "clip");
    await deleteAccount(owner, { code: await codeFor(owner, "malle@lymi.test") }, deps);

    const refusing = {
      list: async () => {
        throw new Error("R2 unavailable");
      },
    } as unknown as R2Bucket;
    await purgeCardAudio(db, refusing);
    expect(await count("card_audio_purges", "card_id", card.id)).toBe(1);

    await purgeCardAudio(db, bindings.AUDIO);
    expect(await count("card_audio_purges", "card_id", card.id)).toBe(0);
    expect(await stored(card.id)).toEqual([]);
  });

  it("deletes a publisher, closing the page and copying each learner's pinned edition", async () => {
    await db.insert(schema.user).values({ id: "lymi-lib", name: "Lymi", email: "lib@lymi.test" });
    const lymi: ServiceContext = { db, userId: "lymi-lib", actor: "user" };
    const learnerCtx = await learner(db, "oksana", "Oksana");
    const deck = await createDeck(lymi, { name: "Estonian", defaultLanguage: "et" });
    const [added] = await addCards(lymi, [{ deckId: deck.id, term: "tere", meaning: "hi" }]);
    if (added?.status !== "added") throw new Error("card not added");
    await publishDeck(
      lymi,
      deck.id,
      {
        slug: "deletion-guard",
        summary: "Words for your first weeks in Estonia.",
        meaningLanguage: "en",
        publisher: "Lymi",
        sources: [{ title: "EKI A1 word list" }],
      },
      new Set(["lib@lymi.test"]),
    );
    for (const [table, column, id, text] of [
      [schema.deckLocalizations, "deckId", deck.id, { name: "Естонська" }],
      [schema.cardLocalizations, "cardId", added.card.id, { meaning: "привіт" }],
    ] as const) {
      await db.insert(table).values({
        id: newId(),
        [column]: id,
        ...text,
        language: "uk",
        provenance: "human",
        status: "approved",
        sourceRevision: 0,
        approvedBy: "lymi-lib",
      } as never);
    }
    await join(learnerCtx, deck.id, { meaningLanguage: "uk" });

    const summary = await deletionSummary(lymi);
    expect(summary.blocked).toBeNull();
    expect(summary.sharedDecks).toEqual([
      { id: deck.id, name: "Estonian", members: 1, published: true },
    ]);
    await sendDeletionCode(lymi, env, undefined);
    const code = latestLocalEmail("lib@lymi.test")?.text.match(/\b\d{6}\b/)?.[0] ?? "";
    const leftovers = await deleteAccount(lymi, { code }, deps);
    expect(leftovers.publishedDecks).toBe(1);
    expect(await count("deck_publications", "deck_id", deck.id)).toBe(0);

    await copyFormerDecks(db, undefined);
    const copy = await raw
      .prepare(
        "select decks.name as deck, cards.meaning as meaning from decks join cards on cards.deck_id = decks.id where decks.user_id = ?",
      )
      .bind(learnerCtx.userId)
      .first<{ deck: string; meaning: string }>();
    expect(copy).toEqual({ deck: "Естонська", meaning: "привіт" });
  });

  it("deletes an account that approved a localization of someone else's deck", async () => {
    const owner = await learner(db, "urmas", "Urmas");
    const editor = await learner(db, "liis", "Liis");
    const deck = await createDeck(owner, { name: "Sõnad", defaultLanguage: "et" });
    const id = newId();
    await db.insert(schema.deckLocalizations).values({
      id,
      deckId: deck.id,
      language: "uk",
      provenance: "human",
      status: "approved",
      sourceRevision: 0,
      approvedBy: editor.userId,
    });

    await deleteAccount(editor, { code: await codeFor(editor, "liis@lymi.test") }, deps);
    const kept = await raw
      .prepare("select status, approved_by from deck_localizations where id = ?")
      .bind(id)
      .first();
    expect(kept).toEqual({ status: "approved", approved_by: null });
  });

  it("keeps a picture a copy shares when the deck it came from goes", async () => {
    const owner = await learner(db, "helle", "Helle");
    const member = await learner(db, "arvo", "Arvo");
    const { deck, card } = await deckWithCard(owner, "kuu", member);
    await db.insert(schema.cardImages).values({
      id: newId(),
      cardId: card.id,
      userId: owner.userId,
      objectKey: `cards/${card.id}/shared`,
      contentType: "image/webp",
      width: 1,
      height: 1,
      byteSize: 1,
      sourceKind: "upload",
      createdBy: "user",
    });
    await deleteAccount(owner, { code: await codeFor(owner, "helle@lymi.test") }, deps);
    await copyFormerDecks(db, undefined);

    const deleted: string[] = [];
    const images = {
      delete: async (keys: string | string[]) => {
        deleted.push(...(Array.isArray(keys) ? keys : [keys]));
      },
    } as unknown as R2Bucket;
    await dropUnstudiedFormerDecks(db, images);
    expect(await count("decks", "id", deck.id)).toBe(0);
    expect(deleted).not.toContain(`cards/${card.id}/shared`);
    expect(await count("card_images", "user_id", member.userId)).toBe(1);
  });

  it("drops a deck kept before copies, and its pictures, once its last member leaves", async () => {
    const owner = await learner(db, "maret", "Maret");
    const member = await learner(db, "jaan", "Jaan");
    const { deck, card } = await deckWithCard(owner, "puu", member);
    await db.insert(schema.cardImages).values({
      id: newId(),
      cardId: card.id,
      userId: owner.userId,
      objectKey: `cards/${card.id}/picture`,
      contentType: "image/webp",
      width: 1,
      height: 1,
      byteSize: 1,
      sourceKind: "upload",
      createdBy: "user",
    });
    await deleteAccount(owner, { code: await codeFor(owner, "maret@lymi.test") }, deps);
    // A deck kept under the former owner before copies existed has no queue entry.
    await raw.prepare("delete from former_deck_copies where deck_id = ?").bind(deck.id).run();

    const deleted: string[] = [];
    const images = {
      delete: async (keys: string | string[]) => {
        deleted.push(...(Array.isArray(keys) ? keys : [keys]));
      },
    } as unknown as R2Bucket;
    expect(await dropUnstudiedFormerDecks(db, images)).toBe(0);
    expect(await count("decks", "id", deck.id)).toBe(1);
    expect(await count("card_audio_purges", "card_id", card.id)).toBe(0);

    await leave(member, deck.id);
    expect(await dropUnstudiedFormerDecks(db, images)).toBe(1);
    expect(await count("decks", "id", deck.id)).toBe(0);
    expect(await count("cards", "id", card.id)).toBe(0);
    expect(deleted).toEqual([`cards/${card.id}/picture`]);
    expect(await count("card_audio_purges", "card_id", card.id)).toBe(1);
  });

  describe("with Sign in with Apple", () => {
    const token = (sub: string) => `e30.${btoa(JSON.stringify({ sub })).replaceAll("=", "")}.sig`;
    const apple = (verified: boolean): DeletionDeps => ({
      ...deps,
      verifyApple: async () => verified,
    });

    async function appleLearner(handle: string, sub: string) {
      const ctx = await learner(db, handle, handle);
      await db.insert(schema.account).values({
        id: newId(),
        accountId: sub,
        providerId: "apple",
        userId: ctx.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return ctx;
    }

    it("asks the phone for Apple's sheet", async () => {
      const ctx = await appleLearner("kaja", "apple-kaja");
      expect((await deletionSummary(ctx)).confirmWith).toBe("apple");
    });

    it("refuses another Apple ID, an unverified token, or no Apple configuration", async () => {
      const ctx = await appleLearner("rein", "apple-rein");
      const input = { apple: { idToken: token("apple-someone-else"), nonce: "n" } };
      await expect(deleteAccount(ctx, input, apple(true))).rejects.toMatchObject({
        reason: "apple_mismatch",
      });
      const own = { apple: { idToken: token("apple-rein"), nonce: "n" } };
      await expect(deleteAccount(ctx, own, apple(false))).rejects.toMatchObject({
        reason: "apple_mismatch",
      });
      await expect(deleteAccount(ctx, own, deps)).rejects.toMatchObject({
        reason: "apple_mismatch",
      });
      expect(await count("user", "id", ctx.userId)).toBe(1);
    });

    it("deletes with a fresh sign-in from the account's own Apple ID", async () => {
      const ctx = await appleLearner("helen", "apple-helen");
      const leftovers = await deleteAccount(
        ctx,
        { apple: { idToken: token("apple-helen"), nonce: "n" } },
        apple(true),
      );
      expect(leftovers.confirmedWith).toBe("apple");
      expect(await count("user", "id", ctx.userId)).toBe(0);
    });
  });
});
