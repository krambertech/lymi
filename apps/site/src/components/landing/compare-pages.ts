import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { LocalizedPage } from "../../lib/routes";
import type { Question } from "./faq";

export const COMPARE_KEYS = ["anki", "quizlet", "mochi", "noji"] as const;
export type CompareKey = (typeof COMPARE_KEYS)[number];

export interface ComparePage {
  page: LocalizedPage;
  /** The other app's name, which is never translated. */
  name: string;
  /** Its App Store icon, shown beside Lymi's in the hero. */
  icon: string;
  /** The tray hue of the "Stay with it if" panel, near the app's own colour but never AI's violet. */
  hue: number;
  /** The import guide for files from this app. */
  guide: string;
  /** When the facts about the other app were last checked against its own pages. */
  checked: string;
  /** Where they were checked, named on the page under the table. */
  sources: readonly { label: string | MessageDescriptor; href: string }[];
  /** The search result's title and description. */
  title: MessageDescriptor;
  blurb: MessageDescriptor;
  /** Answered on the page and repeated in its structured data. */
  questions: readonly Question[];
}

const COST: Question = {
  id: "cost",
  question: msg`What does Lymi cost?`,
  answer: msg`Nothing. Lymi is free on the web, on your phone and on the Mac.`,
};

export const COMPARE_PAGES: Record<CompareKey, ComparePage> = {
  anki: {
    page: "compareAnki",
    name: "Anki",
    icon: "/apps/anki-512.jpg",
    hue: 235,
    guide: "/docs/import-from-anki",
    checked: "2026-11-17",
    sources: [
      { label: "apps.ankiweb.net", href: "https://apps.ankiweb.net" },
      { label: msg`the Anki manual`, href: "https://docs.ankiweb.net" },
      {
        label: msg`the App Store`,
        href: "https://apps.apple.com/app/ankimobile-flashcards/id373493387",
      },
    ],
    title: msg`Anki alternative: Lymi vs Anki, compared · Lymi`,
    blurb: msg`Lymi and Anki both schedule reviews with FSRS. See where each one is ahead, what Lymi does differently, and how to bring your Anki decks with their review history.`,
    questions: [
      {
        id: "history",
        question: msg`Will my review history come across?`,
        answer: msg`Yes, if you tick Include scheduling information when you export from Anki. Every past review arrives on its original day, and each card keeps its due date.`,
      },
      {
        id: "back",
        question: msg`Can I go back to Anki?`,
        answer: msg`Yes. Export any deck or your whole library from Lymi as an Anki package and open it in Anki.`,
      },
      {
        id: "yomitan",
        question: msg`I add words with Yomitan. Does that still work?`,
        answer: msg`Yes. Lymi answers Yomitan the way AnkiConnect does: point Yomitan at Lymi’s address with a key from Settings and keep looking words up.`,
      },
      {
        id: "cloze",
        question: msg`What happens to my cloze cards?`,
        answer: msg`Each gap becomes a card of its own, with the hidden word as the term and the sentence as its example. Image occlusion notes stay in Anki.`,
      },
      COST,
    ],
  },
  quizlet: {
    page: "compareQuizlet",
    name: "Quizlet",
    icon: "/apps/quizlet-512.jpg",
    hue: 250,
    guide: "/docs/import-from-quizlet",
    checked: "2026-11-17",
    sources: [
      { label: "quizlet.com", href: "https://quizlet.com/upgrade" },
      { label: msg`the Quizlet Help Center`, href: "https://help.quizlet.com" },
      {
        label: msg`the App Store`,
        href: "https://apps.apple.com/app/quizlet-more-than-flashcards/id546473125",
      },
    ],
    title: msg`Quizlet alternative: Lymi vs Quizlet, compared · Lymi`,
    blurb: msg`Quizlet helps you get through a set; Lymi’s spaced repetition helps you keep it. See where each one is ahead, and how to bring your Quizlet sets into Lymi.`,
    questions: [
      {
        id: "progress",
        question: msg`Will my Quizlet progress come across?`,
        answer: msg`No. Quizlet exports a set’s terms and definitions as text, so your cards start as new. Your first answers in Lymi show what you already know, and those cards come back less often.`,
      },
      {
        id: "others",
        question: msg`Can I bring a set someone else made?`,
        answer: msg`Quizlet only exports sets you created. Pictures and audio stay behind either way.`,
      },
      {
        id: "modes",
        question: msg`Does Lymi have Learn, Test or games?`,
        answer: msg`No. Lymi has one way to study: a card at a time, graded Forgot, Hard, Good or Easy, with spaced repetition choosing which cards come up each day.`,
      },
      COST,
    ],
  },
  mochi: {
    page: "compareMochi",
    name: "Mochi",
    icon: "/apps/mochi-512.jpg",
    hue: 130,
    guide: "/docs/import-from-mochi",
    checked: "2026-11-17",
    sources: [
      { label: "mochi.cards", href: "https://mochi.cards/pricing/" },
      { label: msg`the Mochi docs`, href: "https://mochi.cards/docs/" },
      { label: msg`its changelog`, href: "https://mochi.cards/changelog/" },
    ],
    title: msg`Mochi alternative: Lymi vs Mochi, compared · Lymi`,
    blurb: msg`Lymi and Mochi both run on spaced repetition. See where each one is ahead, what Lymi does differently, and how to bring your Mochi decks with their review history.`,
    questions: [
      {
        id: "history",
        question: msg`Will my review history come across?`,
        answer: msg`Yes, from a Mochi file. Every past review arrives on its original day, Remembered as Good and a forgotten card as Forgot, and each card keeps its due date. Markdown and CSV exports leave the history behind.`,
      },
      {
        id: "back",
        question: msg`Can I go back to Mochi?`,
        answer: msg`Yes. Export a deck from Lymi as an Anki package; Mochi imports it with its review history.`,
      },
      {
        id: "templates",
        question: msg`What happens to my templates?`,
        answer: msg`They stay in Mochi. A card’s first side becomes its term and the rest becomes its meaning, and its first picture comes along.`,
      },
      COST,
    ],
  },
  noji: {
    page: "compareNoji",
    name: "Noji",
    icon: "/apps/noji-512.jpg",
    hue: 215,
    guide: "/docs/import-from-noji",
    checked: "2026-11-17",
    sources: [
      { label: "noji.io", href: "https://noji.io" },
      { label: msg`the Noji help centre`, href: "https://help.noji.io" },
      {
        label: msg`the App Store`,
        href: "https://apps.apple.com/app/noji-flashcards-study-tool/id1573585542",
      },
    ],
    title: msg`Noji alternative: Lymi vs Noji, compared · Lymi`,
    blurb: msg`Noji, once AnkiPro, limits free study to 50 cards a day. See where Lymi and Noji are each ahead, and how to bring your Noji decks with their progress.`,
    questions: [
      {
        id: "anki",
        question: msg`Is Noji the same as Anki?`,
        answer: msg`No. Noji, called AnkiPro until 2025, is a separate app made by a different company. Anki’s own FAQ says it isn’t related to Anki.`,
      },
      {
        id: "progress",
        question: msg`Will my progress come across?`,
        answer: msg`Cards you’ve learned keep their due dates and come in as Known. Noji’s file doesn’t say when you reviewed them, so Insights starts your history from your first review in Lymi.`,
      },
      {
        id: "others",
        question: msg`Can I bring decks I added from Noji’s library?`,
        answer: msg`No. Noji only exports decks you made yourself, not ones you added from someone else or copied.`,
      },
      COST,
    ],
  },
};
