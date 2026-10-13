export const title = "Today";

export async function env({ api }) {
  const streak = await api("/api/stats/streak");
  return { DUE: (await api("/api/dev/state")).counts.due, STREAK: streak.current };
}

/** Opening Today writes nothing: the stored counts are the ones the flow asserted. */
export async function check({ before, api }) {
  const after = await api("/api/dev/state");
  if (after.counts.due !== before.counts.due || after.counts.reviews !== before.counts.reviews) {
    throw new Error(`Opening Today changed the counts: ${JSON.stringify(after.counts)}`);
  }
  return after.counts;
}
