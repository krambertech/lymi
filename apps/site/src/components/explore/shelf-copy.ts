import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { ShelfRoute } from "../../lib/explore";
import type { Question } from "../landing/faq";

/**
 * A shelf page's words. Every shelf gets the template, filled with its own name; a shelf worth
 * writing for gets its own lede, about text and questions, which replace the template's and are
 * translated like any other message. `docs/design/explore.md`, "Shelf pages".
 */
export interface ShelfCopy {
  title: string;
  /** The document title, the page's name and Lymi's. */
  pageTitle: string;
  aboutHeading: string;
  lede: string;
  about: string[];
  questions: Question[];
}

interface Written {
  title?: MessageDescriptor;
  lede: MessageDescriptor;
  about: MessageDescriptor[];
  questions: Question[];
}

const WRITTEN: Record<string, Written> = {
  "languages/german": {
    lede: msg`For a trip, your first lessons, or the Goethe A1 to B1 word lists.`,
    about: [
      msg`Every noun carries der, die or das, and the notes add the plural, so the article is learnt with the word rather than after it.`,
      msg`The A1, A2 and B1 decks are checked against the Goethe-Zertifikat word lists for their level. They follow those levels; they are not official or complete exam lists.`,
    ],
    questions: [
      {
        id: "goethe",
        question: msg`Do the words match the Goethe exams?`,
        answer: msg`The A1, A2 and B1 decks are checked against the Goethe-Zertifikat word list for each level, but they aren’t official or complete lists.`,
      },
    ],
  },
  "languages/japanese": {
    lede: msg`For reading kana, a first trip, and JLPT N5 and N4 vocabulary.`,
    about: [
      msg`Read Japanese Kana covers hiragana and katakana, including voiced and combined sounds, the small tsu and the long-vowel mark.`,
      msg`The JLPT has published no official word list since 2010, so the N5 and N4 decks follow their level from widely used study lists. Neither is an official list.`,
    ],
    questions: [
      {
        id: "kana",
        question: msg`Do I need to read kana first?`,
        answer: msg`It helps. Read Japanese Kana teaches hiragana and katakana, and the other decks are easier once you can read them.`,
      },
    ],
  },
  "subjects/citizenship": {
    title: msg`Citizenship test flashcards`,
    lede: msg`For the German, US, Spanish, Czech and Canadian citizenship tests, with the answers and a short note on each.`,
    about: [
      msg`The German, Spanish and Czech decks keep questions and answers in the exam’s language, as the exam does; the notes add an English translation and a short explanation.`,
      msg`Germany’s test asks 300 general questions and 10 about your state. The general questions are one deck, and each state’s 10 are a small deck of their own, so you add only yours.`,
    ],
    questions: [
      {
        id: "official",
        question: msg`Are these the official questions?`,
        answer: msg`Germany’s come from the BAMF catalogue, the US deck has all 128 civics questions of the 2025 version, Spain’s follow the 2026 CCSE manual and Czechia’s the official NPI ČR bank. Canada’s are Lymi’s own questions on every chapter of Discover Canada, not IRCC’s.`,
      },
      {
        id: "state",
        question: msg`Does the German deck include my state’s questions?`,
        answer: msg`No. Add the Leben in Deutschland deck for the 300 general questions and your state’s deck for its 10.`,
      },
    ],
  },
};

/** The questions every shelf page answers, after any the shelf has of its own. */
function commonQuestions(language: boolean): Question[] {
  return [
    language
      ? {
          id: "start",
          question: msg`Where should I start?`,
          answer: msg`With the deck that fits why you’re learning, such as a trip or your first lessons. You can add more than one, and Lymi mixes their cards into one daily review.`,
        }
      : {
          id: "start",
          question: msg`Which deck should I add?`,
          answer: msg`The one that matches your test or topic. You can add more than one, and Lymi mixes their cards into one daily review.`,
        },
    {
      id: "free",
      question: msg`Are the decks free?`,
      answer: msg`Yes. You can add a deck and learn it for free.`,
    },
    {
      id: "schedule",
      question: msg`How does Lymi decide when to show a card again?`,
      answer: msg`It schedules every card with spaced repetition and brings it back right before you’d forget it.`,
    },
    {
      id: "phone",
      question: msg`Does it work on my phone?`,
      answer: msg`Yes. Lymi runs in the browser on your phone and your computer, and you can add it to your home screen. Your cards and progress are the same on both.`,
    },
  ];
}

export function shelfCopy(i18n: I18n, route: ShelfRoute, name: string): ShelfCopy {
  const written = WRITTEN[`${route.kind}/${route.name}`];
  const language = route.kind === "languages";
  const title = written?.title
    ? i18n._(written.title)
    : language
      ? i18n._(msg`${name} flashcards`)
      : i18n._(msg({ message: `${name} flashcards`, context: "subject shelf" }));
  return {
    title,
    pageTitle: i18n._(msg`${title} · Lymi`),
    aboutHeading: language
      ? i18n._(msg`Learning ${name} with Lymi`)
      : i18n._(msg`About these decks`),
    lede: written
      ? i18n._(written.lede)
      : language
        ? i18n._(
            msg`Ready-made decks for learning ${name}, written by a person and checked card by card.`,
          )
        : i18n._(
            msg({
              message: `Ready-made ${name} decks, written by a person and checked card by card.`,
              context: "subject shelf",
            }),
          ),
    about: written
      ? written.about.map((paragraph) => i18n._(paragraph))
      : [
          i18n._(
            msg`Each deck opens on its own page with every card on it, so you can see what you would learn before you add it.`,
          ),
          i18n._(
            msg`Once a deck is in your Lymi, it brings each card back right before you’d forget it, a few minutes a day.`,
          ),
        ],
    questions: [...(written?.questions ?? []), ...commonQuestions(language)],
  };
}
