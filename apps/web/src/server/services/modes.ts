import type { Directions, ReviewMode, ReviewModeKey } from "@lymi/core";
import {
  directionsFromModes,
  effectiveModes,
  emptyState,
  IMAGE_MODES,
  isImageMode,
  legacyDirection,
  modeKey,
  modeOf,
  modeOfStateDirection,
  modesFromDirections,
  REVIEW_MODE_KEYS,
  serializeState,
  stateDirection,
  TEXT_MODES,
} from "@lymi/core";
import { and, eq, gt, isNull, type SQL, sql } from "@lymi/core/db";
import type { Card } from "@lymi/core/schema";
import { type Db, schema } from "../db";
import { runInBatches } from "./batch";
import { ServiceError } from "./context";

/** Review modes on the server; the expand-phase storage rules are in docs/data-model.md (ADR 0014). */

/** Whether a state's mode is asked, as raw SQL shared by due counts, the queue, stats and reminders. */
export function askedSql(
  direction = "card_states.direction",
  { cards = "cards", decks = "decks" }: { cards?: string; decks?: string } = {},
): string {
  const directions = `coalesce(${cards}.directions, ${decks}.directions)`;
  const modes = `case when ${cards}.directions is null then null else ${cards}.review_modes end`;
  const picture = `exists (
    select 1 from card_images
    where card_images.card_id = ${cards}.id and card_images.status = 'active'
      and card_images.description is not null
  )`;
  const pictureOnly = `(json_array_length(coalesce(${modes}, '[]')) > 0 and not exists (
    select 1 from json_each(${modes}) where json_each.value in ('${TEXT_MODES.join("', '")}')
  ))`;
  return `(
    (${direction} in ('recognition', 'production')
      and (${directions} = 'both' or ${direction} = ${directions})
      and (not ${pictureOnly} or not ${picture}))
    or (${direction} in ('${IMAGE_MODES.join("', '")}')
      and exists (select 1 from json_each(${modes}) where json_each.value = ${direction})
      and ${picture})
  )`;
}

type Statement = Parameters<Db["batch"]>[0][number];

/**
 * Insert every missing asked state, one statement per mode, never replacing an existing one.
 * `added` is the `created_at` the draw's new-card odds read; the state is due from `now`.
 */
function stateInserts(
  db: Db,
  where: SQL,
  learners: SQL,
  now: Date,
  keys: readonly ReviewModeKey[] = REVIEW_MODE_KEYS,
  added: SQL = sql`${now.getTime()}`,
): Statement[] {
  const due = now.getTime();
  const fsrs = serializeState(emptyState(now));
  return keys.map((key) => {
    const direction = stateDirection(key);
    return db
      .insert(schema.cardStates)
      .select(
        sql`select lower(hex(randomblob(10))), cards.id, learners.user_id, ${direction},
          ${due}, 0, ${fsrs}, null, ${added}, ${due}, ${key}
        from cards join decks on decks.id = cards.deck_id
        join (${learners}) as learners on learners.deck_id = decks.id
        where ${where} and ${sql.raw(askedSql(`'${direction}'`))}`,
      )
      .onConflictDoNothing();
  });
}

/**
 * Only the owners get states when cards change; members catch up on their next request, so one
 * card never writes a row per member. `decks` selects the changed decks. ADR 0022.
 */
function ownerStateInserts(
  db: Db,
  where: SQL,
  decks: SQL,
  now: Date,
  keys: readonly ReviewModeKey[] = REVIEW_MODE_KEYS,
): Statement[] {
  return [
    ...stateInserts(
      db,
      where,
      sql`select id as deck_id, user_id from decks where id in ${decks}`,
      now,
      keys,
    ),
    db
      .update(schema.decks)
      .set({ statesVersion: sql`${schema.decks.statesVersion} + 1` })
      .where(sql`${schema.decks.id} in ${decks}`),
  ];
}

/** One card's states for its deck's owner, as the card stands inside the batch. */
export function stateStatementsForCard(
  db: Db,
  cardId: string,
  now = new Date(),
  keys: readonly ReviewModeKey[] = REVIEW_MODE_KEYS,
): Statement[] {
  return ownerStateInserts(
    db,
    sql`cards.id = ${cardId}`,
    sql`(select deck_id from cards where id = ${cardId})`,
    now,
    keys,
  );
}

/**
 * Missing states for many cards at once. `cardIds` is a JSON array bound as one parameter, so
 * a large import stays within D1's parameter limit.
 */
export function stateStatementsForCards(
  db: Db,
  cardIds: string,
  now = new Date(),
  keys: readonly ReviewModeKey[] = REVIEW_MODE_KEYS,
): Statement[] {
  return ownerStateInserts(
    db,
    sql`cards.id in (select value from json_each(${cardIds}))`,
    sql`(select distinct deck_id from cards where id in (select value from json_each(${cardIds})))`,
    now,
    keys,
  );
}

/** States for every card that follows the deck, after the deck's modes change. */
export function stateStatementsForDeck(db: Db, deckId: string, now = new Date()): Statement[] {
  return ownerStateInserts(
    db,
    sql`cards.deck_id = ${deckId} and cards.directions is null and cards.archived_at is null`,
    sql`(select ${deckId})`,
    now,
  );
}

/**
 * Every card state, archived cards included, for one member of a deck, then the deck version
 * they now match. A state counts as added when its card was, or when they joined if later.
 */
export function stateStatementsForLearner(
  db: Db,
  deckId: string,
  userId: string,
  now = new Date(),
): Statement[] {
  const member = and(eq(schema.deckMembers.deckId, deckId), eq(schema.deckMembers.userId, userId));
  return [
    ...stateInserts(
      db,
      sql`cards.deck_id = ${deckId}`,
      sql`select deck_id, user_id, joined_at from deck_members
        where deck_id = ${deckId} and user_id = ${userId} and removed_at is null`,
      now,
      REVIEW_MODE_KEYS,
      sql`max(cards.created_at, learners.joined_at)`,
    ),
    db
      .update(schema.deckMembers)
      .set({
        statesVersion: sql`(select states_version from decks where id = ${deckId})`,
      })
      .where(and(member, isNull(schema.deckMembers.removedAt))),
  ];
}

/** Bring the learner's states up to every deck they are a member of. ADR 0022. */
export async function catchUpStates(db: Db, userId: string, now = new Date()): Promise<void> {
  const behind = await db
    .select({ deckId: schema.deckMembers.deckId })
    .from(schema.deckMembers)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.deckMembers.deckId))
    .where(
      and(
        eq(schema.deckMembers.userId, userId),
        isNull(schema.deckMembers.removedAt),
        gt(schema.decks.statesVersion, schema.deckMembers.statesVersion),
      ),
    );
  await runInBatches(
    db,
    behind.map(({ deckId }) => stateStatementsForLearner(db, deckId, userId, now)),
  );
}

/** A state or review's mode, including rows an older Worker wrote without one. */
export function stateMode(row: { mode: ReviewModeKey | null; direction: string }): ReviewModeKey {
  return row.mode ?? modeOfStateDirection(row.direction);
}

/** A state or review row as the API shows it: its mode, and the legacy direction a text mode had. */
export function presentModeRow<T extends { mode: ReviewModeKey | null; direction: string }>(
  row: T,
): Omit<T, "mode" | "direction"> & {
  mode: ReviewMode;
  direction: ReturnType<typeof legacyDirection>;
} {
  const key = stateMode(row);
  return { ...row, mode: modeOf(key), direction: legacyDirection(key) };
}

/** How a deck asks the cards that follow it. */
export function deckModes(directions: Directions): ReviewMode[] {
  return modesFromDirections(directions).map(modeOf);
}

/** A card's own modes, or null when it follows its deck. */
export function cardModes(card: Pick<Card, "directions" | "reviewModeKeys">): ReviewMode[] | null {
  return card.directions ? effectiveModes(card.directions, card.reviewModeKeys).map(modeOf) : null;
}

export interface ModeInput {
  directions?: Directions | null | undefined;
  reviewModes?: ReviewMode[] | null | undefined;
}

/** A deck's legacy column from either spelling, refusing picture modes, which belong on cards. */
export function resolveDeckDirections(input: ModeInput): Directions | undefined {
  const resolved = resolveCardModes(input, null);
  if (!resolved) return undefined;
  if (!resolved.directions || resolved.reviewModeKeys?.some(isImageMode)) {
    throw new ServiceError("invalid", "Set picture modes on each card, not on the deck.");
  }
  return resolved.directions;
}

/** The columns a card write stores, where a legacy `directions` replaces only the text modes and keeps picture modes. */
export function resolveCardModes(
  input: ModeInput,
  current: readonly ReviewModeKey[] | null,
): { directions: Directions | null; reviewModeKeys: ReviewModeKey[] | null } | undefined {
  const { directions, reviewModes } = input;
  if (reviewModes === undefined && directions === undefined) return undefined;
  if (reviewModes === null || (reviewModes === undefined && directions === null)) {
    if (directions) throw disagree();
    return { directions: null, reviewModeKeys: null };
  }
  if (reviewModes) {
    const keys = reviewModes.map(modeKey);
    if (directions !== undefined && directions !== directionsFromModes(keys)) throw disagree();
    return { directions: directionsFromModes(keys), reviewModeKeys: keys };
  }
  const legacy = directions as Directions;
  const keys = [...modesFromDirections(legacy), ...(current ?? []).filter(isImageMode)];
  return { directions: legacy, reviewModeKeys: keys };
}

function disagree() {
  return new ServiceError("invalid", "directions and reviewModes disagree; send reviewModes only");
}
