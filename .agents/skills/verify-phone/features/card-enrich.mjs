export const title = "Enrich a card";

const DECK = "Lezione 12";
/** What the flow was given, for the check that follows it in the same run. */
let given;

/** Clears the example of two cards in Lezione 12, so each has a field the deck lets the AI fill. */
export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.name === DECK);
  const rows = (await api(`/api/decks/${deck.id}/cards`)).filter((r) => r.card.example);
  const [first, second] = rows.map((r) => r.card);
  for (const card of [first, second]) {
    await api(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ example: "" }),
    });
  }
  given = { deckId: deck.id, ids: [first.id, second.id] };
  return { DECK_ID: deck.id, CARD_ID: first.id, TERM: first.term, OTHER_TERM: second.term };
}

/** A local Worker has no vendor key, so both requests are refused and the cards stay as they were. */
export async function check({ api, poll }) {
  return poll(async () => {
    const rows = await api(`/api/decks/${given.deckId}/cards`);
    const cards = given.ids.map((id) => rows.find((r) => r.card.id === id)?.card);
    for (const card of cards) {
      if (!card) throw new Error("A card left its deck");
      if (card.example) throw new Error(`“${card.term}” has an example`);
      if (card.enrichmentStatus === "working") throw new Error(`“${card.term}” is stuck working`);
    }
    return cards.map((c) => ({ term: c.term, example: c.example, status: c.enrichmentStatus }));
  });
}
