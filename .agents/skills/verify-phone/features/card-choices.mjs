export const title = "Card choices";

const TERM = "il semaforo";
const MEANING = "the traffic light";

export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lezione 12");
  const { cards } = await api(`/api/cards?query=${encodeURIComponent(TERM)}`);
  if (cards.some((c) => c.term === TERM)) throw new Error(`The persona already has “${TERM}”`);
  return {
    DECK: deck.name,
    TERM,
    MEANING,
    TAG_ONE: "street",
    TAG_TWO: "city",
    BAD_DESCRIPTION: "the traffic light at a junction",
    DESCRIPTION: "red, amber and green lamps over a road",
  };
}

/** Edit card's tags are written through the card outbox, and the picture uploads once the card exists. */
export async function check({ api, poll }) {
  return poll(async () => {
    const { cards } = await api(`/api/cards?query=${encodeURIComponent(TERM)}`);
    const card = cards.find((c) => c.term === TERM);
    if (!card) throw new Error(`No stored card “${TERM}”`);
    const got = {
      tags: card.tags,
      reviewModes: card.reviewModes,
      description: card.image?.description ?? null,
    };
    const want = {
      tags: ["street"],
      reviewModes: [{ cue: "image", target: "term" }],
      description: "red, amber and green lamps over a road",
    };
    if (JSON.stringify(got) !== JSON.stringify(want))
      throw new Error(`Stored “${TERM}” as ${JSON.stringify(got)}`);
    return { card: got };
  });
}
