// Voices the homepage's "Native AI voice" demo the way the product voices a card: its native
// ElevenLabs voice for the language, and OpenAI only where Lymi has no native voice.
// Run from apps/web: pnpm exec tsx --env-file=.dev.vars ../site/scripts/voice-audio.mjs
// Reads AI_GATEWAY_URL from wrangler.jsonc; .dev.vars needs ELEVENLABS_API_KEY and AI_GATEWAY_TOKEN.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evalEnv } from "../../web/src/server/ai/eval-env.ts";
import { createSpeechProviders } from "../../web/src/server/ai/speech.ts";

/** Keep in step with CLIPS in src/components/landing/AiDemos.tsx. */
const CLIPS = [
  { id: "feierabend", language: "de", term: "Feierabend" },
  { id: "komorebi", language: "ja", term: "木漏れ日" },
  // European Portuguese has no native voice yet, so the demo says it as Brazilians do.
  { id: "saudade", language: "pt-BR", term: "saudade" },
  { id: "nunchi", language: "ko", term: "눈치" },
];

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../public/audio/voice");
const manifestPath = join(outDir, "manifest.json");
mkdirSync(outDir, { recursive: true });
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};

const env = evalEnv();

for (const clip of CLIPS) {
  const [provider] = createSpeechProviders(env, clip.language);
  if (!provider) throw new Error(`No speech provider for ${clip.language}; check the keys.`);
  if (provider.provider !== "elevenlabs") {
    throw new Error(`${clip.term} would not use a native voice (${provider.provider}).`);
  }
  const identity = {
    term: clip.term,
    language: clip.language,
    provider: provider.provider,
    model: provider.model,
    voice: provider.voice,
  };
  const file = join(outDir, `${clip.id}.mp3`);
  if (existsSync(file) && JSON.stringify(manifest[clip.id]) === JSON.stringify(identity)) continue;
  const response = await provider.speech({ text: clip.term, language: clip.language });
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  manifest[clip.id] = identity;
  console.log(`${clip.id}: ${clip.term} (${provider.voice})`);
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
