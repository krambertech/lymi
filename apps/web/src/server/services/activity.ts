import type { ActivityEntryOut, ActivityKind } from "@lymi/core";
import { and, desc, eq, inArray, lt, ne, notInArray, or, type SQL } from "@lymi/core/db";
import type { AuditEntry } from "@lymi/core/schema";
import { type Db, schema } from "../db";
import { selectIn } from "./batch";
import { clientNames } from "./connected-apps";
import type { ServiceContext } from "./context";
import { dateFormatter, type LocalDateFormatter } from "./days";
import { presentExport } from "./exports";
import { presentImport } from "./imports";
import { reviewZone } from "./review-days";

/**
 * Activity reads the audit log: the writes that came from outside the app, and the people events
 * of a shared deck. The learner's own edits stay in a card's history. docs/design/activity.md.
 */

/** Sharing events. They are the learner's own writes, and they belong on this screen. */
const PEOPLE_ACTIONS = [
  "join",
  "leave",
  "remove_member",
  "turn_on_join_link",
  "turn_off_join_link",
];

/** The entities Activity has a sentence for. */
const ENTITIES = ["card", "deck", "series", "section", "import", "export"];

/**
 * Writes with no sentence of their own. Caching a card's audio is the AI's work but not a change
 * to the card, and naming it an edit on the one screen that says nothing lands unseen would lie.
 * They are cut in SQL, so a page is never full of rows the reader then drops.
 */
const UNSAID_ACTIONS = [
  "generate_audio",
  "set_image",
  "update_image",
  "archive_image",
  "restore_image",
  "reorder",
  "move",
  "start",
  "publish",
  "update_publication",
  "withdraw_publication",
];

/** A file the learner moved is their own act, and it belongs on this screen whoever moved it. */
const FILES = ["import", "export"];

/** How many audit rows one page reads. Grouping makes the rows it returns fewer. */
export const ACTIVITY_PAGE_ROWS = 60;

/** The most cards one row's expansion holds; the rest stay behind its deck. */
const CARDS_PER_ENTRY = 12;

type Row = Pick<
  AuditEntry,
  | "id"
  | "actor"
  | "actorClient"
  | "actorClientName"
  | "action"
  | "entity"
  | "entityId"
  | "payload"
  | "createdAt"
>;

type Group = { key: string; kind: ActivityKind; day: string; rows: Row[] };

/** One row of the list, with the dates still dates; `ActivityEntryOut` is it on the wire. */
type Entry = Omit<ActivityEntryOut, "at" | "import" | "export"> & {
  at: Date;
  import: ReturnType<typeof presentImport> | null;
  export: ReturnType<typeof presentExport> | null;
};

export async function listActivity(
  ctx: ServiceContext,
  input: { cursor?: string | undefined; limit?: number | undefined } = {},
) {
  const limit = Math.min(Math.max(input.limit ?? ACTIVITY_PAGE_ROWS, 1), 200);
  // Days are the learner's own, so a write just after midnight in Kyiv is not yesterday.
  const day = dateFormatter(await reviewZone(ctx));
  let cursor = input.cursor;
  // A page can hold only writes this reader has no sentence for. Read on rather than hand back
  // an empty list with a live cursor, which the screen would show as nothing having come in.
  const today = day.format(new Date());
  for (let page = 0; page < 5; page++) {
    const read = await readPage(ctx, { cursor, limit, day });
    if (read.entries.length > 0 || !read.nextCursor) return { ...read, today };
    cursor = read.nextCursor;
  }
  return { ...(await readPage(ctx, { cursor, limit, day })), today };
}

async function readPage(
  ctx: ServiceContext,
  input: { cursor: string | undefined; limit: number; day: LocalDateFormatter },
) {
  const { db, userId } = ctx;
  const { limit, day } = input;
  const before = parseCursor(input.cursor);
  const rows = await db
    .select({
      id: schema.auditLog.id,
      actor: schema.auditLog.actor,
      actorClient: schema.auditLog.actorClient,
      actorClientName: schema.auditLog.actorClientName,
      action: schema.auditLog.action,
      entity: schema.auditLog.entity,
      entityId: schema.auditLog.entityId,
      payload: schema.auditLog.payload,
      createdAt: schema.auditLog.createdAt,
    })
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.userId, userId), fromOutside(), olderThan(before)))
    .orderBy(desc(schema.auditLog.createdAt), desc(schema.auditLog.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const nextCursor = rows.length > limit && last ? cursorOf(last) : null;

  const groups: Group[] = [];
  const open = new Map<string, Group>();
  for (const row of page) {
    const kind = kindOf(row);
    if (!kind) continue;
    const on = day.format(row.createdAt);
    const key = groupKey(row, kind, on);
    const held = open.get(key);
    if (held) held.rows.push(row);
    else {
      const group = { key, kind, day: on, rows: [row] };
      open.set(key, group);
      groups.push(group);
    }
  }
  return { entries: await present(ctx, groups), nextCursor };
}

/** Everything the learner did not write in the app themselves, plus who is in a shared deck. */
function fromOutside(): SQL | undefined {
  return and(
    inArray(schema.auditLog.entity, ENTITIES),
    notInArray(schema.auditLog.action, UNSAID_ACTIONS),
    or(
      inArray(schema.auditLog.entity, FILES),
      ne(schema.auditLog.actor, "user"),
      inArray(schema.auditLog.action, PEOPLE_ACTIONS),
    ),
  );
}

/** Keyset paging. Ids are time-sortable, so an id breaks a tie and no page repeats a row. */
function olderThan(before: { at: Date; id: string } | null): SQL | undefined {
  if (!before) return undefined;
  return or(
    lt(schema.auditLog.createdAt, before.at),
    and(eq(schema.auditLog.createdAt, before.at), lt(schema.auditLog.id, before.id)),
  );
}

function cursorOf(row: Row): string {
  return `${row.createdAt.getTime()}.${row.id}`;
}

function parseCursor(cursor: string | undefined): { at: Date; id: string } | null {
  if (!cursor) return null;
  const dot = cursor.indexOf(".");
  if (dot < 1) return null;
  const ms = Number(cursor.slice(0, dot));
  const id = cursor.slice(dot + 1);
  return id && Number.isFinite(ms) ? { at: new Date(ms), id } : null;
}

const CARD_KINDS: Record<string, ActivityKind> = {
  create: "cards_added",
  update: "cards_edited",
  archive: "cards_archived",
  restore: "cards_restored",
};

const THING_VERBS: Record<string, "added" | "edited" | "archived" | "restored"> = {
  create: "added",
  update: "edited",
  archive: "archived",
  restore: "restored",
};

const PEOPLE_KINDS: Record<string, ActivityKind> = {
  join: "member_joined",
  leave: "member_left",
  remove_member: "member_removed",
  turn_on_join_link: "link_on",
  turn_off_join_link: "link_off",
};

/** What the row's sentence is about. A write with no sentence for it is left out. */
function kindOf(row: Row): ActivityKind | null {
  if (row.entity === "import") return "import";
  if (row.entity === "export") return "export";
  const people = PEOPLE_KINDS[row.action];
  if (people) return row.entity === "deck" ? people : null;
  if (row.entity === "card") {
    if (row.action === "update" && row.actor === "ai") return "cards_enriched";
    // No fallback: a write this reader has no sentence for is left out rather than called an edit.
    return CARD_KINDS[row.action] ?? null;
  }
  const verb = THING_VERBS[row.action];
  if (!verb) return null;
  if (row.entity === "deck") return `deck_${verb}`;
  if (row.entity === "series") return `series_${verb}`;
  if (row.entity === "section") return `section_${verb}`;
  return null;
}

/**
 * One row per day, caller, kind and place. A card's audit row does not carry its deck, so card
 * groups key on the kind alone here and the deck is added to the key once it is known.
 */
function groupKey(row: Row, kind: ActivityKind, day: string): string {
  const caller = `${row.actor}:${row.actorClient ?? ""}`;
  const one = kind.startsWith("cards_") ? "" : row.entityId;
  return `${day}|${caller}|${kind}|${one}`;
}

async function present(ctx: ServiceContext, groups: Group[]): Promise<Entry[]> {
  const { db, userId } = ctx;
  const idsOf = (entity: string) => [
    ...new Set(
      groups.flatMap((g) => (g.rows[0]?.entity === entity ? g.rows.map((r) => r.entityId) : [])),
    ),
  ];
  const cardIds = idsOf("card");
  const deckIds = idsOf("deck");
  const sectionIds = idsOf("section");
  const seriesIds = idsOf("series");
  const importIds = idsOf("import");
  const exportIds = idsOf("export");
  const memberIds = [...new Set(groups.flatMap((g) => g.rows.flatMap((r) => memberOf(r) ?? [])))];
  const appIds = [
    ...new Set(groups.flatMap((g) => (g.rows[0]?.actorClient ? [g.rows[0].actorClient] : []))),
  ];

  // D1 caps a query at 100 bound parameters, so every lookup reads its ids in slices. batch.ts.
  const [cards, sections, seriesRows, imports, exported, members, apps] = await Promise.all([
    selectIn(cardIds, (ids) =>
      db
        .select({
          id: schema.cards.id,
          term: schema.cards.term,
          meaning: schema.cards.meaning,
          archivedAt: schema.cards.archivedAt,
          deckId: schema.cards.deckId,
        })
        .from(schema.cards)
        .where(inArray(schema.cards.id, ids)),
    ),
    selectIn(sectionIds, (ids) =>
      db
        .select({
          id: schema.sections.id,
          name: schema.sections.name,
          deckId: schema.sections.deckId,
        })
        .from(schema.sections)
        .where(inArray(schema.sections.id, ids)),
    ),
    selectIn(seriesIds, (ids) =>
      db
        .select({ id: schema.series.id, name: schema.series.name })
        .from(schema.series)
        .where(inArray(schema.series.id, ids)),
    ),
    selectIn(importIds, (ids) =>
      db.select().from(schema.imports).where(inArray(schema.imports.id, ids)),
    ),
    selectIn(exportIds, (ids) =>
      db.select().from(schema.exportFiles).where(inArray(schema.exportFiles.id, ids)),
    ),
    selectIn(memberIds, (ids) =>
      db
        .select({ id: schema.user.id, name: schema.user.name })
        .from(schema.user)
        .where(inArray(schema.user.id, ids)),
    ),
    appNames(db, userId, appIds),
  ]);

  // A card's deck and a section's deck are named too, so every row can say where the write landed.
  const everyDeck = [
    ...new Set([
      ...deckIds,
      ...cards.map((c) => c.deckId),
      ...sections.map((s) => s.deckId),
      ...groups.flatMap((g) => g.rows.flatMap((r) => landedIn(r) ?? [])),
    ]),
  ];
  const decks = await selectIn(everyDeck, (ids) =>
    db
      .select({
        id: schema.decks.id,
        name: schema.decks.name,
        userId: schema.decks.userId,
        archivedAt: schema.decks.archivedAt,
      })
      .from(schema.decks)
      .where(inArray(schema.decks.id, ids)),
  );

  const card = index(cards);
  const deck = index(decks);
  const section = index(sections);
  const series = index(seriesRows);
  const imported = index(imports);
  const taken = index(exported);
  const member = index(members);

  const entries: Entry[] = [];
  for (const group of groups) {
    const newest = group.rows[0];
    if (!newest) continue;
    const base = {
      id: newest.id,
      group: group.key,
      kind: group.kind,
      actor: newest.actor,
      // The name the row kept is the truth about that write; the live one only fills a gap.
      app:
        newest.actorClientName ??
        (newest.actorClient ? (apps.get(newest.actorClient) ?? null) : null),
      at: newest.createdAt,
      day: group.day,
      count: group.rows.length,
      deck: null,
      person: null,
      cards: [] as Entry["cards"],
      import: null,
      export: null,
    };

    if (group.kind === "import") {
      const row = imported.get(newest.entityId);
      // An import whose row is gone leaves nothing to say.
      if (!row) continue;
      entries.push({ ...base, count: 1, import: presentImport(row) });
      continue;
    }

    if (group.kind === "export") {
      const row = taken.get(newest.entityId);
      if (!row) continue;
      entries.push({ ...base, count: 1, export: presentExport(row) });
      continue;
    }

    if (group.kind.startsWith("cards_")) {
      // One call can write to two decks, and a row names one deck, so each deck is its own row.
      type Written = (typeof cards)[number];
      const byDeck = new Map<string, { at: Date; id: string; cards: Written[] }>();
      for (const row of group.rows) {
        const written = card.get(row.entityId);
        if (!written) continue;
        // The deck the call named, so a card moved since is not reported against its new deck.
        const landed = landedIn(row) ?? written.deckId;
        const open = byDeck.get(landed);
        if (open) open.cards.push(written);
        else byDeck.set(landed, { at: row.createdAt, id: row.id, cards: [written] });
      }
      for (const [deckId, written] of byDeck) {
        const where = deck.get(deckId);
        // A row that cannot name where the write landed says nothing worth reading.
        if (!where) continue;
        entries.push({
          ...base,
          id: written.id,
          at: written.at,
          group: `${group.key}|${deckId}`,
          count: written.cards.length,
          deck: naming(where),
          cards: written.cards.slice(0, CARDS_PER_ENTRY).map((c) => {
            const home = deck.get(c.deckId);
            return {
              id: c.id,
              term: c.term,
              meaning: c.meaning,
              archived: c.archivedAt !== null,
              // A card opens in the deck it is in now, which a move may have changed.
              deckId: c.deckId,
              deckArchived: home ? home.archivedAt !== null : true,
            };
          }),
        });
      }
      continue;
    }

    if (group.kind.startsWith("section_")) {
      const found = section.get(newest.entityId);
      if (!found) continue;
      const where = deck.get(found.deckId);
      if (!where) continue;
      entries.push({ ...base, deck: naming(where), person: found.name });
      continue;
    }

    if (group.kind.startsWith("series_")) {
      const found = series.get(newest.entityId);
      if (!found) continue;
      entries.push({ ...base, person: found.name });
      continue;
    }

    const where = deck.get(newest.entityId);
    if (!where) continue;
    const who = memberOf(newest);
    entries.push({
      ...base,
      deck: naming(where),
      // Member names are the owner's to see, and only the owner's decks raise people rows.
      person: who && where.userId === userId ? (member.get(who)?.name ?? null) : null,
    });
  }
  return entries;
}

/** The deck a card write named, from the payload the service kept. */
function landedIn(row: Row): string | null {
  const payload = row.payload as { deckId?: unknown } | null;
  return payload && typeof payload.deckId === "string" ? payload.deckId : null;
}

/** The member a people row is about, from the payload its service wrote. */
function memberOf(row: Row): string | null {
  const payload = row.payload as { memberId?: unknown } | null;
  return payload && typeof payload.memberId === "string" ? payload.memberId : null;
}

/** Names for the OAuth clients and the API keys behind a page's writes, the learner's own only. */
async function appNames(
  db: Db,
  userId: string,
  ids: string[],
): Promise<Map<string, string | null>> {
  if (ids.length === 0) return new Map();
  const [clients, keys] = await Promise.all([
    clientNames({ db }, ids),
    selectIn(ids, (slice) =>
      db
        .select({ id: schema.apikey.id, name: schema.apikey.name })
        .from(schema.apikey)
        // A key's name is its owner's alone, whatever id an old row carries.
        .where(and(inArray(schema.apikey.id, slice), eq(schema.apikey.referenceId, userId))),
    ),
  ]);
  const names = new Map(clients);
  for (const key of keys) names.set(key.id, key.name);
  return names;
}

/** A deck as a row names it. An archived deck has no screen to open, so the row says so. */
function naming(row: { id: string; name: string; archivedAt: Date | null }) {
  return { id: row.id, name: row.name, archived: row.archivedAt !== null };
}

function index<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]));
}
