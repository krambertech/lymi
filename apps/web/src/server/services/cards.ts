import type { CardInput, CardPatch } from "@lymi/core";
import { emptyState, expandDirections, newId, normaliseTerm, serializeState } from "@lymi/core";
import { and, eq, inArray, isNull } from "@lymi/core/db";
import type { Card } from "@lymi/core/schema";
import { audit } from "../audit";
import { schema } from "../db";
import { notFound, type ServiceContext } from "./context";

/**
 * What happened to one card in an add. A duplicate is skipped, never rejected, and the
 * caller learns which card already holds the term and in which deck. See ADR 0004.
 */
export type AddCardOutcome =
  | { status: "added"; card: Card }
  | { status: "skipped"; term: string; existing: Card; deckName: string };

/** One card. Same rule as the batch, one outcome. */
export async function addCard(ctx: ServiceContext, input: CardInput): Promise<AddCardOutcome> {
  const [outcome] = await addCards(ctx, [input]);
  if (!outcome) throw new Error("addCards returned no outcome for one input");
  return outcome;
}

/**
 * Add one or many cards. Each gets its scheduling state rows. Duplicates, against the
 * learner's active cards and against earlier cards in the same batch, are skipped and
 * reported. Order of outcomes matches order of inputs.
 */
export async function addCards(
  ctx: ServiceContext,
  inputs: CardInput[],
): Promise<AddCardOutcome[]> {
  const { db, userId, actor } = ctx;
  if (inputs.length === 0) return [];

  const deckIds = [...new Set(inputs.map((i) => i.deckId))];
  const decks = await selectIn(deckIds, (ids) =>
    db
      .select({
        id: schema.decks.id,
        name: schema.decks.name,
        defaultLanguage: schema.decks.defaultLanguage,
        directions: schema.decks.directions,
      })
      .from(schema.decks)
      .where(and(inArray(schema.decks.id, ids), eq(schema.decks.userId, userId))),
  );
  const deckById = new Map(decks.map((d) => [d.id, d]));

  // Resolve language and key per input, then look up every key in one query.
  const prepared = inputs.map((input) => {
    const deck = deckById.get(input.deckId);
    if (!deck) throw notFound("Deck");
    const language = input.language === undefined ? deck.defaultLanguage : input.language;
    return { input, deck, language, key: normaliseTerm(input.term) };
  });

  const existingRows = await selectIn([...new Set(prepared.map((p) => p.key))], (keys) =>
    db
      .select({ card: schema.cards, deckName: schema.decks.name })
      .from(schema.cards)
      .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
      .where(
        and(
          eq(schema.cards.userId, userId),
          isNull(schema.cards.archivedAt),
          inArray(schema.cards.normalizedTerm, keys),
        ),
      ),
  );
  const existing = new Map<string, { card: Card; deckName: string }>();
  for (const row of existingRows) {
    existing.set(dupKey(row.card.language, row.card.normalizedTerm), row);
  }

  const now = new Date();
  const outcomes: AddCardOutcome[] = [];
  const statements = [];

  for (const { input, deck, language, key } of prepared) {
    const hit = existing.get(dupKey(language, key));
    if (hit) {
      outcomes.push({
        status: "skipped",
        term: input.term,
        existing: hit.card,
        deckName: hit.deckName,
      });
      continue;
    }
    const id = newId();
    const card: Card = {
      id,
      userId,
      deckId: input.deckId,
      term: input.term,
      normalizedTerm: key,
      meaning: input.meaning ?? null,
      pronunciation: input.pronunciation ?? null,
      example: input.example ?? null,
      notes: input.notes ?? null,
      language,
      tags: input.tags ?? [],
      source: input.source ?? null,
      directions: input.directions ?? null,
      meaningSource: input.meaningSource ?? (input.meaning ? "manual" : null),
      exampleSource: input.exampleSource ?? (input.example ? "manual" : null),
      audioKey: null,
      createdBy: actor,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    statements.push(db.insert(schema.cards).values(card));
    for (const direction of expandDirections(input.directions ?? deck.directions)) {
      statements.push(
        db.insert(schema.cardStates).values({
          id: newId(),
          cardId: id,
          userId,
          direction,
          due: now,
          state: 0,
          fsrs: serializeState(emptyState(now)),
        }),
      );
    }
    statements.push(
      db.insert(schema.auditLog).values({
        id: newId(),
        userId,
        actor,
        action: "create",
        entity: "card",
        entityId: id,
        payload: input,
      }),
    );
    // Later inputs in this batch with the same key are duplicates of this one.
    existing.set(dupKey(language, key), { card, deckName: deck.name });
    outcomes.push({ status: "added", card });
  }

  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);

  return outcomes;
}

/**
 * D1 allows 100 bound parameters per query and a lesson can be 200 terms, so `IN (...)`
 * lists are queried in slices. Returns every row across the slices.
 */
async function selectIn<T, R>(values: T[], select: (slice: T[]) => Promise<R[]>): Promise<R[]> {
  const size = 90;
  const rows: R[] = [];
  for (let i = 0; i < values.length; i += size) {
    rows.push(...(await select(values.slice(i, i + size))));
  }
  return rows;
}

/** A card with no language only matches other cards with no language. */
function dupKey(language: string | null, normalizedTerm: string): string {
  return `${language ?? ""} ${normalizedTerm}`;
}

export async function getCard({ db, userId }: ServiceContext, id: string) {
  const [card] = await db
    .select()
    .from(schema.cards)
    .where(and(eq(schema.cards.id, id), eq(schema.cards.userId, userId)));
  if (!card) throw notFound("Card");
  return card;
}

export async function updateCard(ctx: ServiceContext, id: string, patch: CardPatch) {
  const { db, userId, actor } = ctx;
  const current = await getCard(ctx, id);
  if (patch.deckId && patch.deckId !== current.deckId) {
    const [deck] = await db
      .select({ id: schema.decks.id })
      .from(schema.decks)
      .where(and(eq(schema.decks.id, patch.deckId), eq(schema.decks.userId, userId)));
    if (!deck) throw notFound("Deck");
  }
  // Always recompute the duplicate key, so a card whose stored key predates normaliseTerm()
  // (the 0002 backfill used SQLite's ASCII-only lower()) is repaired by any edit.
  const normalizedTerm = normaliseTerm(patch.term ?? current.term);
  await db
    .update(schema.cards)
    .set({ ...patch, normalizedTerm, updatedAt: new Date() })
    .where(eq(schema.cards.id, id));
  await audit(db, {
    userId,
    actor,
    action: "update",
    entity: "card",
    entityId: id,
    payload: patch,
  });
  return getCard(ctx, id);
}

/** Archive, never delete. Undo is `restoreCard`. */
export function archiveCard(ctx: ServiceContext, id: string) {
  return setArchived(ctx, id, new Date());
}

export function restoreCard(ctx: ServiceContext, id: string) {
  return setArchived(ctx, id, null);
}

async function setArchived(
  { db, userId, actor }: ServiceContext,
  id: string,
  archivedAt: Date | null,
) {
  const result = await db
    .update(schema.cards)
    .set({ archivedAt, updatedAt: new Date() })
    .where(and(eq(schema.cards.id, id), eq(schema.cards.userId, userId)))
    .returning({ id: schema.cards.id });
  if (result.length === 0) throw notFound("Card");
  await audit(db, {
    userId,
    actor,
    action: archivedAt ? "archive" : "restore",
    entity: "card",
    entityId: id,
  });
}
