export const title = "Adaptive pronunciation";

const DECK = "汉语";
const TERM = "学习";
const READING = "xuéxí";
const MEANING = "to study";

export async function env({ api }) {
  const json = (body) => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const deck = await api("/api/decks", json({ name: DECK, defaultLanguage: "zh-CN" }));
  await api(
    "/api/cards/batch",
    json({
      cards: [
        { deckId: deck.id, term: TERM, meaning: MEANING, pronunciation: READING, enrich: false },
      ],
    }),
  );
  return { DECK, DECK_ID: deck.id, TERM, READING, MEANING };
}

/** The switch the flow turned off is stored as the learner's own choice for the deck. */
export async function check({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.name === DECK);
  if (deck?.pronunciationDisplay !== "separate") {
    throw new Error(`“${DECK}” stores ${deck?.pronunciationDisplay}, not separate`);
  }
  return { deck };
}
