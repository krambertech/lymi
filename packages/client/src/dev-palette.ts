/** One command as `/api/dev/commands` lists it for the signed-in account. */
export interface DevCommandSummary {
  id: string;
  group: string;
  /** `{count}` stands for the count the command runs with. */
  title: string;
  count: { default: number; max: number } | null;
  keywords: string;
  /** Throws data away: asked twice and kept out of Recent. */
  confirm: boolean;
  /** Why it can do nothing for this account right now, or null. */
  blocked: string | null;
}

export interface PaletteQuery {
  /** What to search for, lowercased. */
  text: string;
  /** A number after a space, so `due 12` runs "Make 12 cards due" and `a1` stays a search. */
  count: number | null;
}

export function parsePaletteQuery(raw: string): PaletteQuery {
  const match = /^(?:(.*\S)\s+)?(\d+)$/.exec(raw.trim());
  if (!match) return { text: raw.trim().toLowerCase(), count: null };
  return { text: (match[1] ?? "").toLowerCase(), count: Number(match[2]) };
}

/** The count a command runs with: the query's number between 1 and its maximum, or its default. */
export function commandCount(command: DevCommandSummary, query: PaletteQuery): number | null {
  if (!command.count) return null;
  return Math.max(1, Math.min(query.count ?? command.count.default, command.count.max));
}

export function commandTitle(command: DevCommandSummary, count: number | null): string {
  return command.title.replace("{count}", String(count ?? command.count?.default ?? ""));
}

/** Every word of the query appears somewhere in what the row is known by. */
export function matchesQuery(knownBy: string, text: string): boolean {
  const haystack = knownBy.toLowerCase();
  return text.split(/\s+/).every((word) => haystack.includes(word));
}
