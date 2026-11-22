import { configureClient } from "@lymi/client";
import { outboxSize, resetGradeCache } from "@lymi/client/grades";
import { OUTBOX_KEY, WRITE_PREFIX } from "@lymi/client/queued";
import {
  claimWrites,
  flushWrites,
  pendingWrites,
  resetWriteCache,
  type Write,
} from "@lymi/client/writes";
import { AddCardOutcomeOut, DeckOut, GradeOut, newId } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { schema } from "./db";
import corpus from "./queued-bodies.json";
import { json, type Session, type TestApp, testApp } from "./test-app";

type Stored = Record<string, unknown>;
type Entry = { since: string; until?: string; grade?: Stored; queued?: Stored & { write: Write } };
type Sent = { operation: string; id?: string; query?: string; body?: Stored };

const entries = Object.entries(corpus as unknown as Record<string, Entry>).map(([name, entry]) => ({
  name,
  entry,
}));

const operations: Record<Write["kind"], string> = {
  "card.add": "POST /api/cards",
  "card.update": "PATCH /api/cards/{id}",
  "card.archive": "POST /api/cards/{id}/archive",
  "card.restore": "POST /api/cards/{id}/restore",
  "card.important": "PUT /api/cards/{id}/important",
  "deck.create": "POST /api/decks",
  "deck.update": "PATCH /api/decks/{id}",
  "deck.preferences": "PUT /api/decks/{id}/preferences",
  "deck.archive": "POST /api/decks/{id}/archive",
  "deck.restore": "POST /api/decks/{id}/restore",
};
const GRADE = "POST /api/review/grade";
const UNDO = "POST /api/review/undo";

const gradeFields = [
  "cardId",
  "direction",
  "mode",
  "rating",
  "reviewedAt",
  "timezone",
  "aid",
  "recallMs",
  "gradeMs",
  "readingsFaded",
];

const neverQueued: [reason: string, at: RegExp][] = [
  ["A card's modes are written as reviewModes.", /^card\.\w+ \.directions/],
  ["A deck's modes are written as directions.", /^deck\.\w+ \.reviewModes/],
  [
    "A new deck is described and set up in its settings.",
    /^deck\.create \.(description|enrich\w+|sectionProgression)/,
  ],
  ["A deck changes series through the series routes.", /^deck\.update \.seriesId/],
  [
    "A create leaves out what it does not set.",
    /^(card\.add \.(sectionId|reviewModes)|deck\.create \.seriesId)=null$/,
  ],
  [
    "Only the Undo of a hint writes a lesson's source.",
    /^card\.(add \.\w+|update \.(?!h(ook|int)S)\w+)Source=lesson$/,
  ],
];

function sentBy({ grade, queued }: Entry): Sent {
  if (grade?.undone) return { operation: UNDO, body: { reviewId: grade.reviewId } };
  if (grade) {
    const body = Object.entries(grade).filter(([field]) => gradeFields.includes(field));
    return { operation: GRADE, body: Object.fromEntries(body) };
  }
  if (!queued) throw new Error("An entry holds a grade or a queued write");
  const { write } = queued;
  const sent = {
    operation: operations[write.kind],
    ...("id" in write ? { id: write.id } : {}),
    ...("from" in write ? { query: `?from=${write.from}` } : {}),
  };
  switch (write.kind) {
    case "card.add":
    case "deck.create":
      return { ...sent, body: write.input };
    case "card.update":
    case "deck.update":
      return { ...sent, body: write.patch };
    case "deck.preferences":
      return { ...sent, body: write.preferences };
    case "card.important":
      return { ...sent, body: { important: write.important } };
    default:
      return sent;
  }
}

let app: TestApp;
let learner: Session;
let document: {
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, unknown> };
};
let answers: { request: string; status: number; issues?: unknown }[] = [];
const storage = new Map<string, string>();

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("queued-bodies");
  document = await (await app.fetch("/api/openapi.json", {})).json();
  configureClient({
    baseUrl: "https://queued.test",
    headers: () => ({ cookie: learner.cookie }),
    credentials: "omit",
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => void storage.set(key, value),
      removeItem: (key) => void storage.delete(key),
      keys: () => [...storage.keys()],
    },
    messages: {
      unreachable: () => "unreachable",
      signIn: () => "sign in",
      ownerOnly: () => "owner only",
      gone: () => "gone",
      failed: () => "failed",
    },
  });
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
    const { pathname, search } = new URL(input);
    return answer(`${pathname}${search}`, init ?? {});
  });
}, 60_000);

afterAll(() => {
  vi.unstubAllGlobals();
});

async function answer(path: string, init: RequestInit) {
  const response = await app.fetch(path, init);
  const body = response.ok ? null : ((await response.clone().json()) as { issues?: unknown });
  answers.push({
    request: `${init.method} ${path}`,
    status: response.status,
    ...(body ? { issues: body.issues ?? body } : {}),
  });
  return response;
}

async function create(path: string, body: unknown): Promise<string> {
  const response = await app.fetch(path, { ...json(body), as: learner });
  expect(response.status).toBe(201);
  return ((await response.json()) as { id: string }).id;
}

async function newDeck(): Promise<string> {
  const response = await app.fetch("/api/decks", {
    ...json({ name: "Lesson 3", defaultLanguage: "et" }),
    as: learner,
  });
  return DeckOut.parse(await response.json()).id;
}

async function newCard(deckId: string): Promise<string> {
  const response = await app.fetch("/api/cards", {
    ...json({ deckId, term: newId(), meaning: "hello", directions: "both", enrich: false }),
    as: learner,
  });
  const outcome = AddCardOutcomeOut.parse(await response.json());
  if (outcome.status !== "added") throw new Error("The seeded card was not added");
  return outcome.card.id;
}

async function askWithPicture(cardId: string) {
  const [state] = await app.db
    .select()
    .from(schema.cardStates)
    .where(eq(schema.cardStates.cardId, cardId));
  if (!state) throw new Error("The seeded card has no state");
  const modes = ["image_to_term", "image_to_meaning"] as const;
  await app.db
    .insert(schema.cardStates)
    .values(modes.map((mode) => ({ ...state, id: newId(), direction: mode, mode })));
}

async function newReview(cardId: string): Promise<string> {
  const response = await app.fetch("/api/review/grade", {
    ...json({ cardId, mode: { cue: "term", target: "meaning" }, rating: 3, timezone: "UTC" }),
    as: learner,
  });
  const { reviewId } = GradeOut.parse(await response.json());
  if (!reviewId) throw new Error("The seeded grade has no attempt");
  return reviewId;
}

async function seeded(entry: Entry): Promise<Entry> {
  const raw = JSON.stringify(entry);
  const names = (value: string) => raw.includes(`"${value}"`);
  const deck = await newDeck();
  const ids: Record<string, string> = { $deck: deck, $newId: newId() };
  if (names("$card")) ids.$card = await newCard(deck);
  if (ids.$card && names("image")) await askWithPicture(ids.$card);
  if (ids.$card && names("$review")) ids.$review = await newReview(ids.$card);
  if (names("$otherDeck")) ids.$otherDeck = await newDeck();
  if (names("$section"))
    ids.$section = await create(`/api/decks/${deck}/sections`, { name: "Unit 1" });
  if (names("$series")) ids.$series = await create("/api/series", { name: newId() });
  return JSON.parse(raw, (_key, value) => {
    if (typeof value !== "string" || !value.startsWith("$")) return value;
    if (value.startsWith("$text:"))
      return newId().padEnd(Number(value.slice("$text:".length)), "a");
    const id = ids[value];
    if (!id) throw new Error(`Nothing to put in place of ${value}`);
    return id;
  }) as Entry;
}

function store({ grade, queued }: Entry) {
  storage.clear();
  resetGradeCache();
  resetWriteCache();
  if (grade) storage.set(OUTBOX_KEY, JSON.stringify([grade]));
  if (queued) {
    const key = newId();
    const entry = { key, at: Date.now(), label: "tere", ...queued };
    storage.set(`${WRITE_PREFIX}${key}`, JSON.stringify(entry));
  }
}

type Schema = {
  $ref?: string;
  type?: string | string[];
  nullable?: boolean;
  const?: unknown;
  enum?: unknown[];
  properties?: Record<string, Schema>;
  items?: Schema;
  anyOf?: Schema[];
  oneOf?: Schema[];
  allOf?: Schema[];
};

function accepted(node: Schema | undefined, at = ""): string[] {
  if (!node) return [];
  if (node.$ref) {
    const name = node.$ref.replace("#/components/schemas/", "");
    return accepted(document.components.schemas[name] as Schema, at);
  }
  const values = node.enum ?? (node.const === undefined ? [] : [node.const]);
  const isNull = node.nullable || [node.type].flat().includes("null");
  return [
    ...[...values, ...(isNull ? [null] : [])].map((value) => `${at}=${value}`),
    ...[...(node.anyOf ?? []), ...(node.oneOf ?? []), ...(node.allOf ?? [])].flatMap((part) =>
      accepted(part, at),
    ),
    ...accepted(node.items, at),
    ...Object.entries(node.properties ?? {}).flatMap(([field, child]) => [
      `${at}.${field}`,
      ...accepted(child, `${at}.${field}`),
    ]),
  ];
}

function holds(value: unknown, at = ""): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => holds(item, at));
  if (!value || typeof value !== "object") return [`${at}=${value}`];
  return Object.entries(value).flatMap(([field, child]) => [
    `${at}.${field}`,
    ...holds(child, `${at}.${field}`),
  ]);
}

function requestSchema(operation: string): Schema | undefined {
  const [method = "", path = ""] = operation.split(" ");
  const found = document.paths[path]?.[method.toLowerCase()] as
    | { requestBody?: { content?: Record<string, { schema?: Schema }> } }
    | undefined;
  return found?.requestBody?.content?.["application/json"]?.schema;
}

describe.each(entries)("$name ($entry.since)", ({ entry }) => {
  it("lands when the build that queued it sends it", async () => {
    const { operation, id = "", query = "", body } = sentBy(await seeded(entry));
    const [method = "", template = ""] = operation.split(" ");
    answers = [];
    await answer(`${template.replace("{id}", id)}${query}`, {
      method,
      headers: { "content-type": "application/json", cookie: learner.cookie },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const read = new Set(accepted(requestSchema(operation)));
    expect({
      body,
      refused: answers.filter(({ status }) => status >= 300),
      ignored: holds(body ?? {}).filter((at) => !at.includes("=") && !read.has(at)),
    }).toEqual({ body, refused: [], ignored: [] });
  });

  it("lands when the current build finds it in storage", async () => {
    const waiting = await seeded(entry);
    store(waiting);
    claimWrites(learner.userId);
    answers = [];
    await flushWrites();
    const refused = answers.filter(({ status }) => status >= 300);
    const unsent = outboxSize() + pendingWrites();
    expect({ waiting, requests: answers.length, refused, unsent }).toEqual({
      waiting,
      requests: 1,
      refused: [],
      unsent: 0,
    });
  });
});

it("holds a body for every field and value a queued request may carry", () => {
  const missing = Object.entries({
    ...operations,
    grade: GRADE,
    undo: UNDO,
  }).flatMap(([kind, operation]) => {
    const bodies = entries
      .map(({ entry }) => sentBy(entry))
      .filter((s) => s.operation === operation);
    const held = new Set(bodies.flatMap(({ body }) => holds(body ?? {})));
    const wanted = new Set(accepted(requestSchema(operation)));
    return [
      ...(bodies.length ? [] : [kind]),
      ...[...wanted].filter((at) => !held.has(at)).map((at) => `${kind} ${at}`),
    ];
  });
  expect(missing.filter((at) => !neverQueued.some(([, exempt]) => exempt.test(at)))).toEqual([]);
  expect(neverQueued.filter(([, exempt]) => !missing.some((at) => exempt.test(at)))).toEqual([]);
});
