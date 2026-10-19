import { and, eq, inArray, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { cardImages, cards, deckPublications, decks } from "./schema/app";

// biome-ignore lint/suspicious/noExplicitAny: both Workers pass their own typed D1 database.
type MediaDb = BaseSQLiteDatabase<"async", any, any>;

type Scope =
  | { publicationId: string; cardId?: never; cardIds?: never }
  | { cardId: string; publicationId?: never; cardIds?: never }
  | { cardIds: string[]; publicationId?: never; cardId?: never };

const publicAudio = sql<number>`case when ${cards.audioKey} is not null then 1 else 0 end`;

/**
 * A published deck's pictures and stored pronunciation, live for as long as the publication,
 * the card and the asset are. The same predicate serves the public page and the byte route;
 * only the delivery view selects R2 keys, which never reach a public response.
 */
export function livePublicationMedia(
  db: MediaDb,
  scope: Scope,
  view: "public" | "delivery" = "public",
) {
  return db
    .select({
      cardId: cards.id,
      description: cardImages.description,
      width: cardImages.width,
      height: cardImages.height,
      hasAudio: publicAudio,
      imageKey: view === "delivery" ? cardImages.objectKey : sql<null>`null`,
      audioKey:
        view === "delivery"
          ? sql<string | null>`case when ${publicAudio} = 1 then ${cards.audioKey} end`
          : sql<null>`null`,
    })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .innerJoin(deckPublications, eq(deckPublications.deckId, decks.id))
    .leftJoin(
      cardImages,
      and(
        eq(cardImages.cardId, cards.id),
        eq(cardImages.status, "active"),
        // The page needs a description to render the picture, so bytes without one stay private.
        isNotNull(cardImages.description),
        ne(cardImages.description, ""),
      ),
    )
    .where(
      and(
        scope.publicationId ? eq(deckPublications.id, scope.publicationId) : undefined,
        scope.cardId ? eq(cards.id, scope.cardId) : undefined,
        scope.cardIds ? inArray(cards.id, scope.cardIds) : undefined,
        eq(deckPublications.status, "published"),
        isNull(decks.archivedAt),
        isNull(cards.archivedAt),
        or(isNotNull(cardImages.id), sql`${publicAudio} = 1`),
      ),
    );
}
