import type { ActivityEntry } from "./api";

/**
 * One write can reach the screen as two entries: a group cut in half by the end of a page, or
 * two decks written in one call, whose entries interleave. They are joined by their group key
 * rather than by being neighbours, so a write is one row and no two rows share a key.
 */
export function mergeActivity(entries: ActivityEntry[]): ActivityEntry[] {
  const byGroup = new Map<string, ActivityEntry>();
  for (const entry of entries) {
    const held = byGroup.get(entry.group);
    if (!held) {
      byGroup.set(entry.group, entry);
      continue;
    }
    byGroup.set(entry.group, {
      ...held,
      count: held.count + entry.count,
      cards: [...held.cards, ...entry.cards],
    });
  }
  return [...byGroup.values()];
}
