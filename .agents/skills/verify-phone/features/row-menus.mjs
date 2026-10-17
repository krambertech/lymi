export const title = "Long-press menus";

const EXPLORE_DECK = "Everyday Estonian";
/** What the flow was given, for the check that follows it in the same run. */
let given;

export async function env({ api }) {
  // Explore lists only what the publisher persona has published; seeding it leaves this session alone.
  await api("/api/dev/sign-in?as=publisher", { method: "POST" });
  const decks = await api("/api/decks");
  // The most due, so the phone's own count, which can lag a reset, still lists it on Today.
  const due = decks
    .filter((d) => d.role === "owner" && d.due > 0 && !d.seriesId)
    .sort((a, b) => b.due - a.due)[0];
  if (!due) throw new Error("No deck with cards due outside a series");
  const { cards } = await api(`/api/cards?deckId=${due.id}&limit=50`);
  const [star, archive] = cards.filter((c) => !c.important);
  given = { deckId: due.id, star: star.term, archive: archive.term };
  return {
    DECK_ID: due.id,
    DECK_NAME: due.name,
    STAR_TERM: star.term,
    ARCHIVE_TERM: archive.term,
    EXPLORE_DECK,
  };
}

/** Starring and archiving go through the write outbox, so the Worker hears them after the screen. */
export async function check({ api, poll }) {
  return poll(async () => {
    const decks = await api("/api/decks");
    const { cards } = await api(`/api/cards?deckId=${given.deckId}&limit=50`);
    const star = cards.find((c) => c.term === given.star);
    if (!star?.important) throw new Error(`“${given.star}” is not marked important`);
    const restored = cards.find((c) => c.term === given.archive);
    if (!restored) throw new Error(`“${given.archive}” is not back in its deck after Undo`);
    if (!restored.important)
      throw new Error(`“${given.archive}” was not marked important from search`);
    const added = decks.find((d) => d.name === EXPLORE_DECK);
    if (!added) throw new Error(`${EXPLORE_DECK} is not in Library`);
    const { counts } = await api("/api/dev/state");
    return {
      star: star.term,
      restored: given.archive,
      added: { id: added.id, role: added.role },
      counts,
    };
  });
}
