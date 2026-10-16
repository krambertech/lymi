import {
  type DeckTagRef,
  type DeckTagRename,
  type DeckTagsOut,
  TAG_LIMITS,
  type TagOut,
  tagKey,
} from "@lymi/core";
import { backlogOf } from "@lymi/core/analytics";
import { and, desc, eq, isNull, sql } from "@lymi/core/db";
import { type Db, schema } from "../db";
import { track } from "./analytics";
import { auditStatement } from "./audit";
import { runBatch, type Statement } from "./batch";
import { updateCards } from "./cards";
import { notFound, type ServiceContext, ServiceError } from "./context";
import { ownedDeck } from "./members";

/**
 * Moves these cards' `cards.tags` into `tags` and `card_tags`, then writes each card's list back
 * in the owner's spelling, so "Verbs" on a new card reads "verbs" when the owner already has it.
 * `names` are the tags the write may have put on the cards, keyed by `tagKey` here because
 * SQLite folds only ASCII; any other name already on a card must be a tag of its owner, or the
 * batch fails on the missing key rather than keying it by ASCII case. A tag in `archive` is kept
 * on the cards as archived rather than dropped, so Restore can put it back where it was.
 */
export function syncTagStatements(
  db: Db,
  cardIds: readonly string[],
  names: Iterable<string>,
  now = new Date(),
  archive: readonly string[] = [],
): Statement[] {
  const ids = sql`(select value from json_each(${JSON.stringify(cardIds)}))`;
  const keyed = JSON.stringify([...names].map((name) => [name.trim(), tagKey(name)]));
  const key = sql`coalesce(
    (select json_extract(keyed.value, '$[1]') from json_each(${keyed}) as keyed
      where json_extract(keyed.value, '$[0]') = trim(each.value)),
    (select tags.normalized_name from tags where tags.user_id = cards.user_id and tags.name = trim(each.value))
  )`;
  const at = now.getTime();
  const archiving = archive.length
    ? [
        db
          .update(schema.cardTags)
          .set({ archivedAt: now })
          .where(
            sql`${schema.cardTags.cardId} in ${ids} and ${schema.cardTags.archivedAt} is null
              and ${schema.cardTags.tagId} in (
                select tags.id from tags join cards on cards.user_id = tags.user_id
                where cards.id = ${schema.cardTags.cardId}
                  and tags.normalized_name in (select value from json_each(${JSON.stringify(archive.map(tagKey))}))
              )`,
          ),
      ]
    : [];
  return [
    ...archiving,
    db
      .insert(schema.tags)
      .select(
        sql`select lower(hex(randomblob(10))), cards.user_id, max(trim(each.value)), ${key}, ${at}, ${at}
        from cards, json_each(cards.tags) as each
        where cards.id in ${ids} and each.type = 'text' and trim(each.value) <> ''
        group by cards.user_id, ${key}`,
      )
      .onConflictDoNothing(),
    db
      .delete(schema.cardTags)
      .where(sql`${schema.cardTags.cardId} in ${ids} and ${schema.cardTags.archivedAt} is null`),
    db
      .insert(schema.cardTags)
      .select(
        sql`select cards.id, tags.id, min(each.key), null
        from cards, json_each(cards.tags) as each
        join tags on tags.user_id = cards.user_id and tags.normalized_name = ${key}
        where cards.id in ${ids} and each.type = 'text' and trim(each.value) <> ''
        group by cards.id, tags.id`,
      )
      // A tag archived from the card and put on it again is active again, in the order sent.
      .onConflictDoUpdate({
        target: [schema.cardTags.cardId, schema.cardTags.tagId],
        set: { archivedAt: null, position: sql`excluded.position` },
      }),
    db
      .update(schema.cards)
      .set({
        tags: sql`(select json_group_array(tags.name order by card_tags.position)
          from card_tags join tags on tags.id = card_tags.tag_id
          where card_tags.card_id = cards.id and card_tags.archived_at is null)`,
      })
      .where(sql`${schema.cards.id} in ${ids}`),
  ];
}

/**
 * Active decks the learner studies whose tags they see: their own, and joined ones read in the
 * deck's own edition, since another edition shows no tags until editions name them. Starting here
 * keeps a tag read to the learner's cards rather than every card_tags row.
 */
export function taggedDecks(userId: string) {
  return sql`(
    select decks.id from decks where decks.user_id = ${userId} and decks.archived_at is null
    union all
    select deck_members.deck_id from deck_members
      join decks on decks.id = deck_members.deck_id and decks.archived_at is null
    where deck_members.user_id = ${userId} and deck_members.removed_at is null
      and deck_members.meaning_language is null
  )`;
}

/**
 * Every tag on an active card in a deck the learner studies, their own and joined ones alike.
 * One name is one tag across decks, spelled the learner's way when they use it too.
 */
export async function listTags({ db, userId }: ServiceContext): Promise<TagOut[]> {
  const cards = sql<number>`count(distinct ${schema.cards.id})`;
  const rows = await db
    .select({
      own: sql<
        string | null
      >`max(case when ${schema.tags.userId} = ${userId} then ${schema.tags.name} end)`,
      any: sql<string>`min(${schema.tags.name})`,
      cards,
    })
    .from(schema.cards)
    .innerJoin(schema.cardTags, eq(schema.cardTags.cardId, schema.cards.id))
    .innerJoin(schema.tags, eq(schema.tags.id, schema.cardTags.tagId))
    .where(
      and(
        sql`${schema.cards.deckId} in ${taggedDecks(userId)}`,
        isNull(schema.cards.archivedAt),
        isNull(schema.cardTags.archivedAt),
      ),
    )
    .groupBy(schema.tags.normalizedName)
    .orderBy(desc(cards), schema.tags.normalizedName);
  return rows.map((row) => ({ name: row.own ?? row.any, cards: row.cards, own: row.own !== null }));
}

const CHANNEL = { user: "app", api: "api", mcp: "mcp" } as const;

/** The deck's active cards with a tag of this key on them, active or archived, and the tag's spelling. */
async function cardsWithTag(
  { db }: ServiceContext,
  deckId: string,
  name: string,
  archived: boolean,
) {
  return db
    .select({
      id: schema.cards.id,
      tags: schema.cards.tags,
      name: schema.tags.name,
      position: schema.cardTags.position,
    })
    .from(schema.cards)
    .innerJoin(schema.cardTags, eq(schema.cardTags.cardId, schema.cards.id))
    .innerJoin(schema.tags, eq(schema.tags.id, schema.cardTags.tagId))
    .where(
      and(
        eq(schema.cards.deckId, deckId),
        isNull(schema.cards.archivedAt),
        eq(schema.tags.normalizedName, tagKey(name)),
        archived
          ? sql`${schema.cardTags.archivedAt} is not null`
          : isNull(schema.cardTags.archivedAt),
      ),
    );
}

/** Writes each card's new tags through the card edit path, so ownership, Activity and editions hold. */
async function retag(
  ctx: ServiceContext,
  edits: { cardId: string; tags: string[] }[],
  archiveTags?: string[],
) {
  const outcomes = await updateCards(ctx, edits, archiveTags ? { archiveTags } : {});
  const failed = outcomes.filter((o) => o.status !== "updated").length;
  if (failed > 0) {
    throw new ServiceError("unavailable", `${failed} of ${edits.length} cards could not be saved`);
  }
}

function report(
  ctx: ServiceContext,
  action: "rename" | "merge" | "archive" | "restore",
  cards: number,
) {
  const channel = CHANNEL[ctx.actor as keyof typeof CHANNEL];
  if (channel && cards > 0)
    track(ctx.analytics, { name: "deck_tag_changed", action, channel, cards: backlogOf(cards) });
}

/** The tags on a deck's active cards, and those archived from it. Owner only. */
export async function listDeckTags(ctx: ServiceContext, deckId: string): Promise<DeckTagsOut> {
  await ownedDeck(ctx, deckId);
  const cards = sql<number>`count(distinct ${schema.cards.id})`;
  const archived = sql<number>`${schema.cardTags.archivedAt} is not null`;
  const rows = await ctx.db
    .select({ name: schema.tags.name, cards, archived })
    .from(schema.cards)
    .innerJoin(schema.cardTags, eq(schema.cardTags.cardId, schema.cards.id))
    .innerJoin(schema.tags, eq(schema.tags.id, schema.cardTags.tagId))
    .where(and(eq(schema.cards.deckId, deckId), isNull(schema.cards.archivedAt)))
    .groupBy(schema.tags.id, archived)
    .orderBy(desc(cards), schema.tags.normalizedName);
  const pick = (want: boolean) =>
    rows.filter((r) => Boolean(r.archived) === want).map(({ name, cards }) => ({ name, cards }));
  return { tags: pick(false), archived: pick(true) };
}

/**
 * Renames a tag on one deck's cards. A name already among the learner's tags merges the two, and
 * other decks keep the old name; a change of case alone respells the tag everywhere, since one
 * name is one tag.
 */
export async function renameDeckTag(
  ctx: ServiceContext,
  deckId: string,
  { from, to }: DeckTagRename,
): Promise<DeckTagsOut> {
  await ownedDeck(ctx, deckId);
  const rows = await cardsWithTag(ctx, deckId, from, false);
  if (rows.length === 0) throw notFound("Tag");
  const key = tagKey(from);
  if (tagKey(to) === key) {
    if (rows[0]?.name !== to) await respell(ctx, key, to);
    return listDeckTags(ctx, deckId);
  }
  const merging = await ctx.db
    .select({ id: schema.tags.id })
    .from(schema.tags)
    .where(and(eq(schema.tags.userId, ctx.userId), eq(schema.tags.normalizedName, tagKey(to))));
  await retag(
    ctx,
    rows.map((row) => {
      const tags: string[] = [];
      for (const tag of row.tags) {
        const next = tagKey(tag) === key ? to : tag;
        if (!tags.some((kept) => tagKey(kept) === tagKey(next))) tags.push(next);
      }
      return { cardId: row.id, tags };
    }),
  );
  report(ctx, merging.length > 0 ? "merge" : "rename", rows.length);
  return listDeckTags(ctx, deckId);
}

/** A change of case alone: the one tag takes the new spelling on every card that carries it. */
async function respell(ctx: ServiceContext, key: string, name: string) {
  const { db, userId } = ctx;
  const [tag] = await db
    .select({ id: schema.tags.id })
    .from(schema.tags)
    .where(and(eq(schema.tags.userId, userId), eq(schema.tags.normalizedName, key)));
  if (!tag) throw notFound("Tag");
  const carriers = sql`(select card_id from card_tags where tag_id = ${tag.id})`;
  await runBatch(db, [
    db.update(schema.tags).set({ name, updatedAt: new Date() }).where(eq(schema.tags.id, tag.id)),
    db
      .update(schema.cards)
      .set({
        tags: sql`(select json_group_array(tags.name order by card_tags.position)
          from card_tags join tags on tags.id = card_tags.tag_id
          where card_tags.card_id = cards.id and card_tags.archived_at is null)`,
      })
      .where(sql`${schema.cards.id} in ${carriers}`),
    auditStatement(ctx, { entity: "tag", action: "rename", id: tag.id, details: { name } }),
  ]);
}

/** Takes a tag off every card of the deck, keeping where it was so Restore puts it back. */
export async function archiveDeckTag(
  ctx: ServiceContext,
  deckId: string,
  { name }: DeckTagRef,
): Promise<DeckTagsOut> {
  await ownedDeck(ctx, deckId);
  const rows = await cardsWithTag(ctx, deckId, name, false);
  if (rows.length === 0) throw notFound("Tag");
  const key = tagKey(name);
  await retag(
    ctx,
    rows.map((row) => ({ cardId: row.id, tags: row.tags.filter((tag) => tagKey(tag) !== key) })),
    [name],
  );
  report(ctx, "archive", rows.length);
  return listDeckTags(ctx, deckId);
}

/** Puts an archived tag back on the deck's cards it came off, except a card already holding twenty. */
export async function restoreDeckTag(
  ctx: ServiceContext,
  deckId: string,
  { name }: DeckTagRef,
): Promise<DeckTagsOut> {
  await ownedDeck(ctx, deckId);
  const rows = await cardsWithTag(ctx, deckId, name, true);
  if (rows.length === 0) throw notFound("Tag");
  const room = rows.filter((row) => row.tags.length < TAG_LIMITS.count);
  if (room.length > 0) {
    await retag(
      ctx,
      room.map((row) => ({ cardId: row.id, tags: row.tags.toSpliced(row.position, 0, row.name) })),
    );
  }
  report(ctx, "restore", room.length);
  return listDeckTags(ctx, deckId);
}
