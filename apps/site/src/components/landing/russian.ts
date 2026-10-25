import { msg } from "@lingui/core/macro";
import type { Example } from "./HandExamples";
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
export const RUSSIAN_EXAMPLES: Record<string, Example[]> = {
  "zamok-castle": [
    { text: "Ста́рый *за́мок* стои́т на холме́.", meaning: msg`An old *castle* stands on the hill.` },
    { text: "Э́тот *за́мок* о́чень ста́рый.", meaning: msg`This *castle* is very old.` },
    { text: "*За́мок* откры́т для тури́стов.", meaning: msg`The *castle* is open to tourists.` },
  ],
  "zamok-lock": [
    { text: "*Замо́к* опя́ть слома́лся.", meaning: msg`The *lock* is broken again.` },
    { text: "Я купи́л но́вый *замо́к*.", meaning: msg`I bought a new *lock*.` },
    { text: "Э́тот *замо́к* не открыва́ется.", meaning: msg`This *lock* won’t open.` },
  ],
  muka: [
    { text: "*Мука́* на ве́рхней по́лке.", meaning: msg`The *flour* is on the top shelf.` },
    { text: "Для блино́в нужна́ *мука́*.", meaning: msg`You need *flour* for pancakes.` },
    { text: "Где здесь *мука́*?", meaning: msg`Where’s the *flour*?` },
  ],
  spasibo: [
    { text: "*Спаси́бо* за по́мощь!", meaning: msg`*Thanks* for your help!` },
    { text: "*Спаси́бо*, всё хорошо́.", meaning: msg`*Thanks*, everything’s fine.` },
    { text: "Большо́е *спаси́бо*!", meaning: msg`*Thank you* so much!` },
  ],
  yozhik: [
    { text: "*Ёжик* спит под кусто́м.", meaning: msg`The *hedgehog* is asleep under a bush.` },
    { text: "В лесу́ живёт *ёжик*.", meaning: msg`A *hedgehog* lives in the forest.` },
    { text: "Како́й ма́ленький *ёжик*!", meaning: msg`What a little *hedgehog*!` },
  ],
  moloko: [
    { text: "Я пью *молоко́* у́тром.", meaning: msg`I drink *milk* in the morning.` },
    { text: "*Молоко́* в холоди́льнике.", meaning: msg`The *milk* is in the fridge.` },
    { text: "Э́то *молоко́* све́жее.", meaning: msg`This *milk* is fresh.` },
  ],
  voda: [
    { text: "*Вода́* о́чень холо́дная.", meaning: msg`The *water* is very cold.` },
    { text: "Где здесь *вода́*?", meaning: msg`Where’s the *water*?` },
    { text: "Э́та *вода́* чи́стая.", meaning: msg`This *water* is clean.` },
  ],
  utro: [
    { text: "До́брое *у́тро*!", meaning: msg`Good *morning*!` },
    { text: "*У́тро* бы́ло со́лнечным.", meaning: msg`The *morning* was sunny.` },
    { text: "Ка́ждое *у́тро* я пью ко́фе.", meaning: msg`I drink coffee every *morning*.` },
  ],
  kniga: [
    { text: "Э́то моя́ *кни́га*.", meaning: msg`This is my *book*.` },
    { text: "*Кни́га* лежи́т на столе́.", meaning: msg`The *book* is on the table.` },
    { text: "Э́та *кни́га* о́чень интере́сная.", meaning: msg`This *book* is really interesting.` },
  ],
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
      {
        marked: "мука́",
        meaning: msg({ message: "Flour", context: "мука́, for baking" }),
        audio: "/audio/russian/muka.mp3",
      },
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
  { id: "zdravstvuyte", term: "здра́вствуйте", meaning: msg`Hello (formal)` },
  { id: "moloko", term: "молоко́", meaning: msg`Milk` },
];

/** A class deck's newest cards, as the owner added them after a lesson. */
export const RUSSIAN_CLASS_CARDS = [
  { term: "биле́т", meaning: msg`Ticket` },
  { term: "вокза́л", meaning: msg`Train station` },
  { term: "по́езд", meaning: msg`Train` },
];
