import { readFileSync } from "node:fs";
import { signIn } from "../scripts/doctor.mjs";

export const title = "Deck tools, as a member";

const SECTIONS = ["Greetings", "At the market"];
const DAY = 86_400_000;
const json = { "content-type": "application/json" };
/** The joined deck, which check reads back. */
let deckId = "";
const stack = JSON.parse(
  readFileSync(new URL("../../../../apps/mobile/.expo/verify-phone.json", import.meta.url), "utf8"),
);

/**
 * `backlog` shares a deck with two sections and `learner` joins it. Learner's own schedule there:
 * three cards forgotten three days ago, due now, and two easy then, due later.
 */
export async function env({ api }) {
  const cookie = await signIn(stack.worker, "backlog", { reset: true });
  const owner = async (path, init = {}) => {
    const response = await fetch(`${stack.worker}${path}`, {
      ...init,
      headers: { cookie, accept: "application/json", ...init.headers },
    });
    if (!response.ok)
      throw new Error(`${init.method ?? "GET"} ${path} answered ${response.status}`);
    return response.json();
  };
  const deck = (await owner("/api/decks")).find((d) => d.role === "owner");
  deckId = deck.id;
  const { cards } = await owner(`/api/cards?deckId=${deck.id}&limit=50`);
  for (const [i, name] of SECTIONS.entries()) {
    const section = await owner(`/api/decks/${deck.id}/sections`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ name }),
    });
    await owner(`/api/decks/${deck.id}/cards/section`, {
      method: "PUT",
      headers: json,
      body: JSON.stringify({
        cardIds: cards.slice(i * 6, i * 6 + 6).map((c) => c.id),
        sectionId: section.id,
      }),
    });
  }
  const { link } = await owner(`/api/decks/${deck.id}/join-link`, { method: "POST" });
  await api(`/api/join/${link.url.split("/").pop()}`, { method: "POST" });
  for (const [i, card] of cards.slice(0, 5).entries()) {
    await api("/api/review/grade", {
      method: "POST",
      headers: json,
      body: JSON.stringify({
        cardId: card.id,
        direction: "recognition",
        rating: i < 3 ? 1 : 4,
        reviewedAt: new Date(Date.now() - 3 * DAY).toISOString(),
      }),
    });
  }
  return { DECK_ID: deck.id, FIRST: SECTIONS[0], DUE: 3, ALL: 5 };
}

/** Undo took the marks back, so none of the deck's cards is important to the member. */
export async function check({ api, poll }) {
  return poll(async () => {
    const { cards } = await api(`/api/cards?deckId=${deckId}&limit=100`);
    const marked = cards.filter((c) => c.important).map((c) => c.term);
    if (marked.length) throw new Error(`Still marked: ${marked.join(", ")}`);
    return { deckId, unmarked: cards.length };
  });
}
