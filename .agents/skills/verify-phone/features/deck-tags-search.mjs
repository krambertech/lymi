export const title = "Deck tags, Find a tag";

const DECK = "Lezione 12";
const EXTRA = ["casa", "lavoro", "ufficio", "banca", "posta", "negozio", "tempo"].concat([
  "salute",
  "sport",
  "musica",
  "cibo",
  "viaggio",
  "scuola",
  "famiglia",
]);

/** Find a tag shows past fifteen tags, so the run spreads fourteen more over Lezione 12's cards, one each. */
export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.name === DECK);
  const rows = await api(`/api/decks/${deck.id}/cards`);
  await api("/api/cards/batch?response=terse", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      cards: rows.map((r, i) => ({
        cardId: r.card.id,
        tags: [...r.card.tags, EXTRA[i % EXTRA.length]],
      })),
    }),
  });
  return { DECK_ID: deck.id };
}

/** Archiving banca from the search and taking Undo there leaves it in use. */
export async function check({ api, poll }) {
  const deck = (await api("/api/decks")).find((d) => d.name === DECK);
  return poll(async () => {
    const { tags, archived } = await api(`/api/decks/${deck.id}/tags`);
    const banca = tags.find((t) => t.name === "banca");
    if (!banca || archived.length > 0)
      throw new Error(`Tags are ${JSON.stringify({ tags, archived })}`);
    return { tags: tags.length, banca: banca.cards };
  });
}
