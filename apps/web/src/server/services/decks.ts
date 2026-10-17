import type { DeckEnrichField, DeckInput, DeckPurpose, NewDeckInput } from "@lymi/core";
import { deckEnrichFields, deckPurpose, newId } from "@lymi/core";
import { and, asc, desc, eq, isNotNull, isNull, sql } from "@lymi/core/db";
import { schema } from "../db";
import { FORMER_OWNER_ID } from "./account-deletion";
import { track } from "./analytics";
import { audit } from "./audit";
import { type CardView, presentCards } from "./card-view";
import { notFound, type ServiceContext, ServiceError } from "./context";
import { drawableByDeck } from "./draw";
import {
  deckAccess,
  livePublication,
  memberOf,
  ownedDeck,
  ownerAvatar,
  publisherColumns,
  publisherOf,
} from "./members";
import {
  askedSql,
  deckModes,
  presentModeRow,
  resolveDeckDirections,
  stateStatementsForDeck,
} from "./modes";
import { bumped } from "./revisions";
import { activeSeries, deckOrder, effectiveSeriesId, nextDeckPosition } from "./series-access";
import { getSettings } from "./settings";

const CHANNEL = { user: "app", api: "api", mcp: "mcp" } as const;

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
      purpose: schema.decks.purpose,
      enrichFields: schema.decks.enrichFields,
      enrichInstructions: schema.decks.enrichInstructions,
      enrichStyle: schema.decks.enrichStyle,
      total: sql<number>`(select count(*) from cards where cards.deck_id = decks.id and cards.archived_at is null)`,
      archivedAt: schema.decks.archivedAt,
      ownerId: schema.decks.userId,
      ownerName: schema.user.name,
      memberRole: schema.deckMembers.role,
      meaningLanguage: schema.deckMembers.meaningLanguage,
      editionName: schema.deckLocalizations.name,
      editionDescription: schema.deckLocalizations.description,
      ...publisherColumns,
    })
    .from(schema.decks)
    .innerJoin(schema.user, eq(schema.user.id, schema.decks.userId))
    .leftJoin(schema.deckPublications, livePublication)
    .leftJoin(schema.userAvatars, ownerAvatar)
    .leftJoin(
      schema.deckMembers,
      and(
        eq(schema.deckMembers.deckId, schema.decks.id),
        eq(schema.deckMembers.userId, userId),
        isNull(schema.deckMembers.removedAt),
      ),
    )
    // The deck's text in the edition this learner pinned, if any. ADR 0015.
    .leftJoin(
      schema.deckLocalizations,
      and(
        eq(schema.deckLocalizations.deckId, schema.decks.id),
        eq(schema.deckLocalizations.language, schema.deckMembers.meaningLanguage),
        eq(schema.deckLocalizations.status, "approved"),
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
  return rows.map(
    ({
      ownerId,
      ownerName,
      memberRole,
      editionName,
      editionDescription,
      publicationSlug,
      avatarCustomKey,
      avatarCustomVersion,
      avatarGoogleVersion,
      ...deck
    }) => {
      const publisher = publisherOf({
        publicationSlug,
        avatarCustomKey,
        avatarCustomVersion,
        avatarGoogleVersion,
        archivedAt: deck.archivedAt,
      });
      const owner = ownerId === userId;
      return {
        ...deck,
        name: editionName ?? deck.name,
        description: editionDescription ?? deck.description,
        reviewModes: deckModes(deck.directions),
        purpose: owner ? deckPurpose(deck.purpose, deck.defaultLanguage) : null,
        enrichFields: deckEnrichFields(deck.enrichFields, deck.defaultLanguage, deck.purpose),
        enrichInstructions: owner ? deck.enrichInstructions : null,
        enrichStyle: owner ? deck.enrichStyle : null,
        // Cards, not direction states: the same count the queue reports as its total.
        due: due.get(deck.id) ?? 0,
        role: owner ? ("owner" as const) : (memberRole ?? ("learner" as const)),
        owner: {
          id: ownerId,
          name: ownerName,
          avatarUrl: publisher.avatarUrl,
          former: ownerId === FORMER_OWNER_ID,
        },
        published: publisher.published,
      };
    },
  );
}

export async function createDeck(ctx: ServiceContext, { id: chosen, ...input }: NewDeckInput) {
  const { db, userId } = ctx;
  // A create sent again with its id returns the deck the first one made.
  if (chosen) {
    const [taken] = await db
      .select({ userId: schema.decks.userId })
      .from(schema.decks)
      .where(eq(schema.decks.id, chosen));
    if (taken && taken.userId !== userId) {
      throw new ServiceError("conflict", "That deck id is taken");
    }
    if (taken) return getDeck(ctx, chosen);
  }
  const seriesId = input.seriesId ?? null;
  if (seriesId) await activeSeries(ctx, seriesId);
  const id = chosen ?? newId();
  await db.insert(schema.decks).values({
    id,
    userId,
    name: input.name,
    description: input.description ?? null,
    defaultLanguage: input.defaultLanguage ?? null,
    directions: resolveDeckDirections(input) ?? "recognition",
    sectionProgression: input.sectionProgression ?? "automatic",
    purpose: input.purpose ?? null,
    ...(input.enrichFields ? { enrichFields: input.enrichFields } : {}),
    ...(input.enrichInstructions?.trim()
      ? { enrichInstructions: input.enrichInstructions.trim() }
      : {}),
    seriesId,
    // A deck without a series keeps the default, so Library still orders new decks by date.
    ...(seriesId ? { position: await nextDeckPosition(ctx, seriesId) } : {}),
  });
  await audit(ctx, { entity: "deck", action: "create", id, details: input });
  if (input.purpose) trackPurpose(ctx, input.purpose, true);
  if (input.enrichFields !== undefined || input.enrichInstructions?.trim()) {
    trackEnrichmentChoice(
      ctx,
      deckEnrichFields(input.enrichFields, input.defaultLanguage, input.purpose),
      input.enrichInstructions,
    );
  }
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
    userId,
  );
  return rows.map(({ state }, index) => ({
    card: cards[index] as CardView,
    state: state && presentModeRow(state),
  }));
}

export type DeckPatch = { [K in keyof DeckInput]?: DeckInput[K] | undefined };

export async function updateDeck(ctx: ServiceContext, id: string, patch: DeckPatch) {
  const { db } = ctx;
  const deck = await ownedDeck(ctx, id);
  const { reviewModes, seriesId, enrichInstructions, ...fields } = patch;
  const directions = resolveDeckDirections(patch);
  // The stored row, not the view: the series so clearing an archived one still takes the deck
  // out of it, and the text so an edition goes stale against the deck's own words.
  const [stored] = await db
    .select({
      seriesId: schema.decks.seriesId,
      name: schema.decks.name,
      description: schema.decks.description,
      defaultLanguage: schema.decks.defaultLanguage,
      purpose: schema.decks.purpose,
      enrichFields: schema.decks.enrichFields,
      enrichInstructions: schema.decks.enrichInstructions,
    })
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
      // Blank instructions are none, so the prompt never carries an empty section.
      ...(enrichInstructions === undefined
        ? {}
        : { enrichInstructions: enrichInstructions?.trim() || null }),
      ...placement,
      ...(directions ? { directions } : {}),
      ...bumped("deck", fields, stored ?? {}),
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
  await audit(ctx, { entity: "deck", action: "update", id, details: patch });
  // Against the effective purpose, so confirming the one a language implied is no change.
  if (patch.purpose && patch.purpose !== deckPurpose(stored?.purpose, stored?.defaultLanguage)) {
    trackPurpose(ctx, patch.purpose, false);
  }
  // One language and purpose for both sides, so a default that moves with them is not the owner's choice.
  const language = stored?.defaultLanguage;
  const before = {
    fields: deckEnrichFields(stored?.enrichFields, language, stored?.purpose),
    instructions: stored?.enrichInstructions ?? null,
  };
  const after = {
    fields: patch.enrichFields ? deckEnrichFields(patch.enrichFields, language) : before.fields,
    instructions:
      enrichInstructions === undefined ? before.instructions : enrichInstructions?.trim() || null,
  };
  if (after.fields.join() !== before.fields.join() || after.instructions !== before.instructions) {
    trackEnrichmentChoice(ctx, after.fields, after.instructions);
  }
  return getDeck(ctx, id);
}

/** The purpose an owner gave a deck, as its fixed category, never the deck's text. */
function trackPurpose(ctx: ServiceContext, purpose: DeckPurpose, created: boolean) {
  const channel = CHANNEL[ctx.actor as keyof typeof CHANNEL];
  if (channel) track(ctx.analytics, { name: "deck_purpose_set", purpose, created, channel });
}

/** What a deck now asks the AI for, as flags: never the instructions themselves. */
function trackEnrichmentChoice(
  ctx: ServiceContext,
  fields: readonly DeckEnrichField[],
  instructions: string | null | undefined,
) {
  track(ctx.analytics, {
    name: "deck_enrichment_changed",
    meaning: fields.includes("meaning"),
    example: fields.includes("example"),
    notes: fields.includes("notes"),
    pronunciation: fields.includes("pronunciation"),
    has_instructions: !!instructions?.trim(),
  });
}

/** Archive, never delete. The cards stay put; the deck leaves every list until restored. */
export async function archiveDeck(ctx: ServiceContext, id: string) {
  return setDeckArchived(ctx, id, new Date());
}
export async function restoreDeck(ctx: ServiceContext, id: string) {
  return setDeckArchived(ctx, id, null);
}

async function setDeckArchived(ctx: ServiceContext, id: string, archivedAt: Date | null) {
  const { db } = ctx;
  const deck = await ownedDeck(ctx, id);
  // Already there changes nothing, so a replayed archive neither moves the date nor logs twice.
  if ((deck.archivedAt === null) === (archivedAt === null)) return { ok: true as const };
  const result = await db
    .update(schema.decks)
    .set({ archivedAt, updatedAt: new Date() })
    .where(eq(schema.decks.id, id))
    .returning({ id: schema.decks.id });
  if (result.length === 0) throw notFound("Deck");
  await audit(ctx, { entity: "deck", action: archivedAt ? "archive" : "restore", id });
  return { ok: true as const };
}
