import type { Conversation, LessonVoice } from "../clips";
import type { SpeakerNames } from "../conversation";
import { normalizeForm } from "../practice";
import { markedItems, type PassageQuestion } from "../questions";

const words = (text: string) =>
  normalizeForm(text).match(/[\p{L}\p{M}\p{N}]+(?:[.:]\p{N}+)*/gu) ?? [];

function says(sentence: string, answer: string): boolean {
  const said = words(sentence);
  const wanted = words(answer);
  return (
    wanted.length > 0 &&
    said.some((_, start) => wanted.every((word, i) => said[start + i] === word))
  );
}

const twice = (list: readonly string[]) => list.filter((each, i) => list.indexOf(each) !== i);

function ownProblems(question: PassageQuestion, sentences: readonly string[]): string[] {
  switch (question.kind) {
    case undefined:
    case "pick": {
      const ids = question.options.map((option) => option.id);
      return [
        ...(ids.includes(question.answer)
          ? []
          : [`the answer "${question.answer}" is none of its options (${ids.join(", ")})`]),
        ...twice(ids).map((id) => `two options share the id "${id}"`),
      ];
    }
    case "truefalse":
      return [];
    case "short": {
      const [first = ""] = question.answers;
      return [
        ...(question.answers.length === 0 ? ["it accepts no answer"] : []),
        ...question.answers
          .filter((answer) => words(answer).length < 1 || words(answer).length > 2)
          .map((answer) => `“${answer}” is not one or two words`),
        ...(says(sentences[question.line] ?? "", first)
          ? []
          : [
              `its first answer “${first}” isn't in the sentence it names, “${sentences[question.line] ?? ""}”`,
            ]),
      ];
    }
    case "match": {
      const ids = question.options.map((option) => option.id);
      const answers = question.statements.map((statement) => statement.answer);
      return [
        ...question.statements
          .filter((statement) => !ids.includes(statement.answer))
          .map(
            (statement) =>
              `statement "${statement.id}" has the answer "${statement.answer}", which is none of its options (${ids.join(", ")})`,
          ),
        ...twice(ids).map((id) => `two options share the id "${id}"`),
        ...twice(question.statements.map((statement) => statement.id)).map(
          (id) => `two statements share the id "${id}"`,
        ),
        ...(new Set(answers).size < 2
          ? ["every statement has the same answer, so a learner can match by place"]
          : []),
      ];
    }
  }
}

export function questionProblems(
  questions: readonly PassageQuestion[],
  sentences: readonly string[],
): string[] {
  const problems = questions.flatMap((question) =>
    [
      ...ownProblems(question, sentences),
      ...markedItems(question)
        .filter(({ line }) => !Number.isInteger(line) || line < 0 || line >= sentences.length)
        .map(
          ({ key, line }) => `"${key}" names sentence ${line}, and there are ${sentences.length}`,
        ),
    ].map((problem) => `question "${question.id}": ${problem}`),
  );
  for (const id of twice(questions.map((question) => question.id)))
    problems.push(`two questions share the id "${id}"`);
  const statements = questions.filter((question) => question.kind === "truefalse");
  if (statements.length > 1 && new Set(statements.map((each) => each.answer)).size === 1)
    problems.push(
      `all ${statements.length} true or false statements are ${String(statements[0]?.answer)}, so one answer fits them all`,
    );
  return problems;
}

export function nameProblems({ turns }: Conversation, names: SpeakerNames = {}): string[] {
  const voices = new Set<LessonVoice>(turns.map((turn) => turn.voice));
  if (voices.size < 2) return [];
  return [...voices].filter((voice) => !names[voice]).map((voice) => `${voice} has no name`);
}
