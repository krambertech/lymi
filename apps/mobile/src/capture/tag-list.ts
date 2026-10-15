import { TAG_LIMITS } from "@lymi/core";

/** The tags with what was typed added: a comma splits it, and a repeat or one past the limit is dropped. */
export function addTags(tags: readonly string[], raw: string): string[] {
  const next = [...tags];
  for (const part of raw.split(",")) {
    const tag = part.trim().slice(0, TAG_LIMITS.length);
    if (tag && !next.includes(tag) && next.length < TAG_LIMITS.count) next.push(tag);
  }
  return next;
}

/** What a tags chip reads: the first tag and how many more, as the web's chip does. */
export function tagsSummary(tags: readonly string[]): string | null {
  if (tags.length === 0) return null;
  return tags.length === 1 ? (tags[0] as string) : `${tags[0]} +${tags.length - 1}`;
}
