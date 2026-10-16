import { signIn } from "../scripts/doctor.mjs";
import { readRecord } from "../scripts/stack.mjs";

export const title = "Welcome from a published deck's link";
export const persona = "fresh";

export async function env() {
  // The publisher persona's decks are what a published deck's link adds.
  await signIn(readRecord().worker, "publisher");
  return { LINK: "lymi://add/everyday-estonian", DECK: "Everyday Estonian" };
}

/** The link added the deck and Welcome saved the goal with no other answers, as the web's shortcut does. */
export async function check({ api, poll }) {
  return poll(async () => {
    const settings = await api("/api/settings");
    if (!settings.onboardedAt) throw new Error("Welcome was not saved");
    const decks = await api("/api/decks");
    if (!decks.some((d) => d.name === "Everyday Estonian"))
      throw new Error("Everyday Estonian is not in Library");
    return { onboardedAt: settings.onboardedAt, decks: decks.map((d) => d.name) };
  });
}
