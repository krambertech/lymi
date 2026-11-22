import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const title = "Smart add from a link";

const DECK = "Notizie";
const TERM = "abbaiare";
const ARTICLE = "https://news.example.org/italiano/il-cane";
const SITE = "news.example.org";
const YOUTUBE = "https://youtu.be/dQw4w9WgXcQ";

const vars = fileURLToPath(new URL("../../../../apps/web/.dev.vars", import.meta.url));

export async function env({ api }) {
  const key =
    existsSync(vars) &&
    ["ANTHROPIC_API_KEY", "AI_GATEWAY_TOKEN"].every((name) =>
      new RegExp(`^${name}=\\S+`, "m").test(readFileSync(vars, "utf8")),
    );
  if (!key)
    throw new Error(
      "Smart add needs ANTHROPIC_API_KEY and AI_GATEWAY_TOKEN in apps/web/.dev.vars, even placeholders",
    );
  const json = (body) => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const deck = await api("/api/decks", json({ name: DECK, defaultLanguage: "it" }));
  await api(
    "/api/cards/batch",
    json({
      cards: [
        {
          deckId: deck.id,
          term: TERM,
          meaning: "to bark",
          example: "Il cane abbaia ogni mattina.",
          exampleSource: "lesson",
          source: ARTICLE,
          enrich: false,
        },
      ],
    }),
  );
  return { DECK, TERM, SITE, YOUTUBE };
}

export async function check({ api, poll }) {
  return poll(async () => {
    const { cards } = await api(`/api/cards?query=${encodeURIComponent(TERM)}`);
    const card = cards.find((c) => c.term === TERM);
    if (card?.source !== ARTICLE) throw new Error(`Expected ${TERM} with source ${ARTICLE}`);
    return { card };
  });
}
