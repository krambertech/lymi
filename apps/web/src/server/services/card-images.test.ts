import { crc32, deflateSync } from "node:zlib";
import type { ReviewMode } from "@lymi/core";
import { and, eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import {
  archiveCardImage,
  cardImageFile,
  describeCardImage,
  importCardImage,
  restoreCardImage,
  uploadCardImage,
} from "./card-images";
import { addCards, showCard, updateCard } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import { dueCount } from "./due";
import { join } from "./members";
import { gradeCard, reviewQueue } from "./review";
import { learner, type TestBindings, testDb } from "./test-db";

let db: Db;
let env: TestBindings;
let dispose: () => Promise<void>;
let owner: ServiceContext;
let member: ServiceContext;
let stranger: ServiceContext;

beforeAll(async () => {
  ({ db, env, dispose } = await testDb());
  owner = await learner(db, "owner", "Owner");
  member = await learner(db, "member", "Member");
  stranger = await learner(db, "stranger", "Stranger");
}, 60_000);
afterAll(async () => dispose());

/** A solid-colour RGBA PNG, built by hand so the test needs no image library. */
function png(width: number, height: number) {
  const row = [0, ...Array.from({ length: width }, () => [40, 90, 200, 255]).flat()];
  const raw = Buffer.from(Array.from({ length: height }, () => row).flat());
  const chunk = (kind: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(kind, "ascii"), data]);
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), 8 + data.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

const jpeg = png(2000, 1000);

function ascii(text: string) {
  return [...text].map((c) => c.charCodeAt(0));
}

/** An in-memory bucket that remembers what was put and deleted. */
function bucket() {
  const objects = new Map<string, Uint8Array>();
  const deleted: string[] = [];
  const fake = {
    objects,
    deleted,
    async put(key: string, value: Uint8Array) {
      objects.set(key, value);
    },
    async get(key: string) {
      const value = objects.get(key);
      return value
        ? { body: new Blob([value as Uint8Array<ArrayBuffer>]).stream(), size: value.length }
        : null;
    },
    async delete(key: string) {
      deleted.push(key);
      objects.delete(key);
    },
  };
  return fake as typeof fake & R2Bucket;
}

const processor = () => env.IMAGES;

const signModes: ReviewMode[] = [
  { cue: "term", target: "meaning" },
  { cue: "image", target: "meaning" },
];

async function signCard(term: string, modes = signModes) {
  const deck = await createDeck(owner, { name: `Signs ${term}` });
  const [added] = await addCards(owner, [
    { deckId: deck.id, term, meaning: `${term} meaning`, reviewModes: modes },
  ]);
  if (added?.status !== "added") throw new Error("card not added");
  return { deck, card: added.card };
}

const statesOf = (cardId: string, userId = "owner") =>
  db
    .select()
    .from(schema.cardStates)
    .where(and(eq(schema.cardStates.cardId, cardId), eq(schema.cardStates.userId, userId)));

describe("card pictures", () => {
  it("stores a normalized private copy and opens picture review only once it is described", async () => {
    const { deck, card } = await signCard("stop");
    const store = bucket();

    const bare = await uploadCardImage(
      owner,
      card.id,
      jpeg,
      { version: null },
      { bucket: store, images: processor() },
    );
    expect(bare.image).toMatchObject({
      width: 1600,
      height: 800,
      contentType: "image/webp",
      description: null,
    });
    expect(bare.image?.url).toBe(`/api/cards/${card.id}/image/${bare.image?.id}`);
    expect(JSON.stringify(bare)).not.toContain("users/");
    expect((await statesOf(card.id)).map((s) => s.mode)).toEqual(["term_to_meaning"]);

    const described = await describeCardImage(owner, card.id, {
      description: "A red octagon with white letters",
      version: bare.imageVersion,
    });
    expect((await statesOf(card.id)).map((s) => s.mode).sort()).toEqual([
      "image_to_meaning",
      "term_to_meaning",
    ]);

    // Two due modes of one card never share a session.
    const queue = await reviewQueue(owner, { deckId: deck.id });
    expect(queue.items.filter((item) => item.card.id === card.id)).toHaveLength(1);
    expect(queue.total).toBe(1);
    expect(described.image?.description).toBe("A red octagon with white letters");
  });

  it("refuses a description that gives the answer away, before any bytes are stored", async () => {
    const { card } = await signCard("yield");
    const store = bucket();
    await expect(
      uploadCardImage(
        owner,
        card.id,
        jpeg,
        { description: "The YIELD sign" },
        { bucket: store, images: processor() },
      ),
    ).rejects.toThrow("without naming");
    expect(store.objects.size).toBe(0);
  });

  it("keeps the current picture when a replacement fails, and refuses SVG and animation", async () => {
    const { card } = await signCard("merge");
    const store = bucket();
    const first = await uploadCardImage(
      owner,
      card.id,
      jpeg,
      { description: "Two lanes joining" },
      { bucket: store, images: processor() },
    );

    const broken = {
      input: () => {
        throw new Error("decoder said something about the picture");
      },
    } as unknown as ImagesBinding;
    const failure = await uploadCardImage(
      owner,
      card.id,
      jpeg,
      {},
      { bucket: store, images: broken },
    ).catch((e: Error) => e);
    expect(failure).toMatchObject({ code: "invalid" });
    expect(JSON.stringify(failure)).not.toContain("decoder said");
    const svg = Uint8Array.from(ascii("<svg/>"));
    await expect(
      uploadCardImage(owner, card.id, svg, {}, { bucket: store, images: processor() }),
    ).rejects.toThrow("JPEG, PNG");

    const now = await showCard(owner, card.id);
    expect(now.image?.id).toBe(first.image?.id);
    expect(now.imageVersion).toBe(first.imageVersion);
    expect(store.objects.size).toBe(1);
  });

  it("replaces a picture without touching schedules, and a stale write gets a conflict", async () => {
    const { card } = await signCard("roundabout", [
      { cue: "image", target: "meaning" },
      { cue: "term", target: "meaning" },
    ]);
    const store = bucket();
    const deps = { bucket: store, images: processor() };
    const first = await uploadCardImage(
      owner,
      card.id,
      jpeg,
      { description: "Three arrows in a circle" },
      deps,
    );
    await gradeCard(owner, {
      cardId: card.id,
      mode: { cue: "image", target: "meaning" },
      rating: 3,
      reviewedAt: new Date(Date.now() - 1_000),
    });
    const graded = (await statesOf(card.id)).find((s) => s.mode === "image_to_meaning");

    const second = await uploadCardImage(
      owner,
      card.id,
      jpeg,
      { version: first.imageVersion },
      deps,
    );
    expect(second.image?.id).not.toBe(first.image?.id);
    expect((await statesOf(card.id)).find((s) => s.mode === "image_to_meaning")).toEqual(graded);

    await expect(
      uploadCardImage(owner, card.id, jpeg, { version: first.imageVersion }, deps),
    ).rejects.toMatchObject({ code: "conflict" });
    const rows = await db
      .select()
      .from(schema.cardImages)
      .where(eq(schema.cardImages.cardId, card.id));
    expect(rows.map((r) => r.status).sort()).toEqual(["active", "replaced"]);
    // The replaced version keeps its bytes; the refused write left none behind.
    expect(store.objects.size).toBe(2);
  });

  it("lets only one of two concurrent changes from the same read land", async () => {
    const { card } = await signCard("detour");
    const store = bucket();
    const deps = { bucket: store, images: processor() };
    const results = await Promise.allSettled([
      uploadCardImage(owner, card.id, jpeg, {}, deps),
      uploadCardImage(owner, card.id, jpeg, {}, deps),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(store.objects.size).toBe(1);
    const active = await db
      .select()
      .from(schema.cardImages)
      .where(and(eq(schema.cardImages.cardId, card.id), eq(schema.cardImages.status, "active")));
    expect(active).toHaveLength(1);
  });

  it("pauses picture review on archive and resumes the same schedule on restore", async () => {
    const { deck, card } = await signCard("crossing", [
      { cue: "image", target: "term" },
      { cue: "meaning", target: "term" },
    ]);
    const deps = { bucket: bucket(), images: processor() };
    await uploadCardImage(
      owner,
      card.id,
      jpeg,
      { description: "Figures walking over stripes" },
      deps,
    );
    const pictureState = (await statesOf(card.id)).find((s) => s.mode === "image_to_term");
    await gradeCard(owner, {
      cardId: card.id,
      mode: { cue: "meaning", target: "term" },
      rating: 4,
      reviewedAt: new Date(Date.now() - 1_000),
    });

    const archived = await archiveCardImage(owner, card.id, {});
    expect(archived.image).toBeNull();
    const queue = await reviewQueue(owner, { deckId: deck.id });
    expect(queue.items.map((item) => item.mode)).not.toContainEqual({
      cue: "image",
      target: "term",
    });
    expect(await statesOf(card.id)).toContainEqual(pictureState);

    const restored = await restoreCardImage(owner, card.id, { version: archived.imageVersion });
    expect(restored.image?.description).toBe("Figures walking over stripes");
    const after = await reviewQueue(owner, { deckId: deck.id });
    expect(after.items).toContainEqual(
      expect.objectContaining({
        stateId: pictureState?.id,
        mode: { cue: "image", target: "term" },
      }),
    );
    expect(after.items.find((i) => i.stateId === pictureState?.id)).not.toHaveProperty("direction");
    await expect(restoreCardImage(owner, card.id, {})).rejects.toMatchObject({ code: "conflict" });
  });

  it("asks a picture-only card by picture, and by its term until it has one", async () => {
    const { deck, card } = await signCard("sign-only", [{ cue: "image", target: "meaning" }]);
    const asked = async () =>
      (await reviewQueue(owner, { deckId: deck.id })).items.map((item) => item.mode);

    expect(await asked()).toEqual([{ cue: "term", target: "meaning" }]);

    const deps = { bucket: bucket(), images: processor() };
    await uploadCardImage(
      owner,
      card.id,
      jpeg,
      { description: "A blue square with a white P" },
      deps,
    );
    expect(await asked()).toEqual([{ cue: "image", target: "meaning" }]);
    expect((await dueCount(owner)) >= 1).toBe(true);

    await archiveCardImage(owner, card.id, {});
    expect(await asked()).toEqual([{ cue: "term", target: "meaning" }]);
  });

  it("asks a card by text again when a picture it gained picture-only modes for is archived", async () => {
    const deck = await createDeck(owner, { name: "Signs later" });
    const [added] = await addCards(owner, [{ deckId: deck.id, term: "later", meaning: "Later" }]);
    if (added?.status !== "added") throw new Error("card not added");
    const deps = { bucket: bucket(), images: processor() };
    await uploadCardImage(owner, added.card.id, jpeg, { description: "A blue square" }, deps);
    await updateCard(owner, added.card.id, { reviewModes: [{ cue: "image", target: "term" }] });
    const asked = async () =>
      (await reviewQueue(owner, { deckId: deck.id })).items.map((item) => item.mode);
    expect(await asked()).toEqual([{ cue: "image", target: "term" }]);

    await archiveCardImage(owner, added.card.id, {});
    expect(await asked()).toEqual([{ cue: "meaning", target: "term" }]);
  });

  it("serves the picture to members, gives members their own picture states, and hides it from strangers", async () => {
    const { deck, card } = await signCard("parking");
    const store = bucket();
    const shown = await uploadCardImage(
      owner,
      card.id,
      jpeg,
      { description: "White letter on blue" },
      { bucket: store, images: processor() },
    );
    await join(member, deck.id);

    expect((await statesOf(card.id, "member")).map((s) => s.mode).sort()).toEqual([
      "image_to_meaning",
      "term_to_meaning",
    ]);
    const file = await cardImageFile(member, card.id, shown.image?.id ?? "", store);
    expect(file.image.contentType).toBe("image/webp");
    await expect(
      cardImageFile(stranger, card.id, shown.image?.id ?? "", store),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      uploadCardImage(member, card.id, jpeg, {}, { bucket: store, images: processor() }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(await dueCount(member)).toBeGreaterThan(0);
  });

  it("imports from a public link without keeping the link", async () => {
    const { card } = await signCard("bump");
    const fetcher = async () => new Response(jpeg);
    const imported = await importCardImage(
      owner,
      card.id,
      {
        url: "https://images.example.org/bump.jpg?sig=secret",
        description: "A small hill drawn in a triangle",
      },
      { bucket: bucket(), images: processor(), fetcher },
    );
    expect(imported.image).toMatchObject({ source: "url", sourceHost: "images.example.org" });
    const audit = await db
      .select()
      .from(schema.auditLog)
      .where(eq(schema.auditLog.entityId, card.id));
    expect(JSON.stringify(audit)).not.toContain("secret");
    expect(JSON.stringify(await db.select().from(schema.cardImages))).not.toContain("secret");
  });
});
