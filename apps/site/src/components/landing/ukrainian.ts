import { msg } from "@lingui/core/macro";
import type { HandCard } from "./hand-cards";
import { noun, phrase } from "./hand-cards";
import type { PathStep, VoiceWord } from "./japanese";
import type { StressPair } from "./StressPairs";

/**
 * The Ukrainian page's words. Terms are Ukrainian and never translated; meanings follow the page.
 * Each stressed form carries U+0301, as a card's Stress field does. The clips in
 * `/audio/ukrainian/` are the product's Ukrainian voice saying the marked form.
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
  language: "uk",
  term,
  stress,
  meaning,
  state,
  audio: `/audio/ukrainian/${id}.mp3`,
});

/** Learning words first, with their stress; the Known ones last, whose stress waits for the turn. */
export const UKRAINIAN_HAND: HandCard[] = [
  card("zamok-castle", "A1", "замок", "за́мок", msg`Castle`, "new"),
  card("zamok-lock", "A1", "замок", "замо́к", msg`Lock`, "learning"),
  card("doroha", "A1", "дорога", "доро́га", msg`Road`, "new"),
  card("nedilia", "A1", "неділя", "неді́ля", msg`Sunday`, "learning"),
  card("diakuiu", "A1", "дякую", "дя́кую", msg`Thank you`, "new", phrase),
  card("yabluko", "A1", "яблуко", "я́блуко", msg`Apple`, "learning"),
  card("voda", "A1", "вода", "вода́", msg`Water`, "known"),
  card("ranok", "A1", "ранок", "ра́нок", msg`Morning`, "known"),
  card("knyzhka", "A1", "книжка", "кни́жка", msg`Book`, "known"),
];

/** Sentences that use the front card's word, drawn faintly behind the hand; the word sits between asterisks. */
export const UKRAINIAN_EXAMPLES: Record<string, string[]> = {
  "zamok-castle": [
    "Стари́й *за́мок* на горі́.",
    "Цей *за́мок* ду́же стари́й.",
    "*За́мок* відкри́тий для тури́стів.",
  ],
  "zamok-lock": [
    "*Замо́к* на две́рях злама́вся.",
    "Я купи́в нови́й *замо́к*.",
    "Цей *замо́к* не відчиня́ється.",
  ],
  doroha: ["*Доро́га* веде́ до мі́ста.", "Ця *доро́га* ду́же до́вга.", "*Доро́га* додо́му займа́є годи́ну."],
  nedilia: [
    "*Неді́ля* — вихідни́й день.",
    "Насту́пна *неді́ля* бу́де те́плою.",
    "*Неді́ля* — мій улю́блений день.",
  ],
  diakuiu: ["*Дя́кую* за допомо́гу!", "*Дя́кую*, все до́бре.", "Ще раз *дя́кую*!"],
  yabluko: ["Я з'їв *я́блуко*.", "Це *я́блуко* ду́же соло́дке.", "Дай мені́ *я́блуко*, будь ла́ска."],
  voda: ["*Вода́* ду́же холо́дна.", "Де тут *вода́*?", "Ця *вода́* чи́ста."],
  ranok: ["До́брий *ра́нок*!", "*Ра́нок* був со́нячний.", "Ко́жен *ра́нок* я п'ю ка́ву."],
  knyzhka: ["Це моя́ *кни́жка*.", "*Кни́жка* лежи́ть на столі́.", "Ця *кни́жка* ду́же ціка́ва."],
};

/** Words that only their stress tells apart, each form with its clip. */
export const UKRAINIAN_PAIRS: StressPair[] = [
  {
    word: "замок",
    forms: [
      { marked: "за́мок", meaning: msg`Castle`, audio: "/audio/ukrainian/zamok-castle.mp3" },
      { marked: "замо́к", meaning: msg`Lock`, audio: "/audio/ukrainian/zamok-lock.mp3" },
    ],
  },
  {
    word: "брати",
    forms: [
      { marked: "бра́ти", meaning: msg`To take`, audio: "/audio/ukrainian/braty-take.mp3" },
      { marked: "брати́", meaning: msg`Brothers`, audio: "/audio/ukrainian/braty-brothers.mp3" },
    ],
  },
  {
    word: "дорога",
    forms: [
      { marked: "доро́га", meaning: msg`Road`, audio: "/audio/ukrainian/doroha.mp3" },
      {
        marked: "дорога́",
        meaning: msg`Dear (feminine)`,
        audio: "/audio/ukrainian/doroha-dear.mp3",
      },
    ],
  },
];

/** The order to take the beginner decks in, as Welcome offers them. */
export const UKRAINIAN_PATH: PathStep[] = [
  {
    slug: "ukrainian-alphabet",
    about: msg`All 33 letters and the apostrophe, then first words to read.`,
    words: [
      { term: "Ї ї", answer: "yi" },
      { term: "Є є", answer: "ye" },
      { term: "Ґ ґ", answer: "g" },
      { term: "ні", answer: msg`No` },
    ],
  },
  {
    slug: "ukrainian-a1-vocabulary",
    about: msg`People, food, time and your first verbs.`,
    words: [
      { term: "дя́кую", answer: msg`Thank you` },
      { term: "вода́", answer: msg`Water` },
      { term: "ра́нок", answer: msg`Morning` },
      { term: "кни́жка", answer: msg`Book` },
    ],
  },
  {
    slug: "ukrainian-a2-vocabulary",
    about: msg`Travel, health and opinions, once A1 feels easy.`,
    words: [
      { term: "по́дорож", answer: msg`Journey` },
      { term: "лі́кар", answer: msg`Doctor` },
      { term: "ду́мка", answer: msg`Opinion; thought` },
      { term: "квито́к", answer: msg`Ticket` },
    ],
  },
];

export const UKRAINIAN_VOICE_WORDS: VoiceWord[] = [
  { id: "zamok-castle", term: "за́мок", meaning: msg`Castle` },
  { id: "zamok-lock", term: "замо́к", meaning: msg`Lock` },
  { id: "diakuiu", term: "дя́кую", meaning: msg`Thank you` },
  { id: "nedilia", term: "неді́ля", meaning: msg`Sunday` },
  { id: "palianytsia", term: "паляни́ця", meaning: msg`A round loaf of bread` },
  { id: "budlaska", term: "будь ла́ска", meaning: msg`Please` },
];

/** A class deck's newest cards, as the owner added them after a lesson. */
export const UKRAINIAN_CLASS_CARDS = [
  { term: "по́дорож", meaning: msg`Journey` },
  { term: "квито́к", meaning: msg`Ticket` },
  { term: "вокза́л", meaning: msg`Train station` },
];
