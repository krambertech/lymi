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
