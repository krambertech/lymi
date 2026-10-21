import { msg } from "@lingui/core/macro";
import type { HandCard } from "./hand-cards";
import { noun, phrase } from "./hand-cards";
import type { PathStep, VoiceWord } from "./japanese";
import type { StressPair } from "./StressPairs";

/**
 * The Russian page's words. Terms are Russian and never translated; meanings follow the page.
 * Each stressed form carries U+0301, as a card's Stress field does, and ёжик shows the ё that
 * print writes as е. The clips in `/audio/russian/` are the product's Russian voice saying the
 * marked form.
 */

const card = (
  id: string,
  source: string,
  term: string,
  stress: string,
  meaning: HandCard["meaning"],
  state: HandCard["state"],
  kind = noun,
): HandCard => ({
  id,
  source,
  kind,
  language: "ru",
  term,
  stress,
  meaning,
  state,
  audio: `/audio/russian/${id}.mp3`,
});

/** Learning words first, with their stress; the Known ones last, whose stress waits for the turn. */
export const RUSSIAN_HAND: HandCard[] = [
  card("zamok-castle", "A1", "замок", "за́мок", msg`Castle`, "new"),
  card("zamok-lock", "A1", "замок", "замо́к", msg`Lock`, "learning"),
  card("muka", "A1", "мука", "мука́", msg`Flour`, "new"),
  card("spasibo", "A1", "спасибо", "спаси́бо", msg`Thank you`, "learning", phrase),
  card("yozhik", "A1", "ежик", "ёжик", msg`Hedgehog`, "new"),
  card("moloko", "A1", "молоко", "молоко́", msg`Milk`, "learning"),
  card("voda", "A1", "вода", "вода́", msg`Water`, "known"),
  card("utro", "A1", "утро", "у́тро", msg`Morning`, "known"),
  card("kniga", "A1", "книга", "кни́га", msg`Book`, "known"),
];

/** Sentences that use the front card's word, drawn faintly behind the hand; the word sits between asterisks. */
export const RUSSIAN_EXAMPLES: Record<string, string[]> = {
  "zamok-castle": [
    "Ста́рый *за́мок* стои́т на холме́.",
    "Э́тот *за́мок* о́чень ста́рый.",
    "*За́мок* откры́т для тури́стов.",
  ],
  "zamok-lock": [
    "*Замо́к* опя́ть слома́лся.",
    "Я купи́л но́вый *замо́к*.",
    "Э́тот *замо́к* не открыва́ется.",
  ],
  muka: ["*Мука́* на ве́рхней по́лке.", "Для блино́в нужна́ *мука́*.", "Где здесь *мука́*?"],
  spasibo: ["*Спаси́бо* за по́мощь!", "*Спаси́бо*, всё хорошо́.", "Большо́е *спаси́бо*!"],
  yozhik: ["*Ёжик* спит под кусто́м.", "В лесу́ живёт *ёжик*.", "Како́й ма́ленький *ёжик*!"],
  moloko: ["Я пью *молоко́* у́тром.", "*Молоко́* в холоди́льнике.", "Э́то *молоко́* све́жее."],
  voda: ["*Вода́* о́чень холо́дная.", "Где здесь *вода́*?", "Э́та *вода́* чи́стая."],
  utro: ["До́брое *у́тро*!", "*У́тро* бы́ло со́лнечным.", "Ка́ждое *у́тро* я пью ко́фе."],
  kniga: ["Э́то моя́ *кни́га*.", "*Кни́га* лежи́т на столе́.", "Э́та *кни́га* о́чень интере́сная."],
};

/** Words that only their stress tells apart, each form with its clip. */
export const RUSSIAN_PAIRS: StressPair[] = [
  {
    word: "замок",
    forms: [
      { marked: "за́мок", meaning: msg`Castle`, audio: "/audio/russian/zamok-castle.mp3" },
      { marked: "замо́к", meaning: msg`Lock`, audio: "/audio/russian/zamok-lock.mp3" },
    ],
  },
  {
    word: "мука",
    forms: [
      { marked: "му́ка", meaning: msg`Torment`, audio: "/audio/russian/muka-torment.mp3" },
      { marked: "мука́", meaning: msg`Flour`, audio: "/audio/russian/muka.mp3" },
    ],
  },
  {
    word: "плачу",
    forms: [
      { marked: "пла́чу", meaning: msg`I cry`, audio: "/audio/russian/plachu-cry.mp3" },
      { marked: "плачу́", meaning: msg`I pay`, audio: "/audio/russian/plachu-pay.mp3" },
    ],
  },
];

/** The order to take the beginner decks in, as Welcome offers them. */
export const RUSSIAN_PATH: PathStep[] = [
  {
    slug: "russian-alphabet",
    about: msg`All 33 letters, then first words to read.`,
    words: [
      { term: "Ё ё", answer: "yo" },
      { term: "Ы ы", answer: "y" },
      { term: "Щ щ", answer: "shch" },
      { term: "да", answer: msg`Yes` },
    ],
  },
  {
    slug: "russian-a1-vocabulary",
    about: msg`People, food, time and your first verbs.`,
    words: [
      { term: "спаси́бо", answer: msg`Thank you` },
      { term: "молоко́", answer: msg`Milk` },
      { term: "у́тро", answer: msg`Morning` },
      { term: "рабо́тать", answer: msg`To work` },
    ],
  },
  {
    slug: "core-russian-words",
    about: msg`The small words every sentence is built from.`,
    words: [
      { term: "то́лько", answer: msg`Only` },
      { term: "е́сли", answer: msg`If` },
      { term: "сказа́ть", answer: msg`To say` },
      { term: "сло́во", answer: msg`Word` },
    ],
  },
];

export const RUSSIAN_VOICE_WORDS: VoiceWord[] = [
  { id: "zamok-castle", term: "за́мок", meaning: msg`Castle` },
  { id: "zamok-lock", term: "замо́к", meaning: msg`Lock` },
  { id: "spasibo", term: "спаси́бо", meaning: msg`Thank you` },
  { id: "pozhaluysta", term: "пожа́луйста", meaning: msg`Please` },
  { id: "zdravstvuyte", term: "здра́вствуйте", meaning: msg`Hello` },
  { id: "moloko", term: "молоко́", meaning: msg`Milk` },
];

/** A class deck's newest cards, as the owner added them after a lesson. */
export const RUSSIAN_CLASS_CARDS = [
  { term: "биле́т", meaning: msg`Ticket` },
  { term: "вокза́л", meaning: msg`Train station` },
  { term: "по́езд", meaning: msg`Train` },
];
