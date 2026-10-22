/**
 * The Worker job that moves Russian stress out of stored terms, as `stress-backfill/plan.ts`
 * decides. It writes as the system through `updateCards`, so each change has its audit row, and it
 * sends no event, because no learner acted.
 */
import { and, inArray, isNull, sql } from "@lymi/core/db";
import { type Db, schema } from "../db";
import {
  countDuplicates,
  planStressBackfill,
  type StressChange,
  type StressCounts,
} from "../stress-backfill/plan";
import { selectIn } from "./batch";
import { updateCards } from "./cards";

/** How many edits one `updateCards` call carries, so a learner with many cards writes in parts. */
const CHUNK = 100;

/**
 * Plans the backfill against the database and, unless `dryRun`, writes it as the system for each
 * card's owner. The counts are the same either way, so a dry run says what a write will do.
 */
export async function runStressBackfill(
  db: Db,
  { dryRun }: { dryRun: boolean },
): Promise<StressCounts & { written: number }> {
  const columns = {
    id: schema.cards.id,
    userId: schema.cards.userId,
    language: schema.cards.language,
    term: schema.cards.term,
    normalizedTerm: schema.cards.normalizedTerm,
    pronunciation: schema.cards.pronunciation,
  };
  const rows = await db
    .select({ ...columns, archivedAt: schema.cards.archivedAt })
    .from(schema.cards)
    .where(sql`instr(${schema.cards.term}, char(769)) > 0`);
  const { changes, counts } = planStressBackfill(rows);
  // The cards already keyed as the rewritten terms will be, and the stressed cards themselves.
  const keyed = await selectIn([...new Set(changes.map((c) => c.normalizedTerm))], (keys) =>
    db
      .select(columns)
      .from(schema.cards)
      .where(and(inArray(schema.cards.normalizedTerm, keys), isNull(schema.cards.archivedAt))),
  );
  const active = new Map(
    [...keyed, ...rows.filter((row) => row.archivedAt === null)].map((row) => [row.id, row]),
  );
  const duplicates = countDuplicates(changes, [...active.values()]);
  if (dryRun) return { ...counts, duplicates, written: 0 };

  let written = 0;
  const byOwner = new Map<string, StressChange[]>();
  for (const change of changes) {
    byOwner.set(change.card.userId, [...(byOwner.get(change.card.userId) ?? []), change]);
  }
  for (const [userId, owned] of byOwner) {
    for (let at = 0; at < owned.length; at += CHUNK) {
      const edits = owned
        .slice(at, at + CHUNK)
        .map(({ card }) => ({ cardId: card.id, term: card.term }));
      const outcomes = await updateCards({ db, userId, actor: "system" }, edits);
      written += outcomes.filter((outcome) => outcome.status === "updated").length;
    }
  }
  return { ...counts, duplicates, written };
}
