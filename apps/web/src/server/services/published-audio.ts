import { canSpeakTerm, LanguageTag } from "@lymi/core";
import { listPublicDeckSlugs, publicDeckFrontCards } from "@lymi/core/catalog/server";
import { and, eq, inArray, isNull, selectIn } from "@lymi/core/db";
import { type Db, schema } from "../db";
import type { AnalyticsWriter } from "./analytics";
import { type AudioDependencies, pronunciationAudio } from "./audio";

/** Cards voiced per run. Each one without a clip costs one paid voice call, once. */
export const PUBLISHED_AUDIO_BATCH = 40;
/** Voice calls in flight at once, so a big deck does not burst the provider. */
export const PUBLISHED_AUDIO_CONCURRENCY = 4;
/** Cards a publish voices itself: a request's `waitUntil` ends about 30 seconds after the response. */
export const PUBLISHED_AUDIO_ON_PUBLISH = 12;

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
  deps: AudioDependencies & { analytics?: (userId: string) => AnalyticsWriter },
  options: { slug?: string; limit?: number; concurrency?: number } = {},
): Promise<PublishedAudioRun> {
  const limit = options.limit ?? PUBLISHED_AUDIO_BATCH;
  const concurrency = Math.max(1, options.concurrency ?? PUBLISHED_AUDIO_CONCURRENCY);
  const slugs = options.slug
    ? [options.slug]
    : (await listPublicDeckSlugs(db)).map((row) => row.slug);
  // Newest-published decks first: a deck just published is the one visitors are opening now.
  const publishedAt = new Map(
    (
      await selectIn(slugs, (slice) =>
        db
          .select({
            slug: schema.deckPublications.slug,
            publishedAt: schema.deckPublications.publishedAt,
          })
          .from(schema.deckPublications)
          .where(inArray(schema.deckPublications.slug, slice)),
      )
    ).map((row) => [row.slug, row.publishedAt.getTime()]),
  );
  const newestFirst = [...slugs].sort(
    (a, b) => (publishedAt.get(b) ?? 0) - (publishedAt.get(a) ?? 0),
  );
  /** Each front card's deck, by its place in the newest-first order. */
  const deckRank = new Map<string, number>();
  for (const [rank, slug] of newestFirst.entries()) {
    for (const id of await publicDeckFrontCards(db, slug)) {
      if (!deckRank.has(id)) deckRank.set(id, rank);
    }
  }
  const ids = [...deckRank.keys()];

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
  // Random order within a deck, so a card every provider rejects cannot hold the front of its
  // deck's backlog for good. The sort is stable, so the newest deck still goes first.
  for (let i = pending.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pending[i], pending[j]] = [
      pending[j] as (typeof pending)[number],
      pending[i] as (typeof pending)[number],
    ];
  }
  pending.sort((a, b) => (deckRank.get(a.id) ?? 0) - (deckRank.get(b.id) ?? 0));
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
          { db, userId: row.ownerId, actor: "system", analytics: deps.analytics?.(row.ownerId) },
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
