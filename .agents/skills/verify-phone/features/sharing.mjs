export const title = "Share deck and join links";

export async function env({ api }) {
  const decks = await api("/api/decks");
  const deck = decks.find((d) => d.role === "owner");
  if (!deck) throw new Error("The persona owns no deck");
  const { link } = await api(`/api/decks/${deck.id}/join-link`);
  if (link) throw new Error(`“${deck.name}” already has a join link`);
  return { DECK_ID: deck.id, DEAD_TOKEN: "verify-phone-no-such-link" };
}

/** The flow turned the join link on and off again, so it is gone and no card changed. */
export async function check({ before, api, poll }) {
  const decks = await api("/api/decks");
  const deck = decks.find((d) => d.role === "owner");
  return poll(async () => {
    const joinLink = await api(`/api/decks/${deck.id}/join-link`);
    if (joinLink.link) throw new Error(`The join link is still on: ${joinLink.link.url}`);
    const { counts } = await api("/api/dev/state");
    if (counts.cards !== before.counts.cards) throw new Error(`Cards changed: ${counts.cards}`);
    return { joinLink, counts };
  });
}
