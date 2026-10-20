export const title = "Chinese";

const DECK = "中文";
const TERM = "一点儿";
/** Sent with tone numbers, which the Worker stores as marks. */
const SENT = "yi4 dian3r";
const READING = "yì diǎnr";
const MEANING = "a little";
const TRAD_DECK = "國語";
const TRAD_TERM = "學習";
const TRAD_READING = "xuéxí";
const TRAD_MEANING = "to study";

export async function env({ api }) {
  const json = (body) => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const card = (deckId, term, meaning, pronunciation) => ({
    deckId,
    term,
    meaning,
    pronunciation,
    enrich: false,
  });
  const deck = await api("/api/decks", json({ name: DECK, defaultLanguage: "zh" }));
  const trad = await api("/api/decks", json({ name: TRAD_DECK, defaultLanguage: "zh-TW" }));
  await api(
    "/api/cards/batch",
    json({
      cards: [
        card(deck.id, TERM, MEANING, SENT),
        card(trad.id, TRAD_TERM, TRAD_MEANING, TRAD_READING),
      ],
    }),
  );
  return { DECK, TERM, READING, MEANING, TRAD_DECK, TRAD_TERM, TRAD_READING, TRAD_MEANING };
}

/** Both cards are New, which is what draws their pinyin on the cue, and 一点儿's tone numbers are stored as marks. */
export async function check({ api }) {
  const stored = async (term) =>
    (await api(`/api/cards?query=${encodeURIComponent(term)}`)).cards.find((c) => c.term === term);
  const little = await stored(TERM);
  const study = await stored(TRAD_TERM);
  if (little?.pronunciation !== READING)
    throw new Error(`“${TERM}” is stored without “${READING}”`);
  if (study?.pronunciation !== TRAD_READING) {
    throw new Error(`“${TRAD_TERM}” is stored without “${TRAD_READING}”`);
  }
  return { little, study };
}
