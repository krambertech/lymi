import { canSpeakTerm, LanguageTag } from "@lymi/core";
import { listPublicDeckSlugs, publicDeckFrontCards } from "@lymi/core/catalog/server";
import { and, eq, inArray, isNull, selectIn } from "@lymi/core/db";
import type { SpeechProvider } from "../ai";
import { type Db, schema } from "../db";
import { pronunciationAudio } from "./audio";

/** Cards voiced per run. Each one without a clip costs one paid voice call, once. */
export const PUBLISHED_AUDIO_BATCH = 40;
/** Voice calls in flight at once, so a big deck does not burst the provider. */
export const PUBLISHED_AUDIO_CONCURRENCY = 4;
/** Cards a publish voices itself: a request's `waitUntil` ends about 30 seconds after the response. */
export const PUBLISHED_AUDIO_ON_PUBLISH = 12;

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
 * Voice the cards a published deck's page shows before a visitor opens the full list, the spread
 * and the hand, so the first plays a visitor makes are instant. Every other card is voiced on its
 * first play from the page, which keeps the spend to what visitors use. #759.
 * Cards that already have a clip are skipped, which makes every run safe to repeat.
 */
export async function voicePublishedDecks(
  db: Db,
  deps: PublishedAudioDependencies,
  options: { slug?: string; limit?: number; concurrency?: number } = {},
): Promise<PublishedAudioRun> {
  const limit = options.limit ?? PUBLISHED_AUDIO_BATCH;
  const concurrency = Math.max(1, options.concurrency ?? PUBLISHED_AUDIO_CONCURRENCY);
  const slugs = options.slug
    ? [options.slug]
    : (await listPublicDeckSlugs(db)).map((row) => row.slug);
  const ids: string[] = [];
  for (const slug of slugs) ids.push(...(await publicDeckFrontCards(db, slug)));

  const rows = await selectIn(ids, (slice) =>
    db
      .select({
        id: schema.cards.id,
        term: schema.cards.term,
        language: schema.cards.language,
        ownerId: schema.decks.userId,
      })
      .from(schema.cards)
      .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
      .where(and(inArray(schema.cards.id, slice), isNull(schema.cards.audioKey))),
  );
  // A language no provider covers, or a term the audio path refuses, would fail every time.
  const pending = rows.filter(
    (row) =>
      LanguageTag.safeParse(row.language).success &&
      canSpeakTerm(row) &&
      deps.providers(row.language as string).length > 0,
  );
  // Random order, so a card every provider rejects cannot hold the front of the backlog for good.
  for (let i = pending.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pending[i], pending[j]] = [
      pending[j] as (typeof pending)[number],
      pending[i] as (typeof pending)[number],
    ];
  }
  const batch = pending.slice(0, limit);

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
  return { voiced, failed, remaining: pending.length - voiced };
}
