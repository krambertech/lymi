export const title = "Cantonese";

const DECK = "廣東話";
const TERM = "搭𨋢";
/** Sent with raised tone numbers, which the Worker stores as digits. */
const SENT = "daap³ lip¹";
const READING = "daap3 lip1";
const MEANING = "to take the lift";
/** Known and not due, so its 行 hong4 fades in 行業's example and its review stays empty. */
const KNOWN_DECK = "銀行";
const FADE_DECK = "行業";
const FADE_TERM = "行業";
const FADE_MEANING = "industry";
/** 行 hong4 fades for the Known 銀行; 難行's 行 hang4 never does. */
const FADE_EXAMPLE = "呢個行業好難行[ni1 go3 hong4 jip6 hou2 naan4 hang4]。";
const FADE_SPOKEN = "呢個行業好難行。";

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
  const deck = await api("/api/decks", json({ name: DECK, defaultLanguage: "yue" }));
  const known = await api("/api/decks", json({ name: KNOWN_DECK, defaultLanguage: "zh-yue" }));
  const fade = await api("/api/decks", json({ name: FADE_DECK, defaultLanguage: "yue" }));
  const added = await api(
    "/api/cards/batch",
    json({
      cards: [
        card(known.id, "銀行", "bank", "ngan4 hong4"),
        card(deck.id, TERM, MEANING, SENT),
        card(fade.id, FADE_TERM, FADE_MEANING, "hong4 jip6", FADE_EXAMPLE),
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
  return { DECK, TERM, READING, MEANING, FADE_DECK, FADE_TERM, FADE_MEANING, FADE_SPOKEN };
}

/** 搭𨋢's raised tone numbers are stored as digits, and 行業 keeps its example's Jyutping. */
export async function check({ api }) {
  const stored = async (term) =>
    (await api(`/api/cards?query=${encodeURIComponent(term)}`)).cards.find((c) => c.term === term);
  const lift = await stored(TERM);
  if (lift?.pronunciation !== READING) throw new Error(`“${TERM}” is stored without “${READING}”`);
  const trade = await stored(FADE_TERM);
  if (trade?.example !== FADE_EXAMPLE)
    throw new Error(`“${FADE_TERM}” lost its example’s Jyutping`);
  return { lift, trade };
}
