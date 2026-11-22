import { newId } from "@lymi/core";
import { getTableColumns, getTableName, is, Table } from "@lymi/core/db";
import { beforeEach, describe, expect, it } from "vitest";
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
import { purgeCardAudio } from "./audio";
import { purgeExpiredAuthRows } from "./auth-retention";
import { copyFormerDecks } from "./deck-copies";
import { clearLocalEmailOutbox, latestLocalEmail } from "./email";
import { type CronJob, ERASURE } from "./erasure";

type TableName = keyof typeof ERASURE;
type Row = Record<string, unknown>;
type Reference = { column: string; parent: TableName; parentColumn: string };
type World = { person: Session; marker: string; rows: Partial<Record<TableName, Row>> };

const DAY = 24 * 60 * 60 * 1000;
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
let objects: Record<keyof typeof STORED, ObjectKey[]>;
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

async function insert(name: TableName, row: Row): Promise<Row> {
  const table = tableOf[name] as typeof schema.decks;
  const [inserted] = await app.db
    .insert(table)
    .values(row as typeof schema.decks.$inferInsert)
    .returning();
  if (!inserted) throw new Error(`${name} row not inserted`);
  return inserted;
}

const primaryKey = (name: TableName) =>
  Object.entries(getTableColumns(tableOf[name])).flatMap(([property, { primary }]) =>
    primary ? [property] : [],
  );

const isSeeded = (name: TableName) =>
  name !== "accountDeletions" &&
  name !== "appleRevocations" &&
  !["account", "single batch"].includes(ERASURE[name].by);

async function seedLeaver() {
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
  for (const name of Object.keys(STORED) as (keyof typeof STORED)[]) {
    for (const key of objects[name]) await app.env[STORED[name].bucket].put(key, "private");
  }
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
  for (const name of parentsFirst().filter(
    (each) => isSeeded(each) && ERASURE[each].by !== "no learner data",
  )) {
    const mine = referencesOf(name).find(
      ({ column, parent }) => parent === "user" && primaryKey(name).includes(column),
    );
    if (mine && primaryKey(name).length === 1) {
      await app.env.DB.prepare(`delete from "${getTableName(tableOf[name])}" where user_id = ?`)
        .bind(leaver.person.userId)
        .run();
    }
    leaver.rows[name] = await insert(name, rowFor(name, leaver, given[name] ?? {}));
  }
}

async function seedStayer() {
  const parents = new Set(tables.flatMap(([name]) => referencesOf(name).map((r) => r.parent)));
  for (const name of parentsFirst().filter((each) => isSeeded(each) && parents.has(each))) {
    stayer.rows[name] = await insert(name, rowFor(name, stayer, {}));
  }
}

async function seedLeaverInStayersWorld() {
  for (const name of parentsFirst().filter(isSeeded)) {
    const people = referencesOf(name).filter(({ parent }) => parent === "user");
    if (referencesOf(name).length === people.length && people.length < 2) continue;
    for (const { column } of people) {
      if (primaryKey(name).join() === column) continue;
      await insert(name, rowFor(name, stayer, { [column]: leaver.person.userId }));
    }
    if ("email" in getTableColumns(tableOf[name])) {
      await insert(name, rowFor(name, stayer, { email: leaver.person.email, kind: "named" }));
    }
  }
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
};

async function runCron() {
  await copyFormerDecks(app.db, undefined);
  while ((await dropUnstudiedFormerDecks(app.db, app.env.PRIVATE_IMAGES)) > 0) {}
  for (const job of Object.values(cron)) await job();
}

async function columnsHolding(texts: string[], skip: TableName[] = []): Promise<string[]> {
  const found = new Set<string>();
  for (const [name, table] of tables) {
    if (skip.includes(name)) continue;
    const { results } = await app.env.DB.prepare(
      `select * from "${getTableName(table)}"`,
    ).all<Row>();
    for (const row of results) {
      for (const [column, value] of Object.entries(row)) {
        if (texts.some((text) => String(value).includes(text))) {
          found.add(`${name}.${propertyOf(name, column)}`);
        }
      }
    }
  }
  return [...found].sort();
}

const declaredLeaves = Object.entries(ERASURE)
  .flatMap(([name, entry]) =>
    "leaves" in entry ? entry.leaves.columns.map((column) => `${name}.${column}`) : [],
  )
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

beforeEach(async () => {
  app = await testApp();
  references = await readReferences();
  leaver = { person: await app.signUp("leaver"), marker: "leavers-own", rows: {} };
  stayer = { person: await app.signUp("stayer"), marker: "stayers-own", rows: {} };
  await seedStayer();
  await seedLeaver();
  await seedLeaverInStayersWorld();
}, 60_000);

describe("the erasure registry", () => {
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
    const traces = [leaver.person.userId, leaver.person.email, leaver.marker];
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
    expect(await columnsHolding(traces, awaitingCron)).toEqual(declaredLeaves);
    expect(await objectsLeft((erased) => erased === "with the account")).toEqual([]);

    for (const [name, row] of Object.entries(stayer.rows) as [TableName, Row][]) {
      const kept = await columnsHolding([String(row[primaryKey(name)[0] ?? ""])]);
      expect(kept.some((column) => column.startsWith(`${name}.`))).toBe(true);
    }

    await runCron();
    expect(await columnsHolding(traces)).toEqual(declaredLeaves);
    expect(await objectsLeft(() => true)).toEqual([]);
  });

  it("leaves the members of a studied deck its shared content and nothing else", async () => {
    await insert("deckMembers", rowFor("deckMembers", stayer, { deckId: leaver.rows.decks?.id }));
    await deleteLeaver();
    await runCron();

    expect(await columnsHolding([leaver.person.userId, leaver.person.email])).toEqual([
      "accountDeletions.id",
      "appleRevocations.id",
      "auditLog.payload",
    ]);
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
  });
});
