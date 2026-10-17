export const title = "Japanese";

const DECK = "日本語";
const TERM = "直角";
const READING = "ちょっかく";
const EXAMPLE = "この角[かど]は直角[ちょっかく]だ。";
/** What VoiceOver hears for the example: the readings in place of their kanji. */
const EXAMPLE_SPOKEN = "このかどはちょっかくだ。";
const KNOWN_DECK = "漢字";
const KNOWN_TERM = "見る";
const KNOWN_READING = "みる";

export async function env({ api }) {
  const json = (body) => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const card = (deckId, term, pronunciation, meaning, example) => ({
    deckId,
    term,
    meaning,
    pronunciation,
    ...(example ? { example } : {}),
    enrich: false,
  });
  const deck = await api("/api/decks", json({ name: DECK, defaultLanguage: "ja" }));
  await api(
    "/api/cards/batch",
    json({ cards: [card(deck.id, TERM, READING, "right angle", EXAMPLE)] }),
  );
  // Easy on a new card makes it Known; graded two months ago, it is due again today.
  const known = await api("/api/decks", json({ name: KNOWN_DECK, defaultLanguage: "ja" }));
  const added = await api(
    "/api/cards/batch",
    json({ cards: [card(known.id, KNOWN_TERM, KNOWN_READING, "to see")] }),
  );
  const knownId = added.results?.[0]?.card?.id;
  if (!knownId) throw new Error(`“${KNOWN_TERM}” was not added: ${JSON.stringify(added)}`);
  await api(
    "/api/review/grade",
    json({
      cardId: knownId,
      mode: { cue: "term", target: "meaning" },
      rating: 4,
      reviewedAt: new Date(Date.now() - 60 * 86_400_000).toISOString(),
    }),
  );
  return {
    DECK,
    TERM,
    READING,
    EXAMPLE_SPOKEN,
    KNOWN_DECK,
    KNOWN_TERM,
    KNOWN_READING,
  };
}

/** Review draws what is stored: the new card keeps its readings and the other is Known. */
export async function check({ api }) {
  const { cards } = await api(`/api/cards?query=${encodeURIComponent(TERM)}`);
  const card = cards.find((c) => c.term === TERM);
  if (card?.pronunciation !== READING) throw new Error(`“${TERM}” is stored without “${READING}”`);
  if (card.example !== EXAMPLE) throw new Error(`“${TERM}” lost its example’s readings`);
  return card;
}
