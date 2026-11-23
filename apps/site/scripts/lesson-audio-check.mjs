import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { CLIPS, clipText } from "../src/lib/learn/clips.ts";
import { reportText, transcriptReport } from "../src/lib/learn/transcript.ts";

const { values: flags } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== "--"),
  options: {
    "dry-run": { type: "boolean", default: false },
    lesson: { type: "string" },
    limit: { type: "string" },
  },
});
const limit = flags.limit === undefined ? Number.POSITIVE_INFINITY : Number(flags.limit);
if (Number.isNaN(limit)) throw new Error("--limit takes a number.");
if (flags.lesson !== undefined && !(flags.lesson in CLIPS))
  throw new Error(`No lesson ${flags.lesson} in CLIPS.`);

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const root = join(site, "public/audio/estonian-lessons");
const out = join(site, ".lesson-audio");
const resultsPath = join(out, "transcripts.json");
const reportPath = join(out, "report.md");
const MODEL = "scribe_v2";

const clips = Object.entries(CLIPS)
  .filter(([lesson]) => flags.lesson === undefined || lesson === flags.lesson)
  .flatMap(([lesson, each]) =>
    Object.entries(each).map(([id, clip]) => ({ name: `${lesson}/${id}`, text: clipText(clip) })),
  )
  .filter(({ name }) => existsSync(join(root, `${name}.mp3`)))
  .map((clip) => {
    const audio = readFileSync(join(root, `${clip.name}.mp3`));
    const sha = createHash("sha256").update(audio).digest("hex").slice(0, 24);
    return { ...clip, sha };
  });
const results = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, "utf8")) : {};
const heardBefore = ({ name, sha }) => results[name]?.sha === sha && results[name]?.model === MODEL;
const waiting = clips.filter((clip) => !heardBefore(clip)).slice(0, limit);

console.log(
  `${clips.length} clips, ${clips.filter(heardBefore).length} transcribed before, ${waiting.length} to send.`,
);
if (flags["dry-run"]) process.exit(0);

const key = process.env.ELEVENLABS_API_KEY?.trim();
if (waiting.length && !key) throw new Error("Set ELEVENLABS_API_KEY to check lesson audio.");
mkdirSync(out, { recursive: true });

async function transcribe({ name }) {
  const form = new FormData();
  form.set("model_id", MODEL);
  form.set("language_code", "est");
  form.set("tag_audio_events", "false");
  form.set(
    "file",
    new Blob([readFileSync(join(root, `${name}.mp3`))], { type: "audio/mpeg" }),
    "clip.mp3",
  );
  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": key },
    body: form,
  });
  if (!response.ok) throw new Error(`${name}: ElevenLabs answered ${response.status}`);
  return (await response.json()).text;
}

for (const [i, clip] of waiting.entries()) {
  const heard = await transcribe(clip);
  results[clip.name] = { sha: clip.sha, model: MODEL, heard };
  writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`${i + 1}/${waiting.length} ${clip.name}: ${heard}`);
}

const report = transcriptReport(
  clips.filter(heardBefore).map(({ name, text }) => ({ name, text, heard: results[name].heard })),
);
writeFileSync(reportPath, reportText(report));
console.log(
  `${report.checked} checked: ${report.mismatches.length} sentences differ, ${report.singleWords.length} single words differ. ${reportPath}`,
);
