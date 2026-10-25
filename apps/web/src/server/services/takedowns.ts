import { and, eq, inArray, sql } from "@lymi/core/db";
import { type Db, schema } from "../db";
import { selectIn } from "./batch";
import { type ServiceContext, ServiceError } from "./context";

/** Refuses a share from an account Lymi suspended from sharing after a report. */
export async function assertMayShare({ db, userId }: ServiceContext) {
  const [suspended] = await db
    .select({ userId: schema.sharingSuspensions.userId })
    .from(schema.sharingSuspensions)
    .where(eq(schema.sharingSuspensions.userId, userId));
  if (suspended) {
    throw new ServiceError(
      "forbidden",
      "Lymi stopped this account from sharing decks after a report. Write to hello@lymi.app.",
      undefined,
      "sharing_suspended",
    );
  }
}

/**
 * Refuses restoring a deck Lymi archived after a report, or any deck a suspended owner ever shared,
 * since restoring would reopen its join link. Their decks nobody else saw restore as usual.
 */
export async function assertDeckRestorable(db: Db, deckId: string, ownerId: string) {
  const [removed] = await db
    .select({ id: schema.contentReports.id })
    .from(schema.contentReports)
    .where(
      and(
        eq(schema.contentReports.deckId, deckId),
        inArray(schema.contentReports.action, ["archive_deck", "suspend_sharing"]),
      ),
    )
    .limit(1);
  if (removed) throw takenDown("deck");
  const [shared] = await db
    .select({ userId: schema.sharingSuspensions.userId })
    .from(schema.sharingSuspensions)
    .where(
      and(
        eq(schema.sharingSuspensions.userId, ownerId),
        sql`(exists (select 1 from deck_members where deck_members.deck_id = ${deckId})
          or exists (select 1 from deck_invitations where deck_invitations.deck_id = ${deckId}))`,
      ),
    );
  if (shared) throw takenDown("deck");
}

/** The cards among `ids` that Lymi archived after a report, which stay archived. */
export async function takenDownCards(db: Db, ids: readonly string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await selectIn([...new Set(ids)], (slice) =>
    db
      .select({ cardId: schema.contentReports.cardId })
      .from(schema.contentReports)
      .where(
        and(
          inArray(schema.contentReports.cardId, slice),
          eq(schema.contentReports.action, "archive_card"),
        ),
      ),
  );
  return new Set(rows.map((row) => row.cardId).filter((id): id is string => !!id));
}

export function takenDown(what: "deck" | "card") {
  return new ServiceError(
    "forbidden",
    what === "deck"
      ? "Lymi archived this deck after a report, so it can’t be restored. Write to hello@lymi.app."
      : "Lymi archived this card after a report, so it can’t be restored. Write to hello@lymi.app.",
    undefined,
    "removed_after_report",
  );
}
