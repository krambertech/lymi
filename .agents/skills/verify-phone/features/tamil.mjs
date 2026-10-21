export const title = "Tamil";

const DECK = "தமிழ்";
/** No pronunciation: Lymi reads the spelling itself, tamizh pāḍal. */
const TERM = "தமிழ் பாடல்";
const MEANING = "Tamil song";
const LOAN_DECK = "பேக்";
/** Spelled pēk and said bēg, so the card holds its own reading. */
const LOAN_TERM = "பேக்";
const LOAN_READING = "bēg";
const LOAN_MEANING = "bag";
/** Known and not due, so மரம்'s reading fades in பள்ளி's example and its review stays empty. */
const KNOWN_DECK = "மரம்";
const KNOWN_TERM = "மரம்";
const FADE_DECK = "பள்ளி";
const FADE_TERM = "பள்ளி";
const FADE_MEANING = "school";
/** மரம் fades for the Known மரம்; மரத்தில், another form, keeps its reading. */
const FADE_EXAMPLE = "பள்ளியில் ஒரு மரம் உள்ளது, மரத்தில் பறவை.";

export async function env({ api }) {
  const json = (body) => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const deck = (name) => api("/api/decks", json({ name, defaultLanguage: "ta" }));
  const card = (deckId, term, meaning, extra = {}) => ({
    deckId,
    term,
    meaning,
    ...extra,
    enrich: false,
  });
  const song = await deck(DECK);
  const loan = await deck(LOAN_DECK);
  const known = await deck(KNOWN_DECK);
  const fade = await deck(FADE_DECK);
  const added = await api(
    "/api/cards/batch",
    json({
      cards: [
        card(known.id, KNOWN_TERM, "tree"),
        card(song.id, TERM, MEANING),
        card(loan.id, LOAN_TERM, LOAN_MEANING, { pronunciation: LOAN_READING }),
        card(fade.id, FADE_TERM, FADE_MEANING, { example: FADE_EXAMPLE }),
      ],
    }),
  );
  const knownId = added.results?.[0]?.card?.id;
  if (!knownId) throw new Error(`The Known card was not added: ${JSON.stringify(added)}`);
  await api(
    "/api/review/grade",
    json({
      cardId: knownId,
      mode: { cue: "term", target: "meaning" },
      rating: 4,
      reviewedAt: new Date(Date.now() - 86_400_000).toISOString(),
    }),
  );
  return {
    DECK,
    TERM,
    MEANING,
    LOAN_DECK,
    LOAN_TERM,
    LOAN_READING,
    LOAN_MEANING,
    FADE_DECK,
    FADE_TERM,
    FADE_MEANING,
    FADE_EXAMPLE,
  };
}

/** தமிழ் பாடல் keeps an empty pronunciation, since its reading comes from its spelling, and பேக் keeps bēg. */
export async function check({ api }) {
  const stored = async (term) =>
    (await api(`/api/cards?query=${encodeURIComponent(term)}`)).cards.find((c) => c.term === term);
  const song = await stored(TERM);
  const bag = await stored(LOAN_TERM);
  if (!song || song.pronunciation) throw new Error(`“${TERM}” is missing or holds a pronunciation`);
  if (bag?.pronunciation !== LOAN_READING) {
    throw new Error(`“${LOAN_TERM}” is stored without “${LOAN_READING}”`);
  }
  return { song, bag };
}
