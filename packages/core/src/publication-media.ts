import { and, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { cardImages, cards, deckPublications, decks, publicationMedia } from "./schema/app";

// biome-ignore lint/suspicious/noExplicitAny: both Workers pass their own typed D1 database.
type MediaDb = BaseSQLiteDatabase<"async", any, any>;

type Scope =
  | { approvalId: string; publicationId?: never }
  | { publicationId: string; approvalId?: never };

/** The same live-approval predicate serves the public page, publisher list, and byte route. */
export function livePublicationMedia(
  db: MediaDb,
  scope: Scope,
  view: "public" | "publisher" | "delivery" = "public",
) {
  return db
    .select({
      ...publicMediaFields,
      approvedAt: view === "publisher" ? publicationMedia.approvedAt : sql<null>`null`,
      objectKey:
        view === "delivery"
          ? sql<string>`case when ${publicationMedia.kind} = 'image' then ${cardImages.objectKey} else ${publicationMedia.audioKey} end`
          : sql<null>`null`,
    })
    .from(publicationMedia)
    .innerJoin(deckPublications, eq(deckPublications.id, publicationMedia.publicationId))
    .innerJoin(decks, eq(decks.id, deckPublications.deckId))
    .innerJoin(cards, and(eq(cards.id, publicationMedia.cardId), eq(cards.deckId, decks.id)))
    .leftJoin(
      cardImages,
      and(
        eq(cardImages.id, publicationMedia.imageId),
        eq(cardImages.cardId, cards.id),
        eq(cardImages.status, "active"),
        isNotNull(cardImages.description),
      ),
    )
    .where(
      and(
        scope.approvalId ? eq(publicationMedia.id, scope.approvalId) : undefined,
        scope.publicationId ? eq(publicationMedia.publicationId, scope.publicationId) : undefined,
        isNull(publicationMedia.revokedAt),
        eq(deckPublications.status, "published"),
        isNull(decks.archivedAt),
        isNull(cards.archivedAt),
        or(
          and(eq(publicationMedia.kind, "image"), isNotNull(cardImages.id)),
          and(
            eq(publicationMedia.kind, "audio"),
            isNotNull(publicationMedia.audioKey),
            eq(publicationMedia.audioKey, cards.audioKey),
          ),
        ),
      ),
    );
}

/** These are the only media fields the public site may select. */
export const publicMediaFields = {
  id: publicationMedia.id,
  cardId: publicationMedia.cardId,
  kind: publicationMedia.kind,
  description: cardImages.description,
  width: cardImages.width,
  height: cardImages.height,
};
