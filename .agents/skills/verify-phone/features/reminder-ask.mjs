export const title = "Reminder question";

/** The reminder lives on the device; the two grades on the way are what the Worker stores. */
export async function check({ before, api, poll }) {
  return poll(async () => {
    const { counts } = await api("/api/dev/state");
    if (counts.reviews !== before.counts.reviews + 2) {
      throw new Error(
        `Expected ${before.counts.reviews + 2} stored reviews, found ${counts.reviews}`,
      );
    }
    return counts;
  });
}
