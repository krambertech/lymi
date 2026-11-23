import { formsOf, type IsForm } from "./answers";
import NEAR_FORMS from "./near-forms.json";

export const SENTENCE_KINDS = ["dictation", "translate", "rewrite", "ask", "build"] as const;
export type SentenceKind = (typeof SENTENCE_KINDS)[number];

export interface MarkedItem {
  kind: SentenceKind | "fix";
  id: string;
  answers: readonly string[];
  confusable?: readonly string[] | undefined;
  src?: string | undefined;
  from?: string | undefined;
  reply?: string | undefined;
  words?: readonly string[] | undefined;
  wrong?: string | undefined;
}

const COURSE_FORMS: ReadonlySet<string> = new Set(NEAR_FORMS);

export function realForms(item: MarkedItem): IsForm {
  const own = formsOf([
    ...item.answers,
    ...(item.confusable ?? []),
    ...(item.words ?? []),
    ...[item.from, item.reply, item.wrong].filter((text) => text !== undefined),
  ]);
  return (word) => own.has(word) || COURSE_FORMS.has(word);
}
