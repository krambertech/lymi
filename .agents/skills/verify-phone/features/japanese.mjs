export const title = "Japanese";

const DECK = "日本語";
const TERM = "直角";
const READING = "ちょっかく";
const EXAMPLE = "この角[かど]は直角[ちょっかく]だ。";
/** What VoiceOver hears for the example: the readings in place of their kanji, and 角 as written, since the Known 角 fades its reading. */
const EXAMPLE_SPOKEN = "この角はちょっかくだ。";
const ROWS_DECK = "動詞";
/** A verb whose forms run past the row's width, to show they wrap after the term. */
const VERB = "食べる · 食べます · 食べた · 食べない · 食べられる · 食べさせる · 食べさせられる";
const VERB_READING = "たべる";
/** A term past the row's three lines, to show the ellipsis and the ★ after it. */
const LONG_TERM =
  "経済的な理由で大学を辞めなければならなかった学生たちは、新しい仕事を探すために毎日図書館に通って夜遅くまで勉強を続けていた";
const LONG_READING =
  "けいざいてきなりゆうでだいがくをやめなければならなかったがくせいたちはあたらしいしごとをさがすためにまいにちとしょかんにかよってよるおそくまでべんきょうをつづけていた";
const KNOWN_DECK = "漢字";
const KNOWN_TERM = "見る";
const KNOWN_READING = "みる";
/** Known in another deck and not due, so its reading fades in the example. */
const FADED_TERM = "角";
const FADED_READING = "かど";

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
  const rows = await api("/api/decks", json({ name: ROWS_DECK, defaultLanguage: "ja" }));
  const long = await api(
    "/api/cards/batch",
    json({
      cards: [
        card(rows.id, LONG_TERM, LONG_READING, "a long phrase"),
        card(rows.id, VERB, VERB_READING, "to eat"),
      ],
    }),
  );
  await api(
    "/api/cards/important",
    json({ cards: long.results.map((r) => ({ cardId: r.card.id, important: true })) }),
  );
  await api(
    "/api/cards/batch",
    json({ cards: [card(deck.id, TERM, READING, "right angle", EXAMPLE)] }),
  );
  // Easy on a new card makes it Known; graded two months ago, it is due again today.
  const known = await api("/api/decks", json({ name: KNOWN_DECK, defaultLanguage: "ja" }));
  const added = await api(
    "/api/cards/batch",
    json({
      cards: [
        card(known.id, KNOWN_TERM, KNOWN_READING, "to see"),
        card(known.id, FADED_TERM, FADED_READING, "corner"),
      ],
    }),
  );
  const [knownId, fadedId] = (added.results ?? []).map((r) => r.card?.id);
  if (!knownId || !fadedId)
    throw new Error(`The Known cards were not added: ${JSON.stringify(added)}`);
  const easy = (cardId, days) =>
    api(
      "/api/review/grade",
      json({
        cardId,
        mode: { cue: "term", target: "meaning" },
        rating: 4,
        reviewedAt: new Date(Date.now() - days * 86_400_000).toISOString(),
      }),
    );
  await easy(knownId, 60);
  // Graded yesterday, 角 is Known and not due, so 漢字's review still holds 見る alone.
  await easy(fadedId, 1);
  return {
    DECK,
    TERM,
    READING,
    EXAMPLE_SPOKEN,
    KNOWN_DECK,
    KNOWN_TERM,
    KNOWN_READING,
    ROWS_DECK,
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
