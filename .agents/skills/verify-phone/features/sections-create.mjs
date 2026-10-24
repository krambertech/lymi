export const title = "Make a section";

const MOVED = "Lesson 1";
const EMPTY = "Lesson 2";

/** The learner's own deck, which the seed leaves without sections. */
export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.role === "owner");
  const { sections } = await api(`/api/decks/${deck.id}/sections`);
  if (sections.length) throw new Error(`The deck already has ${sections.length} sections`);
  return { DECK_ID: deck.id, MOVED, EMPTY };
}

/** Every card is in the section made from Move to section, and the menu's section is empty. */
export async function check({ api, poll }) {
  const deck = (await api("/api/decks")).find((d) => d.role === "owner");
  return poll(async () => {
    const { sections } = await api(`/api/decks/${deck.id}/sections`);
    const { cards } = await api(`/api/cards?deckId=${deck.id}&limit=100`);
    const moved = sections.find((s) => s.name === MOVED);
    const empty = sections.find((s) => s.name === EMPTY);
    if (!moved || !empty) throw new Error(`Sections are ${sections.map((s) => s.name).join(", ")}`);
    const outside = cards.filter((c) => c.sectionId !== moved.id).map((c) => c.term);
    if (outside.length) throw new Error(`Not moved: ${outside.join(", ")}`);
    if (empty.total !== 0) throw new Error(`${EMPTY} holds ${empty.total} cards`);
    return { sections: sections.map((s) => [s.name, s.total]), cards: cards.length };
  });
}
