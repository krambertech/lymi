export const title = "Series";

const SERIES = "Weekend reading";

/** No persona has a series, so the flow makes one around the first deck. */
export async function env({ api }) {
  const [deck] = await api("/api/decks");
  await api("/api/series", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: SERIES, deckIds: [deck.id] }),
  });
  return { SERIES };
}

/** Series writes go straight to the Worker: the series is gone and its deck stays active. */
export async function check({ before, api, poll }) {
  return poll(async () => {
    const list = await api("/api/series");
    if (list.some((s) => s.name === SERIES)) throw new Error(`“${SERIES}” is still stored`);
    const { counts } = await api("/api/dev/state");
    if (counts.decks !== before.counts.decks)
      throw new Error(`Expected ${before.counts.decks} active decks, found ${counts.decks}`);
    return { series: list, counts };
  });
}
