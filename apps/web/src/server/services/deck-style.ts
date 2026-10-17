import { deckEnrichFields, deckPurpose } from "@lymi/core";
import { and, asc, count, eq, gt, inArray, isNull, ne, or, type SQL } from "@lymi/core/db";
import type { TextProvider } from "../ai";
import { type Db, schema } from "../db";
import { languageGuide } from "../enrichment/languages";
import { NOTES_READ_MAX } from "../enrichment/prompt";
import {
  readStyle,
  STYLE_INSTRUCTIONS,
  STYLE_PROMPT_VERSION,
  STYLE_REPLY_SCHEMA,
  type StyleCard,
  styleInput,
  topicAllowed,
} from "../enrichment/style";
import { track } from "./analytics";
import { selectIn } from "./batch";
import type { ServiceContext } from "./context";
import { getSettings } from "./settings";

/** A deck's style is first learned once it has this many cards a person wrote. */
export const STYLE_LEARN_AFTER = 8;
/** Then learned again once this many of those cards are new or changed. */
export const STYLE_RELEARN_AFTER = 10;
/** Cards shown per call, spread across the deck's life rather than its latest lesson. */
export const STYLE_CARDS = 60;

/** Active cards in the deck whose meaning a person wrote, the same rule enrichment samples follow. */
function ownCards(deckId: string): SQL {
  return and(
    eq(schema.cards.deckId, deckId),
    isNull(schema.cards.archivedAt),
    or(isNull(schema.cards.meaningSource), ne(schema.cards.meaningSource, "ai")),
    ne(schema.cards.meaning, ""),
  ) as SQL;
}

/** Up to `limit` items spread evenly from first to last. */
export function spread<T>(items: readonly T[], limit: number): T[] {
  if (items.length <= limit) return [...items];
  return Array.from(
    { length: limit },
    (_, i) => items[Math.round((i * (items.length - 1)) / (limit - 1))] as T,
  );
}

type StyleDeck = Pick<
  typeof schema.decks.$inferSelect,
  | "id"
  | "name"
  | "description"
  | "defaultLanguage"
  | "purpose"
  | "enrichFields"
  | "enrichInstructions"
  | "enrichStyle"
  | "enrichStyleAt"
>;

/** True when the deck has enough cards of its own, and enough changed since it was last learned. */
async function due(db: Db, deck: StyleDeck): Promise<boolean> {
  const since = deck.enrichStyleAt;
  const [row] = await db
    .select({ total: count() })
    .from(schema.cards)
    .where(since ? and(ownCards(deck.id), gt(schema.cards.updatedAt, since)) : ownCards(deck.id));
  return (row?.total ?? 0) >= (since ? STYLE_RELEARN_AFTER : STYLE_LEARN_AFTER);
}

/** The text of one field as the style reads it: the learner's or the lesson's, missing when the AI wrote it. */
function own(text: string | null, source: string | null, max?: number): string | undefined {
  if (source === "ai") return undefined;
  const trimmed = text?.trim() ?? "";
  return max ? trimmed.slice(0, max) : trimmed;
}

async function cardsFor(db: Db, deckId: string): Promise<StyleCard[]> {
  const order = await db
    .select({ id: schema.cards.id })
    .from(schema.cards)
    .where(ownCards(deckId))
    .orderBy(asc(schema.cards.createdAt), asc(schema.cards.id));
  const ids = spread(order, STYLE_CARDS).map((row) => row.id);
  const rows = new Map(
    (
      await selectIn(ids, (slice) =>
        db.select().from(schema.cards).where(inArray(schema.cards.id, slice)),
      )
    ).map((card) => [card.id, card]),
  );
  return ids.flatMap((id) => {
    const card = rows.get(id);
    if (!card) return [];
    const fields = {
      meaning: own(card.meaning, card.meaningSource),
      example: own(card.example, card.exampleSource),
      notes: own(card.notes, card.notesSource, NOTES_READ_MAX),
      pronunciation: own(card.pronunciation, card.pronunciationSource),
    };
    return [
      {
        day: card.createdAt.toISOString().slice(0, 10),
        term: card.term,
        ...Object.fromEntries(Object.entries(fields).filter(([, text]) => text !== undefined)),
      },
    ];
  });
}

export type LearnStyleOptions = {
  /** Only decks that have never been learned, before their first fill. */
  firstOnly?: boolean;
  /** Decks this run already learned. */
  skip?: readonly string[];
};

/**
 * Learn the style of each deck the run's cards belong to, where it is due. Only the owner's decks
 * are read, and only the cards a person wrote, so the AI never learns from its own text. A deck
 * whose cards show nothing worth saying stores no style but the time, so it waits for more cards
 * rather than asking again on the next add. ADR 0037.
 */
export async function learnDeckStyles(
  ctx: ServiceContext,
  cardIds: readonly string[],
  provider: TextProvider,
  options: LearnStyleOptions = {},
): Promise<{ learned: number; deckIds: string[] }> {
  const { db, userId } = ctx;
  const deckIds = [
    ...new Set(
      (
        await selectIn([...cardIds], (ids) =>
          db
            .select({ deckId: schema.cards.deckId })
            .from(schema.cards)
            .where(and(eq(schema.cards.userId, userId), inArray(schema.cards.id, ids))),
        )
      ).map((row) => row.deckId),
    ),
  ];
  const wanted = deckIds.filter((id) => !options.skip?.includes(id));
  if (wanted.length === 0) return { learned: 0, deckIds: [] };
  const decks = await db
    .select({
      id: schema.decks.id,
      name: schema.decks.name,
      description: schema.decks.description,
      defaultLanguage: schema.decks.defaultLanguage,
      purpose: schema.decks.purpose,
      enrichFields: schema.decks.enrichFields,
      enrichInstructions: schema.decks.enrichInstructions,
      enrichStyle: schema.decks.enrichStyle,
      enrichStyleAt: schema.decks.enrichStyleAt,
    })
    .from(schema.decks)
    .where(
      and(
        inArray(schema.decks.id, wanted),
        eq(schema.decks.userId, userId),
        isNull(schema.decks.archivedAt),
        options.firstOnly ? isNull(schema.decks.enrichStyleAt) : undefined,
      ),
    );

  const learned: string[] = [];
  for (const deck of decks) {
    if (!(await due(db, deck))) continue;
    const cards = await cardsFor(db, deck.id);
    const { meaningLanguage } = await getSettings(ctx);
    const guide = languageGuide(deck.defaultLanguage);
    const fields = deckEnrichFields(deck.enrichFields, deck.defaultLanguage, deck.purpose);
    const input = styleInput({
      meaningLanguage,
      deck: {
        name: deck.name,
        ...(deck.description?.trim() ? { description: deck.description.trim() } : {}),
        ...(deck.defaultLanguage ? { language: deck.defaultLanguage } : {}),
        purpose: deckPurpose(deck.purpose, deck.defaultLanguage),
        fields,
        ...(deck.enrichInstructions?.trim()
          ? { instructions: deck.enrichInstructions.trim() }
          : {}),
        ...(guide ? { guide } : {}),
      },
      previous: deck.enrichStyle,
      cards,
    });
    let reply: unknown;
    try {
      reply = await provider.complete({
        instructions: STYLE_INSTRUCTIONS,
        input,
        schema: STYLE_REPLY_SCHEMA,
      });
    } catch (err) {
      track(ctx.analytics, {
        name: "deck_style_learned",
        outcome: "failed",
        cards: cards.length,
        topic: topicAllowed(cards),
        chars: 0,
        prompt_version: STYLE_PROMPT_VERSION,
      });
      throw err;
    }
    const style = readStyle(reply);
    // Bookkeeping the AI derives, like a card's enrichment status: Activity records no row for it.
    await db
      .update(schema.decks)
      .set({ enrichStyle: style, enrichStyleAt: new Date() })
      .where(and(eq(schema.decks.id, deck.id), eq(schema.decks.userId, userId)));
    learned.push(deck.id);
    track(ctx.analytics, {
      name: "deck_style_learned",
      outcome: style ? "learned" : "empty",
      cards: cards.length,
      topic: topicAllowed(cards),
      chars: style?.length ?? 0,
      prompt_version: STYLE_PROMPT_VERSION,
    });
  }
  return { learned: learned.length, deckIds: learned };
}
