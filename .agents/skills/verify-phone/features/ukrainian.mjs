export const title = "Ukrainian";

const DECK = "Українська";
const TERM = "неділя";
/** Sent with a Latin í, as a keyboard without Cyrillic marks types it; the Worker stores і and U+0301. */
const SENT = "недíля";
const STRESS = "неді́ля";
const MEANING = "Sunday";

export async function env({ api }) {
  const json = (body) => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const deck = await api("/api/decks", json({ name: DECK, defaultLanguage: "uk" }));
  await api(
    "/api/cards/batch",
    json({
      cards: [
        { deckId: deck.id, term: TERM, meaning: MEANING, pronunciation: SENT, enrich: false },
      ],
    }),
  );
  return { DECK, TERM, STRESS, MEANING };
}

/** The card is New, which draws its stress on the cue, and its Latin í is stored as і and U+0301. */
export async function check({ api }) {
  const { cards } = await api(`/api/cards?query=${encodeURIComponent(TERM)}`);
  const sunday = cards.find((c) => c.term === TERM);
  if (sunday?.pronunciation !== STRESS) throw new Error(`“${TERM}” is stored without “${STRESS}”`);
  return { sunday };
}
