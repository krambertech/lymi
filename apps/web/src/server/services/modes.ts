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
import { type SQL, sql } from "@lymi/core/db";
import type { Card } from "@lymi/core/schema";
import { type Db, schema } from "../db";
import { ServiceError } from "./context";

/**
 * Review modes on the server, ADR 0014. The legacy `directions` columns store a deck's modes and
 * a card's text modes, which every Worker version writes; a card's `review_modes` adds its order
 * and picture modes. `card_states.direction` stays the identity a grade finds.
 */

/**
 * Whether a state row's mode is asked, as raw SQL over `cards`, `decks` and a state direction.
 * A picture mode is asked when the card's own list names it and the card has an active, described
 * picture; a card of picture modes only asks its fallback text mode while it has no such picture.
 * Every due count, the queue, stats and reminders share it.
 */
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
 * Insert every missing state that is asked, one statement per mode, for the cards `where` selects
 * and the learners `learners` yields as `deck_id, user_id` rows. A state that exists, including one
 * for a mode no longer asked, is never replaced.
 */
function stateInserts(db: Db, where: SQL, learners: SQL, now: Date): Statement[] {
  const due = now.getTime();
  const fsrs = serializeState(emptyState(now));
  return REVIEW_MODE_KEYS.map((key) => {
    const direction = stateDirection(key);
    return db
      .insert(schema.cardStates)
      .select(
        sql`select lower(hex(randomblob(10))), cards.id, learners.user_id, ${direction},
          ${due}, 0, ${fsrs}, null, ${due}, ${due}, ${key}
        from cards join decks on decks.id = cards.deck_id
        join (${learners}) as learners on learners.deck_id = decks.id
        where ${where} and ${sql.raw(askedSql(`'${direction}'`))}`,
      )
      .onConflictDoNothing();
  });
}

/** Every deck's owner and active members. */
const deckLearners = sql`select id as deck_id, user_id from decks
  union all
  select deck_id, user_id from deck_members where removed_at is null`;

/** One card's states for everyone who studies its deck, as membership stands inside the batch. */
export function stateStatementsForCard(db: Db, cardId: string, now = new Date()): Statement[] {
  return stateInserts(db, sql`cards.id = ${cardId}`, deckLearners, now);
}

/** States for every card that follows the deck, after the deck's modes change. */
export function stateStatementsForDeck(db: Db, deckId: string, now = new Date()): Statement[] {
  return stateInserts(
    db,
    sql`cards.deck_id = ${deckId} and cards.directions is null and cards.archived_at is null`,
    deckLearners,
    now,
  );
}

/** Every card state, archived cards included, for one learner joining a deck. */
export function stateStatementsForLearner(
  db: Db,
  deckId: string,
  userId: string,
  now = new Date(),
): Statement[] {
  return stateInserts(
    db,
    sql`cards.deck_id = ${deckId} and exists (
      select 1 from deck_members
      where deck_members.deck_id = ${deckId} and deck_members.user_id = ${userId}
        and deck_members.removed_at is null
    )`,
    sql`select ${deckId} as deck_id, ${userId} as user_id`,
    now,
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

/** A deck's legacy column from either spelling. Picture modes belong on cards. */
export function resolveDeckDirections(input: ModeInput): Directions | undefined {
  const resolved = resolveCardModes(input, null);
  if (!resolved) return undefined;
  if (!resolved.directions || resolved.reviewModeKeys?.some(isImageMode)) {
    throw new ServiceError("invalid", "Set picture modes on each card, not on the deck.");
  }
  return resolved.directions;
}

/**
 * The columns a card write stores, or undefined when it does not touch modes. `reviewModes` wins;
 * a legacy `directions` replaces only the text modes, so an older app cannot drop picture modes it
 * never knew about. Null follows the deck again.
 */
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
