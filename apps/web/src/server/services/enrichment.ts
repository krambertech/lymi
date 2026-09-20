import {
  CARD_LIMITS,
  ENRICHED_FIELDS,
  type EnrichedField,
  LanguageTag,
  newId,
  unsetFields,
} from "@lymi/core";
import { and, eq, inArray, isNull, or, type SQL, sql } from "@lymi/core/db";
import type { Card } from "@lymi/core/schema";
import { z } from "zod";
import type { TextProvider } from "../ai";
import { type Db, schema } from "../db";
import { type AnalyticsWriter, track } from "./analytics";
import { auditStatement } from "./audit";
import { selectIn } from "./batch";
import type { ServiceContext } from "./context";
import { getSettings } from "./settings";

/** Cards per model call. A lesson lands in waves rather than all at once. */
export const CARDS_PER_CALL = 10;

/** `LanguageTag`'s own ceiling, so an over-long tag is dropped before it reaches the parse. */
const LANGUAGE_MAX = 12;

/** What a background enrichment run works on. One run per add. */
export type EnrichRunParams = {
  userId: string;
  cardIds: string[];
};

/** Enrichment acts as the AI, so every fill lands in Activity under that actor. */
export function enrichmentContext(
  db: Db,
  params: EnrichRunParams,
  analytics?: AnalyticsWriter,
): ServiceContext {
  return { db, userId: params.userId, actor: "ai", analytics };
}

type Fillable = Pick<Card, EnrichedField>;

/** Split a list into runs of `size`, keeping order, so the first cards fill before the last. */
export function chunked<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** What one card's model reply may carry. Every key is present; null means the model had nothing. */
const Filled = z.object({
  id: z.string(),
  meaning: z.string().max(CARD_LIMITS.meaning).nullable().catch(null),
  example: z.string().max(CARD_LIMITS.example).nullable().catch(null),
  pronunciation: z.string().max(CARD_LIMITS.pronunciation).nullable().catch(null),
  language: z.string().max(LANGUAGE_MAX).nullable().catch(null),
});
type Filled = z.infer<typeof Filled>;

const Reply = z.object({ cards: z.array(Filled) });

const REPLY_SCHEMA = {
  name: "enriched_cards",
  schema: {
    type: "object",
    properties: {
      cards: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            meaning: { type: ["string", "null"], maxLength: CARD_LIMITS.meaning },
            example: { type: ["string", "null"], maxLength: CARD_LIMITS.example },
            pronunciation: { type: ["string", "null"], maxLength: CARD_LIMITS.pronunciation },
            language: { type: ["string", "null"], maxLength: LANGUAGE_MAX },
          },
          required: ["id", "meaning", "example", "pronunciation", "language"],
          additionalProperties: false,
        },
      },
    },
    required: ["cards"],
    additionalProperties: false,
  },
} as const;

/** What enrichment writes to one card: the empty fields it filled, and the `ai` label on each. */
export type EnrichmentWrite = {
  meaning?: string;
  meaningSource?: "ai";
  example?: string;
  exampleSource?: "ai";
  pronunciation?: string;
  pronunciationSource?: "ai";
  language?: string;
};

/**
 * The write for one card: only fields never set, only values the model gave, each
 * text field labelled `ai`. Language carries no source, because nothing in the interface
 * reads a language tag as lesson content.
 */
export function enrichmentWrite(card: Fillable, filled: Filled): EnrichmentWrite {
  const empty = new Set(unsetFields(card));
  const write: EnrichmentWrite = {};
  const meaning = filled.meaning?.trim();
  if (meaning && empty.has("meaning")) {
    write.meaning = meaning;
    write.meaningSource = "ai";
  }
  const example = filled.example?.trim();
  if (example && empty.has("example")) {
    write.example = example;
    write.exampleSource = "ai";
  }
  const pronunciation = filled.pronunciation?.trim();
  if (pronunciation && empty.has("pronunciation")) {
    write.pronunciation = pronunciation;
    write.pronunciationSource = "ai";
  }
  const language = filled.language?.trim();
  if (language && empty.has("language") && LanguageTag.safeParse(language).success) {
    write.language = language;
  }
  return write;
}

const INSTRUCTIONS =
  "You enrich vocabulary cards for one learner. Each card is a term in the language being learned. " +
  "For every card you are given, fill only the fields named in its `needs` list and return null for every other field. " +
  "meaning: a short definition in the learner's meaning language, no more than a sentence, no quotation marks around it. " +
  "example: one natural sentence using the term, written in the term's own language. " +
  "pronunciation: how the term is said, as IPA for a language written in the Latin or Cyrillic script, " +
  "and as the usual reading aid otherwise, such as pinyin, romaji or furigana. " +
  "language: the BCP 47 tag of the language the term is in, such as it, uk or pt-BR. " +
  "Return one entry per card, with the id you were given. Return null for a field you are not confident about rather than guessing.";

/** The model's reply for a run of cards, or an empty list when it answers with nothing usable. */
async function askProvider(
  provider: TextProvider,
  meaningLanguage: string,
  cards: readonly Card[],
): Promise<Filled[]> {
  const input = JSON.stringify({
    meaningLanguage,
    cards: cards.map((card) => ({
      id: card.id,
      term: card.term,
      language: card.language,
      meaning: card.meaning,
      needs: unsetFields(card),
    })),
  });
  const reply = Reply.safeParse(
    await provider.complete({ instructions: INSTRUCTIONS, input, schema: REPLY_SCHEMA }),
  );
  return reply.success ? reply.data.cards : [];
}

/** The source column that records who wrote a field. Language carries none. */
const SOURCE_COLUMN = {
  meaning: "meaningSource",
  example: "exampleSource",
  pronunciation: "pronunciationSource",
} as const;

/** Only a card of this learner's that is still waiting on this run. */
function stillWorking(userId: string, cardId: string): SQL {
  return and(
    eq(schema.cards.id, cardId),
    eq(schema.cards.userId, userId),
    eq(schema.cards.enrichmentStatus, "working"),
  ) as SQL;
}

/** True in SQL when the field was never set, so a clear made at any point before the write stands. */
function unsetColumn(field: EnrichedField): SQL {
  return isNull(schema.cards[field]);
}

/**
 * Which fields a run actually landed: the card holds the value this run wrote, and the field
 * says the AI wrote it. A guarded write that lost its race leaves the learner's text and their
 * own source, so it is not named.
 */
function landed(after: Card | undefined, write: EnrichmentWrite): EnrichedField[] {
  if (!after) return [];
  return ENRICHED_FIELDS.filter((field) => {
    const value = write[field];
    if (value === undefined || after[field] !== value) return false;
    return field === "language" || after[SOURCE_COLUMN[field]] === "ai";
  });
}

/**
 * Fill one run of cards and settle their status. The model takes seconds, so every write
 * carries its own test that the field is still unset: a learner who types into or clears a
 * shimmering field before the write keeps what they did, and the field stays theirs. Each card that gains a field
 * gets one audit row naming the fields that actually landed, which Activity renders as
 * "Enriched …".
 */
export async function enrichCards(
  ctx: ServiceContext,
  cardIds: readonly string[],
  provider: TextProvider,
): Promise<{ enriched: number }> {
  const { db, userId } = ctx;
  const before = await workingCards(db, userId, cardIds);
  if (before.length === 0) return { enriched: 0 };
  const { meaningLanguage } = await getSettings(ctx);
  const filled = new Map(
    (await askProvider(provider, meaningLanguage, before)).map((card) => [card.id, card]),
  );

  const now = new Date();
  const writes = [];
  const attempted = new Map<string, EnrichmentWrite>();
  for (const card of before) {
    const reply = filled.get(card.id);
    const write = reply ? enrichmentWrite(card, reply) : {};
    attempted.set(card.id, write);
    for (const field of ENRICHED_FIELDS) {
      const value = write[field];
      if (value === undefined) continue;
      const source = field === "language" ? {} : { [SOURCE_COLUMN[field]]: "ai" as const };
      // Filling an empty field is text an edition translates, so its localization goes stale.
      // The write is guarded by `unsetColumn`, so the revision only moves when the fill lands.
      const stale = field === "language" ? {} : { revision: sql`revision + 1` };
      writes.push(
        db
          .update(schema.cards)
          .set({ [field]: value, ...source, ...stale, updatedAt: now })
          .where(and(stillWorking(userId, card.id), unsetColumn(field))),
      );
    }
    // After that card's fields, so each write still sees `working`.
    writes.push(
      db.update(schema.cards).set({ enrichmentStatus: null }).where(stillWorking(userId, card.id)),
    );
  }
  const [firstWrite, ...restWrites] = writes;
  if (firstWrite) await db.batch([firstWrite, ...restWrites]);

  // Read back rather than trust the patch: a guarded write may have lost a race, and Activity
  // must name what the AI wrote, not what it tried to.
  const after = new Map(
    (
      await selectIn(
        before.map((card) => card.id),
        (ids) =>
          db
            .select()
            .from(schema.cards)
            .where(and(eq(schema.cards.userId, userId), inArray(schema.cards.id, ids))),
      )
    ).map((card) => [card.id, card]),
  );
  const rows = [];
  for (const card of before) {
    const fields = landed(after.get(card.id), attempted.get(card.id) ?? {});
    if (fields.length === 0) continue;
    rows.push(
      auditStatement(ctx, {
        entity: "card",
        action: "enrich",
        id: card.id,
        deckId: card.deckId,
        details: Object.fromEntries(fields.map((field) => [field, after.get(card.id)?.[field]])),
      }),
    );
  }
  const [firstRow, ...restRows] = rows;
  if (firstRow) await db.batch([firstRow, ...restRows]);
  track(ctx.analytics, {
    name: "enrichment_finished",
    outcome: rows.length ? "enriched" : "empty",
    count: rows.length,
  });
  return { enriched: rows.length };
}

/** A card whose run gives up ends at `failed`, so the screen stops waiting on it. */
export function failEnrichment(db: Db, userId: string, cardIds: readonly string[]) {
  return settle(db, userId, cardIds, "failed");
}

/** Clear the status without a fill, for a run that never reached a vendor. */
export function settleEnrichment(db: Db, userId: string, cardIds: readonly string[]) {
  return settle(db, userId, cardIds, null);
}

/** Only a card still waiting moves, so a fill that already landed is never undone. */
async function settle(db: Db, userId: string, cardIds: readonly string[], status: "failed" | null) {
  for (const slice of chunked(cardIds, 90)) {
    await db
      .update(schema.cards)
      .set({ enrichmentStatus: status })
      .where(
        and(
          eq(schema.cards.userId, userId),
          inArray(schema.cards.id, slice),
          eq(schema.cards.enrichmentStatus, "working"),
        ),
      );
  }
}

/** The learner's own active cards from the run that are still waiting on it. */
async function workingCards(db: Db, userId: string, cardIds: readonly string[]): Promise<Card[]> {
  return selectIn([...cardIds], (ids) =>
    db
      .select()
      .from(schema.cards)
      .where(
        and(
          eq(schema.cards.userId, userId),
          inArray(schema.cards.id, ids),
          isNull(schema.cards.archivedAt),
          eq(schema.cards.enrichmentStatus, "working"),
        ),
      ),
  );
}

/** The workflow binding, narrowed to what an add needs from it. */
export type EnrichmentQueue = {
  create(options: { id: string; params: EnrichRunParams }): Promise<unknown>;
};

/**
 * Hand one run to the workflow. True when it took it; false when it refused, in which case
 * the cards end at `failed` rather than shimmering for a run that will never start.
 */
export async function queueEnrichment(
  db: Db,
  userId: string,
  cardIds: string[],
  queue: EnrichmentQueue,
): Promise<boolean> {
  try {
    await queue.create({ id: `enrich-${newId()}`, params: { userId, cardIds } });
    return true;
  } catch {
    await failEnrichment(db, userId, cardIds);
    return false;
  }
}

/**
 * The queue, or null where no text vendor is configured, so an add on a Worker without an
 * OpenAI key leaves its cards exactly as they arrived.
 */
export function enrichmentQueue(env: {
  OPENAI_API_KEY?: string | undefined;
  ENRICH_WORKFLOW?: EnrichmentQueue | undefined;
}): EnrichmentQueue | null {
  return env.OPENAI_API_KEY?.trim() && env.ENRICH_WORKFLOW ? env.ENRICH_WORKFLOW : null;
}
