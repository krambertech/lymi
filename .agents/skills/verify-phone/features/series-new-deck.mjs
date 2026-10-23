export const title = "Series new deck";

const SERIES = "Weekend reading";
const DECK = "Lezione 13";

/** Learner has no series around Lezione 12, so the flow's deck lands after it in a new one. */
export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lezione 12");
  await api("/api/series", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: SERIES, deckIds: [deck.id] }),
  });
  return { SERIES, DECK };
}

/** The new deck is stored in the series, last, after the deck already there. */
export async function check({ api, poll }) {
  return poll(async () => {
    const deck = (await api("/api/decks")).find((d) => d.name === DECK);
    if (!deck) throw new Error(`“${DECK}” is not stored`);
    const series = (await api("/api/series")).find((s) => s.name === SERIES);
    if (series?.deckIds.at(-1) !== deck.id)
      throw new Error(`“${DECK}” is not last in “${SERIES}”: ${JSON.stringify(series?.deckIds)}`);
    if (series.deckIds.length !== 2) throw new Error(`Expected 2 decks in “${SERIES}”`);
    return { deck, series };
  });
}
