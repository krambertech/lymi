import { deckEnrichFields, exampleFingerprint, wantsTranslation } from "@lymi/core";
import { eventLanguages } from "@lymi/core/analytics";
import { and, eq, inArray, isNull } from "@lymi/core/db";
import type { Card } from "@lymi/core/schema";
import type { TextProvider } from "../ai";
import { type Db, schema } from "../db";
import { chunked } from "../enrichment/prompt";
import {
  readTranslations,
  TRANSLATION_INSTRUCTIONS,
  TRANSLATION_PROMPT_VERSION,
  TRANSLATION_REPLY_SCHEMA,
  translationBrief,
  translationInput,
} from "../enrichment/translation";
import { track } from "./analytics";
import { auditStatement } from "./audit";
import { selectIn } from "./batch";
import type { ServiceContext } from "./context";
import type { EnrichRunParams } from "./enrichment";
import { getSettings } from "./settings";

type Trigger = NonNullable<EnrichRunParams["trigger"]>;

/** Only while the card still holds the example that was read and nobody has written a translation. */
function stillUntranslated(userId: string, card: Pick<Card, "id" | "example">) {
  return and(
    eq(schema.cards.id, card.id),
    eq(schema.cards.userId, userId),
    eq(schema.cards.example, card.example ?? ""),
    isNull(schema.cards.exampleTranslation),
  );
}

/**
 * Translate the examples of a run's cards into the learner's meaning language. A run reads each
 * example when it starts and writes only while the card still holds it, so an edit made meanwhile
 * wins and the run that edit queued translates the new example; out-of-order runs therefore never
 * land an older sentence's translation. A card with nothing left to translate just settles.
 */
export async function translateExamples(
  ctx: ServiceContext,
  cardIds: readonly string[],
  provider: TextProvider,
  trigger: Trigger = "add",
): Promise<{ translated: number }> {
  const { db, userId } = ctx;
  const cards = await selectIn([...cardIds], (ids) =>
    db
      .select()
      .from(schema.cards)
      .where(
        and(
          eq(schema.cards.userId, userId),
          inArray(schema.cards.id, ids),
          isNull(schema.cards.archivedAt),
        ),
      ),
  );
  if (cards.length === 0) return { translated: 0 };
  const decks = new Map(
    (
      await selectIn([...new Set(cards.map((card) => card.deckId))], (ids) =>
        db
          .select({
            id: schema.decks.id,
            enrichFields: schema.decks.enrichFields,
            defaultLanguage: schema.decks.defaultLanguage,
            purpose: schema.decks.purpose,
          })
          .from(schema.decks)
          .where(inArray(schema.decks.id, ids)),
      )
    ).map((deck) => [deck.id, deck]),
  );
  const asked = cards.filter((card) => {
    const deck = decks.get(card.deckId);
    return wantsTranslation(
      card,
      deckEnrichFields(deck?.enrichFields, deck?.defaultLanguage, deck?.purpose),
    );
  });
  const now = new Date();
  // Cards waiting on a translation they no longer need stop waiting.
  const settled = cards.filter(
    (card) => card.exampleTranslationStatus === "working" && !asked.includes(card),
  );
  if (settled.length > 0) {
    await db
      .update(schema.cards)
      .set({ exampleTranslationStatus: null })
      .where(
        and(
          eq(schema.cards.userId, userId),
          inArray(
            schema.cards.id,
            settled.map((card) => card.id),
          ),
          eq(schema.cards.exampleTranslationStatus, "working"),
        ),
      );
  }
  if (asked.length === 0) return { translated: 0 };

  const { meaningLanguage } = await getSettings(ctx);
  const reply = await provider.complete({
    instructions: TRANSLATION_INSTRUCTIONS,
    input: translationInput(
      meaningLanguage,
      asked.map((card) => translationBrief({ ...card, example: card.example ?? "" })),
    ),
    schema: TRANSLATION_REPLY_SCHEMA,
  });
  const translations = readTranslations(reply);
  const writes = asked.map((card) => {
    const text = translations.get(card.id);
    // The model declined: the example stays untranslated, and nothing waits on it.
    if (!text) {
      return db
        .update(schema.cards)
        .set({ exampleTranslationStatus: null })
        .where(stillUntranslated(userId, card));
    }
    return db
      .update(schema.cards)
      .set({
        exampleTranslation: text,
        exampleTranslationSource: "ai",
        exampleTranslationOf: exampleFingerprint(card.example ?? ""),
        exampleTranslationStatus: null,
        updatedAt: now,
      })
      .where(stillUntranslated(userId, card));
  });
  const [first, ...rest] = writes;
  if (first) await db.batch([first, ...rest]);

  // Read back, so Activity and analytics count only translations that beat any edit to the card.
  const after = await selectIn(
    asked.map((card) => card.id),
    (ids) =>
      db
        .select({
          id: schema.cards.id,
          deckId: schema.cards.deckId,
          language: schema.cards.language,
          exampleTranslation: schema.cards.exampleTranslation,
          exampleTranslationSource: schema.cards.exampleTranslationSource,
        })
        .from(schema.cards)
        .where(and(eq(schema.cards.userId, userId), inArray(schema.cards.id, ids))),
  );
  const landed = after.filter(
    (card) =>
      card.exampleTranslationSource === "ai" &&
      card.exampleTranslation === translations.get(card.id),
  );
  const rows = landed.map((card) =>
    auditStatement(ctx, {
      entity: "card",
      action: "enrich",
      id: card.id,
      deckId: card.deckId,
      details: { exampleTranslation: card.exampleTranslation },
    }),
  );
  const [firstRow, ...restRows] = rows;
  if (firstRow) await db.batch([firstRow, ...restRows]);
  const offered = asked.filter((card) => translations.get(card.id)).length;
  track(ctx.analytics, {
    name: "example_translated",
    outcome: landed.length ? "translated" : "empty",
    count: landed.length,
    trigger,
    ...(offered > landed.length ? { superseded: offered - landed.length } : {}),
    prompt_version: TRANSLATION_PROMPT_VERSION,
    ...(landed.length ? { languages: eventLanguages(landed.map((card) => card.language)) } : {}),
  });
  return { translated: landed.length };
}

/** A run that gives up ends its cards' translations at `failed`, so the screen stops waiting. */
export function failTranslations(db: Db, userId: string, cardIds: readonly string[]) {
  return settleTranslations(db, userId, cardIds, "failed");
}

/** Every listed card still waiting on a translation stops waiting, as `status` says. */
export async function settleTranslations(
  db: Db,
  userId: string,
  cardIds: readonly string[],
  status: "failed" | null = null,
) {
  for (const slice of chunked(cardIds, 90)) {
    await db
      .update(schema.cards)
      .set({ exampleTranslationStatus: status })
      .where(
        and(
          eq(schema.cards.userId, userId),
          inArray(schema.cards.id, slice),
          eq(schema.cards.exampleTranslationStatus, "working"),
        ),
      );
  }
}
