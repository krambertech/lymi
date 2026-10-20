/**
 * The listening test for Russian and Ukrainian stress (docs/proposals/russian-and-ukrainian.md,
 * Speech). It speaks each word in `words.ts` through every voice in Lymi's chain three ways — plain,
 * with U+0301, and in the voice's own stress markup — and writes a page where a fluent reader marks
 * the syllable she hears. It calls paid voices, so it is a script and never a test:
 *
 *   pnpm --filter @lymi/web eval:stress [--dry] [--language ru|uk] [--voice elevenlabs,gemini,openai,chirp or a voice name] [--out dir]
 *   pnpm --filter @lymi/web eval:stress --summary ~/Downloads/stress-ratings.json [--out dir]
 *   pnpm --filter @lymi/web eval:stress --serve [--port 5243] [--out dir]
 *   pnpm --filter @lymi/web eval:stress --library uk
 *
 * Keys come from `.dev.vars`, and a voice without its key is skipped. `--dry` sends nothing: it writes
 * every request body and a page of silent clips. A clip already on disk is reused, so a rerun bills
 * only what failed. `--summary` prints the results table from ratings the page exported. `--serve`
 * serves the page on localhost, since a browser that opens it as a file may not load the clips.
 * `--library` lists ElevenLabs library voices verified for eleven_v4 in a language, to pick
 * candidates from; it needs a key with the Voices: read permission.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { z } from "zod";
import { createElevenLabsSpeechProvider } from "../ai/elevenlabs-speech";
import { providerEndpoint } from "../ai/gateway";
import { createGeminiApiSpeechProvider } from "../ai/gemini-api-speech";
import { createGoogleChirpProvider } from "../ai/google-chirp";
import { createGoogleGeminiProvider } from "../ai/google-gemini";
import { createOpenAiSpeechProvider } from "../ai/openai-speech";
import { chirpLocale, geminiLocale, openAiSupportsLanguage } from "../ai/speech";
import { nativeSpeechVoice } from "../ai/speech-voices";
import type { Fetch, SpeechProvider } from "../ai/types";
import { STRESS_ITEMS, type StressForm, type StressItem } from "./words";

type Mode = "plain" | "acute" | "markup";
type Body = Record<string, unknown>;
type Env = Record<string, string | undefined>;
/** `note` names anything `edit` adds, so a changed prompt makes a new clip. */
type Spoken = { text: string; edit?: (body: Body) => void; note?: string };

interface Voice {
  key: "elevenlabs" | "gemini" | "openai" | "chirp";
  /** The key it needs, named when it is missing. */
  needs: string;
  ready: boolean;
  name?: string;
  /** A voice weighed against today's: it speaks the marked words only. */
  candidate?: boolean;
  /** The marked forms a candidate speaks, when not every word. */
  words?: string[];
  /** What its third mode sends, or null when it has no stress markup for this language. */
  markup: string | null;
  create(request: Fetch): SpeechProvider;
  markupRequest(plain: string, form: StressForm): Spoken;
}

export type Clip = {
  id: string;
  file: string;
  language: string;
  voice: string;
  model: string;
  locale: string;
  mode: Mode;
  candidate: boolean;
  markup: string | null;
  /** A flag beyond stress the page offers, such as a Russian accent on a Ukrainian word. */
  accent: string | null;
  sent: string;
  plain: string;
  /** The word with U+0301 on each vowel in turn: the choices the page offers. */
  options: string[];
  forms: { marked: string; gloss: string; target: number }[];
  error?: string;
};

const ACUTE = "́";
const VOWEL = /[аеёиіїоуыэєюя]/u;
const ACCENT_FLAGS: Record<string, string> = { uk: "Russian vowels" };
// Library voices to weigh against today's, each verified for eleven_v4 in its language (2026-10-19).
// `words` limits a voice to a few marked forms: two stress pairs and the Ukrainian vowels.
const UK_SAMPLE = ["за́мок", "замо́к", "ру́ки", "руки́", "дити́на", "їжа́к", "єди́ний", "неді́ля"];
const CANDIDATE_VOICES: Record<string, { voice: string; name: string; words?: string[] }[]> = {
  ru: [
    { voice: "3EuKHIEZbSzrHGNmdYsx", name: "Nikolay" },
    { voice: "MWyJiWDobXN8FX3CJTdE", name: "Oleg" },
  ],
  uk: [
    { voice: "Ntd0iVwICtUtA6Fvx27M", name: "Evgeniy Shevchenko" },
    { voice: "eLDtXX7z65CuLasDRxrP", name: "Leonid Drapei" },
    // Kateryna's picks from the library website, named by ID since this key can't read their names.
    ...[
      "dZde1M1SiLkAKiqjpqqT",
      "TEyBWD5tAHAWqAGEv6yI",
      "2OXYbN1uGomXXJtv9Dq6",
      "2o2uQnlGaNuV3ObRpxXt",
      "BFmokXObxZMCBXC0A9ny",
    ].map((voice) => ({ voice, name: voice, words: UK_SAMPLE })),
  ],
};
const GEMINI_CANDIDATE = "Charon";
const OPENAI_CANDIDATE = "cedar";
// Gemini answers a Ukrainian prompt naming "U+0301" with 400 INVALID_ARGUMENT, so the line doesn't.
const STRESS_INSTRUCTION =
  "An acute accent after a vowel marks the stressed syllable: stress that syllable and never pronounce the accent itself.";

const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const dry = args.includes("--dry");
const root = fileURLToPath(new URL("../../../../../", import.meta.url));
const out = option("--out") ?? join(root, ".speech-evaluation", dry ? "stress-dry" : "stress");
const pageScript = readFileSync(new URL("./page.js", import.meta.url), "utf8");

const summaryFile = option("--summary");
if (summaryFile) {
  const clips = JSON.parse(readFileSync(join(out, "clips.json"), "utf8")) as Clip[];
  const ratings: unknown = JSON.parse(readFileSync(summaryFile, "utf8"));
  const summarize = runInNewContext(`${pageScript}\nstressSummary`, {}) as (
    clips: Clip[],
    ratings: unknown,
  ) => string;
  console.log(summarize(clips, ratings));
  process.exit(0);
}

const library = option("--library");
if (library) {
  await listLibrary(library);
  process.exit(0);
}

if (args.includes("--serve")) {
  const port = Number(option("--port") ?? 5243);
  serve(port);
  console.log(`Serving ${out} at http://localhost:${port}/`);
  // The server keeps the process alive until it is stopped.
  await new Promise(() => {});
}

const env = dry ? placeholderEnv() : liveEnv();
if (!env.AI_GATEWAY_TOKEN?.trim()) {
  console.error(
    "Set AI_GATEWAY_TOKEN in apps/web/.dev.vars: every voice goes through the gateway.",
  );
  process.exit(1);
}
const languages = option("--language")?.split(",") ?? ["ru", "uk"];
const only = option("--voice")?.split(",");
const sent: { clip: string; url: string; body: Body }[] = [];
const clips: Clip[] = [];
const sections: string[] = [];
mkdirSync(join(out, "clips"), { recursive: true });

for (const language of languages) {
  const items = STRESS_ITEMS.filter((item) => item.language === language);
  if (!items.length) throw new Error(`No stress words for ${language}`);
  items.forEach(check);
  for (const voice of voices(env, language)) {
    if (only && !only.includes(voice.key) && !only.includes(voice.name ?? "")) continue;
    if (!voice.ready) {
      console.log(`${language} ${voice.key}: skipped, set ${voice.needs} in apps/web/.dev.vars`);
      continue;
    }
    const jobs = items.flatMap((item) => requests(voice, item));
    const label = voiceLabel(voice);
    sections.push(`${language} ${label}`);
    let made = 0;
    let reused = 0;
    let failed = 0;
    await pool(jobs, 2, async (job) => {
      const provider = voice.create(transport(job.id, job.spoken.edit));
      const file = `${job.id}.${dry ? "wav" : provider.extension}`;
      const clip: Clip = {
        id: job.id,
        file,
        language,
        voice: label,
        model: provider.model,
        locale: provider.locale,
        mode: job.mode,
        candidate: Boolean(voice.candidate),
        markup: voice.markup,
        accent: ACCENT_FLAGS[language] ?? null,
        sent: job.spoken.text,
        plain: job.plain,
        options: options(job.plain),
        forms: job.forms.map((form) => ({
          marked: form.marked,
          gloss: form.gloss,
          target: target(form.marked),
        })),
      };
      clips.push(clip);
      const path = join(out, "clips", file);
      if (!dry && existsSync(path)) {
        reused += 1;
        return;
      }
      try {
        const response = await provider.speech({ text: job.spoken.text, language });
        const audio = new Uint8Array(await response.arrayBuffer());
        writeFileSync(path, dry ? silence() : audio);
        made += 1;
      } catch (error) {
        const status = (error as { status?: number }).status;
        clip.error = `${error instanceof Error ? error.message : String(error)}${status ? ` (${status})` : ""}`;
        failed += 1;
      }
    });
    const characters = jobs.reduce((sum, job) => sum + job.spoken.text.length, 0);
    console.log(
      `${language} ${label}: ${made} ${dry ? "requests prepared" : "clips made"}, ${reused} reused, ${failed} failed, ${characters} characters`,
    );
    for (const clip of clips.filter((clip) => clip.voice === label && clip.error))
      console.log(`  ${clip.mode} ${clip.sent}: ${clip.error}`);
  }
}

// A run limited by --language or --voice keeps the other voices' clips on the page.
const index = join(out, "clips.json");
if (!dry && existsSync(index))
  for (const clip of JSON.parse(readFileSync(index, "utf8")) as Clip[])
    if (!sections.includes(`${clip.language} ${clip.voice}`)) clips.push(clip);
// Sections follow the chain, Russian first; within one the hash order shuffles the words.
const CHAIN = ["elevenlabs", "gemini-api", "google-gemini", "openai", "google-chirp"];
const rank = (clip: Clip) =>
  STRESS_ITEMS.findIndex((item) => item.language === clip.language) * CHAIN.length +
  CHAIN.findIndex((provider) => clip.voice.startsWith(`${provider} `));
clips.sort(
  (a, b) =>
    rank(a) - rank(b) ||
    Number(a.candidate) - Number(b.candidate) ||
    a.voice.localeCompare(b.voice) ||
    a.id.localeCompare(b.id),
);
writeFileSync(index, `${JSON.stringify(clips, null, 2)}\n`);
writeFileSync(join(out, "requests.json"), `${JSON.stringify(sent, null, 2)}\n`);
writeFileSync(join(out, "index.html"), page(clips));
if (dry) {
  const seen = new Set<string>();
  for (const request of sent) {
    const clip = clips.find((clip) => clip.id === request.clip);
    const kind = `${clip?.language} ${clip?.voice} ${clip?.mode}`;
    if (seen.has(kind)) continue;
    seen.add(kind);
    console.log(`\n--- ${kind}: ${request.url} ---\n${JSON.stringify(request.body, null, 2)}`);
  }
}
console.log(
  `\n${clips.length} clips. Run with --serve${dry ? " --dry" : ""}${option("--out") ? ` --out ${out}` : ""} and open http://localhost:5243/.`,
);

async function listLibrary(language: string) {
  const env = liveEnv();
  const endpoint = providerEndpoint(env, "elevenlabs");
  const Voices = z.object({
    voices: z.array(
      z.object({
        voice_id: z.string(),
        name: z.string(),
        gender: z.string().nullish(),
        age: z.string().nullish(),
        accent: z.string().nullish(),
        use_case: z.string().nullish(),
        description: z.string().nullish(),
        usage_character_count_1y: z.number().nullish(),
        verified_languages: z
          .array(
            z.object({ language: z.string(), model_id: z.string(), accent: z.string().nullish() }),
          )
          .nullish(),
      }),
    ),
  });
  for (const gender of ["female", "male"]) {
    const query = new URLSearchParams({
      language,
      gender,
      page_size: "100",
      sort: "usage_character_count_1y",
    });
    const response = await fetch(`${endpoint.base}/v1/shared-voices?${query}`, {
      headers: { "xi-api-key": env.ELEVENLABS_API_KEY?.trim() ?? "", ...endpoint.headers },
    });
    if (!response.ok) {
      console.error(
        `ElevenLabs library: ${response.status} ${(await response.text()).slice(0, 200)}`,
      );
      process.exit(1);
    }
    const voices = Voices.parse(await response.json()).voices.filter((voice) =>
      voice.verified_languages?.some(
        (verified) => verified.language === language && verified.model_id === "eleven_v4",
      ),
    );
    console.log(`\n${gender}: ${voices.length} verified for eleven_v4`);
    for (const voice of voices.slice(0, 15)) {
      const accent = voice.verified_languages?.find(
        (verified) => verified.language === language && verified.model_id === "eleven_v4",
      )?.accent;
      console.log(
        `  ${voice.voice_id} | ${voice.name} | ${voice.age ?? ""} | ${accent ?? voice.accent ?? ""} | ${voice.use_case ?? ""} | ${voice.usage_character_count_1y ?? 0} characters a year | ${(voice.description ?? "").replace(/\s+/g, " ").slice(0, 100)}`,
      );
    }
  }
}

/** Serves the page and its clips, with byte ranges, which some browsers need to play audio. */
function serve(port: number) {
  const types: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".json": "application/json",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
  };
  createServer((request, response) => {
    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    } catch {
      response.writeHead(400).end();
      return;
    }
    const path = normalize(join(out, pathname.endsWith("/") ? `${pathname}index.html` : pathname));
    if (!path.startsWith(normalize(out) + sep) || !existsSync(path) || !statSync(path).isFile()) {
      response.writeHead(404).end();
      return;
    }
    const bytes = readFileSync(path);
    const headers = {
      "Content-Type": types[extname(path)] ?? "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    };
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range ?? "");
    if (!range) {
      response.writeHead(200, { ...headers, "Content-Length": bytes.length }).end(bytes);
      return;
    }
    const start = range[1] ? Number(range[1]) : Math.max(0, bytes.length - Number(range[2]));
    const end =
      range[1] && range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
    response
      .writeHead(206, {
        ...headers,
        "Content-Length": end - start + 1,
        "Content-Range": `bytes ${start}-${end}/${bytes.length}`,
      })
      .end(bytes.subarray(start, end + 1));
  }).listen(port, "127.0.0.1");
}

function voices(env: Env, language: string): Voice[] {
  const list: Voice[] = [];
  const gemini = geminiLocale(language);
  const chirp = chirpLocale(language);
  const acutePrompt = "U+0301 plus a prompt line";
  // Mirrors createSpeechProviders in ai/speech.ts, which these must stay in step with.
  if (gemini) {
    const native = nativeSpeechVoice(gemini, env.ELEVENLABS_SPEECH_VOICES);
    if (native)
      list.push({
        key: "elevenlabs",
        needs: "ELEVENLABS_API_KEY",
        ready: Boolean(env.ELEVENLABS_API_KEY?.trim()),
        name: native.name,
        // Eleven v4 reads IPA in double quotes and slashes; earlier models need SSML phoneme tags.
        markup: "IPA in quotes and slashes",
        create: (request) => createElevenLabsSpeechProvider(env, gemini, native.voice, request),
        markupRequest: (_plain, form) => ({ text: `"/${form.ipa}/"` }),
      });
    for (const candidate of CANDIDATE_VOICES[language] ?? [])
      list.push({
        key: "elevenlabs",
        needs: "ELEVENLABS_API_KEY",
        ready: Boolean(env.ELEVENLABS_API_KEY?.trim()),
        name: candidate.name,
        candidate: true,
        ...(candidate.words ? { words: candidate.words } : {}),
        markup: null,
        create: (request) => createElevenLabsSpeechProvider(env, gemini, candidate.voice, request),
        markupRequest: (plain) => ({ text: plain }),
      });
    const apiKey = Boolean(env.GEMINI_API_KEY?.trim());
    const geminiVoice = (voiceEnv: Env, candidate: boolean): Voice => ({
      key: "gemini",
      needs: "GEMINI_API_KEY",
      ready: apiKey || Boolean(env.GOOGLE_CLOUD_TTS_CREDENTIALS?.trim()),
      candidate,
      markup: candidate ? null : acutePrompt,
      create: (request) =>
        apiKey
          ? createGeminiApiSpeechProvider(voiceEnv, gemini, request)
          : createGoogleGeminiProvider(voiceEnv, { locale: gemini, request, ...dryToken() }),
      markupRequest: (_plain, form) => ({
        text: form.marked,
        note: STRESS_INSTRUCTION,
        edit: (body) => {
          const input = body.input as { prompt?: string } | undefined;
          if (input?.prompt) input.prompt += ` ${STRESS_INSTRUCTION}`;
          const part = (body.contents as { parts: { text: string }[] }[] | undefined)?.[0]
            ?.parts[0];
          if (part) part.text = part.text.replace("\n\nText: ", ` ${STRESS_INSTRUCTION}\n\nText: `);
        },
      }),
    });
    list.push(
      geminiVoice(env, false),
      geminiVoice({ ...env, GEMINI_SPEECH_VOICE: GEMINI_CANDIDATE }, true),
    );
  }
  if (openAiSupportsLanguage(language)) {
    const openAiVoice = (voiceEnv: Env, candidate: boolean): Voice => ({
      key: "openai",
      needs: "OPENAI_API_KEY",
      ready: Boolean(env.OPENAI_API_KEY?.trim()),
      candidate,
      markup: candidate ? null : acutePrompt,
      create: (request) => createOpenAiSpeechProvider(voiceEnv, language, request),
      markupRequest: (_plain, form) => ({
        text: form.marked,
        note: STRESS_INSTRUCTION,
        edit: (body) => {
          body.instructions = `${body.instructions} ${STRESS_INSTRUCTION}`;
        },
      }),
    });
    list.push(
      openAiVoice(env, false),
      openAiVoice({ ...env, OPENAI_SPEECH_VOICE: OPENAI_CANDIDATE }, true),
    );
  }
  if (chirp)
    list.push({
      key: "chirp",
      needs: "GOOGLE_CLOUD_TTS_CREDENTIALS",
      ready: Boolean(env.GOOGLE_CLOUD_TTS_CREDENTIALS?.trim()),
      // Cloud's custom pronunciations exclude uk-UA (docs.cloud.google.com/text-to-speech/docs/chirp3-hd).
      markup: chirp === "uk-UA" ? null : "IPA custom pronunciation",
      create: (request) =>
        createGoogleChirpProvider(env, { locale: chirp, request, ...dryToken() }),
      markupRequest: (plain, form) => ({
        text: plain,
        edit: (body) => {
          (body.input as Body).customPronunciations = {
            pronunciations: [
              { phrase: plain, phoneticEncoding: "PHONETIC_ENCODING_IPA", pronunciation: form.ipa },
            ],
          };
        },
      }),
    });
  return list;
}

function requests(voice: Voice, item: StressItem) {
  const plain = strip(item.forms[0]?.marked ?? "");
  const job = (mode: Mode, forms: StressForm[], spoken: Spoken) => ({
    id: createHash("sha256")
      .update(
        JSON.stringify([
          item.language,
          // Dry clips get their own ids, so practice ratings never count in a live run.
          ...(dry ? ["dry"] : []),
          voiceLabel(voice),
          mode,
          spoken.text,
          forms.map((form) => form.marked),
          ...(spoken.note ? [spoken.note] : []),
        ]),
      )
      .digest("hex")
      .slice(0, 12),
    mode,
    plain,
    forms,
    spoken,
  });
  if (voice.candidate)
    return item.forms
      .filter((form) => !voice.words || voice.words.includes(form.marked))
      .map((form) => job("acute", [form], { text: form.marked }));
  return [
    job("plain", item.forms, { text: plain }),
    ...item.forms.flatMap((form) => [
      job("acute", [form], { text: form.marked }),
      ...(voice.markup ? [job("markup", [form], voice.markupRequest(plain, form))] : []),
    ]),
  ];
}

function voiceLabel(voice: Voice): string {
  const provider = voice.create(fetch);
  return `${provider.provider} · ${provider.model} · ${voice.name?.split(" - ")[0] ?? provider.voice}`;
}

/** Records what each request sends; a dry run answers it with a stand-in instead of calling. */
function transport(clip: string, edit?: (body: Body) => void): Fetch {
  return async (input, init) => {
    const url = String(input);
    let body = init?.body;
    if (typeof body === "string") {
      const json = JSON.parse(body) as Body;
      edit?.(json);
      body = JSON.stringify(json);
      sent.push({ clip, url: url.split("?")[0] ?? url, body: json });
    }
    if (!dry) return fetch(input, { ...init, body: body ?? null });
    if (url.includes(":generateContent"))
      return Response.json({
        candidates: [
          {
            content: {
              parts: [
                { inlineData: { mimeType: "audio/l16; rate=24000; channels=1", data: "AAA=" } },
              ],
            },
          },
        ],
      });
    if (url.includes("text:synthesize")) return Response.json({ audioContent: "AAA=" });
    return new Response(new Uint8Array(2), { headers: { "Content-Type": "audio/mpeg" } });
  };
}

function dryToken() {
  return dry ? { accessToken: async () => "dry-run" } : {};
}

function liveEnv(): Env {
  const wrangler = readFileSync(new URL("../../../wrangler.jsonc", import.meta.url), "utf8");
  return {
    ...process.env,
    AI_GATEWAY_URL:
      process.env.AI_GATEWAY_URL ?? /"AI_GATEWAY_URL":\s*"([^"]+)"/.exec(wrangler)?.[1],
  };
}

function placeholderEnv(): Env {
  const live = liveEnv();
  return {
    ...live,
    AI_GATEWAY_TOKEN: "dry-run",
    ELEVENLABS_API_KEY: "dry-run",
    GEMINI_API_KEY: "dry-run",
    OPENAI_API_KEY: "dry-run",
    GOOGLE_CLOUD_TTS_CREDENTIALS: JSON.stringify({
      type: "service_account",
      project_id: "dry-run",
      private_key: "dry-run",
      client_email: "dry-run@example.com",
    }),
  };
}

function check(item: StressItem) {
  const plain = strip(item.forms[0]?.marked ?? "");
  for (const form of item.forms) {
    const marks = [...form.marked].filter((char) => char === ACUTE).length;
    if (strip(form.marked) !== plain || marks !== 1 || target(form.marked) < 0)
      throw new Error(`${form.marked} needs one U+0301 after a vowel of ${plain}`);
    if (form.ipa.split("ˈ").length !== 2) throw new Error(`${form.ipa} needs one primary stress`);
  }
}

function strip(text: string): string {
  return text.replaceAll(ACUTE, "");
}

/** The index, among the word's vowels, of the one U+0301 follows. */
function target(marked: string): number {
  const at = marked.indexOf(ACUTE);
  const before = marked.slice(0, at);
  return VOWEL.test(before.at(-1) ?? "")
    ? [...before].filter((char) => VOWEL.test(char)).length - 1
    : -1;
}

function options(plain: string): string[] {
  const chars = [...plain];
  return chars.flatMap((char, at) =>
    VOWEL.test(char) ? [[...chars.slice(0, at + 1), ACUTE, ...chars.slice(at + 1)].join("")] : [],
  );
}

async function pool<T>(items: T[], size: number, work: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const item = items[next];
        next += 1;
        if (item) await work(item);
      }
    }),
  );
}

/** A tenth of a second of silence, so a dry run's page plays. */
function silence(): Uint8Array {
  const samples = 800;
  const bytes = new Uint8Array(44 + samples * 2);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) bytes[offset + i] = value.charCodeAt(i);
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 16000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples * 2, true);
  return bytes;
}

function page(clips: Clip[]): string {
  const data = JSON.stringify(clips).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Stress listening test</title>
<style>
:root { color-scheme: light dark; font: 16px/1.5 system-ui, sans-serif; }
body { margin: 0 auto; max-width: 56rem; padding: 1rem; background: Canvas; color: CanvasText; }
h2 { margin-block-start: 2rem; }
h3 { margin-block: 1.5rem 0.5rem; font-size: 1rem; }
ol { padding: 0; list-style: none; }
li { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; padding: 0.5rem; border-radius: 0.5rem; }
li:focus-visible, li.active { outline: 2px solid Highlight; }
button { font: inherit; padding: 0.25rem 0.75rem; border-radius: 0.375rem; border: 1px solid GrayText; background: ButtonFace; color: ButtonText; cursor: pointer; }
button[aria-pressed="true"] { background: Highlight; color: HighlightText; border-color: Highlight; }
.term { font-size: 1.25rem; }
.answer, .failed { color: GrayText; font-size: 0.875rem; }
body:not(.answers) .answer { display: none; }
.right { outline: 2px solid green; }
.wrong { outline: 2px solid red; }
.bar { position: sticky; inset-block-start: 0; background: Canvas; padding-block: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; border-block-end: 1px solid GrayText; z-index: 1; }
textarea { inline-size: 100%; block-size: 20rem; font: 0.8125rem/1.4 ui-monospace, monospace; }
kbd { font: 0.8125rem ui-monospace, monospace; border: 1px solid GrayText; border-radius: 0.25rem; padding-inline: 0.25rem; }
</style>
</head>
<body>
<h1>Stress listening test</h1>
<p>Play each clip and pick the syllable you hear stressed. Flag a clip when the voice says the accent mark or garbles the word, and, in Ukrainian, when it uses Russian vowels. Above each voice's clips, rate how native it sounds. Voices marked candidate are library voices weighed against today's, and they speak only the marked words. The page hides what was sent until you show answers, and keeps your ratings in this browser.</p>
<p><kbd>Space</kbd> plays again, <kbd>1</kbd>–<kbd>5</kbd> pick a syllable and move on, <kbd>0</kbd> can't tell, <kbd>m</kbd> mark voiced or garbled and <kbd>r</kbd> Russian vowels (before picking, or within a second after), <kbd>↑</kbd> <kbd>↓</kbd> move.</p>
<div id="app"></div>
<script>window.CLIPS = ${data};</script>
<script>
${pageScript}
</script>
</body>
</html>
`;
}
