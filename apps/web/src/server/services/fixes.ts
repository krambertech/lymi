import {
  type AppliedFix,
  CARD_LIMITS,
  Diagnosis,
  type FieldSource,
  type FixInput,
  newId,
  OFFERED_CAUSES,
  type ReviewOfferOut,
  SLIPPING_FORGOTTEN_DAYS,
} from "@lymi/core";
import { and, asc, eq, gt, inArray, isNotNull, isNull } from "@lymi/core/db";
import type { Card, CardDiagnosis } from "@lymi/core/schema";
import { schema } from "../db";
import { auditStatement } from "./audit";
import { runBatch, type Statement, selectIn } from "./batch";
import { type CardView, editionText, inEdition, presentCard } from "./card-view";
import {
  type AddCardOutcome,
  addCards,
  archiveCards,
  getCard,
  type ServerCardPatch,
  updateCard,
} from "./cards";
import { notFound, type ServiceContext, ServiceError } from "./context";
import { dateFormatter } from "./days";
import type { EnrichmentQueue } from "./enrichment";
import { memberOf } from "./members";

const offered = new Set<string>(OFFERED_CAUSES);

/**
 * The fixes to offer with these cards: each often-forgotten card the learner owns whose current
 * revision has a diagnosis review has not shown yet. A member of a shared deck cannot change the
 * card, so gets none. After one offer, the card has to slip again before review shows another,
 * so a fix just accepted, or an edit just made, is not second-guessed at the next review.
 */
export async function reviewOffers(
  ctx: ServiceContext,
  cards: readonly Card[],
  slipping: ReadonlySet<string>,
  zone: string,
): Promise<Map<string, ReviewOfferOut>> {
  const { db, userId } = ctx;
  const owned = new Map(
    cards
      .filter((card) => card.userId === userId && slipping.has(card.id) && !card.archivedAt)
      .map((card) => [card.id, card]),
  );
  const offers = new Map<string, ReviewOfferOut>();
  if (owned.size === 0) return offers;
  const rows = await selectIn([...owned.keys()], (slice) =>
    db
      .select()
      .from(schema.cardDiagnoses)
      .where(
        and(
          eq(schema.cardDiagnoses.userId, userId),
          inArray(schema.cardDiagnoses.cardId, slice),
          eq(schema.cardDiagnoses.status, "done"),
        ),
      ),
  );
  const current = new Map<string, { row: CardDiagnosis; diagnosis: Diagnosis }>();
  const lastOffered = new Map<string, Date>();
  for (const row of rows) {
    const card = owned.get(row.cardId);
    if (!card) continue;
    if (row.revision !== card.revision) {
      const before = lastOffered.get(row.cardId);
      if (row.offeredAt && (!before || row.offeredAt > before)) {
        lastOffered.set(row.cardId, row.offeredAt);
      }
      continue;
    }
    if (row.offeredAt || !row.cause || !offered.has(row.cause)) continue;
    // A hook the learner already wrote is the fix this cause would draft.
    if (row.cause === "no_anchor" && card.hook) continue;
    const finding = Diagnosis.safeParse({ cause: row.cause, draft: row.draft });
    if (finding.success) current.set(row.cardId, { row, diagnosis: finding.data });
  }
  const again = await slippedSince(ctx, lastOffered, zone);
  const others = await otherCards(
    ctx,
    [...current.values()].flatMap(({ diagnosis }) =>
      diagnosis.cause === "confused_pair" ? [diagnosis.draft.otherCardId] : [],
    ),
  );
  for (const [cardId, { row, diagnosis }] of current) {
    if (lastOffered.has(cardId) && !again.has(cardId)) continue;
    if (diagnosis.cause !== "confused_pair") {
      offers.set(cardId, { diagnosisId: row.id, ...diagnosis });
      continue;
    }
    const other = others.get(diagnosis.draft.otherCardId);
    // The pair is named by the other card, so one archived since leaves nothing to show.
    if (other) offers.set(cardId, { diagnosisId: row.id, ...diagnosis, other });
  }
  return offers;
}

/** Cards whose first grade was Forgot on enough days since review last offered a fix for them. */
async function slippedSince(ctx: ServiceContext, since: ReadonlyMap<string, Date>, zone: string) {
  const again = new Set<string>();
  if (since.size === 0) return again;
  const earliest = new Date(Math.min(...[...since.values()].map((at) => at.getTime())));
  const reviews = await selectIn([...since.keys()], (slice) =>
    ctx.db
      .select({
        cardId: schema.reviews.cardId,
        rating: schema.reviews.rating,
        at: schema.reviews.reviewedAt,
      })
      .from(schema.reviews)
      .leftJoin(schema.reviewUndos, eq(schema.reviewUndos.reviewId, schema.reviews.id))
      .where(
        and(
          eq(schema.reviews.userId, ctx.userId),
          inArray(schema.reviews.cardId, slice),
          gt(schema.reviews.reviewedAt, earliest),
          isNull(schema.reviewUndos.reviewId),
        ),
      )
      .orderBy(asc(schema.reviews.reviewedAt)),
  );
  const fmt = dateFormatter(zone);
  const firsts = new Map<string, Map<string, number>>();
  for (const review of reviews) {
    const after = since.get(review.cardId);
    if (!after || review.at <= after) continue;
    const days = firsts.get(review.cardId) ?? new Map<string, number>();
    const date = fmt.format(review.at);
    if (!days.has(date)) days.set(date, review.rating);
    firsts.set(review.cardId, days);
  }
  for (const [cardId, days] of firsts) {
    const forgotten = [...days.values()].filter((rating) => rating === 1).length;
    if (forgotten >= SLIPPING_FORGOTTEN_DAYS) again.add(cardId);
  }
  return again;
}

/** The cards a pair names, as the learner reads them: active, visible, in their edition. */
async function otherCards(ctx: ServiceContext, ids: readonly string[]) {
  const { db, userId } = ctx;
  const rows = await selectIn([...new Set(ids)], (slice) =>
    db
      .select({ card: schema.cards })
      .from(schema.cards)
      .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
      .where(
        and(
          inArray(schema.cards.id, slice),
          memberOf(userId),
          isNull(schema.cards.archivedAt),
          isNull(schema.decks.archivedAt),
        ),
      ),
  );
  const cards = rows.map((row) => row.card);
  const editions = await editionText(db, userId, cards);
  return new Map(
    cards.map((card) => {
      const seen = inEdition(card, editions.get(card.id));
      return [
        card.id,
        { id: card.id, term: seen.term, meaning: seen.meaning, language: card.language },
      ];
    }),
  );
}

/** The learner's own diagnosis, or not found. */
async function ownDiagnosis({ db, userId }: ServiceContext, id: string) {
  const [row] = await db
    .select()
    .from(schema.cardDiagnoses)
    .where(and(eq(schema.cardDiagnoses.id, id), eq(schema.cardDiagnoses.userId, userId)));
  if (!row) throw notFound("Diagnosis");
  return row;
}

/** Review showed the fix. It is not offered again for this revision; it waits for the learner. */
export async function markOffered(ctx: ServiceContext, id: string, now = new Date()) {
  const { db, userId } = ctx;
  const row = await ownDiagnosis(ctx, id);
  if (row.offeredAt) return;
  await db.batch([
    db
      .update(schema.cardDiagnoses)
      .set({ offeredAt: now, updatedAt: now })
      .where(
        and(
          eq(schema.cardDiagnoses.id, id),
          eq(schema.cardDiagnoses.userId, userId),
          isNull(schema.cardDiagnoses.offeredAt),
        ),
      ),
    auditStatement(ctx, {
      entity: "diagnosis",
      action: "offer",
      id,
      details: { cardId: row.cardId, revision: row.revision },
    }),
  ]);
}

/** Drafted text the learner left alone is the AI's; anything they changed is theirs. */
const sourceOf = (drafted: string, accepted: string): FieldSource =>
  drafted === accepted ? "ai" : "manual";

/** The card writes one fix made, and what Undo needs to reverse them. */
type Written = { applied: AppliedFix; outcomes: AddCardOutcome[] };

/**
 * Apply a diagnosis's fix to the card it is about, through the ordinary card services, so the
 * duplicate rule, the revision and enrichment behave as for any add or edit. Only the card's
 * owner accepts, and only while the card still reads as it did when diagnosed.
 */
export async function acceptFix(
  ctx: ServiceContext,
  id: string,
  input: FixInput,
  enrichment: EnrichmentQueue | null,
  now = new Date(),
): Promise<FixResult> {
  const { db, userId } = ctx;
  const row = await ownDiagnosis(ctx, id);
  const card = await getCard(ctx, row.cardId);
  if (card.userId !== userId) {
    throw new ServiceError("forbidden", "Only the deck's owner can change its cards");
  }
  if (card.archivedAt) throw new ServiceError("conflict", "This card is archived");
  if (row.status !== "done" || row.revision !== card.revision) {
    throw new ServiceError("conflict", "This card has changed since Lymi looked at it");
  }
  const finding = Diagnosis.safeParse({ cause: row.cause, draft: row.draft });
  const diagnosis = finding.success ? finding.data : null;
  const cause = diagnosis?.cause;
  // With no clear reason there is no draft to accept, but the learner may write their own hook.
  if (
    !diagnosis ||
    (cause !== input.cause && !(cause === "unclear" && input.cause === "no_anchor"))
  ) {
    throw new ServiceError("invalid", "This card's diagnosis drafted a different fix");
  }

  const mine = and(eq(schema.cardDiagnoses.id, id), eq(schema.cardDiagnoses.userId, userId));
  // Claimed before anything is written, so two accepts racing apply the fix once.
  const [claimed] = await db
    .update(schema.cardDiagnoses)
    .set({ acceptedAt: now, updatedAt: now })
    .where(and(mine, isNull(schema.cardDiagnoses.acceptedAt)))
    .returning({ id: schema.cardDiagnoses.id });
  if (!claimed) throw new ServiceError("conflict", "This fix is already on the card");

  let written: Written | null = null;
  try {
    written = await applyFix(ctx, card, diagnosis, input, enrichment);
    await db.batch([
      db
        .update(schema.cardDiagnoses)
        .set({ offeredAt: row.offeredAt ?? now, fix: written.applied, updatedAt: now })
        .where(mine),
      auditStatement(ctx, {
        entity: "diagnosis",
        action: "accept",
        id,
        details: { cardId: card.id, cause: input.cause, ...written.applied },
      }),
    ]);
  } catch (error) {
    // The fix and its record land together or not at all.
    if (written) await reverse(ctx, written.applied);
    await db
      .update(schema.cardDiagnoses)
      .set({ acceptedAt: null, fix: null, updatedAt: new Date() })
      .where(mine);
    throw error;
  }
  const { applied, outcomes } = written;
  return {
    added: outcomes.flatMap((o) => (o.status === "added" ? [o.card] : [])),
    edited: applied.edited ? await presentCard(db, await getCard(ctx, card.id), userId) : null,
    skipped: outcomes.flatMap((o) =>
      o.status === "skipped" ? [{ term: o.term, existingId: o.id, deckName: o.deckName }] : [],
    ),
  };
}

async function applyFix(
  ctx: ServiceContext,
  card: Card,
  diagnosis: Diagnosis,
  input: FixInput,
  enrichment: EnrichmentQueue | null,
): Promise<Written> {
  const place = { deckId: card.deckId, sectionId: card.sectionId, language: card.language };

  if (diagnosis.cause === "confused_pair" && input.cause === "confused_pair") {
    const [first, second] = input.cards;
    const [draftFirst, draftSecond] = diagnosis.draft.cards;
    const outcomes = await addCards(
      ctx,
      [
        {
          ...place,
          term: first.term,
          meaning: first.meaning,
          meaningSource: sourceOf(draftFirst.meaning, first.meaning),
        },
        {
          ...place,
          term: second.term,
          meaning: second.meaning,
          meaningSource: sourceOf(draftSecond.meaning, second.meaning),
        },
      ],
      enrichment,
    );
    return { applied: { added: addedIds(outcomes), edited: null }, outcomes };
  }

  if (diagnosis.cause === "two_things" && input.cause === "two_things") {
    const [first, second] = input.cards;
    const [draftFirst, draftSecond] = diagnosis.draft.cards;
    const view = await presentCard(ctx.db, card, ctx.userId);
    const textModes = view.reviewModes?.filter((mode) => mode.cue !== "image");
    // The second part came from the same lesson, so it keeps the card's source and tags.
    const outcomes = await addCards(
      ctx,
      [
        {
          ...place,
          term: second.term,
          meaning: second.meaning,
          meaningSource: sourceOf(draftSecond.meaning, second.meaning),
          tags: card.tags,
          ...(card.source ? { source: card.source } : {}),
          ...(textModes?.length ? { reviewModes: textModes } : {}),
        },
      ],
      enrichment,
    );
    const added = addedIds(outcomes);
    // A new term makes the old pronunciation wrong; enrichment can write the new one.
    const retermed = first.term !== card.term;
    try {
      await updateCard(ctx, card.id, {
        term: first.term,
        meaning: first.meaning,
        meaningSource: sourceOf(draftFirst.meaning, first.meaning),
        ...(retermed ? { pronunciation: null, pronunciationSource: null } : {}),
      });
    } catch (error) {
      // The two halves land together or not at all.
      if (added.length) await archiveCards(ctx, added);
      throw error;
    }
    return {
      applied: {
        added,
        edited: {
          cardId: card.id,
          before: {
            term: card.term,
            meaning: card.meaning,
            meaningSource: card.meaningSource,
            ...(retermed
              ? { pronunciation: card.pronunciation, pronunciationSource: card.pronunciationSource }
              : {}),
          },
        },
      },
      outcomes,
    };
  }

  if (diagnosis.cause === "several_answers" && input.cause === "several_answers") {
    const { field } = diagnosis.draft;
    if (field === "term" && input.text.length > CARD_LIMITS.term) {
      throw new ServiceError("invalid", `Keep the term under ${CARD_LIMITS.term} characters.`);
    }
    const patch: ServerCardPatch =
      field === "term"
        ? { term: input.text }
        : { meaning: input.text, meaningSource: sourceOf(diagnosis.draft.text, input.text) };
    await updateCard(ctx, card.id, patch);
    return {
      applied: {
        added: [],
        edited: {
          cardId: card.id,
          before:
            field === "term"
              ? { term: card.term }
              : { meaning: card.meaning, meaningSource: card.meaningSource },
        },
      },
      outcomes: [],
    };
  }

  if (input.cause === "no_anchor") {
    const drafted = diagnosis.cause === "no_anchor" ? diagnosis.draft.hook : null;
    await updateCard(ctx, card.id, {
      hook: input.hook,
      hookSource: drafted === null ? "manual" : sourceOf(drafted, input.hook),
    });
    return {
      applied: {
        added: [],
        edited: { cardId: card.id, before: { hook: card.hook, hookSource: card.hookSource } },
      },
      outcomes: [],
    };
  }

  throw new ServiceError("invalid", "This card's diagnosis drafted a different fix");
}

/** What accepting wrote, as `FixOut` sends it. */
export type FixResult = {
  added: CardView[];
  edited: CardView | null;
  skipped: { term: string; existingId: string; deckName: string }[];
};

const addedIds = (outcomes: AddCardOutcome[]) =>
  outcomes.flatMap((o) => (o.status === "added" ? [o.id] : []));

/** Archive the cards a fix added and write back the text it replaced. */
async function reverse(ctx: ServiceContext, applied: AppliedFix) {
  if (applied.added.length) await archiveCards(ctx, applied.added);
  if (applied.edited) await updateCard(ctx, applied.edited.cardId, applied.edited.before);
}

/**
 * Reverse an accepted fix exactly: archive the cards it added and put back what it changed.
 * The diagnosis stays offered, so it waits for the learner rather than coming back in review.
 * Undoing twice changes nothing; undoing a fix still being applied is a conflict.
 */
export async function undoFix(ctx: ServiceContext, id: string, now = new Date()) {
  const { db, userId } = ctx;
  const row = await ownDiagnosis(ctx, id);
  if (!row.acceptedAt) return;
  const applied = row.fix;
  if (!applied) throw new ServiceError("conflict", "This fix is still being applied");
  await reverse(ctx, applied);
  let carried: Statement | null = null;
  if (applied.edited) {
    const card = await getCard(ctx, applied.edited.cardId);
    // The words are back to the ones diagnosed, so the diagnosis carries to the new revision.
    if (card.revision !== row.revision) {
      carried = db
        .insert(schema.cardDiagnoses)
        .values({
          ...row,
          id: newId(),
          revision: card.revision,
          acceptedAt: null,
          fix: null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
    }
  }
  await runBatch(db, [
    db
      .update(schema.cardDiagnoses)
      .set({ acceptedAt: null, fix: null, updatedAt: now })
      .where(
        and(
          eq(schema.cardDiagnoses.id, id),
          eq(schema.cardDiagnoses.userId, userId),
          isNotNull(schema.cardDiagnoses.acceptedAt),
        ),
      ),
    ...(carried ? [carried] : []),
    auditStatement(ctx, {
      entity: "diagnosis",
      action: "undo_accept",
      id,
      details: { cardId: row.cardId, ...applied },
    }),
  ]);
}
