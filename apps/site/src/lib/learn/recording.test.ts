import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NATIVE_SPEECH_VOICES } from "../../../../web/src/server/ai/speech-voices";
import { CLIPS, type Clip, type Conversation } from "./clips";
import {
  clipIdentity,
  clipProblems,
  conversationTiming,
  dialogueBody,
  dialoguePart,
  dialogueRequests,
  joinFilter,
  LIBRARY_VOICES,
  planRecording,
  sentenceStarts,
  soundSpan,
  type Studio,
  tooManyCharacters,
  withoutTags,
} from "./recording";

const spokenOf = (say: string) => withoutTags([...say]).text;
const studio: Studio = {
  model: "eleven_v4",
  voices: { main: "v-main", second: "v-second", third: "v-third", fourth: "v-fourth" },
};
const chat: Conversation = {
  turns: [
    { voice: "main", text: ["Tere!", "Kuidas läheb?"], say: "[excited] Tere! Kuidas läheb?" },
    { voice: "third", text: "Hästi." },
  ],
};

const plan = (
  clips: Record<string, Clip>,
  { manifest = {}, files = [] }: { manifest?: object; files?: string[] } = {},
) =>
  planRecording({
    clips: { kit: clips },
    manifest: manifest as Record<string, unknown>,
    hasFile: (path) => files.includes(path),
    studio,
  });

const made = (clips: Record<string, Clip>) => ({
  manifest: Object.fromEntries(
    Object.entries(clips).map(([id, clip]) => [`kit/${id}`, clipIdentity(clip, studio)]),
  ),
  files: Object.keys(clips).flatMap((id) => [`kit/${id}.mp3`, `kit/${id}.json`]),
});

describe("the recordings already made", () => {
  it("need nothing recorded, joined or renamed", () => {
    const root = new URL("../../../public/audio/estonian-lessons/", import.meta.url);
    const found = planRecording({
      clips: CLIPS,
      manifest: JSON.parse(readFileSync(new URL("manifest.json", root), "utf8")),
      hasFile: (path) => existsSync(new URL(path, root)),
      studio: {
        model: "eleven_v4",
        voices: { main: NATIVE_SPEECH_VOICES.et?.voice ?? "", ...LIBRARY_VOICES },
      },
    });
    expect(found.jobs.map((job) => job.name)).toEqual([]);
    expect(found.characters).toBe(0);
  });
});

describe("clipIdentity", () => {
  it("keeps the three fields a single take has always had, in their order", () => {
    expect(JSON.stringify(clipIdentity("Tere!", studio))).toBe(
      '{"text":"Tere!","model":"eleven_v4","voice":"v-main"}',
    );
    expect(clipIdentity({ sentences: ["A.", "B."], voice: "second" }, studio)).toEqual({
      text: "A. B.",
      model: "eleven_v4",
      voice: "v-second",
    });
  });

  it("holds a conversation's shown text, voices, sentences and tags", () => {
    expect(clipIdentity(chat, studio)).toEqual({
      text: "Tere! Kuidas läheb? Hästi.",
      model: "eleven_v4",
      turns: [
        {
          voice: "v-main",
          sentences: ["Tere!", "Kuidas läheb?"],
          say: "[excited] Tere! Kuidas läheb?",
        },
        { voice: "v-third", sentences: ["Hästi."] },
      ],
    });
  });
});

describe("planRecording", () => {
  it("counts what is sent: the full stop it adds to a word, the tags of a conversation", () => {
    const found = plan({ tere: "Tere", chat });
    expect(found.sent).toEqual([
      { name: "kit/tere", characters: 5 },
      { name: "kit/chat 1 of 1", characters: 35 },
    ]);
    expect(found.characters).toBe(40);
  });

  it("leaves a conversation alone while its identity stands", () => {
    expect(plan({ chat }, made({ chat }))).toMatchObject({ jobs: [], unchanged: 1, characters: 0 });
  });

  it.each<[string, Conversation["turns"]]>([
    ["a tag", [{ ...chat.turns[0]!, say: "[curious] Tere! Kuidas läheb?" }, chat.turns[1]!]],
    ["a word", [chat.turns[0]!, { voice: "third", text: "Halvasti." }]],
    ["a voice", [chat.turns[0]!, { voice: "fourth", text: "Hästi." }]],
    ["where a sentence ends", [{ ...chat.turns[0]!, text: "Tere! Kuidas läheb?" }, chat.turns[1]!]],
  ])("records a conversation again when %s changed", (_, turns) => {
    expect(plan({ chat: { turns } }, made({ chat })).jobs).toMatchObject([
      { kind: "dialogue", name: "kit/chat" },
    ]);
  });

  it("records a conversation again in another model", () => {
    const { manifest, files } = made({ chat });
    const found = planRecording({
      clips: { kit: { chat } },
      manifest,
      hasFile: (path) => files.includes(path),
      studio: { ...studio, model: "eleven_v5" },
    });
    expect(found.jobs).toHaveLength(1);
  });

  it("makes a timed clip again when its timing is gone", () => {
    expect(plan({ chat }, { ...made({ chat }), files: ["kit/chat.mp3"] }).jobs).toHaveLength(1);
  });

  it("joins a conversation of recorded clips last and sends nothing for it", () => {
    const found = plan({
      joined: { turns: [{ voice: "main", text: "Tere!" }], clips: ["kit/tere"] },
      tere: "Tere!",
    });
    expect(found.jobs.map((job) => job.kind)).toEqual(["take", "join"]);
    expect(found.sent.map(({ name }) => name)).toEqual(["kit/tere"]);
  });
});

describe("clipProblems", () => {
  const conversation = (turns: Conversation["turns"], clips?: string[]) =>
    clipProblems({ kit: { chat: { turns, ...(clips ? { clips } : {}) } } });

  it("needs something said in every turn", () => {
    expect(conversation(chat.turns)).toEqual([]);
    expect(conversation([])).toEqual(["kit/chat: it has no turns"]);
    expect(conversation([{ voice: "main", text: [] }])).toEqual(["kit/chat: turn 1 says nothing"]);
  });

  it("needs the tagged text to be the shown text once the tags are gone", () => {
    const problems = (text: string | string[], say?: string) =>
      conversation([{ voice: "main", text, ...(say ? { say } : {}) }]);
    expect(problems(["Tere!", "Noh, jah."], "[excited] Tere! [hesitates] Noh, jah.")).toEqual([]);
    expect(problems("Noh, jah.", "[hesitates] No, jah.")[0]).toContain(
      "says “No, jah.” without its tags but shows “Noh, jah.”",
    );
    expect(problems("[laughs] Tere!")[0]).toContain("shows a tag");
    expect(problems(`${"a".repeat(2001)}.`)[0]).toContain("more than one request's 2000");
  });

  it("needs each clip a conversation is joined from to say its turn in its voice", () => {
    const own: Record<string, Clip> = {
      tere: "Tere!",
      two: { sentences: ["Tere!", "Head aega!"] },
      liis: { text: "Tere!", voice: "second" },
    };
    const problems = (turn: Conversation["turns"][number], ...clips: string[]) =>
      clipProblems({ kit: { ...own, chat: { turns: [turn], clips } } });
    expect(problems({ voice: "main", text: "Tere!" }, "kit/tere")).toEqual([]);
    expect(problems({ voice: "main", text: ["Tere!", "Head aega!"] }, "kit/two")).toEqual([]);
    expect(problems({ voice: "main", text: "Tere! Head aega!" }, "kit/two")).toEqual([]);
    expect(problems({ voice: "main", text: "Tere!" }, "kit/gone")[0]).toContain("no clip kit/gone");
    expect(problems({ voice: "main", text: "Tere!" }, "kit/liis")[0]).toContain("another voice");
    expect(problems({ voice: "main", text: ["Tere!", "Aitäh!"] }, "kit/two")[0]).toContain(
      "doesn't say",
    );
    expect(problems({ voice: "main", text: "Tere!" })[0]).toContain("0 clips for 1 turns");
  });
});

describe("tooManyCharacters", () => {
  it("stops a run over the limit and lets one at the limit go", () => {
    const found = plan({ chat });
    expect(tooManyCharacters(found, found.characters)).toBeNull();
    expect(tooManyCharacters(found, found.characters - 1)).toContain("--max-characters 34");
  });
});

describe("withoutTags", () => {
  it("takes tags out wherever they stand and leaves single spaces", () => {
    expect(spokenOf("[excited] Tere! [laughs] Kuidas  läheb? [sighs]")).toBe("Tere! Kuidas läheb?");
    expect(spokenOf("Noh[hesitates], jah.")).toBe("Noh, jah.");
    expect(spokenOf("Tere!")).toBe("Tere!");
  });

  it("keeps each character's place in the tagged text", () => {
    const heard = withoutTags([..."[ah] Jah."]);
    expect(heard).toEqual({ text: "Jah.", at: [5, 6, 7, 8] });
  });
});

describe("dialogueRequests", () => {
  const turn = (length: number) => ({ voice: "main", text: "x".repeat(length) }) as const;
  const sizes = (most: number, ...lengths: number[]) =>
    dialogueRequests(lengths.map(turn), most).map((turns) =>
      turns.map(({ text }) => (text as string).length),
    );

  it("splits only between turns and fills each request up to the limit", () => {
    expect(sizes(10, 4, 6, 1, 9, 5)).toEqual([[4, 6], [1, 9], [5]]);
    expect(sizes(10, 4, 4, 4)).toEqual([[4, 4], [4]]);
  });

  it("keeps a short conversation in one request and gives a long turn its own", () => {
    expect(sizes(2000, 900, 1100)).toEqual([[900, 1100]]);
    expect(sizes(10, 3, 12, 3)).toEqual([[3], [12], [3]]);
    expect(dialogueRequests([])).toEqual([]);
  });

  it("counts the tags, which are sent too", () => {
    const tagged = { voice: "main", text: "xxxx", say: "[sighs] xxxx" } as const;
    expect(dialogueRequests([tagged, tagged], 20)).toHaveLength(2);
  });
});

describe("dialogueBody", () => {
  it("sends each turn's tagged text in its voice, in Estonian", () => {
    expect(dialogueBody(chat.turns, studio)).toEqual({
      inputs: [
        { text: "[excited] Tere! Kuidas läheb?", voice_id: "v-main" },
        { text: "Hästi.", voice_id: "v-third" },
      ],
      model_id: "eleven_v4",
      language_code: "et",
      settings: { stability: 0.5 },
    });
  });
});

describe("dialoguePart", () => {
  const response = (says: readonly string[], breaks: readonly number[][] = []) => {
    const characters = [...says.join("")];
    const starts = characters.map((_, i) => i / 10);
    let at = 0;
    return {
      alignment: { characters, character_start_times_seconds: starts },
      voice_segments: says.flatMap((say, input) => {
        const opens = [0, ...(breaks[input] ?? [])].map((offset) => at + offset);
        at += say.length;
        return opens.map((start) => ({
          start_time_seconds: start / 10,
          character_start_index: start,
          dialogue_input_index: input,
        }));
      }),
    };
  };

  it("times each sentence past its tags, with the first from where the voice starts", () => {
    expect(dialoguePart(chat.turns, response(["[excited] Tere! Kuidas läheb?", "Hästi."]))).toEqual(
      { starts: [0, 1.6, 2.9], speakers: ["main", "main", "third"] },
    );
  });

  it("times a sentence that follows a tag inside the turn from its own first letter", () => {
    const turns = [{ voice: "main", text: ["Ei.", "Jah."], say: "Ei. [laughs] Jah." }] as const;
    expect(dialoguePart(turns, response(["Ei. [laughs] Jah."])).starts).toEqual([0, 1.3]);
  });

  it("reads a turn the response splits into segments, in any order", () => {
    const body = response(["[excited] Tere! Kuidas läheb?", "Hästi."], [[16]]);
    body.voice_segments.reverse();
    expect(dialoguePart(chat.turns, body).starts).toEqual([0, 1.6, 2.9]);
  });

  it("gives a repeated sentence its own start", () => {
    const turns = [{ voice: "main", text: ["Jah.", "Jah."] }] as const;
    expect(dialoguePart(turns, response(["Jah. Jah."])).starts).toEqual([0, 0.5]);
  });

  it("says which sentence or turn the response doesn't time", () => {
    expect(() => dialoguePart(chat.turns, response(["Tere! Kuidas?", "Hästi."]))).toThrow(
      "“Kuidas läheb?” in turn 1",
    );
    expect(() => dialoguePart(chat.turns, response(["[excited] Tere! Kuidas läheb?"]))).toThrow(
      "turn 2",
    );
  });
});

describe("sentenceStarts", () => {
  it("finds each sentence in turn, so a repeated one gets its own start", () => {
    const spoken = "Tere! Tere!";
    const starts = Array.from(spoken, (_, i) => i / 10);
    expect(sentenceStarts(["Tere!", "Tere!"], spoken, starts)).toEqual([0, 0.6]);
  });
});

describe("soundSpan", () => {
  const log = (...lines: string[]) => lines.map((line) => `[silencedetect] ${line}`).join("\n");

  it("trims silence at either end and keeps a breath around the sound", () => {
    const span = soundSpan(
      log(
        "silence_start: 0",
        "silence_end: 0.3 | silence_duration: 0.3",
        "silence_start: 1.2",
        "silence_end: 1.5 | silence_duration: 0.3",
        "silence_start: 3",
        "silence_end: 4 | silence_duration: 1",
      ),
      4,
    );
    expect(span.from).toBeCloseTo(0.25);
    expect(span.to).toBeCloseTo(3.12);
  });

  it("keeps a pause inside the turn and a turn that ends on sound", () => {
    expect(
      soundSpan(log("silence_start: 1.2", "silence_end: 1.5 | silence_duration: 0.3"), 4),
    ).toEqual({ from: 0, to: 4 });
  });

  it("reads a closing silence ffmpeg never closed", () => {
    expect(soundSpan(log("silence_start: 3"), 4).to).toBeCloseTo(3.12);
  });

  it("leaves a file that is all silence whole", () => {
    expect(soundSpan(log("silence_start: 0", "silence_end: 4 | silence_duration: 4"), 4)).toEqual({
      from: 0,
      to: 4,
    });
  });
});

describe("conversationTiming", () => {
  it("shifts each request's times past the ones before it and their pause", () => {
    const timing = conversationTiming([
      { speakers: ["main", "third"], starts: [0.3, 1.3], span: { from: 0.3, to: 2.3 }, length: 2 },
      { speakers: ["main", "main"], starts: [0, 0.6], span: { from: 0.1, to: 1.1 }, length: 1 },
    ]);
    expect(timing).toEqual({
      marks: [0, 1, 2.5, 3],
      speakers: ["main", "third", "main", "main"],
      duration: 3.5,
    });
  });
});

describe("joinFilter", () => {
  it("pads every part but the last", () => {
    expect(joinFilter(2)).toBe(
      "[0:a]apad=pad_dur=0.5[p0];[1:a]anull[p1];[p0][p1]concat=n=2:v=0:a=1[out]",
    );
    expect(joinFilter(1)).toBe("[0:a]anull[p0];[p0]concat=n=1:v=0:a=1[out]");
  });
});
