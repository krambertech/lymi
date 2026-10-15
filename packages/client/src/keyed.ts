/**
 * Stable keys for a list the projection gives no ids for. A repeated term is ordinary in a
 * vocabulary deck and two sections may share a name, so a name that has been seen carries how
 * many times: the same list always yields the same keys, and no key is just a position.
 */
export function keyed<T>(
  items: readonly T[],
  nameOf: (item: T) => string,
): { item: T; key: string }[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const name = nameOf(item);
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    return { item, key: count === 1 ? name : `${name}#${count}` };
  });
}
