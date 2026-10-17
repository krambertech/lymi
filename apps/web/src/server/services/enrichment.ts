import {
  deckEnrichFields,
  ENRICHED_FIELDS,
  type EnrichedField,
  fieldsToFill,
  LanguageTag,
  newId,
  unsetFields,
} from "@lymi/core";
import { and, desc, eq, inArray, isNull, ne, notInArray, or, type SQL, sql } from "@lymi/core/db";
import type { Card } from "@lymi/core/schema";
import type { TextProvider } from "../ai";
import { type Db, schema } from "../db";
import {
  cardBrief,
  type DeckBrief,
  deckBrief,
  ENRICHMENT_INSTRUCTIONS,
  ENRICHMENT_PROMPT_VERSION,
  enrichmentInput,
  type Filled,
  NOTES_READ_MAX,
  REPLY_SCHEMA,
  readReply,
  type Sample,
} from "../enrichment/prompt";
import { type AnalyticsWriter, track } from "./analytics";
import { auditStatement } from "./audit";
import { selectIn } from "./batch";
import type { ServiceContext } from "./context";
import { getSettings } from "./settings";

/** Cards per model call. A lesson lands in waves rather than all at once. */
export const CARDS_PER_CALL = 10;

/** The deck's own cards each call shows the model, so it follows the deck's pattern. */
export const SAMPLES_PER_DECK = 5;

/** What a background enrichment run works on. One run per add, or per Enrich on one card. */
export type EnrichRunParams = {
  userId: string;
  cardIds: string[];
  /** Missing on a run queued before Enrich on one card was told apart. */
  trigger?: "add" | "card" | undefined;
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

/** The text fields enrichment writes, each with the column that records who wrote it. */
const SOURCE_COLUMN = {
  meaning: "meaningSource",
  example: "exampleSource",
  notes: "notesSource",
  pronunciation: "pronunciationSource",
} as const;
type TextField = keyof typeof SOURCE_COLUMN;
const TEXT_FIELDS = Object.keys(SOURCE_COLUMN) as TextField[];

/** What enrichment writes to one card: the fields it filled, and the `ai` label on each text. */
export type EnrichmentWrite = { [F in TextField]?: string } & {
  [F in TextField as (typeof SOURCE_COLUMN)[F]]?: "ai";
} & { language?: string };

/**
 * The write for one card: only fields the run may fill that were never set, only values the
 * model gave, each text field labelled `ai`. Language carries no source, because nothing in the
 * interface reads a language tag as lesson content.
 */
export function enrichmentWrite(
  card: Fillable,
  filled: Filled,
  allowed: readonly EnrichedField[] = ENRICHED_FIELDS,
): EnrichmentWrite {
  const open = new Set(unsetFields(card).filter((field) => allowed.includes(field)));
  const write: EnrichmentWrite = {};
  for (const field of TEXT_FIELDS) {
    const value = filled[field]?.trim();
    if (!value || !open.has(field)) continue;
    write[field] = value;
    write[SOURCE_COLUMN[field]] = "ai";
  }
  const language = filled.language?.trim();
  if (language && open.has("language") && LanguageTag.safeParse(language).success) {
    write.language = language;
  }
  return write;
}

type DeckRow = Pick<
  typeof schema.decks.$inferSelect,
  | "id"
  | "name"
  | "description"
  | "defaultLanguage"
  | "purpose"
  | "enrichFields"
  | "enrichInstructions"
  | "enrichStyle"
>;

/** The text of one sample field: the learner's or the lesson's, "" for none, missing when the AI wrote it. */
function sampleText(card: Card, field: TextField): string | undefined {
  if (card[SOURCE_COLUMN[field]] === "ai") return undefined;
  const text = card[field]?.trim() ?? "";
  return field === "notes" ? text.slice(0, NOTES_READ_MAX) : text;
}

/**
 * The deck's most recently changed cards whose meaning a person wrote, outside this run. Only the
 * fields the deck lets the AI fill are shown, because the rest will not be written anyway.
 */
async function samplesFor(db: Db, deck: DeckRow, exclude: readonly string[]): Promise<Sample[]> {
  const fields = deckEnrichFields(deck.enrichFields, deck.defaultLanguage, deck.purpose);
  const rows = await db
    .select()
    .from(schema.cards)
    .where(
      and(
        eq(schema.cards.deckId, deck.id),
        isNull(schema.cards.archivedAt),
        or(isNull(schema.cards.meaningSource), ne(schema.cards.meaningSource, "ai")),
        ne(schema.cards.meaning, ""),
        exclude.length ? notInArray(schema.cards.id, [...exclude]) : undefined,
      ),
    )
    .orderBy(desc(schema.cards.updatedAt), desc(schema.cards.id))
    .limit(SAMPLES_PER_DECK);
  return rows.map((card) => {
    const sample: Sample = { term: card.term };
    for (const field of fields) {
      const text = sampleText(card, field);
      if (text !== undefined) sample[field] = text;
    }
    return sample;
  });
}

/** The model's reply for a run of cards, or an empty list when it answers with nothing usable. */
async function askProvider(provider: TextProvider, input: string): Promise<Filled[]> {
  return readReply(
    await provider.complete({ instructions: ENRICHMENT_INSTRUCTIONS, input, schema: REPLY_SCHEMA }),
  );
}

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
 * The fields a run may still fill on a card: those the run started with, less any written since.
 * A card queued before runs recorded their fields follows its deck.
 */
function mayFill(card: Card, deck: DeckRow | undefined): EnrichedField[] {
  const fields = deckEnrichFields(deck?.enrichFields, deck?.defaultLanguage, deck?.purpose);
  const unset = new Set(unsetFields(card));
  return (card.enrichmentFields ?? fieldsToFill(card, fields)).filter((field) => unset.has(field));
}

/**
 * Fill one run of cards and settle their status. The model reads each card's deck, its
 * instructions and a few of its own cards, and fills only the fields that suit the card. The
 * model takes seconds, so every write carries its own test that the field is still unset: a
 * learner who types into or clears a shimmering field before the write keeps what they did, and
 * the field stays theirs. Each card that gains a field gets one audit row naming the fields that
 * actually landed, which Activity renders as "Enriched …".
 */
export async function enrichCards(
  ctx: ServiceContext,
  cardIds: readonly string[],
  provider: TextProvider,
  trigger?: EnrichRunParams["trigger"],
): Promise<{ enriched: number }> {
  const { db, userId } = ctx;
  const before = await workingCards(db, userId, cardIds);
  if (before.length === 0) return { enriched: 0 };
  const deckRows = await selectIn([...new Set(before.map((card) => card.deckId))], (ids) =>
    db
      .select({
        id: schema.decks.id,
        name: schema.decks.name,
        description: schema.decks.description,
        defaultLanguage: schema.decks.defaultLanguage,
        purpose: schema.decks.purpose,
        enrichFields: schema.decks.enrichFields,
        enrichInstructions: schema.decks.enrichInstructions,
        enrichStyle: schema.decks.enrichStyle,
      })
      .from(schema.decks)
      .where(inArray(schema.decks.id, ids)),
  );
  const decks = new Map(deckRows.map((deck) => [deck.id, deck]));
  const asks = before.map((card) => ({ card, mayFill: mayFill(card, decks.get(card.deckId)) }));

  let filled = new Map<string, Filled>();
  const briefs: DeckBrief[] = [];
  if (asks.some((ask) => ask.mayFill.length > 0)) {
    for (const deck of deckRows) {
      briefs.push(
        deckBrief({
          id: deck.id,
          name: deck.name,
          description: deck.description,
          language: deck.defaultLanguage,
          purpose: deck.purpose,
          instructions: deck.enrichInstructions,
          style: deck.enrichStyle,
          samples: await samplesFor(db, deck, cardIds),
        }),
      );
    }
    const { meaningLanguage } = await getSettings(ctx);
    const input = enrichmentInput(
      meaningLanguage,
      briefs,
      asks.flatMap((ask) => (ask.mayFill.length > 0 ? [cardBrief(ask.card, ask.mayFill)] : [])),
    );
    filled = new Map((await askProvider(provider, input)).map((card) => [card.id, card]));
  }

  const now = new Date();
  const writes = [];
  const attempted = new Map<string, EnrichmentWrite>();
  let skipped = 0;
  for (const { card, mayFill: allowed } of asks) {
    const reply = filled.get(card.id);
    const write = reply ? enrichmentWrite(card, reply, allowed) : {};
    if (reply) {
      skipped += allowed.filter((field) => field !== "language" && !write[field]).length;
    }
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
      db
        .update(schema.cards)
        .set({ enrichmentStatus: null, enrichmentFields: null })
        .where(stillWorking(userId, card.id)),
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
    ...(trigger ? { trigger } : {}),
    has_instructions: briefs.some((deck) => deck.instructions),
    samples: briefs.reduce((sum, deck) => sum + deck.samples.length, 0),
    skipped,
    prompt_version: ENRICHMENT_PROMPT_VERSION,
    has_style: briefs.some((deck) => deck.style),
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
      .set({ enrichmentStatus: status, enrichmentFields: null })
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
  trigger: NonNullable<EnrichRunParams["trigger"]> = "add",
): Promise<boolean> {
  try {
    await queue.create({ id: `enrich-${newId()}`, params: { userId, cardIds, trigger } });
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
