import { LanguageTag, SPOKEN_TERM_MAX } from "@lymi/core";
import { and, count, eq, inArray, isNotNull, isNull, lte, sql } from "@lymi/core/db";
import type { SpeechProvider } from "../ai";
import { type Db, schema } from "../db";
import { pronunciationAudio } from "./audio";

/** Cards voiced per run. Each one without a clip costs one paid voice call, once. */
export const PUBLISHED_AUDIO_BATCH = 40;
/** Voice calls in flight at once, so a big deck does not burst the provider. */
export const PUBLISHED_AUDIO_CONCURRENCY = 4;
/** Cards a publish voices itself: a request's `waitUntil` ends about 30 seconds after the response. */
export const PUBLISHED_AUDIO_ON_PUBLISH = 8;

interface PublishedAudioDependencies {
  bucket: R2Bucket;
  providers: (language: string) => SpeechProvider[];
}

export interface PublishedAudioRun {
  /** Cards that got a clip in this run. */
  voiced: number;
  /** Cards the providers could not voice this run; the next run tries them again. */
  failed: number;
  /** Speakable cards still without a clip after this run. */
  remaining: number;
}

/**
 * Give every card of a published deck its pronunciation before a visitor plays it, through the
 * same path a first play uses, so each clip is generated and stored once. Only publishers can
 * publish, so this only ever touches curated decks. Cards that already have a clip are skipped,
 * which makes every run safe to repeat: the cron drains the backlog, including decks that were
 * live before this existed, and a publish starts on its own deck right away.
 */
export async function voicePublishedDecks(
  db: Db,
  deps: PublishedAudioDependencies,
  options: { deckId?: string; limit?: number; concurrency?: number } = {},
): Promise<PublishedAudioRun> {
  const limit = options.limit ?? PUBLISHED_AUDIO_BATCH;
  const concurrency = Math.max(1, options.concurrency ?? PUBLISHED_AUDIO_CONCURRENCY);
  // Cards the audio path refuses (no language, a long term) would never leave the backlog.
  const unvoiced = and(
    eq(schema.deckPublications.status, "published"),
    isNull(schema.decks.archivedAt),
    isNull(schema.cards.archivedAt),
    isNull(schema.cards.audioKey),
    isNotNull(schema.cards.language),
    lte(sql`length(${schema.cards.term})`, SPOKEN_TERM_MAX),
    ...(options.deckId ? [eq(schema.cards.deckId, options.deckId)] : []),
  );

  // A language no provider covers fails every time, so it is left for a first play to report.
  const languages = (
    await db
      .selectDistinct({ language: schema.cards.language })
      .from(schema.cards)
      .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
      .innerJoin(schema.deckPublications, eq(schema.deckPublications.deckId, schema.cards.deckId))
      .where(unvoiced)
  ).flatMap(({ language }) =>
    LanguageTag.safeParse(language).success && deps.providers(language as string).length > 0
      ? [language as string]
      : [],
  );
  if (languages.length === 0) return { voiced: 0, failed: 0, remaining: 0 };
  const speakable = and(unvoiced, inArray(schema.cards.language, languages));

  const [{ pending = 0 } = {}] = await db
    .select({ pending: count() })
    .from(schema.cards)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .innerJoin(schema.deckPublications, eq(schema.deckPublications.deckId, schema.cards.deckId))
    .where(speakable);
  // Random order, so a card every provider rejects cannot hold the front of the backlog for good.
  const batch = await db
    .select({
      id: schema.cards.id,
      ownerId: schema.decks.userId,
    })
    .from(schema.cards)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .innerJoin(schema.deckPublications, eq(schema.deckPublications.deckId, schema.cards.deckId))
    .where(speakable)
    .orderBy(sql`random()`)
    .limit(limit);

  let voiced = 0;
  let failed = 0;
  let next = 0;
  const worker = async () => {
    while (next < batch.length) {
      const row = batch[next++];
      if (!row) return;
      try {
        // The clip is a cache on the owner's card, so the run acts as the publisher. ADR 0011.
        const clip = await pronunciationAudio(
          { db, userId: row.ownerId, actor: "system" },
          row.id,
          deps,
        );
        await clip.body.cancel();
        voiced++;
      } catch (error) {
        failed++;
        console.warn(
          JSON.stringify({
            event: "published_audio_failed",
            error: error instanceof Error ? error.name : "UnknownError",
          }),
        );
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, batch.length) }, worker));
  return { voiced, failed, remaining: pending - voiced };
}
