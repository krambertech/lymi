export const title = "Library and the deck page";

/** Library's first row: the first deck in no series, which for `learner` is a shared one. */
const firstRow = async (api) => (await api("/api/decks")).find((d) => !d.seriesId);

export async function env({ api }) {
  const deck = await firstRow(api);
  const { cards } = await api(`/api/cards?deckId=${deck.id}&limit=1`);
  return { DECK: deck.name, CARDS: deck.total, TERM: cards[0].term, MEANING: cards[0].meaning };
}

/** Browsing writes nothing: the deck still holds what the flow saw. */
export async function check({ before, api }) {
  const deck = await firstRow(api);
  const { counts } = await api("/api/dev/state");
  if (counts.cards !== before.counts.cards) throw new Error(`Cards changed: ${counts.cards}`);
  return { deck, counts };
}
