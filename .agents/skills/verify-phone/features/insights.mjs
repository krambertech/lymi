export const title = "Insights";

const insights = (api) =>
  api(
    `/api/stats/insights?period=30&tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`,
  );

export async function env({ before, api }) {
  const { recall } = await insights(api);
  return { PASSED: recall.passed, FAILED: recall.failed, CARDS: before.counts.cards };
}

export async function check({ api }) {
  return (await insights(api)).recall;
}
