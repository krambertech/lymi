import { canSpeakTerm, LanguageTag } from "@lymi/core";
import { and, eq, isNull } from "@lymi/core/db";
import { livePublicationMedia } from "@lymi/core/publication-media";
import type { SpeechProvider } from "../ai";
import { type Db, schema } from "../db";
import { pronunciationAudio } from "./audio";
import { ServiceError } from "./context";

export type PublicMediaKind = "image" | "audio";

/** A public route may read bytes only while the publication, the card and the asset are live. */
export async function publicMediaFile(
  db: Db,
  cardId: string,
  kind: PublicMediaKind,
  storage: { images: R2Bucket; audio: R2Bucket },
): Promise<R2ObjectBody> {
  const [row] = await livePublicationMedia(db, { cardId }, "delivery");
  const key = kind === "image" ? row?.imageKey : row?.audioKey;
  if (!key) throw new ServiceError("not_found", "Media not found");
  const object = await storage[kind === "image" ? "images" : "audio"].get(key);
  if (!object) throw new ServiceError("not_found", "Media not found");
  return object;
}

/**
 * A live published card's pronunciation: the stored clip or approved recording, or one made on
 * its first play when `spend` has budget left, so a deck is voiced only as far as visitors listen. #759.
 */
export async function publicPronunciation(
  db: Db,
  cardId: string,
  deps: { bucket: R2Bucket; providers: (language: string) => SpeechProvider[] },
  spend: () => Promise<number | null>,
): Promise<{ clip: R2ObjectBody } | { retryAfter: number }> {
  const [stored] = await livePublicationMedia(db, { cardId }, "delivery");
  if (stored?.audioKey) {
    const clip = await deps.bucket.get(stored.audioKey);
    if (clip) return { clip };
  }

  const [card] = await db
    .select({
      term: schema.cards.term,
      language: schema.cards.language,
      audioSource: schema.cards.audioSource,
      ownerId: schema.decks.userId,
    })
    .from(schema.cards)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .innerJoin(schema.deckPublications, eq(schema.deckPublications.deckId, schema.decks.id))
    .where(
      and(
        eq(schema.cards.id, cardId),
        eq(schema.deckPublications.status, "published"),
        isNull(schema.decks.archivedAt),
        isNull(schema.cards.archivedAt),
      ),
    );
  const language = LanguageTag.safeParse(card?.language);
  // A recording its publisher has not approved is never heard on the public page, nor replaced.
  if (card?.audioSource === "recorded") throw new ServiceError("not_found", "Media not found");
  if (!card || !language.success || !canSpeakTerm(card) || !deps.providers(language.data).length) {
    throw new ServiceError("not_found", "Media not found");
  }
  const retryAfter = await spend();
  if (retryAfter !== null) return { retryAfter };
  // The clip is a cache on the owner's card, so the play acts as the publisher. ADR 0011.
  return {
    clip: await pronunciationAudio({ db, userId: card.ownerId, actor: "system" }, cardId, deps),
  };
}
