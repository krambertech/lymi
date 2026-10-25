import { newId, termKey } from "@lymi/core";
import { type AnyColumn, and, asc, eq, getTableColumns, is, isNull, SQL, sql } from "@lymi/core/db";
import { type Db, schema } from "../db";
import { type AnalyticsWriter, track } from "./analytics";
import { runInBatches } from "./batch";
import { stateStatementsForLearner } from "./modes";

/** Members copied per call, so one run stays well inside a Worker's time and D1's batch limits. */
const MEMBERS_PER_RUN = 25;

type Value = SQL | string | number | null;

/**
 * An insert-select that copies `source` rows into `table`: every column comes from the source row
 * of the same name unless `set` gives it a value, so a column added later is copied too.
 */
function copyRows<
  T extends
    | typeof schema.decks
    | typeof schema.sections
    | typeof schema.cards
    | typeof schema.cardImages,
>(
  db: Db,
  table: T,
  source: string,
  set: Partial<Record<keyof T["_"]["columns"], Value>>,
  from: SQL,
) {
  const values = Object.entries(getTableColumns(table)).map(([key, column]) => {
    if (!(key in set)) return sql.raw(`${source}.${column.name}`);
    const value = set[key as keyof typeof set] as Value;
    return value === null ? sql`null` : is(value, SQL) ? value : sql`${value}`;
  });
  return db.insert(table).select(sql`select ${sql.join(values, sql`, `)} ${from}`);
}

/**
 * One member's private copy of a deck its owner left behind: the deck, its sections and cards in
 * the edition they pinned, and the cards' pictures, with their own schedule, reviews, important
 * marks and section starts moved onto the copy. Then they leave the original. Each statement
 * waits on the membership, so a second run for the same member writes nothing.
 */
function copyStatements(
  db: Db,
  deckId: string,
  userId: string,
  language: string | null,
  now: Date,
  copyId: string,
) {
  const at = now.getTime();
  const member = sql`exists (select 1 from deck_members
    where deck_id = ${deckId} and user_id = ${userId} and removed_at is null)`;
  const newIdOf = (column: AnyColumn) =>
    sql`(select new_id from deck_copy_ids where old_id = ${column} and user_id = ${userId})`;
  const copied = (column: AnyColumn) =>
    sql`${column} in (select old_id from deck_copy_ids where user_id = ${userId})`;
  const mapIds = (table: "sections" | "cards") =>
    db
      .insert(schema.deckCopyIds)
      .select(
        sql`select id, ${userId}, lower(hex(randomblob(10))) from ${sql.raw(table)}
          where deck_id = ${deckId} and ${member}`,
      )
      .onConflictDoNothing();
  const fresh = { revision: 1, updatedAt: at, importId: null, externalId: null } as const;
  return [
    // Brings their states up to the deck first, so every card they could review moves over.
    ...stateStatementsForLearner(db, deckId, userId, now),
    mapIds("sections"),
    mapIds("cards"),
    copyRows(
      db,
      schema.decks,
      "decks",
      {
        ...fresh,
        id: copyId,
        userId,
        name: sql`coalesce(local.name, decks.name)`,
        description: sql`coalesce(local.description, decks.description)`,
        position: 0,
        archivedAt: null,
        createdAt: at,
        seriesId: null,
        statesVersion: 0,
        enrichInstructions: null,
        enrichStyle: null,
        enrichStyleAt: null,
      },
      sql`from decks
        left join deck_localizations as local on local.deck_id = decks.id
          and local.language = ${language} and local.status = 'approved'
        where decks.id = ${deckId} and ${member}`,
    ),
    copyRows(
      db,
      schema.sections,
      "sections",
      {
        revision: 1,
        updatedAt: at,
        id: sql`ids.new_id`,
        deckId: copyId,
        name: sql`coalesce(local.name, sections.name)`,
      },
      sql`from sections
        join deck_copy_ids as ids on ids.old_id = sections.id and ids.user_id = ${userId}
        left join section_localizations as local on local.section_id = sections.id
          and local.language = ${language} and local.status = 'approved'
        where sections.deck_id = ${deckId}`,
    ),
    // Audio stays behind: generated speech is made again on the first play, and the owner's
    // recordings go with their account. Tags and the AI's hint draft were the owner's.
    copyRows(
      db,
      schema.cards,
      "cards",
      {
        ...fresh,
        id: sql`ids.new_id`,
        userId,
        deckId: copyId,
        term: sql`coalesce(local.term, cards.term)`,
        normalizedTerm: sql`case when local.term is null then cards.normalized_term else '' end`,
        meaning: sql`coalesce(local.meaning, cards.meaning)`,
        pronunciation: sql`coalesce(local.pronunciation, cards.pronunciation)`,
        example: sql`coalesce(local.example, cards.example)`,
        notes: sql`coalesce(local.notes, cards.notes)`,
        tags: "[]",
        hintDraft: null,
        enrichmentStatus: null,
        enrichmentFields: null,
        audioKey: null,
        audioSource: null,
        audioApprovedKey: null,
        exampleRecordingKey: null,
        sectionId: sql`sections.new_id`,
      },
      sql`from cards
        join deck_copy_ids as ids on ids.old_id = cards.id and ids.user_id = ${userId}
        left join deck_copy_ids as sections on sections.old_id = cards.section_id
          and sections.user_id = ${userId}
        left join card_localizations as local on local.card_id = cards.id
          and local.language = ${language} and local.status = 'approved'
        where cards.deck_id = ${deckId}`,
    ),
    // The copy shares each picture's object; deleting an account leaves one another row uses.
    copyRows(
      db,
      schema.cardImages,
      "images",
      {
        id: sql`lower(hex(randomblob(10)))`,
        cardId: sql`ids.new_id`,
        userId,
        updatedAt: at,
      },
      sql`from card_images as images
        join deck_copy_ids as ids on ids.old_id = images.card_id and ids.user_id = ${userId}
        where images.status = 'active'`,
    ),
    ...[schema.cardStates, schema.reviews, schema.importantCards].map((table) =>
      db
        .update(table)
        .set({ cardId: newIdOf(table.cardId) })
        .where(and(eq(table.userId, userId), copied(table.cardId))),
    ),
    db
      .update(schema.sectionStarts)
      .set({ sectionId: newIdOf(schema.sectionStarts.sectionId) })
      .where(and(eq(schema.sectionStarts.userId, userId), copied(schema.sectionStarts.sectionId))),
    // Second to last: whether it removed a row says whether this run made the copy.
    db
      .delete(schema.deckMembers)
      .where(and(eq(schema.deckMembers.deckId, deckId), eq(schema.deckMembers.userId, userId)))
      .returning({ id: schema.deckMembers.id }),
    db.delete(schema.deckCopyIds).where(eq(schema.deckCopyIds.userId, userId)),
  ] as const;
}

/**
 * Gives the members of decks whose owners deleted their accounts their own copies, a batch per
 * member, and closes a deck's queue entry once nobody is left. `dropUnstudiedFormerDecks` then
 * deletes the original.
 */
export async function copyFormerDecks(
  db: Db,
  events: AnalyticsWriter | undefined,
  now = new Date(),
): Promise<{ copied: number; failed: number }> {
  const members = await db
    .select({
      deckId: schema.formerDeckCopies.deckId,
      userId: schema.deckMembers.userId,
      language: schema.deckMembers.meaningLanguage,
      cards: sql<number>`(select count(*) from cards where cards.deck_id = ${schema.formerDeckCopies.deckId})`,
    })
    .from(schema.formerDeckCopies)
    .innerJoin(
      schema.deckMembers,
      and(
        eq(schema.deckMembers.deckId, schema.formerDeckCopies.deckId),
        isNull(schema.deckMembers.removedAt),
      ),
    )
    .orderBy(asc(schema.formerDeckCopies.createdAt))
    .limit(MEMBERS_PER_RUN);
  let copied = 0;
  let failed = 0;
  // One member whose copy fails is reported and passed over, so the rest still get theirs.
  for (const { deckId, userId, language, cards } of members) {
    const copyId = newId();
    const statements = copyStatements(db, deckId, userId, language, now, copyId);
    try {
      const [first, ...rest] = statements;
      const results = await db.batch([first, ...rest]);
      const left = results[statements.length - 2] as unknown as { id: string }[];
      if (left.length === 0) continue;
      await keyLocalizedTerms(db, copyId);
      copied++;
      track(events, { name: "former_deck_copied", cards });
    } catch (error) {
      failed++;
      console.error("Copying a former owner's deck for a member failed", {
        error: error instanceof Error ? error.name : "unknown",
      });
    }
  }
  await db.delete(schema.formerDeckCopies).where(
    sql`not exists (select 1 from deck_members
      where deck_members.deck_id = former_deck_copies.deck_id and deck_members.removed_at is null)`,
  );
  return { copied, failed };
}

/** A term taken from an edition has no duplicate key yet; `termKey` needs JavaScript's case folding. */
async function keyLocalizedTerms(db: Db, deckId: string) {
  const unkeyed = await db
    .select({ id: schema.cards.id, term: schema.cards.term, language: schema.cards.language })
    .from(schema.cards)
    .where(and(eq(schema.cards.deckId, deckId), eq(schema.cards.normalizedTerm, "")));
  await runInBatches(
    db,
    unkeyed.map((card) => [
      db
        .update(schema.cards)
        .set({ normalizedTerm: termKey(card.language, card.term) })
        .where(eq(schema.cards.id, card.id)),
    ]),
  );
}
