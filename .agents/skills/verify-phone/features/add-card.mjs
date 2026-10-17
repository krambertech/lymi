import { request, signIn } from "../scripts/doctor.mjs";
import { readRecord } from "../scripts/stack.mjs";

export const title = "Add a card";

const TERM = "il collaudo";
const MEANING = "the acceptance test";

export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lezione 12");
  const { cards } = await api(`/api/cards?query=${encodeURIComponent(TERM)}`);
  if (cards.some((c) => c.term === TERM)) throw new Error(`The persona already has “${TERM}”`);
  const shared = await joinAnotherDeck(api);
  if (shared === deck.name) throw new Error(`The joined deck shares its name with “${deck.name}”`);
  return { DECK: deck.name, SHARED: shared, TERM, MEANING };
}

/** The learner joins another persona's deck, which capture must not offer: only an owner adds cards. */
async function joinAnotherDeck(api) {
  const { worker } = readRecord();
  const headers = {
    cookie: await signIn(worker, "streak", { reset: true }),
    accept: "application/json",
  };
  const [deck] = await (await request(`${worker}/api/decks`, { headers })).json();
  const on = await request(`${worker}/api/decks/${deck.id}/join-link`, { method: "POST", headers });
  if (!on.ok) throw new Error(`Turning on the join link answered HTTP ${on.status}`);
  const { link } = await on.json();
  await api(`/api/join/${link.url.split("/").pop()}`, { method: "POST" });
  return deck.name;
}

/** The card is written through the card outbox, so it reaches the Worker after the screen says Added. */
export async function check({ before, api, poll }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lezione 12");
  return poll(async () => {
    const { cards } = await api(`/api/cards?query=${encodeURIComponent(TERM)}`);
    const card = cards.find((c) => c.term === TERM);
    if (!card) throw new Error(`No stored card “${TERM}”`);
    if (card.meaning !== MEANING || card.deckId !== deck.id) {
      throw new Error(
        `Stored “${TERM}” as ${JSON.stringify({ meaning: card.meaning, deckId: card.deckId })}`,
      );
    }
    // The joined deck's cards count too, and they arrived after `before` was read.
    const joined = (await api("/api/decks"))
      .filter((d) => d.role !== "owner")
      .reduce((sum, d) => sum + d.total, 0);
    const { counts } = await api("/api/dev/state");
    const expected = before.counts.cards + joined + 1;
    if (counts.cards !== expected)
      throw new Error(`Expected ${expected} cards, found ${counts.cards}`);
    return { card, counts };
  });
}
