import { signIn } from "../scripts/doctor.mjs";
import { readRecord } from "../scripts/stack.mjs";

export const title = "Welcome";
// An empty account that has not got set up; the flow signs it up again from the dev door.
export const persona = "fresh";

/** Explore's first deck in a language the flow can pick, from the publisher persona's decks. */
export async function env({ api }) {
  await signIn(readRecord().worker, "publisher");
  const { decks } = await api("/api/explore");
  const deck = decks.find((d) => d.slug === "everyday-finnish");
  if (!deck) throw new Error("Explore has no Everyday Finnish; seed the publisher persona");
  return { LANGUAGE: "Finnish", DECK: deck.name, SLUG: deck.slug };
}

/** Welcome saved its answers and the deck, and the first grade reached the Worker. */
export async function check({ api, poll }) {
  return poll(async () => {
    const settings = await api("/api/settings");
    if (!settings.onboardedAt) throw new Error("Welcome was not saved");
    if (settings.dailyGoal !== 50) throw new Error(`Daily goal is ${settings.dailyGoal}, not 50`);
    if (settings.aiConsent !== true)
      throw new Error(`AI choice is ${settings.aiConsent}, not true`);
    const decks = await api("/api/decks");
    if (!decks.some((d) => d.name === "Everyday Finnish"))
      throw new Error(`Everyday Finnish is not in Library: ${decks.map((d) => d.name)}`);
    const { counts } = await api("/api/dev/state");
    if (counts.reviews !== 1) throw new Error(`Expected 1 stored review, found ${counts.reviews}`);
    return {
      onboardedAt: settings.onboardedAt,
      dailyGoal: settings.dailyGoal,
      aiConsent: settings.aiConsent,
      counts,
    };
  });
}
