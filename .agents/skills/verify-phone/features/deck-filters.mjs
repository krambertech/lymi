export const title = "Deck filters, then a review of what they show";

const TAG = "paperwork";
const json = { "content-type": "application/json" };
/** The deck and its tagged cards, which check reads back. */
let deckId = "";
let tagged = [];

const dueIds = async (api) =>
  new Set((await api(`/api/review/draw?deck=${deckId}`)).cards.map((c) => c.card.id));

/**
 * The persona's due cards are picked at each reset, so in the learner's deck with the most due, up
 * to two due cards and one that is not due are tagged paperwork for the selection to review.
 */
export async function env({ api }) {
  const [deck] = (await api("/api/decks"))
    .filter((d) => d.role === "owner")
    .sort((a, b) => b.due - a.due);
  deckId = deck.id;
  const { cards } = await api(`/api/cards?deckId=${deck.id}&limit=100`);
  const due = await dueIds(api);
  if (!due.size) throw new Error("No deck of the learner's has a card due");
  const chosen = [
    ...cards.filter((c) => due.has(c.id)).slice(0, 2),
    ...cards.filter((c) => !due.has(c.id)).slice(0, 1),
  ];
  for (const card of chosen) {
    await api(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: json,
      body: JSON.stringify({ tags: [...card.tags, TAG] }),
    });
  }
  tagged = chosen.map((c) => c.id);
  const other = cards.find((c) => !tagged.includes(c.id));
  return {
    DECK_ID: deck.id,
    TAG,
    TOTAL: cards.length,
    KEPT: chosen.length,
    TAGGED_TERM: chosen[0].term,
    OTHER_TERM: other.term,
  };
}

/** The selection's review graded tagged cards only: every grade today in the deck is on one. */
export async function check({ api, poll }) {
  return poll(async () => {
    const { log } = await api(`/api/review/draw?deck=${deckId}`);
    const graded = [...new Set(log.map((entry) => entry.cardId))];
    if (!graded.length) throw new Error("Nothing graded today");
    const stray = graded.filter((id) => !tagged.includes(id));
    if (stray.length) throw new Error(`Graded outside the filter: ${stray.join(", ")}`);
    return { deckId, graded: graded.length };
  });
}
