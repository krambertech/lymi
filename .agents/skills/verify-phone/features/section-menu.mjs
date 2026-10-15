export const title = "Section heading menu";

const SECTIONS = ["At the office", "Around town"];

/** The phone signs in only as `learner`, who has no sections, so the run gives one deck two. */
export async function env({ api }) {
  const json = { "content-type": "application/json" };
  const [deck] = await api("/api/decks");
  const { cards } = await api(`/api/cards?deckId=${deck.id}&limit=50`);
  for (const [i, name] of SECTIONS.entries()) {
    const section = await api(`/api/decks/${deck.id}/sections`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ name }),
    });
    await api(`/api/decks/${deck.id}/cards/section`, {
      method: "PUT",
      headers: json,
      body: JSON.stringify({
        cardIds: cards.slice(i * 5, i * 5 + 5).map((c) => c.id),
        sectionId: section.id,
      }),
    });
  }
  return { DECK_ID: deck.id, SECTION: SECTIONS[0] };
}

/** Opening Sections in Edit changes nothing until a row is dragged. */
export async function check({ api }) {
  const [deck] = await api("/api/decks");
  const { sections } = await api(`/api/decks/${deck.id}/sections`);
  const names = sections.map((s) => s.name);
  if (names.join() !== SECTIONS.join()) throw new Error(`Sections are ${names.join(", ")}`);
  return { sections: names };
}
