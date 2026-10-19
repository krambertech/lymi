export const title = "Deck tools, tags on a selection";

const DECK = "Lezione 12";
const TAG = "before class";

/** Lezione 12 carries tags on some of its cards, so the sheet shows mixed rows beside the new tag. */
export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.name === DECK);
  return { DECK_ID: deck.id, TAG, COUNT: String(deck.total) };
}

/** Select all, then Tags with a new tag, puts it on every card of the deck. */
export async function check({ api, poll }) {
  const deck = (await api("/api/decks")).find((d) => d.name === DECK);
  return poll(async () => {
    const rows = await api(`/api/decks/${deck.id}/cards`);
    const missing = rows.filter((r) => !r.card.tags.includes(TAG)).map((r) => r.card.term);
    if (missing.length) throw new Error(`Not tagged: ${missing.join(", ")}`);
    return { tagged: rows.length, tag: TAG };
  });
}
