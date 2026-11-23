import type { I18n } from "@lingui/core";
import { LESSON_SLUGS, lessonName } from "../../lib/learn/catalogue";
import type { DrillBank, DrillItem } from "../../lib/learn/drill";
import { learnI18n } from "../../lib/learn/i18n";
import { itemId, lessonOf, type Ruled, saveRemoved } from "../../lib/learn/review";

const BANKS = import.meta.glob<{ DRILLS: DrillBank }>("./lessons/*.drills.ts");
const bankFile = (slug: string) => `./lessons/${lessonName(slug)}.drills.ts`;

export const drillSlugs: ReadonlySet<string> = new Set(
  LESSON_SLUGS.filter((slug) => bankFile(slug) in BANKS),
);

export interface DrillSource {
  lesson: string;
  bank: DrillBank;
  i18n: I18n;
}

export interface Question extends Ruled {
  item: DrillItem;
  source: DrillSource;
}

async function loadSource(lesson: string, locale: string): Promise<DrillSource> {
  const load = BANKS[bankFile(lesson)];
  if (!load) throw new Error(`No drill bank for ${lesson}`);
  const [{ DRILLS }, i18n] = await Promise.all([load(), learnI18n(locale, lessonName(lesson))]);
  saveRemoved(lesson, new Set(DRILLS.items.map(({ id }) => itemId(lesson, id))));
  return { lesson, bank: DRILLS, i18n };
}

export const loadSources = (lessons: Iterable<string>, locale: string): Promise<DrillSource[]> =>
  Promise.all([...lessons].map((lesson) => loadSource(lesson, locale)));

export function questionsOf(sources: readonly DrillSource[]): Question[] {
  return sources.flatMap((source) =>
    source.bank.items.map((item) => ({
      id: itemId(source.lesson, item.id),
      rule: itemId(source.lesson, item.rule),
      item,
      source,
    })),
  );
}

export function pickQuestions(
  ids: readonly string[],
  sources: readonly DrillSource[],
): readonly Question[] {
  const known = new Map(questionsOf(sources).map((question) => [question.id, question]));
  return ids.flatMap((id) => known.get(id) ?? []);
}

export const lessonsOf = (ids: readonly string[]): ReadonlySet<string> =>
  new Set(ids.map(lessonOf));
