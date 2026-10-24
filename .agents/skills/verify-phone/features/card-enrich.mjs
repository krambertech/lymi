export const title = "Enrich a card";

const DECK = "Lezione 12";
const json = { "content-type": "application/json" };
/** What the flow was given, for the check that follows it in the same run. */
let given;

/** Clears one card's example in Lezione 12 and says yes to AI, so Enrich goes straight to its request. */
export async function env({ api }) {
  await api("/api/settings/ai-consent", {
    method: "PUT",
    headers: json,
    body: JSON.stringify({ allowed: true, version: 1, updated_at: Date.now() }),
  });
  const deck = (await api("/api/decks")).find((d) => d.name === DECK);
  const card = (await api(`/api/decks/${deck.id}/cards`)).find((r) => r.card.example)?.card;
  await api(`/api/cards/${card.id}`, {
    method: "PATCH",
    headers: json,
    body: JSON.stringify({ example: "" }),
  });
  given = { deckId: deck.id, id: card.id };
  return { DECK_ID: deck.id, CARD_ID: card.id, TERM: card.term };
}

/** A local Worker has no vendor key, so the request is refused and the card stays as it was. */
export async function check({ api, poll }) {
  return poll(async () => {
    const rows = await api(`/api/decks/${given.deckId}/cards`);
    const card = rows.find((r) => r.card.id === given.id)?.card;
    if (!card) throw new Error("The card left its deck");
    if (card.example) throw new Error(`“${card.term}” has an example`);
    if (card.enrichmentStatus === "working") throw new Error(`“${card.term}” is stuck working`);
    return { term: card.term, example: card.example, status: card.enrichmentStatus };
  });
}
