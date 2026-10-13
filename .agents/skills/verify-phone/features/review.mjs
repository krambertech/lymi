export const title = "Review";

export async function env({ before }) {
  return { DUE: before.counts.due };
}

/** The screen moves on before the grade outbox sends, so the stored review count is the proof. */
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
