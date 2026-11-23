import {
  type Clip,
  type Conversation,
  type ConversationTurn,
  clipText,
  clipVoice,
  isConversation,
  isPassage,
  type LessonVoice,
  turnSentences,
} from "./clips";

export type VoiceIds = Readonly<Record<LessonVoice, string>>;

export const LIBRARY_VOICES: Readonly<Record<Exclude<LessonVoice, "main">, string>> = {
  second: "WtzwR2kNGVNuaTGaYLfK",
  third: "xd3ufyLcuKKZZXDZO9H7",
  fourth: "0cuaFlR2we1Gl3woPjeJ",
};

export interface Studio {
  model: string;
  voices: VoiceIds;
}

export interface TakeIdentity {
  text: string;
  model: string;
  voice: string;
}

export interface ConversationIdentity {
  text: string;
  model: string;
  turns: { voice: string; sentences: readonly string[]; say?: string }[];
  clips?: readonly string[];
}

export type ClipIdentity = TakeIdentity | ConversationIdentity;

export function clipIdentity(clip: Clip, { model, voices }: Studio): ClipIdentity {
  const text = clipText(clip);
  if (!isConversation(clip)) return { text, model, voice: voices[clipVoice(clip)] };
  return {
    text,
    model,
    turns: clip.turns.map((turn) => ({
      voice: voices[turn.voice],
      sentences: turnSentences(turn),
      ...(turn.say === undefined ? {} : { say: turn.say }),
    })),
    ...(clip.clips ? { clips: clip.clips } : {}),
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function spokenText(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

export interface Heard {
  text: string;
  at: number[];
}

export function withoutTags(characters: readonly string[]): Heard {
  const heard: Heard = { text: "", at: [] };
  let inTag = false;
  characters.forEach((character, i) => {
    if (character === "[") inTag = true;
    else if (character === "]") inTag = false;
    else if (!inTag) {
      const space = /\s/.test(character);
      if (space && (heard.text === "" || heard.text.endsWith(" "))) return;
      heard.text += space ? " " : character;
      heard.at.push(...Array.from(space ? " " : character, () => i));
    }
  });
  if (heard.text.endsWith(" ")) {
    heard.text = heard.text.slice(0, -1);
    heard.at.pop();
  }
  return heard;
}

const turnText = (turn: ConversationTurn): string => turnSentences(turn).join(" ");

const turnSay = (turn: ConversationTurn): string => turn.say ?? turnText(turn);

const spokenOf = (say: string): string => withoutTags([...say]).text;

const REQUEST_CHARACTERS = 2000;

export function dialogueRequests(
  turns: readonly ConversationTurn[],
  most = REQUEST_CHARACTERS,
): ConversationTurn[][] {
  const requests: ConversationTurn[][] = [];
  let size = Number.POSITIVE_INFINITY;
  for (const turn of turns) {
    const length = turnSay(turn).length;
    if (size + length > most) {
      requests.push([]);
      size = 0;
    }
    requests.at(-1)?.push(turn);
    size += length;
  }
  return requests;
}

export const requestCharacters = (turns: readonly ConversationTurn[]): number =>
  turns.reduce((sum, turn) => sum + turnSay(turn).length, 0);

export function dialogueBody(turns: readonly ConversationTurn[], { model, voices }: Studio) {
  return {
    inputs: turns.map((turn) => ({ text: turnSay(turn), voice_id: voices[turn.voice] })),
    model_id: model,
    language_code: "et",
    settings: { stability: 0.5 },
  };
}

export type Job =
  | { kind: "take"; name: string; clip: Exclude<Clip, Conversation>; identity: TakeIdentity }
  | {
      kind: "dialogue";
      name: string;
      clip: Conversation;
      identity: ConversationIdentity;
      requests: ConversationTurn[][];
    }
  | {
      kind: "join";
      name: string;
      clip: Conversation;
      identity: ConversationIdentity;
      clips: readonly string[];
    };

export interface Plan {
  jobs: Job[];
  identities: Record<string, ClipIdentity>;
  unchanged: number;
  sent: { name: string; characters: number }[];
  characters: number;
}

interface Shelf {
  clips: Readonly<Record<string, Readonly<Record<string, Clip>>>>;
  manifest: Readonly<Record<string, unknown>>;
  hasFile: (path: string) => boolean;
  studio: Studio;
}

export const isTimed = (clip: Clip): boolean => isPassage(clip) || isConversation(clip);

export function planRecording({ clips, manifest, hasFile, studio }: Shelf): Plan {
  const plan: Plan = { jobs: [], identities: {}, unchanged: 0, sent: [], characters: 0 };
  const send = (name: string, characters: number) => {
    plan.sent.push({ name, characters });
    plan.characters += characters;
  };
  for (const [lesson, each] of Object.entries(clips))
    for (const [id, clip] of Object.entries(each)) {
      const name = `${lesson}/${id}`;
      const identity = clipIdentity(clip, studio);
      plan.identities[name] = identity;
      const made =
        hasFile(`${name}.mp3`) &&
        (!isTimed(clip) || hasFile(`${name}.json`)) &&
        same(manifest[name], identity);
      if (made) {
        plan.unchanged += 1;
        continue;
      }
      if (!isConversation(clip)) {
        send(name, spokenText(clipText(clip)).length);
        plan.jobs.push({ kind: "take", name, clip, identity: identity as TakeIdentity });
        continue;
      }
      const whole = { name, clip, identity: identity as ConversationIdentity };
      if (clip.clips) {
        plan.jobs.push({ kind: "join", ...whole, clips: clip.clips });
        continue;
      }
      const requests = dialogueRequests(clip.turns);
      requests.forEach((turns, i) =>
        send(`${name} ${i + 1} of ${requests.length}`, requestCharacters(turns)),
      );
      plan.jobs.push({ kind: "dialogue", ...whole, requests });
    }
  plan.jobs.sort((a, b) => Number(a.kind === "join") - Number(b.kind === "join"));
  return plan;
}

function conversationProblems({ turns }: Conversation): string[] {
  const problems = turns.flatMap((turn, i) => {
    const text = turnText(turn);
    const say = turnSay(turn);
    return [
      ...(turnSentences(turn).length === 0 ? [`turn ${i + 1} says nothing`] : []),
      ...(/[[\]]/.test(text) ? [`turn ${i + 1} shows a tag: “${text}”. Put it in say`] : []),
      ...(spokenOf(say) === text
        ? []
        : [`turn ${i + 1} says “${spokenOf(say)}” without its tags but shows “${text}”`]),
      ...(say.length > REQUEST_CHARACTERS
        ? [
            `turn ${i + 1} is ${say.length} characters, more than one request's ${REQUEST_CHARACTERS}`,
          ]
        : []),
    ];
  });
  if (turns.length === 0) problems.push("it has no turns");
  return problems;
}

function joinProblems(
  { turns, clips }: Conversation,
  find: (name: string) => Clip | undefined,
): string[] {
  if (!clips) return [];
  if (clips.length !== turns.length)
    return [`it names ${clips.length} clips for ${turns.length} turns`];
  return turns.flatMap((turn, i) => {
    const name = clips[i] ?? "";
    const clip = find(name);
    const sentences = turnSentences(turn);
    if (clip === undefined || isConversation(clip)) return [`turn ${i + 1}: no clip ${name}`];
    if (clipVoice(clip) !== turn.voice) return [`turn ${i + 1}: ${name} is in another voice`];
    const said = isPassage(clip) ? clip.sentences : [clipText(clip)];
    return same(said, sentences) || (sentences.length === 1 && clipText(clip) === sentences[0])
      ? []
      : [`turn ${i + 1}: ${name} doesn't say its sentences`];
  });
}

export function clipProblems(clips: Shelf["clips"]): string[] {
  const find = (name: string) => {
    const [lesson = "", id = ""] = name.split("/");
    return clips[lesson]?.[id];
  };
  return Object.entries(clips).flatMap(([lesson, each]) =>
    Object.entries(each).flatMap(([id, clip]) =>
      isConversation(clip)
        ? [...conversationProblems(clip), ...joinProblems(clip, find)].map(
            (problem) => `${lesson}/${id}: ${problem}`,
          )
        : [],
    ),
  );
}

export function tooManyCharacters(plan: Plan, most: number): string | null {
  if (plan.characters <= most) return null;
  return `This run would send ${plan.characters} characters to be recorded, more than --max-characters ${most}. Run with --dry-run to see them, then raise the limit if they are all meant.`;
}

const hundredths = (seconds: number) => Math.round(seconds * 100) / 100;

export function sentenceStarts(
  sentences: readonly string[],
  spoken: string,
  characterStarts: readonly number[],
): number[] {
  let from = 0;
  return sentences.map((sentence, i) => {
    const at = spoken.indexOf(sentence, from);
    from = at + sentence.length;
    return i === 0 ? 0 : hundredths(characterStarts[at] ?? 0);
  });
}

export interface Span {
  from: number;
  to: number;
}

const LEAD = 0.05;
const TAIL = 0.12;

export function soundSpan(silenceLog: string, duration: number): Span {
  const times = (name: string) =>
    [...silenceLog.matchAll(new RegExp(`silence_${name}: (-?[\\d.]+)`, "g"))].map((match) =>
      Number(match[1]),
    );
  const starts = times("start");
  const ends = times("end");
  const opening = (starts[0] ?? Number.POSITIVE_INFINITY) <= 0.01 ? ends[0] : undefined;
  if (opening !== undefined && opening >= duration - 0.02) return { from: 0, to: duration };
  const last = starts.at(-1);
  const closes = ends.length < starts.length || (ends.at(-1) ?? 0) >= duration - 0.02;
  const closing = last !== undefined && last > (opening ?? 0) && closes ? last : undefined;
  return {
    from: Math.max(0, (opening ?? 0) - LEAD),
    to: Math.min(duration, (closing ?? duration) + TAIL),
  };
}

export interface DialogueSegment {
  start_time_seconds: number;
  character_start_index: number;
  dialogue_input_index: number;
}

export interface DialogueResponse {
  alignment: {
    characters: readonly string[];
    character_start_times_seconds: readonly number[];
  };
  voice_segments: readonly DialogueSegment[];
}

export interface Part {
  starts: readonly number[];
  speakers: readonly LessonVoice[];
}

export function dialoguePart(
  turns: readonly ConversationTurn[],
  { alignment, voice_segments }: DialogueResponse,
): Part {
  const starts: number[] = [];
  const speakers: LessonVoice[] = [];
  const openings = turns.map((_, input) =>
    voice_segments
      .filter((segment) => segment.dialogue_input_index === input)
      .reduce<DialogueSegment | null>(
        (first, segment) =>
          first && first.character_start_index <= segment.character_start_index ? first : segment,
        null,
      ),
  );
  turns.forEach((turn, input) => {
    const first = openings[input];
    if (!first) throw new Error(`The response times no voice for turn ${input + 1}.`);
    const from = first.character_start_index;
    const to = openings[input + 1]?.character_start_index ?? alignment.characters.length;
    const heard = withoutTags(alignment.characters.slice(from, to));
    let after = 0;
    turnSentences(turn).forEach((sentence, s) => {
      const at = heard.text.indexOf(sentence, after);
      if (at < 0)
        throw new Error(
          `The response doesn't time “${sentence}” in turn ${input + 1}: “${heard.text}”.`,
        );
      after = at + sentence.length;
      const spoken =
        alignment.character_start_times_seconds[from + (heard.at[at] ?? 0)] ??
        first.start_time_seconds;
      starts.push(hundredths(s === 0 ? Math.min(first.start_time_seconds, spoken) : spoken));
      speakers.push(turn.voice);
    });
  });
  return { starts, speakers };
}

export interface JoinedPart extends Part {
  span: Span;
  length: number;
}

export interface ConversationTiming {
  marks: number[];
  speakers: LessonVoice[];
  duration: number;
}

const PART_PAUSE = 0.5;

export function conversationTiming(parts: readonly JoinedPart[]): ConversationTiming {
  const timing: ConversationTiming = { marks: [], speakers: [], duration: 0 };
  let at = 0;
  parts.forEach((part, i) => {
    part.starts.forEach((start, s) =>
      timing.marks.push(hundredths(at + (s === 0 ? 0 : Math.max(0, start - part.span.from)))),
    );
    timing.speakers.push(...part.speakers);
    at += part.length + (i < parts.length - 1 ? PART_PAUSE : 0);
  });
  timing.duration = hundredths(at);
  return timing;
}

export function joinFilter(parts: number): string {
  const padded = Array.from({ length: parts }, (_, i) =>
    i < parts - 1 ? `[${i}:a]apad=pad_dur=${PART_PAUSE}[p${i}]` : `[${i}:a]anull[p${i}]`,
  );
  const inputs = Array.from({ length: parts }, (_, i) => `[p${i}]`).join("");
  return [...padded, `${inputs}concat=n=${parts}:v=0:a=1[out]`].join(";");
}
