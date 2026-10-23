export const title = "Archive a section";

const SECTIONS = ["At the office", "Around town"];
const json = { "content-type": "application/json" };

/** The learner's own deck gets two sections of five cards each, since the seed has none. */
export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.role === "owner");
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
  return { DECK_ID: deck.id, FIRST: SECTIONS[0], SECOND: SECTIONS[1] };
}

/** The first section is archived with its five cards; Undo brought the second back with its five. */
export async function check({ api, poll }) {
  const deck = (await api("/api/decks")).find((d) => d.role === "owner");
  return poll(async () => {
    const { sections } = await api(`/api/decks/${deck.id}/sections`);
    const archived = (await api(`/api/decks/${deck.id}/sections?archived=true`)).sections;
    const first = archived.find((s) => s.name === SECTIONS[0]);
    const second = sections.find((s) => s.name === SECTIONS[1]);
    if (first?.archivedCards !== 5) throw new Error(`${SECTIONS[0]}: ${JSON.stringify(first)}`);
    if (sections.some((s) => s.name === SECTIONS[0])) throw new Error(`${SECTIONS[0]} is active`);
    if (second?.total !== 5) throw new Error(`${SECTIONS[1]}: ${JSON.stringify(second)}`);
    return {
      archived: archived.map((s) => [s.name, s.archivedCards]),
      active: sections.map((s) => [s.name, s.total]),
    };
  });
}
