export const title = "Deck tools, tags on a selection";

const DECK = "Lezione 12";
const TAG = "before class";

/**
 * Lezione 12 carries tags on some of its cards, so the sheet shows mixed rows beside the new tag.
 * Three cards also get "pronoun", which then lists above "noun", so Return on "noun" has to pick the
 * exact name rather than the first that contains it.
 */
export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.name === DECK);
  const rows = await api(`/api/decks/${deck.id}/cards`);
  const plain = rows.filter((r) => !r.card.tags.includes("noun")).slice(0, 3);
  await api("/api/cards/batch?response=terse", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      cards: plain.map((r) => ({ cardId: r.card.id, tags: [...r.card.tags, "pronoun"] })),
    }),
  });
  return { DECK_ID: deck.id, TAG, COUNT: String(deck.total) };
}

/** Select all, then Tags with a new tag, puts it on every card of the deck. */
export async function check({ api, poll }) {
  const deck = (await api("/api/decks")).find((d) => d.name === DECK);
  return poll(async () => {
    const rows = await api(`/api/decks/${deck.id}/cards`);
    const missing = rows
      .filter((r) => !r.card.tags.includes(TAG) || !r.card.tags.includes("noun"))
      .map((r) => r.card.term);
    if (missing.length) throw new Error(`Not tagged: ${missing.join(", ")}`);
    const pronoun = rows.filter((r) => r.card.tags.includes("pronoun")).length;
    if (pronoun !== 3) throw new Error(`pronoun is on ${pronoun} cards, not 3`);
    return { tagged: rows.length, tags: [TAG, "noun"], pronoun };
  });
}
