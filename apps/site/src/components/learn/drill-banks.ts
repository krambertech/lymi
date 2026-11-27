import type { I18n } from "@lingui/core";
import { LESSON_SLUGS, lessonName } from "../../lib/learn/catalogue";
import type { DrillBank, DrillItem } from "../../lib/learn/drill";
import { learnI18n } from "../../lib/learn/i18n";
import {
  currentReview,
  drawDrill,
  hasLessonItems,
  itemId,
  lessonOf,
  localDay,
  type Ruled,
  saveRemoved,
  saveScheduled,
} from "../../lib/learn/review";

const BANKS = import.meta.glob<{ DRILLS: DrillBank }>("./lessons/*.drills.ts");
const bankFile = (slug: string) => `./lessons/${lessonName(slug)}.drills.ts`;

export type DrillKind = DrillItem["kind"];

export const LAST_EXERCISE: Readonly<Record<string, readonly DrillKind[]>> = {
  "arsti-juures": ["form"],
  "aru-saama": ["dictation", "rewrite"],
  asesonad: ["ask", "dictation", "rewrite"],
  "et-sest-kui": ["dictation", "rewrite"],
  "jalg-jala": ["dictation"],
  jargarvud: ["ask", "dictation"],
  "juba-veel-alles": ["form"],
  kaskiv: ["dictation"],
  keegi: ["dictation"],
  kiri: ["dictation", "rewrite"],
  kohvikus: ["dictation"],
  korter: ["dictation", "form"],
  kusimused: ["rewrite"],
  "labi-metsa": ["dictation"],
  laheksin: ["dictation"],
  "lahme-las": ["dictation", "rewrite"],
  lihtminevik: ["dictation", "form"],
  "loetud-raamat": ["dictation"],
  "lugedes-lugemata": ["dictation", "rewrite"],
  "majades-inimestele": ["dictation", "rewrite"],
  meeldima: ["form", "rewrite"],
  millal: ["dictation"],
  "mina-sina-tema": ["rewrite"],
  "mineviku-eitus": ["translate"],
  mitmus: ["form", "rewrite"],
  modaalverbid: ["form"],
  "olen-lugenud": ["dictation"],
  omadussonad: ["dictation"],
  "ootan-sind": ["dictation", "rewrite"],
  "opetaja-lugemine": ["dictation"],
  "pere-ja-ankeet": ["ask"],
  "pood-poe": ["dictation"],
  raagitakse: ["dictation"],
  "raamat-mille-ostsin": ["dictation", "rewrite"],
  "raamatuid-maju": ["dictation", "rewrite"],
  "raamatut-voi-raamatu": ["dictation"],
  saav: ["dictation"],
  "sobraga-rahata": ["dictation"],
  "sobralik-kodutu": ["dictation"],
  sonajarg: ["ask", "dictation"],
  "ta-olevat-haige": ["dictation"],
  "tee-ja-reisimine": ["form"],
  tegevusnimed: ["build", "form"],
  telefonikone: ["dictation", "form", "rewrite"],
  tookoht: ["form"],
  tulevik: ["form", "translate"],
  turul: ["form"],
  tutvumine: ["dictation", "fix"],
  "ujuma-ujumas-ujumast": ["form"],
  uudised: ["dictation"],
  vordlus: ["dictation"],
};

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

export async function scheduleLesson(lesson: string): Promise<void> {
  const load = BANKS[bankFile(lesson)];
  if (!load) return;
  const { DRILLS } = await load();
  const questions = DRILLS.items.map((item) => ({
    id: itemId(lesson, item.id),
    rule: itemId(lesson, item.rule),
  }));
  saveScheduled(drawDrill(questions, currentReview(), localDay()).map(({ id }) => id));
}

export function scheduleFinishedLesson(lesson: string, finished: boolean): void {
  if (finished && !hasLessonItems(currentReview(), lesson)) scheduleLesson(lesson).catch(() => {});
}

export const LAST_EXERCISE_SIZE = 6;

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
