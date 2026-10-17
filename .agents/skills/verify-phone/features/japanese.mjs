export const title = "Japanese";

const DECK = "日本語";
const TERM = "直角";
const READING = "ちょっかく";
const EXAMPLE = "この角は直角だ。";

export async function env({ api }) {
  const json = (body) => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const deck = await api("/api/decks", json({ name: DECK, defaultLanguage: "ja" }));
  await api(
    "/api/cards/batch",
    json({
      cards: [
        {
          deckId: deck.id,
          term: TERM,
          meaning: "right angle",
          pronunciation: READING,
          example: EXAMPLE,
          enrich: false,
        },
      ],
    }),
  );
  return { DECK, TERM, READING, EXAMPLE };
}

/** Review shows what is stored, so the stored card must still carry its reading. */
export async function check({ api }) {
  const { cards } = await api(`/api/cards?query=${encodeURIComponent(TERM)}`);
  const card = cards.find((c) => c.term === TERM);
  if (card?.pronunciation !== READING) throw new Error(`“${TERM}” is stored without “${READING}”`);
  return card;
}
