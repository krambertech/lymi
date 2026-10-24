export const title = "The day turns";

export async function env({ before, api }) {
  const streak = await api("/api/stats/streak");
  return { DUE: before.counts.due, RUN: streak.current + 1 };
}

/** The run on screen is the device's; the Worker's streak is the proof the day counted. */
export async function check({ before, api, poll }) {
  return poll(async () => {
    const streak = await api("/api/stats/streak");
    if (!["goal_met", "exhausted"].includes(streak.today.outcome)) {
      throw new Error(`Expected today to be met, found ${streak.today.outcome}`);
    }
    return {
      reviews: (await api("/api/dev/state")).counts.reviews - before.counts.reviews,
      today: streak.today,
      current: streak.current,
    };
  });
}
