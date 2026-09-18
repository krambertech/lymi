import type { PublicationInput } from "@lymi/core";
import { and, eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { archiveDeck, createDeck, listDecks } from "./decks";
import { previewJoin, turnOnJoinLink } from "./invitations";
import { leave, removeMember } from "./members";
import {
  addPublishedDeck,
  getPublication,
  isPublicationSlug,
  previewPublication,
  publicationAdmits,
  publishDeck,
  publisherAvatar,
  withdrawDeck,
} from "./publications";
import { learner, testDb } from "./test-db";

/** A published deck is one live deck anyone can add from its public page. ADR 0015, ADR 0020. */
let db: Db;
let dispose: () => Promise<void>;
let lymi: ServiceContext;
let kateryna: ServiceContext;
let anna: ServiceContext;
let marko: ServiceContext;
const publishers = new Set(["lymi@lymi.test"]);

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  lymi = await learner(db, "lymi", "Lymi");
  kateryna = await learner(db, "kateryna", "Kateryna");
  anna = await learner(db, "anna", "Anna");
  marko = await learner(db, "marko", "Marko");
}, 60_000);

afterAll(async () => {
  await dispose();
});

const input = (slug: string): PublicationInput => ({
  slug,
  summary: "Words and phrases for your first weeks in Estonia.",
  level: "A1",
  meaningLanguage: "en",
  publisher: "Lymi",
  sources: [{ title: "EKI A1 word list" }],
});

async function publishedDeck(slug: string, terms: string[] = ["tere", "aitäh"]) {
  const deck = await createDeck(lymi, { name: `Deck ${slug}`, defaultLanguage: "et" });
  // Terms repeat across decks, and one learner's duplicates are skipped, so each deck gets its own.
  await addCards(
    lymi,
    terms.map((term) => ({ deckId: deck.id, term: `${term} ${slug}`, meaning: `${term} meaning` })),
  );
  await publishDeck(lymi, deck.id, input(slug), publishers);
  return deck;
}

const auditRows = (deckId: string, action: string) =>
  db
    .select({ payload: schema.auditLog.payload })
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.entityId, deckId), eq(schema.auditLog.action, action)));

const forbidden = expect.objectContaining({ code: "forbidden" });
const notFound = expect.objectContaining({ code: "not_found" });
const conflict = expect.objectContaining({ code: "conflict" });
const invalid = expect.objectContaining({ code: "invalid" });

describe("publishing", () => {
  it("only a listed publisher can publish, and only a deck they own", async () => {
    const own = await createDeck(kateryna, { name: "Mine" });
    await addCards(kateryna, [{ deckId: own.id, term: "tere" }]);
    await expect(publishDeck(kateryna, own.id, input("mine"), publishers)).rejects.toEqual(
      forbidden,
    );

    const deck = await publishedDeck("owned-by-lymi");
    await expect(
      publishDeck(kateryna, deck.id, input("owned-by-lymi"), new Set(["kateryna@lymi.test"])),
    ).rejects.toEqual(notFound);
  });

  it("refuses an empty deck, an archived deck and a slug another deck uses", async () => {
    const empty = await createDeck(lymi, { name: "Empty" });
    await expect(publishDeck(lymi, empty.id, input("empty"), publishers)).rejects.toEqual(invalid);

    await publishedDeck("taken");
    const other = await createDeck(lymi, { name: "Other" });
    await addCards(lymi, [{ deckId: other.id, term: "tere other" }]);
    await expect(publishDeck(lymi, other.id, input("taken"), publishers)).rejects.toEqual(conflict);

    await archiveDeck(lymi, other.id);
    await expect(publishDeck(lymi, other.id, input("other"), publishers)).rejects.toEqual(invalid);
  });

  it("publishing again updates the page, raises the revision and keeps the first date", async () => {
    const deck = await publishedDeck("revised");
    const first = await getPublication(lymi, deck.id);
    const again = await publishDeck(
      lymi,
      deck.id,
      { ...input("revised"), summary: "Updated." },
      publishers,
    );
    expect(again).toMatchObject({ summary: "Updated.", revision: 2, status: "published" });
    expect(again?.publishedAt).toEqual(first?.publishedAt);
    expect(await auditRows(deck.id, "publish")).toHaveLength(1);
    expect(await auditRows(deck.id, "update_publication")).toHaveLength(1);
  });

  it("only the owner reads the publication", async () => {
    const deck = await publishedDeck("owner-reads");
    expect(await getPublication(lymi, deck.id)).toMatchObject({ slug: "owner-reads" });
    await expect(getPublication(anna, deck.id)).rejects.toEqual(notFound);
  });

  it("checks the slug shape", () => {
    expect(isPublicationSlug("everyday-estonian")).toBe(true);
    expect(isPublicationSlug("Everyday Estonian")).toBe(false);
    expect(isPublicationSlug("-edge")).toBe(false);
    expect(isPublicationSlug(undefined)).toBe(false);
  });
});

describe("adding a published deck", () => {
  it("adds it once, with a state for every card and one audit row that says how", async () => {
    const deck = await publishedDeck("add-once", ["tere", "aitäh", "palun"]);
    expect(await addPublishedDeck(anna, "add-once")).toEqual({ deckId: deck.id, role: "learner" });
    expect(await addPublishedDeck(anna, "add-once")).toEqual({ deckId: deck.id, role: "learner" });

    const joins = await auditRows(deck.id, "join");
    expect(joins).toEqual([{ payload: { memberId: "anna", via: "publication" } }]);
    const states = await db
      .select({ id: schema.cardStates.id })
      .from(schema.cardStates)
      .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
      .where(and(eq(schema.cards.deckId, deck.id), eq(schema.cardStates.userId, "anna")));
    expect(states.length).toBeGreaterThanOrEqual(3);
    expect((await listDecks(anna)).map((d) => d.id)).toContain(deck.id);
  });

  it("a withdrawn deck admits nobody new, and its members keep it", async () => {
    const deck = await publishedDeck("withdrawn");
    await addPublishedDeck(anna, "withdrawn");
    await withdrawDeck(lymi, deck.id);

    expect(await publicationAdmits(db, "withdrawn")).toBe(false);
    await expect(addPublishedDeck(marko, "withdrawn")).rejects.toEqual(notFound);
    expect((await listDecks(anna)).map((d) => d.id)).toContain(deck.id);
    expect(await auditRows(deck.id, "withdraw_publication")).toHaveLength(1);

    await publishDeck(lymi, deck.id, input("withdrawn"), publishers);
    expect(await publicationAdmits(db, "withdrawn")).toBe(true);
  });

  it("an archived deck admits nobody, and an unknown slug is not found", async () => {
    const deck = await publishedDeck("archived");
    await archiveDeck(lymi, deck.id);
    expect(await publicationAdmits(db, "archived")).toBe(false);
    await expect(addPublishedDeck(anna, "archived")).rejects.toEqual(notFound);
    await expect(addPublishedDeck(anna, "no-such-deck")).rejects.toEqual(notFound);
    expect(await publicationAdmits(db, "Not A Slug")).toBe(false);
  });

  it("a learner the owner removed cannot add it back; one who left can", async () => {
    const deck = await publishedDeck("removed");
    await addPublishedDeck(anna, "removed");
    await addPublishedDeck(marko, "removed");
    await removeMember(lymi, deck.id, "anna");
    await leave(marko, deck.id);

    await expect(addPublishedDeck(anna, "removed")).rejects.toEqual(forbidden);
    expect(await addPublishedDeck(marko, "removed")).toMatchObject({ role: "learner" });
  });

  it("publishing does not touch the deck's join link", async () => {
    const deck = await publishedDeck("with-link");
    const link = await turnOnJoinLink(lymi, deck.id);
    await withdrawDeck(lymi, deck.id);
    expect(await turnOnJoinLink(lymi, deck.id)).toEqual(link);
  });
});

describe("the add page preview", () => {
  it("shows the publisher and a few cards to anyone while the deck is published", async () => {
    const deck = await publishedDeck("preview", ["tere", "aitäh"]);
    const signedOut = await previewPublication(db, "preview", null);
    expect(signedOut).toMatchObject({
      status: "live",
      viewer: "signed-out",
      deckId: null,
      deck: { name: deck.name, total: 2, owner: { name: "Lymi" }, language: "et" },
    });
    expect(signedOut.deck?.samples).toHaveLength(2);

    expect(await previewPublication(db, "preview", "kateryna")).toMatchObject({
      viewer: "visitor",
      deckId: null,
    });
    await addPublishedDeck(kateryna, "preview");
    expect(await previewPublication(db, "preview", "kateryna")).toMatchObject({
      viewer: "member",
      deckId: deck.id,
    });
    expect(await previewPublication(db, "preview", "lymi")).toMatchObject({ viewer: "owner" });
  });

  it("says nothing about a withdrawn, archived or unknown deck", async () => {
    const deck = await publishedDeck("gone");
    await withdrawDeck(lymi, deck.id);
    expect(await previewPublication(db, "gone", null)).toMatchObject({ status: "off", deck: null });
    expect(await previewPublication(db, "never-was", null)).toMatchObject({
      status: "invalid",
      deck: null,
    });
  });
});

describe("the publisher's photo", () => {
  /** The learner's own avatar row, which publishing is what makes readable in public. */
  async function givePhoto(userId: string, version = "v1") {
    await db
      .insert(schema.userAvatars)
      .values({ userId, customKey: `avatars/${userId}`, customVersion: version, customRevision: 1 })
      .onConflictDoUpdate({
        target: schema.userAvatars.userId,
        set: { customKey: `avatars/${userId}`, customVersion: version },
      });
  }

  it("is offered by the deck's slug, never by the account that owns it", async () => {
    await givePhoto("lymi");
    await publishedDeck("with-photo");
    expect(await publisherAvatar(db, "with-photo")).toEqual({ key: "avatars/lymi", version: "v1" });
    const preview = await previewPublication(db, "with-photo", null);
    expect(preview.deck?.owner.avatarUrl).toBe(
      "/api/public/decks/with-photo/publisher-avatar?v=v1",
    );
    // ADR 0016 keeps account identifiers off a public page, so the address carries the slug.
    expect(JSON.stringify(preview)).not.toContain('"lymi"');
    expect(preview.deck?.owner.avatarUrl).not.toContain("lymi");
  });

  it("stops the moment the deck stops being published", async () => {
    await givePhoto("lymi");
    const withdrawn = await publishedDeck("photo-withdrawn");
    await withdrawDeck(lymi, withdrawn.id);
    expect(await publisherAvatar(db, "photo-withdrawn")).toBeNull();

    const archived = await publishedDeck("photo-archived");
    await archiveDeck(lymi, archived.id);
    expect(await publisherAvatar(db, "photo-archived")).toBeNull();

    expect(await publisherAvatar(db, "never-published")).toBeNull();
  });

  it("is absent for a publisher who has no photo", async () => {
    const deck = await createDeck(kateryna, { name: "No photo", defaultLanguage: "et" });
    await addCards(kateryna, [{ deckId: deck.id, term: "tere none", meaning: "hello" }]);
    await publishDeck(kateryna, deck.id, input("no-photo"), new Set(["kateryna@lymi.test"]));
    expect(await publisherAvatar(db, "no-photo")).toBeNull();
    const preview = await previewPublication(db, "no-photo", null);
    expect(preview.deck?.owner.avatarUrl).toBeNull();
  });

  it("never rides on a join link, whose owner did not publish anything", async () => {
    await givePhoto("kateryna");
    const deck = await createDeck(kateryna, { name: "Shared", defaultLanguage: "et" });
    await addCards(kateryna, [{ deckId: deck.id, term: "tere shared", meaning: "hello" }]);
    const link = await turnOnJoinLink(kateryna, deck.id);
    const preview = await previewJoin(db, link.token, null);
    expect(preview.deck?.owner).toEqual({ name: "Kateryna", avatarUrl: null });
  });
});
