import { answerWords, singleChange } from "../answers";
import { type MarkedItem, SENTENCE_KINDS } from "../sentences";
import { formsIn } from "./forms";
import type { PartCall } from "./record";

const KINDS: ReadonlySet<unknown> = new Set([...SENTENCE_KINDS, "fix"]);

export interface QuizItem {
  quiz: string;
  item: MarkedItem;
}

export function writtenItems(parts: readonly PartCall[]): QuizItem[] {
  return parts
    .filter((call) => call.part === "Quiz")
    .flatMap(({ props }) =>
      (props.items as readonly Record<string, unknown>[])
        .filter((item) => KINDS.has(item.kind) && Array.isArray(item.answers))
        .map((item) => ({ quiz: String(props.id), item: item as unknown as MarkedItem })),
    );
}

export function writtenTexts(item: MarkedItem): string[] {
  return [
    ...item.answers,
    ...(item.confusable ?? []),
    ...(item.words ?? []),
    ...[item.from, item.reply].filter((text) => text !== undefined),
  ];
}

interface Known {
  verified: Readonly<Record<string, string>>;
  clipSays: (src: string) => string | undefined;
}

const sameItem = (a: MarkedItem, b: MarkedItem) =>
  a.kind === b.kind && a.wrong === b.wrong && a.answers.join("\n") === b.answers.join("\n");

export function repeatedIds(items: readonly QuizItem[]): string[] {
  return items.flatMap(({ quiz, item }, i) => {
    const twin = items
      .slice(0, i)
      .find(
        (each) => each.item.id === item.id && (each.quiz === quiz || !sameItem(each.item, item)),
      );
    return twin
      ? [
          `quiz "${quiz}" repeats the item id "${item.id}" (first in "${twin.quiz}"). Fix: give each written item its own id in the lesson.`,
        ]
      : [];
  });
}

export function sentenceProblems(item: MarkedItem, { verified, clipSays }: Known): string[] {
  const problems: string[] = [];
  const named = `${item.kind} item "${item.id}"`;
  const [first] = item.answers;
  if (first === undefined || answerWords(first).length === 0)
    return [`${named} accepts nothing. Fix: give it at least one answer.`];
  for (const answer of item.answers)
    for (const form of formsIn(answer)) {
      const source = verified[form];
      if (source === undefined)
        problems.push(
          `${named} accepts “${answer}”, and “${form}” isn't in verified-forms.json. Fix: correct it, or run pnpm --filter @lymi/site lesson:forms.`,
        );
      else if (source.startsWith("by hand: not a word"))
        problems.push(
          `${named} accepts “${answer}”, and “${form}” is not a word. Fix: correct the sentence.`,
        );
    }
  const texts = item.answers.map((answer) => answerWords(answer).join(" "));
  for (const [i, text] of texts.entries())
    if (texts.indexOf(text) < i)
      problems.push(
        `${named} lists “${item.answers[i]}” twice: case and punctuation don't count. Fix: drop one.`,
      );
  if (item.src !== undefined) {
    const said = clipSays(item.src);
    if (said !== first)
      problems.push(
        `${named} plays a clip that says “${said ?? "nothing"}”, but its first answer is “${first}”. Fix: make them the same sentence.`,
      );
  } else if (item.kind === "dictation") problems.push(`${named} has no clip. Fix: give it src.`);
  if (item.kind === "fix") problems.push(...fixProblems(item, named));
  return problems;
}

function fixProblems(item: MarkedItem, named: string): string[] {
  const { wrong } = item;
  if (wrong === undefined) return [`${named} has no wrong sentence. Fix: give it wrong.`];
  const places = new Set<number>();
  const problems: string[] = [];
  for (const answer of item.answers) {
    const change = singleChange(wrong, answer);
    if (change) places.add(change.at);
    else
      problems.push(
        `${named}: “${wrong}” and “${answer}” don't differ in exactly one word. Fix: change one word and keep the rest, in the same order.`,
      );
  }
  if (places.size > 1)
    problems.push(
      `${named}: its answers change different words of “${wrong}”. Fix: every answer changes the same word.`,
    );
  return problems;
}
