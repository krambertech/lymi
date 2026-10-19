/** What a tags chip reads: the first tag and how many more, as the web's chip does. */
export function tagsSummary(tags: readonly string[]): string | null {
  if (tags.length === 0) return null;
  return tags.length === 1 ? (tags[0] as string) : `${tags[0]} +${tags.length - 1}`;
}
