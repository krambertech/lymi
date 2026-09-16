import { LanguageTag } from "@lymi/core";
import { and, eq, inArray, isNull } from "@lymi/core/db";
import type { Card } from "@lymi/core/schema";
import { z } from "zod";
import type { TextProvider } from "../ai";
import { auditStatement } from "../audit";
import { type Db, schema } from "../db";
import { selectIn } from "./batch";
import type { ServiceContext } from "./context";
import { getSettings } from "./settings";

/** The fields enrichment may fill. Text already on a card is never overwritten, whatever wrote it. */
export const ENRICHED_FIELDS = ["meaning", "example", "pronunciation", "language"] as const;
export type EnrichedField = (typeof ENRICHED_FIELDS)[number];

/** Cards per model call. A lesson lands in waves rather than all at once. */
export const CARDS_PER_CALL = 10;

/** What a background enrichment run works on. One run per add. */
export type EnrichRunParams = {
  userId: string;
  cardIds: string[];
};

/** Enrichment acts as the AI, so every fill lands in Activity under that actor. */
export function enrichmentContext(db: Db, params: EnrichRunParams): ServiceContext {
  return { db, userId: params.userId, actor: "ai" };
}

type Fillable = Pick<Card, EnrichedField>;

/** Which of a card's enrichable fields hold no text. Whitespace is not text. */
export function emptyFields(card: Fillable): EnrichedField[] {
  return ENRICHED_FIELDS.filter((field) => !card[field]?.trim());
}

/** True when a card has at least one empty field, so an add is worth a run. */
export function needsEnrichment(card: Fillable): boolean {
  return emptyFields(card).length > 0;
}

/** Split a list into runs of `size`, keeping order, so the first cards fill before the last. */
export function chunked<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** What one card's model reply may carry. Every key is present; null means the model had nothing. */
const Filled = z.object({
  id: z.string(),
  meaning: z.string().nullable(),
  example: z.string().nullable(),
  pronunciation: z.string().nullable(),
  language: z.string().nullable(),
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
            meaning: { type: ["string", "null"] },
            example: { type: ["string", "null"] },
            pronunciation: { type: ["string", "null"] },
            language: { type: ["string", "null"] },
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
 * The write for one card: only fields that are empty now, only values the model gave, each
 * text field labelled `ai`. Language carries no source, because nothing in the interface
 * reads a language tag as lesson content.
 */
export function enrichmentWrite(card: Fillable, filled: Filled): EnrichmentWrite {
  const empty = new Set(emptyFields(card));
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
      needs: emptyFields(card),
    })),
  });
  const reply = Reply.safeParse(
    await provider.complete({ instructions: INSTRUCTIONS, input, schema: REPLY_SCHEMA }),
  );
  return reply.success ? reply.data.cards : [];
}

/**
 * Fill one run of cards and settle their status. Only empty fields are written, so a card the
 * learner edited while the model was thinking keeps what they typed. Each card that gains a
 * field gets one audit row naming the fields, which Activity renders as "Enriched …".
 */
export async function enrichCards(
  ctx: ServiceContext,
  cardIds: readonly string[],
  provider: TextProvider,
): Promise<{ enriched: number }> {
  const { db, userId, actor } = ctx;
  const cards = await workingCards(db, userId, cardIds);
  if (cards.length === 0) return { enriched: 0 };
  const { meaningLanguage } = await getSettings(ctx);
  const filled = new Map(
    (await askProvider(provider, meaningLanguage, cards)).map((card) => [card.id, card]),
  );

  const now = new Date();
  const statements = [];
  let enriched = 0;
  for (const card of cards) {
    const reply = filled.get(card.id);
    const write = reply ? enrichmentWrite(card, reply) : {};
    const fields = Object.keys(write);
    statements.push(
      db
        .update(schema.cards)
        .set({ ...write, enrichmentStatus: null, updatedAt: now })
        .where(eq(schema.cards.id, card.id)),
    );
    if (fields.length === 0) continue;
    enriched += 1;
    statements.push(
      auditStatement(db, {
        userId,
        actor,
        action: "update",
        entity: "card",
        entityId: card.id,
        payload: write,
      }),
    );
  }
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
  return { enriched };
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
 * The queue, or null where no text vendor is configured, so an add on a Worker without an
 * OpenAI key leaves its cards exactly as they arrived.
 */
export function enrichmentQueue(env: {
  OPENAI_API_KEY?: string | undefined;
  ENRICH_WORKFLOW?: EnrichmentQueue | undefined;
}): EnrichmentQueue | null {
  return env.OPENAI_API_KEY?.trim() && env.ENRICH_WORKFLOW ? env.ENRICH_WORKFLOW : null;
}
