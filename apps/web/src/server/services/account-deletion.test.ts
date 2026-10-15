import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import type { Bindings } from "../env";
import {
  type DeletionDeps,
  deleteAccount,
  deletionSummary,
  FORMER_OWNER_ID,
  sendDeletionCode,
} from "./account-deletion";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import { clearLocalEmailOutbox, latestLocalEmail } from "./email";
import { inviteByEmail } from "./invitations";
import { join } from "./members";
import { publishDeck } from "./publications";
import { gradeCard } from "./review";
import { learner, testDb } from "./test-db";

let db: Db;
let raw: D1Database;
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
};

beforeAll(async () => {
  ({ db, raw, dispose } = await testDb());
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
      sharedDecks: [{ id: shared.id, name: shared.name, members: 1 }],
    });
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
    const open = await raw
      .prepare(
        "select count(*) as n from deck_invitations where email = 'nora@lymi.test' and revoked_at is null",
      )
      .first<{ n: number }>();
    expect(open?.n).toBe(0);
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

  it("keeps a deck other people study for them, with nobody able to change it", async () => {
    const kadri = await learner(db, "kadri", "Kadri");
    const peeter = await learner(db, "peeter", "Peeter");
    const { deck, card } = await deckWithCard(kadri, "maja", peeter);

    const code = await codeFor(kadri, "kadri@lymi.test");
    const leftovers = await deleteAccount(kadri, { code }, deps);

    expect(leftovers.keptDecks).toBe(1);
    expect(await count("user", "id", kadri.userId)).toBe(0);
    const kept = await raw
      .prepare("select user_id, series_id from decks where id = ?")
      .bind(deck.id)
      .first<{ user_id: string; series_id: string | null }>();
    expect(kept).toEqual({ user_id: FORMER_OWNER_ID, series_id: null });
    expect(await count("cards", "id", card.id)).toBe(1);
    expect(await count("card_states", "user_id", peeter.userId)).toBe(1);
    expect(await count("reviews", "user_id", peeter.userId)).toBe(1);
    // The owner's own schedule and reviews go with them.
    expect(await count("card_states", "user_id", kadri.userId)).toBe(0);
  });

  it("refuses an account that owns a published deck", async () => {
    await db.insert(schema.user).values({ id: "lymi-lib", name: "Lymi", email: "lib@lymi.test" });
    const lymi: ServiceContext = { db, userId: "lymi-lib", actor: "user" };
    const deck = await createDeck(lymi, { name: "Estonian", defaultLanguage: "et" });
    await addCards(lymi, [{ deckId: deck.id, term: "tere", meaning: "hi" }]);
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

    expect((await deletionSummary(lymi)).blocked).toBe("publisher");
    await expect(sendDeletionCode(lymi, env, undefined)).rejects.toMatchObject({
      reason: "publisher",
    });
  });
});
