export const title = "Deck tags";

const DECK = "Lezione 12";

/** Lezione 12's seed carries verb, reflexive, noun and money, which is all the flow needs. */
export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.name === DECK);
  return { DECK_ID: deck.id };
}

/**
 * Reflexive merged into verb by renaming, verb merged into noun from Merge into…, money archived and
 * restored, and noun's rename undone, leave noun on three cards and money on three.
 */
export async function check({ api, poll }) {
  const deck = (await api("/api/decks")).find((d) => d.name === DECK);
  return poll(async () => {
    const { tags, archived } = await api(`/api/decks/${deck.id}/tags`);
    const now = Object.fromEntries(tags.map((t) => [t.name, t.cards]));
    const want = { money: 3, noun: 3 };
    if (JSON.stringify(now) !== JSON.stringify(want) || archived.length > 0) {
      throw new Error(`Tags are ${JSON.stringify({ tags, archived })}`);
    }
    return { tags: now, archived: archived.length };
  });
}
