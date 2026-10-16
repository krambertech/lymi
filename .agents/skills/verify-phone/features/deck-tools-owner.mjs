export const title = "Deck tools, as the owner";

const SECTIONS = ["At the office", "Around town", "Next week"];
const WAITING = "tramvaj";
const json = { "content-type": "application/json" };

/**
 * The learner's own deck gets three sections: five of its cards in each of the first two, and a new
 * card alone in the third, which waits while that section is locked.
 */
export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.role === "owner");
  const { cards } = await api(`/api/cards?deckId=${deck.id}&limit=50`);
  const ids = [];
  for (const [i, name] of SECTIONS.entries()) {
    const section = await api(`/api/decks/${deck.id}/sections`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ name }),
    });
    ids.push(section.id);
    if (i === 2) continue;
    await api(`/api/decks/${deck.id}/cards/section`, {
      method: "PUT",
      headers: json,
      body: JSON.stringify({
        cardIds: cards.slice(i * 5, i * 5 + 5).map((c) => c.id),
        sectionId: section.id,
      }),
    });
  }
  await api("/api/cards", {
    method: "POST",
    headers: json,
    body: JSON.stringify({ deckId: deck.id, term: WAITING, meaning: "a tram", sectionId: ids[2] }),
  });
  return { DECK_ID: deck.id, LOCKED: SECTIONS[2], WAITING };
}

/** Select all, then Mark important, marks every card in the deck. */
export async function check({ api, poll }) {
  const deck = (await api("/api/decks")).find((d) => d.role === "owner");
  return poll(async () => {
    const { cards } = await api(`/api/cards?deckId=${deck.id}&limit=100`);
    const unmarked = cards.filter((c) => !c.important).map((c) => c.term);
    if (unmarked.length) throw new Error(`Not marked: ${unmarked.join(", ")}`);
    return { marked: cards.length };
  });
}
