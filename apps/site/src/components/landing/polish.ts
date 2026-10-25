import { msg } from "@lingui/core/macro";
import type { Locale } from "../../lib/routes";
import type { HandCard } from "./hand-cards";
import { noun, phrase, verb } from "./hand-cards";
import type { PathStep, VoiceWord } from "./japanese";

/**
 * The Polish page's words. Terms are Polish and never translated. Meanings are the published
 * decks' own, one per edition, so each locale reads its edition rather than a translation of the
 * English one. A look-alike depends on the reader's language, so the Ukrainian and Russian pages
 * each have their own. The clips in `/audio/polish/` are the published decks' own, in the native
 * voice every Polish card gets.
 */

type Edition = Record<Locale, string>;

export interface PolishWord {
  /** The clip's name in `/audio/polish/`. */
  id: string;
  term: string;
  meaning: Edition;
}

const word = (id: string, term: string, en: string, uk: string, ru: string): PolishWord => ({
  id,
  term,
  meaning: { en, uk, ru },
});

/** A Polish word that looks like one in the reader's language and means something else. */
export interface LookAlike {
  id: string;
  term: string;
  /** What the Polish word means, in the reader's language. */
  meaning: string;
  /** The reader's own word it looks like. */
  looksLike: string;
  /** How Polish says what the look-alike means. */
  inPolish: string;
}

/** Banach 2024, from a year of classes for refugees in Łódź, checked against the decks' Ukrainian edition. */
export const LOOK_ALIKES_UK: LookAlike[] = [
  { id: "sklep", term: "sklep", meaning: "магазин", looksLike: "склеп", inPolish: "grobowiec" },
  { id: "dynia", term: "dynia", meaning: "гарбуз", looksLike: "диня", inPolish: "melon" },
  { id: "owoc", term: "owoc", meaning: "фрукт", looksLike: "овоч", inPolish: "warzywo" },
  { id: "magazyn", term: "magazyn", meaning: "склад", looksLike: "магазин", inPolish: "sklep" },
  { id: "dywan", term: "dywan", meaning: "килим", looksLike: "диван", inPolish: "kanapa" },
  { id: "druzyna", term: "drużyna", meaning: "команда", looksLike: "дружина", inPolish: "żona" },
  { id: "krzeslo", term: "krzesło", meaning: "стілець", looksLike: "крісло", inPolish: "fotel" },
  {
    id: "czlowiek",
    term: "człowiek",
    meaning: "людина",
    looksLike: "чоловік",
    inPolish: "mężczyzna, mąż",
  },
];

/** The same trap for a Russian reader, where it differs: człowiek is человек, but plecy is not плечи. */
export const LOOK_ALIKES_RU: LookAlike[] = [
  { id: "sklep", term: "sklep", meaning: "магазин", looksLike: "склеп", inPolish: "grobowiec" },
  { id: "dynia", term: "dynia", meaning: "тыква", looksLike: "дыня", inPolish: "melon" },
  { id: "owoc", term: "owoc", meaning: "фрукт", looksLike: "овощ", inPolish: "warzywo" },
  { id: "magazyn", term: "magazyn", meaning: "склад", looksLike: "магазин", inPolish: "sklep" },
  { id: "dywan", term: "dywan", meaning: "ковёр", looksLike: "диван", inPolish: "kanapa" },
  { id: "krzeslo", term: "krzesło", meaning: "стул", looksLike: "кресло", inPolish: "fotel" },
  { id: "plecy", term: "plecy", meaning: "спина", looksLike: "плечи", inPolish: "ramiona" },
  {
    id: "recepta",
    term: "recepta",
    meaning: "рецепт врача",
    looksLike: "рецепт блюда",
    inPolish: "przepis",
  },
];

export function lookAlikesFor(locale: Locale): LookAlike[] {
  return locale === "ru" ? LOOK_ALIKES_RU : LOOK_ALIKES_UK;
}

const handCard = (
  id: string,
  source: string,
  term: string,
  meaning: string,
  state: HandCard["state"],
  extra: Partial<HandCard> = {},
): HandCard => ({
  id,
  source,
  kind: noun,
  language: "pl",
  term,
  meaning,
  state,
  audio: `/audio/polish/${id}.mp3`,
  ...extra,
});

/** Look-alikes first, each with the note its edition carries; the Known ones last. Half ask from the meaning. */
const HAND_UK: HandCard[] = [
  handCard("sklep", "A1", "sklep", "магазин", "new", {
    note: "Не склеп. Склеп польською — grobowiec.",
  }),
  handCard("dynia", "A2", "dynia", "гарбуз", "learning", {
    note: "Не диня. Диня польською — melon.",
    mode: "meaning_to_term",
  }),
  handCard("dywan", "A1", "dywan", "килим", "new", { note: "Не диван. Диван польською — kanapa." }),
  handCard("druzyna", "A2", "drużyna", "команда", "learning", {
    note: "Не дружина. Дружина польською — żona.",
    mode: "meaning_to_term",
  }),
  handCard("owoc", "A1", "owoc", "фрукт", "new", { note: "Не овоч. Овоч польською — warzywo." }),
  handCard("dziekuje", "A1", "dziękuję", "дякую", "known", {
    kind: phrase,
    note: "Dziękuję bardzo! — Щиро дякую!",
  }),
  handCard("czlowiek", "A1", "człowiek", "людина", "known", {
    note: "Не чоловік. Чоловік польською — mężczyzna, а чоловік-подружжя — mąż.",
    mode: "meaning_to_term",
  }),
  handCard("magazyn", "A2", "magazyn", "склад; журнал", "known", {
    note: "Не магазин. Магазин польською — sklep.",
  }),
];

const HAND_RU: HandCard[] = [
  handCard("sklep", "A1", "sklep", "магазин", "new", {
    note: "Не склеп. Склеп по-польски — grobowiec.",
  }),
  handCard("dynia", "A2", "dynia", "тыква", "learning", {
    note: "Не дыня. Дыня по-польски — melon.",
    mode: "meaning_to_term",
  }),
  handCard("dywan", "A1", "dywan", "ковёр", "new", {
    note: "Не диван. Диван по-польски — kanapa.",
  }),
  handCard("krzeslo", "A1", "krzesło", "стул", "learning", {
    note: "Не кресло. Кресло по-польски — fotel.",
    mode: "meaning_to_term",
  }),
  handCard("owoc", "A1", "owoc", "фрукт", "new", { note: "Не овощ. Овощ по-польски — warzywo." }),
  handCard("dziekuje", "A1", "dziękuję", "спасибо", "known", {
    kind: phrase,
    note: "Dziękuję bardzo! — Большое спасибо!",
  }),
  handCard("plecy", "A2", "plecy", "спина", "known", {
    note: "Не плечи. Плечи по-польски — ramiona.",
    mode: "meaning_to_term",
  }),
  handCard("magazyn", "A2", "magazyn", "склад; журнал", "known", {
    note: "Не магазин. Магазин по-польски — sklep.",
  }),
];

/** The English page deals a word's forms instead, as the English edition's notes keep them. */
const HAND_EN: HandCard[] = [
  handCard("pies", "A2", "pies", "dog", "new", {
    forms: "pies · psa · psy",
    note: "The e drops out: nie mam psa, I don’t have a dog.",
  }),
  handCard("robic", "A1", "robić", "to do; to make", "learning", {
    kind: verb,
    forms: "robić · zrobić",
    note: "Zrobić is for something done and finished: zrobię to jutro, I’ll do it tomorrow.",
    mode: "meaning_to_term",
  }),
  handCard("muzyka", "A1", "muzyka", "music", "new", {
    forms: "mùzyka",
    note: "Stressed on the third syllable from the end, where most Polish words take the second.",
  }),
  handCard("miasto", "A1", "miasto", "town; city", "learning", {
    forms: "miasto · miasta · w mieście",
    note: "In town is w mieście: st turns into ść.",
    mode: "meaning_to_term",
  }),
  handCard("sklep", "A1", "sklep", "shop", "new", {
    forms: "sklep · sklepu · w sklepie",
    note: "Idę do sklepu, I’m going to the shop.",
  }),
  handCard("dziekuje", "A1", "dziękuję", "thank you", "known", {
    kind: phrase,
    note: "Dziękuję bardzo! Thank you very much!",
  }),
  handCard("chleb", "A1", "chleb", "bread", "known", {
    forms: "chleb · chleba",
    note: "Nie ma chleba, there’s no bread: no takes the genitive.",
    mode: "meaning_to_term",
  }),
  handCard("dzien-dobry", "A1", "dzień dobry", "hello (polite); good morning", "known", {
    kind: phrase,
    note: "Said until evening, when it turns into dobry wieczór.",
  }),
];

export function polishHand(locale: Locale): HandCard[] {
  return locale === "uk" ? HAND_UK : locale === "ru" ? HAND_RU : HAND_EN;
}

/**
 * Sentences that use the front card's word, drawn faintly behind the hand. The marked run, between
 * asterisks, is the word in the form the sentence needs. A card that asks from the meaning has none.
 */
export const POLISH_EXAMPLES: Record<string, string[]> = {
  sklep: [
    "Idę do *sklepu*.",
    "*Sklep* jest zamknięty.",
    "Ten *sklep* jest czynny do 22.",
    "Kupiłam chleb w *sklepie*.",
  ],
  dywan: ["Kot śpi na *dywanie*.", "Nowy *dywan* jest miękki.", "Kupiliśmy *dywan* do salonu."],
  owoc: ["Jem *owoce* codziennie.", "Jaki to *owoc*?", "Ten *owoc* jest bardzo słodki."],
  dziekuje: ["*Dziękuję* bardzo!", "*Dziękuję* za pomoc.", "Nie, *dziękuję*."],
  magazyn: ["Towar jest w *magazynie*.", "Pracuję w *magazynie*.", "Czytam *magazyn* o modzie."],
  pies: ["Mam *psa*.", "Ten *pies* jest duży.", "Idę na spacer z *psem*.", "Nie mam *psa*."],
  muzyka: ["Lubię polską *muzykę*.", "Ta *muzyka* jest za głośna.", "Słucham *muzyki*."],
  "dzien-dobry": ["*Dzień dobry*, pani Anno!", "*Dzień dobry*, poproszę kawę."],
};

/** A word and the three forms a learner keeps with it, as the decks' notes list them. */
export interface PolishFormWord {
  term: string;
  kind: "noun" | "verb";
  meaning: string;
  forms: [string, string, string];
}

export const POLISH_FORM_WORDS: PolishFormWord[] = [
  { term: "pies", kind: "noun", meaning: "Dog", forms: ["pies", "psa", "psie"] },
  { term: "miasto", kind: "noun", meaning: "Town; city", forms: ["miasto", "miasta", "mieście"] },
  { term: "ręka", kind: "noun", meaning: "Hand", forms: ["ręka", "ręki", "ręce"] },
  { term: "robić", kind: "verb", meaning: "To do; to make", forms: ["robić", "zrobić", "zrobię"] },
  { term: "brać", kind: "verb", meaning: "To take", forms: ["brać", "wziąć", "wezmę"] },
  { term: "mówić", kind: "verb", meaning: "To say", forms: ["mówić", "powiedzieć", "powiem"] },
];

/** Phrases from Polish for Offices and Paperwork, with each edition's meaning. */
export const OFFICE_WORDS: PolishWord[] = [
  word(
    "dzien-dobry-chcialbym-zlozyc",
    "Dzień dobry, chciałbym złożyć wniosek.",
    "Hello, I’d like to submit an application.",
    "Добрий день, я хотів би подати заяву.",
    "Здравствуйте, я хотел бы подать заявление.",
  ),
  word(
    "gdzie-moge-pobrac-numerek",
    "Gdzie mogę pobrać numerek?",
    "Where can I get a queue ticket?",
    "Де можна взяти талончик у черзі?",
    "Где можно взять талончик в очередь?",
  ),
  word(
    "do-ktorego-okienka-mam",
    "Do którego okienka mam podejść?",
    "Which window should I go to?",
    "До якого віконця мені підійти?",
    "К какому окошку мне подойти?",
  ),
  word(
    "karta-pobytu",
    "karta pobytu",
    "residence card",
    "посвідка на проживання",
    "вид на жительство",
  ),
  word(
    "zameldowanie",
    "zameldowanie",
    "address registration",
    "реєстрація місця проживання",
    "прописка (регистрация)",
  ),
  word(
    "czy-moze-pani-mowic",
    "Czy może Pani mówić wolniej?",
    "Could you speak more slowly?",
    "Можете говорити повільніше?",
    "Можете говорить помедленнее?",
  ),
  word(
    "gdzie-mam-sie-podpisac",
    "Gdzie mam się podpisać?",
    "Where do I sign?",
    "Де мені розписатися?",
    "Где мне расписаться?",
  ),
];

/** Words for the voice section, each in the decks' native voice. */
export const POLISH_VOICE_WORDS: VoiceWord[] = [
  { id: "dziekuje", term: "dziękuję", meaning: msg`Thank you` },
  { id: "przepraszam", term: "przepraszam", meaning: msg`Sorry; excuse me` },
  { id: "czesc", term: "cześć", meaning: msg`Hi; bye` },
  { id: "pociag", term: "pociąg", meaning: msg`Train` },
  { id: "jablko", term: "jabłko", meaning: msg`Apple` },
  { id: "niedziela", term: "niedziela", meaning: msg`Sunday` },
];

/** The order to take the beginner decks in, as Welcome offers them; an alphabet deck will go first. */
export const POLISH_PATH: PathStep[] = [
  {
    slug: "polish-a1-vocabulary",
    about: msg`Words by the topics of the A1 exam: people, home, food and the shop.`,
    words: [
      { term: "dzień dobry", answer: msg`Hello` },
      { term: "chleb", answer: msg`Bread` },
      { term: "sklep", answer: msg`Shop` },
      { term: "lekarz", answer: msg`Doctor` },
    ],
  },
  {
    slug: "polish-a2-vocabulary",
    about: msg`Words for everyday life in Poland, once A1 feels easy.`,
    words: [
      { term: "dynia", answer: msg`Pumpkin` },
      { term: "plecy", answer: msg`Back` },
      { term: "drużyna", answer: msg`Team` },
      { term: "jabłko", answer: msg`Apple` },
    ],
  },
  {
    slug: "core-polish-words",
    about: msg`Core nouns, verbs and adjectives, with the forms you need to use them.`,
    words: [
      { term: "człowiek", answer: msg`Person` },
      { term: "praca", answer: msg`Work` },
      { term: "mieszkanie", answer: msg`Flat` },
    ],
  },
];

/** A class deck's newest cards, as the owner added them after a lesson. */
export const POLISH_CLASS_CARDS = [
  { term: "termin", meaning: msg`Appointment; deadline` },
  { term: "umowa najmu", meaning: msg`Rental agreement` },
  { term: "podpis", meaning: msg`Signature` },
];
