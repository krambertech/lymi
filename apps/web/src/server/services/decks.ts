import type { DeckInput } from "@lymi/core";
import { newId } from "@lymi/core";
import { and, asc, desc, eq, isNotNull, isNull, sql } from "@lymi/core/db";
import { audit } from "../audit";
import { schema } from "../db";
import { type CardView, presentCards } from "./card-view";
import { notFound, type ServiceContext } from "./context";
import { drawableByDeck } from "./draw";
import { deckAccess, memberOf, ownedDeck } from "./members";
import {
  askedSql,
  deckModes,
  presentModeRow,
  resolveDeckDirections,
  stateStatementsForDeck,
} from "./modes";
import { activeSeries, deckOrder, effectiveSeriesId, nextDeckPosition } from "./series-access";
import { getSettings } from "./settings";

/** Whether a state is asked now; a mode turned off keeps its states uncounted (ADR 0007, ADR 0014). */
export const asked = sql.raw(askedSql());

/**
 * The decks the learner can see, in their order. Active ones carry how many cards can be reviewed;
 * archived ones skip that count, which nothing can act on, and come back newest first.
 */
export async function listDecks(
  ctx: ServiceContext,
  opts: { archived?: boolean | undefined } = {},
) {
  const { db, userId } = ctx;
  const due = opts.archived
    ? new Map<string, number>()
    : await drawableByDeck(ctx, { zone: (await getSettings(ctx)).reviewTimezone ?? "UTC" });
  const rows = await db
    .select({
      id: schema.decks.id,
      name: schema.decks.name,
      description: schema.decks.description,
      defaultLanguage: schema.decks.defaultLanguage,
      directions: schema.decks.directions,
      position: deckOrder(userId),
      seriesId: effectiveSeriesId(userId),
      sectionProgression: schema.decks.sectionProgression,
      total: sql<number>`(select count(*) from cards where cards.deck_id = decks.id and cards.archived_at is null)`,
      archivedAt: schema.decks.archivedAt,
      ownerId: schema.decks.userId,
      ownerName: schema.user.name,
      memberRole: schema.deckMembers.role,
    })
    .from(schema.decks)
    .innerJoin(schema.user, eq(schema.user.id, schema.decks.userId))
    .leftJoin(
      schema.deckMembers,
      and(
        eq(schema.deckMembers.deckId, schema.decks.id),
        eq(schema.deckMembers.userId, userId),
        isNull(schema.deckMembers.removedAt),
      ),
    )
    .where(
      and(
        memberOf(userId),
        opts.archived ? isNotNull(schema.decks.archivedAt) : isNull(schema.decks.archivedAt),
      ),
    )
    .orderBy(
      ...(opts.archived
        ? [desc(schema.decks.archivedAt), desc(schema.decks.createdAt)]
        : [deckOrder(userId), asc(schema.decks.createdAt)]),
    );
  return rows.map(({ ownerId, ownerName, memberRole, ...deck }) => ({
    ...deck,
    reviewModes: deckModes(deck.directions),
    // Cards, not direction states: the same count the queue reports as its total.
    due: due.get(deck.id) ?? 0,
    role: ownerId === userId ? ("owner" as const) : (memberRole ?? ("learner" as const)),
    owner: { id: ownerId, name: ownerName },
  }));
}

export async function createDeck(ctx: ServiceContext, input: DeckInput) {
  const { db, userId, actor } = ctx;
  const seriesId = input.seriesId ?? null;
  if (seriesId) await activeSeries(ctx, seriesId);
  const id = newId();
  await db.insert(schema.decks).values({
    id,
    userId,
    name: input.name,
    description: input.description ?? null,
    defaultLanguage: input.defaultLanguage ?? null,
    directions: resolveDeckDirections(input) ?? "recognition",
    sectionProgression: input.sectionProgression ?? "automatic",
    seriesId,
    // A deck without a series keeps the default, so Library still orders new decks by date.
    ...(seriesId ? { position: await nextDeckPosition(ctx, seriesId) } : {}),
  });
  await audit(db, {
    userId,
    actor,
    action: "create",
    entity: "deck",
    entityId: id,
    payload: input,
  });
  return getDeck(ctx, id);
}

/** A deck the learner can see, with their role in it and who owns it. */
export async function getDeck(ctx: ServiceContext, id: string) {
  return deckAccess(ctx, id);
}

/**
 * Cards in a deck, newest first, each with the caller's state for the direction the deck
 * leads with. A production-only deck shows its production state rather than an empty
 * Status column.
 */
export async function listDeckCards(ctx: ServiceContext, deckId: string) {
  const { db, userId } = ctx;
  await deckAccess(ctx, deckId);
  const rows = await db
    .select({ card: schema.cards, state: schema.cardStates })
    .from(schema.cards)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .leftJoin(
      schema.cardStates,
      and(
        eq(schema.cardStates.cardId, schema.cards.id),
        // The state for the mode the card leads with: its picture mode when that is asked.
        sql`card_states.id = (
          select leading.id from card_states as leading
          where leading.card_id = cards.id and leading.user_id = ${userId}
            and ${sql.raw(askedSql("leading.direction"))}
          order by case when leading.direction like 'image_%' then 0
            when leading.direction = 'recognition' then 1 else 2 end
          limit 1
        )`,
      ),
    )
    .where(and(eq(schema.cards.deckId, deckId), isNull(schema.cards.archivedAt)))
    .orderBy(sql`${schema.cards.createdAt} desc`);
  const cards = await presentCards(
    db,
    rows.map((row) => row.card),
  );
  return rows.map(({ state }, index) => ({
    card: cards[index] as CardView,
    state: state && presentModeRow(state),
  }));
}

export type DeckPatch = { [K in keyof DeckInput]?: DeckInput[K] | undefined };

export async function updateDeck(ctx: ServiceContext, id: string, patch: DeckPatch) {
  const { db, userId, actor } = ctx;
  const deck = await ownedDeck(ctx, id);
  const { reviewModes, seriesId, ...fields } = patch;
  const directions = resolveDeckDirections(patch);
  // Compared with the stored series, so clearing one that is archived still takes the deck out of it.
  const [stored] = await db
    .select({ seriesId: schema.decks.seriesId })
    .from(schema.decks)
    .where(eq(schema.decks.id, deck.id));
  // A series to move into must be active, even the one the deck is already in.
  if (seriesId) await activeSeries(ctx, seriesId);
  // A deck joins the end of its new series; out of one, it returns to its place by creation date.
  const placement =
    seriesId === undefined || seriesId === stored?.seriesId
      ? {}
      : seriesId === null
        ? { seriesId: null, position: 0 }
        : { seriesId, position: await nextDeckPosition(ctx, seriesId) };
  const result = await db
    .update(schema.decks)
    .set({
      ...fields,
      ...placement,
      ...(directions ? { directions } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.decks.id, id))
    .returning({ id: schema.decks.id });
  if (result.length === 0) throw notFound("Deck");
  // A mode the deck did not ask before has no states on its cards yet; `asked` handles modes turned off.
  if (directions) {
    const [first, ...rest] = stateStatementsForDeck(db, id);
    if (first) await db.batch([first, ...rest]);
  }
  await audit(db, {
    userId,
    actor,
    action: "update",
    entity: "deck",
    entityId: id,
    payload: patch,
  });
  return getDeck(ctx, id);
}

/** Archive, never delete. The cards stay put; the deck leaves every list until restored. */
export async function archiveDeck(ctx: ServiceContext, id: string) {
  return setDeckArchived(ctx, id, new Date());
}
export async function restoreDeck(ctx: ServiceContext, id: string) {
  return setDeckArchived(ctx, id, null);
}

async function setDeckArchived(ctx: ServiceContext, id: string, archivedAt: Date | null) {
  const { db, userId, actor } = ctx;
  await ownedDeck(ctx, id);
  const result = await db
    .update(schema.decks)
    .set({ archivedAt, updatedAt: new Date() })
    .where(eq(schema.decks.id, id))
    .returning({ id: schema.decks.id });
  if (result.length === 0) throw notFound("Deck");
  await audit(db, {
    userId,
    actor,
    action: archivedAt ? "archive" : "restore",
    entity: "deck",
    entityId: id,
    payload: {},
  });
  return { ok: true as const };
}
