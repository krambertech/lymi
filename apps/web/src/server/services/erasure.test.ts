import { generateKeyPairSync } from "node:crypto";
import { newId } from "@lymi/core";
import { eq, getTableColumns, getTableName, is, Table } from "@lymi/core/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appleClientsOf, openAppleToken } from "../apple-revoke";
import { schema } from "../db";
import {
  ankiConnectUploadKey,
  cardAudioKey,
  exportRecordsKey,
  exportSegmentKey,
  importNotesKey,
  newAvatarKey,
  newCardPictureKey,
  newExportFileKey,
  newImportFileKey,
  type ObjectKey,
  STORED,
} from "../storage";
import { json, type Session, type TestApp, testApp } from "../test-app";
import { dropUnstudiedFormerDecks } from "./account-deletion";
import { sweepAnkiConnectUploads } from "./anki-connect";
import { retryAppleRevocations } from "./apple-revocations";
import { pronunciationAudio, purgeCardAudio } from "./audio";
import { purgeExpiredAuthRows } from "./auth-retention";
import { runBatch, type Statement } from "./batch";
import { copyFormerDecks } from "./deck-copies";
import { clearLocalEmailOutbox, latestLocalEmail } from "./email";
import { type CronJob, ERASURE } from "./erasure";
import { exampleAudio } from "./example-audio";

type TableName = keyof typeof ERASURE;
type Row = Record<string, unknown>;
type Reference = { column: string; parent: TableName; parentColumn: string };
type World = {
  person: Session;
  name: string;
  marker: string;
  rows: Partial<Record<TableName, Row>>;
};

const DAY = 24 * 60 * 60 * 1000;
const APPLE = {
  APPLE_APP_BUNDLE_IDENTIFIER: "app.lymi.test",
  APPLE_CLIENT_ID: "app.lymi.test.web",
  APPLE_TEAM_ID: "TEAM",
  APPLE_KEY_ID: "KEY",
  APPLE_PRIVATE_KEY: generateKeyPairSync("ec", { namedCurve: "prime256v1" })
    .privateKey.export({ format: "pem", type: "pkcs8" })
    .toString(),
};
const tables = Object.entries(schema).filter(([, value]) => is(value, Table)) as unknown as [
  TableName,
  Table,
][];
const tableOf = Object.fromEntries(tables) as Record<TableName, Table>;
const named = new Map(tables.map(([name, table]) => [getTableName(table), name]));
const propertyOf = (name: TableName, column: string) => {
  const [property] =
    Object.entries(getTableColumns(tableOf[name])).find(([, { name: own }]) => own === column) ??
    [];
  if (!property) throw new Error(`${name} has no property for ${column}`);
  return property;
};

let app: TestApp;
let references: Record<string, Reference[]>;
let leaver: World;
let stayer: World;
let objects: { [N in keyof typeof STORED]: ObjectKey<N>[] };
let made = 0;

async function readReferences() {
  const read = await Promise.all(
    tables.map(async ([name, table]) => {
      const { results } = await app.env.DB.prepare(
        `pragma foreign_key_list("${getTableName(table)}")`,
      ).all<{ table: string; from: string; to: string }>();
      return [
        name,
        results.map((row) => {
          const parent = named.get(row.table) as TableName;
          return {
            column: propertyOf(name, row.from),
            parent,
            parentColumn: propertyOf(parent, row.to),
          };
        }),
      ] as const;
    }),
  );
  return Object.fromEntries(read);
}

const referencesOf = (name: TableName) => references[name] ?? [];

function parentsFirst(): TableName[] {
  const order: TableName[] = [];
  const visit = (name: TableName) => {
    if (order.includes(name)) return;
    for (const { parent } of referencesOf(name)) visit(parent);
    order.push(name);
  };
  for (const [name] of tables) visit(name);
  return order;
}

function rowFor(name: TableName, world: World, given: Row): Row {
  const row: Row = {};
  const label = `${world.marker}-${name}-${++made}`;
  for (const [property, column] of Object.entries(getTableColumns(tableOf[name]))) {
    const reference = referencesOf(name).find((each) => each.column === property);
    const { dataType, enumValues, notNull, hasDefault } = column;
    if (reference) {
      row[property] =
        reference.parent === "user"
          ? world.person.userId
          : (world.rows[reference.parent] ?? stayer.rows[reference.parent])?.[
              reference.parentColumn
            ];
    } else if (property === "email") row[property] = world.person.email;
    else if (property === "userId" || property === "referenceId") {
      row[property] = world.person.userId;
    } else if (enumValues?.length) row[property] = enumValues[0];
    else if (dataType === "json") row[property] = [label];
    else if (dataType === "string") row[property] = `${label}-${property}`;
    else if (notNull && !hasDefault) {
      row[property] = dataType === "date" ? new Date() : dataType === "boolean" ? false : 1;
    }
  }
  return { ...row, ...given };
}

const insertion = (name: TableName, row: Row): Statement =>
  app.db
    .insert(tableOf[name] as typeof schema.decks)
    .values(row as typeof schema.decks.$inferInsert);

const primaryKey = (name: TableName) =>
  Object.entries(getTableColumns(tableOf[name])).flatMap(([property, { primary }]) =>
    primary ? [property] : [],
  );

const isSeeded = (name: TableName) =>
  name !== "accountDeletions" &&
  name !== "appleRevocations" &&
  !["account", "single batch"].includes(ERASURE[name].by);

async function seedLeaver(): Promise<Statement[]> {
  const cardId = newId();
  const [recorded, sentence] = [
    cardAudioKey(cardId, "recorded/term.mp3"),
    cardAudioKey(cardId, "example-recorded/sentence.mp3"),
  ];
  const picture = newCardPictureKey();
  const [uploaded, google] = [newAvatarKey(), newAvatarKey()];
  const importFile = newImportFileKey();
  const exportFile = newExportFileKey();
  objects = {
    cardAudio: [recorded, sentence, cardAudioKey(cardId, "v1/superseded.mp3")],
    cardPictures: [picture],
    avatars: [uploaded, google],
    importFiles: [importFile, importNotesKey(importFile, 0)],
    ankiConnectUploads: [ankiConnectUploadKey(leaver.person.userId, "clip")],
    exportFiles: [exportSegmentKey(exportFile, 0), exportRecordsKey(exportFile, 0)],
  };
  await Promise.all(
    (Object.keys(STORED) as (keyof typeof STORED)[]).flatMap((name) =>
      objects[name].map((key) => app.env[STORED[name].bucket].put(key, "private")),
    ),
  );
  const given: Partial<Record<TableName, Row>> = {
    account: { providerId: "apple" },
    verification: { identifier: `email-verification-otp-${leaver.person.email}` },
    cards: { id: cardId, audioKey: recorded, exampleRecordingKey: sentence },
    cardImages: { objectKey: picture },
    userAvatars: { customKey: uploaded, googleKey: google },
    imports: { objectKey: importFile, uploadId: null },
    exportFiles: { objectKey: exportFile },
    deckInvitations: { kind: "named" },
  };
  const statements: Statement[] = [];
  for (const name of parentsFirst().filter(
    (each) => isSeeded(each) && ERASURE[each].by !== "no learner data",
  )) {
    const mine = referencesOf(name).find(
      ({ column, parent }) => parent === "user" && primaryKey(name).includes(column),
    );
    if (mine && primaryKey(name).length === 1) {
      const table = tableOf[name] as typeof schema.userSettings;
      statements.push(app.db.delete(table).where(eq(table.userId, leaver.person.userId)));
    }
    const row = rowFor(name, leaver, given[name] ?? {});
    leaver.rows[name] = row;
    statements.push(insertion(name, row));
  }
  return statements;
}

function seedStayer(): Statement[] {
  const spoken: Partial<Record<TableName, Row>> = {
    cards: {
      language: "fi",
      term: "talo",
      example: "Talo on suuri.",
      audioKey: null,
      exampleRecordingKey: null,
    },
  };
  const parents = new Set(tables.flatMap(([name]) => referencesOf(name).map((r) => r.parent)));
  return parentsFirst()
    .filter((name) => isSeeded(name) && parents.has(name))
    .map((name) => {
      const row = rowFor(name, stayer, spoken[name] ?? {});
      stayer.rows[name] = row;
      return insertion(name, row);
    });
}

function seedLeaverInStayersWorld(): Statement[] {
  const statements: Statement[] = [];
  for (const name of parentsFirst().filter(isSeeded)) {
    const people = referencesOf(name).filter(({ parent }) => parent === "user");
    if (referencesOf(name).length === people.length && people.length < 2) continue;
    for (const { column } of people) {
      if (primaryKey(name).join() === column) continue;
      statements.push(insertion(name, rowFor(name, stayer, { [column]: leaver.person.userId })));
    }
    if ("email" in getTableColumns(tableOf[name])) {
      statements.push(
        insertion(name, rowFor(name, stayer, { email: leaver.person.email, kind: "named" })),
      );
    }
  }
  return statements;
}

async function deleteLeaver() {
  clearLocalEmailOutbox();
  const sent = await app.fetch("/api/me/deletion/code", { method: "POST", as: leaver.person });
  expect(sent.status).toBe(200);
  const code = latestLocalEmail(leaver.person.email)?.text.match(/\b\d{6}\b/)?.[0];
  const gone = await app.fetch("/api/me", {
    ...json({ code }, { method: "DELETE" }),
    as: leaver.person,
  });
  expect(gone.status).toBe(200);
}

const cron: Record<CronJob, () => Promise<unknown>> = {
  "purge-card-audio": () => purgeCardAudio(app.db, app.env.AUDIO),
  "anki-connect-uploads": () =>
    sweepAnkiConnectUploads(app.env.IMPORTS, new Date(Date.now() + DAY)),
  "purge-expired-auth": () => purgeExpiredAuthRows(app.db, new Date(Date.now() + 2 * DAY)),
  "apple-revocations": () =>
    retryAppleRevocations(
      app.db,
      { clients: appleClientsOf(app.env), fetcher: async () => new Response(null) },
      new Date(Date.now() + DAY),
    ),
};

async function runCron() {
  await copyFormerDecks(app.db, undefined);
  while ((await dropUnstudiedFormerDecks(app.db, app.env.PRIVATE_IMAGES)) > 0) {}
  for (const job of Object.values(cron)) await job();
}

async function opened(sealed: unknown) {
  const clients = appleClientsOf(app.env);
  return clients && openAppleToken(clients.app, String(sealed));
}

async function stored(): Promise<{ name: TableName; rows: Row[] }[]> {
  const read = await app.env.DB.batch<Row>(
    tables.map(([, table]) => app.env.DB.prepare(`select * from "${getTableName(table)}"`)),
  );
  return tables.map(([name], index) => ({ name, rows: read[index]?.results ?? [] }));
}

async function columnsHolding(texts: string[], skip: TableName[] = []): Promise<string[]> {
  const found = new Set<string>();
  for (const { name, rows } of await stored()) {
    if (skip.includes(name)) continue;
    for (const [column, value] of rows.flatMap((row) => Object.entries(row))) {
      const property = propertyOf(name, column);
      const readable =
        name === "appleRevocations" && property === "token" && value ? await opened(value) : value;
      if (texts.some((text) => String(readable).includes(text))) found.add(`${name}.${property}`);
    }
  }
  return [...found].sort();
}

const leaves = (Object.entries(ERASURE) as [TableName, (typeof ERASURE)[TableName]][]).flatMap(
  ([name, entry]) => ("leaves" in entry ? [{ name, ...entry.leaves }] : []),
);
const leftForGood = leaves
  .flatMap(({ name, columns }) => columns.map((column) => `${name}.${column}`))
  .sort();
const leftForNow = leaves
  .flatMap(({ name, ...entry }) =>
    "until" in entry ? entry.until.columns.map((column) => `${name}.${column}`) : [],
  )
  .concat(leftForGood)
  .sort();

async function objectsLeft(when: (erased: string) => boolean) {
  const left: string[] = [];
  for (const [name, { bucket, prefix, erased }] of Object.entries(STORED)) {
    if (!when(erased)) continue;
    const listed = await app.env[bucket].list({ prefix });
    const mine = new Set<string>(objects[name as keyof typeof STORED]);
    left.push(
      ...listed.objects
        .filter(({ key }) => mine.has(key))
        .map(({ key }) => `${name} in ${bucket}: ${key}`),
    );
  }
  return left;
}

async function stayerReportsTheLeaversDeck() {
  const reported = await app.fetch("/api/content-reports", {
    ...json({ target: { kind: "deck", deckId: leaver.rows.decks?.id }, reason: "spam" }),
    as: stayer.person,
  });
  expect(reported.status).toBe(200);
}

async function leaverPlaysTheStayersCardWithAnApiKey() {
  const ctx = {
    db: app.db,
    userId: leaver.person.userId,
    actor: "api" as const,
    client: `${leaver.marker}-key`,
    clientName: leaver.name,
  };
  const deps = {
    bucket: app.env.AUDIO,
    providers: () => [
      {
        provider: "openai" as const,
        model: "test",
        voice: "test",
        locale: "fi",
        contentType: "audio/mpeg" as const,
        extension: "mp3" as const,
        speech: async () => new Response(new Uint8Array([0xff, 0xfb, 0x90, 0x00])),
      },
    ],
  };
  const cardId = String(stayer.rows.cards?.id);
  await pronunciationAudio(ctx, cardId, deps);
  await exampleAudio(ctx, cardId, deps, { left: async () => null, spend: async () => {} });
  const { results } = await app.env.DB.prepare(
    "select entity_id from audit_log where action = 'generate_audio' and user_id = ?",
  )
    .bind(stayer.person.userId)
    .all();
  expect(results).toHaveLength(2);
}

async function signUp(handle: string, marker: string): Promise<World> {
  const person = await app.signUp(handle);
  const name = `Display ${marker.toUpperCase()}`;
  await app.env.DB.prepare("update user set name = ? where id = ?").bind(name, person.userId).run();
  return { person, name, marker, rows: {} };
}

const tracesOf = ({ person, name, marker }: World) => [person.userId, person.email, name, marker];

async function begin(env: Partial<typeof APPLE>) {
  app = await testApp({ env });
  references = await readReferences();
  leaver = await signUp("leaver", "leavers-own");
  stayer = await signUp("stayer", "stayers-own");
  await runBatch(app.db, [
    ...seedStayer(),
    ...(await seedLeaver()),
    ...seedLeaverInStayersWorld(),
    insertion("deckMembers", rowFor("deckMembers", stayer, { deckId: leaver.rows.decks?.id })),
  ]);
  await stayerReportsTheLeaversDeck();
  await leaverPlaysTheStayersCardWithAnApiKey();
}

const realFetch = globalThis.fetch;

beforeEach(() => {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) =>
    new URL(input instanceof Request ? input.url : input).hostname === "appleid.apple.com"
      ? new Response(null, { status: 503 })
      : realFetch(input, init),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the erasure registry", () => {
  beforeEach(async () => {
    app = await testApp();
    references = await readReferences();
  }, 60_000);

  it("covers every table the migrations make", async () => {
    const { results } = await app.env.DB.prepare(
      "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '_cf_%'",
    ).all<{ name: string }>();
    expect(results.map(({ name }) => name).sort()).toEqual([...named.keys()].sort());
  });

  it("calls no table free of learner data that points at a person", () => {
    const free = tables.filter(([name]) => ERASURE[name].by === "no learner data");
    const pointing = free.filter(
      ([name]) =>
        referencesOf(name).length > 0 ||
        ["userId", "ownerId", "email", "referenceId"].some(
          (property) => property in getTableColumns(tableOf[name]),
        ),
    );
    expect(pointing.map(([name]) => name)).toEqual([]);
  });
});

describe("deleting an account that holds a row in every table and an object under every prefix", () => {
  it("leaves only what the registry declares", async () => {
    await begin(APPLE);
    const left = await app.fetch(`/api/decks/${leaver.rows.decks?.id}/leave`, {
      method: "POST",
      as: stayer.person,
    });
    expect(left.status).toBe(200);
    const traces = tracesOf(leaver);
    const held = (await columnsHolding(traces)).map((column) => column.split(".")[0]);
    expect(tables.flatMap(([name]) => (held.includes(name) ? [] : [name])).sort()).toEqual([
      "accountDeletions",
      "appleRevocations",
      "deckCopyIds",
      "jwks",
      "oauthClientAssertion",
      "oauthResource",
    ]);

    await deleteLeaver();

    const awaitingCron = tables.flatMap(([name]) => (ERASURE[name].by in cron ? [name] : []));
    expect(await columnsHolding(traces, awaitingCron)).toEqual(leftForNow);
    expect(await objectsLeft((erased) => erased === "with the account")).toEqual([]);

    const ids = new Set(
      (await stored()).flatMap(({ name, rows }) => rows.map((row) => `${name} ${String(row.id)}`)),
    );
    const lost = Object.entries(stayer.rows).filter(([name, row]) => !ids.has(`${name} ${row.id}`));
    expect(lost).toEqual([]);

    await runCron();
    expect(await columnsHolding(traces)).toEqual(leftForGood);
    expect(await objectsLeft(() => true)).toEqual([]);
  }, 60_000);

  it("leaves the members of a studied deck its shared content and nothing else", async () => {
    await begin({});
    await deleteLeaver();
    await runCron();

    expect(await columnsHolding([leaver.person.userId, leaver.person.email])).toEqual([
      "accountDeletions.id",
      "appleRevocations.id",
      "auditLog.payload",
    ]);
    expect(await columnsHolding([leaver.name])).toEqual(["contentReports.snapshot"]);
    expect(await columnsHolding([leaver.marker])).toEqual([
      "auditLog.entityId",
      "cardImages.contentType",
      "cardImages.description",
      "cardImages.sourceHost",
      "cards.example",
      "cards.exampleTranslation",
      "cards.exampleTranslationOf",
      "cards.hint",
      "cards.imageVersion",
      "cards.language",
      "cards.meaning",
      "cards.normalizedTerm",
      "cards.notes",
      "cards.pronunciation",
      "cards.reviewModeKeys",
      "cards.source",
      "cards.term",
      "contentReports.id",
      "contentReports.localDate",
      "contentReports.note",
      "contentReports.snapshot",
      "decks.defaultLanguage",
      "decks.description",
      "decks.enrichFields",
      "decks.name",
      "sections.name",
    ]);
    expect(await objectsLeft(() => true)).toEqual([
      `cardPictures in PRIVATE_IMAGES: ${objects.cardPictures[0]}`,
    ]);
    const { results } = await app.env.DB.prepare("select * from deck_copy_ids").all();
    expect(results).toEqual([]);
  }, 60_000);
});
