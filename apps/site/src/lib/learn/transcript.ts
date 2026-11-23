import { DIGIT_WORDS } from "./estonian-numbers";

const GENITIVE = [
  "nulli",
  "ühe",
  "kahe",
  "kolme",
  "nelja",
  "viie",
  "kuue",
  "seitsme",
  "kaheksa",
  "üheksa",
  "kümne",
];
const PARTITIVE = [
  "nulli",
  "üht",
  "kaht",
  "kolme",
  "nelja",
  "viit",
  "kuut",
  "seitset",
  "kaheksat",
  "üheksat",
  "kümmet",
];
const ORDINAL = [
  ["nullis", "nullinda"],
  ["esimene", "esimese"],
  ["teine", "teise"],
  ["kolmas", "kolmanda"],
  ["neljas", "neljanda"],
  ["viies", "viienda"],
  ["kuues", "kuuenda"],
  ["seitsmes", "seitsmenda"],
  ["kaheksas", "kaheksanda"],
  ["üheksas", "üheksanda"],
  ["kümnes", "kümnenda"],
] as const;
const CASES = ["", "l", "le", "lt", "s", "st", "sse", "ks", "ga", "ni", "na", "ta"];

const NUMBER_WORDS = new Map<string, number>();
const name = (value: number, ...words: readonly string[]) => {
  for (const word of words) if (!NUMBER_WORDS.has(word)) NUMBER_WORDS.set(word, value);
};
const inCases = (stem: string) => CASES.map((ending) => stem + ending);

for (let n = 0; n <= 10; n++) {
  const word = DIGIT_WORDS[n] as string;
  const stem = GENITIVE[n] as string;
  name(n, word, PARTITIVE[n] as string);
  if (n >= 1 && n <= 9) {
    name(10 + n, `${word}teist`, ...inCases(`${stem}teistkümne`), `${stem}teistkümnes`);
    name(10 + n, ...inCases(`${stem}teistkümnenda`));
  }
  if (n >= 2 && n <= 9) {
    name(n * 10, `${word}kümmend`, ...inCases(`${stem}kümne`));
    name(n * 10, `${stem}kümnes`, ...inCases(`${stem}kümnenda`));
    name(n * 100, `${word}sada`, ...inCases(`${stem}saja`));
  }
}
for (let n = 0; n <= 10; n++) {
  const [ordinal, ordinalStem] = ORDINAL[n] as (typeof ORDINAL)[number];
  name(n, ordinal, ...inCases(ordinalStem), ...inCases(GENITIVE[n] as string));
}
name(2, "kahte", "kaksi");
name(1, "ühte");
name(100, "sada", "sadat", ...inCases("saja"), ...inCases("sajanda"));
name(1000, "tuhat", "tuhandet", ...inCases("tuhande"), ...inCases("tuhandenda"));

const DIGIT_GROUPS = /(?<=\d)[ \u00a0\u202f](?=\d{3}(?!\d))/g;
const DIGIT_ENDING = new RegExp(`(?<=\\d)-?(?:${CASES.filter(Boolean).join("|")})(?!\\p{L})`, "gu");

function joined(before: number, next: number): number | null {
  if (next === 1000 && before < 1000) return before * 1000;
  if (before >= 1000 && before % 1000 === 0 && next < 1000) return before + next;
  if (before >= 100 && before % 100 === 0 && next < 100) return before + next;
  const tens = before % 100;
  if (tens >= 20 && tens % 10 === 0 && next >= 1 && next <= 9) return before + next;
  return null;
}

export function canonicalWords(text: string): string[] {
  const words = text
    .normalize("NFC")
    .toLowerCase()
    .replace(DIGIT_GROUPS, "")
    .replace(DIGIT_ENDING, "")
    .replace(/€/g, " eurot ")
    .replace(/%/g, " protsenti ")
    .match(/\p{N}+|[\p{L}\p{M}]+/gu);
  const out: string[] = [];
  let value: number | null = null;
  let digits = "";
  const close = () => {
    if (value !== null) digits += String(value);
    value = null;
  };
  const flush = () => {
    close();
    if (digits) out.push(digits);
    digits = "";
  };
  for (const word of words ?? []) {
    const next = /^\d+$/.test(word) ? Number(word) : NUMBER_WORDS.get(word);
    if (next === undefined) {
      flush();
      out.push(word);
      continue;
    }
    const sum: number | null = value === null ? null : joined(value, next);
    if (sum === null) close();
    value = sum ?? next;
  }
  flush();
  return out;
}

export type WordStep =
  | { kind: "same"; word: string }
  | { kind: "missing"; word: string }
  | { kind: "extra"; word: string };

export interface Comparison {
  wrong: number;
  words: number;
  rate: number;
  steps: WordStep[];
}

export function compareWords(expected: readonly string[], heard: readonly string[]): Comparison {
  const width = heard.length + 1;
  const cost = Array.from({ length: (expected.length + 1) * width }, () => 0);
  const at = (i: number, j: number) => cost[i * width + j] ?? 0;
  for (let i = expected.length; i >= 0; i--)
    for (let j = heard.length; j >= 0; j--) {
      if (i === expected.length || j === heard.length) {
        cost[i * width + j] = expected.length - i + heard.length - j;
        continue;
      }
      cost[i * width + j] =
        expected[i] === heard[j]
          ? at(i + 1, j + 1)
          : 1 + Math.min(at(i + 1, j + 1), at(i + 1, j), at(i, j + 1));
    }
  const steps: WordStep[] = [];
  let i = 0;
  let j = 0;
  while (i < expected.length || j < heard.length) {
    const wanted = expected[i];
    const got = heard[j];
    if (wanted !== undefined && wanted === got) {
      steps.push({ kind: "same", word: wanted });
      i++;
      j++;
    } else if (wanted !== undefined && got !== undefined && at(i, j) === 1 + at(i + 1, j + 1)) {
      steps.push({ kind: "missing", word: wanted }, { kind: "extra", word: got });
      i++;
      j++;
    } else if (wanted !== undefined && (got === undefined || at(i, j) === 1 + at(i + 1, j))) {
      steps.push({ kind: "missing", word: wanted });
      i++;
    } else if (got !== undefined) {
      steps.push({ kind: "extra", word: got });
      j++;
    }
  }
  const wrong = at(0, 0);
  return { wrong, words: expected.length, rate: wrong / Math.max(1, expected.length), steps };
}

export interface HeardClip {
  name: string;
  text: string;
  heard: string;
}

export interface Mismatch extends HeardClip, Comparison {}

export interface TranscriptReport {
  checked: number;
  mismatches: Mismatch[];
  singleWords: Mismatch[];
}

export function transcriptReport(clips: readonly HeardClip[]): TranscriptReport {
  const report: TranscriptReport = { checked: clips.length, mismatches: [], singleWords: [] };
  for (const clip of clips) {
    const expected = canonicalWords(clip.text);
    const compared = compareWords(expected, canonicalWords(clip.heard));
    if (compared.wrong === 0) continue;
    const list = expected.length === 1 ? report.singleWords : report.mismatches;
    list.push({ ...clip, ...compared });
  }
  const worstFirst = (a: Mismatch, b: Mismatch) =>
    b.rate - a.rate || b.wrong - a.wrong || a.name.localeCompare(b.name);
  report.mismatches.sort(worstFirst);
  report.singleWords.sort(worstFirst);
  return report;
}

const marked = (steps: readonly WordStep[]) =>
  steps
    .map(({ kind, word }) =>
      kind === "same" ? word : kind === "missing" ? `[-${word}-]` : `{+${word}+}`,
    )
    .join(" ");

const entry = (each: Mismatch) =>
  `- **${each.name}** ${Math.round(each.rate * 100)}% (${each.wrong} of ${each.words})\n  - says: ${each.text}\n  - heard: ${each.heard}\n  - ${marked(each.steps)}`;

export function reportText({ checked, mismatches, singleWords }: TranscriptReport): string {
  const section = (title: string, list: readonly Mismatch[]) =>
    `## ${title} (${list.length})\n\n${list.map(entry).join("\n") || "None."}\n`;
  return [
    `# Lesson audio against its text\n\n${checked} clips checked. [-word-] is in the text and was not heard; {+word+} was heard and is not in the text.\n`,
    section("Sentences, passages and conversations", mismatches),
    section("Single words, which transcribe badly", singleWords),
  ].join("\n");
}
