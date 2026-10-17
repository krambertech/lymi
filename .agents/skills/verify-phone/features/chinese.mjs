export const title = "Chinese";

const DECK = "中文";
const TERM = "学习";
const READING = "xuéxí";
const MEANING = "to study";

export async function env({ api }) {
  const json = (body) => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const deck = await api("/api/decks", json({ name: DECK, defaultLanguage: "zh" }));
  await api(
    "/api/cards/batch",
    json({
      cards: [
        { deckId: deck.id, term: TERM, meaning: MEANING, pronunciation: READING, enrich: false },
      ],
    }),
  );
  return { DECK, TERM, READING, MEANING };
}

/** The card is New, which is what keeps its pinyin on the cue. */
export async function check({ api }) {
  const { cards } = await api(`/api/cards?query=${encodeURIComponent(TERM)}`);
  const card = cards.find((c) => c.term === TERM);
  if (card?.pronunciation !== READING) throw new Error(`“${TERM}” is stored without “${READING}”`);
  return card;
}
