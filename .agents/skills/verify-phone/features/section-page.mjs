export const title = "Section line and section pages";

const SECTIONS = ["At the office", "Around town", "Next week", "Later"];
const WAITING = ["tramvaj", "autobus"];
const json = { "content-type": "application/json" };

/**
 * The learner's own deck gets four sections: five of its cards in each of the first two, and a new
 * card alone in each of the last two. The learner knows the seed's cards, so the third is ready and
 * the fourth waits. The deck's other cards stay without a section, so the line ends with No section.
 */
export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.role === "owner");
  const { cards } = await api(`/api/cards?deckId=${deck.id}&limit=50`);
  if (cards.length <= 10) throw new Error(`${deck.name} needs more than ten cards`);
  for (const [i, name] of SECTIONS.entries()) {
    const section = await api(`/api/decks/${deck.id}/sections`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ name }),
    });
    if (i >= 2) {
      await api("/api/cards", {
        method: "POST",
        headers: json,
        body: JSON.stringify({
          deckId: deck.id,
          term: WAITING[i - 2],
          meaning: "a ride",
          sectionId: section.id,
        }),
      });
      continue;
    }
    await api(`/api/decks/${deck.id}/cards/section`, {
      method: "PUT",
      headers: json,
      body: JSON.stringify({
        cardIds: cards.slice(i * 5, i * 5 + 5).map((c) => c.id),
        sectionId: section.id,
      }),
    });
  }
  return {
    DECK_ID: deck.id,
    SECOND: SECTIONS[1],
    READY: SECTIONS[2],
    LOCKED: SECTIONS[3],
    WAITING: WAITING[1],
  };
}

/** The second section's cards are archived and the last section is, while the others stay. */
export async function check({ api, poll }) {
  const deck = (await api("/api/decks")).find((d) => d.role === "owner");
  return poll(async () => {
    const { sections } = await api(`/api/decks/${deck.id}/sections`);
    const names = sections.map((s) => s.name);
    if (names.join() !== SECTIONS.slice(0, 3).join()) throw new Error(`Sections are ${names}`);
    const second = sections.find((s) => s.name === SECTIONS[1]);
    if (second.total !== 0) throw new Error(`${SECTIONS[1]} still has ${second.total} cards`);
    return { sections: names, secondTotal: second.total };
  });
}
