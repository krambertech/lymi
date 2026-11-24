import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ffmpeg, levelConversation, seconds } from "./conversation-levels.mjs";

function segmentLoudness(file, start) {
  const { error, status, stderr } = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostats",
      "-i",
      file,
      "-af",
      `atrim=start=${start}:duration=2,ebur128`,
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8", stdio: ["ignore", "ignore", "pipe"] },
  );
  if (error) throw error;
  assert.equal(status, 0, stderr);
  return Number(stderr.match(/Summary:[\s\S]*?I:\s+(-?[\d.]+) LUFS/)?.[1]);
}

test("levels alternating speakers without changing the duration", () => {
  const work = mkdtempSync(join(tmpdir(), "conversation-levels-test-"));
  try {
    const file = join(work, "conversation.mp3");
    ffmpeg(
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=500:duration=6:sample_rate=44100",
      "-af",
      "volume=enable='between(t,2,4)':volume=-12dB",
      "-b:a",
      "64k",
      file,
    );
    const duration = seconds(file);
    const timing = { marks: [0, 2, 4], speakers: ["main", "second", "main"], duration };

    assert.ok(segmentLoudness(file, 0) - segmentLoudness(file, 2) > 10);
    levelConversation(file, timing);

    for (const mark of timing.marks) assert.ok(Math.abs(segmentLoudness(file, mark) + 18) <= 0.5);
    assert.equal(seconds(file), duration);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
