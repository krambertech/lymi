import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { type Locale, localizedPath } from "../routes";

interface LessonBase {
  /** The topic in plain words, as people search for it: the lesson's name in lists and links. */
  name: MessageDescriptor;
  /** An Estonian phrase from the lesson, the same in every locale, shown beside the name. */
  et: string;
}

/** A built lesson: its slug is also its path, and its title leads its page and search result. */
export interface BuiltLesson extends LessonBase {
  slug: string;
  /** The heading and search title, with “Estonian” in it, such as “Estonian pronunciation”. */
  title: MessageDescriptor;
  minutes: number;
  /** The description for search and link previews. */
  blurb: MessageDescriptor;
}

/** A lesson that is planned but not built. */
export interface PlannedLesson extends LessonBase {
  slug?: undefined;
  title?: undefined;
  minutes?: undefined;
  blurb?: undefined;
}

export type Lesson = BuiltLesson | PlannedLesson;

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
    name: msg`The basics`,
    level: "A1",
    hue: 222,
    goal: msg`Say who you are, what you do and where you live, and ask and answer. Then count, tell the time, name the day and tell people what to do.`,
    lessons: [
      {
        slug: "haaldus",
        name: msg`Pronunciation`,
        title: msg`Estonian pronunciation`,
        et: "Hääldus",
        minutes: 10,
        blurb: msg`A free Estonian pronunciation lesson: the nine vowels with õ, ä, ö and ü, stress on the first syllable, and how a double letter changes a word. Every word is read aloud.`,
      },
      {
        slug: "mina-sina-tema",
        name: msg`Personal pronouns and “to be”`,
        title: msg`Estonian personal pronouns and “to be”`,
        et: "Mina, sina, tema",
        minutes: 10,
        blurb: msg`A free Estonian lesson on personal pronouns: mina, sina, tema and the rest in their long and short forms, and the verb olema, to be. Every sentence is read aloud.`,
      },
      {
        slug: "olevik",
        name: msg`Present tense`,
        title: msg`Estonian present tense`,
        et: "Ma loen",
        minutes: 10,
        blurb: msg`A free lesson on Estonian verbs in the present tense: the -ma form, the stem, and the six endings -n, -d, -b, -me, -te and -vad on ten everyday verbs. Every sentence is read aloud.`,
      },
      {
        slug: "eitus",
        name: msg`Negation`,
        title: msg`How to say no in Estonian`,
        et: "Ei ole",
        minutes: 8,
        blurb: msg`A free lesson on Estonian negation in the present tense: ei before the verb, the same for every person, ei ole and pole, and how to answer a question with no. Every sentence is read aloud.`,
      },
      {
        slug: "kusimused",
        name: msg`Questions`,
        title: msg`Asking questions in Estonian`,
        et: "Kas? Mis? Kus?",
        minutes: 10,
        blurb: msg`A free lesson on Estonian questions: kas for yes or no, answers with jah and ei, the question words kes, mis, kus, millal, miks, kuidas and kui palju, and three everyday questions to learn whole. Every sentence is read aloud.`,
      },
      {
        slug: "kohad",
        name: msg`Saying where: -s and -l`,
        title: msg`In, on and at in Estonian: -s and -l`,
        et: "Tallinnas, Tartus",
        minutes: 8,
        blurb: msg`A free lesson on saying where you are in Estonian: -s for in (Tallinnas, koolis), -l for on and at (laual, tööl), which places take which, and how to answer kus, “where”. Every sentence is read aloud.`,
      },
      {
        slug: "numbrid",
        name: msg`Numbers`,
        title: msg`Estonian numbers`,
        et: "Üks, kaks, kolm",
        minutes: 10,
        blurb: msg`A free lesson on Estonian numbers: zero to ten, -teist and -kümmend, hundreds and thousands, and numbers heard in prices, ages and phone numbers. Every number is read aloud.`,
      },
      {
        slug: "kell",
        name: msg`Telling the time`,
        title: msg`Telling the time in Estonian`,
        et: "Mis kell on?",
        minutes: 12,
        blurb: msg`A free Estonian lesson on telling the time: full hours, pool, veerand and kolmveerand, which name the hour that’s coming, and minutes past and to. Every time is read aloud.`,
      },
      {
        slug: "paevad",
        name: msg`Days of the week`,
        title: msg`Days of the week in Estonian`,
        et: "Esmaspäev, teisipäev",
        minutes: 8,
        blurb: msg`A free lesson on the Estonian days of the week: the seven names, the four with numbers in them, the one-letter days on opening hours, and täna, homme and eile. Every word is read aloud.`,
      },
      {
        slug: "kaskiv",
        name: msg`Commands`,
        title: msg`Estonian imperative: giving commands`,
        et: "Istu! Ära istu!",
        minutes: 10,
        blurb: msg`A free lesson on the Estonian imperative: the verb’s stem as a command (loe!, istu!, tule siia!), ära for don’t, the -ge and -ke forms for more than one person or polite you, everyday commands such as räägi aeglasemalt, palun, and a short conversation at a café. Every sentence is read aloud.`,
      },
    ],
  },
  {
    name: msg`Nouns and cases`,
    level: "A1",
    hue: 160,
    goal: msg`Own things, count them and put them somewhere. Stems change first, then the genitive, which most other cases build on.`,
    lessons: [
      { name: msg`Stem changes`, et: "Pood, poe" },
      { name: msg`The three forms of a noun`, et: "Kolm põhivormi" },
      { name: msg`The genitive case`, et: "Minu raamat" },
      { name: msg`“To have”`, et: "Mul on" },
      { name: msg`The partitive case`, et: "Kaks kassi" },
      { name: msg`Plural`, et: "Kassid" },
      { name: msg`Place words: on, under, behind`, et: "Kass ja kast" },
      { name: msg`In, into, out of`, et: "Majas, majja, majast" },
      { name: msg`On, onto, off`, et: "Laual, lauale, laualt" },
    ],
  },
  {
    name: msg`Verbs and more cases`,
    level: "A2",
    hue: 72,
    goal: msg`Say what you must, want and like to do, what you did yesterday, and with whom.`,
    lessons: [
      { name: msg`The three forms of a verb`, et: "Lugema, lugeda, loen" },
      { name: msg`Infinitives: -ma and -da`, et: "Pean minema, tahan lugeda" },
      { name: msg`“To like”`, et: "Mulle meeldib" },
      { name: msg`Past tense`, et: "Lihtminevik" },
      { name: msg`With, without, until, as`, et: "Sõbraga, rahata" },
      { name: msg`Comparatives and superlatives`, et: "Suurem, kõige suurem" },
      { name: msg`Adjective agreement`, et: "Suures majas" },
      { name: msg`Time expressions: when things happen`, et: "Esmaspäeval, aasta pärast" },
      { name: msg`The translative case`, et: "Arstiks" },
    ],
  },
  {
    name: msg`Harder grammar`,
    level: "A2",
    hue: 18,
    goal: msg`The rules that trip most learners up. You know every word by now, so only the rule is new.`,
    lessons: [
      { name: msg`Consonant gradation`, et: "Jalg, jala" },
      { name: msg`The object: whole or part`, et: "Raamatut või raamatu" },
      { name: msg`Perfect tenses`, et: "Olen lugenud" },
      { name: msg`Conditional mood`, et: "Läheksin" },
      { name: msg`Plural cases`, et: "Majades, raamatuid" },
      { name: msg`Impersonal voice`, et: "Räägitakse" },
      { name: msg`The -des and -mata forms`, et: "Lugedes, lugemata" },
    ],
  },
  {
    name: msg`Longer sentences`,
    level: "B1",
    hue: 280,
    goal: msg`Read signs, news and forms, and join longer sentences.`,
    lessons: [
      { name: msg`Participles`, et: "Loetud raamat" },
      { name: msg`Particle verbs`, et: "Ära minema" },
      { name: msg`Conjunctions and word order`, et: "Et, sest, kui" },
      { name: msg`Relative clauses`, et: "Raamat, mille ostsin" },
      { name: msg`Reported speech`, et: "Ta olevat haige" },
    ],
  },
];

/** A built lesson's page title in search results, before “· Lymi”. */
export const LESSON_PAGE_TITLE = msg({ message: "{title}: a free lesson with audio" });

/** A lesson with its number in the course, from 1, and its stage. */
export type PlacedLesson = Lesson & { n: number; stage: Stage };

export const LESSONS: readonly PlacedLesson[] = STAGES.flatMap((stage) => stage.lessons).map(
  (lesson, i) => ({
    ...lesson,
    n: i + 1,
    stage: STAGES.find((s) => s.lessons.includes(lesson)) as Stage,
  }),
);

/** The slugs of the lessons that are built, which `/estonian/learn/[lesson]` renders. */
export const LESSON_SLUGS = LESSONS.flatMap((lesson) => (lesson.slug ? [lesson.slug] : []));

export function lessonBySlug(slug: string): (PlacedLesson & BuiltLesson) | undefined {
  return LESSONS.find((lesson): lesson is PlacedLesson & BuiltLesson => lesson.slug === slug);
}

export function lessonPath(slug: string, locale: Locale | string): string {
  return `${localizedPath("learn", locale)}/${slug}`;
}

/** The built lesson before this one. */
export function previousLesson(slug: string): (PlacedLesson & BuiltLesson) | undefined {
  const i = LESSONS.findIndex((lesson) => lesson.slug === slug);
  const before = i > 0 ? LESSONS[i - 1] : undefined;
  return before?.slug ? (before as PlacedLesson & BuiltLesson) : undefined;
}

/** The lesson after this one, built or not. */
export function nextLesson(slug: string): PlacedLesson | undefined {
  const i = LESSONS.findIndex((lesson) => lesson.slug === slug);
  return i < 0 ? undefined : LESSONS[i + 1];
}
