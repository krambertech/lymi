import { msg } from "@lingui/core/macro";
import type { Locale } from "../../lib/routes";
import type { GenderGroup } from "./GenderTiles";
import type { Example } from "./HandExamples";
import type { HandCard } from "./hand-cards";
import { noun, word } from "./hand-cards";
import type { PathStep, VoiceWord } from "./japanese";
import type { EditionWord } from "./language-decks";

/**
 * The German page's words. Terms are German and never translated. Meanings are the published
 * decks' own, one per edition, so each locale reads its edition rather than a translation of the
 * English one. The clips in `/audio/german/` are the published decks' own, in the native voice
 * every German card gets.
 */

const edition = (id: string, term: string, en: string, uk: string, ru: string): EditionWord => ({
  id,
  term,
  meaning: { en, uk, ru },
});

interface HandWord {
  card: Omit<HandCard, "meaning" | "language" | "audio">;
  meaning: Record<Locale, string>;
}

/** Nouns with their article and plural first, as the decks keep them; the Known ones last. */
const HAND: HandWord[] = [
  {
    card: {
      id: "maedchen",
      source: "A1",
      kind: noun,
      term: "das Mädchen",
      state: "new",
      forms: "das Mädchen · die Mädchen",
      note: msg`Neuter, not feminine: every noun ending in -chen takes das.`,
    },
    meaning: { en: "girl", uk: "дівчинка; дівчина", ru: "девочка; девушка" },
  },
  {
    card: {
      id: "termin",
      source: "A1",
      kind: noun,
      term: "der Termin",
      state: "learning",
      forms: "der Termin · die Termine",
      note: msg`Einen Termin machen, to make an appointment.`,
    },
    meaning: {
      en: "appointment",
      uk: "запис; домовлена зустріч",
      ru: "запись; назначенная встреча",
    },
  },
  {
    card: {
      id: "wohnung",
      source: "A1",
      kind: noun,
      term: "die Wohnung",
      state: "new",
      forms: "die Wohnung · die Wohnungen",
      note: msg`Every noun ending in -ung takes die.`,
    },
    meaning: { en: "flat; apartment", uk: "квартира", ru: "квартира" },
  },
  {
    card: {
      id: "zug",
      source: "A1",
      kind: noun,
      term: "der Zug",
      state: "learning",
      forms: "der Zug · die Züge",
    },
    meaning: { en: "train", uk: "потяг", ru: "поезд" },
  },
  {
    card: {
      id: "broetchen",
      source: "A1",
      kind: noun,
      term: "das Brötchen",
      state: "new",
      forms: "das Brötchen · die Brötchen",
      note: msg`In Bavaria and Austria it’s a Semmel.`,
    },
    meaning: { en: "bread roll", uk: "булочка", ru: "булочка" },
  },
  {
    card: {
      id: "danke",
      source: "A1",
      kind: word,
      term: "danke",
      state: "known",
      note: msg`Danke schön! Thank you very much!`,
    },
    meaning: { en: "thank you", uk: "дякую", ru: "спасибо" },
  },
  {
    card: {
      id: "tuer",
      source: "A1",
      kind: noun,
      term: "die Tür",
      state: "known",
      forms: "die Tür · die Türen",
    },
    meaning: { en: "door", uk: "двері", ru: "дверь" },
  },
  {
    card: {
      id: "fenster",
      source: "A1",
      kind: noun,
      term: "das Fenster",
      state: "known",
      forms: "das Fenster · die Fenster",
    },
    meaning: { en: "window", uk: "вікно", ru: "окно" },
  },
];

/** The hand in this edition: the decks' own meanings, with the clip each card plays. */
export function germanHand(locale: Locale): HandCard[] {
  return HAND.map(({ card, meaning }) => ({
    ...card,
    language: "de",
    meaning: meaning[locale],
    audio: `/audio/german/${card.id}.mp3`,
  }));
}

/**
 * Sentences that use the front card's word, drawn faintly behind the hand. The marked run, between
 * asterisks, is the word in the form the sentence needs.
 */
export const GERMAN_EXAMPLES: Record<string, Example[]> = {
  maedchen: [
    { text: "Das *Mädchen* liest ein Buch.", meaning: msg`The *girl* is reading a book.` },
    { text: "Das kleine *Mädchen* lacht.", meaning: msg`The little *girl* is laughing.` },
  ],
  termin: [
    { text: "Ich habe morgen einen *Termin*.", meaning: msg`I have an *appointment* tomorrow.` },
    {
      text: "Haben Sie heute noch einen *Termin* frei?",
      meaning: msg`Do you have an *appointment* free today?`,
    },
  ],
  wohnung: [
    { text: "Die *Wohnung* hat zwei Zimmer.", meaning: msg`The *flat* has two rooms.` },
    { text: "Wir suchen eine neue *Wohnung*.", meaning: msg`We’re looking for a new *flat*.` },
  ],
  zug: [
    { text: "Der *Zug* hat Verspätung.", meaning: msg`The *train* is late.` },
    { text: "Ich fahre mit dem *Zug*.", meaning: msg`I’m going by *train*.` },
  ],
  broetchen: [
    { text: "Zwei *Brötchen*, bitte.", meaning: msg`Two *bread rolls*, please.` },
    { text: "Ich esse ein *Brötchen* mit Käse.", meaning: msg`I’m having a cheese *roll*.` },
  ],
  danke: [
    { text: "*Danke* schön!", meaning: msg`*Thank you* very much!` },
    { text: "Nein, *danke*.", meaning: msg`No, *thank you*.` },
  ],
  tuer: [
    { text: "Mach bitte die *Tür* zu.", meaning: msg`Please close the *door*.` },
    { text: "Es klopft an der *Tür*.", meaning: msg`Someone’s knocking at the *door*.` },
  ],
  fenster: [
    { text: "Darf ich das *Fenster* öffnen?", meaning: msg`May I open the *window*?` },
    { text: "Das *Fenster* ist offen.", meaning: msg`The *window* is open.` },
  ],
};

/** Everyday nouns under der, die and das, as the decks keep them. */
export const GERMAN_GENDERS: GenderGroup[] = [
  {
    article: "der",
    name: msg`Masculine`,
    words: [
      edition("tisch", "der Tisch", "table", "стіл", "стол"),
      edition("apfel", "der Apfel", "apple", "яблуко", "яблоко"),
      edition("kaffee", "der Kaffee", "coffee", "кава", "кофе"),
    ],
  },
  {
    article: "die",
    name: msg`Feminine`,
    words: [
      edition("strasse", "die Straße", "street; road", "вулиця; дорога", "улица; дорога"),
      edition("milch", "die Milch", "milk", "молоко", "молоко"),
      edition("kartoffel", "die Kartoffel", "potato", "картопля", "картофель"),
    ],
  },
  {
    article: "das",
    name: msg`Neuter`,
    words: [
      edition("brot", "das Brot", "bread", "хліб", "хлеб"),
      edition("wasser", "das Wasser", "water", "вода", "вода"),
      edition("kind", "das Kind", "child", "дитина", "ребёнок"),
    ],
  },
];

/** The first verbs of German Top 100 Verbs, in the deck's order. */
export const GERMAN_VERBS: EditionWord[] = [
  edition("sein", "sein", "to be", "бути", "быть"),
  edition("haben", "haben", "to have", "мати", "иметь"),
  edition("werden", "werden", "to become; will", "ставати; (майбутнє)", "становиться; (будущее)"),
  edition("koennen", "können", "can; to be able to", "могти; уміти", "мочь; уметь"),
  edition("machen", "machen", "to do; to make", "робити", "делать"),
  edition("gehen", "gehen", "to go (on foot)", "іти; ходити (пішки)", "идти; ходить (пешком)"),
];

/** Words and phrases from German for Renting a Home, with each edition's meaning. */
export const RENTING_WORDS: EditionWord[] = [
  edition(
    "ist-die-wohnung-noch-verfuegbar",
    "Ist die Wohnung noch verfügbar?",
    "Is the flat still available?",
    "Квартира ще доступна?",
    "Квартира ещё доступна?",
  ),
  edition(
    "kann-ich-die-wohnung-besichtigen",
    "Kann ich die Wohnung besichtigen?",
    "Can I view the flat?",
    "Чи можна оглянути квартиру?",
    "Можно посмотреть квартиру?",
  ),
  edition(
    "welche-unterlagen",
    "Welche Unterlagen benötigen Sie?",
    "Which documents do you need?",
    "Які документи вам потрібні?",
    "Какие документы вам нужны?",
  ),
  edition("kaution", "die Kaution", "security deposit", "застава", "залог"),
  edition(
    "nebenkosten",
    "die Nebenkosten",
    "additional operating costs; service charges",
    "додаткові експлуатаційні витрати",
    "дополнительные эксплуатационные расходы",
  ),
  edition(
    "mietvertrag",
    "der Mietvertrag",
    "rental agreement; lease",
    "договір оренди",
    "договор аренды",
  ),
];

/** Words for the voice section, each in the decks' native voice. */
export const GERMAN_VOICE_WORDS: VoiceWord[] = [
  { id: "guten-tag", term: "Guten Tag", meaning: msg`Hello` },
  { id: "entschuldigung", term: "Entschuldigung", meaning: msg`Excuse me; sorry` },
  { id: "tschuess", term: "Tschüss", meaning: msg`Bye` },
  { id: "strasse", term: "die Straße", meaning: msg`Street` },
  { id: "kuehlschrank", term: "der Kühlschrank", meaning: msg`Fridge` },
  { id: "feierabend", term: "der Feierabend", meaning: msg`The end of the working day` },
];

/** The order to take the level decks in. */
export const GERMAN_PATH: PathStep[] = [
  {
    slug: "german-a1-vocabulary",
    about: msg`Words by everyday topics: family, food, home and getting around.`,
    words: [
      { term: "die Familie", answer: msg`Family` },
      { term: "das Brot", answer: msg`Bread` },
      { term: "die Wohnung", answer: msg`Flat` },
      { term: "der Zug", answer: msg`Train` },
    ],
  },
  {
    slug: "german-a2-vocabulary",
    about: msg`Words for travel, renting, work and paperwork, once A1 feels easy.`,
    words: [
      { term: "die Verspätung", answer: msg`Delay` },
      { term: "der Kühlschrank", answer: msg`Fridge` },
      { term: "die Unterschrift", answer: msg`Signature` },
      { term: "der Feierabend", answer: msg`The end of the working day` },
    ],
  },
  {
    slug: "german-b1-vocabulary",
    about: msg`Words for the workplace, offices, money and contracts.`,
    words: [
      { term: "die Besprechung", answer: msg`Meeting` },
      { term: "der Antrag", answer: msg`Application` },
      { term: "die Frist", answer: msg`Deadline` },
    ],
  },
];

/** A class deck's newest cards, as the owner added them after a lesson. */
export const GERMAN_CLASS_CARDS = [
  { term: "der Antrag", meaning: msg`Application` },
  { term: "die Frist", meaning: msg`Deadline` },
  { term: "die Unterschrift", meaning: msg`Signature` },
];
