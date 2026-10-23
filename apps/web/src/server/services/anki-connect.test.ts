import { eq } from "@lymi/core/db";
import { beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import type { AnalyticsEvent } from "./analytics";
import {
  type AnkiConnectDeps,
  answerCall,
  parseQuery,
  sweepAnkiConnectUploads,
} from "./anki-connect";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { archiveDeck, createDeck } from "./decks";
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
  deps = { scope: "write", enrichment: null, media: { stash: env.IMPORTS, audio: env.AUDIO } };
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

  it("refuses to change a card, which Lymi does in the app", async () => {
    expect(await call("updateNoteFields", { note: { id: 1, fields: {} } })).toMatchObject({
      error: expect.stringContaining("edit the card in Lymi"),
    });
  });

  it("answers View note without opening anything", async () => {
    expect(await call("guiBrowse", { query: "nid:1" })).toEqual([]);
  });
});

describe("sweepAnkiConnectUploads", () => {
  it("deletes uploads whose note never came after an hour", async () => {
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
  });
});
