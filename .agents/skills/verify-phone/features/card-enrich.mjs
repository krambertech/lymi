export const title = "Enrich a card";

const DECK = "Lezione 12";
const json = { "content-type": "application/json" };
/** What the flow was given, for the check that follows it in the same run. */
let given;

/**
 * Clears one card's example in Lezione 12, leaves another missing only its example's translation,
 * and says yes to AI, so Enrich goes straight to its request.
 */
export async function env({ api }) {
  await api("/api/settings/ai-consent", {
    method: "PUT",
    headers: json,
    body: JSON.stringify({ allowed: true, version: 1, updated_at: Date.now() }),
  });
  const deck = (await api("/api/decks")).find((d) => d.name === DECK);
  const [card, translated] = (await api(`/api/decks/${deck.id}/cards`))
    .filter((r) => r.card.example)
    .map((r) => r.card);
  await api(`/api/cards/${card.id}`, {
    method: "PATCH",
    headers: json,
    body: JSON.stringify({ example: "" }),
  });
  await api(`/api/cards/${translated.id}`, {
    method: "PATCH",
    headers: json,
    body: JSON.stringify({
      notes: translated.notes || "A note.",
      pronunciation: translated.pronunciation || "a reading",
      exampleTranslation: "",
    }),
  });
  given = { deckId: deck.id, id: card.id, translatedId: translated.id };
  return {
    DECK_ID: deck.id,
    CARD_ID: card.id,
    TERM: card.term,
    TRANSLATION_CARD_ID: translated.id,
    TRANSLATION_TERM: translated.term,
  };
}

/** A local Worker has no vendor key, so the request is refused and the card stays as it was. */
export async function check({ api, poll }) {
  return poll(async () => {
    const rows = await api(`/api/decks/${given.deckId}/cards`);
    const card = rows.find((r) => r.card.id === given.id)?.card;
    if (!card) throw new Error("The card left its deck");
    if (card.example) throw new Error(`“${card.term}” has an example`);
    if (card.enrichmentStatus === "working") throw new Error(`“${card.term}” is stuck working`);
    const translated = rows.find((r) => r.card.id === given.translatedId)?.card;
    if (!translated) throw new Error("The translated card left its deck");
    if (translated.exampleTranslation) throw new Error(`“${translated.term}” has a translation`);
    return { term: card.term, example: card.example, status: card.enrichmentStatus };
  });
}
