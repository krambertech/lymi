import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { nativeSpeechVoice } from "../../web/src/server/ai/speech-voices.ts";
import { CLIPS, clipText, isPassage, turnSentences } from "../src/lib/learn/clips.ts";
import {
  clipProblems,
  conversationTiming,
  dialogueBody,
  dialoguePart,
  isTimed,
  joinFilter,
  LIBRARY_VOICES,
  planRecording,
  sentenceStarts,
  soundSpan,
  spokenText,
  tooManyCharacters,
} from "../src/lib/learn/recording.ts";
import {
  ffmpeg,
  levelConversation,
  levelRecordedConversations,
  seconds,
} from "./conversation-levels.mjs";

const { values: flags } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== "--"),
  options: {
    "dry-run": { type: "boolean", default: false },
    "level-only": { type: "boolean", default: false },
    "max-characters": { type: "string", default: "20000" },
  },
});
const mostCharacters = Number(flags["max-characters"]);
if (!Number.isInteger(mostCharacters) || mostCharacters < 0)
  throw new Error("--max-characters takes a whole number.");

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const root = join(site, "public/audio/estonian-lessons");
if (flags["level-only"]) {
  if (flags["dry-run"]) throw new Error("--level-only writes audio. Run it without --dry-run.");
  levelRecordedConversations(root);
  process.exit(0);
}
const responses = join(site, ".lesson-audio/dialogue");
const manifestPath = join(root, "manifest.json");
const main = nativeSpeechVoice("et")?.voice;
if (!main) throw new Error("The product has no Estonian voice.");
const studio = {
  model: process.env.ELEVENLABS_SPEECH_MODEL?.trim() || "eleven_v4",
  voices: { main, ...LIBRARY_VOICES },
};
const LOUDNESS = "loudnorm=I=-18:TP=-1.5:LRA=11";
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};

const problems = clipProblems(CLIPS);
if (problems.length) throw new Error(`Fix clips.ts before recording:\n${problems.join("\n")}`);

const plan = planRecording({
  clips: CLIPS,
  manifest,
  hasFile: (path) => existsSync(join(root, path)),
  studio,
});

const unused = Object.entries(CLIPS).flatMap(([lesson, clips]) => {
  const folder = join(root, lesson);
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((file) => {
      const base = file.replace(/\.(mp3|json)$/, "");
      if (file === base) return false;
      const clip = clips[base];
      return clip === undefined || (file.endsWith(".json") && !isTimed(clip));
    })
    .map((file) => join(lesson, file));
});

for (const { name, characters } of plan.sent) console.log(`record ${name}: ${characters}`);
for (const job of plan.jobs) if (job.kind === "join") console.log(`join ${job.name}`);
for (const file of unused) console.log(`remove ${file}`);
console.log(
  `${plan.jobs.filter((job) => job.kind !== "join").length} to record, ${plan.characters} characters; ${plan.unchanged} unchanged.`,
);
const refusal = tooManyCharacters(plan, mostCharacters);
if (flags["dry-run"]) {
  if (refusal) console.log(refusal);
  process.exit(0);
}
if (refusal) throw new Error(refusal);

const key = process.env.ELEVENLABS_API_KEY?.trim();
if (plan.sent.length && !key) throw new Error("Set ELEVENLABS_API_KEY to record lesson audio.");
if (plan.jobs.length)
  for (const tool of ["ffmpeg", "ffprobe"]) {
    try {
      execFileSync(tool, ["-version"], { stdio: "ignore" });
    } catch {
      throw new Error(
        `Install ffmpeg (with ${tool}) to record lesson audio: it evens out loudness.`,
      );
    }
  }

const saved = { ...manifest };
const save = (data) => writeFileSync(manifestPath, `${JSON.stringify(data, null, 2)}\n`);
const length = (file) => Math.round(seconds(file) * 100) / 100;

function normalize(file) {
  const out = `${file}.tmp.mp3`;
  ffmpeg("-i", file, "-af", LOUDNESS, "-ar", "44100", "-b:a", "64k", out);
  renameSync(out, file);
}

async function speak(name, voice, text, timed) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}${timed ? "/with-timestamps" : ""}?output_format=mp3_44100_64`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: studio.model,
        language_code: "et",
        voice_settings: { stability: 1 },
      }),
    },
  );
  if (!response.ok) throw new Error(`${name}: ElevenLabs answered ${response.status}`);
  if (!timed) return { audio: Buffer.from(await response.arrayBuffer()), starts: [] };
  const body = await response.json();
  return {
    audio: Buffer.from(body.audio_base64, "base64"),
    starts: body.alignment.character_start_times_seconds,
  };
}

async function recordTake(job) {
  const file = join(root, `${job.name}.mp3`);
  const spoken = spokenText(clipText(job.clip));
  const passage = isPassage(job.clip);
  const { audio, starts } = await speak(job.name, job.identity.voice, spoken, passage);
  writeFileSync(file, audio);
  normalize(file);
  if (passage) {
    const marks = sentenceStarts(job.clip.sentences, spoken, starts);
    writeFileSync(
      join(root, `${job.name}.json`),
      `${JSON.stringify({ marks, duration: length(file) })}\n`,
    );
  }
}

async function talk(name, turns) {
  const response = await fetch(
    "https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps?output_format=mp3_44100_128",
    {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify(dialogueBody(turns, studio)),
    },
  );
  if (!response.ok) throw new Error(`${name}: ElevenLabs answered ${response.status}`);
  const body = await response.json();
  mkdirSync(responses, { recursive: true });
  writeFileSync(join(responses, `${name.replaceAll(/[ /]/g, "-")}.json`), JSON.stringify(body));
  return body;
}

async function recordDialogue(job, work) {
  const parts = [];
  for (const [i, turns] of job.requests.entries()) {
    const body = await talk(`${job.name} ${i + 1} of ${job.requests.length}`, turns);
    const file = join(work, `${i}.mp3`);
    writeFileSync(file, Buffer.from(body.audio_base64, "base64"));
    parts.push({ file, ...dialoguePart(turns, body) });
  }
  return parts;
}

const recordedParts = (job) =>
  job.clips.map((name, i) => {
    const turn = job.clip.turns[i];
    const sentences = turnSentences(turn);
    const timing = join(root, `${name}.json`);
    return {
      file: join(root, `${name}.mp3`),
      starts: sentences.length > 1 ? JSON.parse(readFileSync(timing, "utf8")).marks : [0],
      speakers: sentences.map(() => turn.voice),
    };
  });

function spanOf(file) {
  const { stderr } = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-i", file, "-af", "silencedetect=noise=-45dB:d=0.05", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  return soundSpan(stderr, seconds(file));
}

function joinParts(name, parts, work) {
  const joined = parts.map(({ file, starts, speakers }, i) => {
    const span = spanOf(file);
    const trimmed = join(work, `trimmed-${i}.wav`);
    const trim = `atrim=${span.from}:${span.to},asetpts=PTS-STARTPTS`;
    ffmpeg("-i", file, "-af", trim, "-ar", "44100", "-ac", "1", "-c:a", "pcm_f32le", trimmed);
    return { trimmed, starts, speakers, span, length: seconds(trimmed) };
  });
  const out = join(work, "joined.wav");
  ffmpeg(
    ...joined.flatMap(({ trimmed }) => ["-i", trimmed]),
    "-filter_complex",
    joinFilter(joined.length),
    "-map",
    "[out]",
    "-ar",
    "44100",
    "-c:a",
    "pcm_f32le",
    out,
  );
  const timing = conversationTiming(joined);
  levelConversation(out, timing, join(root, `${name}.mp3`));
  writeFileSync(join(root, `${name}.json`), `${JSON.stringify(timing)}\n`);
}

async function makeConversation(job) {
  const work = mkdtempSync(join(tmpdir(), "lesson-audio-"));
  try {
    const parts = job.kind === "join" ? recordedParts(job) : await recordDialogue(job, work);
    joinParts(job.name, parts, work);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

for (const lesson of Object.keys(CLIPS)) mkdirSync(join(root, lesson), { recursive: true });
for (const job of plan.jobs) {
  if (job.kind === "take") await recordTake(job);
  else await makeConversation(job);
  saved[job.name] = job.identity;
  save(saved);
  console.log(`${job.name}: ${clipText(job.clip)}`);
}
for (const file of unused) unlinkSync(join(root, file));
const order = new Set([...Object.keys(manifest), ...Object.keys(plan.identities)]);
save(
  Object.fromEntries(
    [...order]
      .filter((name) => name in plan.identities)
      .map((name) => [name, plan.identities[name]]),
  ),
);
console.log(`${plan.jobs.length} made, ${plan.unchanged} unchanged.`);
