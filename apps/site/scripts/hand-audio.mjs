// Generates pronunciation audio for the landing and languages hands with the product's own speech provider.
// Only cards whose term, language, model or voice changed are regenerated.
// Usage: OPENAI_API_KEY=… pnpm --filter @lymi/site hand:audio
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createOpenAiSpeechProvider } from "../../web/src/server/ai/openai-speech.ts";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = ["hand-cards.ts", "language-cards.ts"]
  .map((file) => readFileSync(join(site, "src/components/landing", file), "utf8"))
  .join("\n");
const outDir = join(site, "public/audio/hand");
const manifestPath = join(outDir, "manifest.json");

// The card module uses Lingui macros, so read the three fields audio depends on from its source.
const cards = [
  ...source.matchAll(/id: "([^"]+)",\s*source:[\s\S]*?language: "([^"]+)",\s*term: "([^"]+)",/g),
].map(([, id, language, term]) => ({ id, language, term }));
const declared = (source.match(/^\s+id: "[^"]+",\s*source:/gm) ?? []).length;
if (cards.length !== declared || cards.length === 0) {
  throw new Error(
    `Read ${cards.length} of ${declared} cards; keep id, source, kind, language, term in that order.`,
  );
}

if (!process.env.OPENAI_API_KEY?.trim()) throw new Error("Set OPENAI_API_KEY to generate audio.");
mkdirSync(outDir, { recursive: true });
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
const next = {};
let generated = 0;

for (const card of cards) {
  const provider = createOpenAiSpeechProvider(process.env, card.language);
  const identity = {
    term: card.term,
    language: card.language,
    model: provider.model,
    voice: provider.voice,
  };
  const file = join(outDir, `${card.id}.mp3`);
  const unchanged =
    existsSync(file) && JSON.stringify(manifest[card.id]) === JSON.stringify(identity);
  next[card.id] = identity;
  if (unchanged) continue;
  const response = await provider.speech({ text: card.term, language: card.language });
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  generated += 1;
  console.log(`${card.id}: ${card.term}`);
}

for (const name of readdirSync(outDir)) {
  if (name.endsWith(".mp3") && !next[name.slice(0, -4)]) unlinkSync(join(outDir, name));
}
writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`Generated ${generated}, kept ${cards.length - generated}.`);
