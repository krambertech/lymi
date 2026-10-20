export const title = "Russian";

const DECK = "Русский";
const TERM = "замок";
/** Sent with a Latin ó, as a keyboard without Cyrillic marks types it; the Worker stores о and U+0301. */
const SENT = "замóк";
const STRESS = "замо́к";
const MEANING = "a lock";

export async function env({ api }) {
  const json = (body) => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const deck = await api("/api/decks", json({ name: DECK, defaultLanguage: "ru" }));
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

/** The card is New, which draws its stress on the cue, and its Latin ó is stored as о and U+0301. */
export async function check({ api }) {
  const { cards } = await api(`/api/cards?query=${encodeURIComponent(TERM)}`);
  const lock = cards.find((c) => c.term === TERM);
  if (lock?.pronunciation !== STRESS) throw new Error(`“${TERM}” is stored without “${STRESS}”`);
  return { lock };
}
