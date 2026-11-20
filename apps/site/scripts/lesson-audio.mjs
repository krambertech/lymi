// Records the Estonian lessons' clips with ElevenLabs: the product's Estonian voice, and a second
// voice for the other speaker in a dialogue. Only clips whose text, model or voice changed are
// recorded; clips no lesson uses are removed. A passage is recorded as one take, and the time each
// of its sentences starts is saved beside it. Every new clip is brought to one loudness with ffmpeg,
// so two voices in a dialogue play at the same level.
// Requires ELEVENLABS_API_KEY and ffmpeg. Run with `pnpm --filter @lymi/site lesson:audio`.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { nativeSpeechVoice } from "../../web/src/server/ai/speech-voices.ts";
import { CLIPS, clipText, clipVoice, isPassage } from "../src/lib/learn/clips.ts";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const root = join(site, "public/audio/estonian-lessons");
const manifestPath = join(root, "manifest.json");
const key = process.env.ELEVENLABS_API_KEY?.trim();
if (!key) throw new Error("Set ELEVENLABS_API_KEY to record lesson audio.");

const main = nativeSpeechVoice("et")?.voice;
if (!main) throw new Error("The product has no Estonian voice.");
const VOICES = {
  main,
  // “Liis - Entrepreneur” in ElevenLabs' library: a native Estonian speaker. With language_code
  // "et" her Estonian transcribed back word for word. Mari in the dialogues.
  second: "WtzwR2kNGVNuaTGaYLfK",
};
const model = process.env.ELEVENLABS_SPEECH_MODEL?.trim() || "eleven_v4";
const LOUDNESS = "loudnorm=I=-18:TP=-1.5:LRA=11";
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
const next = {};
// Saved after every clip, so a run that fails partway doesn't pay for the same clips again.
const saved = { ...manifest };
const save = (data) => writeFileSync(manifestPath, `${JSON.stringify(data, null, 2)}\n`);
let recorded = 0;
let ffmpegChecked = false;

function normalize(file) {
  if (!ffmpegChecked) {
    try {
      execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    } catch {
      throw new Error("Install ffmpeg to record lesson audio: it evens out each clip's loudness.");
    }
    ffmpegChecked = true;
  }
  const out = `${file}.tmp.mp3`;
  execFileSync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    file,
    "-af",
    LOUDNESS,
    "-ar",
    "44100",
    "-b:a",
    "64k",
    out,
  ]);
  renameSync(out, file);
}

async function speak(voice, text, timed) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}${timed ? "/with-timestamps" : ""}?output_format=mp3_44100_64`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: model,
        language_code: "et",
        voice_settings: { stability: 1 },
      }),
    },
  );
  if (!response.ok) throw new Error(`ElevenLabs answered ${response.status}`);
  if (!timed) return { audio: Buffer.from(await response.arrayBuffer()) };
  const body = await response.json();
  return { audio: Buffer.from(body.audio_base64, "base64"), alignment: body.alignment };
}

/** When each sentence starts, from the characters' start times, and how long the take lasts. */
function timing(sentences, text, alignment) {
  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;
  let from = 0;
  const marks = sentences.map((sentence) => {
    const at = text.indexOf(sentence, from);
    from = at + sentence.length;
    return Math.round((starts[at] ?? 0) * 100) / 100;
  });
  marks[0] = 0;
  return { marks, duration: Math.round(((ends.at(-1) ?? 0) + 0.3) * 100) / 100 };
}

for (const [lesson, clips] of Object.entries(CLIPS)) {
  mkdirSync(join(root, lesson), { recursive: true });
  for (const [id, clip] of Object.entries(clips)) {
    const name = `${lesson}/${id}`;
    const text = clipText(clip);
    const voice = VOICES[clipVoice(clip)];
    const identity = { text, model, voice };
    next[name] = identity;
    const file = join(root, `${name}.mp3`);
    const timingFile = join(root, `${name}.json`);
    const passage = isPassage(clip);
    if (
      existsSync(file) &&
      (!passage || existsSync(timingFile)) &&
      JSON.stringify(manifest[name]) === JSON.stringify(identity)
    )
      continue;
    // A full stop keeps a short word from being read as a fragment.
    const spoken = /[.!?]$/.test(text) ? text : `${text}.`;
    const { audio, alignment } = await speak(voice, spoken, passage);
    writeFileSync(file, audio);
    normalize(file);
    if (passage)
      writeFileSync(timingFile, `${JSON.stringify(timing(clip.sentences, spoken, alignment))}\n`);
    saved[name] = identity;
    save(saved);
    recorded += 1;
    console.log(`${name}: ${text}`);
  }
  for (const file of readdirSync(join(root, lesson))) {
    const base = file.replace(/\.(mp3|json)$/, "");
    if (file === base) continue;
    const clip = clips[base];
    if (!next[`${lesson}/${base}`] || (file.endsWith(".json") && !(clip && isPassage(clip))))
      unlinkSync(join(root, lesson, file));
  }
}

save(next);
console.log(`${recorded} recorded, ${Object.keys(next).length - recorded} unchanged.`);
