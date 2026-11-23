import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLIPS, clipId, clipSentences, clipText, isConversation, isPassage } from "./clips";
import { speakersOf } from "./conversation";
import { clipProblems } from "./recording";

const root = new URL("../../../public/audio/estonian-lessons/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", root), "utf8")) as Record<
  string,
  { text: string }
>;

describe("lesson clips", () => {
  it("has a recording of exactly what each clip says, and nothing else", () => {
    const wanted = Object.entries(CLIPS).flatMap(([lesson, clips]) =>
      Object.entries(clips).map(([id, clip]) => [`${lesson}/${id}`, clipText(clip)] as const),
    );
    // Changing a clip's words without `pnpm --filter @lymi/site lesson:audio` fails here.
    expect(
      Object.fromEntries(Object.entries(manifest).map(([name, { text }]) => [name, text])),
    ).toEqual(Object.fromEntries(wanted));
    for (const [name] of wanted) expect(existsSync(new URL(`${name}.mp3`, root)), name).toBe(true);
  });

  it("times every sentence of a passage and a conversation, and names its speaker", () => {
    for (const [lesson, clips] of Object.entries(CLIPS))
      for (const [id, clip] of Object.entries(clips)) {
        if (!isPassage(clip) && !isConversation(clip)) continue;
        const timing = JSON.parse(readFileSync(new URL(`${lesson}/${id}.json`, root), "utf8")) as {
          marks: number[];
          duration: number;
          speakers?: string[];
        };
        expect(timing.marks, `${lesson}/${id}`).toHaveLength(clipSentences(clip).length);
        expect(timing.marks[0]).toBe(0);
        expect([...timing.marks].sort((a, b) => a - b)).toEqual(timing.marks);
        expect(timing.duration).toBeGreaterThan(timing.marks.at(-1) ?? 0);
        expect(timing.speakers, `${lesson}/${id}`).toEqual(
          isConversation(clip) ? speakersOf(clip.turns) : undefined,
        );
        if (isConversation(clip))
          expect(new Set(timing.marks).size, `${lesson}/${id}`).toBe(timing.marks.length);
      }
  });

  it("holds only conversations that can be recorded as they are shown", () => {
    expect(clipProblems(CLIPS)).toEqual([]);
  });

  it("gives words with š and ž file names of their own", () => {
    expect(clipId("šokolaad")).not.toBe(clipId("okolaad"));
    expect(clipId("žürii")).toBe("z5u2rii");
  });
});
