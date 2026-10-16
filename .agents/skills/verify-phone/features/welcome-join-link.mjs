import { request, signIn } from "../scripts/doctor.mjs";
import { readRecord } from "../scripts/stack.mjs";

export const title = "Welcome from a join link";
export const persona = "fresh";

/** The learner persona's first owned deck, with its join link turned on for the flow to open. */
export async function env() {
  const { worker } = readRecord();
  const cookie = await signIn(worker, "learner");
  const call = async (path, method = "GET") => {
    const response = await request(`${worker}${path}`, {
      method,
      headers: { cookie, accept: "application/json" },
    });
    if (!response.ok) throw new Error(`${method} ${path} answered HTTP ${response.status}`);
    return response.json();
  };
  const deck = (await call("/api/decks")).find((d) => d.role === "owner");
  if (!deck) throw new Error("The learner persona owns no deck");
  const { link } = await call(`/api/decks/${deck.id}/join-link`, "POST");
  const token = new URL(link.url).pathname.split("/").at(-1);
  return { LINK: `lymi://join/${token}`, DECK: deck.name };
}

/** The new account joined the deck and Welcome is saved. */
export async function check({ api, poll }) {
  return poll(async () => {
    const settings = await api("/api/settings");
    if (!settings.onboardedAt) throw new Error("Welcome was not saved");
    const decks = await api("/api/decks");
    if (!decks.some((d) => d.role !== "owner")) throw new Error("The account joined no deck");
    return { onboardedAt: settings.onboardedAt, decks: decks.map((d) => `${d.name} (${d.role})`) };
  });
}
