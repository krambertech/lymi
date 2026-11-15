export const title = "Pitch accent";
export const persona = "learner";

const DECK = "ピッチ";
const TERM = "図書館";
const READING = "としょかん";
const TWO_TERM = "考える";

export async function env({ api }) {
  const json = (body) => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const deck = await api("/api/decks", json({ name: DECK, defaultLanguage: "ja" }));
  const card = (term, pronunciation, meaning) => ({
    deckId: deck.id,
    term,
    pronunciation,
    meaning,
    enrich: false,
  });
  await api(
    "/api/cards/batch",
    json({
      cards: [
        card(TERM, `${READING} [2]`, "library"),
        card(TWO_TERM, "かんがえる [4][3]", "to think"),
      ],
    }),
  );
  return { DECK, TERM, READING, TWO_TERM };
}

/** The Reading keeps its accent, so the chart comes from what is stored. */
export async function check({ api }) {
  const { cards } = await api(`/api/cards?query=${encodeURIComponent(TERM)}`);
  const card = cards.find((c) => c.term === TERM);
  if (card?.pronunciation !== `${READING} [2]`) throw new Error(`“${TERM}” lost its pitch accent`);
  return card;
}
