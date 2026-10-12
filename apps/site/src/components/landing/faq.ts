import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";

export interface Question {
  id: string;
  question: MessageDescriptor;
  answer: MessageDescriptor;
  /** A page that answers the question in full, shown under the answer and left out of the schema. */
  link?: { href: string; label: MessageDescriptor };
}

/**
 * Plain strings rather than JSX so the page and its FAQPage schema read the same answer; a
 * structured-data answer that differs from the visible one is a rich-result violation.
 */
const COMMON: Question[] = [
  {
    id: "phone",
    question: msg`Does it work on my phone?`,
    answer: msg`Yes. Lymi runs in the browser on your phone and your computer, and you can add it to your home screen. Your cards and progress are the same on both.`,
  },
  {
    id: "cost",
    question: msg`What does it cost?`,
    answer: msg`Nothing. Lymi is free to use.`,
  },
];

export const LANGUAGES_QUESTIONS: Question[] = [
  {
    id: "which-languages",
    question: msg`Which languages can I learn?`,
    answer: msg`Any language you can type, in any script. Lymi can say most widely taught languages aloud.`,
  },
  {
    id: "ai",
    question: msg`Does the AI write my cards?`,
    answer: msg`Only when you ask your assistant to. Anything it writes on a card is marked AI, so you can always tell it from your own notes.`,
  },
  {
    id: "anki",
    question: msg`What if I already use Anki?`,
    answer: msg`Lymi schedules reviews with FSRS, an algorithm Anki also offers, so the timing will feel familiar. What changes is the work around it: a card takes seconds to add, and your assistant can add a whole lesson. Your Anki decks import with their cards, tags, pictures and review history, so nothing you already learned starts over.`,
    link: { href: "/docs/import-from-anki", label: msg`Moving from Anki` },
  },
  ...COMMON,
];

export const ESTONIAN_QUESTIONS: Question[] = [
  {
    id: "audio",
    question: msg`Can Lymi say Estonian words aloud?`,
    answer: msg`Yes. Press play on any card to hear it in Estonian.`,
  },
  {
    id: "letters",
    question: msg`Does it keep õ, ä, ö and ü apart?`,
    answer: msg`Yes. Every letter stays as you typed it, so tuli, fire, and tüli, a quarrel, are two different cards.`,
  },
  {
    id: "class",
    question: msg`Can my class use it together?`,
    answer: msg`Yes. Whoever makes the cards shares the deck’s join link, and everyone who joins gets each new card as it’s added.`,
  },
  ...COMMON,
];

export const ASSISTANTS_QUESTIONS: Question[] = [
  {
    id: "which",
    question: msg`Which assistants work?`,
    answer: msg`Claude, Claude Code, ChatGPT, Codex and Gemini CLI. Other apps that support MCP can connect too.`,
  },
  {
    id: "wrong",
    question: msg`What if it gets something wrong?`,
    answer: msg`Anything your assistant writes is marked AI on the card, so you can check it and fix it in Lymi.`,
  },
  {
    id: "privacy",
    question: msg`Does Lymi see my chats?`,
    answer: msg`No. Lymi only gets what your assistant sends it, like the cards it adds. The rest of the conversation stays with your assistant.`,
  },
  {
    id: "cost",
    question: msg`What does it cost?`,
    answer: msg`Nothing. Lymi is free to use.`,
  },
];

export const TEACHERS_QUESTIONS: Question[] = [
  {
    id: "edit",
    question: msg`Can learners change the deck?`,
    answer: msg`No. Only you add and edit cards. Learners review them, and each keeps their own schedule and history.`,
  },
  {
    id: "progress",
    question: msg`Can I see how each learner is doing?`,
    answer: msg`No. Each learner’s reviews stay private to them. Lymi is a place to practise, not to be graded.`,
  },
  {
    id: "subjects",
    question: msg`Is it only for languages?`,
    answer: msg`No. A card can hold anything worth remembering: a term, a date, a formula, a chord. Language cards can also be said aloud.`,
  },
  {
    id: "size",
    question: msg`Is it for schools?`,
    answer: msg`It’s made for tutors and small classes. There are no rosters, assignments or grades.`,
  },
];

const OFFLINE: Question = {
  id: "offline",
  question: msg`Can I review offline?`,
  answer: msg`Yes. Open Lymi once while you’re online, and after that you can review without a connection. Your answers are sent when you’re back online.`,
};

export const EXAMS_QUESTIONS: Question[] = [
  {
    id: "official",
    question: msg`Are these the official questions?`,
    answer: msg`For Germany, the US, Czechia and Spain, the decks follow the question list each exam publishes, named under the exam. Canada and the DMVs don’t publish their questions, so those decks are practice questions written from the official guide. Lymi isn’t affiliated with any exam authority and can’t promise a pass.`,
  },
  {
    id: "language",
    question: msg`Which language are the translations in?`,
    answer: msg`Questions and answers stay in the exam’s language. Each card adds a translation in English, Ukrainian or Russian: the language of the page you add the deck from.`,
  },
  OFFLINE,
  ...COMMON,
];

export const EINBUERGERUNGSTEST_QUESTIONS: Question[] = [
  {
    id: "cost",
    question: msg`Is it free?`,
    answer: msg`Yes. Adding the decks and reviewing them is free.`,
  },
  {
    id: "official",
    question: msg`Is it the official question set?`,
    answer: msg`The questions and answers are BAMF’s, from its catalogue of 7 May 2025, in German as they appear on the test. The translations and notes are Lymi’s. Lymi isn’t affiliated with BAMF and can’t promise a pass.`,
  },
  {
    id: "state",
    question: msg`Do I need my state’s deck?`,
    answer: msg`Yes. Three of the 33 questions are about the state where you’re registered, so add its 10 questions as well as the 300 general ones.`,
  },
  {
    id: "phone",
    question: msg`Does it work on my phone?`,
    answer: msg`Yes. Lymi runs in the browser on your phone and your computer, and you can add it to your home screen. Your cards and progress are the same on both.`,
  },
  OFFLINE,
];

const AI_MARKED: Question = {
  id: "ai",
  question: msg`Does the AI write my cards?`,
  answer: msg`Only when you ask your assistant to. Anything it writes on a card is marked AI, so you can always tell it from your own notes.`,
};

export const MEDICINE_QUESTIONS: Question[] = [
  {
    id: "anki",
    question: msg`Can I bring my Anki decks?`,
    answer: msg`Yes. An Anki package imports with its cards, tags, pictures and review history, so your schedule carries on where it stopped.`,
    link: { href: "/docs/import-from-anki", label: msg`Moving from Anki` },
  },
  {
    id: "pictures",
    question: msg`Can a card have a picture?`,
    answer: msg`Yes. A card can hold one picture, such as a diagram or a slide, and a review can ask from the picture instead of the words.`,
  },
  AI_MARKED,
  OFFLINE,
  ...COMMON,
];

export const CERTIFICATIONS_QUESTIONS: Question[] = [
  {
    id: "ready-decks",
    question: msg`Is there a ready-made deck for my certification?`,
    answer: msg`Not for most certifications yet. Your assistant can turn your study guide into a deck in a few minutes, and a deck from Anki or Mochi imports with its review history.`,
  },
  {
    id: "material",
    question: msg`Who can see the cards I make?`,
    answer: msg`Only you, unless you share the deck. Cards made from your study material stay in your account.`,
  },
  AI_MARKED,
  OFFLINE,
  ...COMMON,
];
