import type { Href } from "expo-router";

/** The report sheet for a deck or a card, named as its title says it. */
export function reportHref(kind: "deck" | "card", id: string, name: string): Href {
  const query = new URLSearchParams({ kind, id, name });
  return `/report?${query.toString()}` as Href;
}
