export const title = "Streak calendar";

const monthName = (date) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export async function env({ api }) {
  const { current, days, today } = await api("/api/stats/streak");
  const first = new Date(`${today.date.slice(0, 7)}-01T12:00:00Z`);
  first.setUTCMonth(first.getUTCMonth() - 1);
  const previous = first.toISOString().slice(0, 10);
  if (days[0].date.slice(0, 7) > previous.slice(0, 7)) {
    throw new Error(`The persona has no reviews before ${today.date.slice(0, 7)} to page back to`);
  }
  return { STREAK: current, THIS_MONTH: monthName(today.date), LAST_MONTH: monthName(previous) };
}

/** Paging a month writes nothing: the stored streak is the one the flow asserted. */
export async function check({ api }) {
  const { current, reviewedDays } = await api("/api/stats/streak");
  return { current, reviewedDays };
}
