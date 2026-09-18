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
import {
  approvePublicationMedia,
  listPublicationMedia,
  publicMediaFile,
  revokePublicationMedia,
} from "./public-media";
import { publishDeck, withdrawDeck } from "./publications";
import { learner, type TestBindings, testDb } from "./test-db";

let db: Db;
let env: TestBindings;
let dispose: () => Promise<void>;
let publisher: ServiceContext;
let stranger: ServiceContext;
const publishers = new Set(["publisher@lymi.test"]);

beforeAll(async () => {
  ({ db, env, dispose } = await testDb());
  publisher = await learner(db, "publisher", "Publisher");
  stranger = await learner(db, "stranger", "Stranger");
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

async function picture(cardId: string, suffix: string) {
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
    description: `A picture of ${suffix}`,
    sourceKind: "upload",
    createdBy: "user",
  });
  return { id, objectKey };
}

const storage = () => ({ images: env.PRIVATE_IMAGES, audio: env.AUDIO });
const missing = expect.objectContaining({ code: "not_found" });

describe("public deck media", () => {
  it("exposes only the exact approved image and keeps private keys out of the page", async () => {
    const { deckId, cardId, slug } = await publishedCard("picture-approval");
    const first = await loadPublicDeck(db, slug);
    expect(first.status).toBe("published");
    if (first.status !== "published") return;
    expect(first.deck.sections[0]?.cards[0]?.image).toBeUndefined();

    const image = await picture(cardId, "tree");
    await expect(publicMediaFile(db, image.id, storage())).rejects.toEqual(missing);
    await expect(publicMediaFile(db, image.objectKey, storage())).rejects.toEqual(missing);
    const approved = await approvePublicationMedia(
      publisher,
      deckId,
      cardId,
      "image",
      publishers,
      storage(),
    );
    const projected = await loadPublicDeck(db, slug);
    expect(projected.status).toBe("published");
    if (projected.status !== "published") return;
    expect(projected.deck.sections[0]?.cards[0]?.image).toEqual({
      id: approved.id,
      description: "A picture of tree",
      width: 640,
      height: 480,
    });
    expect(JSON.stringify(projected)).not.toContain(image.objectKey);
    const file = await publicMediaFile(db, approved.id, storage());
    expect(file.kind).toBe("image");
    expect(new Uint8Array(await new Response(file.object.body).arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );

    await db
      .update(schema.cardImages)
      .set({ status: "replaced" })
      .where(eq(schema.cardImages.id, image.id));
    await picture(cardId, "flower");
    expect((await loadPublicDeck(db, slug)).status).toBe("published");
    expect(await listPublicationMedia(publisher, deckId, publishers)).toEqual([]);
    await expect(publicMediaFile(db, approved.id, storage())).rejects.toEqual(missing);
    const refreshed = await loadPublicDeck(db, slug);
    if (refreshed.status === "published") {
      expect(refreshed.deck.sections[0]?.cards[0]?.image).toBeUndefined();
    }
  });

  it("requires a human publisher, ownership, and an existing asset", async () => {
    const { deckId, cardId } = await publishedCard("approval-rules");
    const privateDeck = await createDeck(publisher, { name: "Private media" });
    const [privateCard] = await addCards(publisher, [
      { deckId: privateDeck.id, term: "private term" },
    ]);
    if (privateCard?.status !== "added") throw new Error("Private card fixture was not added");
    await expect(
      approvePublicationMedia(
        publisher,
        privateDeck.id,
        privateCard.card.id,
        "image",
        publishers,
        storage(),
      ),
    ).rejects.toEqual(missing);
    await expect(
      approvePublicationMedia(publisher, deckId, cardId, "image", publishers, storage()),
    ).rejects.toMatchObject({ code: "invalid" });
    await picture(cardId, "stone");
    await expect(
      approvePublicationMedia(stranger, deckId, cardId, "image", publishers, storage()),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      approvePublicationMedia(
        { ...publisher, actor: "api" },
        deckId,
        cardId,
        "image",
        publishers,
        storage(),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("serves stored audio on request, then stops after regeneration, revocation, or withdrawal", async () => {
    const { deckId, cardId, slug } = await publishedCard("audio-approval");
    const audioKey = `test/public-audio/${cardId}`;
    await env.AUDIO.put(audioKey, new Uint8Array([4, 5, 6]));
    await db.update(schema.cards).set({ audioKey }).where(eq(schema.cards.id, cardId));
    const approved = await approvePublicationMedia(
      publisher,
      deckId,
      cardId,
      "audio",
      publishers,
      storage(),
    );
    const projected = await loadPublicDeck(db, slug);
    if (projected.status !== "published") throw new Error("Expected published deck");
    expect(projected.deck.sections[0]?.cards[0]?.audio).toEqual({ id: approved.id });
    expect(JSON.stringify(projected)).not.toContain(audioKey);
    expect((await publicMediaFile(db, approved.id, storage())).kind).toBe("audio");

    await db
      .update(schema.cards)
      .set({ audioKey: `${audioKey}-new` })
      .where(eq(schema.cards.id, cardId));
    await expect(publicMediaFile(db, approved.id, storage())).rejects.toEqual(missing);
    expect(await listPublicationMedia(publisher, deckId, publishers)).toEqual([]);
    await env.AUDIO.put(`${audioKey}-new`, new Uint8Array([7, 8, 9]));
    const renewed = await approvePublicationMedia(
      publisher,
      deckId,
      cardId,
      "audio",
      publishers,
      storage(),
    );
    expect(renewed.id).not.toBe(approved.id);
    expect(await listPublicationMedia(publisher, deckId, publishers)).toEqual([renewed]);
    await revokePublicationMedia(publisher, deckId, cardId, "audio", publishers);
    await expect(publicMediaFile(db, renewed.id, storage())).rejects.toEqual(missing);

    const again = await approvePublicationMedia(
      publisher,
      deckId,
      cardId,
      "audio",
      publishers,
      storage(),
    );
    await withdrawDeck(publisher, deckId);
    await expect(publicMediaFile(db, again.id, storage())).rejects.toEqual(missing);
  });

  it("serves the whole audio object and disables the same URL after revocation", async () => {
    const { deckId, cardId } = await publishedCard("audio-response");
    const audioKey = `test/public-audio/${cardId}`;
    await env.AUDIO.put(audioKey, new Uint8Array([10, 20, 30, 40]));
    await db.update(schema.cards).set({ audioKey }).where(eq(schema.cards.id, cardId));
    const approved = await approvePublicationMedia(
      publisher,
      deckId,
      cardId,
      "audio",
      publishers,
      storage(),
    );
    const app = new Hono<AppEnv>();
    app.use("*", (c, next) => {
      c.set("db", db);
      return next();
    });
    app.route("/public/media", publicMedia);
    app.onError(handleError);
    const bindings = env as unknown as AppEnv["Bindings"];
    const path = `/public/media/${approved.id}`;
    const response = await app.request(path, { headers: { Range: "bytes=1-2" } }, bindings);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Range")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([10, 20, 30, 40]));

    await revokePublicationMedia(publisher, deckId, cardId, "audio", publishers);
    const gone = await app.request(path, {}, bindings);
    expect(gone.status).toBe(404);
  });

  it("stops delivery while the picture or card is archived", async () => {
    const { deckId, cardId, slug } = await publishedCard("archived-media");
    const image = await picture(cardId, "bridge");
    const approved = await approvePublicationMedia(
      publisher,
      deckId,
      cardId,
      "image",
      publishers,
      storage(),
    );
    await db
      .update(schema.cardImages)
      .set({ status: "archived" })
      .where(eq(schema.cardImages.id, image.id));
    await expect(publicMediaFile(db, approved.id, storage())).rejects.toEqual(missing);
    const hidden = await loadPublicDeck(db, slug);
    if (hidden.status !== "published") throw new Error("Expected published deck");
    expect(hidden.deck.sections[0]?.cards[0]?.image).toBeUndefined();

    await db
      .update(schema.cardImages)
      .set({ status: "active" })
      .where(eq(schema.cardImages.id, image.id));
    await archiveCard(publisher, cardId);
    await expect(publicMediaFile(db, approved.id, storage())).rejects.toEqual(missing);
    expect((await loadPublicDeck(db, slug)).status).toBe("unavailable");
    await restoreCard(publisher, cardId);
    expect((await publicMediaFile(db, approved.id, storage())).kind).toBe("image");
    expect((await listPublicationMedia(publisher, deckId, publishers))[0]?.id).toBe(approved.id);
  });

  it("rejects an approval row whose kind and asset do not match", async () => {
    const { deckId, cardId } = await publishedCard("asset-constraint");
    const [publication] = await db
      .select({ id: schema.deckPublications.id })
      .from(schema.deckPublications)
      .where(eq(schema.deckPublications.deckId, deckId));
    if (!publication) throw new Error("Expected publication");
    await expect(
      db.insert(schema.publicationMedia).values({
        id: newId(),
        publicationId: publication.id,
        cardId,
        kind: "image",
        audioKey: "unapproved-audio",
        approvedBy: publisher.userId,
        approvedAt: new Date(),
      }),
    ).rejects.toThrow();
  });

  it("uses the same approved media in every published edition", async () => {
    const { deckId, cardId, slug } = await publishedCard("edition-media");
    await picture(cardId, "tower");
    const image = await approvePublicationMedia(
      publisher,
      deckId,
      cardId,
      "image",
      publishers,
      storage(),
    );
    const audioKey = `test/public-audio/${cardId}`;
    await env.AUDIO.put(audioKey, new Uint8Array([1, 2, 3]));
    await db.update(schema.cards).set({ audioKey }).where(eq(schema.cards.id, cardId));
    const audio = await approvePublicationMedia(
      publisher,
      deckId,
      cardId,
      "audio",
      publishers,
      storage(),
    );
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
      image: { id: image.id },
      audio: { id: audio.id },
    });
    expect(localized.deck.sections[0]?.cards[0]).toMatchObject({
      meaning: "привіт",
      image: { id: image.id },
      audio: { id: audio.id },
    });
  });
});
