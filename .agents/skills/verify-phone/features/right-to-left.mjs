export const title = "Right to left";

/** A deck name holding a Latin level, which isolation keeps to the Arabic word's left. */
const DECK = "عربي A1";
/** An Arabic word holding a Latin one, which must stay to its left. */
const TERM = "كتاب PDF";
const MEANING = "book, as a PDF";
const EXAMPLE = "قرأتُ كتاب Harry Potter مرتين";

export async function env({ api }) {
  const json = (body) => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const deck = await api("/api/decks", json({ name: DECK, defaultLanguage: "ar" }));
  await api(
    "/api/cards/batch",
    json({
      cards: [{ deckId: deck.id, term: TERM, meaning: MEANING, example: EXAMPLE, enrich: false }],
    }),
  );
  return { DECK, DECK_ID: deck.id, TERM, MEANING };
}

/** The deck is archived under its name as typed, with no isolate stored. */
export async function check({ api, poll }) {
  return poll(async () => {
    const decks = await api("/api/decks?archived=true");
    const deck = decks.find((d) => d.name === DECK);
    if (!deck) throw new Error(`“${DECK}” is not among the archived decks`);
    return deck;
  });
}
