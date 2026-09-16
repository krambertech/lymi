import { and, eq, isNull, sql } from "@lymi/core/db";
import { type Db, schema } from "../db";

/**
 * The fields an edition translates. Changing one makes every edition of that row stale, which is
 * what `revision` records: a localization written from revision 3 is stale once the row reaches 4.
 * ADR 0015.
 */
const LOCALIZED = {
  card: ["term", "meaning", "pronunciation", "example", "notes"],
  deck: ["name", "description"],
  section: ["name"],
  series: ["name"],
} as const satisfies Record<string, readonly string[]>;

type Entity = keyof typeof LOCALIZED;

/**
 * `{ revision: revision + 1 }` when the patch changes text an edition translates, and nothing
 * otherwise, so an edit that leaves the meaning side alone keeps every edition current.
 */
export function bumped(
  entity: Entity,
  patch: Record<string, unknown>,
  current: Record<string, unknown>,
) {
  const changed = LOCALIZED[entity].some(
    (field) => field in patch && patch[field] !== undefined && patch[field] !== current[field],
  );
  return changed ? { revision: sql`revision + 1` } : {};
}

/** The active cards of a deck, in the order the public page and the edition report use. */
export function activeCardsOf(db: Db, deckId: string) {
  return db
    .select({
      id: schema.cards.id,
      term: schema.cards.term,
      revision: schema.cards.revision,
    })
    .from(schema.cards)
    .where(and(eq(schema.cards.deckId, deckId), isNull(schema.cards.archivedAt)))
    .orderBy(schema.cards.createdAt, sql`rowid`);
}

/** The active sections of a deck, in deck order. */
export function activeSectionsOf(db: Db, deckId: string) {
  return db
    .select({
      id: schema.sections.id,
      name: schema.sections.name,
      revision: schema.sections.revision,
    })
    .from(schema.sections)
    .where(and(eq(schema.sections.deckId, deckId), isNull(schema.sections.archivedAt)))
    .orderBy(schema.sections.position, schema.sections.createdAt, schema.sections.id);
}
