import type {
  Actor,
  AppLanguage,
  Directions,
  PublicationCategory,
  PublicationTag,
  StatedFieldSource,
} from "@lymi/core";
import { HEAVY } from "./heavy-persona";
import { JAPANESE } from "./japanese-persona";
import { COMPANIONS, JOINING, SHARED } from "./sharing-personas";

/**
 * The learners a local developer can become. Each is one account in the local D1, named
 * `<id>@lymi.local`, and the data that account starts with. They exist so a screen can be
 * looked at in a state that is otherwise slow to reach: the first run, a long streak, a
 * backlog after a break, meanings in another language.
 *
 * Nothing here reaches production. The routes ship only in local and preview builds, and
 * their runtime gate accepts loopback or an isolated capability-protected preview.
 */
export interface Persona {
  id: string;
  /** The account's display name. */
  name: string;
  /** One line for the panel and the CLI. Names the state, not the data. */
  description: string;
  /** Where the palette lists it, so a face is found by what it is for. */
  group: "Start" | "Everyday" | "Languages" | "Scale and edges" | "Together";
  /** The interface language. Meanings follow it, as they do for a real learner. */
  appLanguage: AppLanguage;
  /**
   * Days ago on which the learner reviewed, any order. Every card due on that day is graded.
   * Zero is today. Empty means the account has never reviewed.
   */
  reviewDays: number[];
  /** How many grades one review day holds, at least and at most. Defaults to 8 and 24. */
  reviewsPerDay?: { min: number; max: number };
  /** How many cards are due when the seed lands. `all` makes every card due. */
  dueNow: number | "all";
  decks: PersonaDeck[];
  /** Series of the persona's own decks, by deck name, in order. */
  series?: { name: string; decks: string[] }[];
  /** Published decks added from Explore, with the edition to pin. */
  explore?: { slug: string; meaningLanguage?: string }[];
  /** Where sign-in lands when no screen is asked for: Welcome with another account's deck. */
  landing?: { welcomeWith: { owner: string; deck: string } };
}

export interface PersonaDeck {
  name: string;
  description?: string;
  defaultLanguage: string | null;
  directions?: Directions;
  /** Days ago the deck was created. Its cards inherit this unless they say otherwise. */
  introducedDaysAgo: number;
  /** Named sections, in order. A card joins one by naming it. */
  sections?: string[];
  cards: PersonaCard[];
  archived?: boolean;
  /** Publishes the deck in the local database, so its public page and add flow can be opened. */
  publication?: PersonaPublication;
  /**
   * Who else is in the deck, by account id: a persona or a companion. The only place a
   * membership is written down, so seeding either side finds the other.
   */
  people?: { members: string[]; invitations?: string[]; joinLink?: boolean };
}

/** A local publication, seeded through the same services a publisher would call. ADR 0015. */
export interface PersonaPublication {
  slug: string;
  summary: string;
  /** The shelf the deck sits on in Explore. */
  category?: PublicationCategory;
  tags?: PublicationTag[];
  publisher: string;
  /** The language the deck's own meanings are in. Every edition localizes this one. */
  meaningLanguage: string;
  /** Further editions, written, signed off and published by the seed. */
  editions?: PersonaEdition[];
}

/** One meaning-language edition, keyed by the English text it replaces so it reads as a pair. */
export interface PersonaEdition {
  language: string;
  name: string;
  summary: string;
  description?: string;
  /** The section's name in this edition, by the section's name in the original. */
  sections?: Record<string, string>;
  /** The card's meaning in this edition, by its term. */
  meanings: Record<string, string>;
}

export interface PersonaCard {
  term: string;
  meaning?: string;
  example?: string;
  pronunciation?: string;
  notes?: string;
  /** Overrides the deck's language. Null is a card without one. */
  language?: string | null;
  tags?: string[];
  source?: string;
  meaningSource?: StatedFieldSource;
  exampleSource?: StatedFieldSource;
  /** The deck section it goes in, by name. */
  section?: string;
  /** Who added it. `mcp` and `api` cards show up in Activity. */
  createdBy?: Actor;
  hook?: string;
  /** Marked important by the learner. */
  important?: boolean;
  /** A picture from `pictures.ts`, by its key. */
  picture?: string;
  introducedDaysAgo?: number;
  archived?: boolean;
}

/** Fixed and public. It still satisfies the real password rule, so nothing is exempt. */
export const DEV_PASSWORD = "quiet-harbour-evening";

export function personaEmail(id: string): string {
  return `${id}@lymi.local`;
}

/** The persona an account belongs to, or null for a real account signed in locally. */
export function personaFor(email: string): Persona | null {
  const match = /^([a-z0-9-]+)@lymi\.local$/i.exec(email.trim());
  if (!match) return null;
  return personas.find((p) => p.id === match[1]?.toLowerCase()) ?? null;
}

const lesson = (source: string, cards: PersonaCard[]): PersonaCard[] =>
  cards.map((c) => ({ source, meaningSource: "lesson", ...c }));

const ITALIAN_LESSON = lesson("Lezione 12", [
  {
    term: "sbrigarsi",
    meaning: "to hurry up",
    example: "Sbrigati, il treno parte tra cinque minuti.",
    pronunciation: "zbri-GAR-si",
    tags: ["verb", "reflexive"],
  },
  { term: "magari", meaning: "if only; maybe", example: "Magari fosse così semplice." },
  { term: "la scadenza", meaning: "the deadline; expiry date", tags: ["noun"] },
  { term: "prenotare", meaning: "to book, to reserve", example: "Ho prenotato un tavolo per due." },
  { term: "il rimborso", meaning: "the refund", tags: ["noun", "money"] },
  { term: "affollato", meaning: "crowded", example: "Il mercato era affollato stamattina." },
  { term: "la coincidenza", meaning: "the connection (train); coincidence" },
  { term: "in anticipo", meaning: "early, ahead of time", example: "Sono arrivata in anticipo." },
  { term: "la tessera", meaning: "the membership card, pass" },
  { term: "ritirare", meaning: "to pick up, to collect", example: "Devo ritirare un pacco." },
  { term: "il preventivo", meaning: "the quote, estimate", tags: ["money"] },
  { term: "rimandare", meaning: "to postpone", example: "Rimandiamo a domani?" },
  { term: "la bolletta", meaning: "the utility bill", tags: ["money"] },
  { term: "il cassetto", meaning: "the drawer" },
  { term: "rovesciare", meaning: "to spill, to knock over", example: "Ho rovesciato il caffè." },
  {
    term: "sfogliare",
    meaning: "to leaf through",
    example: "Sfogliava il giornale senza leggerlo.",
  },
  { term: "il portafoglio", meaning: "the wallet" },
  { term: "la ruggine", meaning: "rust" },
]);

const ITALIAN_VERBS = lesson("Lezione 13", [
  { term: "riuscire a", meaning: "to manage to", example: "Non riesco a dormire." },
  { term: "mancare", meaning: "to miss; to be lacking", example: "Mi manchi." },
  { term: "servire", meaning: "to be needed", example: "Mi serve una penna." },
  { term: "bastare", meaning: "to be enough", example: "Basta così, grazie." },
  { term: "cavarsela", meaning: "to get by, to manage", tags: ["idiom"] },
  { term: "arrangiarsi", meaning: "to make do", tags: ["idiom"] },
  { term: "fregarsene", meaning: "to not care (colloquial)", tags: ["idiom"] },
  { term: "mettersi a", meaning: "to start doing", example: "Si è messa a ridere." },
  { term: "smettere di", meaning: "to stop doing", example: "Ha smesso di piovere." },
  { term: "tenerci a", meaning: "to care about", example: "Ci tengo molto." },
  { term: "farcela", meaning: "to make it, to succeed", example: "Ce l'abbiamo fatta!" },
  { term: "andarsene", meaning: "to leave, to go away", example: "Me ne vado." },
]);

const ITALIAN_MORE = lesson("Il Gattopardo, cap. 2", [
  { term: "il tramonto", meaning: "the sunset" },
  { term: "la panchina", meaning: "the bench" },
  { term: "spegnere", meaning: "to switch off, to put out" },
  { term: "accendere", meaning: "to switch on, to light" },
  { term: "il marciapiede", meaning: "the pavement" },
  { term: "la scorciatoia", meaning: "the shortcut" },
  { term: "bagnato", meaning: "wet" },
  { term: "asciutto", meaning: "dry" },
  { term: "il cuscino", meaning: "the pillow, cushion" },
  { term: "il lenzuolo", meaning: "the bedsheet" },
  { term: "il tovagliolo", meaning: "the napkin" },
  { term: "la briciola", meaning: "the crumb" },
  { term: "sbadigliare", meaning: "to yawn" },
  { term: "starnutire", meaning: "to sneeze" },
  { term: "la sveglia", meaning: "the alarm clock" },
  { term: "il traghetto", meaning: "the ferry" },
  { term: "il binario", meaning: "the platform, track" },
  { term: "lo sciopero", meaning: "the strike" },
  { term: "il semaforo", meaning: "the traffic light" },
  { term: "la scala", meaning: "the staircase; ladder" },
]);

const PORTUGUESE = lesson("Aula 3", [
  { term: "saudade", meaning: "longing for something absent", tags: ["noun"] },
  { term: "a padaria", meaning: "the bakery" },
  { term: "o troco", meaning: "the change (money)" },
  { term: "devagar", meaning: "slowly", example: "Fala devagar, por favor." },
  { term: "a fila", meaning: "the queue" },
  { term: "o guarda-chuva", meaning: "the umbrella" },
  { term: "combinar", meaning: "to arrange, to agree on", example: "Vamos combinar um horário." },
  { term: "a bagunça", meaning: "the mess" },
  { term: "o fim de semana", meaning: "the weekend" },
  { term: "cedo", meaning: "early", example: "Acordei cedo hoje." },
]);

const FINNISH = lesson("Suomen kurssi 1", [
  { term: "kiitos", meaning: "thank you", pronunciation: "KEE-tos" },
  { term: "lyhty", meaning: "lantern", notes: "Where the name Lymi comes from." },
  { term: "sisu", meaning: "grit, stubborn courage" },
  { term: "kesämökki", meaning: "summer cottage" },
  { term: "hiljaa", meaning: "quietly" },
  { term: "huomenna", meaning: "tomorrow" },
  { term: "kahvi", meaning: "coffee" },
  { term: "sade", meaning: "rain" },
]);

/** Cards without a language: no audio, no language-specific enrichment, everything else works. */
const NOTES: PersonaCard[] = [
  {
    term: "Passato prossimo vs imperfetto",
    meaning: "Prossimo for a completed event, imperfetto for background and habit.",
    meaningSource: "manual",
  },
  {
    term: "Formal you: Lei",
    meaning: "Third person singular, capital L in writing.",
    meaningSource: "manual",
  },
  {
    term: "Double consonants change meaning",
    meaning: "pena / penna, casa / cassa. Hold the consonant.",
    meaningSource: "manual",
  },
];

/** Italian with Ukrainian meanings, for the meaning-language setting and Cyrillic rendering. */
const ITALIAN_UK = lesson("Урок 4", [
  { term: "la finestra", meaning: "вікно" },
  { term: "il pane", meaning: "хліб", example: "Compro il pane ogni mattina." },
  { term: "camminare", meaning: "ходити пішки" },
  { term: "la chiave", meaning: "ключ" },
  { term: "piano", meaning: "повільно; тихо", example: "Parla piano, per favore." },
  { term: "il quaderno", meaning: "зошит" },
  { term: "la settimana", meaning: "тиждень" },
  { term: "ascoltare", meaning: "слухати" },
  { term: "la nuvola", meaning: "хмара" },
  { term: "il cucchiaio", meaning: "ложка" },
  { term: "presto", meaning: "рано; скоро", example: "A presto!" },
  { term: "stanco", meaning: "втомлений" },
]);

const FINNISH_UK = lesson("Suomi", [
  { term: "kiitos", meaning: "дякую" },
  { term: "lyhty", meaning: "ліхтар" },
  { term: "huomenna", meaning: "завтра" },
  { term: "kahvi", meaning: "кава" },
  { term: "sade", meaning: "дощ" },
]);

/** Cards an assistant added from a transcript today, still unseen in Activity. */
const ARRIVALS: PersonaCard[] = [
  {
    term: "il sopralluogo",
    meaning: "the site inspection",
    source: "Lezione 14 transcript",
    createdBy: "mcp",
    introducedDaysAgo: 0,
  },
  {
    term: "sbrigare",
    meaning: "to deal with, to get done",
    example: "Devo sbrigare alcune commissioni.",
    source: "Lezione 14 transcript",
    meaningSource: "lesson",
    createdBy: "mcp",
    introducedDaysAgo: 0,
  },
  {
    term: "la commissione",
    meaning: "the errand",
    source: "Lezione 14 transcript",
    createdBy: "mcp",
    introducedDaysAgo: 0,
  },
];

/** A newer lesson with pictures, important cards and memory hooks. */
const CASA: PersonaCard[] = lesson("Lezione 15", [
  { term: "la finestra", meaning: "the window", picture: "la finestra", important: true },
  { term: "la porta", meaning: "the door", picture: "la porta" },
  { term: "la lampada", meaning: "the lamp", picture: "la lampada" },
  {
    term: "il cassetto della cucina",
    meaning: "the kitchen drawer",
    hook: "A cassette tape hidden among the spoons.",
    important: true,
  },
  { term: "il divano", meaning: "the sofa", important: true },
  { term: "lo specchio", meaning: "the mirror", hook: "Spec-chio: you inspect yourself in it." },
  { term: "il tappeto", meaning: "the rug" },
  { term: "le scale", meaning: "the stairs", important: true },
  { term: "il bagno", meaning: "the bathroom" },
  { term: "il frigorifero", meaning: "the fridge" },
]);

const CITTA: PersonaCard[] = lesson("Lezione 16", [
  { term: "la piazza", meaning: "the square" },
  { term: "il ponte", meaning: "the bridge", important: true },
  { term: "la fermata", meaning: "the stop (bus, tram)" },
  { term: "il mercato", meaning: "the market" },
  { term: "la farmacia", meaning: "the pharmacy" },
  { term: "l'incrocio", meaning: "the crossroads" },
  { term: "il parcheggio", meaning: "the car park" },
  { term: "la biblioteca", meaning: "the library" },
]);

/** One card the learner archived, so Archived has something to show. */
const ARCHIVED_CARD: PersonaCard = {
  term: "il tramonto",
  meaning: "the sunset",
  source: "Lezione 12",
  meaningSource: "lesson",
  archived: true,
};

/** Repeats a sentence to exactly a field's limit, so the longest card the schema allows is seeded. */
const atLimit = (sentence: string, length: number): string =>
  sentence
    .repeat(Math.ceil(length / sentence.length))
    .slice(0, length)
    .trim()
    .padEnd(length, ".");

const LONG_CARDS: PersonaCard[] = [
  {
    term: "Da beißt die Maus keinen Faden ab",
    pronunciation: "da ˈbaɪ̯st diː ˈmaʊ̯s ˈkaɪ̯nən ˈfaːdn̩ ap",
    meaning:
      "There is no way around it; that is simply how it is. Said when a fact or decision is final, often with a note of resignation.",
    example:
      "Die Frist endet am Freitag, da beißt die Maus keinen Faden ab. Wir müssen den Antrag bis dahin einreichen, auch wenn noch Unterlagen fehlen.",
    notes:
      "Colloquial, more common in the south and in Austria.\nFrom a fable where a mouse cannot gnaw through the rope.\nCompare: that's that; no two ways about it.",
    tags: ["idiom"],
  },
  {
    term: "Wer den Pfennig nicht ehrt, ist des Talers nicht wert.",
    meaning: "Whoever does not value small amounts does not deserve large ones.",
    example:
      "Sie hebt jede Münze auf. Wer den Pfennig nicht ehrt, ist des Talers nicht wert, sagt sie.",
  },
  {
    term: "die Auseinandersetzung",
    pronunciation: "diː aʊ̯sʔaɪ̯nˈandɐˌzɛt͡sʊŋ",
    meaning:
      "1. An argument or dispute between people who disagree, sometimes heated.\n2. A close, critical engagement with a subject, text or idea: working through it rather than just reading it.\n3. In law, the division of shared property, for example after a partnership or an inheritance ends.",
    example:
      "Nach einer langen Auseinandersetzung mit dem Vermieter bekamen wir die Kaution zurück. Ihre Auseinandersetzung mit Kafka dauerte das ganze Semester, und am Ende schrieb sie eine Arbeit über seine Briefe.",
    // Markdown notes, so the formatted rendering is reachable locally.
    notes:
      "**Plural:** die Auseinandersetzungen\n*sich mit etwas auseinandersetzen*: to engage with something.\n\nNot the same as **der Streit**, which is always a quarrel; an *Auseinandersetzung* can be calm and scholarly.\n\nBuilt from:\n1. **aus**, out\n2. **einander**, each other\n3. **setzen**, to set\n\nCommon collocations:\n- eine *heftige* Auseinandersetzung\n- eine *sachliche* Auseinandersetzung\n- eine *juristische* Auseinandersetzung\n\nNot formatting: <b>tags</b>, # headings and [links](https://example.com) stay as typed.",
  },
  {
    term: atLimit(
      "Die Wendung beschreibt jemanden, der zu spät handelt und so tut, als wäre alles geplant. ",
      500,
    ),
    meaning: atLimit(
      "A deliberately long meaning that fills the field to its limit, to see how the card holds it. ",
      2000,
    ),
    pronunciation: atLimit("ˈvɛndʊŋ bəˈʃʁaɪ̯pt ", 200),
    example: atLimit(
      "Er kam eine Stunde zu spät und sagte, er habe den Zug absichtlich verpasst. ",
      2000,
    ),
    notes: atLimit("Notes at the field's limit, long enough to scroll on every screen. ", 2000),
    source: atLimit("Grammatik aktiv, Kapitel 12 ", 200),
  },
  {
    term: "Rechtsschutzversicherungsgesellschaften",
    meaning: "legal expenses insurance companies",
  },
  { term: "der Hund", meaning: "dog", example: "Der Hund schläft." },
];

/** A second published deck, so Explore has more than one deck on its Languages shelf. */
const FINNISH_A1: PersonaCard[] = [
  { term: "aamiainen", meaning: "breakfast", section: "Arki" },
  { term: "kiitos", meaning: "thank you", section: "Arki" },
  { term: "hyvää huomenta", meaning: "good morning", section: "Arki" },
  { term: "juna", meaning: "train", section: "Arki" },
  { term: "leipä", meaning: "bread", section: "Kaupassa" },
  { term: "maito", meaning: "milk", section: "Kaupassa" },
  { term: "paljonko tämä maksaa?", meaning: "how much does this cost?", section: "Kaupassa" },
  { term: "kassa", meaning: "the till", section: "Kaupassa" },
];

/** A published deck on another shelf, so Explore renders more than one category. */
const DRIVING_ET: PersonaCard[] = [
  { term: "peatee", meaning: "priority road", section: "Märgid" },
  { term: "ülekäigurada", meaning: "pedestrian crossing", section: "Märgid" },
  { term: "keelumärk", meaning: "a prohibition sign", section: "Märgid" },
  { term: "teed andma", meaning: "to give way", section: "Teeandmine" },
  { term: "ristmik", meaning: "a junction", section: "Teeandmine" },
  { term: "foor", meaning: "traffic light", section: "Teeandmine" },
];

const everyDay = (from: number, to: number): number[] =>
  Array.from({ length: from - to + 1 }, (_, i) => to + i);

/** Estonian with English meanings, the original edition of the persona's published deck. */
const ESTONIAN_A1: PersonaCard[] = [
  { term: "tere", meaning: "hello", section: "Greetings", pronunciation: "TEH-reh" },
  { term: "tere hommikust", meaning: "good morning", section: "Greetings" },
  { term: "head aega", meaning: "goodbye", section: "Greetings" },
  { term: "aitäh", meaning: "thank you", section: "Greetings" },
  { term: "palun", meaning: "please; you're welcome", section: "Greetings" },
  { term: "leib", meaning: "bread", section: "In the shop" },
  { term: "piim", meaning: "milk", section: "In the shop" },
  { term: "vesi", meaning: "water", section: "In the shop" },
  { term: "kui palju see maksab?", meaning: "how much does it cost?", section: "In the shop" },
  { term: "kott", meaning: "bag", section: "In the shop" },
  { term: "buss", meaning: "bus", section: "Getting around" },
  { term: "rong", meaning: "train", section: "Getting around" },
  { term: "kus on...?", meaning: "where is...?", section: "Getting around" },
  { term: "vasakule", meaning: "to the left", section: "Getting around" },
  { term: "paremale", meaning: "to the right", section: "Getting around" },
].map((card) => ({ ...card, language: "et", meaningSource: "lesson" as const }));

/** The same deck's Ukrainian edition: the terms are shared, only the meaning side is written. */
const ESTONIAN_A1_UK: Record<string, string> = {
  tere: "привіт",
  "tere hommikust": "доброго ранку",
  "head aega": "до побачення",
  aitäh: "дякую",
  palun: "будь ласка",
  leib: "хліб",
  piim: "молоко",
  vesi: "вода",
  "kui palju see maksab?": "скільки це коштує?",
  kott: "сумка",
  buss: "автобус",
  rong: "потяг",
  "kus on...?": "де знаходиться...?",
  vasakule: "ліворуч",
  paremale: "праворуч",
};

/**
 * Japanese decks under the slugs Lymi publishes them as, small and in production's publish order,
 * so Welcome's Japanese offer and its beginner order can be seen locally.
 */
const japanese = (cards: PersonaCard[]): PersonaCard[] =>
  cards.map((card) => ({ ...card, language: "ja", meaningSource: "lesson" as const }));

const TRAVEL_JA = japanese([
  { term: "駅", pronunciation: "えき", meaning: "station" },
  { term: "切符", pronunciation: "きっぷ", meaning: "ticket" },
  { term: "電車", pronunciation: "でんしゃ", meaning: "train" },
  { term: "いくらですか", meaning: "how much is it?" },
  { term: "すみません", meaning: "excuse me" },
]);

const KANA_JA = japanese([
  { term: "あ", meaning: "a", section: "Hiragana: vowels" },
  { term: "い", meaning: "i", section: "Hiragana: vowels" },
  { term: "う", meaning: "u", section: "Hiragana: vowels" },
  { term: "え", meaning: "e", section: "Hiragana: vowels" },
  { term: "お", meaning: "o", section: "Hiragana: vowels" },
  { term: "ア", meaning: "a", section: "Katakana: vowels" },
  { term: "イ", meaning: "i", section: "Katakana: vowels" },
  { term: "ウ", meaning: "u", section: "Katakana: vowels" },
  { term: "エ", meaning: "e", section: "Katakana: vowels" },
  { term: "オ", meaning: "o", section: "Katakana: vowels" },
]);

const CORE_JA = japanese([
  { term: "時間", pronunciation: "じかん", meaning: "time" },
  { term: "友達", pronunciation: "ともだち", meaning: "friend" },
  { term: "仕事", pronunciation: "しごと", meaning: "work" },
  { term: "店", pronunciation: "みせ", meaning: "shop" },
]);

const N5_JA = japanese([
  { term: "家族", pronunciation: "かぞく", meaning: "family" },
  { term: "学校", pronunciation: "がっこう", meaning: "school" },
  {
    term: "食べる",
    pronunciation: "たべる",
    meaning: "to eat",
    example: "毎朝[まいあさ]パンを食[た]べます。",
    notes: "ichidan verb · 食べます",
  },
  { term: "水", pronunciation: "みず", meaning: "water" },
]);

const N4_JA = japanese([
  { term: "準備", pronunciation: "じゅんび", meaning: "preparation" },
  { term: "届ける", pronunciation: "とどける", meaning: "to deliver" },
  { term: "経験", pronunciation: "けいけん", meaning: "experience" },
  { term: "急ぐ", pronunciation: "いそぐ", meaning: "to hurry" },
]);

export const personas: Persona[] = [
  {
    id: "fresh",
    group: "Start",
    name: "Fresh",
    description: "Just signed up. No decks, nothing due, the first-run screens.",
    appLanguage: "en",
    reviewDays: [],
    dueNow: 0,
    decks: [],
  },
  {
    id: "learner",
    group: "Everyday",
    name: "Kateryna",
    description:
      "A little of everything: three weeks in, a series, pictures, important cards, hooks, cards from an assistant, a deck shared by Noor and one from Explore.",
    appLanguage: "en",
    // Misses 18 and 7 days ago are rest days; 13 and 5 fall within a week of one and break the run, so the streak (4) and the best run (7) differ.
    reviewDays: [21, 20, 19, 17, 16, 15, 14, 12, 11, 10, 9, 8, 6, 4, 3, 2, 1],
    dueNow: 9,
    decks: [
      {
        name: "Lezione 12",
        description: "Errands and paperwork.",
        defaultLanguage: "it",
        introducedDaysAgo: 21,
        cards: [...ITALIAN_LESSON, ...ARRIVALS, ARCHIVED_CARD],
      },
      {
        name: "Verbi",
        defaultLanguage: "it",
        directions: "both",
        introducedDaysAgo: 14,
        cards: ITALIAN_VERBS,
      },
      {
        name: "Portuguese",
        defaultLanguage: "pt-BR",
        introducedDaysAgo: 9,
        cards: PORTUGUESE,
      },
      {
        name: "Casa",
        description: "Rooms and things at home.",
        defaultLanguage: "it",
        introducedDaysAgo: 7,
        cards: CASA,
      },
      {
        name: "In città",
        defaultLanguage: "it",
        introducedDaysAgo: 5,
        cards: CITTA,
      },
      {
        name: "Lista vecchia",
        defaultLanguage: "it",
        introducedDaysAgo: 30,
        archived: true,
        cards: ITALIAN_MORE.slice(1, 4),
      },
    ],
    series: [{ name: "Italiano A2", decks: ["Casa", "In città"] }],
    // Not Everyday Estonian: the phone's row-menus recipe adds that one from Explore.
    explore: [{ slug: "everyday-finnish" }],
  },
  {
    id: "streak",
    group: "Everyday",
    name: "Sanna",
    description: "Fourteen days running and nothing due today. The small flame stays lit.",
    appLanguage: "en",
    reviewDays: everyDay(13, 0),
    dueNow: 0,
    decks: [
      {
        name: "Suomen kurssi",
        defaultLanguage: "fi",
        introducedDaysAgo: 20,
        cards: FINNISH,
      },
      {
        name: "Italiano",
        defaultLanguage: "it",
        directions: "both",
        introducedDaysAgo: 18,
        cards: [...ITALIAN_LESSON, ...ITALIAN_VERBS.slice(0, 6)],
      },
    ],
  },
  {
    id: "rested",
    group: "Everyday",
    name: "Leena",
    description:
      "Eleven days running through two rest days, the last one yesterday. Today opens on the rest-day banner.",
    appLanguage: "en",
    // Misses 9 days ago and yesterday, eight days apart, so both are rest days.
    reviewDays: [13, 12, 11, 10, 8, 7, 6, 5, 4, 3, 2],
    dueNow: 9,
    decks: [
      {
        name: "Suomen kurssi",
        defaultLanguage: "fi",
        introducedDaysAgo: 14,
        cards: FINNISH,
      },
    ],
  },
  {
    id: "backlog",
    group: "Everyday",
    name: "Marco",
    description: "Back after a month away. Everything is due at once.",
    appLanguage: "en",
    reviewDays: everyDay(60, 34),
    dueNow: "all",
    decks: [
      {
        name: "Lezione 12",
        defaultLanguage: "it",
        introducedDaysAgo: 60,
        cards: ITALIAN_LESSON,
      },
      {
        name: "Verbi",
        defaultLanguage: "it",
        introducedDaysAgo: 55,
        cards: ITALIAN_VERBS,
      },
      {
        name: "Il Gattopardo",
        description: "Chapter two.",
        defaultLanguage: "it",
        introducedDaysAgo: 48,
        cards: ITALIAN_MORE,
      },
      {
        name: "Portuguese",
        defaultLanguage: "pt-BR",
        introducedDaysAgo: 45,
        cards: PORTUGUESE,
      },
    ],
  },
  {
    id: "long",
    group: "Scale and edges",
    name: "Ingrid",
    description:
      "Long cards: sentences as terms, dictionary-length meanings, every field at its limit.",
    appLanguage: "en",
    reviewDays: [],
    dueNow: "all",
    decks: [
      {
        name: "Lange Karten",
        defaultLanguage: "de",
        directions: "both",
        introducedDaysAgo: 3,
        cards: LONG_CARDS,
      },
    ],
  },
  {
    id: "polyglot",
    group: "Languages",
    name: "Оксана",
    description: "Ukrainian interface and meanings. Italian, Finnish, and a deck with no language.",
    appLanguage: "uk",
    reviewDays: [6, 5, 3, 2, 1],
    dueNow: 4,
    decks: [
      {
        name: "Італійська",
        defaultLanguage: "it",
        introducedDaysAgo: 8,
        cards: ITALIAN_UK,
      },
      {
        name: "Suomi",
        defaultLanguage: "fi",
        introducedDaysAgo: 6,
        cards: FINNISH_UK,
      },
      {
        name: "Нотатки",
        description: "Grammar notes. No language, so no audio.",
        defaultLanguage: null,
        introducedDaysAgo: 4,
        cards: NOTES,
      },
    ],
  },
  {
    id: "publisher",
    group: "Together",
    name: "Lymi",
    description:
      "The publisher account. Estonian, Finnish, driving and Japanese decks; one in English and Ukrainian editions.",
    appLanguage: "en",
    reviewDays: [],
    dueNow: 0,
    decks: [
      {
        name: "Everyday Estonian",
        description: "Words and phrases for your first weeks in Estonia.",
        defaultLanguage: "et",
        introducedDaysAgo: 30,
        sections: ["Greetings", "In the shop", "Getting around"],
        cards: ESTONIAN_A1,
        publication: {
          slug: "everyday-estonian",
          summary: "Words and phrases for your first weeks in Estonia.",
          category: "languages",
          tags: ["core-words", "beginner"],
          publisher: "Lymi",
          meaningLanguage: "en",
          editions: [
            {
              language: "uk",
              name: "Естонська на щодень",
              summary: "Слова та фрази на перші тижні в Естонії.",
              description: "Слова та фрази на перші тижні в Естонії.",
              sections: {
                Greetings: "Вітання",
                "In the shop": "У магазині",
                "Getting around": "У дорозі",
              },
              meanings: ESTONIAN_A1_UK,
            },
          ],
        },
      },
      {
        name: "Everyday Finnish",
        description: "Home, work and the shop, in the words people use.",
        defaultLanguage: "fi",
        introducedDaysAgo: 24,
        sections: ["Arki", "Kaupassa"],
        cards: FINNISH_A1,
        publication: {
          slug: "everyday-finnish",
          summary: "Home, work and the shop, in the words people use.",
          category: "languages",
          tags: ["core-words", "conversation"],
          publisher: "Lymi",
          meaningLanguage: "en",
        },
      },
      {
        name: "Driving theory, Estonia",
        description: "Signs, right of way and the questions the test repeats.",
        defaultLanguage: "et",
        introducedDaysAgo: 18,
        sections: ["Märgid", "Teeandmine"],
        cards: DRIVING_ET,
        publication: {
          slug: "driving-theory-estonia",
          summary: "Signs, right of way and the questions the test repeats.",
          category: "driving",
          tags: ["beginner"],
          publisher: "Lymi",
          meaningLanguage: "en",
        },
      },
      {
        name: "Japanese Essentials",
        description: "Stations, tickets and the phrases a first trip needs.",
        defaultLanguage: "ja",
        introducedDaysAgo: 12,
        cards: TRAVEL_JA,
        publication: {
          slug: "travel-japanese",
          summary: "Stations, tickets and the phrases a first trip needs.",
          category: "languages",
          tags: ["travel", "beginner"],
          publisher: "Lymi",
          meaningLanguage: "en",
        },
      },
      {
        name: "Read Japanese Kana",
        description: "Hiragana and katakana, sign by sign, with the sound of each.",
        defaultLanguage: "ja",
        introducedDaysAgo: 11,
        sections: ["Hiragana: vowels", "Katakana: vowels"],
        cards: KANA_JA,
        publication: {
          slug: "read-japanese-kana",
          summary: "Hiragana and katakana, sign by sign, with the sound of each.",
          category: "languages",
          tags: ["alphabet", "beginner"],
          publisher: "Lymi",
          meaningLanguage: "en",
        },
      },
      {
        name: "Core Japanese Words",
        description: "Everyday words worth knowing first.",
        defaultLanguage: "ja",
        introducedDaysAgo: 10,
        cards: CORE_JA,
        publication: {
          slug: "core-japanese-words",
          summary: "Everyday words worth knowing first.",
          category: "languages",
          tags: ["core-words"],
          publisher: "Lymi",
          meaningLanguage: "en",
        },
      },
      {
        name: "Japanese N5 Vocabulary Practice",
        description: "Words for the JLPT N5.",
        defaultLanguage: "ja",
        introducedDaysAgo: 9,
        cards: N5_JA,
        publication: {
          slug: "japanese-n5-vocabulary-practice",
          summary: "Words for the JLPT N5.",
          category: "languages",
          tags: ["exam-jlpt-n5", "beginner"],
          publisher: "Lymi",
          meaningLanguage: "en",
        },
      },
      {
        name: "Japanese N4 Vocabulary",
        description: "Words for the JLPT N4.",
        defaultLanguage: "ja",
        introducedDaysAgo: 8,
        cards: N4_JA,
        publication: {
          slug: "japanese-n4-vocabulary",
          summary: "Words for the JLPT N4.",
          category: "languages",
          tags: ["core-words"],
          publisher: "Lymi",
          meaningLanguage: "en",
        },
      },
    ],
  },
  HEAVY,
  JAPANESE,
  SHARED,
  JOINING,
];

/** Every account a seed may need: the personas and the companions that fill their people lists. */
export const accounts: Persona[] = [...personas, ...COMPANIONS];

export function accountPersona(id: string): Persona | undefined {
  return accounts.find((p) => p.id === id);
}

/** How many decks the persona's Library holds once seeded: its own, the shared ones and Explore's. */
export function librarySize(p: Persona): number {
  const own = p.decks.filter((d) => !d.archived).length;
  const shared = accounts
    .filter((owner) => owner.id !== p.id)
    .flatMap((owner) => owner.decks)
    .filter((d) => !d.archived && d.people?.members.includes(p.id)).length;
  return own + shared + (p.explore?.length ?? 0);
}
