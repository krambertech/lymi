export const title = "The card forms' sheets";

/** Il rimborso in Lezione 12, for Edit card's sheets. */
export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lezione 12");
  const row = (await api(`/api/decks/${deck.id}/cards`)).find((r) => r.card.term === "il rimborso");
  return { DECK_ID: deck.id, CARD_ID: row.card.id };
}

/** The flow only looks; the screenshots are the evidence. */
export async function check({ api }) {
  return { decks: (await api("/api/decks")).length };
}
