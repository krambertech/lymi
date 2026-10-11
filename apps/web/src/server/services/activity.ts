import type { ActivityEntryOut, ActivityKind } from "@lymi/core";
import { and, desc, eq, inArray, lt, ne, notInArray, or, type SQL } from "@lymi/core/db";
import type { AuditEntry } from "@lymi/core/schema";
import { type Db, schema } from "../db";
import type { AuditAction, AuditEntity } from "./audit";
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

type Sentences = { [E in AuditEntity]: Record<AuditAction<E>, ActivityKind | null> };

/**
 * What Activity says about each kind of write, one entry per event the audit module can record,
 * so a new event fails to compile until this screen has decided on it. Null is deliberate: the
 * write is recorded and not shown. Caching a card's audio is the AI's work but not a change to
 * the card, and naming it an edit on the one screen that says nothing lands unseen would lie.
 */
const SENTENCES: Sentences = {
  card: {
    create: "cards_added",
    update: "cards_edited",
    enrich: "cards_enriched",
    archive: "cards_archived",
    restore: "cards_restored",
    generate_audio: null,
    set_image: null,
    update_image: null,
    archive_image: null,
    restore_image: null,
  },
  deck: {
    create: "deck_added",
    update: "deck_edited",
    archive: "deck_archived",
    restore: "deck_restored",
    join: "member_joined",
    leave: "member_left",
    remove_member: "member_removed",
    invite: "invitation_sent",
    cancel_invite: "invitation_cancelled",
    turn_on_join_link: "link_on",
    turn_off_join_link: "link_off",
    import_edition: null,
    approve_edition: null,
    publish_edition: null,
    update_edition: null,
    withdraw_edition: null,
    publish: null,
    update_publication: null,
    withdraw_publication: null,
  },
  series: {
    create: "series_added",
    update: "series_edited",
    // The row is archived so the audit trail keeps its name; the learner deleted it.
    archive: "series_deleted",
    // Nothing restores a series any more; rows from when something did still read.
    restore: "series_restored",
    reorder: null,
  },
  section: {
    create: "section_added",
    update: "section_edited",
    archive: "section_archived",
    restore: "section_restored",
    reorder: null,
    move: null,
    start: null,
  },
  import: {
    create: "import",
    complete: "import",
    cancel: "import",
    archive: "import",
    restore: "import",
  },
  export: { create: "export", complete: "export" },
  review: { grade: null, undo_grade: null },
  account: {
    "avatar.upload": null,
    "avatar.remove": null,
    "avatar.google_refresh": null,
    send_transactional_email: null,
    send_feedback: null,
    retire_unproved_password: null,
  },
};

/** Sharing events. They are the learner's own writes, and they belong on this screen. */
const PEOPLE_KINDS = new Set<ActivityKind>([
  "member_joined",
  "member_left",
  "member_removed",
  "invitation_sent",
  "invitation_cancelled",
  "link_on",
  "link_off",
]);

const entries = (entity: AuditEntity) =>
  Object.entries(SENTENCES[entity]) as [string, ActivityKind | null][];

/** The entities Activity has a sentence for. */
const ENTITIES = (Object.keys(SENTENCES) as AuditEntity[]).filter((entity) =>
  entries(entity).some(([, kind]) => kind),
);

/** Writes with no sentence on any entity, cut in SQL so no page is only rows the reader drops. */
const UNSAID_ACTIONS = (() => {
  const said = new Set<string>();
  const unsaid = new Set<string>();
  for (const entity of ENTITIES) {
    for (const [action, kind] of entries(entity)) (kind ? said : unsaid).add(action);
  }
  return [...unsaid].filter((action) => !said.has(action));
})();

const PEOPLE_ACTIONS = entries("deck").flatMap(([action, kind]) =>
  kind && PEOPLE_KINDS.has(kind) ? [action] : [],
);

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
  const zone = await reviewZone(ctx);
  const day = dateFormatter(zone);
  let cursor = input.cursor;
  // A page can hold only writes this reader has no sentence for. Read on rather than hand back
  // an empty list with a live cursor, which the screen would show as nothing having come in.
  const today = day.format(new Date());
  for (let page = 0; page < 5; page++) {
    const read = await readPage(ctx, { cursor, limit, day });
    if (read.entries.length > 0 || !read.nextCursor) return { ...read, today, zone };
    cursor = read.nextCursor;
  }
  return { ...(await readPage(ctx, { cursor, limit, day })), today, zone };
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
    // Spelled out so `audit_activity_idx` applies: SQLite matches a partial index term for
    // term, and does not read this one out of the `IN` list below. migrations/0020.
    ne(schema.auditLog.entity, "review"),
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

/** What the row's sentence is about. A write this reader has no sentence for is left out. */
function kindOf(row: Row): ActivityKind | null {
  // Before enrichment had its own action, the AI's fill-in was an update by the AI.
  if (row.entity === "card" && row.action === "update" && row.actor === "ai") {
    return "cards_enriched";
  }
  const table: Record<string, ActivityKind | null> | undefined =
    SENTENCES[row.entity as AuditEntity];
  return table?.[row.action] ?? null;
}

/**
 * One row per day, caller, kind and place. A card's audit row does not carry its deck, so card
 * groups key on the kind alone here and the deck is added to the key once it is known.
 */
function groupKey(row: Row, kind: ActivityKind, day: string): string {
  const caller = `${row.actor}:${row.actorClient ?? ""}`;
  let one = row.entityId;
  if (kind.startsWith("cards_")) one = "";
  // Per address, or a class invited in one sitting would be one row naming only the last of them.
  if (kind.startsWith("invitation_")) one = `${row.entityId}|${invitedAddress(row) ?? ""}`;
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
    // Member names and invited addresses are the owner's to see, and only their decks raise
    // people rows.
    let person: string | null = null;
    if (where.userId === userId) {
      const who = memberOf(newest);
      person = invitedAddress(newest) ?? (who ? (member.get(who)?.name ?? null) : null);
    }
    entries.push({ ...base, deck: naming(where), person });
  }
  return entries;
}

/** The deck a card write named. Rows from before the key existed carry it only on an add. */
function landedIn(row: Row): string | null {
  const payload = row.payload as { landedIn?: unknown; deckId?: unknown } | null;
  if (!payload) return null;
  if (typeof payload.landedIn === "string") return payload.landedIn;
  return row.action === "create" && typeof payload.deckId === "string" ? payload.deckId : null;
}

/** The member a people row is about, from the payload its service wrote. */
function memberOf(row: Row): string | null {
  const payload = row.payload as { memberId?: unknown } | null;
  return payload && typeof payload.memberId === "string" ? payload.memberId : null;
}

/** An invitation names an address rather than an account, because nobody has joined yet. */
function invitedAddress(row: Row): string | null {
  const payload = row.payload as { email?: unknown } | null;
  return payload && typeof payload.email === "string" ? payload.email : null;
}

/** Names for the OAuth clients and the API keys behind a page's writes, the learner's own only. */
async function appNames(
  db: Db,
  userId: string,
  ids: string[],
): Promise<Map<string, string | null>> {
  if (ids.length === 0) return new Map();
  const [clients, keys] = await Promise.all([
    selectIn(ids, (slice) => clientNames({ db }, slice).then((names) => [...names])),
    selectIn(ids, (slice) =>
      db
        .select({ id: schema.apikey.id, name: schema.apikey.name })
        .from(schema.apikey)
        // A key's name is its owner's alone, whatever id an old row carries.
        .where(and(inArray(schema.apikey.id, slice), eq(schema.apikey.referenceId, userId))),
    ),
  ]);
  const names = new Map<string, string | null>(clients);
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
