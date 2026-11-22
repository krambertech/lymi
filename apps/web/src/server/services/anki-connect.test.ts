import { crc32, deflateSync } from "node:zlib";
import { and, eq } from "@lymi/core/db";
import { beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import type { AnalyticsEvent } from "./analytics";
import {
  type AnkiConnectDeps,
  answerCall,
  parseQuery,
  sweepAnkiConnectUploads,
} from "./anki-connect";
import { cardImageFile, storeImportedImage } from "./card-images";
import { addCards, showCard } from "./cards";
import type { ServiceContext } from "./context";
import { archiveDeck, createDeck } from "./decks";
import { join } from "./members";
import { storeExampleRecording } from "./recordings";
import { learner, type TestBindings, testDb } from "./test-db";

/**
 * The protocol as Yomitan 26.10 speaks it: version 2 bare replies, a duplicate check with only
 * the first field, media uploaded before its note. The calls were read from a live Yomitan.
 */
let db: Db;
let env: TestBindings;
let ctx: ServiceContext;
let deps: AnkiConnectDeps;
const events: AnalyticsEvent[] = [];
let japanese: string;

beforeAll(async () => {
  ({ db, env } = await testDb());
  const user = await learner(db, "anki-connect", "Mika");
  ctx = {
    ...user,
    actor: "api",
    client: "key-1",
    clientName: "Yomitan",
    analytics: { writeDataPoint: () => {}, capture: (event) => events.push(event) },
  };
  deps = {
    scope: "write",
    enrichment: null,
    media: {
      stash: env.IMPORTS,
      audio: env.AUDIO,
      pictures: { bucket: env.PRIVATE_IMAGES, images: env.IMAGES },
    },
  };
  japanese = (await createDeck(user, { name: "日本語", defaultLanguage: "ja" })).id;
  await createDeck(user, { name: "Italiano", defaultLanguage: "it" });
  await createDeck(user, { name: "Italiano", defaultLanguage: "it" });
  const old = await createDeck(user, { name: "Old", defaultLanguage: "ja" });
  await archiveDeck(user, old.id);
  await addCards(user, [
    {
      deckId: japanese,
      term: "上手",
      pronunciation: "じょうず",
      meaning: "skilful",
      enrich: false,
    },
  ]);
}, 60_000);

const call = (action: string, params: Record<string, unknown> = {}, version = 2) =>
  answerCall(ctx, { action, params, version }, deps);

const options = { allowDuplicate: true, duplicateScope: "collection" };
const note = (fields: Record<string, string>, deckName = "日本語") => ({
  deckName,
  modelName: "Lymi card",
  fields,
  tags: ["yomitan"],
  options,
});
/** What Yomitan checks before showing the add button: the first field only, duplicates refused. */
const probe = (term: string, deckName = "日本語") => ({
  ...note({ Term: term }, deckName),
  options: { ...options, allowDuplicate: false },
});

describe("answerCall", () => {
  it("replies bare to version 2 and in an envelope from version 5", async () => {
    expect(await call("version")).toBe(6);
    expect(await call("version", {}, 6)).toEqual({ result: 6, error: null });
    expect(await call("deleteDecks")).toEqual({ result: null, error: "unsupported action" });
    expect(await call("deleteDecks", {}, 6)).toEqual({ result: null, error: "unsupported action" });
  });

  it("lists the learner's own active decks, numbering a name two decks share", async () => {
    expect(await call("deckNames")).toEqual(["日本語", "Italiano", "Italiano (2)"]);
  });

  it("offers one note type whose fields Yomitan maps by name", async () => {
    expect(await call("modelNames")).toEqual(["Lymi card"]);
    expect(await call("modelFieldNames", { modelName: "Lymi card" })).toEqual([
      "Term",
      "Reading",
      "Meaning",
      "Sentence",
      "URL",
      "Audio",
      "Sentence audio",
      "Picture",
    ]);
    expect(await call("modelFieldNames", { modelName: "Basic" })).toMatchObject({
      error: expect.stringContaining("Lymi card"),
    });
  });

  it("adds a card from Yomitan's HTML as plain text, counted as an AnkiConnect add", async () => {
    events.length = 0;
    const id = await call("addNote", {
      note: {
        ...note({
          Term: "散歩",
          Reading: "さんぽ",
          Meaning:
            '<div class="yomitan-glossary"><ol><li data-dictionary="JMdict"><i>(n, vs, JMdict)</i> <span><ul data-sc-content="glossary"><li>walk</li><li>stroll</li></ul></span></li></ol></div>',
          Sentence: "毎朝、公園を<b>散歩</b>します。",
          URL: '<a href="https://www3.nhk.or.jp/news/easy/">NEWS WEB EASY</a>',
          Audio: "",
        }),
        tags: ["yomitan", "news", "News"],
      },
    });
    expect(typeof id).toBe("number");
    const [card] = await db.select().from(schema.cards).where(eq(schema.cards.term, "散歩"));
    expect(card).toMatchObject({
      deckId: japanese,
      meaning: "walk; stroll",
      meaningSource: "manual",
      pronunciation: "さんぽ",
      example: "毎朝、公園を散歩します。",
      source: "https://www3.nhk.or.jp/news/easy/",
      tags: ["news"],
      createdBy: "api",
    });
    expect(events).toContainEqual({ name: "cards_added", count: 1, source: "anki_connect" });
  });

  it("keeps the moment of a source URL too long for a card", async () => {
    await call("addNote", {
      note: note({
        Term: "動画",
        Reading: "どうが",
        Meaning: "video",
        Sentence: "",
        URL: `https://www.youtube.com/watch?v=abc&t=221&pp=${"x".repeat(220)}`,
        Audio: "",
      }),
    });
    const [card] = await db.select().from(schema.cards).where(eq(schema.cards.term, "動画"));
    expect(card?.source).toBe("https://www.youtube.com/watch?t=221");
  });

  it("reports a duplicate the way Yomitan reads it, and adding it again changes nothing", async () => {
    expect(
      await call("canAddNotesWithErrorDetail", { notes: [probe("散歩"), probe("図書館")] }),
    ).toEqual([
      { canAdd: false, error: "cannot create note because it is a duplicate" },
      { canAdd: true, error: null },
    ]);
    expect(await call("canAddNotes", { notes: [probe("散歩"), note({ Term: "散歩" })] })).toEqual([
      false,
      true,
    ]);
    const [first] = (await call("findNotes", { query: '"term:散歩"' })) as number[];
    events.length = 0;
    expect(await call("addNote", { note: note({ Term: "散歩", Meaning: "a walk" }) })).toBe(first);
    expect(events.filter((e) => e.name === "cards_added")).toEqual([]);
  });

  it("marks a homograph as held when Yomitan's probe has no reading, and adds it with one", async () => {
    // The probe sends the first field only, so 上手 read うわて cannot be told from じょうず until
    // the add, which has the reading and gives it its own card.
    expect(await call("canAddNotesWithErrorDetail", { notes: [probe("上手")] })).toEqual([
      { canAdd: false, error: "cannot create note because it is a duplicate" },
    ]);
  });

  it("tells a Japanese homograph by its reading, as adding does", async () => {
    expect(
      await call("canAddNotesWithErrorDetail", {
        notes: [{ ...probe("上手"), fields: { Term: "上手", Reading: "うわて" } }],
      }),
    ).toEqual([{ canAdd: true, error: null }]);
  });

  it("refuses a term in another script than its deck's language, saying how to fix it", async () => {
    events.length = 0;
    const reply = await call("addNote", { note: note({ Term: "trattoria" }) });
    expect(reply).toEqual({
      result: null,
      error:
        "“trattoria” isn’t Japanese, and “日本語” is a Japanese deck. In Yomitan’s Anki settings, choose a deck for this language.",
    });
    expect(events).toEqual([{ name: "anki_connect_refused", reason: "language" }]);
    expect(await call("addNote", { note: note({ Term: "trattoria" }, "Italiano (2)") })).toEqual(
      expect.any(Number),
    );
  });

  it("refuses a deck it does not have and a note type it does not offer", async () => {
    expect(await call("addNote", { note: note({ Term: "猫" }, "Old") })).toMatchObject({
      error: expect.stringContaining("no deck called “Old”"),
    });
    expect(
      await call("addNotes", { notes: [{ ...note({ Term: "猫" }), modelName: "Basic" }] }),
    ).toEqual([null]);
  });

  it("lets a read-only key look but not add", async () => {
    const reading = { ...deps, scope: "read" as const };
    expect(await answerCall(ctx, { action: "deckNames", version: 2 }, reading)).toHaveLength(3);
    expect(
      await answerCall(
        ctx,
        { action: "addNote", version: 2, params: { note: note({ Term: "猫" }) } },
        reading,
      ),
    ).toMatchObject({ error: expect.stringContaining("can only read") });
  });

  it("finds notes by term, deck and id, and describes them", async () => {
    const [id] = (await call("findNotes", { query: '"deck:日本語" "term:散歩"' })) as number[];
    expect(await call("findNotes", { query: '"deck:Italiano" "term:散歩"' })).toEqual([]);
    expect(
      ((await call("findNotes", { query: '("term:散歩") or ("term:上手")' })) as number[]).length,
    ).toBe(2);
    expect(
      await call("multi", {
        actions: [{ action: "findNotes", params: { query: `nid:${id} ("term:散歩")` } }],
      }),
    ).toEqual([[id]]);
    const [info, missing] = (await call("notesInfo", { notes: [id, 999_999] })) as object[];
    expect(info).toMatchObject({
      noteId: id,
      modelName: "Lymi card",
      cards: [id],
      fields: { Term: { value: "散歩", order: 0 }, Meaning: { value: "walk; stroll", order: 2 } },
    });
    expect(missing).toEqual({});
    expect(await call("cardsInfo", { cards: [id] })).toEqual([
      expect.objectContaining({ cardId: id, note: id, deckName: "日本語" }),
    ]);
  });

  it("keeps the term's uploaded clip as the card's recording and drops pictures", async () => {
    const clip = btoa(String.fromCharCode(0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0, 1, 2, 3));
    const picture = btoa(String.fromCharCode(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a));
    expect(await call("storeMediaFile", { filename: "yomitan_audio_1.mp3", data: clip })).toBe(
      "yomitan_audio_1.mp3",
    );
    expect(await call("storeMediaFile", { filename: "shot.png", data: picture })).toBe("shot.png");
    expect((await env.IMPORTS.list({ prefix: "anki-connect/" })).objects).toHaveLength(1);

    await call("addNote", {
      note: note({ Term: "図書館", Audio: "[sound:yomitan_audio_1.mp3]" }),
    });
    const [card] = await db.select().from(schema.cards).where(eq(schema.cards.term, "図書館"));
    expect(card?.audioSource).toBe("recorded");
    expect(await env.AUDIO.get(card?.audioKey ?? "")).not.toBeNull();
    expect((await env.IMPORTS.list({ prefix: "anki-connect/" })).objects).toHaveLength(0);
  });

  it("caps a request: notes per call, actions per multi, and no multi inside a multi", async () => {
    const many = Array.from({ length: 201 }, (_, i) => note({ Term: `語${i}` }));
    expect(await call("addNotes", { notes: many })).toMatchObject({
      error: "Send at most 200 notes in one request.",
    });
    const half = (from: number) =>
      Array.from({ length: 150 }, (_, i) => note({ Term: `語${from + i}` }));
    const split = (await call("multi", {
      actions: [
        { action: "canAddNotes", params: { notes: half(0) } },
        { action: "canAddNotes", params: { notes: half(150) } },
      ],
    })) as unknown[];
    expect(split[0]).toHaveLength(150);
    expect(split[1]).toEqual({ result: null, error: "Send at most 200 notes in one request." });
    const ids = Array.from({ length: 201 }, (_, i) => i + 1).join(",");
    expect(await call("findNotes", { query: `nid:${ids}` })).toMatchObject({
      error: "Ask for at most 200 notes in one request.",
    });
    const alternatives = (count: number) =>
      Array.from({ length: count }, (_, i) => `("term:${i}")`).join(" or ");
    expect(await call("findNotes", { query: alternatives(101) })).toMatchObject({
      error: "Search for at most 100 alternatives in one request.",
    });
    const searches = (await call("multi", {
      actions: Array.from({ length: 3 }, () => ({
        action: "findNotes",
        params: { query: alternatives(40) },
      })),
    })) as unknown[];
    expect(searches.slice(0, 2)).toEqual([[], []]);
    expect(searches[2]).toEqual({
      result: null,
      error: "Search for at most 100 alternatives in one request.",
    });
    const actions = Array.from({ length: 51 }, () => ({ action: "version" }));
    expect(await call("multi", { actions })).toMatchObject({
      error: expect.stringContaining("50"),
    });
    expect(
      await call("multi", { actions: [{ action: "multi", params: { actions: [] } }] }),
    ).toMatchObject({ error: "multi can’t hold another multi." });
  });

  it("answers a call of more than a hundred notes, past D1's bound-parameter limit", async () => {
    const terms = Array.from({ length: 120 }, (_, i) => `単語${i}`);
    const ids = (await call("addNotes", {
      notes: terms.map((term) => note({ Term: term })),
    })) as number[];
    expect(ids).toHaveLength(120);
    expect(ids.every((id) => typeof id === "number")).toBe(true);
    const info = (await call("notesInfo", { notes: ids })) as { noteId?: number }[];
    expect(info.map((n) => n.noteId)).toEqual(ids);
    expect(await call("findNotes", { query: `nid:${ids.join(",")}` })).toHaveLength(120);
  });

  it("refuses an upload from a read-only key", async () => {
    const reading = { ...deps, scope: "read" as const };
    expect(
      await answerCall(
        ctx,
        { action: "storeMediaFile", version: 2, params: { filename: "a.mp3", data: "SUQz" } },
        reading,
      ),
    ).toMatchObject({ error: expect.stringContaining("can only read") });
  });

  it("refuses to change fields and tags together, and a note that isn't the learner's", async () => {
    expect(await call("updateNote", { note: { id: 1, fields: {}, tags: [] } })).toMatchObject({
      error: expect.stringContaining("edit the card in Lymi"),
    });
    expect(
      await call("updateNoteFields", { note: { id: 999_999, fields: { Sentence: "x" } } }, 6),
    ).toEqual({ result: null, error: "Note was not found: 999999" });
  });

  it("answers View note without opening anything", async () => {
    expect(await call("guiBrowse", { query: "nid:1" })).toEqual([]);
  });
});

/** A solid-colour PNG, built by hand so the test needs no image library. */
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
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]).toString("base64");
}

const clip = (tag: number) => btoa(String.fromCharCode(0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0, tag));
const frame = png(64, 36);

const cardOf = async (term: string) => {
  const [card] = await db
    .select()
    .from(schema.cards)
    .where(and(eq(schema.cards.userId, ctx.userId), eq(schema.cards.term, term)));
  if (!card) throw new Error(`no card ${term}`);
  return card;
};
const pictureOf = async (cardId: string) => {
  const [image] = await db
    .select()
    .from(schema.cardImages)
    .where(and(eq(schema.cardImages.cardId, cardId), eq(schema.cardImages.status, "active")));
  return image;
};

/**
 * asbplayer's two ways to a card: a note carrying `audio` and `picture`, and updating the last
 * card Yomitan added. asbplayer sends each as one `{ filename, data, fields }` object, named
 * `asbp_` with a random suffix, which AnkiConnect accepts beside a list.
 */
describe("asbplayer", () => {
  it("keeps the clip and frame a note carries as the example's recording and the picture", async () => {
    events.length = 0;
    const id = await call(
      "addNote",
      {
        note: {
          deckName: "日本語",
          modelName: "Lymi card",
          fields: { Term: "電車", Sentence: "電車が来ました。", URL: "https://www.youtube.com/" },
          tags: ["asbplayer"],
          options: { allowDuplicate: false, duplicateScope: "collection" },
          audio: { filename: "asbp_train_k3f9.mp3", data: clip(1), fields: ["Sentence audio"] },
          picture: { filename: "asbp_train_k3f9.png", data: frame, fields: ["Picture"] },
        },
      },
      6,
    );
    expect(id).toEqual({ result: expect.any(Number), error: null });
    const card = await cardOf("電車");
    // On main the clip was dropped, so the card had no recording of its example.
    expect(card.exampleRecordingKey).not.toBeNull();
    expect(card).toMatchObject({
      example: "電車が来ました。",
      exampleRecordingCaptured: true,
      audioKey: null,
    });
    expect(await env.AUDIO.get(card.exampleRecordingKey ?? "")).not.toBeNull();
    expect(await pictureOf(card.id)).toMatchObject({ captured: true, contentType: "image/webp" });
    expect(events).toContainEqual({
      name: "anki_connect_media",
      kind: "sentence_audio",
      action: "add",
    });
    expect(events).toContainEqual({ name: "anki_connect_media", kind: "picture", action: "add" });
    expect((await env.IMPORTS.list({ prefix: "anki-connect/" })).objects).toHaveLength(0);
  });

  it("puts the sentence, its clip and the frame on the card Yomitan added last", async () => {
    await call("addNote", { note: note({ Term: "改札", Sentence: "駅で待つ。" }) });
    await call("addNote", { note: note({ Term: "出口", Sentence: "駅で待つ。" }) });
    const gate = await cardOf("改札");
    const exit = await cardOf("出口");
    events.length = 0;

    const found = (await call("findNotes", { query: "added:1" }, 6)) as { result: number[] };
    const last = Math.max(...found.result);
    expect(await call("notesInfo", { notes: [last] }, 6)).toMatchObject({
      result: [{ fields: { Term: { value: "出口" }, "Sentence audio": { value: "", order: 6 } } }],
    });
    // "Also update cards with the same subtitle" sends the same files again, one note at a time.
    const [earlier] = (await call("findNotes", { query: '"term:改札"' })) as number[];
    for (const id of [last, earlier]) {
      expect(
        await call(
          "updateNoteFields",
          {
            note: {
              id,
              fields: { Sentence: "改札を出たら右です。" },
              audio: { filename: "asbp_gate_x7q2.mp3", data: clip(2), fields: ["Sentence audio"] },
              picture: { filename: "asbp_gate_x7q2.png", data: frame, fields: ["Picture"] },
            },
          },
          6,
        ),
      ).toEqual({ result: null, error: null });
    }
    expect(await call("addTags", { notes: [last, earlier], tags: "asbplayer" }, 6)).toEqual({
      result: null,
      error: null,
    });

    for (const card of [gate, exit]) {
      const updated = await cardOf(card.term);
      expect(updated).toMatchObject({
        id: card.id,
        example: "改札を出たら右です。",
        exampleRecordingCaptured: true,
        tags: ["asbplayer"],
      });
      expect(updated.exampleRecordingKey).not.toBeNull();
      expect(await pictureOf(card.id)).toMatchObject({ captured: true });
    }
    expect(events.filter((e) => e.name === "anki_connect_media")).toHaveLength(4);
    expect(events).toContainEqual({
      name: "anki_connect_media",
      kind: "sentence_audio",
      action: "update",
    });
  });

  it("takes a file stored first and referenced from the field, as AnkiConnect allows", async () => {
    await call("addNote", { note: note({ Term: "切符", Sentence: "切符を買う。" }) });
    const [id] = (await call("findNotes", { query: '"term:切符"' })) as number[];
    await call("storeMediaFile", { filename: "asbp_ticket_a1.mp3", data: clip(4) }, 6);
    await call("storeMediaFile", { filename: "asbp_ticket_a1.png", data: frame }, 6);
    await call("updateNoteFields", {
      note: {
        id,
        fields: {
          "Sentence audio": "[sound:asbp_ticket_a1.mp3]",
          Picture: '<img src="asbp_ticket_a1.png">',
        },
      },
    });
    const card = await cardOf("切符");
    expect(card).toMatchObject({ example: "切符を買う。", exampleRecordingCaptured: true });
    expect(await pictureOf(card.id)).toMatchObject({ captured: true });
  });

  it("replaces a captured clip when the line is captured again", async () => {
    const before = await cardOf("改札");
    const [id] = (await call("findNotes", { query: '"term:改札"' })) as number[];
    await call("updateNoteFields", {
      note: {
        id,
        fields: { Sentence: "改札を出たら右です。" },
        audio: { filename: "asbp_gate_retimed.mp3", data: clip(9), fields: ["Sentence audio"] },
      },
    });
    const after = await cardOf("改札");
    expect(after.exampleRecordingKey).not.toBe(before.exampleRecordingKey);
    expect(after.exampleRecordingCaptured).toBe(true);
    expect(await env.AUDIO.get(before.exampleRecordingKey ?? "")).toBeNull();
  });

  it("leaves out a captured clip aimed at Audio, which members of the deck would hear", async () => {
    await call("addNote", {
      note: {
        ...note({ Term: "ホーム", Sentence: "ホームで待つ。" }),
        audio: { filename: "asbp_platform.mp3", data: clip(5), fields: ["Audio"] },
      },
    });
    expect(await cardOf("ホーム")).toMatchObject({
      audioKey: null,
      exampleRecordingKey: null,
    });
  });

  it("keeps a picture the learner chose, and replaces only a captured one", async () => {
    await call("addNote", { note: note({ Term: "改札口", Sentence: "改札口で会おう。" }) });
    const card = await cardOf("改札口");
    await storeImportedImage(
      ctx,
      card,
      Uint8Array.from(atob(frame), (c) => c.charCodeAt(0)),
      "Blue gate",
      { bucket: env.PRIVATE_IMAGES, images: env.IMAGES },
    );
    const chosen = await pictureOf(card.id);
    const [id] = (await call("findNotes", { query: '"term:改札口"' })) as number[];
    await call("updateNoteFields", {
      note: {
        id,
        fields: {},
        picture: { filename: "asbp_gate2.png", data: frame, fields: ["Picture"] },
      },
    });
    expect(await pictureOf(card.id)).toMatchObject({ id: chosen?.id, captured: false });

    const before = await pictureOf((await cardOf("改札")).id);
    const [gate] = (await call("findNotes", { query: '"term:改札"' })) as number[];
    await call("updateNoteFields", {
      note: {
        id: gate,
        fields: {},
        picture: { filename: "asbp_gate3.png", data: frame, fields: ["Picture"] },
      },
    });
    const after = await pictureOf((await cardOf("改札")).id);
    expect(after).toMatchObject({ captured: true });
    expect(after?.id).not.toBe(before?.id);
  });

  it("caps the files one request may upload", async () => {
    const files = Array.from({ length: 21 }, (_, i) => ({
      filename: `asbp_${i}.mp3`,
      data: clip(i),
      fields: ["Sentence audio"],
    }));
    expect(await call("addNote", { note: { ...note({ Term: "線路" }), audio: files } }, 6)).toEqual(
      { result: null, error: "Send at most 20 files in one request." },
    );
  });

  it("adds tags beside the ones a card has, and passes over a note that isn't there", async () => {
    await addCards(ctx, [{ deckId: japanese, term: "時刻表", tags: ["yomitan"], enrich: false }]);
    const [id] = (await call("findNotes", { query: '"term:時刻表"' })) as number[];
    expect(await call("addTags", { notes: [999_998, id], tags: "asbplayer" }, 6)).toEqual({
      result: null,
      error: null,
    });
    expect((await cardOf("時刻表")).tags).toEqual(["yomitan", "asbplayer"]);
  });

  it("keeps no clip that lost to an edit made while it was stored", async () => {
    const card = await cardOf("切符");
    const folder = { prefix: `cards/${card.id}/example-recorded/` };
    const before = (await env.AUDIO.list(folder)).objects.length;
    await db
      .update(schema.cards)
      .set({ exampleRecordingKey: null, exampleRecordingCaptured: false })
      .where(eq(schema.cards.id, card.id));
    const outcome = await storeExampleRecording(
      ctx,
      card.id,
      "切符を買う。",
      async () => {
        await db
          .update(schema.cards)
          .set({ example: "切符を二枚買う。" })
          .where(eq(schema.cards.id, card.id));
        return Uint8Array.from(atob(clip(7)), (c) => c.charCodeAt(0));
      },
      env.AUDIO,
      true,
    );
    expect(outcome).toBe("skipped");
    expect((await cardOf("切符")).exampleRecordingKey).toBeNull();
    expect((await env.AUDIO.list(folder)).objects).toHaveLength(before);
  });

  it("drops a captured clip when a later update changes the sentence without one", async () => {
    const [id] = (await call("findNotes", { query: '"term:改札"' })) as number[];
    await call("updateNoteFields", { note: { id, fields: { Sentence: "改札はどこですか。" } } });
    expect(await cardOf("改札")).toMatchObject({
      example: "改札はどこですか。",
      exampleRecordingKey: null,
      exampleRecordingCaptured: false,
    });
  });

  it("plays and shows captured media to the owner alone, never to a member of the deck", async () => {
    const card = await cardOf("電車");
    const picture = await pictureOf(card.id);
    const member = await learner(db, "anki-connect-member", "Ren");
    await join(member, japanese);

    expect(await showCard(ctx, card.id)).toMatchObject({
      exampleRecorded: true,
      image: { id: picture?.id },
    });
    expect(await showCard(member, card.id)).toMatchObject({ exampleRecorded: false, image: null });
    await expect(
      cardImageFile(member, card.id, picture?.id ?? "", env.PRIVATE_IMAGES),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(
      (await cardImageFile(ctx, card.id, picture?.id ?? "", env.PRIVATE_IMAGES)).image.id,
    ).toBe(picture?.id);
  });

  it("refuses every write from a read-only key", async () => {
    const reading = { ...deps, scope: "read" as const };
    const [id] = (await call("findNotes", { query: '"term:電車"' })) as number[];
    for (const [action, params] of [
      ["updateNoteFields", { note: { id, fields: { Sentence: "x" } } }],
      ["addTags", { notes: [id], tags: "asbplayer" }],
      ["storeMediaFile", { filename: "a.mp3", data: clip(3) }],
      ["addNote", { note: note({ Term: "猫" }) }],
    ] as const) {
      expect(await answerCall(ctx, { action, params, version: 6 }, reading)).toMatchObject({
        error: expect.stringContaining("can only read"),
      });
    }
  });
});

describe("sweepAnkiConnectUploads", () => {
  it("deletes uploads whose note never came after an hour", async () => {
    // Updates leave their uploads for this sweep, so start from an empty stash.
    await sweepAnkiConnectUploads(env.IMPORTS, new Date(Date.now() + 2 * 60 * 60 * 1000));
    await env.IMPORTS.put("anki-connect/someone/abc", new Uint8Array([1]));
    await sweepAnkiConnectUploads(env.IMPORTS, new Date());
    expect((await env.IMPORTS.list({ prefix: "anki-connect/" })).objects).toHaveLength(1);
    await sweepAnkiConnectUploads(env.IMPORTS, new Date(Date.now() + 2 * 60 * 60 * 1000));
    expect((await env.IMPORTS.list({ prefix: "anki-connect/" })).objects).toHaveLength(0);
  });
});

describe("parseQuery", () => {
  it("reads the searches Yomitan writes", () => {
    expect(parseQuery('"deck:日本語 N5" "term:食べる"')).toEqual([
      { deck: "日本語 N5", field: "食べる" },
    ]);
    expect(parseQuery('("term:a") or ("term:b")')).toEqual([{ field: "a" }, { field: "b" }]);
    expect(parseQuery('nid:1,2 ("term:a")')).toEqual([{ notes: [1, 2], field: "a" }]);
    expect(parseQuery('"term:(笑)"')).toEqual([{ field: "(笑)" }]);
    expect(parseQuery("added:1")).toEqual([{ added: 1 }]);
    expect(parseQuery("added:x")).toEqual([{}]);
  });
});
