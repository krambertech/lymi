import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { type Locale, localizedPath } from "../routes";

/** A lesson that is built has a slug, which is also its path; the rest are planned. */
export interface Lesson {
  slug?: string;
  /** The Estonian a learner can say after it, which is also its title in every locale. */
  et: string;
  /** What it teaches, in the page's language. */
  about: MessageDescriptor;
  minutes?: number;
  /** A built lesson's description for search and link previews. */
  blurb?: MessageDescriptor;
}

export interface Stage {
  name: MessageDescriptor;
  level: "A1" | "A2" | "B1";
  /** The hue of the stage's trays and marks. */
  hue: number;
  goal: MessageDescriptor;
  lessons: readonly Lesson[];
}

/** The course in order. docs/design/estonian-lessons.md explains the order. */
export const STAGES: readonly Stage[] = [
  {
    name: msg`First words`,
    level: "A1",
    hue: 222,
    goal: msg`Hear Estonian, count, tell the time, say who you are, tell people what to do and say where you are.`,
    lessons: [
      {
        slug: "haaldus",
        et: "Hääldus",
        about: msg`How Estonian sounds`,
        minutes: 10,
        blurb: msg`A free Estonian pronunciation lesson: the nine vowels with õ, ä, ö and ü, stress on the first syllable, and how a double letter changes a word. Every word is read aloud.`,
      },
      {
        slug: "numbrid",
        et: "Üks, kaks, kolm",
        about: msg`Numbers by ear`,
        minutes: 10,
        blurb: msg`A free lesson on Estonian numbers: zero to ten, -teist and -kümmend, hundreds and thousands, and numbers heard in prices, ages and phone numbers.`,
      },
      { et: "Mis kell on?", about: msg`Telling the time` },
      { et: "Esmaspäev, teisipäev", about: msg`Days of the week` },
      { et: "Mina, sina, tema", about: msg`I, you, he or she, and olema` },
      { et: "Ma loen", about: msg`Present tense endings` },
      { et: "Ei ole", about: msg`Saying no` },
      { et: "Istu! Ära istu!", about: msg`Telling someone what to do` },
      { et: "Kas? Mis? Kus?", about: msg`Asking questions` },
      { et: "Tallinnas, Tartus", about: msg`Where you are: -s and -l` },
    ],
  },
  {
    name: msg`Nouns start to change`,
    level: "A1",
    hue: 160,
    goal: msg`Own things, count them and put them somewhere. Stems change first, then the genitive, which most other cases build on.`,
    lessons: [
      { et: "Pood, poe", about: msg`Words that change inside` },
      { et: "Kolm põhivormi", about: msg`The three key forms of a noun` },
      { et: "Minu raamat", about: msg`Whose: the genitive` },
      { et: "Mul on", about: msg`Having and not having` },
      { et: "Kaks kassi", about: msg`Counting and “some”: the partitive` },
      { et: "Kassid", about: msg`More than one` },
      { et: "Kass ja kast", about: msg`Where things are` },
      { et: "Majas, majja, majast", about: msg`In, into, out of` },
      { et: "Laual, lauale, laualt", about: msg`On, onto, off` },
    ],
  },
  {
    name: msg`Doing things`,
    level: "A2",
    hue: 72,
    goal: msg`Say what you must, want and like to do, what you did yesterday, and with whom.`,
    lessons: [
      { et: "Lugema, lugeda, loen", about: msg`The three key forms of a verb` },
      { et: "Pean minema, tahan lugeda", about: msg`Which verbs take -ma, which take -da` },
      { et: "Mulle meeldib", about: msg`Liking and needing` },
      { et: "Lihtminevik", about: msg`Yesterday: the simple past` },
      { et: "Sõbraga, rahata", about: msg`With, without, until, as` },
      { et: "Suurem, kõige suurem", about: msg`Comparing` },
      { et: "Suures majas", about: msg`Adjectives that agree` },
      { et: "Esmaspäeval, aasta pärast", about: msg`On Monday, in a week: when things happen` },
      { et: "Arstiks", about: msg`Becoming something` },
    ],
  },
  {
    name: msg`The hard middle`,
    level: "A2",
    hue: 18,
    goal: msg`The rules that trip most learners up. You know every word by now, so only the rule is new.`,
    lessons: [
      { et: "Jalg, jala", about: msg`Consonants that soften: the full rule` },
      { et: "Raamatut või raamatu", about: msg`Whole or part: the object` },
      { et: "Olen lugenud", about: msg`Have done, had done` },
      { et: "Läheksin", about: msg`Would: the conditional` },
      { et: "Majades, raamatuid", about: msg`Plural cases` },
      { et: "Räägitakse", about: msg`Done by someone: the impersonal` },
      { et: "Lugedes, lugemata", about: msg`While doing, without doing` },
    ],
  },
  {
    name: msg`Reading real Estonian`,
    level: "B1",
    hue: 280,
    goal: msg`Read signs, news and forms, and join longer sentences.`,
    lessons: [
      { et: "Loetud raamat", about: msg`Participles` },
      { et: "Ära minema", about: msg`Particle verbs` },
      { et: "Et, sest, kui", about: msg`Joining sentences` },
      { et: "Raamat, mille ostsin", about: msg`The one that: relative clauses` },
      { et: "Ta olevat haige", about: msg`They say: reported speech` },
    ],
  },
];

export interface PlacedLesson extends Lesson {
  /** Its number in the course, from 1. */
  n: number;
  stage: Stage;
}

export const LESSONS: readonly PlacedLesson[] = STAGES.flatMap((stage) => stage.lessons).map(
  (lesson, i) => ({
    ...lesson,
    n: i + 1,
    stage: STAGES.find((s) => s.lessons.includes(lesson)) as Stage,
  }),
);

/** The slugs of the lessons that are built, which `/estonian/learn/[lesson]` renders. */
export const LESSON_SLUGS = LESSONS.flatMap((lesson) => (lesson.slug ? [lesson.slug] : []));

export function lessonBySlug(slug: string): PlacedLesson | undefined {
  return LESSONS.find((lesson) => lesson.slug === slug);
}

export function lessonPath(slug: string, locale: Locale | string): string {
  return `${localizedPath("learn", locale)}/${slug}`;
}

/** The lesson after this one, built or not. */
export function nextLesson(slug: string): PlacedLesson | undefined {
  const i = LESSONS.findIndex((lesson) => lesson.slug === slug);
  return i < 0 ? undefined : LESSONS[i + 1];
}
