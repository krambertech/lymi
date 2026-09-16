// Synthesise the comparison corpus through every configured provider and build a listening page.
// Usage: pnpm tts:compare [--languages et,ja] [--only azure,google-chirp]
// Credentials come from apps/web/.dev.vars, or the environment, or both.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createGoogleChirpProvider } from "../../apps/web/src/server/ai/google-chirp.ts";
import { createGoogleGeminiProvider } from "../../apps/web/src/server/ai/google-gemini.ts";
import { createOpenAiSpeechProvider } from "../../apps/web/src/server/ai/openai-speech.ts";
import {
  chirpLocale,
  geminiLocale,
  openAiSupportsLanguage,
} from "../../apps/web/src/server/ai/speech.ts";
import { azureVoices, createAzureProvider } from "./azure.mjs";
import { items, LANGUAGES } from "./corpus.mjs";
import { renderPage } from "./page.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out");

// Published rates, September 2026. The token-billed providers are estimated from audio duration,
// so treat their figures as an order of magnitude rather than an invoice.
const RATES = {
  azure: { per: "character", usd: 16 / 1_000_000, note: "$16/1M characters" },
  "google-chirp": { per: "character", usd: 30 / 1_000_000, note: "$30/1M characters" },
  "google-gemini": {
    per: "second",
    usd: (10 / 1_000_000) * 25,
    note: "$10/1M audio tokens, ~25/s",
  },
  openai: { per: "second", usd: 0.015 / 60, note: "~$0.015 per minute" },
};

function loadEnv() {
  const env = { ...process.env };
  try {
    const raw = readFileSync(join(here, "../../apps/web/.dev.vars"), "utf8");
    for (const line of raw.split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      const [, key, rest] = match;
      const value = rest.trim().replace(/^(['"])([\s\S]*)\1$/, "$2");
      if (!env[key]) env[key] = value;
    }
  } catch {
    // No .dev.vars in this checkout; the environment is the only source.
  }
  return env;
}

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1];
}

/** Build every candidate that has credentials, for one locale. */
async function providersFor(env, locale, azure) {
  const built = [];
  const google = Boolean(env.GOOGLE_CLOUD_TTS_CREDENTIALS?.trim());
  const gemini = geminiLocale(locale);
  if (google && gemini) built.push(createGoogleGeminiProvider(env, { locale: gemini }));
  const chirp = chirpLocale(locale);
  if (google && chirp) built.push(createGoogleChirpProvider(env, { locale: chirp }));
  if (env.OPENAI_API_KEY?.trim() && openAiSupportsLanguage(locale)) {
    built.push(createOpenAiSpeechProvider(env, locale));
  }
  const voice = azure?.(locale);
  if (voice) built.push(createAzureProvider(env, { locale, voice }));
  return built;
}

function slug(text, index) {
  const base = text
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${String(index).padStart(3, "0")}-${base || "item"}`;
}

/** Rough duration of a constant-bitrate MP3, used only for the token-billed cost estimate. */
function estimateSeconds(bytes, provider) {
  const kbps = provider === "azure" ? 48 : 32;
  return (bytes * 8) / (kbps * 1000);
}

const env = loadEnv();
const onlyLanguages = argValue("--languages")
  ?.split(",")
  .map((value) => value.trim());
const onlyProviders = argValue("--only")
  ?.split(",")
  .map((value) => value.trim());

let azureLookup = null;
try {
  const voices = await azureVoices(env);
  if (voices) {
    const cache = new Map();
    const { pickVoice } = await import("./azure.mjs");
    azureLookup = (locale) => {
      if (!cache.has(locale)) cache.set(locale, pickVoice(voices, locale));
      return cache.get(locale);
    };
    console.log(`Azure: ${voices.length} voices available`);
  } else {
    console.log("Azure: skipped (set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION)");
  }
} catch (error) {
  console.warn(`Azure: voice list failed — ${error.message}`);
}

const rows = items().filter((item) => {
  if (!onlyLanguages) return true;
  return onlyLanguages.some((value) => item.locale.toLowerCase().startsWith(value.toLowerCase()));
});
if (rows.length === 0) throw new Error("No corpus items matched --languages.");

const results = [];
const usage = {};
const voicesUsed = {};
let failures = 0;

for (const [index, item] of rows.entries()) {
  const name = slug(item.text, index);
  let built = await providersFor(env, item.locale, azureLookup);
  if (onlyProviders) built = built.filter((provider) => onlyProviders.includes(provider.provider));
  if (built.length === 0 && index === 0) {
    throw new Error("No providers are configured. See scripts/tts-compare/README.md.");
  }

  const clips = {};
  for (const provider of built) {
    voicesUsed[provider.provider] ??= {};
    voicesUsed[provider.provider][item.locale] = `${provider.model} / ${provider.voice}`;
    const file = join("audio", provider.provider, `${name}.${provider.extension}`);
    try {
      const response = await provider.speech({ text: item.text, language: item.locale });
      const audio = Buffer.from(await response.arrayBuffer());
      if (audio.byteLength === 0) throw new Error("empty audio");
      mkdirSync(join(outDir, dirname(file)), { recursive: true });
      writeFileSync(join(outDir, file), audio);
      clips[provider.provider] = { file, bytes: audio.byteLength };
      const seconds = estimateSeconds(audio.byteLength, provider.provider);
      usage[provider.provider] ??= { characters: 0, seconds: 0, clips: 0 };
      const spend = usage[provider.provider];
      spend.characters += [...item.text].length;
      spend.seconds += seconds;
      spend.clips += 1;
    } catch (error) {
      failures += 1;
      clips[provider.provider] = { error: error.message };
      console.warn(`  ${provider.provider} failed on "${item.text}": ${error.message}`);
    }
  }
  results.push({ ...item, clips });
  console.log(
    `[${index + 1}/${rows.length}] ${item.locale} ${item.kind.padEnd(8)} ${item.text.slice(0, 40)}`,
  );
}

const cost = {};
for (const [provider, spend] of Object.entries(usage)) {
  const rate = RATES[provider];
  if (!rate) continue;
  const units = rate.per === "character" ? spend.characters : spend.seconds;
  cost[provider] = { ...spend, usd: units * rate.usd, note: rate.note };
}

writeFileSync(
  join(outDir, "results.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), voicesUsed, cost, results }, null, 2)}\n`,
);
writeFileSync(join(outDir, "index.html"), renderPage({ results, voicesUsed, cost, LANGUAGES }));

console.log(`\n${results.length} items, ${failures} failed clips.`);
for (const [provider, spend] of Object.entries(cost)) {
  console.log(`  ${provider.padEnd(14)} $${spend.usd.toFixed(4)}  (${spend.note})`);
}
console.log(`\nOpen ${join(outDir, "index.html")}`);
