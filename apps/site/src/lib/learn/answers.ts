export type Verdict = "right" | "almost" | "wrong";

export type Slip = "marks" | "double" | "single";

export type AnswerPart =
  | { kind: "same"; typed: string; right: string }
  | { kind: "slip"; typed: string; right: string; slip: Slip }
  | { kind: "changed"; typed: string; right: string; mistaken: "form" | "word" }
  | { kind: "missing"; right: string }
  | { kind: "extra"; typed: string };

export interface MarkedAnswer {
  verdict: Verdict;
  accepted: string;
  parts: readonly AnswerPart[];
}

export type IsForm = (word: string) => boolean;

const MOST_SLIPS = 2;
const GAP_COST = 1;

const INVISIBLE = /[­​-‍⁠﻿]/g;
const APOSTROPHES = /[’‘‛ʼʹ´`′]/g;
const DASHES = /[‐‑‒–—―−]/g;
const JOINED_PUNCTUATION = /(\p{L}[,;:.!?…]+)(?=\p{L})/gu;
const EDGES = /^[\s.,;:!?…()[\]"'«»‹›„“”‚-]+|[\s.,;:!?…()[\]"'«»‹›„“”‚-]+$/g;

export function answerWord(word: string): string {
  return word
    .normalize("NFC")
    .replace(INVISIBLE, "")
    .replace(APOSTROPHES, "'")
    .replace(DASHES, "-")
    .toLowerCase()
    .replace(EDGES, "");
}

export const bareWord = (text: string): string => text.replace(EDGES, "");

interface Token {
  text: string;
  word: string;
}

function tokens(sentence: string): Token[] {
  const out: Token[] = [];
  const pieces = sentence
    .normalize("NFC")
    .replace(INVISIBLE, "")
    .replace(JOINED_PUNCTUATION, "$1 ")
    .split(/\s+/)
    .filter(Boolean);
  for (const text of pieces) {
    const word = answerWord(text);
    const before = out.at(-1);
    if (word) out.push({ text, word });
    else if (before) before.text += ` ${text}`;
  }
  return out;
}

export const answerWords = (sentence: string): string[] =>
  tokens(sentence).map((token) => token.word);

export const sameAnswer = (a: string, b: string): boolean =>
  answerWords(a).join(" ") === answerWords(b).join(" ");

export const formsOf = (texts: readonly string[]): ReadonlySet<string> =>
  new Set(texts.flatMap(answerWords));

const unmarked = (word: string) => word.normalize("NFD").replace(/\p{M}/gu, "");

const isOneDoubled = (short: string, long: string): boolean => {
  if (long.length !== short.length + 1) return false;
  for (let i = 1; i < long.length; i++)
    if (long[i] === long[i - 1] && long.slice(0, i) + long.slice(i + 1) === short) return true;
  return false;
};

export function slipBetween(typed: string, right: string): Slip | null {
  const [a, b] = [answerWord(typed), answerWord(right)];
  if (a === b || !a || !b) return null;
  if (unmarked(a) === unmarked(b)) return "marks";
  if (isOneDoubled(a, b)) return "double";
  if (isOneDoubled(b, a)) return "single";
  return null;
}

function letterDistance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next.push(
        Math.min(
          (row[j] as number) + 1,
          (next[j - 1] as number) + 1,
          (row[j - 1] as number) + (a[i - 1] === b[j - 1] ? 0 : 1),
        ),
      );
    row = next;
  }
  return row[b.length] as number;
}

function swapCost(typed: string, right: string): number {
  if (typed === right) return 0;
  return 0.5 + letterDistance(typed, right) / Math.max(typed.length, right.length);
}

function partFor(typed: Token, right: Token, isForm: IsForm): AnswerPart {
  const pair = { typed: typed.text, right: right.text };
  if (typed.word === right.word) return { kind: "same", ...pair };
  const slip = slipBetween(typed.word, right.word);
  if (!slip) return { kind: "changed", ...pair, mistaken: "word" };
  return isForm(typed.word)
    ? { kind: "changed", ...pair, mistaken: "form" }
    : { kind: "slip", ...pair, slip };
}

function align(typed: readonly Token[], right: readonly Token[]): { cost: number; steps: string } {
  type Cell = { cost: number; steps: string };
  let below: Cell[] = Array.from({ length: right.length + 1 }, (_, j) => ({
    cost: (right.length - j) * GAP_COST,
    steps: "m".repeat(right.length - j),
  }));
  for (let i = typed.length - 1; i >= 0; i--) {
    const row: Cell[] = [];
    const rest = typed.length - i;
    row[right.length] = { cost: rest * GAP_COST, steps: "e".repeat(rest) };
    for (let j = right.length - 1; j >= 0; j--) {
      const swap = below[j + 1] as Cell;
      const missing = row[j + 1] as Cell;
      const extra = below[j] as Cell;
      const choices: Cell[] = [
        {
          cost: swap.cost + swapCost((typed[i] as Token).word, (right[j] as Token).word),
          steps: `p${swap.steps}`,
        },
        { cost: missing.cost + GAP_COST, steps: `m${missing.steps}` },
        { cost: extra.cost + GAP_COST, steps: `e${extra.steps}` },
      ];
      row[j] = choices.reduce((best, each) => (each.cost < best.cost - 1e-9 ? each : best));
    }
    below = row;
  }
  return below[0] as Cell;
}

function markAgainst(
  typed: readonly Token[],
  accepted: string,
  isForm: IsForm,
): MarkedAnswer & { cost: number } {
  const right = tokens(accepted);
  const { cost, steps } = align(typed, right);
  const parts: AnswerPart[] = [];
  let i = 0;
  let j = 0;
  for (const step of steps) {
    if (step === "m") parts.push({ kind: "missing", right: (right[j++] as Token).text });
    else if (step === "e") parts.push({ kind: "extra", typed: (typed[i++] as Token).text });
    else parts.push(partFor(typed[i++] as Token, right[j++] as Token, isForm));
  }
  const off = parts.filter((part) => part.kind !== "same");
  const verdict: Verdict =
    off.length === 0
      ? "right"
      : off.length <= MOST_SLIPS && off.every((part) => part.kind === "slip")
        ? "almost"
        : "wrong";
  return { verdict, accepted, parts, cost };
}

const RANK: Record<Verdict, number> = { right: 0, almost: 1, wrong: 3 };
const ORDER_RANK = 2;

const rank = (marked: MarkedAnswer): number =>
  onlyOrderDiffers(marked) ? ORDER_RANK : RANK[marked.verdict];

export function markAnswer(
  typed: string,
  accepted: readonly string[],
  isForm: IsForm = () => false,
): MarkedAnswer {
  const words = tokens(typed);
  const marked = accepted.map((sentence) => {
    const each = markAgainst(words, sentence, isForm);
    return { ...each, rank: rank(each) };
  });
  const best = marked.reduce<(typeof marked)[number] | undefined>(
    (closest, each) =>
      !closest ||
      each.rank < closest.rank ||
      (each.rank === closest.rank && each.cost < closest.cost)
        ? each
        : closest,
    undefined,
  );
  if (!best) return { verdict: "wrong", accepted: "", parts: [] };
  return { verdict: best.verdict, accepted: best.accepted, parts: best.parts };
}

export const differing = (marked: MarkedAnswer): AnswerPart[] =>
  marked.parts.filter((part) => part.kind !== "same");

export function onlyOrderDiffers(marked: MarkedAnswer): boolean {
  const off = differing(marked);
  const typed = marked.parts.flatMap((part) =>
    part.kind === "missing" ? [] : [answerWord(part.typed)],
  );
  const right = answerWords(marked.accepted);
  return off.length > 0 && typed.sort().join(" ") === right.sort().join(" ");
}

export const otherAnswers = (marked: MarkedAnswer, accepted: readonly string[]): string[] =>
  accepted.filter((sentence) => !sameAnswer(sentence, marked.accepted));

export interface SingleChange {
  at: number;
  wrong: string;
  right: string;
}

export function singleChange(wrong: string, right: string): SingleChange | null {
  const [a, b] = [tokens(wrong), tokens(right)];
  if (a.length !== b.length) return null;
  const off = a.flatMap((token, at) =>
    token.word === (b[at] as Token).word
      ? []
      : [{ at, wrong: token.word, right: (b[at] as Token).word }],
  );
  return off.length === 1 ? (off[0] as SingleChange) : null;
}

export const answerTokens = (sentence: string): string[] =>
  tokens(sentence).map((token) => token.text);
