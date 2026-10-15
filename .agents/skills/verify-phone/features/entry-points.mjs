export const title = "Entry points";

const TERM = "gelato";

export async function env({ api }) {
  const { cards } = await api(`/api/cards?query=${encodeURIComponent(TERM)}`);
  if (cards.some((c) => c.term === TERM)) throw new Error(`The persona already has “${TERM}”`);
  return { TERM };
}

/** Opening Add a word with a term fills the form; only Add writes a card. */
export async function check({ before, api, poll }) {
  return poll(async () => {
    const { counts } = await api("/api/dev/state");
    if (counts.cards !== before.counts.cards)
      throw new Error(`Expected ${before.counts.cards} cards, found ${counts.cards}`);
    return { counts };
  });
}
