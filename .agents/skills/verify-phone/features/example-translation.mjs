export const title = "Example translation and audio";

const DECK = "Deutsch";
const TERM = "der Hund";
const EXAMPLE = "Der Hund schläft.";
const TRANSLATION = "The dog is sleeping.";
const WORDS = "Wörter";
const UK_TERM = "die Katze";
const UK_TRANSLATION = "Кішка п’є молоко.";
const STALE_TERM = "das Brot";
const STALE_TRANSLATION = "I eat bread.";
const JA_DECK = "日本語";
const JA_TERM = "直角";
const JA_TRANSLATION = "This corner is a right angle.";
/** What VoiceOver hears for the Japanese example: its readings in place of their kanji. */
const JA_SPOKEN = "この.*ちょっかく.*だ。";
const IT_DECK = "Italiano";
const IT_TERM = "il pane";
/** What `/api/dev/enrich` writes for an Italian card, as the AI. */
const IT_EXAMPLE = "Dov'è il pane?";
const IT_TRANSLATION = `Where is ${IT_TERM}?`;
const IT_NEW_EXAMPLE = "Dov'è il pane oggi?";

export async function env({ api }) {
  const json = (body, method = "POST") => ({
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const deck = (name, defaultLanguage) => api("/api/decks", json({ name, defaultLanguage }));
  const add = async (deckId, cards) => {
    const added = await api(
      "/api/cards/batch",
      json({ cards: cards.map((c) => ({ deckId, enrich: false, ...c })) }),
    );
    return (added.results ?? []).map((r) => r.card);
  };
  const de = await deck(DECK, "de");
  await add(de.id, [
    { term: TERM, meaning: "dog", example: EXAMPLE, exampleTranslation: TRANSLATION },
  ]);
  const words = await deck(WORDS, "de");
  const [, brot] = await add(words.id, [
    {
      term: UK_TERM,
      meaning: "кішка",
      example: "Die Katze trinkt Milch.",
      exampleTranslation: UK_TRANSLATION,
    },
    {
      term: STALE_TERM,
      meaning: "bread",
      example: "Ich esse Brot.",
      exampleTranslation: STALE_TRANSLATION,
    },
  ]);
  // A new example leaves the learner's own translation in place, written for the old one.
  await api(`/api/cards/${brot.id}`, json({ example: "Ich backe Brot." }, "PATCH"));
  const ja = await deck(JA_DECK, "ja");
  await add(ja.id, [
    {
      term: JA_TERM,
      meaning: "right angle",
      pronunciation: "ちょっかく",
      example: "この角[かど]は直角[ちょっかく]だ。",
      exampleTranslation: JA_TRANSLATION,
    },
  ]);
  // The newest card with no example takes the AI's example and translation.
  const it = await deck(IT_DECK, "it");
  await add(it.id, [{ term: IT_TERM, meaning: "bread" }]);
  await api("/api/dev/enrich", json({ count: 1 }));
  return {
    DECK,
    TERM,
    TRANSLATION,
    WORDS,
    UK_TERM,
    UK_TRANSLATION,
    STALE_TERM,
    STALE_TRANSLATION,
    JA_DECK,
    JA_TERM,
    JA_SPOKEN,
    JA_TRANSLATION,
    IT_DECK,
    IT_TERM,
    // Maestro matches by regular expression, where the question mark is a quantifier.
    IT_TRANSLATION: IT_TRANSLATION.replace("?", "\\?"),
  };
}

/** The new example saved, with the AI's old translation gone rather than kept as the learner's. */
export async function check({ api, poll }) {
  return poll(async () => {
    const { cards } = await api(`/api/cards?query=${encodeURIComponent(IT_TERM)}`);
    const card = cards.find((c) => c.term === IT_TERM);
    if (card?.example !== IT_NEW_EXAMPLE) throw new Error(`“${IT_TERM}” kept “${card?.example}”`);
    if (card.exampleTranslation === IT_TRANSLATION) {
      throw new Error(`“${IT_TERM}” kept the AI’s translation of “${IT_EXAMPLE}”`);
    }
    return card;
  });
}
