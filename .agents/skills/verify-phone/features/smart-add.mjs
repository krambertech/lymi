import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const title = "Smart add";

const LESSON = "Tere! Mina olen Mari. Ma elan Tallinnas ja töötan õpetajana. Raamat on laual.";

const vars = fileURLToPath(new URL("../../../../apps/web/.dev.vars", import.meta.url));

export async function env({ api }) {
  const key = existsSync(vars) && /^ANTHROPIC_API_KEY=\S+/m.test(readFileSync(vars, "utf8"));
  if (!key)
    throw new Error("Smart add reads with ANTHROPIC_API_KEY, which apps/web/.dev.vars lacks");
  const { daily } = await api("/api/lesson-reads/access");
  if (daily && daily.used >= daily.limit) throw new Error("The learner has used today’s reads");
  return { LESSON };
}

/** The list's cards are ordinary cards, so the count grows and the lesson's book is among them. */
export async function check({ before, api, poll }) {
  return poll(async () => {
    const { counts } = await api("/api/dev/state");
    if (counts.cards <= before.counts.cards)
      throw new Error(`Expected more than ${before.counts.cards} cards, found ${counts.cards}`);
    const { cards } = await api(`/api/cards?query=${encodeURIComponent("raamat")}`);
    const fromLesson = cards.find((c) => /raamat/i.test(c.term));
    if (!fromLesson) throw new Error("No card for “raamat” from the lesson");
    return { counts, card: fromLesson };
  });
}
