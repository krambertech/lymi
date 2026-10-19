export const title = "Every sheet, one after another";

const json = { "content-type": "application/json" };

/**
 * Lezione 12 gets two sections and an archived third, so the sections' sheets have something to
 * list, and the card form opens on il rimborso for Edit card's tags.
 */
export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lezione 12");
  const add = (name) =>
    api(`/api/decks/${deck.id}/sections`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ name }),
    });
  await add("Greetings");
  await add("At the bank");
  const gone = await add("Old lesson");
  await api(`/api/sections/${gone.id}/archive`, {
    method: "POST",
    headers: json,
    body: JSON.stringify({ cards: "keep" }),
  });
  const row = (await api(`/api/decks/${deck.id}/cards`)).find((r) => r.card.term === "il rimborso");
  return { DECK_ID: deck.id, CARD_ID: row.card.id };
}

/** The flows only look; the screenshots are the evidence. */
export async function check({ api }) {
  return { decks: (await api("/api/decks")).length };
}
