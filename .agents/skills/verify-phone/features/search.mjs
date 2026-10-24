export const title = "Library search";

export function env() {
  return { MISS: "zqxjv" };
}

/** Searching writes nothing. */
export async function check({ before, api }) {
  const { counts } = await api("/api/dev/state");
  if (counts.cards !== before.counts.cards) throw new Error(`Cards changed: ${counts.cards}`);
  return { counts };
}
