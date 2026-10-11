// A learner's week, held on the device for the proof of concept. The real app reads the same
// shapes from the Worker through the shared API client.

export type CardState = "new" | "learning" | "known";

export interface DemoCard {
  id: string;
  deck: string;
  term: string;
  meaning: string;
  example?: string;
  section?: string;
  state: CardState;
  due: boolean;
}

export interface DemoDeck {
  id: string;
  name: string;
  language: string;
  flag: string;
}

export const DECKS: DemoDeck[] = [
  { id: "eesti", name: "Eesti keel", language: "Estonian", flag: "🇪🇪" },
  { id: "pt", name: "Portuguese", language: "Portuguese", flag: "🇵🇹" },
];

export const CARDS: DemoCard[] = [
  {
    id: "c1",
    deck: "eesti",
    term: "igatsema",
    meaning: "to miss, to long for",
    example: "Ma igatsen kodu.",
    section: "Tund 6",
    state: "learning",
    due: true,
  },
  {
    id: "c2",
    deck: "pt",
    term: "saudade",
    meaning: "longing for something absent",
    section: "Aula 3",
    state: "learning",
    due: true,
  },
  {
    id: "c3",
    deck: "eesti",
    term: "vihmavari",
    meaning: "umbrella",
    example: "Võta vihmavari kaasa!",
    section: "Tund 5",
    state: "known",
    due: true,
  },
  {
    id: "c4",
    deck: "eesti",
    term: "mõnus",
    meaning: "pleasant, cosy",
    example: "Siin on nii mõnus.",
    section: "Tund 6",
    state: "learning",
    due: true,
  },
  {
    id: "c5",
    deck: "pt",
    term: "madrugada",
    meaning: "the small hours, after midnight",
    example: "Acordei de madrugada.",
    section: "Aula 3",
    state: "known",
    due: true,
  },
  {
    id: "c6",
    deck: "eesti",
    term: "tänavu",
    meaning: "this year",
    example: "Tänavu oli soe suvi.",
    section: "Tund 4",
    state: "known",
    due: true,
  },
  {
    id: "c7",
    deck: "eesti",
    term: "kiirustama",
    meaning: "to hurry",
    example: "Ära kiirusta!",
    section: "Tund 5",
    state: "learning",
    due: true,
  },
  {
    id: "c8",
    deck: "pt",
    term: "aconchegante",
    meaning: "cosy, snug",
    section: "Aula 2",
    state: "known",
    due: true,
  },
  {
    id: "c9",
    deck: "eesti",
    term: "rahulik",
    meaning: "calm, peaceful",
    example: "Täna on rahulik päev.",
    section: "Tund 4",
    state: "known",
    due: true,
  },
  {
    id: "c10",
    deck: "eesti",
    term: "harjutama",
    meaning: "to practise",
    section: "Tund 6",
    state: "new",
    due: false,
  },
  {
    id: "c11",
    deck: "eesti",
    term: "sõbralik",
    meaning: "friendly",
    section: "Tund 6",
    state: "new",
    due: false,
  },
  {
    id: "c12",
    deck: "pt",
    term: "desenrascar",
    meaning: "to improvise your way out of a fix",
    section: "Aula 3",
    state: "new",
    due: false,
  },
];

/** Reviews on each of the last six days, oldest first. Today is added from the store. */
export const PAST_WEEK = [12, 0, 31, 27, 25, 40];
export const STREAK_BEFORE_TODAY = 4;
export const DAILY_GOAL = 25;
