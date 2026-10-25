import { msg } from "@lingui/core/macro";
import type { Example } from "./HandExamples";
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
export const UKRAINIAN_EXAMPLES: Record<string, Example[]> = {
  "zamok-castle": [
    { text: "Стари́й *за́мок* на горі́.", meaning: msg`The old *castle* on the hill.` },
    { text: "Цей *за́мок* ду́же стари́й.", meaning: msg`This *castle* is very old.` },
    { text: "*За́мок* відкри́тий для тури́стів.", meaning: msg`The *castle* is open to tourists.` },
  ],
  "zamok-lock": [
    { text: "*Замо́к* на две́рях злама́вся.", meaning: msg`The *lock* on the door is broken.` },
    { text: "Я купи́в нови́й *замо́к*.", meaning: msg`I bought a new *lock*.` },
    { text: "Цей *замо́к* не відчиня́ється.", meaning: msg`This *lock* won’t open.` },
  ],
  doroha: [
    { text: "*Доро́га* веде́ до мі́ста.", meaning: msg`The *road* leads to the city.` },
    { text: "Ця *доро́га* ду́же до́вга.", meaning: msg`This *road* is very long.` },
    { text: "*Доро́га* додо́му займа́є годи́ну.", meaning: msg`The *way* home takes an hour.` },
  ],
  nedilia: [
    { text: "*Неді́ля* — вихідни́й день.", meaning: msg`*Sunday* is a day off.` },
    { text: "Насту́пна *неді́ля* бу́де те́плою.", meaning: msg`Next *Sunday* will be warm.` },
    { text: "*Неді́ля* — мій улю́блений день.", meaning: msg`*Sunday* is my favourite day.` },
  ],
  diakuiu: [
    { text: "*Дя́кую* за допомо́гу!", meaning: msg`*Thanks* for your help!` },
    { text: "*Дя́кую*, все до́бре.", meaning: msg`*Thanks*, everything’s fine.` },
    { text: "Ще раз *дя́кую*!", meaning: msg`*Thanks* again!` },
  ],
  yabluko: [
    { text: "Я з'їв *я́блуко*.", meaning: msg`I ate an *apple*.` },
    { text: "Це *я́блуко* ду́же соло́дке.", meaning: msg`This *apple* is very sweet.` },
    { text: "Дай мені́ *я́блуко*, будь ла́ска.", meaning: msg`Give me an *apple*, please.` },
  ],
  voda: [
    { text: "*Вода́* ду́же холо́дна.", meaning: msg`The *water* is very cold.` },
    { text: "Де тут *вода́*?", meaning: msg`Where’s the *water*?` },
    { text: "Ця *вода́* чи́ста.", meaning: msg`This *water* is clean.` },
  ],
  ranok: [
    { text: "До́брий *ра́нок*!", meaning: msg`Good *morning*!` },
    { text: "*Ра́нок* був со́нячний.", meaning: msg`The *morning* was sunny.` },
    { text: "Ко́жен *ра́нок* я п'ю ка́ву.", meaning: msg`I drink coffee every *morning*.` },
  ],
  knyzhka: [
    { text: "Це моя́ *кни́жка*.", meaning: msg`This is my *book*.` },
    { text: "*Кни́жка* лежи́ть на столі́.", meaning: msg`The *book* is on the table.` },
    { text: "Ця *кни́жка* ду́же ціка́ва.", meaning: msg`This *book* is really interesting.` },
  ],
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
