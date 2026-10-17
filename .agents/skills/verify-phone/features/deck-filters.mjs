export const title = "Deck filters and a filtered review";

const TAG = "paperwork";
const json = { "content-type": "application/json" };
/** The deck and the tag's cards the draw named, which check reads back. */
let deckId = "";
let drawn = [];

const draw = (api, cards) =>
  api("/api/review/draw", {
    method: "POST",
    headers: json,
    body: JSON.stringify({ cards, deck: deckId }),
  });

/**
 * The persona's due cards are picked at each reset, so in the learner's deck with the most due, up
 * to two due cards and one that is not due are tagged paperwork for the filtered review to draw.
 */
export async function env({ api }) {
  const [deck] = (await api("/api/decks"))
    .filter((d) => d.role === "owner")
    .sort((a, b) => b.due - a.due);
  deckId = deck.id;
  const { cards } = await api(`/api/cards?deckId=${deck.id}&limit=100`);
  const due = new Set(
    (
      await draw(
        api,
        cards.map((c) => c.id),
      )
    ).cards.map((c) => c.card.id),
  );
  const tagged = [
    ...cards.filter((c) => due.has(c.id)).slice(0, 2),
    ...cards.filter((c) => !due.has(c.id)).slice(0, 1),
  ];
  if (!due.size) throw new Error("No deck of the learner's has a card due");
  for (const card of tagged) {
    await api(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: json,
      body: JSON.stringify({ tags: [...card.tags, TAG] }),
    });
  }
  drawn = (
    await draw(
      api,
      tagged.map((c) => c.id),
    )
  ).cards.map((c) => c.card.id);
  const other = cards.find((c) => !tagged.includes(c));
  return {
    DECK_ID: deck.id,
    TAG,
    TOTAL: cards.length,
    KEPT: tagged.length,
    DUE: drawn.length,
    TAGGED_TERM: tagged[0].term,
    OTHER_TERM: other.term,
  };
}

/** The filtered review graded every tagged card it drew, so each has a grade today. */
export async function check({ api, poll }) {
  return poll(async () => {
    const { log } = await draw(api, drawn);
    const graded = new Set(log.map((entry) => entry.cardId));
    const left = drawn.filter((id) => !graded.has(id));
    if (left.length) throw new Error(`Not graded today: ${left.join(", ")}`);
    return { deckId, graded: drawn.length };
  });
}
