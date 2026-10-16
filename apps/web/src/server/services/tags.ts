import { type TagOut, tagKey } from "@lymi/core";
import { and, desc, eq, isNull, sql } from "@lymi/core/db";
import { type Db, schema } from "../db";
import type { Statement } from "./batch";
import type { ServiceContext } from "./context";

/**
 * Moves these cards' `cards.tags` into `tags` and `card_tags`, then writes each card's list back
 * in the owner's spelling, so "Verbs" on a new card reads "verbs" when the owner already has it.
 * `names` are the tags the write may have put on the cards, keyed by `tagKey` here because
 * SQLite folds only ASCII; any other name already on a card must be a tag of its owner, or the
 * batch fails on the missing key rather than keying it by ASCII case.
 */
export function syncTagStatements(
  db: Db,
  cardIds: readonly string[],
  names: Iterable<string>,
  now = new Date(),
): Statement[] {
  const ids = sql`(select value from json_each(${JSON.stringify(cardIds)}))`;
  const keyed = JSON.stringify([...names].map((name) => [name.trim(), tagKey(name)]));
  const key = sql`coalesce(
    (select json_extract(keyed.value, '$[1]') from json_each(${keyed}) as keyed
      where json_extract(keyed.value, '$[0]') = trim(each.value)),
    (select tags.normalized_name from tags where tags.user_id = cards.user_id and tags.name = trim(each.value))
  )`;
  const at = now.getTime();
  return [
    db
      .insert(schema.tags)
      .select(
        sql`select lower(hex(randomblob(10))), cards.user_id, max(trim(each.value)), ${key}, ${at}, ${at}
        from cards, json_each(cards.tags) as each
        where cards.id in ${ids} and each.type = 'text' and trim(each.value) <> ''
        group by cards.user_id, ${key}`,
      )
      .onConflictDoNothing(),
    db.delete(schema.cardTags).where(sql`${schema.cardTags.cardId} in ${ids}`),
    db
      .insert(schema.cardTags)
      .select(
        sql`select cards.id, tags.id, min(each.key)
        from cards, json_each(cards.tags) as each
        join tags on tags.user_id = cards.user_id and tags.normalized_name = ${key}
        where cards.id in ${ids} and each.type = 'text' and trim(each.value) <> ''
        group by cards.id, tags.id`,
      )
      .onConflictDoNothing(),
    db
      .update(schema.cards)
      .set({
        tags: sql`(select json_group_array(tags.name order by card_tags.position)
          from card_tags join tags on tags.id = card_tags.tag_id
          where card_tags.card_id = cards.id)`,
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
      and(sql`${schema.cards.deckId} in ${taggedDecks(userId)}`, isNull(schema.cards.archivedAt)),
    )
    .groupBy(schema.tags.normalizedName)
    .orderBy(desc(cards), schema.tags.normalizedName);
  return rows.map((row) => ({ name: row.own ?? row.any, cards: row.cards, own: row.own !== null }));
}
