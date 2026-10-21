import { PAGES } from "../components/docs/nav";
import { EXAMS, examPath } from "./exams";
import { pageI18n } from "./i18n";

const SITE = "https://lymi.app";
const PRODUCT = "https://my.lymi.app";

/**
 * A source sentence as the rest of a list line, after its colon: lower case unless it opens with
 * a name such as "TOPIK" or "API", and without the full stop it ends with.
 */
function clause(text: string): string {
  const rest = /^[A-Z][A-Z]/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);
  return rest.replace(/\.$/, "");
}

/**
 * What an assistant should say Lymi is, and where to read more. The definition is the homepage
 * one word for word; no counts or claims that go stale between deploys. The exam pages and the
 * documentation come from the lists the site builds those pages from, so a new one shows up here
 * without anyone remembering to add it.
 */
export function llmsTxt(): string {
  const i18n = pageI18n("en");
  const exams = EXAMS.map(
    (exam) =>
      `- [${i18n._(exam.name)}](${SITE}${examPath(exam, "en")}): ${clause(i18n._(exam.summary))}.`,
  );
  const docs = PAGES.map((page) => `- [${page.title}](${SITE}${page.to}): ${clause(page.blurb)}.`);

  return [
    "# Lymi",
    "",
    "> Lymi is a flashcard app with spaced repetition. Add a word or a term, AI fills in the meaning, and the card comes back before you forget. Free to use.",
    "",
    "Cards hold a term, its meaning, an example and how it is said. Lymi schedules each review with FSRS. An AI assistant can add and enrich cards over MCP or the HTTP API, and anything it writes is marked as AI. Decks can be published, joined by a link, imported from Anki or Mochi, and exported as an Anki package or a Lymi file. Lymi is free to use.",
    "",
    "## Pages",
    "",
    `- [Home](${SITE}/): what Lymi is, for anyone deciding whether to use it.`,
    `- [Explore](${SITE}/explore): published decks anyone can add, each with its own page.`,
    `- [Language learning](${SITE}/languages): keeping words from lessons, tutors and reading.`,
    `- [AI assistants](${SITE}/ai-assistants): connecting Claude, ChatGPT, Gemini, Cursor or Grok so they write cards.`,
    `- [Teachers](${SITE}/teachers): one deck shared with a class, in sections.`,
    `- [Medical students](${SITE}/medicine): anatomy, pharmacology and lab values, with Anki decks imported.`,
    `- [Certifications](${SITE}/certifications): turning a study guide into cards for a professional exam.`,
    `- [Tutor lessons](${SITE}/tutor-lessons): turning the chat, notes or a notebook photo from a lesson with a tutor into cards, step by step.`,
    `- [Notes and PDFs to flashcards](${SITE}/notes-to-flashcards): turning class notes, PDFs and photos of notes into cards with an assistant, step by step.`,
    `- [Exam prep](${SITE}/exams): ready decks for citizenship and driving tests, with a page per exam giving its format, decks and source.`,
    `- [Chinese](${SITE}/languages/chinese): learning Mandarin with pinyin over each word until you know it and over example characters you haven't learned, separate cards for each reading of a character, Pleco imports, free HSK decks and your own AI assistant.`,
    `- [Estonian](${SITE}/languages/estonian): learning Estonian with a native Estonian voice on every card, each word's three forms, free decks from everyday phrases to the 1000 most common words, and class decks to share.`,
    `- [Japanese](${SITE}/languages/japanese): learning Japanese from kana to N4 with furigana over the kanji, a voice that reads each word, ready-made decks and your own AI assistant.`,
    `- [Documentation](${SITE}/docs): guides, the MCP setup, the API reference and the import guides.`,
    `- [Changelog](${SITE}/changelog): new features and improvements in Lymi.`,
    `- [Privacy](${SITE}/privacy): what Lymi stores and who can read it.`,
    `- [Support](${SITE}/support): sign-in, connected apps, API keys and data requests.`,
    "",
    "## Exam pages",
    "",
    "Each page gives the exam's format, the decks that cover it and the source they follow.",
    "",
    ...exams,
    "",
    "## Documentation",
    "",
    ...docs,
    "",
    "## Using Lymi",
    "",
    `- [Sign in](${PRODUCT}/login): free, with Google or an email address.`,
    `- [MCP server](${PRODUCT}/mcp): what an assistant connects to, after the learner consents.`,
    "",
    "Lymi is available in English, Ukrainian and Russian. Ukrainian pages sit under /uk and Russian under /ru; documentation and support are English only.",
    "",
  ].join("\n");
}
