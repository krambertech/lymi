export const title = "AI consent";

const DECLINED = "la tempesta";
const ALLOWED = "il fulmine";

export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lezione 12");
  const settings = await api("/api/settings");
  if (settings.aiConsent !== null)
    throw new Error(`The persona's AI choice is ${settings.aiConsent}`);
  return { DECK: deck.name, DECLINED, ALLOWED };
}

/** Not now saved no and the card as typed; Allow then saved yes, so the second card asked to be filled. */
export async function check({ api, poll }) {
  return poll(async () => {
    const settings = await api("/api/settings");
    if (settings.aiConsent !== true)
      throw new Error(`AI choice is ${settings.aiConsent}, not true`);
    const found = [];
    for (const term of [DECLINED, ALLOWED]) {
      const { cards } = await api(`/api/cards?query=${encodeURIComponent(term)}`);
      const card = cards.find((c) => c.term === term);
      if (!card) throw new Error(`No stored card “${term}”`);
      found.push({ term, enrichmentStatus: card.enrichmentStatus });
    }
    return { aiConsent: settings.aiConsent, cards: found };
  });
}
