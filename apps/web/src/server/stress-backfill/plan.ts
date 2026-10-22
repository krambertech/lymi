/**
 * The one-off move of Russian stress out of the term, so a term stored before the stress fold
 * keys as natives write it: за́мок with no pronunciation becomes замок stressed за́мок, which keeps
 * за́мок and замо́к two words. A card with another pronunciation, such as IPA, keeps its stressed
 * term and key until the learner edits it. Two cards the fold makes duplicates, such as за́мок
 * beside замок, both stay; the job counts them and archives nothing. This is the plan, shared by
 * the Worker job in services/stress-backfill.ts and the dry run beside it.
 * docs/proposals/russian-and-ukrainian.md, Backfill.
 */
import {
  duplicateKey,
  normalizeCardText,
  readingKey,
  sameReading,
  stressRules,
  termKey,
} from "@lymi/core";

/** A card the job reads: every card whose term carries U+0301, whatever its language. */
export type StressRow = {
  id: string;
  userId: string;
  language: string | null;
  term: string;
  normalizedTerm: string;
  pronunciation: string | null;
};

/** A card whose term the job rewrites, and the fields it will hold. */
export type StressChange = {
  card: StressRow;
  term: string;
  pronunciation: string | null;
  normalizedTerm: string;
};

export type StressCounts = {
  /** Stressed terms whose stress moves into an empty pronunciation. */
  split: number;
  /** Stressed terms whose pronunciation already says the stress, or whose marks say nothing, that lose the marks. */
  folded: number;
  /** Stressed terms beside another pronunciation, such as IPA, left with their stressed key. */
  kept: number;
  /** Cards that, once rewritten, have an active card with the same term and no reading telling them apart. */
  duplicates: number;
};

/** What the job would write, from the cards whose term carries a mark. */
export function planStressBackfill(rows: readonly StressRow[]): {
  changes: StressChange[];
  counts: Omit<StressCounts, "duplicates">;
} {
  const changes: StressChange[] = [];
  const counts = { split: 0, folded: 0, kept: 0 };
  for (const card of rows) {
    if (!stressRules(card.language)) continue;
    const { fields, normalized } = normalizeCardText(card.language, {
      term: card.term,
      pronunciation: card.pronunciation,
    });
    if (!normalized.includes("term") || fields.term === undefined) {
      counts.kept += 1;
      continue;
    }
    counts[normalized.includes("pronunciation") ? "split" : "folded"] += 1;
    changes.push({
      card,
      term: fields.term,
      pronunciation: fields.pronunciation ?? null,
      normalizedTerm: termKey(card.language, fields.term),
    });
  }
  return { changes, counts };
}

/** A card the duplicate count compares, as the duplicate rule reads it. */
export type ActiveRow = {
  id: string;
  userId: string;
  language: string | null;
  term: string;
  normalizedTerm: string;
  pronunciation: string | null;
};

/**
 * How many rewritten cards would meet another active card as a duplicate: same learner, term and
 * language, with no two readings that differ. They are counted and left as they are.
 */
export function countDuplicates(
  changes: readonly StressChange[],
  active: readonly ActiveRow[],
): number {
  const rewritten = new Map(changes.map((change) => [change.card.id, change]));
  const cards = active.map((row) => {
    const change = rewritten.get(row.id);
    return change
      ? {
          ...row,
          term: change.term,
          pronunciation: change.pronunciation,
          normalizedTerm: change.normalizedTerm,
        }
      : row;
  });
  const groups = new Map<string, typeof cards>();
  for (const card of cards) {
    const key = `${card.userId}\u0000${duplicateKey(card.language, card.normalizedTerm)}`;
    groups.set(key, [...(groups.get(key) ?? []), card]);
  }
  let duplicates = 0;
  for (const card of cards) {
    if (!rewritten.has(card.id)) continue;
    const key = `${card.userId}\u0000${duplicateKey(card.language, card.normalizedTerm)}`;
    const reading = readingKey(card);
    const meets = (groups.get(key) ?? []).some(
      (other) => other.id !== card.id && sameReading(readingKey(other), reading),
    );
    if (meets) duplicates += 1;
  }
  return duplicates;
}
