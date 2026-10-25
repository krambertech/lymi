import { msg } from "@lingui/core/macro";
import type { Locale } from "../../lib/routes";
import type { Example } from "./HandExamples";
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

/** Look-alikes first, each with the note its edition carries; the Known ones last. */
const HAND_UK: HandCard[] = [
  handCard("sklep", "A1", "sklep", "магазин", "new", {
    note: "Не склеп. Склеп польською — grobowiec.",
  }),
  handCard("dynia", "A2", "dynia", "гарбуз", "learning", {
    note: "Не диня. Диня польською — melon.",
  }),
  handCard("dywan", "A1", "dywan", "килим", "new", { note: "Не диван. Диван польською — kanapa." }),
  handCard("druzyna", "A2", "drużyna", "команда", "learning", {
    note: "Не дружина. Дружина польською — żona.",
  }),
  handCard("owoc", "A1", "owoc", "фрукт", "new", { note: "Не овоч. Овоч польською — warzywo." }),
  handCard("dziekuje", "A1", "dziękuję", "дякую", "known", {
    kind: phrase,
    note: "Dziękuję bardzo! — Щиро дякую!",
  }),
  handCard("czlowiek", "A1", "człowiek", "людина", "known", {
    note: "Не чоловік. Чоловік польською — mężczyzna, а чоловік-подружжя — mąż.",
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
  }),
  handCard("dywan", "A1", "dywan", "ковёр", "new", {
    note: "Не диван. Диван по-польски — kanapa.",
  }),
  handCard("krzeslo", "A1", "krzesło", "стул", "learning", {
    note: "Не кресло. Кресло по-польски — fotel.",
  }),
  handCard("owoc", "A1", "owoc", "фрукт", "new", { note: "Не овощ. Овощ по-польски — warzywo." }),
  handCard("dziekuje", "A1", "dziękuję", "спасибо", "known", {
    kind: phrase,
    note: "Dziękuję bardzo! — Большое спасибо!",
  }),
  handCard("plecy", "A2", "plecy", "спина", "known", {
    note: "Не плечи. Плечи по-польски — ramiona.",
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
  }),
  handCard("muzyka", "A1", "muzyka", "music", "new", {
    forms: "mùzyka",
    note: "Stressed on the third syllable from the end, where most Polish words take the second.",
  }),
  handCard("miasto", "A1", "miasto", "town; city", "learning", {
    forms: "miasto · miasta · w mieście",
    note: "In town is w mieście: st turns into ść.",
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
 * asterisks, is the word in the form the sentence needs.
 */
export const POLISH_EXAMPLES: Record<string, Example[]> = {
  sklep: [
    { text: "Idę do *sklepu*.", meaning: msg`I’m going to the *shop*.` },
    { text: "*Sklep* jest zamknięty.", meaning: msg`The *shop* is closed.` },
    { text: "Ten *sklep* jest czynny do 22.", meaning: msg`This *shop* is open until 10 pm.` },
    { text: "Kupiłam chleb w *sklepie*.", meaning: msg`I bought bread at the *shop*.` },
  ],
  dywan: [
    { text: "Kot śpi na *dywanie*.", meaning: msg`The cat is asleep on the *rug*.` },
    { text: "Nowy *dywan* jest miękki.", meaning: msg`The new *rug* is soft.` },
    { text: "Kupiliśmy *dywan* do salonu.", meaning: msg`We bought a *rug* for the living room.` },
  ],
  owoc: [
    { text: "Jem *owoce* codziennie.", meaning: msg`I eat *fruit* every day.` },
    { text: "Jaki to *owoc*?", meaning: msg`What *fruit* is this?` },
    { text: "Ten *owoc* jest bardzo słodki.", meaning: msg`This *fruit* is very sweet.` },
  ],
  dziekuje: [
    { text: "*Dziękuję* bardzo!", meaning: msg`*Thank you* very much!` },
    { text: "*Dziękuję* za pomoc.", meaning: msg`*Thank you* for your help.` },
    { text: "Nie, *dziękuję*.", meaning: msg`No, *thank you*.` },
  ],
  magazyn: [
    { text: "Towar jest w *magazynie*.", meaning: msg`The goods are in the *warehouse*.` },
    { text: "Pracuję w *magazynie*.", meaning: msg`I work in a *warehouse*.` },
    { text: "Czytam *magazyn* o modzie.", meaning: msg`I’m reading a fashion *magazine*.` },
  ],
  pies: [
    { text: "Mam *psa*.", meaning: msg`I have a *dog*.` },
    { text: "Ten *pies* jest duży.", meaning: msg`This *dog* is big.` },
    { text: "Idę na spacer z *psem*.", meaning: msg`I’m taking the *dog* for a walk.` },
    { text: "Nie mam *psa*.", meaning: msg`I don’t have a *dog*.` },
  ],
  muzyka: [
    { text: "Lubię polską *muzykę*.", meaning: msg`I like Polish *music*.` },
    { text: "Ta *muzyka* jest za głośna.", meaning: msg`This *music* is too loud.` },
    { text: "Słucham *muzyki*.", meaning: msg`I’m listening to *music*.` },
  ],
  dynia: [
    { text: "*Dynia* jest pomarańczowa.", meaning: msg`The *pumpkin* is orange.` },
    { text: "Kupiłam dużą *dynię*.", meaning: msg`I bought a big *pumpkin*.` },
    { text: "Robię zupę z *dyni*.", meaning: msg`I’m making *pumpkin* soup.` },
  ],
  druzyna: [
    { text: "Nasza *drużyna* wygrała!", meaning: msg`Our *team* won!` },
    { text: "Gram w *drużynie* piłkarskiej.", meaning: msg`I play in a football *team*.` },
    { text: "Kibicuję tej *drużynie*.", meaning: msg`I support this *team*.` },
  ],
  czlowiek: [
    { text: "To dobry *człowiek*.", meaning: msg`He’s a good *person*.` },
    { text: "Ten *człowiek* mi pomógł.", meaning: msg`This *person* helped me.` },
    { text: "Każdy *człowiek* jest inny.", meaning: msg`Every *person* is different.` },
  ],
  krzeslo: [
    { text: "Czy to *krzesło* jest wolne?", meaning: msg`Is this *chair* free?` },
    { text: "Usiądź na *krześle*.", meaning: msg`Sit on the *chair*.` },
    { text: "Potrzebujemy dwóch *krzeseł*.", meaning: msg`We need two *chairs*.` },
  ],
  plecy: [
    { text: "Bolą mnie *plecy*.", meaning: msg`My *back* hurts.` },
    { text: "Śpię na *plecach*.", meaning: msg`I sleep on my *back*.` },
    { text: "Mam plecak na *plecach*.", meaning: msg`I have a backpack on my *back*.` },
  ],
  robic: [
    { text: "Co *robisz*?", meaning: msg`What are you *doing*?` },
    { text: "Nic nie *robię*.", meaning: msg`I’m not *doing* anything.` },
    { text: "Lubię *robić* zdjęcia.", meaning: msg`I like *taking* photos.` },
  ],
  miasto: [
    { text: "Kraków to piękne *miasto*.", meaning: msg`Kraków is a beautiful *city*.` },
    { text: "Jedziemy do *miasta*.", meaning: msg`We’re going into *town*.` },
    { text: "Mieszkam w *mieście*.", meaning: msg`I live in the *city*.` },
  ],
  chleb: [
    { text: "Poproszę *chleb*.", meaning: msg`A loaf of *bread*, please.` },
    { text: "Kupiłam świeży *chleb*.", meaning: msg`I bought fresh *bread*.` },
    { text: "*Chleb* z masłem.", meaning: msg`*Bread* and butter.` },
  ],
  "dzien-dobry": [
    { text: "*Dzień dobry*, pani Anno!", meaning: msg`*Good morning*, Ms Anna!` },
    { text: "*Dzień dobry*, poproszę kawę.", meaning: msg`*Hello*, a coffee, please.` },
  ],
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
