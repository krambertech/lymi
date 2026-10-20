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
/** Known and not due, so its 行 háng fades in 行长's example and its review stays empty. */
const KNOWN_DECK = "银行";
const KNOWN_TERM = "银行";
const KNOWN_READING = "yínháng";
const FADE_DECK = "行长";
const FADE_TERM = "行长";
const FADE_MEANING = "bank president";
/** 行 háng fades for the Known 银行; 不行's 行 xíng never does. */
const FADE_EXAMPLE = "行长说不行[hángzhǎng shuō bù xíng]。";
const FADE_SPOKEN = "行长说不行。";

export async function env({ api }) {
  const json = (body) => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const card = (deckId, term, meaning, pronunciation, example) => ({
    deckId,
    term,
    meaning,
    pronunciation,
    ...(example ? { example } : {}),
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
  const known = await api("/api/decks", json({ name: KNOWN_DECK, defaultLanguage: "zh" }));
  const fade = await api("/api/decks", json({ name: FADE_DECK, defaultLanguage: "zh" }));
  const added = await api(
    "/api/cards/batch",
    json({
      cards: [
        card(known.id, KNOWN_TERM, "bank", KNOWN_READING),
        card(fade.id, FADE_TERM, FADE_MEANING, "hángzhǎng", FADE_EXAMPLE),
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
    READING,
    MEANING,
    TRAD_DECK,
    TRAD_TERM,
    TRAD_READING,
    TRAD_MEANING,
    FADE_DECK,
    FADE_TERM,
    FADE_MEANING,
    FADE_SPOKEN,
  };
}

/** The cards are New, which is what draws their pinyin on the cue, 一点儿's tone numbers are stored as marks, and 行长 keeps its example's pinyin. */
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
  const president = await stored(FADE_TERM);
  if (president?.example !== FADE_EXAMPLE) {
    throw new Error(`“${FADE_TERM}” lost its example’s pinyin`);
  }
  return { little, study, president };
}
