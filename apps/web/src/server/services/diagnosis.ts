import {
  type CardDiagnosisOut,
  Diagnosis,
  dayWindow,
  effectiveModes,
  modesFromDirections,
  newId,
} from "@lymi/core";
import { and, eq, inArray, isNull, lt, ne, or, sql } from "@lymi/core/db";
import type { Card, Deck } from "@lymi/core/schema";
import type { TextProvider } from "../ai";
import { type Db, schema } from "../db";
import {
  type DiagnosisCard,
  type DiagnosisInput,
  diagnosisRequest,
  readReply,
  settle,
} from "../diagnosis/prompt";
import { type AnalyticsWriter, track } from "./analytics";
import { auditStatement } from "./audit";
import { selectIn } from "./batch";
import { editionText, inEdition, presentCard } from "./card-view";
import { getCard } from "./cards";
import type { ServiceContext } from "./context";
import { pinnedEditions } from "./editions";
import { chunked } from "./enrichment";
import { memberOf } from "./members";
import { reviewZone } from "./review-days";
import { getSettings } from "./settings";
import { slippingCardIds } from "./slipping";

/** Cards one draw may hand over. The rest wait for the next draw, so a backlog never lands at once. */
export const DIAGNOSES_PER_RUN = 20;

/** Neighbours from the card's deck, nearest in when they were added, so a lesson's own cards come first. */
const DECK_SAMPLE = 12;

/** The learner's other often-forgotten cards the model may pair the card with. */
const OFTEN_FORGOTTEN_SAMPLE = 20;

/** What one background diagnosis run works on: rows already written as `working`. */
export type DiagnoseRunParams = {
  userId: string;
  diagnosisIds: string[];
};

/** The workflow binding, narrowed to what a draw needs from it. */
export type DiagnosisQueue = {
  create(options: { id: string; params: DiagnoseRunParams }): Promise<unknown>;
};

/** Where a draw hands newly often-forgotten cards: the workflow, after the response has gone. */
export type DiagnosisRunner = {
  queue: DiagnosisQueue;
  defer(work: Promise<unknown>): void;
};

/**
 * The runner, or null where no text vendor is configured, so a Worker without an OpenAI key
 * writes no row and queues nothing.
 */
export function diagnosisRunner(
  env: { OPENAI_API_KEY?: string | undefined; DIAGNOSE_WORKFLOW?: DiagnosisQueue | undefined },
  defer: (work: Promise<unknown>) => void,
): DiagnosisRunner | null {
  return env.OPENAI_API_KEY?.trim() && env.DIAGNOSE_WORKFLOW
    ? { queue: env.DIAGNOSE_WORKFLOW, defer }
    : null;
}

/** A diagnosis is the AI's write, so it lands in the audit log under that actor. */
export function diagnosisContext(
  db: Db,
  userId: string,
  analytics?: AnalyticsWriter,
): ServiceContext {
  return { db, userId, actor: "ai", analytics };
}

/** A failed diagnosis may be tried again after this long, so one outage does not block a revision. */
export const DIAGNOSIS_RETRY_MS = 86_400_000;

/**
 * Queue a diagnosis for each often-forgotten card whose current revision has none, or only one
 * that failed over a day ago. Only rows this call inserted or moved back to `working` are
 * queued, so two draws racing queue a card once. Returns the diagnosis ids queued.
 */
export async function queueDiagnoses(
  ctx: ServiceContext,
  cardIds: readonly string[],
  queue: DiagnosisQueue,
  now = new Date(),
): Promise<string[]> {
  const { db, userId } = ctx;
  const staleFailure = and(
    eq(schema.cardDiagnoses.status, "failed"),
    lt(schema.cardDiagnoses.updatedAt, new Date(now.getTime() - DIAGNOSIS_RETRY_MS)),
  );
  const candidates = await selectIn([...new Set(cardIds)], (slice) =>
    db
      .select({
        id: schema.cards.id,
        revision: schema.cards.revision,
        diagnosisId: schema.cardDiagnoses.id,
      })
      .from(schema.cards)
      .leftJoin(
        schema.cardDiagnoses,
        and(
          eq(schema.cardDiagnoses.cardId, schema.cards.id),
          eq(schema.cardDiagnoses.userId, userId),
          eq(schema.cardDiagnoses.revision, schema.cards.revision),
        ),
      )
      .where(
        and(inArray(schema.cards.id, slice), or(isNull(schema.cardDiagnoses.id), staleFailure)),
      ),
  ).then((rows) => rows.slice(0, DIAGNOSES_PER_RUN));
  const ids: string[] = [];
  const retries = candidates.flatMap((card) => (card.diagnosisId ? [card.diagnosisId] : []));
  for (const slice of chunked(retries, 90)) {
    // The condition is checked again in the write, so a racing draw moves each row once.
    const reopened = await db
      .update(schema.cardDiagnoses)
      .set({ status: "working", updatedAt: now })
      .where(
        and(
          eq(schema.cardDiagnoses.userId, userId),
          inArray(schema.cardDiagnoses.id, slice),
          staleFailure,
        ),
      )
      .returning({ id: schema.cardDiagnoses.id });
    ids.push(...reopened.map((row) => row.id));
  }
  const undiagnosed = candidates.filter((card) => !card.diagnosisId);
  // Five columns a row, so a slice stays under D1's 100 bound parameters.
  for (const slice of chunked(undiagnosed, 15)) {
    const inserted = await db
      .insert(schema.cardDiagnoses)
      .values(
        slice.map((card) => ({ id: newId(), userId, cardId: card.id, revision: card.revision })),
      )
      .onConflictDoNothing()
      .returning({ id: schema.cardDiagnoses.id });
    ids.push(...inserted.map((row) => row.id));
  }
  if (ids.length === 0) return [];
  try {
    await queue.create({ id: `diagnose-${newId()}`, params: { userId, diagnosisIds: ids } });
  } catch {
    await failDiagnoses(db, userId, ids);
    return [];
  }
  return ids;
}

/**
 * Diagnose one queued card: read it with its neighbours, ask the model once, and store the
 * cause it clears the threshold with, or `unclear`. A row already settled, or a card archived
 * or edited since it was queued, is left for the next draw to queue afresh.
 */
export async function diagnoseCard(
  ctx: ServiceContext,
  diagnosisId: string,
  provider: TextProvider,
  now = new Date(),
): Promise<Diagnosis | null> {
  const { db, userId } = ctx;
  const [row] = await db
    .select({ diagnosis: schema.cardDiagnoses, card: schema.cards, deck: schema.decks })
    .from(schema.cardDiagnoses)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.cardDiagnoses.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .where(
      and(
        eq(schema.cardDiagnoses.id, diagnosisId),
        eq(schema.cardDiagnoses.userId, userId),
        eq(schema.cardDiagnoses.status, "working"),
        memberOf(userId),
      ),
    );
  if (!row) return null;
  const { card, deck } = row;
  if (card.archivedAt || deck.archivedAt || card.revision !== row.diagnosis.revision) {
    await failDiagnoses(db, userId, [diagnosisId]);
    return null;
  }

  const input = await diagnosisInput(ctx, card, deck, now);
  const proposal = readReply(await provider.complete(diagnosisRequest(input)), input);
  // Structured outputs make this rare; throwing lets the workflow step retry.
  if (!proposal) throw new Error("The diagnosis reply did not parse");
  const diagnosis = settle(proposal);
  await db.batch([
    db
      .update(schema.cardDiagnoses)
      .set({
        status: "done",
        cause: diagnosis.cause,
        proposedCause: proposal.proposedCause,
        confidence: proposal.confidence,
        draft: diagnosis.draft,
        model: provider.model,
        updatedAt: now,
      })
      .where(
        and(eq(schema.cardDiagnoses.id, diagnosisId), eq(schema.cardDiagnoses.status, "working")),
      ),
    auditStatement(ctx, {
      entity: "diagnosis",
      action: "create",
      id: diagnosisId,
      details: {
        cardId: card.id,
        revision: card.revision,
        cause: diagnosis.cause,
        confidence: proposal.confidence,
      },
    }),
  ]);
  track(ctx.analytics, { name: "diagnosis_finished", outcome: diagnosis.cause });
  return diagnosis;
}

/** Rows a run gives up on end at `failed`; only one still `working` moves. */
export async function failDiagnoses(db: Db, userId: string, diagnosisIds: readonly string[]) {
  for (const slice of chunked(diagnosisIds, 90)) {
    await db
      .update(schema.cardDiagnoses)
      .set({ status: "failed", updatedAt: new Date() })
      .where(
        and(
          eq(schema.cardDiagnoses.userId, userId),
          inArray(schema.cardDiagnoses.id, slice),
          eq(schema.cardDiagnoses.status, "working"),
        ),
      );
  }
}

/**
 * What the model reads: the card as this learner sees it, its deck's nearest neighbours so the
 * deck's own format shows, and the learner's other often-forgotten cards so a pair can be named.
 */
async function diagnosisInput(
  ctx: ServiceContext,
  card: Card,
  deck: Deck,
  now: Date,
): Promise<DiagnosisInput> {
  const { db, userId } = ctx;
  const day = dayWindow(now, await reviewZone(ctx));
  const [settings, pinned, neighbours, others] = await Promise.all([
    getSettings(ctx),
    pinnedEditions(db, userId, [deck.id]),
    db
      .select()
      .from(schema.cards)
      .where(
        and(
          eq(schema.cards.deckId, deck.id),
          ne(schema.cards.id, card.id),
          isNull(schema.cards.archivedAt),
        ),
      )
      .orderBy(sql`abs(${schema.cards.createdAt} - ${card.createdAt.getTime()})`, schema.cards.id)
      .limit(DECK_SAMPLE),
    db
      .select({ card: schema.cards })
      .from(schema.cards)
      .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
      .where(
        and(
          inArray(schema.cards.id, slippingCardIds(ctx, day)),
          ne(schema.cards.id, card.id),
          memberOf(userId),
        ),
      )
      .orderBy(schema.cards.id)
      .limit(OFTEN_FORGOTTEN_SAMPLE)
      .then((rows) => rows.map((row) => row.card)),
  ]);
  // Read through the learner's edition, so the model sees the words on their screen.
  const editions = await editionText(db, userId, [card, ...neighbours, ...others]);
  const seen = (row: Card): DiagnosisCard => {
    const { id, term, meaning } = inEdition(row, editions.get(row.id));
    return { id, term, meaning };
  };
  const own = inEdition(card, editions.get(card.id));
  return {
    meaningLanguage: pinned.get(deck.id) ?? settings.meaningLanguage,
    card: {
      ...seen(card),
      example: own.example,
      notes: own.notes,
      language: card.language,
      asked: card.directions
        ? effectiveModes(card.directions, card.reviewModeKeys)
        : modesFromDirections(deck.directions),
    },
    deck: { name: deck.name, cards: neighbours.map(seen) },
    oftenForgotten: others.map(seen),
  };
}

/** The reader's diagnosis of the card's current revision, once it has landed. */
export async function currentDiagnosis(
  { db, userId }: ServiceContext,
  card: Pick<Card, "id" | "revision">,
): Promise<CardDiagnosisOut | null> {
  const [row] = await db
    .select()
    .from(schema.cardDiagnoses)
    .where(
      and(
        eq(schema.cardDiagnoses.userId, userId),
        eq(schema.cardDiagnoses.cardId, card.id),
        eq(schema.cardDiagnoses.revision, card.revision),
        eq(schema.cardDiagnoses.status, "done"),
      ),
    );
  if (!row || row.confidence === null || !row.model) return null;
  const finding = Diagnosis.safeParse({ cause: row.cause, draft: row.draft });
  if (!finding.success) return null;
  return {
    id: row.id,
    ...finding.data,
    confidence: row.confidence,
    model: row.model,
    diagnosedAt: row.updatedAt.toISOString(),
  };
}

/** One card as a single read returns it, with the reader's own diagnosis of it. */
export async function showCardWithDiagnosis(ctx: ServiceContext, id: string) {
  const card = await getCard(ctx, id);
  const [view, diagnosis] = await Promise.all([
    presentCard(ctx.db, card, ctx.userId),
    currentDiagnosis(ctx, card),
  ]);
  return { ...view, diagnosis };
}
