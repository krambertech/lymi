export const title = "Polish";

const DECK = "Polski";
const TERM = "muzyka";
/** Sent with an acute, as a Polish keyboard types it over a vowel; the Worker stores a grave. */
const SENT = "múzyka";
const STRESS = "mùzyka";
const MEANING = "music";

export async function env({ api }) {
  const json = (body) => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const deck = await api("/api/decks", json({ name: DECK, defaultLanguage: "pl" }));
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

/** The card is New, which underlines its stressed syllable on the cue, and its acute is stored as a grave. */
export async function check({ api }) {
  const { cards } = await api(`/api/cards?query=${encodeURIComponent(TERM)}`);
  const music = cards.find((c) => c.term === TERM);
  if (music?.pronunciation !== STRESS) throw new Error(`“${TERM}” is stored without “${STRESS}”`);
  return { music };
}
