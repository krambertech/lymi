export const title = "The streak's and You's sheets";

/** The flow only looks; the screenshots are the evidence. */
export async function check({ api }) {
  return { decks: (await api("/api/decks")).length };
}
