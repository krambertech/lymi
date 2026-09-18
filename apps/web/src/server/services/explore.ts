import type { ExploreDeckOut, ExploreOut } from "@lymi/core/catalog";
import { listPublicCatalog, loadPublicDeck } from "@lymi/core/catalog";
import { and, eq, inArray, isNotNull, isNull, or } from "@lymi/core/db";
import type { Db } from "../db";
import { schema } from "../db";
import type { ServiceContext } from "./context";
import { ServiceError } from "./context";
import { getSettings } from "./settings";

/**
 * Explore in the product reads the public projection and nothing else, so it and the page on
 * `lymi.app` can never disagree about what a published deck says. ADR 0016. The only thing added
 * is the learner's own membership, which decides whether a row adds or leads to Library.
 */
export async function exploreCatalog(ctx: ServiceContext): Promise<ExploreOut> {
  const { meaningLanguage } = await getSettings(ctx);
  const decks = await listPublicCatalog(ctx.db, meaningLanguage);
  const added = await addedDecks(
    ctx.db,
    ctx.userId,
    decks.map((deck) => deck.slug),
  );
  return { decks, added: Object.fromEntries(added) };
}

/** One published deck in the app's chrome. A withdrawn or empty deck is gone, as it is publicly. */
export async function exploreDeck(ctx: ServiceContext, slug: string): Promise<ExploreDeckOut> {
  const { meaningLanguage } = await getSettings(ctx);
  const result = await loadPublicDeck(ctx.db, slug, meaningLanguage);
  if (result.status !== "published") {
    throw new ServiceError("not_found", "This deck is not published");
  }
  const added = await addedDecks(ctx.db, ctx.userId, [slug]);
  return { deck: result.deck, deckId: added.get(slug) ?? null };
}

/**
 * Which of these published decks are already this learner's, and the deck each one is. A deck's
 * owner counts: joining one's own deck writes no member row and changes nothing, so a publisher
 * offered Add on their own deck would press it and see nothing happen.
 */
async function addedDecks(
  db: Db,
  userId: string,
  slugs: readonly string[],
): Promise<Map<string, string>> {
  if (slugs.length === 0) return new Map();
  const rows = await db
    .select({ slug: schema.deckPublications.slug, deckId: schema.deckPublications.deckId })
    .from(schema.deckPublications)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.deckPublications.deckId))
    .leftJoin(
      schema.deckMembers,
      and(
        eq(schema.deckMembers.deckId, schema.deckPublications.deckId),
        eq(schema.deckMembers.userId, userId),
        isNull(schema.deckMembers.removedAt),
      ),
    )
    .where(
      and(
        inArray(schema.deckPublications.slug, [...slugs]),
        or(eq(schema.decks.userId, userId), isNotNull(schema.deckMembers.userId)),
      ),
    );
  return new Map(rows.map((row) => [row.slug, row.deckId]));
}
