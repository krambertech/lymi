import type { Href } from "expo-router";

/** The report sheet for a deck, a card, or a deck behind a join link, named as its title says it. */
export function reportHref(kind: "deck" | "card" | "join", id: string, name: string): Href {
  const query = new URLSearchParams({ kind, id, name });
  return `/report?${query.toString()}` as Href;
}
