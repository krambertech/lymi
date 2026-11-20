// Records the Estonian lessons' clips with the product's Estonian ElevenLabs voice.
// Only clips whose text, model or voice changed are recorded; clips no lesson uses are removed.
// Requires ELEVENLABS_API_KEY. Run with `pnpm --filter @lymi/site lesson:audio`.
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
import { nativeSpeechVoice } from "../../web/src/server/ai/speech-voices.ts";
import { CLIPS } from "../src/lib/learn/clips.ts";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const root = join(site, "public/audio/estonian-lessons");
const manifestPath = join(root, "manifest.json");
const key = process.env.ELEVENLABS_API_KEY?.trim();
if (!key) throw new Error("Set ELEVENLABS_API_KEY to record lesson audio.");

const voice = nativeSpeechVoice("et")?.voice;
if (!voice) throw new Error("The product has no Estonian voice.");
const model = process.env.ELEVENLABS_SPEECH_MODEL?.trim() || "eleven_v4";
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
const next = {};
let recorded = 0;

for (const [lesson, clips] of Object.entries(CLIPS)) {
  mkdirSync(join(root, lesson), { recursive: true });
  for (const [id, text] of Object.entries(clips)) {
    const name = `${lesson}/${id}`;
    const identity = { text, model, voice };
    next[name] = identity;
    const file = join(root, `${name}.mp3`);
    if (existsSync(file) && JSON.stringify(manifest[name]) === JSON.stringify(identity)) continue;
    // A full stop keeps a short word from being read as a fragment.
    const spoken = /[.!?]$/.test(text) ? text : `${text}.`;
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({
          text: spoken,
          model_id: model,
          language_code: "et",
          voice_settings: { stability: 1 },
        }),
      },
    );
    if (!response.ok) throw new Error(`${name}: ElevenLabs answered ${response.status}`);
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    recorded += 1;
    console.log(`${name}: ${text}`);
  }
  for (const file of readdirSync(join(root, lesson))) {
    if (file.endsWith(".mp3") && !next[`${lesson}/${file.slice(0, -4)}`])
      unlinkSync(join(root, lesson, file));
  }
}

writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`${recorded} recorded, ${Object.keys(next).length - recorded} unchanged.`);
