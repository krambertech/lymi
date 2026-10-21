export const title = "Right to left";

const DECK = "عربي";
/** An Arabic word holding a Latin one, which must stay to its left. */
const TERM = "كتاب PDF";
const MEANING = "book (as a PDF)";
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

/** The card is archived and kept its text as typed, with no isolate stored. */
export async function check({ api, poll }) {
  return poll(async () => {
    const { cards } = await api(`/api/cards?query=${encodeURIComponent("كتاب")}&archived=true`);
    const card = cards.find((c) => c.term === TERM);
    if (!card?.archivedAt) throw new Error(`“${TERM}” is not archived`);
    if (card.example !== EXAMPLE) throw new Error(`“${TERM}” lost its example`);
    return card;
  });
}
