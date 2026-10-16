export const title = "Import and export";

export async function env() {
  return { SET: "la casa,the house;el perro,the dog;el gato,the cat", DECK: "Maestro set" };
}

/** Three cards arrived in a deck named for the set, and the library left as an Anki package. */
export async function check({ before, api, poll }) {
  return poll(async () => {
    const { counts } = await api("/api/dev/state");
    if (counts.cards !== before.counts.cards + 3) throw new Error(`Cards: ${counts.cards}`);
    const decks = await api("/api/decks");
    const deck = decks.find((d) => d.name === "Maestro set");
    if (!deck || deck.total !== 3) throw new Error("No deck named Maestro set with 3 cards");
    const exports = await api("/api/exports");
    const done = exports.find(
      (e) => e.format === "anki" && e.deckId === null && e.status === "done",
    );
    if (!done) throw new Error("No finished library export as an Anki package");
    return { counts, deck: { name: deck.name, total: deck.total }, export: done.fileName };
  });
}
