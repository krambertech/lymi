export const title = "Russian";

const DECK = "Русский";
const TERM = "замок";
/** Sent with a Latin ó, as a keyboard without Cyrillic marks types it; the Worker stores о and U+0301. */
const SENT = "замóк";
const STRESS = "замо́к";
const MEANING = "a lock";
const STRESSED = "мука́";

export async function env({ api }) {
  const json = (body) => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const deck = await api("/api/decks", json({ name: DECK, defaultLanguage: "ru" }));
  const other = await api("/api/decks", json({ name: "Мука", defaultLanguage: "ru" }));
  await api(
    "/api/cards/batch",
    json({
      cards: [
        { deckId: deck.id, term: TERM, meaning: MEANING, pronunciation: SENT, enrich: false },
        // Sent with its stress in the term, as a lesson marks it, in its own deck so the review
        // opens on замок; the Worker splits it.
        { deckId: other.id, term: STRESSED, meaning: "flour", enrich: false },
      ],
    }),
  );
  return { DECK, TERM, STRESS, MEANING };
}

/**
 * The card is New, which draws its stress on the cue, its Latin ó is stored as о and U+0301, and
 * a term sent with its stress is stored split.
 */
export async function check({ api }) {
  const { cards } = await api(`/api/cards?query=${encodeURIComponent(TERM)}`);
  const lock = cards.find((c) => c.term === TERM);
  if (lock?.pronunciation !== STRESS) throw new Error(`“${TERM}” is stored without “${STRESS}”`);
  const flour = (await api(`/api/cards?term=${encodeURIComponent(STRESSED)}`)).cards[0];
  if (flour?.term !== "мука" || flour.pronunciation !== STRESSED) {
    throw new Error(`“${STRESSED}” is stored as ${JSON.stringify(flour)}`);
  }
  return { lock, flour };
}
