import { msg } from "@lingui/core/macro";
import type { Locale } from "../../lib/routes";
import type { GenderGroup } from "./GenderTiles";
import type { Example } from "./HandExamples";
import type { HandCard } from "./hand-cards";
import { noun, verb, word } from "./hand-cards";
import type { PathStep, VoiceWord } from "./japanese";
import type { EditionWord } from "./language-decks";

/**
 * The Spanish page's words. Terms are Spanish and never translated. Meanings are the published
 * decks' own, one per edition, so each locale reads its edition rather than a translation of the
 * English one. The clips in `/audio/spanish/` are the published decks' own, in the native voice
 * every Spanish card gets.
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

const HAND: HandWord[] = [
  {
    card: {
      id: "estar",
      source: "A1",
      kind: verb,
      term: "estar",
      state: "new",
      note: msg`Estar is for where and how: estoy en casa, I’m at home.`,
    },
    meaning: { en: "to be (where or how)", uk: "бути (де чи як)", ru: "быть (где или как)" },
  },
  {
    card: {
      id: "ser",
      source: "A1",
      kind: verb,
      term: "ser",
      state: "learning",
      note: msg`Ser is for who and what: soy de Valencia, I’m from Valencia.`,
    },
    meaning: { en: "to be (who or what)", uk: "бути (хто чи що)", ru: "быть (кто или что)" },
  },
  {
    card: {
      id: "agua",
      source: "A1",
      kind: noun,
      term: "el agua",
      state: "new",
      note: msg`Feminine, though it takes el: el agua fría.`,
    },
    meaning: { en: "water", uk: "вода", ru: "вода" },
  },
  {
    card: {
      id: "mano",
      source: "A1",
      kind: noun,
      term: "la mano",
      state: "learning",
      note: msg`Feminine, though it ends in -o.`,
    },
    meaning: { en: "hand", uk: "рука (кисть)", ru: "рука (кисть)" },
  },
  {
    card: {
      id: "dia",
      source: "A1",
      kind: noun,
      term: "el día",
      state: "new",
      note: msg`Masculine, though it ends in -a: buenos días.`,
    },
    meaning: { en: "day", uk: "день", ru: "день" },
  },
  {
    card: {
      id: "hoy",
      source: "A1",
      kind: word,
      term: "hoy",
      state: "known",
      note: msg`The h is silent: hoy sounds like oy.`,
    },
    meaning: { en: "today", uk: "сьогодні", ru: "сегодня" },
  },
  {
    card: { id: "llave", source: "A2", kind: noun, term: "la llave", state: "known" },
    meaning: { en: "key", uk: "ключ", ru: "ключ" },
  },
  {
    card: {
      id: "ano",
      source: "A1",
      kind: noun,
      term: "el año",
      state: "known",
      note: msg`Ñ is a letter of its own: ¡Feliz año nuevo!`,
    },
    meaning: { en: "year", uk: "рік", ru: "год" },
  },
];

/** The hand in this edition: the decks' own meanings, with the clip each card plays. */
export function spanishHand(locale: Locale): HandCard[] {
  return HAND.map(({ card, meaning }) => ({
    ...card,
    language: "es",
    meaning: meaning[locale],
    audio: `/audio/spanish/${card.id}.mp3`,
  }));
}

/**
 * Sentences that use the front card's word, drawn faintly behind the hand. The marked run, between
 * asterisks, is the word in the form the sentence needs.
 */
export const SPANISH_EXAMPLES: Record<string, Example[]> = {
  estar: [
    { text: "¿Dónde *estás*?", meaning: msg`Where *are* you?` },
    { text: "*Estoy* en casa.", meaning: msg`*I’m* at home.` },
    { text: "La sopa *está* fría.", meaning: msg`The soup *is* cold.` },
  ],
  ser: [
    { text: "*Soy* de Valencia.", meaning: msg`*I’m* from Valencia.` },
    { text: "¿Qué hora *es*?", meaning: msg`What time *is* it?` },
    { text: "*Es* mi hermana.", meaning: msg`*She’s* my sister.` },
  ],
  agua: [
    { text: "Un vaso de *agua*, por favor.", meaning: msg`A glass of *water*, please.` },
    { text: "El *agua* está fría.", meaning: msg`The *water* is cold.` },
  ],
  mano: [
    { text: "Lávate las *manos*.", meaning: msg`Wash your *hands*.` },
    { text: "Levanta la *mano*.", meaning: msg`Put your *hand* up.` },
  ],
  dia: [
    { text: "*Buenos días*.", meaning: msg`*Good morning*.` },
    { text: "¿Qué *día* es hoy?", meaning: msg`What *day* is it today?` },
  ],
  hoy: [
    { text: "*Hoy* hace calor.", meaning: msg`It’s hot *today*.` },
    { text: "¿Qué haces *hoy*?", meaning: msg`What are you doing *today*?` },
  ],
  llave: [
    { text: "No encuentro las *llaves*.", meaning: msg`I can’t find my *keys*.` },
    { text: "¿Tienes la *llave*?", meaning: msg`Have you got the *key*?` },
  ],
  ano: [
    { text: "¡Feliz *año* nuevo!", meaning: msg`Happy New *Year*!` },
    { text: "Tengo treinta *años*.", meaning: msg`I’m thirty *years* old.` },
  ],
};

/** Nouns whose ending points to the other gender, as the decks keep them, with el or la. */
export const SPANISH_GENDERS: GenderGroup[] = [
  {
    article: "el",
    name: msg`Masculine`,
    words: [
      edition("dia", "el día", "day", "день", "день"),
      edition("mapa", "el mapa", "map", "мапа; карта", "карта (географическая)"),
      edition("problema", "el problema", "problem", "проблема", "проблема"),
    ],
  },
  {
    article: "la",
    name: msg`Feminine`,
    words: [
      edition("mano", "la mano", "hand", "рука (кисть)", "рука (кисть)"),
      edition("foto", "la foto", "photo", "фото", "фото"),
      edition("radio", "la radio", "radio", "радіо", "радио"),
    ],
  },
];

/** The first verbs of Spanish Top 100 Verbs, in the deck's order. */
export const SPANISH_VERBS: EditionWord[] = [
  edition("ser", "ser", "to be (who or what)", "бути (хто чи що)", "быть (кто или что)"),
  edition("estar", "estar", "to be (where or how)", "бути (де чи як)", "быть (где или как)"),
  edition("tener", "tener", "to have", "мати", "иметь"),
  edition("poder", "poder", "can; to be able to", "могти", "мочь"),
  edition("hacer", "hacer", "to do; to make", "робити", "делать"),
  edition("ir", "ir", "to go", "іти; їхати", "идти; ехать"),
];

/** Phrases from Spanish Essentials, with each edition's meaning. */
export const SPANISH_ESSENTIALS: EditionWord[] = [
  edition(
    "donde-esta-la-estacion",
    "¿Dónde está la estación?",
    "Where is the station?",
    "Де станція?",
    "Где станция?",
  ),
  edition(
    "la-cuenta-por-favor",
    "La cuenta, por favor.",
    "The bill, please.",
    "Рахунок, будь ласка.",
    "Счёт, пожалуйста.",
  ),
  edition(
    "donde-esta-el-bano",
    "¿Dónde está el baño?",
    "Where is the bathroom?",
    "Де туалет?",
    "Где туалет?",
  ),
  edition(
    "perdone",
    "Perdone.",
    "Excuse me; sorry.",
    "Вибачте; перепрошую.",
    "Извините; простите.",
  ),
];

/** Words for the voice section, each in the decks' native voice. */
export const SPANISH_VOICE_WORDS: VoiceWord[] = [
  { id: "gracias", term: "gracias", meaning: msg`Thank you` },
  { id: "perro", term: "el perro", meaning: msg`Dog` },
  { id: "manana", term: "mañana", meaning: msg`Tomorrow` },
  { id: "llave", term: "la llave", meaning: msg`Key` },
  { id: "jueves", term: "el jueves", meaning: msg`Thursday` },
  { id: "hola", term: "hola", meaning: msg`Hello` },
];

/** The order to take the level decks in. */
export const SPANISH_PATH: PathStep[] = [
  {
    slug: "spanish-a1-vocabulary",
    about: msg`Words by everyday topics: family, food, home and getting around.`,
    words: [
      { term: "la familia", answer: msg`Family` },
      { term: "el pan", answer: msg`Bread` },
      { term: "la casa", answer: msg`House` },
      { term: "el tren", answer: msg`Train` },
    ],
  },
  {
    slug: "spanish-a2-vocabulary",
    about: msg`Words for eating out, travel and free time, once A1 feels easy.`,
    words: [
      { term: "la cuenta", answer: msg`Bill` },
      { term: "la llave", answer: msg`Key` },
      { term: "el perro", answer: msg`Dog` },
      { term: "la foto", answer: msg`Photo` },
    ],
  },
  {
    slug: "spanish-b1-vocabulary",
    about: msg`Words for feelings, opinions, work and study.`,
    words: [
      { term: "divertirse", answer: msg`To have fun` },
      { term: "el contrato", answer: msg`Contract` },
      { term: "firmar", answer: msg`To sign` },
    ],
  },
];

/** A class deck's newest cards, as the owner added them after a lesson. */
export const SPANISH_CLASS_CARDS = [
  { term: "la reunión", meaning: msg`Meeting` },
  { term: "el horario", meaning: msg`Timetable` },
  { term: "el recibo", meaning: msg`Receipt` },
];
