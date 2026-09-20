import { newId, type PublicationInput } from "@lymi/core";
import { loadPublicDeck } from "@lymi/core/catalog";
import { eq } from "@lymi/core/db";
import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { handleError } from "../http";
import type { AppEnv } from "../index";
import { publicMedia } from "../routes/public-media";
import { addCards, archiveCard, restoreCard } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import { approveEdition, importEdition, publishEdition } from "./editions";
import { publicMediaFile } from "./public-media";
import { publishDeck, withdrawDeck } from "./publications";
import { learner, type TestBindings, testDb } from "./test-db";

let db: Db;
let env: TestBindings;
let dispose: () => Promise<void>;
let publisher: ServiceContext;
const publishers = new Set(["publisher@lymi.test"]);

beforeAll(async () => {
  ({ db, env, dispose } = await testDb());
  publisher = await learner(db, "publisher", "Publisher");
}, 60_000);

afterAll(async () => dispose());

function publication(slug: string): PublicationInput {
  return {
    slug,
    summary: "A small public deck.",
    meaningLanguage: "en",
    publisher: "Lymi",
    sources: [],
  };
}

async function publishedCard(slug: string) {
  const deck = await createDeck(publisher, { name: `Deck ${slug}`, defaultLanguage: "et" });
  const [added] = await addCards(publisher, [
    { deckId: deck.id, term: `tere ${slug}`, meaning: "hello" },
  ]);
  if (added?.status !== "added") throw new Error("Card fixture was not added");
  await publishDeck(publisher, deck.id, publication(slug), publishers);
  return { deckId: deck.id, cardId: added.card.id, slug };
}

async function picture(cardId: string, suffix: string, description: string | null = null) {
  const id = newId();
  const objectKey = `test/public-media/${id}`;
  await env.PRIVATE_IMAGES.put(objectKey, new Uint8Array([1, 2, 3, suffix.length]));
  await db.insert(schema.cardImages).values({
    id,
    cardId,
    userId: publisher.userId,
    objectKey,
    contentType: "image/webp",
    width: 640,
    height: 480,
    byteSize: 4,
    description: description ?? `A picture of ${suffix}`,
    sourceKind: "upload",
    createdBy: "user",
  });
  return { id, objectKey };
}

async function storedAudio(cardId: string, bytes: Uint8Array, suffix = "") {
  const audioKey = `test/public-audio/${cardId}${suffix}`;
  await env.AUDIO.put(audioKey, bytes);
  await db.update(schema.cards).set({ audioKey }).where(eq(schema.cards.id, cardId));
  return audioKey;
}

const storage = () => ({ images: env.PRIVATE_IMAGES, audio: env.AUDIO });
const missing = expect.objectContaining({ code: "not_found" });

describe("public deck media", () => {
  it("publishes a card's picture with the deck and keeps private keys out of the page", async () => {
    const { cardId, slug } = await publishedCard("picture-public");
    const first = await loadPublicDeck(db, slug);
    if (first.status !== "published") throw new Error("Expected published deck");
    expect(first.deck.sections[0]?.cards[0]?.image).toBeUndefined();

    const image = await picture(cardId, "tree");
    const projected = await loadPublicDeck(db, slug);
    if (projected.status !== "published") throw new Error("Expected published deck");
    expect(projected.deck.sections[0]?.cards[0]?.image).toEqual({
      cardId,
      description: "A picture of tree",
      width: 640,
      height: 480,
    });
    expect(JSON.stringify(projected)).not.toContain(image.objectKey);

    const object = await publicMediaFile(db, cardId, "image", storage());
    expect(new Uint8Array(await new Response(object.body).arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );
    // The object key is not an address; only the card id reaches the public route.
    await expect(publicMediaFile(db, image.objectKey, "image", storage())).rejects.toEqual(missing);
  });

  it("serves the replacement picture at the same address", async () => {
    const { cardId, slug } = await publishedCard("picture-replaced");
    const first = await picture(cardId, "tree");
    await db
      .update(schema.cardImages)
      .set({ status: "replaced" })
      .where(eq(schema.cardImages.id, first.id));
    await picture(cardId, "flower");

    const projected = await loadPublicDeck(db, slug);
    if (projected.status !== "published") throw new Error("Expected published deck");
    expect(projected.deck.sections[0]?.cards[0]?.image).toMatchObject({
      cardId,
      description: "A picture of flower",
    });
    const object = await publicMediaFile(db, cardId, "image", storage());
    expect(new Uint8Array(await new Response(object.body).arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3, 6]),
    );
  });

  it("keeps a picture with no description private, because the page cannot describe it", async () => {
    const { cardId, slug } = await publishedCard("picture-undescribed");
    await picture(cardId, "unnamed", "");
    const projected = await loadPublicDeck(db, slug);
    if (projected.status !== "published") throw new Error("Expected published deck");
    expect(projected.deck.sections[0]?.cards[0]?.image).toBeUndefined();
    await expect(publicMediaFile(db, cardId, "image", storage())).rejects.toEqual(missing);
  });

  it("refuses media on a deck that was never published", async () => {
    const deck = await createDeck(publisher, { name: "Private media" });
    const [added] = await addCards(publisher, [{ deckId: deck.id, term: "private term" }]);
    if (added?.status !== "added") throw new Error("Private card fixture was not added");
    await picture(added.card.id, "secret");
    await storedAudio(added.card.id, new Uint8Array([9, 9, 9]));
    await expect(publicMediaFile(db, added.card.id, "image", storage())).rejects.toEqual(missing);
    await expect(publicMediaFile(db, added.card.id, "audio", storage())).rejects.toEqual(missing);
  });

  it("serves stored audio, follows regeneration, and stops after withdrawal", async () => {
    const { deckId, cardId, slug } = await publishedCard("audio-public");
    const audioKey = await storedAudio(cardId, new Uint8Array([4, 5, 6]));
    const projected = await loadPublicDeck(db, slug);
    if (projected.status !== "published") throw new Error("Expected published deck");
    expect(projected.deck.sections[0]?.cards[0]?.audio).toEqual({ cardId });
    expect(JSON.stringify(projected)).not.toContain(audioKey);
    expect((await publicMediaFile(db, cardId, "audio", storage())).size).toBe(3);

    await storedAudio(cardId, new Uint8Array([7, 8, 9, 10]), "-new");
    expect((await publicMediaFile(db, cardId, "audio", storage())).size).toBe(4);

    await withdrawDeck(publisher, deckId);
    await expect(publicMediaFile(db, cardId, "audio", storage())).rejects.toEqual(missing);
  });

  it("serves the whole audio object and stops at the same URL after withdrawal", async () => {
    const { deckId, cardId } = await publishedCard("audio-response");
    await storedAudio(cardId, new Uint8Array([10, 20, 30, 40]));
    const app = new Hono<AppEnv>();
    app.use("*", (c, next) => {
      c.set("db", db);
      return next();
    });
    app.route("/public/media", publicMedia);
    app.onError(handleError);
    const bindings = env as unknown as AppEnv["Bindings"];
    const path = `/public/media/card/${cardId}/audio`;
    const response = await app.request(path, { headers: { Range: "bytes=1-2" } }, bindings);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Range")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([10, 20, 30, 40]));

    expect((await app.request(`/public/media/card/${cardId}/video`, {}, bindings)).status).toBe(
      404,
    );
    await withdrawDeck(publisher, deckId);
    expect((await app.request(path, {}, bindings)).status).toBe(404);
  });

  it("stops delivery while the picture or card is archived", async () => {
    const { cardId, slug } = await publishedCard("archived-media");
    const image = await picture(cardId, "bridge");
    await db
      .update(schema.cardImages)
      .set({ status: "archived" })
      .where(eq(schema.cardImages.id, image.id));
    await expect(publicMediaFile(db, cardId, "image", storage())).rejects.toEqual(missing);
    const hidden = await loadPublicDeck(db, slug);
    if (hidden.status !== "published") throw new Error("Expected published deck");
    expect(hidden.deck.sections[0]?.cards[0]?.image).toBeUndefined();

    await db
      .update(schema.cardImages)
      .set({ status: "active" })
      .where(eq(schema.cardImages.id, image.id));
    await archiveCard(publisher, cardId);
    await expect(publicMediaFile(db, cardId, "image", storage())).rejects.toEqual(missing);
    expect((await loadPublicDeck(db, slug)).status).toBe("unavailable");
    await restoreCard(publisher, cardId);
    expect((await publicMediaFile(db, cardId, "image", storage())).size).toBe(4);
  });

  it("uses the same media in every published edition", async () => {
    const { deckId, cardId, slug } = await publishedCard("edition-media");
    await picture(cardId, "tower");
    await storedAudio(cardId, new Uint8Array([1, 2, 3]));
    await importEdition(
      publisher,
      deckId,
      "uk",
      {
        deck: { provenance: "human", name: "Естонська", summary: "Перші слова." },
        sections: [],
        cards: [{ cardId, provenance: "human", meaning: "привіт" }],
      },
      publishers,
    );
    await approveEdition(publisher, deckId, "uk", {}, publishers);
    await publishEdition(publisher, deckId, "uk", publishers);

    const original = await loadPublicDeck(db, slug);
    const localized = await loadPublicDeck(db, slug, "uk");
    if (original.status !== "published" || localized.status !== "published") {
      throw new Error("Expected both published editions");
    }
    expect(original.deck.sections[0]?.cards[0]).toMatchObject({
      meaning: "hello",
      image: { cardId },
      audio: { cardId },
    });
    expect(localized.deck.sections[0]?.cards[0]).toMatchObject({
      meaning: "привіт",
      image: { cardId },
      audio: { cardId },
    });
  });
});
