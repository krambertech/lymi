export const title = "Daily reminder";

/** The reminder lives on the device, so the Worker's counts stay as they were. */
export async function check({ before, api }) {
  const after = await api("/api/dev/state");
  if (after.counts.reviews !== before.counts.reviews) {
    throw new Error(`Turning the reminder on changed the reviews: ${after.counts.reviews}`);
  }
  return after.counts;
}
