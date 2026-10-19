export const title = "Tags on Edit card";

const TERM = "il rimborso";
const NEW = "refund";

/** Il rimborso in Lezione 12 carries noun and money. */
export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lezione 12");
  const row = (await api(`/api/decks/${deck.id}/cards`)).find((r) => r.card.term === TERM);
  return { DECK_ID: deck.id, CARD_ID: row.card.id, NEW };
}

/** Unticking money and creating refund leaves noun and refund, in that order. */
export async function check({ api, poll }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lezione 12");
  return poll(async () => {
    const row = (await api(`/api/decks/${deck.id}/cards`)).find((r) => r.card.term === TERM);
    if (row.card.tags.join() !== `noun,${NEW}`)
      throw new Error(`Tags: ${row.card.tags.join(", ")}`);
    return { term: TERM, tags: row.card.tags };
  });
}
