export const title = "Library and the deck page";

export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lezione 12");
  const { cards } = await api(`/api/cards?deckId=${deck.id}&limit=1`);
  return { DECK: deck.name, CARDS: deck.total, TERM: cards[0].term, MEANING: cards[0].meaning };
}

/** Browsing writes nothing: Lezione 12 still holds what the flow saw. */
export async function check({ before, api }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lezione 12");
  const { counts } = await api("/api/dev/state");
  if (counts.cards !== before.counts.cards) throw new Error(`Cards changed: ${counts.cards}`);
  return { deck, counts };
}
