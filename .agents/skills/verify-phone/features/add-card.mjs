export const title = "Add a card";

const TERM = "il collaudo";
const MEANING = "the acceptance test";

export async function env({ api }) {
  const [deck] = await api("/api/decks");
  const { cards } = await api(`/api/cards?query=${encodeURIComponent(TERM)}`);
  if (cards.some((c) => c.term === TERM)) throw new Error(`The persona already has “${TERM}”`);
  return { DECK: deck.name, TERM, MEANING };
}

/** The card is written through the card outbox, so it reaches the Worker after the screen says Added. */
export async function check({ before, api, poll }) {
  const [deck] = await api("/api/decks");
  return poll(async () => {
    const { cards } = await api(`/api/cards?query=${encodeURIComponent(TERM)}`);
    const card = cards.find((c) => c.term === TERM);
    if (!card) throw new Error(`No stored card “${TERM}”`);
    if (card.meaning !== MEANING || card.deckId !== deck.id) {
      throw new Error(
        `Stored “${TERM}” as ${JSON.stringify({ meaning: card.meaning, deckId: card.deckId })}`,
      );
    }
    const { counts } = await api("/api/dev/state");
    if (counts.cards !== before.counts.cards + 1)
      throw new Error(`Expected ${before.counts.cards + 1} cards, found ${counts.cards}`);
    return { card, counts };
  });
}
