import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { LocalizedPage } from "../../lib/routes";
import type { AssistantName } from "./AssistantMarks";
import type { Question } from "./faq";

export const ASSISTANT_KEYS = ["grok", "claude", "chatgpt", "gemini"] as const;
export type AssistantKey = (typeof ASSISTANT_KEYS)[number];

export interface AssistantPage {
  page: LocalizedPage;
  name: AssistantName;
  /** The tray hue the assistant has everywhere on the site, the homepage's stream included. */
  hue: number;
  /** The setup guide in the docs. */
  guide: string;
  /** Lymi's own listing in the assistant's directory, once it is published: one press adds it. */
  listing?: string | undefined;
  /** The search result's title and description. */
  title: MessageDescriptor;
  blurb: MessageDescriptor;
  /** How another assistant's page links here. */
  linkLabel: MessageDescriptor;
  /** Answered on the page and repeated in its structured data. */
  questions: readonly Question[];
}

export const ASSISTANT_PAGES: Record<AssistantKey, AssistantPage> = {
  grok: {
    page: "grokAssistant",
    name: "Grok",
    hue: 280,
    guide: "/docs/mcp/grok",
    title: msg`Grok flashcards with spaced repetition · Lymi`,
    blurb: msg`Connect Grok to Lymi and turn posts, articles and notes into flashcards. Lymi brings each card back just as it starts to fade. Free.`,
    linkLabel: msg`Lymi with Grok`,
    questions: [
      {
        id: "can",
        question: msg`Can Grok make flashcards?`,
        answer: msg`Grok will write flashcards in the chat, but it has no flashcard mode and nothing that brings a card back later. Connect Lymi and Grok adds its cards to your decks, where spaced repetition brings each one back just as it starts to fade.`,
      },
      {
        id: "language",
        question: msg`Can I learn a language with Grok and Lymi?`,
        answer: msg`Yes. Grok can read your decks, so it can hold a conversation built on the words you’re learning and save the new ones it teaches you as cards.`,
      },
      {
        id: "plans",
        question: msg`Which Grok plans can connect Lymi?`,
        answer: msg`Any plan that can add a custom connector at grok.com/connectors. xAI decides which plans can. On a business account, an admin may need to turn the connector on first.`,
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
    ],
  },
  claude: {
    page: "claudeAssistant",
    name: "Claude",
    hue: 25,
    guide: "/docs/mcp/claude",
    title: msg`Claude flashcards with spaced repetition · Lymi`,
    blurb: msg`Connect Claude to Lymi and turn PDFs, lecture notes and chats into flashcards. Lymi brings each card back just as it starts to fade. Free.`,
    linkLabel: msg`Lymi with Claude`,
    questions: [
      {
        id: "can",
        question: msg`Can Claude make flashcards?`,
        answer: msg`Yes. Claude writes good flashcards and can even build a quiz in an artifact. It has no deck that brings cards back on a schedule, so they stay in that chat. Connect Lymi and Claude adds them to your decks, where spaced repetition brings each one back just as it starts to fade.`,
      },
      {
        id: "free",
        question: msg`Does it work on Claude’s free plan?`,
        answer: msg`Yes. A free Claude account can add one custom connector, and Lymi can be that one. On Team and Enterprise, an owner adds Lymi once and everyone else connects to it.`,
      },
      {
        id: "anki",
        question: msg`Is this like an Anki MCP server?`,
        answer: msg`It does the same job without Anki running on your computer. Lymi is a remote connector, so it works on claude.ai, in the desktop app, on your phone and in Claude Code. If you have Anki decks, Lymi imports them.`,
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
    ],
  },
  chatgpt: {
    page: "chatgptAssistant",
    name: "ChatGPT",
    hue: 150,
    guide: "/docs/mcp/chatgpt",
    title: msg`ChatGPT flashcards with spaced repetition · Lymi`,
    blurb: msg`Connect ChatGPT to Lymi and turn photos of notes, textbook pages and chats into flashcards. Lymi brings each card back just as it starts to fade. Free.`,
    linkLabel: msg`Lymi with ChatGPT`,
    questions: [
      {
        id: "can",
        question: msg`Can ChatGPT make flashcards?`,
        answer: msg`Yes. ChatGPT makes flashcards you can flip, shuffle and mark as known. It doesn’t decide when you see each card again. Connect Lymi and the cards go to your decks, where spaced repetition brings each one back just as it starts to fade.`,
      },
      {
        id: "plans",
        question: msg`Which ChatGPT plans can connect Lymi?`,
        answer: msg`Any plan or workspace that can add a custom MCP server in ChatGPT. OpenAI decides which ones can, and Lymi’s setup guide links its current list.`,
      },
      {
        id: "anki",
        question: msg`Do I need to export the cards to Anki?`,
        answer: msg`No. ChatGPT adds the cards straight to Lymi, which schedules every review, in your browser and on your Mac. If you already have Anki decks, Lymi imports them.`,
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
    ],
  },
  gemini: {
    page: "geminiAssistant",
    name: "Gemini",
    hue: 235,
    guide: "/docs/mcp/gemini",
    title: msg`Gemini flashcards with spaced repetition · Lymi`,
    blurb: msg`Connect Gemini to Lymi and turn notes, documents and lectures into flashcards. Lymi brings each card back just as it starts to fade. Free.`,
    linkLabel: msg`Lymi with Gemini`,
    questions: [
      {
        id: "can",
        question: msg`Can Gemini make flashcards?`,
        answer: msg`Yes. Gemini makes flashcards and quizzes, and Gemini Notebook makes them from your sources. They don’t come back on a schedule. Connect Lymi and Gemini adds them to your decks, where spaced repetition brings each one back just as it starts to fade.`,
      },
      {
        id: "where",
        question: msg`Where does Lymi work with Gemini?`,
        answer: msg`In Gemini CLI, anywhere. In the Gemini app, Google opens custom apps only to personal accounts of adults in the US, in English, with Keep Activity on.`,
      },
      {
        id: "anki",
        question: msg`Can I move Gemini’s flashcards to Anki?`,
        answer: msg`You don’t need to. Ask a connected Gemini to save them to Lymi, which schedules every review. If you already have Anki decks, Lymi imports them.`,
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
    ],
  },
};
