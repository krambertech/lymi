export const title = "Tags on Edit card";

const TERM = "il rimborso";
const NEW = "refund";

/** Il rimborso in Lezione 12 carries noun and money. */
export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lezione 12");
  const row = (await api(`/api/decks/${deck.id}/cards`)).find((r) => r.card.term === TERM);
  return { DECK_ID: deck.id, CARD_ID: row.card.id, NEW };
}

/** Unticking money, creating refund, typing "loan, bank", Return on noun, and fees left typed leave noun, refund, loan, bank and fees. */
export async function check({ api, poll }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lezione 12");
  return poll(async () => {
    const row = (await api(`/api/decks/${deck.id}/cards`)).find((r) => r.card.term === TERM);
    if (row.card.tags.join() !== `noun,${NEW},loan,bank,fees`)
      throw new Error(`Tags: ${row.card.tags.join(", ")}`);
    return { term: TERM, tags: row.card.tags };
  });
}
