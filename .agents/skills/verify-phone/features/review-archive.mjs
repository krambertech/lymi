export const title = "Archive in review";

/** The archive writes in the background, so the stored card count is the proof. */
export async function check({ before, api, poll }) {
  return poll(async () => {
    const { counts } = await api("/api/dev/state");
    if (counts.cards !== before.counts.cards - 1) {
      throw new Error(`Expected ${before.counts.cards - 1} cards, found ${counts.cards}`);
    }
    return counts;
  });
}
