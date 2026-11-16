import type { MemberRole } from "@lymi/core";

export type ReviewSource = "ready" | "import" | "own";

export interface SourceCard {
  deckId: string;
  importId?: string | null;
}

export interface SourceDeck {
  id: string;
  published: boolean;
  role: MemberRole;
}

/**
 * How the cards in this review arrived. `null` while the decks have not loaded and a card
 * might still be from a published deck the learner added.
 */
export function reviewSource(
  cards: readonly SourceCard[],
  decks: readonly SourceDeck[] | undefined,
): ReviewSource | null {
  if (cards.length === 0) return "own";
  const byId = new Map((decks ?? []).map((deck) => [deck.id, deck]));
  const kinds: ReviewSource[] = [];
  for (const card of cards) {
    const deck = byId.get(card.deckId);
    if (deck?.published && deck.role !== "owner") kinds.push("ready");
    else if (card.importId) kinds.push("import");
    else if (decks === undefined && !byId.has(card.deckId)) return null;
    else kinds.push("own");
  }
  if (kinds.every((kind) => kind === "ready")) return "ready";
  if (kinds.every((kind) => kind === "import")) return "import";
  return "own";
}
