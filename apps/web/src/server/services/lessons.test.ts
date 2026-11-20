import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
import type { DecisionModel } from "../lessons/keep";
import { questionLimit } from "../lessons/prompt";
import { type LessonMaterial, type LessonReader, LessonReaderError } from "../lessons/reader";
import type { AnalyticsEvent } from "./analytics";
import { addCards } from "./cards";
import { createDeck } from "./decks";
import { lessonAccess, readLesson, readLink, worthAsking } from "./lessons";
import { learner, testDb } from "./test-db";

let db: Db;
let dispose: () => Promise<void>;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60_000);

afterAll(async () => {
  await dispose();
});

const material: LessonMaterial = { images: [], pdfs: [], text: "Tund 6" };

const term = (id: string, value: string, extra: Record<string, unknown> = {}) => ({
  id,
  term: value,
  kind: "word",
  meaning: "значение",
  meaningFromLesson: true,
  handwritten: false,
  heading: "2.10",
  seen: value,
  ...extra,
});

function fakeReader(reply: unknown): LessonReader & { briefs: string[] } {
  const briefs: string[] = [];
  return {
    model: "claude-haiku-5-5",
    briefs,
    async stream(_material, brief, _schema, onText) {
      briefs.push(brief);
      // Small chunks, so terms arrive across several pieces of text as they do from the model.
      const text = JSON.stringify(reply);
      for (let i = 0; i < text.length; i += 7) onText(text.slice(i, i + 7));
      return { model: "claude-haiku-5-5", inputTokens: 1000, outputTokens: 200, ms: 5 };
    },
  };
}

const fakeAi = (scores: Record<string, number>): DecisionModel => ({
  async run(_model, input) {
    const term = (input as { state: { candidate: { term: string } } }).state.candidate.term;
    return { answers: { worth: { noul: scores[term] ?? 0.9 } } };
  },
});

describe("readLesson", () => {
  it("carries the reading a lesson prints for a term", async () => {
    const ctx = await learner(db, "lesson-reading", "Kateryna");
    const operators = new Set(["lesson-reading@lymi.test"]);
    const deck = await createDeck(ctx, { name: "日本語", defaultLanguage: "ja" });
    const reader = fakeReader({
      deck: deck.id,
      terms: [term("t1", "上手", { pronunciation: "じょうず" }), term("t2", "ねこ")],
      questions: [],
    });
    const read = await readLesson(
      ctx,
      material,
      { reader, ai: fakeAi({}), operators },
      { deckId: deck.id },
    );
    const byId = Object.fromEntries(read.terms.map((t) => [t.id, t]));
    expect(byId.t1?.pronunciation).toBe("じょうず");
    expect(byId.t2?.pronunciation).toBeNull();
  });

  it("greys a Japanese term as owned only when no reading tells the two apart", async () => {
    const ctx = await learner(db, "lesson-homograph", "Kateryna");
    const operators = new Set(["lesson-homograph@lymi.test"]);
    const deck = await createDeck(ctx, { name: "日本語", defaultLanguage: "ja" });
    await addCards(ctx, [
      { deckId: deck.id, term: "上手", pronunciation: "じょうず", enrich: false },
      { deckId: deck.id, term: "下手", enrich: false },
    ]);
    const reader = fakeReader({
      deck: deck.id,
      terms: [
        term("t1", "上手", { pronunciation: "うわて" }),
        term("t2", "上手", { pronunciation: "ジョウズ" }),
        term("t3", "下手", { pronunciation: "へた" }),
      ],
      questions: [],
    });
    const read = await readLesson(
      ctx,
      material,
      { reader, ai: fakeAi({}), operators },
      { deckId: deck.id },
    );
    const byId = Object.fromEntries(read.terms.map((t) => [t.id, t]));
    expect(byId.t1).toMatchObject({ existing: null, formOf: null, ticked: true });
    expect(byId.t2?.existing?.term).toBe("上手");
    expect(byId.t3?.existing?.term).toBe("下手");
  });

  it("greys terms already owned, flags other forms, and keeps the lesson's meaning only", async () => {
    const ctx = await learner(db, "lesson-owner", "Kateryna");
    const operators = new Set(["lesson-owner@lymi.test"]);
    const deck = await createDeck(ctx, { name: "Eesti A1", defaultLanguage: "et" });
    await addCards(ctx, [
      { deckId: deck.id, term: "küsimus · küsimuse · küsimust", meaning: "вопрос", enrich: false },
      { deckId: deck.id, term: "küsima", meaning: "спрашивать", enrich: false },
    ]);
    const reader = fakeReader({
      deck: deck.id,
      terms: [
        term("t1", "jooma · juua · joon"),
        term("t2", "küsimus · küsimuse · küsimust"),
        term("t3", "küsima · küsida · küsin"),
        term("t4", "avage", { meaningFromLesson: false }),
      ],
      questions: [
        {
          question: "Only the words you marked?",
          options: [
            { label: "All", drop: [] },
            { label: "Marked", drop: ["t1", "t3", "t9"] },
          ],
          default: 7,
        },
      ],
    });

    const read = await readLesson(
      ctx,
      material,
      { reader, ai: fakeAi({ avage: 0.05 }), operators },
      { deckId: deck.id },
    );

    const byId = Object.fromEntries(read.terms.map((t) => [t.id, t]));
    expect(byId.t1).toMatchObject({
      ticked: true,
      existing: null,
      formOf: null,
      meaning: "значение",
    });
    expect(byId.t2?.existing?.deckName).toBe("Eesti A1");
    expect(byId.t2?.ticked).toBe(false);
    expect(byId.t3?.formOf?.term).toBe("küsima");
    expect(byId.t4).toMatchObject({ ticked: false, meaning: null, gloss: "значение", keep: 0.05 });
    expect(read.questions[0]?.options[1]?.drop).toEqual(["t1", "t3"]);
    expect(read.questions[0]?.default).toBe(1);
    expect(read.usage.costUsd).toBeCloseTo(0.0002);
    expect(reader.briefs[0]).toContain("küsima — спрашивать");
  });

  it("keeps the reader's choice when no decision model is bound", async () => {
    const ctx = await learner(db, "lesson-offline", "Kateryna");
    const deck = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    const read = await readLesson(ctx, material, {
      reader: fakeReader({
        deck: deck.id,
        terms: [term("t1", "magama · magada · magan")],
        questions: [],
      }),
      ai: undefined,
      operators: new Set(["lesson-offline@lymi.test"]),
    });
    expect(read.terms[0]).toMatchObject({ keep: null, ticked: true });
  });
});

describe("reporting a read", () => {
  it("names the phone as the read's client", async () => {
    const who = await learner(db, "lesson-phone", "Kateryna");
    const events: AnalyticsEvent[] = [];
    const ctx = {
      ...who,
      analytics: { writeDataPoint: () => {}, capture: (e: AnalyticsEvent) => events.push(e) },
    };
    const deck = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    await readLesson(
      ctx,
      material,
      {
        reader: fakeReader({ deck: deck.id, terms: [term("t1", "raamat")], questions: [] }),
        ai: undefined,
        operators: new Set(["lesson-phone@lymi.test"]),
      },
      { client: "phone" },
    );
    expect(events).toContainEqual(
      expect.objectContaining({ name: "lesson_read", client: "phone" }),
    );
  });

  it("reports the read's outcome and cost, and a failed call as an error", async () => {
    const who = await learner(db, "lesson-counted", "Kateryna");
    const events: AnalyticsEvent[] = [];
    const ctx = {
      ...who,
      analytics: { writeDataPoint: () => {}, capture: (e: AnalyticsEvent) => events.push(e) },
    };
    const operators = new Set(["lesson-counted@lymi.test"]);
    const deck = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    await addCards(ctx, [
      { deckId: deck.id, term: "küsima", meaning: "спрашивать", enrich: false },
    ]);
    events.length = 0;

    await readLesson(ctx, material, {
      reader: fakeReader({
        deck: deck.id,
        terms: [
          term("t1", "jooma · juua · joon"),
          term("t2", "küsima"),
          term("t3", "lugema"),
          term("t4", "kirjutama"),
        ],
        questions: [
          {
            question: "Marked only?",
            options: [
              { label: "All", drop: [] },
              { label: "Marked", drop: ["t1", "t3"] },
            ],
            default: 0,
          },
        ],
      }),
      ai: undefined,
      operators,
    });
    expect(events).toContainEqual({
      name: "lesson_read",
      client: "web",
      material: "lesson",
      reads: 1,
      pages: 0,
      pasted: true,
      deck: "guessed",
      terms: 4,
      ticked: 3,
      existing: 1,
      questions: 1,
    });
    expect(events).toContainEqual(
      expect.objectContaining({
        name: "$ai_generation",
        $ai_span_name: "lesson_read",
        $ai_provider: "anthropic",
        $ai_input_tokens: 1000,
        $ai_output_tokens: 200,
        $ai_is_error: false,
      }),
    );

    events.length = 0;
    const failing: LessonReader = {
      model: "claude-haiku-5-5",
      async stream() {
        throw new LessonReaderError("overloaded", { status: 529 });
      },
    };
    await expect(
      readLesson(ctx, material, { reader: failing, ai: undefined, operators }),
    ).rejects.toThrow();
    expect(events.map((e) => e.name)).toEqual(["$ai_generation"]);
    expect(events[0]).toMatchObject({ $ai_is_error: true, $ai_http_status: 529 });

    events.length = 0;
    await addCards(ctx, [{ deckId: deck.id, term: "jooma", enrich: false }], null, {
      fromLesson: true,
    });
    expect(events).toContainEqual({ name: "cards_added", source: "lesson", count: 1, fields: [] });

    // A card from an article keeps its sentence and link, and says so without their text.
    events.length = 0;
    await addCards(
      ctx,
      [
        {
          deckId: deck.id,
          term: "kevad",
          example: "Kevad on käes.",
          exampleSource: "lesson",
          source: "https://news.example.org/kevad",
          enrich: false,
        },
      ],
      null,
      { fromLesson: true },
    );
    expect(events).toContainEqual({
      name: "cards_added",
      source: "lesson",
      count: 1,
      fields: ["example", "source"],
    });

    // A typed add names the optional fields it holds, never their text.
    events.length = 0;
    await addCards(ctx, [
      { deckId: deck.id, term: "juua", notes: "+ partitive", tags: ["verbs"], enrich: false },
    ]);
    expect(events).toContainEqual({
      name: "cards_added",
      source: "typed",
      count: 1,
      fields: ["notes", "tags"],
    });
  });
});

describe("the daily limit", () => {
  const oneTerm = (deckId: string) =>
    fakeReader({ deck: deckId, terms: [term("t1", "jooma · juua · joon")], questions: [] });

  it("lets a learner read 5 lessons a day, then refuses the next with its own code", async () => {
    const who = await learner(db, "lesson-daily", "Kateryna");
    const events: AnalyticsEvent[] = [];
    const ctx = {
      ...who,
      analytics: { writeDataPoint: () => {}, capture: (e: AnalyticsEvent) => events.push(e) },
    };
    const deck = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    const deps = { reader: oneTerm(deck.id), ai: undefined, operators: new Set<string>() };

    expect((await lessonAccess(ctx, deps.operators)).daily).toMatchObject({ limit: 5, used: 0 });
    for (let i = 0; i < 5; i++) await readLesson(ctx, material, deps);
    const access = await lessonAccess(ctx, deps.operators);
    expect(access).toMatchObject({ allowed: true, daily: { limit: 5, used: 5 } });
    expect(new Date(access.daily?.resetsAt ?? 0).getTime()).toBeGreaterThan(Date.now());

    events.length = 0;
    await expect(readLesson(ctx, material, deps)).rejects.toMatchObject({
      code: "conflict",
      reason: "daily_limit",
    });
    expect(events).toEqual([{ name: "lesson_read_limited" }]);
  });

  it("lets only one of two reads started together take the last one", async () => {
    const ctx = await learner(db, "lesson-race", "Kateryna");
    const deck = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    const deps = { reader: oneTerm(deck.id), ai: undefined, operators: new Set<string>() };
    for (let i = 0; i < 4; i++) await readLesson(ctx, material, deps);
    const both = await Promise.allSettled([
      readLesson(ctx, material, deps),
      readLesson(ctx, material, deps),
    ]);
    expect(both.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
    expect((await lessonAccess(ctx, deps.operators)).daily?.used).toBe(5);
  });

  it("does not count a read that failed", async () => {
    const ctx = await learner(db, "lesson-failed", "Kateryna");
    await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    const failing: LessonReader = {
      model: "claude-haiku-5-5",
      async stream() {
        throw new LessonReaderError("overloaded", { status: 529 });
      },
    };
    const deps = { reader: failing, ai: undefined, operators: new Set<string>() };
    await expect(readLesson(ctx, material, deps)).rejects.toThrow();
    expect((await lessonAccess(ctx, deps.operators)).daily?.used).toBe(0);
  });

  it("gives operators no limit", async () => {
    const ctx = await learner(db, "lesson-unlimited", "Kateryna");
    expect(await lessonAccess(ctx, new Set(["lesson-unlimited@lymi.test"]))).toEqual({
      allowed: true,
      daily: null,
    });
  });
});

describe("choosing the deck", () => {
  it("streams the deck the model chose, among the learner's own", async () => {
    const ctx = await learner(db, "lesson-chooser", "Kateryna");
    await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
    const eesti = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    const reader = fakeReader({
      deck: eesti.id,
      terms: [term("t1", "jooma · juua · joon")],
      questions: [],
    });
    const events: string[] = [];
    const { prepareLesson, streamLesson } = await import("./lessons");
    const lesson = await prepareLesson(ctx, material, {
      reader,
      ai: undefined,
      operators: new Set(["lesson-chooser@lymi.test"]),
    });
    await streamLesson(lesson, material, undefined, (event) => {
      events.push(event.type === "deck" ? `deck:${event.deckId}:${event.guessed}` : event.type);
    });
    expect(events[0]).toBe(`deck:${eesti.id}:true`);
    expect(events).toContain("term");
    expect(reader.briefs[0]).toContain("Italiano");
  });
});

describe("questionLimit", () => {
  it("asks nothing about a page's worth, one about a few pages and two about a long upload", () => {
    expect(questionLimit(0, 120)).toBe(0);
    expect(questionLimit(1, 0)).toBe(0);
    expect(questionLimit(3, 0)).toBe(1);
    expect(questionLimit(0, 4000)).toBe(1);
    expect(questionLimit(10, 0)).toBe(2);
  });
});

describe("worthAsking", () => {
  it("asks only when an answer unticks a few terms and none unticks them all", () => {
    expect(worthAsking([{ drop: [] }, { drop: ["t1", "t2"] }], 6)).toBe(true);
    expect(worthAsking([{ drop: [] }, { drop: ["t1"] }], 6)).toBe(false);
    expect(worthAsking([{ drop: [] }, { drop: [] }], 6)).toBe(false);
    expect(worthAsking([{ drop: [] }, { drop: ["t1", "t2"] }], 2)).toBe(false);
  });

  it("leaves out a question whose answer unticks every new term", async () => {
    const ctx = await learner(db, "lesson-guard", "Kateryna");
    const deck = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    await addCards(ctx, [
      { deckId: deck.id, term: "küsima", meaning: "спрашивать", enrich: false },
    ]);
    const read = await readLesson(ctx, material, {
      reader: fakeReader({
        deck: deck.id,
        terms: [term("t1", "jooma"), term("t2", "lugema"), term("t3", "küsima")],
        questions: [
          {
            question: "Only the ones you marked?",
            options: [
              { label: "All of them", drop: [] },
              { label: "Only the marked ones", drop: ["t1", "t2"] },
            ],
            default: 0,
          },
        ],
      }),
      ai: undefined,
      operators: new Set(["lesson-guard@lymi.test"]),
    });
    expect(read.questions).toEqual([]);
  });
});

type Site = Record<string, { status?: number; body?: string; headers?: Record<string, string> }>;

/** A web of pages by URL, recording every URL fetched. */
function fakeWeb(site: Site) {
  const fetched: string[] = [];
  const request = async (input: RequestInfo | URL) => {
    const url = String(input);
    fetched.push(url);
    const page = site[url];
    if (!page) return new Response("Not found", { status: 404 });
    return new Response(page.body ?? "", {
      status: page.status ?? 200,
      headers: page.headers ?? { "content-type": "text/html; charset=utf-8" },
    });
  };
  // The markdown stands in for Workers AI: the page's paragraphs, one per line.
  const toMarkdown = async ({ html }: { html: string }) =>
    [...html.matchAll(/<p>([^<]*)<\/p>/g)].map((m) => m[1]).join("\n");
  return { fetched, deps: { request, toMarkdown } };
}

const ARTICLE = "https://news.example.org/eesti/2026/kevad";
const articleHtml = (paragraphs: string[], head = "") =>
  `<html><head><title>Kevad &amp; ilm</title>${head}</head><body><article>${paragraphs
    .map((p) => `<p>${p}</p>`)
    .join("")}</article></body></html>`;

async function refusal(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e as { reason?: string; details?: Record<string, string>; message: string },
  );
  return error && { reason: error.reason, details: error.details, message: error.message };
}

describe("readLink", () => {
  const read = { client: "web", deck: "guessed" } as const;

  it("reads an article's sentences with its title and link", async () => {
    const ctx = await learner(db, "link-article", "Kateryna");
    const { deps } = fakeWeb({
      "https://news.example.org/robots.txt": { body: "User-agent: *\nDisallow: /private/" },
      [ARTICLE]: { body: articleHtml(["Kevad on käes. Linnud laulavad!", "Ilm on soe."]) },
    });
    expect(await readLink(ctx, ARTICLE, deps, read)).toEqual({
      title: "Kevad & ilm",
      url: ARTICLE,
      sentences: [
        { text: "Kevad on käes.", at: null },
        { text: "Linnud laulavad!", at: null },
        { text: "Ilm on soe.", at: null },
      ],
    });
  });

  it("refuses a page robots.txt disallows for LymiBot or for every app", async () => {
    const events: AnalyticsEvent[] = [];
    const ctx = {
      ...(await learner(db, "link-robots", "Kateryna")),
      analytics: { writeDataPoint: () => {}, capture: (e: AnalyticsEvent) => events.push(e) },
    };
    for (const robots of [
      "User-agent: LymiBot\nDisallow: /eesti/",
      "User-agent: *\nDisallow: /",
      "User-agent: Googlebot\nAllow: /\n\nUser-agent: *\nDisallow: /eesti",
    ]) {
      const { deps, fetched } = fakeWeb({
        "https://news.example.org/robots.txt": { body: robots },
        [ARTICLE]: { body: articleHtml(["Kevad on käes."]) },
      });
      expect(await refusal(readLink(ctx, ARTICLE, deps, read))).toEqual({
        reason: "link_refused",
        details: { refused: "robots" },
        message: "This site doesn't allow apps to read it. Paste the text instead.",
      });
      expect(fetched).not.toContain(ARTICLE);
    }
    expect(events).toContainEqual(
      expect.objectContaining({ name: "lesson_read", material: "article", refused: "robots" }),
    );
  });

  it("reads a page whose robots.txt allows LymiBot by its own group or is missing", async () => {
    const ctx = await learner(db, "link-robots-allowed", "Kateryna");
    for (const robots of [
      "User-agent: *\nDisallow: /\n\nUser-agent: LymiBot\nAllow: /eesti/",
      "User-agent: *\nDisallow: /eesti\nAllow: /eesti/2026/",
      undefined,
    ]) {
      const { deps } = fakeWeb({
        ...(robots ? { "https://news.example.org/robots.txt": { body: robots } } : {}),
        [ARTICLE]: { body: articleHtml(["Kevad on käes."]) },
      });
      expect((await readLink(ctx, ARTICLE, deps, read)).sentences).toHaveLength(1);
    }
  });

  it("refuses a page that reserves text and data mining by header or meta tag", async () => {
    const ctx = await learner(db, "link-tdm", "Kateryna");
    for (const page of [
      {
        body: articleHtml(["Kevad on käes."]),
        headers: { "content-type": "text/html", "tdm-reservation": "1" },
      },
      { body: articleHtml(["Kevad on käes."], '<meta name="tdm-reservation" content="1">') },
    ]) {
      const { deps } = fakeWeb({ [ARTICLE]: page });
      expect(await refusal(readLink(ctx, ARTICLE, deps, read))).toMatchObject({
        reason: "link_refused",
        details: { refused: "tdm" },
      });
    }
  });

  it("refuses links that are not https or name no public host, before fetching anything", async () => {
    const ctx = await learner(db, "link-rules", "Kateryna");
    const { deps, fetched } = fakeWeb({});
    for (const link of [
      "http://news.example.org/a",
      "https://127.0.0.1/a",
      "https://[::1]/a",
      "https://localhost/a",
      "https://intranet/a",
      "https://printer.local/a",
      "https://user:pass@news.example.org/a",
      "https://news.example.org:8443/a",
      "not a link",
    ]) {
      expect(await refusal(readLink(ctx, link, deps, read))).toMatchObject({
        reason: "link_invalid",
      });
    }
    expect(fetched).toEqual([]);
  });

  it("refuses a redirect to a private host", async () => {
    const ctx = await learner(db, "link-redirect", "Kateryna");
    const { deps, fetched } = fakeWeb({
      [ARTICLE]: { status: 302, headers: { location: "https://10.0.0.1/admin" } },
    });
    expect(await refusal(readLink(ctx, ARTICLE, deps, read))).toMatchObject({
      reason: "link_unreadable",
    });
    expect(fetched).not.toContain("https://10.0.0.1/admin");
  });

  it("names a YouTube video from oEmbed and fetches nothing else from YouTube", async () => {
    const ctx = await learner(db, "link-youtube", "Kateryna");
    const oembed = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent("https://youtu.be/abc123?t=40")}`;
    const { deps, fetched } = fakeWeb({
      [oembed]: {
        body: JSON.stringify({ title: "Eesti keel algajatele" }),
        headers: { "content-type": "application/json" },
      },
    });
    expect(await refusal(readLink(ctx, "https://youtu.be/abc123?t=40", deps, read))).toMatchObject({
      reason: "link_refused",
      details: { refused: "youtube", title: "Eesti keel algajatele" },
    });
    expect(fetched).toEqual([oembed]);
  });

  it("refuses Netflix, Disney+ and Spotify without fetching them", async () => {
    const ctx = await learner(db, "link-drm", "Kateryna");
    const { deps, fetched } = fakeWeb({});
    for (const [link, service] of [
      ["https://www.netflix.com/watch/81234567", "Netflix"],
      ["https://www.disneyplus.com/video/abc", "Disney+"],
      ["https://open.spotify.com/episode/abc", "Spotify"],
    ]) {
      expect(await refusal(readLink(ctx, link ?? "", deps, read))).toMatchObject({
        reason: "link_refused",
        details: { refused: "drm", service },
      });
    }
    expect(fetched).toEqual([]);
  });
});

describe("reading an article", () => {
  const transcript = (sentences: string[]): LessonMaterial => ({
    images: [],
    pdfs: [],
    text: "",
    transcript: {
      title: "Kevad",
      url: ARTICLE,
      sentences: sentences.map((text) => ({ text, at: null })),
    },
  });

  it("quotes each term's example from the article, whatever the model wrote", async () => {
    const ctx = await learner(db, "article-examples", "Kateryna");
    const deck = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    const long = `Eile ${"väga ".repeat(60)}hommikul käisime turul ja ostsime ${"palju ".repeat(30)}köögivilju.`;
    const read = await readLesson(
      ctx,
      transcript(["Kevad on käes.", "Linnud laulavad aias.", long]),
      {
        reader: fakeReader({
          deck: deck.id,
          terms: [
            term("t1", "laulma", { sentence: 2, seen: "The birds are singing." }),
            term("t2", "kevad", { sentence: 0, seen: "Kevad on käes." }),
            term("t3", "turg", { sentence: 3, seen: "turul" }),
          ],
          questions: [],
        }),
        ai: undefined,
        operators: new Set(["article-examples@lymi.test"]),
      },
      { deckId: deck.id },
    );
    const byId = Object.fromEntries(read.terms.map((t) => [t.id, t]));
    expect(byId.t1).toMatchObject({ example: "Linnud laulavad aias.", at: null });
    expect(byId.t2).toMatchObject({ example: "Kevad on käes.", at: null });
    const cut = byId.t3?.example ?? "";
    expect([...cut].length).toBeLessThanOrEqual(250);
    expect(cut).toContain("turul");
    expect(cut.startsWith("…")).toBe(true);
    expect(long).toContain(cut.replace(/^…|…$/g, ""));
  });

  it("sends the article's title and link before its terms", async () => {
    const ctx = await learner(db, "article-source", "Kateryna");
    const deck = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    const { prepareLesson, streamLesson } = await import("./lessons");
    const material = transcript(["Kevad on käes."]);
    const lesson = await prepareLesson(
      ctx,
      material,
      {
        reader: fakeReader({
          deck: deck.id,
          terms: [term("t1", "kevad", { sentence: 1 })],
          questions: [],
        }),
        ai: undefined,
        operators: new Set(["article-source@lymi.test"]),
      },
      { deckId: deck.id },
    );
    const events: unknown[] = [];
    await streamLesson(lesson, material, undefined, (event) => events.push(event));
    expect(events.slice(0, 3)).toMatchObject([
      { type: "deck" },
      { type: "source", title: "Kevad", url: ARTICLE },
      { type: "term", term: { term: "kevad", example: "Kevad on käes." } },
    ]);
  });

  it("asks before a long article counts as several reads, then counts them all", async () => {
    const ctx = await learner(db, "article-long", "Kateryna");
    const deck = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    const sentence = `${"sõna ".repeat(99)}lõpp.`;
    const material = transcript(Array.from({ length: 160 }, () => sentence));
    const deps = {
      reader: fakeReader({
        deck: deck.id,
        terms: [term("t1", "sõna", { sentence: 1 })],
        questions: [],
      }),
      ai: undefined,
      operators: new Set<string>(),
    };
    expect(await refusal(readLesson(ctx, material, deps, { deckId: deck.id }))).toMatchObject({
      reason: "long_read",
      details: { reads: "2", words: "16000", left: "5" },
    });
    expect((await lessonAccess(ctx, new Set())).daily?.used).toBe(0);

    await readLesson(ctx, material, deps, { deckId: deck.id, reads: 2 });
    expect((await lessonAccess(ctx, new Set())).daily?.used).toBe(2);
  });

  it("refuses an article too long for a day's reads", async () => {
    const ctx = await learner(db, "article-too-long", "Kateryna");
    const deck = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    const sentence = `${"sõna ".repeat(999)}lõpp.`;
    const material = transcript(Array.from({ length: 76 }, () => sentence));
    expect(
      await refusal(
        readLesson(
          ctx,
          material,
          {
            reader: fakeReader({ deck: deck.id, terms: [], questions: [] }),
            ai: undefined,
            operators: new Set(),
          },
          { deckId: deck.id, reads: 6 },
        ),
      ),
    ).toMatchObject({ reason: "too_long" });
  });
});
