import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

const TARGET_LUFS = -18;
const MAX_GAP = 1.5;
const MAX_TRUE_PEAK = -0.5;
const TARGET_TOLERANCE = 0.25;
const MAX_PASSES = 6;
const SAMPLE_RATE = 44100;

export const ffmpeg = (...args) =>
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);

export function seconds(file) {
  const read = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
    { encoding: "utf8" },
  );
  return Number(read);
}

function speakerSegments({ marks, speakers, duration }) {
  if (
    marks.length === 0 ||
    marks.length !== speakers.length ||
    !Number.isFinite(duration) ||
    marks.some(
      (mark, i) =>
        !Number.isFinite(mark) || mark < 0 || mark >= duration || (i > 0 && mark <= marks[i - 1]),
    )
  )
    throw new Error("Invalid conversation timing.");

  const segments = [];
  for (const [i, speaker] of speakers.entries()) {
    const end = marks[i + 1];
    if (segments.at(-1)?.speaker === speaker) {
      segments.at(-1).end = end;
    } else {
      segments.push({ speaker, start: i === 0 ? 0 : marks[i], end });
    }
  }
  return segments;
}

function concatenate(segments, gains = new Map()) {
  const filters = segments.map(({ speaker, start, end }, i) => {
    const gain = gains.get(speaker) ?? 0;
    const from = Math.round(start * SAMPLE_RATE);
    const to = end === undefined ? "" : `:end_sample=${Math.round(end * SAMPLE_RATE)}`;
    return `[0:a]atrim=start_sample=${from}${to},asetpts=PTS-STARTPTS,volume=${gain}dB[s${i}]`;
  });
  const inputs = segments.map((_, i) => `[s${i}]`).join("");
  return [...filters, `${inputs}concat=n=${segments.length}:v=0:a=1`].join(";");
}

function measure(file, segments) {
  return new Map(
    [...new Set(segments.map(({ speaker }) => speaker))].map((speaker) => {
      const filter = concatenate(segments.filter((segment) => segment.speaker === speaker));
      const log = loudnessLog(file, `${filter},loudnorm=print_format=json[out]`);
      const summary = log.slice(log.lastIndexOf("{"), log.lastIndexOf("}") + 1);
      const lufs = Number(JSON.parse(summary).input_i);
      if (!Number.isFinite(lufs)) throw new Error(`Cannot measure ${speaker} in ${file}.`);
      return [speaker, lufs];
    }),
  );
}

function loudnessLog(file, filter) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostats",
      "-i",
      file,
      "-filter_complex",
      filter,
      "-map",
      "[out]",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stderr;
}

function truePeak(file) {
  const log = loudnessLog(file, "[0:a]ebur128=framelog=verbose:peak=true[out]");
  const peak = Number(log.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
  if (!Number.isFinite(peak)) throw new Error(`Cannot measure the true peak of ${file}.`);
  return peak;
}

const gap = (levels) => Math.max(...levels.values()) - Math.min(...levels.values());
const targetError = (levels) =>
  Math.max(...Array.from(levels.values(), (lufs) => Math.abs(TARGET_LUFS - lufs)));

export function levelConversation(input, timing, output = input) {
  const segments = speakerSegments(timing);
  const before = measure(input, segments);
  if (
    input === output &&
    targetError(before) <= TARGET_TOLERANCE &&
    truePeak(input) <= MAX_TRUE_PEAK
  ) {
    return { before, after: before };
  }

  const gains = new Map([...before].map(([speaker, lufs]) => [speaker, TARGET_LUFS - lufs]));
  const work = mkdtempSync(join(dirname(output), ".level-"));
  try {
    const staged = join(work, "conversation.mp3");
    let after = before;
    let limiter = 0.75;
    let peak = Infinity;
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      const filter = `${concatenate(segments, gains)},alimiter=limit=${limiter}:level=0:latency=1[out]`;
      ffmpeg(
        "-i",
        input,
        "-filter_complex",
        filter,
        "-map",
        "[out]",
        "-ar",
        String(SAMPLE_RATE),
        "-b:a",
        "64k",
        staged,
      );
      after = measure(staged, segments);
      peak = truePeak(staged);
      if (targetError(after) <= TARGET_TOLERANCE && peak <= MAX_TRUE_PEAK) break;
      if (peak > MAX_TRUE_PEAK) limiter *= 10 ** ((MAX_TRUE_PEAK - peak - 0.2) / 20);
      for (const [speaker, lufs] of after)
        gains.set(speaker, gains.get(speaker) + TARGET_LUFS - lufs);
    }
    if (peak > MAX_TRUE_PEAK) {
      throw new Error(
        `${output} peaks at ${peak} dBTP after encoding (limit ${MAX_TRUE_PEAK} dBTP).`,
      );
    }
    if (targetError(after) > MAX_GAP / 2) {
      throw new Error(
        `Could not level each speaker to within ${MAX_GAP / 2} LUFS of ${TARGET_LUFS} in ${output}.`,
      );
    }
    if (input === output && seconds(staged) !== seconds(input)) {
      throw new Error(`Leveling changed the duration of ${output}.`);
    }
    renameSync(staged, output);
    return { before, after };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

export function levelRecordedConversations(root) {
  const levels = (speakers) =>
    [...speakers].map(([speaker, lufs]) => `${speaker} ${lufs.toFixed(1)}`).join(", ");
  console.log("| Conversation | Before (LUFS) | After (LUFS) | Gap before (dB) | Gap after (dB) |");
  console.log("| --- | --- | --- | ---: | ---: |");
  for (const lesson of readdirSync(root, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory(),
  )) {
    const folder = join(root, lesson.name);
    for (const name of readdirSync(folder).filter((file) => /^c-.*\.mp3$/.test(file))) {
      const timing = join(folder, name.replace(/\.mp3$/, ".json"));
      if (!existsSync(timing)) continue;
      const { before, after } = levelConversation(
        join(folder, name),
        JSON.parse(readFileSync(timing, "utf8")),
      );
      console.log(
        `| ${lesson.name}/${name} | ${levels(before)} | ${levels(after)} | ${gap(before).toFixed(1)} | ${gap(after).toFixed(1)} |`,
      );
    }
  }
}
