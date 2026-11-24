import { numberWords } from "./estonian-numbers";
import { MONTHS, ordinalOn, ordinalWords } from "./estonian-ordinals";
import { ALL_TIMES, type ClockTime, timeClip, timeSentence, timeWords } from "./estonian-time";
import { KIT_EXPLORE_TEXTS } from "./kit-explore";
import { withPronouns } from "./pronouns";

/**
 * Every sound a lesson plays, by lesson and clip id, with the Estonian it says. Read by
 * `pnpm --filter @lymi/site lesson:audio`, which records what is new or changed with the
 * product's Estonian voice into `public/audio/estonian-lessons/<lesson>/<clip>.mp3`.
 */
export const CLIP_ROOT = "/audio/estonian-lessons";

/** A word's clip id: its letters, with õ ä ö ü š ž spelled out so file names stay ASCII. */
export function clipId(text: string): string {
  return text
    .toLowerCase()
    .replace(/õ/g, "o3")
    .replace(/ä/g, "a2")
    .replace(/ö/g, "o2")
    .replace(/ü/g, "u2")
    .replace(/š/g, "s5")
    .replace(/ž/g, "z5")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function clipUrl(lesson: string, id: string): string {
  return `${CLIP_ROOT}/${lesson}/${id}.mp3`;
}

/** Where a passage's sentence timings sit, beside its recording. */
export function timingUrl(lesson: string, id: string): string {
  return `${CLIP_ROOT}/${lesson}/${id}.json`;
}

/**
 * The voices a lesson records with: `main` is the product's Estonian voice, `second` the other
 * speaker in a dialogue; the design doc's Sound section says who `third` and `fourth` are.
 */
export type LessonVoice = "main" | "second" | "third" | "fourth";

export interface ConversationTurn {
  voice: LessonVoice;
  text: string | readonly string[];
  say?: string;
}

export interface Conversation {
  turns: readonly ConversationTurn[];
  clips?: readonly string[];
}

export interface Passage {
  sentences: readonly string[];
  voice?: LessonVoice;
}

/**
 * A clip: a word or sentence in the main voice; a line in a chosen voice; a passage, several
 * sentences recorded as one take; or a conversation, its turns recorded together as a dialogue.
 */
export type Clip = string | { text: string; voice: LessonVoice } | Passage | Conversation;

export function turnSentences(turn: ConversationTurn): readonly string[] {
  return typeof turn.text === "string" ? [turn.text] : turn.text;
}

/** What a clip says, as it is sent to be recorded. */
export function clipText(clip: Clip): string {
  if (typeof clip === "string") return clip;
  return "text" in clip ? clip.text : clipSentences(clip).join(" ");
}

export function clipVoice(clip: Exclude<Clip, Conversation>): LessonVoice {
  return typeof clip === "string" ? "main" : (clip.voice ?? "main");
}

/** A passage is one take whose sentences are timed. */
export function isPassage(clip: Clip): clip is Passage {
  return typeof clip !== "string" && "sentences" in clip;
}

export function isConversation(clip: Clip): clip is Conversation {
  return typeof clip !== "string" && "turns" in clip;
}

export function clipSentences(clip: Passage | Conversation): readonly string[] {
  return isConversation(clip) ? clip.turns.flatMap(turnSentences) : clip.sentences;
}

const words = (list: readonly string[]) =>
  Object.fromEntries(list.map((word) => [clipId(word), word]));

export const HAALDUS_WORDS = [
  "aken",
  "ema",
  "isa",
  "onu",
  "uks",
  "õun",
  "ämblik",
  "öö",
  "üks",
  "kõrv",
  "korv",
  "jälg",
  "jalg",
  "tüli",
  "tuli",
  "sada",
  "saada",
  "koli",
  "kooli",
  "vana",
  "kana",
  "kanna",
  "lina",
  "linna",
  "tule",
  "tuule",
  "kool",
  "tee",
  "te",
  "kass",
  "kas",
  "maa",
  "ma",
  "linn",
  "Tallinn",
  "raamatukogu",
  "tere",
  "aitäh",
  "jah",
  "Eesti",
] as const;

export const HAALDUS_APART = [
  { first: "uks", second: "üks", kind: "vowel" },
  { first: "jälg", second: "jalg", kind: "vowel" },
  { first: "tuli", second: "tüli", kind: "vowel" },
  { first: "sada", second: "saada", kind: "length" },
  { first: "kooli", second: "koli", kind: "length" },
  { first: "tuule", second: "tule", kind: "length" },
  { first: "tüli", second: "tüli", kind: "same" },
  { first: "kanna", second: "kanna", kind: "same" },
  { first: "korv", second: "korv", kind: "same" },
  { first: "saada", second: "saada", kind: "same" },
] as const;

export type ApartKind = (typeof HAALDUS_APART)[number]["kind"];

export const apartSaid = ({ first, second }: { first: string; second: string }) =>
  `${capital(first)}, ${second}.`;

export const HAALDUS_TALK: Conversation = {
  turns: [
    { voice: "third", text: "Tere, Jaan!" },
    { voice: "main", text: "Tere, ema!" },
    { voice: "third", text: ["Tule linna.", "Kanna korv kooli."] },
    { voice: "main", text: "Korv kooli? Jah." },
    { voice: "third", text: "Ja üks õun." },
    { voice: "main", text: "Üks õun? Jah." },
    { voice: "third", text: "Aitäh!" },
  ],
};

export const HAALDUS_SENTENCES = ["Jaan", "ja", "Tule linna.", "Kanna korv kooli."] as const;

/** The numbers the numbers lesson says on their own. */
export const SPOKEN_NUMBERS: readonly number[] = [
  ...Array.from({ length: 101 }, (_, n) => n),
  150,
  200,
  365,
  999,
  1000,
  1918,
  2026,
  4500,
  12000,
];

/** Numbers inside sentences, as a learner hears them in town. */
export const NUMBER_SENTENCES = {
  "c-kassid": "Mul on kolm kassi.",
  "c-hind": "See maksab kaksteist eurot.",
  "c-vanus": "Ma olen kolmkümmend neli aastat vana.",
  "c-korter": "Minu korteri number on kuusteist.",
  "c-aasta": "Aastas on kolmsada kuuskümmend viis päeva.",
  "c-tund": "Tunnis on kuuskümmend minutit.",
  "c-klass": "Klassis on kakskümmend kaks õpilast.",
  "c-telefon": "Minu number on viis, kaks, null, üheksa, neli.",
  "c-kohv": "Kohv maksab kolm eurot ja viiskümmend senti.",
} as const;

export const numberClip = (n: number) => `n${n}`;

export const NUMBER_ALIKE = [
  [2, 6],
  [8, 9],
  [12, 16],
  [18, 19],
  [20, 60],
  [80, 90],
] as const;

export const NUMBER_WRITTEN = [14, 17, 30, 50, 27, 43, 68, 91] as const;

export const NUMBER_PASSAGE = [
  "Tere! Minu nimi on Jaan.",
  "Ma olen kolmkümmend kaks aastat vana.",
  "Minu korteri number on kaheksateist.",
  "Minu number on viis, kuus, kaks, null, üheksa.",
  "Mul on kaks kassi.",
  "Kohv maksab kaks eurot ja viiskümmend senti.",
] as const;

export const NUMBER_DRILLED = [
  "viisteist",
  "viiskümmend",
  "seitseteist",
  "seitsekümmend",
  "üheksateist",
  "üheksakümmend",
  "kaks",
  "kuus",
  "kaheksa",
  "üheksa",
  "kakskümmend seitse",
  "nelikümmend kolm",
  "kuuskümmend kaheksa",
  "üheksakümmend üks",
  "kuusteist",
  "kuuskümmend",
  "nelisada",
  "tuhat",
  "kolm tuhat",
  "kolmsada",
  "Mul on kaks kassi.",
  "Mul on kuus kassi.",
  "Kohv maksab kaks eurot.",
  "Kohv maksab kuus eurot.",
] as const;

/** The week from Monday, as the days lesson shows it. */
export const WEEK = [
  "esmaspäev",
  "teisipäev",
  "kolmapäev",
  "neljapäev",
  "reede",
  "laupäev",
  "pühapäev",
] as const;

export const PAEVAD_WORDS = [
  ...WEEK,
  "päev",
  "nädal",
  "esimene",
  "teine",
  "kolm",
  "neli",
  "püha",
  "avatud",
  "suletud",
  "täna",
  "homme",
  "eile",
  "ülehomme",
  "üleeile",
  "esmaspäeval",
] as const;

export const PAEVAD_PASSAGE = [
  "Tere, Mari!",
  "Täna on kolmapäev.",
  "Ma olen täna tööl.",
  "Homme on neljapäev.",
  "Ma olen homme kodus.",
  "Ülehomme on reede.",
  "Ma olen ülehomme linnas.",
] as const;

/** What day it is, and the day after: “Täna on reede.” “Homme on laupäev.” */
export const PAEVAD_SENTENCES = [
  "Mis päev täna on?",
  ...WEEK.map((day) => `Täna on ${day}.`),
  ...WEEK.map((day) => `Homme on ${day}.`),
  "Ülehomme on laupäev.",
];

export const dayAnswers = (said: string): [string, ...string[]] => [said];

export const dayTranslations = (said: string): [string, ...string[]] => {
  const [when = "", , day = ""] = said.replace(/\.$/, "").split(" ");
  return [said, `${day.charAt(0).toUpperCase()}${day.slice(1)} on ${when.toLowerCase()}.`];
};
/** The negation lesson's present-tense verbs, each by its stem: the I form of the present without its -n. */
export const NEGATION_VERBS = [
  { inf: "lugema", stem: "loe" },
  { inf: "rääkima", stem: "räägi" },
  { inf: "töötama", stem: "tööta" },
  { inf: "sööma", stem: "söö" },
  { inf: "elama", stem: "ela" },
  { inf: "õppima", stem: "õpi" },
  { inf: "tegema", stem: "tee" },
  { inf: "ootama", stem: "oota" },
  { inf: "armastama", stem: "armasta" },
  { inf: "jooma", stem: "joo" },
] as const;

/** The six short pronouns, each with the present-tense ending it takes. */
export const PERSON_ENDINGS = [
  ["ma", "n"],
  ["sa", "d"],
  ["ta", "b"],
  ["me", "me"],
  ["te", "te"],
  ["nad", "vad"],
] as const;

export type Person = (typeof PERSON_ENDINGS)[number][0];

const sentenceCase = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;

/** The present-tense ending a person takes: -n for ma, -vad for nad. */
export const endingOf = (person: Person): string =>
  PERSON_ENDINGS.find(([each]) => each === person)?.[1] ?? "";

/** “Ma loen.”, or with `no`, “Ma ei loe.” */
export function verbSentence(person: Person, stem: string, no: boolean): string {
  return sentenceCase(no ? `${person} ei ${stem}` : `${person} ${stem}${endingOf(person)}`);
}

/** The verbs the yes-and-no switch flips for all six people. */
export const FLIP_STEMS = ["loe", "räägi", "tööta", "söö"] as const;

/** Who says each sentence of the “make it no” quiz. */
export const NO_QUIZ: readonly (readonly [string, Person])[] = [
  ["loe", "nad"],
  ["räägi", "te"],
  ["tööta", "ta"],
  ["söö", "me"],
  ["õpi", "ma"],
  ["oota", "sa"],
  ["joo", "ta"],
  ["ela", "nad"],
];

/** Sentences with olema, each said three ways: yes, ei ole and pole. */
export const OLEMA_ROWS = [
  { who: "Ma", verb: "olen", rest: "väsinud" },
  { who: "Sa", verb: "oled", rest: "valmis" },
  { who: "Ta", verb: "on", rest: "kodus" },
  { who: "Nad", verb: "on", rest: "õpetajad" },
] as const;

export type OlemaMode = "yes" | "ei ole" | "pole";

export const olemaSentence = (row: (typeof OLEMA_ROWS)[number], mode: OlemaMode) =>
  `${row.who} ${mode === "yes" ? row.verb : mode} ${row.rest}.`;

/**
 * Yes-or-no questions and the short no that answers each. The three misses keep the ending, pick
 * another verb, or both, so the answer takes the rule and the question's verb together.
 */
export const NO_ANSWERS = [
  {
    ask: "Kas sa loed?",
    answer: "Ei loe.",
    wrong: ["Ei loed.", "Ei oota.", "Ei ootad."],
  },
  {
    ask: "Kas sa töötad?",
    answer: "Ei tööta.",
    wrong: ["Ei töötad.", "Ei joo.", "Ei jood."],
  },
  {
    ask: "Kas te sööte?",
    answer: "Ei söö.",
    wrong: ["Ei sööte.", "Ei õpi.", "Ei õpite."],
  },
  {
    ask: "Kas ta räägib eesti keelt?",
    answer: "Ei räägi.",
    wrong: ["Ei räägib.", "Ei loe.", "Ei loeb."],
  },
  {
    ask: "Kas sa oled väsinud?",
    answer: "Ei ole.",
    wrong: ["Ei oled.", "Ei ela.", "Ei elad."],
  },
  {
    ask: "Kas ta on kodus?",
    answer: "Ei ole.",
    wrong: ["Ei on.", "Ei oota.", "Ei ootab."],
  },
  {
    ask: "Kas nad joovad?",
    answer: "Ei joo.",
    wrong: ["Ei joovad.", "Ei söö.", "Ei söövad."],
  },
  {
    ask: "Kas te ootate?",
    answer: "Ei oota.",
    wrong: ["Ei ootate.", "Ei tööta.", "Ei töötate."],
  },
  {
    ask: "Kas sa õpid?",
    answer: "Ei õpi.",
    wrong: ["Ei õpid.", "Ei räägi.", "Ei räägid."],
  },
] as const;

export const NEGATION_TURNED = [
  { yes: "Ma elan Tallinnas.", no: "Ma ei ela Tallinnas.", person: "ma" },
  { yes: "Sa õpid eesti keelt.", no: "Sa ei õpi eesti keelt.", person: "sa" },
  { yes: "Ta räägib eesti keelt.", no: "Ta ei räägi eesti keelt.", person: "ta" },
  { yes: "Me ootame bussi.", no: "Me ei oota bussi.", person: "me" },
  { yes: "Te töötate kodus.", no: "Te ei tööta kodus.", person: "te" },
  { yes: "Nad joovad kohvi.", no: "Nad ei joo kohvi.", person: "nad" },
  { yes: "Ma loen raamatut.", no: "Ma ei loe raamatut.", person: "ma" },
  { yes: "Nad söövad kodus.", no: "Nad ei söö kodus.", person: "nad" },
] as const;

export const NEGATION_FIXES = [
  { wrong: "Ma ei elan Tallinnas.", said: "Ma ei ela Tallinnas.", kind: "verb" },
  { wrong: "Ta ei räägib eesti keelt.", said: "Ta ei räägi eesti keelt.", kind: "verb" },
  { wrong: "Nad ei joovad kohvi.", said: "Nad ei joo kohvi.", kind: "verb" },
  { wrong: "Me ei ootame bussi.", said: "Me ei oota bussi.", kind: "verb" },
  { wrong: "Sa ei õpid eesti keelt.", said: "Sa ei õpi eesti keelt.", kind: "verb" },
  { wrong: "Ta ei on kodus.", said: "Ta ei ole kodus.", kind: "olema" },
  { wrong: "Me ei oleme kodus.", said: "Me ei ole kodus.", kind: "olema" },
  { wrong: "Nad ei on õpetajad.", said: "Nad ei ole õpetajad.", kind: "olema" },
] as const;

export const NEGATION_TALK: Conversation = {
  turns: [
    { voice: "second", text: "Kas sa loed?" },
    { voice: "main", text: ["Ei, ma ei loe.", "Ma olen väsinud."] },
    { voice: "second", text: "Kas sa jood kohvi?" },
    { voice: "main", text: ["Ei joo.", "Ma joon vett."] },
    { voice: "second", text: "Kas Peeter on kodus?" },
    { voice: "main", text: ["Pole.", "Ta töötab."] },
  ],
};

/** Other things the negation lesson says: answers, and a sentence worth keeping. */
export const NEGATION_PHRASES = [
  "Ei.",
  "Jah.",
  "Ei, ma ei loe.",
  "Pole.",
  "Ma ei tea.",
  "Ma ei räägi eesti keelt.",
] as const;

/** The questions lesson's words, heard on their own. */
export const KUSIMUSED_WORDS = [
  "kas",
  "kes",
  "mis",
  "kus",
  "millal",
  "miks",
  "kuidas",
  "kui palju",
  "kust",
  "jah",
  "ei",
  "täna",
  "homme",
  "kodus",
  "sest",
  "natuke",
  "hästi",
  "pärit",
  "Tallinnas",
  "Tartus",
  "või",
  "su",
  "sinu",
] as const;

export const KUS_SA_TOOTAD = [
  "Kus sa töötad?",
  "Kus te töötate?",
  "Kus sina töötad?",
  "Kus teie töötate?",
  "Kus töötad?",
  "Kus töötate?",
  "Kus töötad sa?",
  "Kus töötate te?",
  "Kus töötad sina?",
  "Kus töötate teie?",
] as const;

export const KUSIMUSED_ASKED = [
  {
    word: "kes",
    reply: "Mari elab Tartus.",
    answers: [
      "Kes elab Tartus?",
      "Kus Mari elab?",
      "Kus elab Mari?",
      "Kus ta elab?",
      "Kus tema elab?",
      "Kes Tartus elab?",
      "Kus elab ta?",
      "Kus elab tema?",
    ],
  },
  {
    word: "mis",
    reply: "Ma joon kohvi.",
    answers: [
      "Mis sa jood?",
      "Mida sa jood?",
      "Mis te joote?",
      "Mida te joote?",
      "Mis sina jood?",
      "Mida sina jood?",
      "Mis teie joote?",
      "Mida teie joote?",
      "Mis jood?",
      "Mida jood?",
      "Mis sa teed?",
      "Mida sa teed?",
      "Mis te teete?",
      "Mida te teete?",
      "Mis sina teed?",
      "Mida sina teed?",
      "Mis teie teete?",
      "Mida teie teete?",
      "Mis teed?",
      "Mida teed?",
      "Mis joote?",
      "Mida joote?",
      "Mis teete?",
      "Mida teete?",
      "Mis jood sa?",
      "Mida jood sa?",
      "Mis joote te?",
      "Mida joote te?",
      "Mis jood sina?",
      "Mida jood sina?",
      "Mis joote teie?",
      "Mida joote teie?",
      "Mis teed sa?",
      "Mida teed sa?",
      "Mis teete te?",
      "Mida teete te?",
      "Mis teed sina?",
      "Mida teed sina?",
      "Mis teete teie?",
      "Mida teete teie?",
    ],
  },
  {
    word: "kus",
    reply: "Ma töötan Tartus.",
    answers: KUS_SA_TOOTAD,
  },
  {
    word: "millal",
    reply: "Nad töötavad homme.",
    answers: [
      "Millal nad töötavad?",
      "Millal nemad töötavad?",
      "Kes töötab homme?",
      "Kes homme töötab?",
      "Mis nad homme teevad?",
      "Mida nad homme teevad?",
      "Mis nemad homme teevad?",
      "Mida nemad homme teevad?",
      "Millal töötavad nad?",
      "Millal töötavad nemad?",
      "Mis teevad nad homme?",
      "Mida teevad nad homme?",
      "Mis teevad nemad homme?",
      "Mida teevad nemad homme?",
      "Kes töötavad homme?",
      "Kes homme töötavad?",
    ],
  },
  {
    word: "miks",
    reply: "Ma olen kodus, sest ma olen väsinud.",
    answers: [
      "Miks sa oled kodus?",
      "Miks sa kodus oled?",
      "Miks te olete kodus?",
      "Miks te kodus olete?",
      "Miks sina oled kodus?",
      "Miks sina kodus oled?",
      "Miks teie olete kodus?",
      "Miks teie kodus olete?",
      "Miks oled kodus?",
      "Miks olete kodus?",
      "Kus sa oled?",
      "Kus te olete?",
      "Kus sina oled?",
      "Kus teie olete?",
      "Miks kodus oled?",
      "Miks kodus olete?",
      "Kus oled?",
      "Kus olete?",
      "Miks oled sa kodus?",
      "Miks olete te kodus?",
      "Miks oled sina kodus?",
      "Miks olete teie kodus?",
      "Kus oled sa?",
      "Kus olete te?",
      "Kus oled sina?",
      "Kus olete teie?",
    ],
  },
  {
    word: "kuidas",
    reply: "Ma räägin eesti keelt hästi.",
    answers: [
      "Kuidas sa eesti keelt räägid?",
      "Kuidas sa räägid eesti keelt?",
      "Kuidas te eesti keelt räägite?",
      "Kuidas te räägite eesti keelt?",
      "Kuidas sina eesti keelt räägid?",
      "Kuidas sina räägid eesti keelt?",
      "Kuidas teie eesti keelt räägite?",
      "Kuidas eesti keelt räägid?",
      "Kuidas räägid eesti keelt?",
      "Kuidas eesti keelt räägite?",
      "Kuidas teie räägite eesti keelt?",
      "Kuidas räägite eesti keelt?",
      "Kuidas räägid sa eesti keelt?",
      "Kuidas räägite te eesti keelt?",
      "Kuidas räägid sina eesti keelt?",
      "Kuidas räägite teie eesti keelt?",
    ],
  },
  {
    word: "kui palju",
    reply: "Nad joovad palju kohvi.",
    answers: [
      "Kui palju kohvi nad joovad?",
      "Kui palju nad kohvi joovad?",
      "Kui palju nad joovad kohvi?",
      "Kui palju kohvi nemad joovad?",
      "Kui palju nemad kohvi joovad?",
      "Kui palju nemad joovad kohvi?",
      "Kui palju nad joovad?",
      "Kui palju nemad joovad?",
      "Kes joob palju kohvi?",
      "Kes palju kohvi joob?",
      "Mis nad joovad?",
      "Mida nad joovad?",
      "Mis nemad joovad?",
      "Mida nemad joovad?",
      "Kui palju kohvi joovad nad?",
      "Kui palju kohvi joovad nemad?",
      "Kui palju joovad nad?",
      "Kui palju joovad nemad?",
      "Mis joovad nad?",
      "Mida joovad nad?",
      "Mis joovad nemad?",
      "Mida joovad nemad?",
      "Kes joovad palju kohvi?",
      "Kes palju kohvi joovad?",
    ],
  },
] as const;

export const KUSIMUSED_TRANSLATED = [
  {
    kind: "kas",
    answers: [
      "Kas te elate Tartus?",
      "Kas teie elate Tartus?",
      "Kas elate Tartus?",
      "Kas te Tartus elate?",
      "Kas teie Tartus elate?",
      "Kas Tartus elate?",
      "Elate te Tartus?",
      "Elate teie Tartus?",
    ],
  },
  {
    kind: "word",
    answers: KUS_SA_TOOTAD,
  },
  {
    kind: "kas",
    answers: [
      "Kas ta räägib eesti keelt?",
      "Kas tema räägib eesti keelt?",
      "Kas ta eesti keelt räägib?",
      "Kas tema eesti keelt räägib?",
      "Räägib ta eesti keelt?",
      "Räägib tema eesti keelt?",
    ],
  },
  { kind: "word", answers: ["Kes räägib eesti keelt?", "Kes eesti keelt räägib?"] },
  {
    kind: "kas",
    answers: [
      "Kas sa töötad kodus?",
      "Kas te töötate kodus?",
      "Kas sina töötad kodus?",
      "Kas teie töötate kodus?",
      "Kas töötad kodus?",
      "Kas töötate kodus?",
      "Kas sa kodus töötad?",
      "Kas te kodus töötate?",
      "Kas sina kodus töötad?",
      "Kas teie kodus töötate?",
      "Kas kodus töötad?",
      "Kas kodus töötate?",
      "Töötad sa kodus?",
      "Töötate te kodus?",
      "Töötad sina kodus?",
      "Töötate teie kodus?",
      "Töötad kodus?",
      "Töötate kodus?",
    ],
  },
  { kind: "word", answers: ["Kus ta on?", "Kus tema on?", "Kus on ta?", "Kus on tema?"] },
  {
    kind: "kas",
    answers: [
      "Kas nad joovad kohvi?",
      "Kas nemad joovad kohvi?",
      "Kas nad kohvi joovad?",
      "Kas nemad kohvi joovad?",
      "Joovad nad kohvi?",
      "Joovad nemad kohvi?",
    ],
  },
  {
    kind: "word",
    answers: [
      "Mis sa loed?",
      "Mida sa loed?",
      "Mis te loete?",
      "Mida te loete?",
      "Mis sina loed?",
      "Mida sina loed?",
      "Mida teie loete?",
      "Mis loed?",
      "Mida loed?",
      "Mis teie loete?",
      "Mis loete?",
      "Mida loete?",
      "Mis loed sa?",
      "Mida loed sa?",
      "Mis loete te?",
      "Mida loete te?",
      "Mis loed sina?",
      "Mida loed sina?",
      "Mis loete teie?",
      "Mida loete teie?",
    ],
  },
] as const;

export const KUSIMUSED_TALK: Conversation = {
  turns: [
    { voice: "second", text: ["Tere!", "Mis su nimi on?"] },
    { voice: "main", text: ["Minu nimi on Jaan.", "Aga sinu?"] },
    { voice: "second", text: ["Kati.", "Kust sa pärit oled?"] },
    { voice: "main", text: "Ma olen pärit Ukrainast." },
    { voice: "second", text: "Kas sa elad Tallinnas?" },
    { voice: "main", text: "Ei, ma elan Tartus." },
    { voice: "second", text: "Miks sa eesti keelt õpid?" },
    { voice: "main", text: "Sest ma töötan Tartus." },
  ],
};

/** The questions lesson's sentences: statements, questions and their answers. */
export const KUSIMUSED_SENTENCES = {
  "s-elad": "Sa elad Tallinnas.",
  "q-elad": "Kas sa elad Tallinnas?",
  "s-raagid": "Sa räägid eesti keelt.",
  "q-raagid": "Kas sa räägid eesti keelt?",
  "s-kodus": "Ta on kodus.",
  "q-kodus": "Kas ta on kodus?",
  "s-kohv": "Sa jood kohvi.",
  "q-kohv": "Kas sa jood kohvi?",
  "s-tootavad": "Nad töötavad täna.",
  "q-tootavad": "Kas nad töötavad täna?",
  "c-voi": "Sa elad Tallinnas või?",
  "a-jah": "Jah.",
  "a-ei": "Ei.",
  "a-ei-ole": "Ei ole.",
  "a-ei-tea": "Ma ei tea.",
  "q-kes": "Kes see on?",
  "a-kes": "See on Jaan.",
  "q-mis": "Mis see on?",
  "a-mis": "See on raamat.",
  "q-kus": "Kus sa elad?",
  "a-kus": "Tallinnas.",
  "q-millal": "Millal sa töötad?",
  "a-millal": "Homme.",
  "q-miks": "Miks sa eesti keelt õpid?",
  "a-miks": "Sest ma elan Tallinnas.",
  "q-kuidas": "Kuidas sa eesti keelt õpid?",
  "a-kuidas": "Ma loen palju.",
  "q-kui-palju": "Kui palju kohvi sa jood?",
  "a-kui-palju": "Natuke.",
  "q-nimi": "Mis su nimi on?",
  "a-nimi": "Minu nimi on Mari.",
  "q-laheb": "Kuidas läheb?",
  "a-laheb": "Hästi, aitäh. Aga sul?",
  "q-parit": "Kust sa pärit oled?",
  "a-parit": "Ma olen pärit Ukrainast.",
  "w-kes-tartus": "Kes elab Tartus?",
  "w-kes-raagib": "Kes räägib eesti keelt?",
  "w-mis-teed": "Mis sa teed?",
  "w-mis-loed": "Mis sa loed?",
  "w-kus-tootab": "Kus ta töötab?",
  "w-kus-elate": "Kus te elate?",
  "w-millal-sood": "Millal sa sööd?",
  "w-millal-loed": "Millal sa loed?",
  "w-miks-ootad": "Miks sa ootad?",
  "w-miks-opib": "Miks ta eesti keelt õpib?",
  "w-kuidas-elad": "Kuidas sa elad?",
  "w-kuidas-raagib": "Kuidas ta eesti keelt räägib?",
  "w-palju-tootad": "Kui palju sa töötad?",
  "w-palju-vett": "Kui palju vett sa jood?",
} as const;

/** The six personal pronouns, long and short, with olema in the present for each. */
export const PRONOUNS = [
  { long: "mina", short: "ma", verb: "olen" },
  { long: "sina", short: "sa", verb: "oled" },
  { long: "tema", short: "ta", verb: "on" },
  { long: "meie", short: "me", verb: "oleme" },
  { long: "teie", short: "te", verb: "olete" },
  { long: "nemad", short: "nad", verb: "on" },
] as const;

/** The text with its first letter in capitals. */
export const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const withLongPronoun = (sentence: string) => {
  const [first = "", ...rest] = sentence.split(" ");
  const pronoun = PRONOUNS.find(({ short }) => short === first.toLowerCase());
  return pronoun ? [capital(pronoun.long), ...rest].join(" ") : sentence;
};

export function pronounOrders(said: string): [string, ...string[]] {
  const stop = said.slice(-1);
  const [first = "", verb = "", ...words] = said.slice(0, -1).split(" ");
  const short = first.toLowerCase();
  const { long } = PRONOUNS.find((each) => each.short === short) as (typeof PRONOUNS)[number];
  const rest = words.join(" ");
  const front = capital(rest);
  const drops = short !== "ta" && short !== "nad";
  return [
    said,
    `${capital(long)} ${verb} ${rest}${stop}`,
    ...(drops ? [`${capital(verb)} ${rest}${stop}`, `${front} ${verb}${stop}`] : []),
    ...[short, long].map((pronoun) => `${front} ${verb} ${pronoun}${stop}`),
    ...[short, long].map((pronoun) => `${front} ${pronoun} ${verb}${stop}`),
  ];
}

/** A pronoun said with its form of olema, as one clip: “Ma olen”. */
export const pronounWithOlema = (pronoun: string, verb: string) => capital(`${pronoun} ${verb}`);

/** Sentences with a pronoun and olema, some with the pronoun dropped. */
export const PRONOUN_SENTENCES = {
  "c-kes": "Kes? Mina!",
  "c-mari": "Ma olen Mari.",
  "c-olen-mari": "Olen Mari.",
  "c-liis": "Mina olen Liis ja tema on Peeter.",
  "s-olen-kodus": "Olen kodus.",
  "s-ma-valmis": "Ma olen valmis.",
  "s-oled-tubli": "Oled väga tubli.",
  "s-sa-sober": "Sa oled hea sõber.",
  "s-ta-opetaja": "Ta on õpetaja.",
  "s-ta-vasinud": "Ta on väsinud.",
  "s-oleme-valmis": "Oleme valmis.",
  "s-me-sobrad": "Me oleme sõbrad.",
  "s-olete-tublid": "Olete väga tublid.",
  "s-te-opetajad": "Te olete õpetajad.",
  "s-nad-kodus": "Nad on kodus.",
  "s-nad-vasinud": "Nad on väsinud.",
} as const;

export const PRONOUN_BUILT = [
  { pronoun: "ma", word: "õpetaja", said: "Ma olen õpetaja." },
  { pronoun: "sa", word: "õpetaja", said: "Sa oled õpetaja." },
  { pronoun: "ta", word: "kodus", said: "Ta on kodus." },
  { pronoun: "me", word: "väsinud", said: "Me oleme väsinud." },
  { pronoun: "te", word: "valmis", said: "Te olete valmis." },
  { pronoun: "nad", word: "õpetajad", said: "Nad on õpetajad." },
  { pronoun: "ma", word: "kodus", said: "Ma olen kodus." },
  { pronoun: "sa", word: "kodus", said: "Sa oled kodus." },
  { pronoun: "ta", word: "valmis", said: "Ta on valmis." },
  { pronoun: "me", word: "kodus", said: "Me oleme kodus." },
  { pronoun: "te", word: "väsinud", said: "Te olete väsinud." },
  { pronoun: "nad", word: "valmis", said: "Nad on valmis." },
] as const;

export const PRONOUN_DRILLED = [
  "s-olen-kodus",
  "s-oled-tubli",
  "s-ta-opetaja",
  "s-oleme-valmis",
  "s-olete-tublid",
  "s-nad-kodus",
  "s-ta-vasinud",
  "s-te-opetajad",
] as const satisfies readonly (keyof typeof PRONOUN_SENTENCES)[];

export const PRONOUN_HEARD = [
  { said: "Olen kodus.", who: "ma" },
  { said: "Ma olen väsinud.", who: "ma" },
  { said: "Sa oled kodus.", who: "sa" },
  { said: "Sa oled õpetaja.", who: "sa" },
  { said: "Ta on õpetaja.", who: "ta" },
  { said: "Ta on väsinud.", who: "ta" },
  { said: "Oleme valmis.", who: "me" },
  { said: "Me oleme kodus.", who: "me" },
  { said: "Te olete õpetajad.", who: "te" },
  { said: "Te olete väsinud.", who: "te" },
  { said: "Nad on kodus.", who: "nad" },
  { said: "Nad on väsinud.", who: "nad" },
] as const;

export const PRONOUN_PASSAGE = [
  "Tere! Mina olen Liis.",
  "Ma olen õpetaja.",
  "Tema on Peeter.",
  "Ta on väsinud.",
  "Peeter ja mina oleme sõbrad.",
  "Mari ja Jaan on kodus.",
  "Nad on väsinud.",
] as const;

/** The verbs of the present-tense lesson: the -ma infinitive and the stem the endings go on. */
export const PRESENT_VERBS = [
  { verb: "elama", stem: "ela" },
  { verb: "õppima", stem: "õpi" },
  { verb: "lugema", stem: "loe" },
  { verb: "tegema", stem: "tee" },
  { verb: "rääkima", stem: "räägi" },
  { verb: "töötama", stem: "tööta" },
  { verb: "ootama", stem: "oota" },
  { verb: "armastama", stem: "armasta" },
  { verb: "sööma", stem: "söö" },
  { verb: "jooma", stem: "joo" },
] as const;

/** The six persons, short pronoun first, with the present-tense ending each takes. */
export const PRESENT_ENDINGS = [
  { pronoun: "ma", ending: "n" },
  { pronoun: "sa", ending: "d" },
  { pronoun: "ta", ending: "b" },
  { pronoun: "me", ending: "me" },
  { pronoun: "te", ending: "te" },
  { pronoun: "nad", ending: "vad" },
] as const;

/** A short pronoun with its verb in the present, as one clip: “Ma loen”. */
export const presentWithPronoun = (pronoun: string, stem: string, ending: string) =>
  `${pronoun.charAt(0).toUpperCase()}${pronoun.slice(1)} ${stem}${ending}`;

/** Everyday sentences in the present, some with the pronoun dropped. */
export const PRESENT_SENTENCES = {
  "s-elan-tallinnas": "Ma elan Tallinnas.",
  "c-elan-tallinnas": "Elan Tallinnas.",
  "s-opin-eesti": "Ma õpin eesti keelt.",
  "c-opin-eesti": "Õpin eesti keelt.",
  "s-mida-teed": "Mida sa teed?",
  "s-loen-raamatut": "Ma loen raamatut.",
  "s-raagib-eesti": "Ta räägib eesti keelt.",
  "s-ootame-bussi": "Me ootame bussi.",
  "s-tootab-kodus": "Ta töötab kodus.",
  "s-joovad-kohvi": "Nad joovad kohvi.",
  "s-armastan-sind": "Ma armastan sind.",
  "s-raagite-hasti": "Te räägite väga hästi.",
  "s-soovad-kodus": "Nad söövad kodus.",
  "c-mina-joon": "Mina joon kohvi, tema joob vett.",
} as const;

export const PRESENT_TURNED = [
  { from: "s-elan-tallinnas", to: "te", said: "Te elate Tallinnas." },
  { from: "s-opin-eesti", to: "sa", said: "Sa õpid eesti keelt." },
  { from: "s-loen-raamatut", to: "me", said: "Me loeme raamatut." },
  { from: "s-raagib-eesti", to: "nad", said: "Nad räägivad eesti keelt." },
  { from: "s-ootame-bussi", to: "ta", said: "Ta ootab bussi." },
  { from: "s-tootab-kodus", to: "me", said: "Me töötame kodus." },
  { from: "s-joovad-kohvi", to: "ta", said: "Ta joob kohvi." },
  { from: "s-soovad-kodus", to: "te", said: "Te sööte kodus." },
] as const;

export const PRESENT_FIXES = [
  { wrong: "Mida sa teged?", said: "Mida sa teed?", kind: "stem" },
  { wrong: "Ma õppin eesti keelt.", said: "Ma õpin eesti keelt.", kind: "stem" },
  { wrong: "Ma rääkin eesti keelt.", said: "Ma räägin eesti keelt.", kind: "stem" },
  { wrong: "Nad elab Tallinnas.", said: "Nad elavad Tallinnas.", kind: "ending" },
  { wrong: "Ta räägivad eesti keelt.", said: "Ta räägib eesti keelt.", kind: "ending" },
  { wrong: "Me ootavad bussi.", said: "Me ootame bussi.", kind: "ending" },
  { wrong: "Te räägid väga hästi.", said: "Te räägite väga hästi.", kind: "ending" },
  { wrong: "Ta töötavad kodus.", said: "Ta töötab kodus.", kind: "ending" },
] as const;

export const PRESENT_PASSAGE = [
  "Tere! Mina olen Jaan.",
  "Ma elan Tallinnas ja töötan kodus.",
  "Mari õpib eesti keelt.",
  "Ta räägib väga hästi.",
  "Me joome kohvi ja räägime eesti keelt.",
] as const;

/**
 * The places of the lesson on -s and -l: each word as a learner meets it, and whole in the form
 * that says where you are. Checked in ÕS 2025 on Sõnaveeb: Saksamaa, Saaremaa, Otepää and
 * Lasnamäe take the outer cases.
 */
export const KOHAD_PLACES = [
  { place: "Eesti", where: "Eestis" },
  { place: "Soome", where: "Soomes" },
  { place: "Ukraina", where: "Ukrainas" },
  { place: "Tallinn", where: "Tallinnas" },
  { place: "Tartu", where: "Tartus" },
  { place: "Pärnu", where: "Pärnus" },
  { place: "kodu", where: "kodus" },
  { place: "kool", where: "koolis" },
  { place: "kontor", where: "kontoris" },
  { place: "haigla", where: "haiglas" },
  { place: "kohvik", where: "kohvikus" },
  { place: "linn", where: "linnas" },
  { place: "laud", where: "laual" },
  { place: "sein", where: "seinal" },
  { place: "töö", where: "tööl" },
  { place: "turg", where: "turul" },
  { place: "Saaremaa", where: "Saaremaal" },
  { place: "Saksamaa", where: "Saksamaal" },
  { place: "Otepää", where: "Otepääl" },
  { place: "Lasnamäe", where: "Lasnamäel" },
] as const;

/** The sentences of the lesson on -s and -l. */
export const KOHAD_SENTENCES = {
  "s-elan-tallinnas": "Ma elan Tallinnas.",
  "q-elad": "Kus sa elad?",
  "a-elan-tartus": "Ma elan Tartus.",
  "a-tartus": "Tartus.",
  "q-tootad": "Kus sa töötad?",
  "a-tootan-koolis": "Ma töötan koolis.",
  "q-on": "Kus ta on?",
  "a-on-kodus": "Ta on kodus.",
  "w-kodus": "Ma töötan kodus.",
  "w-kontoris": "Ma töötan kontoris.",
  "w-haiglas": "Ma töötan haiglas.",
  "w-kohvikus": "Ma töötan kohvikus.",
  "w-linnas": "Ma töötan linnas.",
  "l-laual": "Raamat on laual.",
  "l-seinal": "Pilt on seinal.",
  "l-tool": "Ma olen tööl.",
  "l-turul": "Ema on turul.",
  "l-saaremaal": "Me elame Saaremaal.",
  "l-saksamaal": "Nad elavad Saksamaal.",
  "h-haiglas": "Mari töötab haiglas.",
  "h-parnus": "Jaan elab Pärnus.",
  "h-kodus": "Me oleme kodus.",
  "h-tartus": "Nad õpivad Tartus.",
  "h-kohvikus": "Ta joob kohvikus kohvi.",
  "h-kontoris": "Te töötate kontoris.",
  "h-soomes": "Ma elan Soomes.",
  "h-koolis": "Ta õpib koolis.",
  "h-eestis": "Me elame Eestis.",
  "h-linnas": "Nad söövad linnas.",
  "g-eestis": "Ma elan Eestis.",
  "g-soomes": "Ta elab Soomes.",
  "g-tartus": "Me õpime Tartus.",
  "g-tallinnas": "Ma töötan Tallinnas.",
  "g-koolis": "Ta on koolis.",
  "g-kontoris": "Nad töötavad kontoris.",
} as const;

export const KOHAD_TYPED = [
  "Eesti",
  "Soome",
  "Tartu",
  "Pärnu",
  "kodu",
  "haigla",
  "Ukraina",
  "töö",
  "Saaremaa",
  "Saksamaa",
] as const;

export const KOHAD_ASKED = [
  {
    reply: "Jaan töötab haiglas.",
    answers: [
      "Kus Jaan töötab?",
      "Kus töötab Jaan?",
      "Kus ta töötab?",
      "Kus tema töötab?",
      "Kus töötab ta?",
      "Kus töötab tema?",
    ],
  },
  {
    reply: "Nad elavad Tartus.",
    answers: ["Kus nad elavad?", "Kus nemad elavad?", "Kus elavad nad?", "Kus elavad nemad?"],
  },
  {
    reply: "Isa on kontoris.",
    answers: [
      "Kus isa on?",
      "Kus on isa?",
      "Kus ta on?",
      "Kus tema on?",
      "Kus on ta?",
      "Kus on tema?",
    ],
  },
  {
    reply: "Mari töötab koolis.",
    answers: [
      "Kus Mari töötab?",
      "Kus töötab Mari?",
      "Kus ta töötab?",
      "Kus tema töötab?",
      "Kus töötab ta?",
      "Kus töötab tema?",
    ],
  },
  {
    reply: "Me elame Saaremaal.",
    answers: ["Kus te elate?", "Kus teie elate?", "Kus elate?", "Kus elate te?", "Kus elate teie?"],
  },
  {
    reply: "Ta õpib Tallinnas.",
    answers: ["Kus ta õpib?", "Kus tema õpib?", "Kus õpib ta?", "Kus õpib tema?"],
  },
] as const;

export const KOHAD_WRITTEN = [
  "Me elame Tartus.",
  "Isa on turul.",
  "Me elame Eestis.",
  "Nad on tööl.",
  "Pilt on laual.",
  "Ta õpib koolis.",
  "Mari töötab haiglas.",
  "Jaan elab Pärnus.",
  "Pilt on seinal.",
  "Nad õpivad Tartus.",
  "Me oleme Saaremaal.",
  "Ta töötab kontoris.",
] as const;

export const KOHAD_MESSAGE = [
  "Tere, Kati!",
  "Ma olen täna tööl.",
  "Ma töötan kohvikus.",
  "Jaan on kodus.",
  "Ema on turul.",
  "Isa on Tartus.",
  "Kus sina oled?",
] as const;

/**
 * The places of the lesson on -l, -le and -lt, each in the forms that answer kus, kuhu and kust.
 * Checked in ÕS 2025 on Sõnaveeb (EKI morphology, 21 Nov 2026).
 */
export const OUTER_PLACES = [
  { place: "laud", kus: "laual", kuhu: "lauale", kust: "laualt" },
  { place: "töö", kus: "tööl", kuhu: "tööle", kust: "töölt" },
  { place: "turg", kus: "turul", kuhu: "turule", kust: "turult" },
  { place: "Saaremaa", kus: "Saaremaal", kuhu: "Saaremaale", kust: "Saaremaalt" },
] as const;

/** Places that take -s, set beside the -l ones: what each says for where and where to. */
export const OUTER_INNER_PLACES = [
  { place: "kool", kus: "koolis", kuhu: "kooli" },
  { place: "pood", kus: "poes", kuhu: "poodi" },
  { place: "Tartu", kus: "Tartus", kuhu: "Tartusse" },
  { place: "haigla", kus: "haiglas", kuhu: "haiglasse" },
] as const;

/** The sentences of the lesson on -l, -le and -lt. */
export const OUTER_SENTENCES = {
  "s-lauale": "Kass hüppab lauale.",
  "s-laual": "Kass on laual.",
  "s-laualt": "Kass hüppab laualt põrandale.",
  "q-lahed": "Kuhu sa lähed?",
  "a-lahen-toole": "Ma lähen tööle.",
  "a-lahen-turule": "Ma lähen turule.",
  "q-tuled": "Kust sa tuled?",
  "a-tulen-toolt": "Ma tulen töölt.",
  "a-tulen-turult": "Ma tulen turult.",
  "c-toole-kooli": "Ma lähen tööle, aga Mari läheb kooli.",
  "c-toolt-koolist": "Ema tuleb töölt, aga isa tuleb koolist.",
  "p-emal-on": "Emal on kass.",
  "p-helistan-emale": "Ma helistan emale.",
  "p-helistan-sobrale": "Ma helistan sõbrale.",
  "p-kusin-emalt": "Ma küsin emalt.",
  "p-kusin-isalt": "Ma küsin isalt.",
} as const;

export const OUTER_TYPED = [
  { place: "laud", way: "kuhu" },
  { place: "töö", way: "kust" },
  { place: "turg", way: "kus" },
  { place: "Saaremaa", way: "kuhu" },
  { place: "laud", way: "kust" },
  { place: "töö", way: "kuhu" },
  { place: "turg", way: "kust" },
  { place: "Saaremaa", way: "kus" },
] as const satisfies readonly {
  place: (typeof OUTER_PLACES)[number]["place"];
  way: "kus" | "kuhu" | "kust";
}[];

export const OUTER_SAY = [
  { id: "toole", said: "Ma lähen tööle.", also: ["Lähen tööle.", "Mina lähen tööle."] },
  { id: "turult", said: "Ma tulen turult.", also: ["Tulen turult.", "Mina tulen turult."] },
  { id: "lauale", said: "Kass hüppab lauale.", also: ["Kass hüppab laua peale."] },
  { id: "emale", said: "Ma helistan emale.", also: ["Helistan emale.", "Mina helistan emale."] },
  { id: "isalt", said: "Ma küsin isalt.", also: ["Küsin isalt.", "Mina küsin isalt."] },
  {
    id: "saaremaal",
    said: "Me elame Saaremaal.",
    also: ["Meie elame Saaremaal.", "Elame Saaremaal."],
  },
] as const;

export const OUTER_FIX = [
  { id: "toole", wrong: "Ma lähen tööl.", right: "Ma lähen tööle.", also: [] },
  { id: "turult", wrong: "Ma tulen turul.", right: "Ma tulen turult.", also: [] },
  { id: "laual", wrong: "Kass on lauale.", right: "Kass on laual.", also: [] },
  { id: "emale", wrong: "Ma helistan emal.", right: "Ma helistan emale.", also: [] },
  { id: "emalt", wrong: "Ma küsin emal.", right: "Ma küsin emalt.", also: [] },
  { id: "turule", wrong: "Ma lähen turusse.", right: "Ma lähen turule.", also: [] },
] as const;

export const OUTER_TALK = {
  turns: [
    { voice: "fourth", text: ["Tere, Mari!", "Kus sa oled?"] },
    { voice: "third", text: "Ma olen turul." },
    { voice: "fourth", text: "Kas sa lähed täna tööle?" },
    { voice: "third", text: ["Ei, täna on laupäev.", "Ma lähen turult koju."] },
    { voice: "fourth", text: "Kas sa helistad emale?" },
    { voice: "third", text: ["Jah, ma helistan emale.", "Aga sina?"] },
    {
      voice: "fourth",
      text: "Ma lähen homme Saaremaale.",
      say: "[happy] Ma lähen homme Saaremaale.",
    },
    { voice: "third", text: "Kas su ema elab Saaremaal?" },
    {
      voice: "fourth",
      text: ["Jah, ema elab Saaremaal.", "Ma tulen esmaspäeval Saaremaalt tagasi.", "Head aega!"],
    },
  ],
} as const satisfies Conversation;

/** The gap passage: a Saturday with Mari, every gap filled. */
export const OUTER_PASSAGE = [
  "Täna on laupäev ja Mari ei lähe tööle.",
  "Ta läheb turule.",
  "Ta helistab emale.",
  "Isa on poes.",
  "Mari tuleb turult koju.",
  "Isa tuleb ka poest koju.",
] as const;

export const PLACE_WORDS = [
  { id: "peal", kus: "peal", kuhu: "peale", kust: "pealt" },
  { id: "all", kus: "all", kuhu: "alla", kust: "alt" },
  { id: "taga", kus: "taga", kuhu: "taha", kust: "tagant" },
  { id: "ees", kus: "ees", kuhu: "ette", kust: "eest" },
  { id: "korval", kus: "kõrval", kuhu: "kõrvale", kust: "kõrvalt" },
  { id: "sees", kus: "sees", kuhu: "sisse", kust: "seest" },
] as const;

export type PlaceWordId = (typeof PLACE_WORDS)[number]["id"];
export type PlaceDirection = "kus" | "kuhu" | "kust";

export const placeWordSentence = (
  word: (typeof PLACE_WORDS)[number],
  direction: PlaceDirection,
): string => {
  if (direction === "kus") return `Kass on kasti ${word.kus}.`;
  if (direction === "kust")
    return ["all", "taga", "sees"].includes(word.id)
      ? `Kass tuleb kasti ${word.kust} välja.`
      : word.id === "peal"
        ? `Kass tuleb kasti ${word.kust} maha.`
        : `Kass tuleb kasti ${word.kust} ära.`;
  return word.id === "peal" ? `Kass hüppab kasti ${word.kuhu}.` : `Kass läheb kasti ${word.kuhu}.`;
};

export const PLACE_WORD_SENTENCES = {
  "e-laua-peal": "Raamat on laua peal.",
  "e-laua-all": "Kass on laua all.",
  "e-maja-taga": "Auto on maja taga.",
  "e-poe-ees": "Ma ootan poe ees.",
  "e-kooli-korval": "Kohvik on kooli kõrval.",
  "e-raamatu-sees": "Raha on raamatu sees.",
  "e-laual": "Raamat on laual.",
  "e-kastis": "Kass on kastis.",
  "j-juures": "Ma olen ema juures.",
  "j-juurde": "Ma lähen ema juurde.",
  "j-juurest": "Ma tulen ema juurest.",
} as const;

export const PLACE_WORD_PASSAGE = [
  "Kus on Miisu?",
  "Miisu ei ole laua peal.",
  "Ta ei ole ka laua all.",
  "Ta tuleb kasti seest välja!",
  "Ta hüppab põrandalt laua peale.",
  "Ta hüppab laua pealt maha.",
  "Ta tuleb minu kõrvale istuma.",
] as const;

export const PLACE_WORD_TYPED = [
  { id: "taga", way: "kuhu" },
  { id: "ees", way: "kust" },
  { id: "sees", way: "kuhu" },
  { id: "all", way: "kuhu" },
  { id: "peal", way: "kust" },
  { id: "korval", way: "kuhu" },
  { id: "sees", way: "kust" },
  { id: "taga", way: "kust" },
] as const satisfies readonly { id: PlaceWordId; way: PlaceDirection }[];

export const PLACE_WORD_SAY = [
  { id: "all", said: "Kass on laua all.", also: ["Laua all on kass."] },
  { id: "taga", said: "Auto on maja taga.", also: ["Maja taga on auto."] },
  { id: "ees", said: "Ma ootan poe ees.", also: ["Ootan poe ees.", "Mina ootan poe ees."] },
  { id: "korval", said: "Kohvik on kooli kõrval.", also: ["Kooli kõrval on kohvik."] },
  {
    id: "sisse",
    said: "Kass läheb kasti sisse.",
    also: ["Kass läheb kasti.", "Kass läheb kastisse."],
  },
  {
    id: "juurde",
    said: "Ma lähen ema juurde.",
    also: ["Lähen ema juurde.", "Mina lähen ema juurde."],
  },
] as const;

export const PLACE_WORD_FIX = [
  { id: "laua", wrong: "Raamat on laud peal.", right: "Raamat on laua peal." },
  { id: "peale", wrong: "Kass hüppab kasti peal.", right: "Kass hüppab kasti peale." },
  { id: "seest", wrong: "Kass tuleb kasti sees välja.", right: "Kass tuleb kasti seest välja." },
  { id: "taga", wrong: "Auto on maja taha.", right: "Auto on maja taga." },
  { id: "poe", wrong: "Ma ootan pood ees.", right: "Ma ootan poe ees." },
  { id: "juures", wrong: "Ma olen ema juurde.", right: "Ma olen ema juures." },
] as const;

export const PLACE_WORD_TALK = {
  turns: [
    { voice: "fourth", text: "Mari, kus on minu raamat?" },
    { voice: "third", text: "Kas see on laua peal?" },
    { voice: "fourth", text: "Ei, laua peal on kohv." },
    { voice: "third", text: "Vaata laua alla!" },
    { voice: "fourth", text: "Laua all on Miisu.", say: "[laughs] Laua all on Miisu." },
    { voice: "third", text: "Ja kasti sees?" },
    { voice: "fourth", text: "Kasti sees on raha." },
    { voice: "third", text: "Kelle raha see on?", say: "[curious] Kelle raha see on?" },
    { voice: "fourth", text: "See on minu raha!" },
    { voice: "third", text: ["Oota!", "Raamat on minu juures."] },
    { voice: "fourth", text: ["Aitäh!", "Ma tulen sinu juurde."] },
    { voice: "third", text: "Ma olen maja ees." },
  ],
} as const satisfies Conversation;

export const PLACE_WORD_WORDS = [
  "Miisu",
  "kast",
  "kasti",
  "kass",
  "kus",
  "kuhu",
  "kust",
  "välja",
  "ära",
  "maha",
  "põrandalt",
  "istuma",
  "juures",
  "juurde",
  "juurest",
  "laud",
  "laua",
  "laual",
  "kastis",
  ...PLACE_WORDS.flatMap(({ kus, kuhu, kust }) => [kus, kuhu, kust]),
];

/** Words the lesson glosses on their own, beyond the places' forms. */
export const OUTER_WORDS = [
  "kus",
  "kuhu",
  "kust",
  "hüppab",
  "põrandal",
  "põrandale",
  "kass",
  "helistan",
  "küsin",
  "emale",
  "emalt",
  "sõbrale",
] as const;

/**
 * The practice lesson on meeting someone, built only from lessons 1 to 6. Mari speaks in the
 * second voice; the learner, Andres, in the main one.
 */
export const TUTVUMINE_ANSWERING = {
  "a-mari-1": {
    text: "Tere! Mina olen Mari. Mis su nimi on?",
    voice: "second",
  },
  "a-sina-1": "Tere! Minu nimi on Andres.",
  "a-mari-2": { text: "Väga meeldiv! Kust sa pärit oled?", voice: "second" },
  "a-sina-2": "Ma olen pärit Ukrainast.",
  "a-mari-3": { text: "Kus sa elad?", voice: "second" },
  "a-sina-3": "Ma elan Tartus.",
  "a-mari-4": { text: "Kas sa oled õpetaja?", voice: "second" },
  "a-sina-4": "Ei, ma ei ole. Ma töötan kontoris.",
  "a-mari-5": { text: "Kas sa räägid eesti keelt?", voice: "second" },
  "a-sina-5": "Natuke. Ma õpin eesti keelt.",
  "a-mari-6": { text: "Väga hästi! Head aega!", voice: "second" },
  "a-sina-6": "Aitäh! Head aega!",
} as const satisfies Record<string, Clip>;

/** The second conversation: the learner asks, and Mari answers. */
export const TUTVUMINE_ASKING = {
  "k-mari-1": { text: "Tere, Andres! Kuidas läheb?", voice: "second" },
  "k-sina-1": "Hästi, aitäh. Aga sul?",
  "k-mari-2": { text: "Ma olen natuke väsinud.", voice: "second" },
  "k-sina-2": "Miks sa oled väsinud?",
  "k-mari-3": { text: "Sest ma töötan palju.", voice: "second" },
  "k-sina-3": "Kus sa töötad?",
  "k-mari-4": { text: "Haiglas, Pärnus.", voice: "second" },
  "k-sina-4": "Kas sa elad Pärnus?",
  "k-mari-5": { text: "Ei, ma elan Tartus.", voice: "second" },
} as const satisfies Record<string, Clip>;

/** Jaan talks about himself and Kati; Kati writes back, a text with gaps. */
export const TUTVUMINE_PASSAGES = {
  jaan: [
    "Tere! Minu nimi on Jaan.",
    "Ma elan Pärnus.",
    "Ma ei tööta kontoris, ma töötan kohvikus.",
    "Minu sõber Kati elab Tallinnas.",
    "Ta ei tööta, ta õpib.",
    "Ta joob palju kohvi.",
  ],
  kati: [
    "Tere! Mina olen Kati.",
    "Ma elan Tallinnas.",
    "Ma ei tööta, ma õpin.",
    "Minu sõber Jaan töötab kohvikus.",
    "Ta ei ole kodus, ta on tööl.",
    "Me räägime eesti keelt.",
    "Aga sina? Kus sina elad?",
  ],
} as const;

export const TUTVUMINE_TALK: Conversation = {
  turns: [
    { voice: "second", text: ["Tere!", "Kas sa oled Peeter?"] },
    { voice: "main", text: "Jah, mina olen Peeter." },
    { voice: "second", text: ["Mina olen Liis.", "Kus sa elad?"] },
    { voice: "main", text: "Ma elan Tartus, aga ma töötan Tallinnas." },
    { voice: "second", text: "Kas sa räägid eesti keelt?" },
    { voice: "main", text: ["Natuke.", "Ma õpin eesti keelt."] },
    { voice: "second", text: ["Mina ei tööta.", "Ma õpin Tartus."] },
    { voice: "main", text: "Ja kus sina elad?" },
    { voice: "second", text: "Ma elan Pärnus." },
  ],
};

export const numberAnswers = (n: number): [string, ...string[]] => {
  const words = numberWords(n);
  if (n > 10 && n < 20) return [words, `${words}kümmend`];
  return n === 100 ? [words, "ükssada"] : n === 1000 ? [words, "üks tuhat"] : [words];
};

const HOUR_GENITIVES = [
  "ühe",
  "kahe",
  "kolme",
  "nelja",
  "viie",
  "kuue",
  "seitsme",
  "kaheksa",
  "üheksa",
  "kümne",
  "üheteistkümne",
  "kaheteistkümne",
] as const;

export const timeAnswers = (time: ClockTime): [string, ...string[]] => {
  const words = timeWords(time);
  const hour = numberWords(time.hour);
  const genitive = HOUR_GENITIVES[time.hour - 1];
  const next = numberWords((time.hour % 12) + 1);
  const nextGenitive = HOUR_GENITIVES[time.hour % 12];
  const read =
    time.minute === 0
      ? []
      : [`${hour} ${time.minute < 10 ? "null " : ""}${numberWords(time.minute)}`];
  const zeroes = time.minute === 0 ? [`${hour} null null`] : [];
  const past = [5, 10, 20].includes(time.minute)
    ? [
        `${numberWords(time.minute)} minutit üle ${genitive}`,
        `${numberWords(time.minute)} minutit ${nextGenitive} peal`,
      ]
    : time.minute === 15
      ? [
          `viisteist minutit ${hour} läbi`,
          `viisteist minutit üle ${genitive}`,
          `viisteist minutit ${nextGenitive} peal`,
        ]
      : time.minute === 45
        ? [`viieteist minuti pärast ${next}`]
        : [];
  return [
    words,
    `kell on ${words}`,
    `kell ${words}`,
    ...[...past, ...read, ...zeroes].flatMap((each) => [each, `kell on ${each}`, `kell ${each}`]),
  ];
};

export const TUTVUMINE_ASKED = [
  {
    kind: "mis",
    reply: "Minu nimi on Liis.",
    answers: [
      "Mis su nimi on?",
      "Mis sinu nimi on?",
      "Mis teie nimi on?",
      "Mis on su nimi?",
      "Mis on sinu nimi?",
      "Mis on teie nimi?",
      "Kes sa oled?",
      "Kes sina oled?",
      "Kes te olete?",
      "Kes teie olete?",
      "Kes oled?",
      "Kes olete?",
      "Kuidas su nimi on?",
      "Kuidas sinu nimi on?",
      "Kuidas teie nimi on?",
      "Kuidas on su nimi?",
      "Kuidas on sinu nimi?",
      "Kuidas on teie nimi?",
      "Mis te nimi on?",
      "Mis on te nimi?",
      "Kuidas te nimi on?",
      "Kuidas on te nimi?",
    ],
  },
  {
    kind: "kus",
    reply: "Ma elan Pärnus.",
    answers: [
      "Kus sa elad?",
      "Kus te elate?",
      "Kus sina elad?",
      "Kus teie elate?",
      "Kus elad?",
      "Kus elate?",
    ],
  },
  {
    kind: "kus",
    reply: "Ma töötan koolis.",
    answers: [
      "Kus sa töötad?",
      "Kus te töötate?",
      "Kus sina töötad?",
      "Kus teie töötate?",
      "Kus töötad?",
      "Kus töötate?",
    ],
  },
  {
    kind: "kas",
    reply: "Jah, ma räägin eesti keelt.",
    answers: [
      "Kas sa räägid eesti keelt?",
      "Kas te räägite eesti keelt?",
      "Kas sina räägid eesti keelt?",
      "Kas teie räägite eesti keelt?",
      "Kas räägid eesti keelt?",
      "Kas räägite eesti keelt?",
      "Sa räägid eesti keelt või?",
      "Te räägite eesti keelt või?",
      "Kas sa eesti keelt räägid?",
      "Kas te eesti keelt räägite?",
      "Sina räägid eesti keelt või?",
      "Teie räägite eesti keelt või?",
      "Kas sina eesti keelt räägid?",
      "Kas teie eesti keelt räägite?",
      "Kas eesti keelt räägid?",
      "Kas eesti keelt räägite?",
      "Räägid sa eesti keelt?",
      "Räägite te eesti keelt?",
      "Räägid sina eesti keelt?",
      "Räägite teie eesti keelt?",
      "Räägid eesti keelt?",
      "Räägite eesti keelt?",
      "Räägid eesti keelt või?",
      "Räägite eesti keelt või?",
      "Sa eesti keelt räägid või?",
      "Te eesti keelt räägite või?",
      "Sina eesti keelt räägid või?",
      "Teie eesti keelt räägite või?",
    ],
  },
  {
    kind: "kas",
    reply: "Ei, ma ei ole õpetaja.",
    answers: [
      "Kas sa oled õpetaja?",
      "Kas te olete õpetaja?",
      "Kas sina oled õpetaja?",
      "Kas teie olete õpetaja?",
      "Kas oled õpetaja?",
      "Kas olete õpetaja?",
      "Sa oled õpetaja või?",
      "Te olete õpetaja või?",
      "Kas sa õpetaja oled?",
      "Kas te õpetaja olete?",
      "Sina oled õpetaja või?",
      "Teie olete õpetaja või?",
      "Kas sina õpetaja oled?",
      "Kas teie õpetaja olete?",
      "Kas õpetaja oled?",
      "Kas õpetaja olete?",
      "Oled sa õpetaja?",
      "Olete te õpetaja?",
      "Oled sina õpetaja?",
      "Olete teie õpetaja?",
      "Oled õpetaja?",
      "Olete õpetaja?",
      "Oled õpetaja või?",
      "Olete õpetaja või?",
      "Sa õpetaja oled või?",
      "Te õpetaja olete või?",
      "Sina õpetaja oled või?",
      "Teie õpetaja olete või?",
    ],
  },
  { kind: "mis", reply: "Ma joon kohvi.", answers: KUSIMUSED_ASKED[1].answers },
] as const;

export const TUTVUMINE_TRANSLATED = [
  {
    kind: "ei",
    answers: [
      "Me ei tööta, me õpime.",
      "Meie ei tööta, me õpime.",
      "Me ei tööta, meie õpime.",
      "Meie ei tööta, meie õpime.",
      "Me ei tööta, õpime.",
      "Meie ei tööta, õpime.",
      "Me ei tööta, vaid õpime.",
      "Meie ei tööta, vaid õpime.",
      "Me ei tööta, vaid me õpime.",
      "Meie ei tööta, vaid me õpime.",
      "Me ei tööta, vaid meie õpime.",
      "Meie ei tööta, vaid meie õpime.",
    ],
  },
  {
    kind: "ei",
    answers: [
      "Ma ei ole kodus.",
      "Ma pole kodus.",
      "Mina ei ole kodus.",
      "Mina pole kodus.",
      "Mind ei ole kodus.",
      "Mind pole kodus.",
    ],
  },
  {
    kind: "place",
    answers: [
      "Me elame Tallinnas.",
      "Meie elame Tallinnas.",
      "Elame Tallinnas.",
      "Tallinnas me elame.",
      "Tallinnas meie elame.",
      "Tallinnas elame.",
    ],
  },
  { kind: "place", answers: ["Nad on tööl.", "Nemad on tööl."], confusable: ["tool"] },
  {
    kind: "ask",
    answers: [
      "Kas sa elad Tallinnas?",
      "Kas te elate Tallinnas?",
      "Kas sina elad Tallinnas?",
      "Kas teie elate Tallinnas?",
      "Kas elad Tallinnas?",
      "Kas elate Tallinnas?",
      "Kas sa Tallinnas elad?",
      "Kas te Tallinnas elate?",
      "Sa elad Tallinnas või?",
      "Te elate Tallinnas või?",
      "Sina elad Tallinnas või?",
      "Teie elate Tallinnas või?",
      "Kas sina Tallinnas elad?",
      "Kas teie Tallinnas elate?",
      "Kas Tallinnas elad?",
      "Kas Tallinnas elate?",
      "Elad sa Tallinnas?",
      "Elate te Tallinnas?",
      "Elad sina Tallinnas?",
      "Elate teie Tallinnas?",
      "Elad Tallinnas?",
      "Elate Tallinnas?",
      "Elad Tallinnas või?",
      "Elate Tallinnas või?",
      "Sa Tallinnas elad või?",
      "Te Tallinnas elate või?",
      "Sina Tallinnas elad või?",
      "Teie Tallinnas elate või?",
    ],
  },
  {
    kind: "kus",
    answers: ["Kus ta töötab?", "Kus tema töötab?", "Kus töötab ta?", "Kus töötab tema?"],
  },
] as const;

export const TUTVUMINE_FIXES = [
  { wrong: "Ma ei töötan kontoris.", said: "Ma ei tööta kontoris.", kind: "ei" },
  { wrong: "Ta elab Tartul.", said: "Ta elab Tartus.", kind: "place" },
  { wrong: "Nad on töös.", said: "Nad on tööl.", kind: "place", confusable: ["tool"] },
  { wrong: "Kas ta räägid eesti keelt?", said: "Kas ta räägib eesti keelt?", kind: "ask" },
  { wrong: "Kus Mari elad?", said: "Kus Mari elab?", kind: "kus" },
  { wrong: "Mina on Andres.", said: "Mina olen Andres.", kind: "olema" },
] as const;

export const TUTVUMINE_MESSAGE = [
  "Tere, Mari!",
  "Kuidas läheb?",
  "Mina olen Andres.",
  "Ma olen pärit Ukrainast.",
  "Ma elan Tartus ja töötan kontoris.",
  "Ma ei räägi palju eesti keelt.",
] as const;

/** Words and phrases with a card: the passage's words, and the phrases worth keeping. */
export const TUTVUMINE_WORDS = [
  "nimi",
  "elan",
  "elab",
  "Pärnus",
  "Tallinnas",
  "ei",
  "tööta",
  "töötan",
  "kontoris",
  "kohvikus",
  "sõber",
  "õpib",
  "joob",
  "palju",
  "kohvi",
  "Mis su nimi on?",
  "Väga meeldiv!",
  "Kust sa pärit oled?",
  "Kus sa elad?",
  "Kus sa töötad?",
  "Kas sa räägid eesti keelt?",
  "Natuke.",
  "Kuidas läheb?",
  "Hästi, aitäh. Aga sul?",
  "Miks?",
  "Sest",
  "Head aega!",
] as const;

export const KELL_PASSAGE = [
  "Tere, Jaan!",
  "Kell on pool kaks.",
  "Ma olen tööl.",
  "Ma olen kodus kell kolm.",
  "Me joome kohvi kell veerand viis.",
  "Me ootame bussi kell kolmveerand kuus.",
] as const;

export const KELL_HEARD: readonly ClockTime[] = [
  { hour: 6, minute: 0 },
  { hour: 10, minute: 0 },
  { hour: 3, minute: 15 },
  { hour: 5, minute: 45 },
  { hour: 1, minute: 45 },
  { hour: 8, minute: 10 },
  { hour: 4, minute: 20 },
  { hour: 7, minute: 50 },
  { hour: 2, minute: 40 },
];

export const KELL_WRITTEN: readonly ClockTime[] = [
  { hour: 5, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 1, minute: 15 },
  { hour: 6, minute: 45 },
  { hour: 4, minute: 45 },
  { hour: 10, minute: 5 },
  { hour: 12, minute: 10 },
  { hour: 5, minute: 50 },
  { hour: 6, minute: 40 },
];

export const KELL_DRILLED: readonly ClockTime[] = [
  { hour: 4, minute: 0 },
  { hour: 8, minute: 0 },
  { hour: 11, minute: 15 },
  { hour: 7, minute: 15 },
  { hour: 9, minute: 45 },
  { hour: 3, minute: 5 },
  { hour: 6, minute: 20 },
  { hour: 10, minute: 40 },
  { hour: 11, minute: 55 },
];

/** The time lesson's words and phrases; each time it says is a clip of its own, by `timeClip`. */
export const KELL_WORDS = [
  "Mis kell on?",
  "kell",
  "pool",
  "veerand",
  "kolmveerand",
  "läbi",
  "pärast",
  "minutit",
  "pool neli",
  "veerand neli",
  "kolmveerand neli",
  "kümme minutit kolm läbi",
  "kümne minuti pärast neli",
] as const;

/**
 * The commands lesson's verbs from the present-tense lesson, each with its I form of the present and its stem,
 * which is the command to one person. Checked in ÕS 2025 on Sõnaveeb (EKI morphology).
 */
export const KASKIV_STEMS = [
  { verb: "lugema", ma: "loen", stem: "loe" },
  { verb: "rääkima", ma: "räägin", stem: "räägi" },
  { verb: "ootama", ma: "ootan", stem: "oota" },
  { verb: "sööma", ma: "söön", stem: "söö" },
  { verb: "jooma", ma: "joon", stem: "joo" },
  { verb: "õppima", ma: "õpin", stem: "õpi" },
] as const;

/** A command to one person: “Loe!”, or with `no`, “Ära loe!”. */
export const commandTo = (stem: string, no = false) =>
  no ? `Ära ${stem}!` : `${stem.charAt(0).toUpperCase()}${stem.slice(1)}!`;

/** “Ma ei loe.”: the statement with ei that a command with ära is told apart from. */
export const notSentence = (stem: string) => `Ma ei ${stem}.`;

/**
 * Everyday commands: the verb, its I form of the present, the command to one person, and to more than one or
 * politely. Checked in ÕS 2025 on Sõnaveeb: istuge, tulge, oodake, kuulake, vaadake, rääkige.
 */
export const KASKIV_EVERYDAY = [
  { verb: "istuma", ma: "istun", one: "Istu!", more: "Istuge!" },
  { verb: "tulema", ma: "tulen", one: "Tule siia!", more: "Tulge siia!" },
  { verb: "ootama", ma: "ootan", one: "Oota!", more: "Oodake!" },
  { verb: "kuulama", ma: "kuulan", one: "Kuula!", more: "Kuulake!" },
  { verb: "vaatama", ma: "vaatan", one: "Vaata!", more: "Vaadake!" },
  {
    verb: "rääkima",
    ma: "räägin",
    one: "Räägi aeglasemalt, palun.",
    more: "Rääkige aeglasemalt, palun.",
  },
] as const;

/** The stems the do-and-don't switch flips. */
export const KASKIV_FLIP = ["istu", "oota", "räägi", "loe", "söö", "joo"] as const;

/** The stems of the “do, don't or not?” quiz, each heard three ways. */
export const KASKIV_HEARD = ["istu", "oota", "loe", "joo"] as const;

/** One person or more: each command and its form to more than one. ÕS 2025: lugege, ärge. */
export const KASKIV_MORE = [
  ...KASKIV_EVERYDAY.slice(0, 5).map(({ one, more }) => ({ one, more })),
  { one: "Loe!", more: "Lugege!" },
  { one: "Ära istu!", more: "Ärge istuge!" },
  { one: "Ära loe!", more: "Ärge lugege!" },
] as const;

export const KASKIV_CLASS = [
  "Tere!",
  "Istuge, palun.",
  "Kuulake!",
  "Jaan, ära räägi!",
  "Mari, loe raamatut, palun!",
  "Kati, oota!",
  "Vaadake siia!",
  "Aitäh!",
] as const;

export const KASKIV_TURNED: readonly {
  from: string;
  to: string;
  kind: "dont" | "more";
  answers: readonly [string, ...string[]];
}[] = [
  { from: "Loe!", to: "Ära loe!", kind: "dont", answers: ["Ära loe!"] },
  { from: "Oota!", to: "Ära oota!", kind: "dont", answers: ["Ära oota!"] },
  { from: "Söö!", to: "Ära söö!", kind: "dont", answers: ["Ära söö!"] },
  { from: "Joo!", to: "Ära joo!", kind: "dont", answers: ["Ära joo!"] },
  { from: "Tule siia!", to: "Tulge siia!", kind: "more", answers: ["Tulge siia!", "Siia tulge!"] },
  { from: "Vaata!", to: "Vaadake!", kind: "more", answers: ["Vaadake!"] },
  { from: "Kuula!", to: "Kuulake!", kind: "more", answers: ["Kuulake!"] },
  { from: "Ära istu!", to: "Ärge istuge!", kind: "more", answers: ["Ärge istuge!"] },
];

export const KASKIV_TYPED: readonly {
  verb: string;
  ma: string;
  stem: string;
  answers: readonly [string, ...string[]];
}[] = [
  ...KASKIV_STEMS.filter(({ verb }) => verb !== "lugema"),
  { verb: "kuulama", ma: "kuulan", stem: "kuula" },
  { verb: "vaatama", ma: "vaatan", stem: "vaata" },
].map((each) => ({ ...each, answers: [each.stem, `${each.stem}!`] }));

/** Words and lines the commands lesson says outside its lists. */
export const KASKIV_WORDS = ["palun", "ära", "siia", "Ma lähen.", "Mine!", "Ärge oodake!"] as const;

/**
 * At a café with Mari: her lines in the second voice, the learner's in the main one. Words from
 * lessons 1–9 and this lesson's commands; tuleb is tulema with the ta ending.
 */
export const KASKIV_DIALOGUE = {
  "d-mari-1": { text: "Tere! Oota, ma tulen!", voice: "second" },
  "d-sina-1": "Tere! Istu, palun.",
  "d-mari-2": { text: "Aitäh! Kas sa räägid eesti keelt?", voice: "second" },
  "d-sina-2": "Natuke. Räägi aeglasemalt, palun.",
  "d-mari-3": { text: "Kas sa jood kohvi või vett?", voice: "second" },
  "d-sina-3": "Kohvi, palun.",
  "d-mari-4": { text: "Vaata! Jaan tuleb.", voice: "second" },
  "d-sina-4": "Jaan, tule siia!",
} as const satisfies Record<string, Clip>;

/** How a noun's stem differs from the word: letters inside change, a vowel is added, or nothing. */
export type StemKind = "inside" | "vowel" | "same";

/**
 * The stems lesson's nouns: the word as a dictionary lists it first, its stem (listed second, the
 * form an ending goes on), how the two differ, the word with -s or -l, a sentence that says it, and
 * three wrong forms for “Which form?”. Checked in ÕS 2025 on Sõnaveeb (EKI morphology): pood, poe;
 * tuba, toa; jõgi, jõe; laud, laua; turg, turu; aken, akna; kool, kooli; raamat, raamatu; uks, ukse;
 * Tallinn, Tallinna; sein, seina; kohvik, kohviku; kodu, haigla, Tartu, töö, Pärnu and Soome unchanged.
 */
export const STEM_WORDS = [
  {
    word: "pood",
    stem: "poe",
    kind: "inside",
    where: "poes",
    said: "Ema on poes.",
    slips: ["poodis", "poods", "pooes"],
  },
  {
    word: "tuba",
    stem: "toa",
    kind: "inside",
    where: "toas",
    said: "Ta on toas.",
    slips: ["tubas", "tuas", "tubes"],
  },
  {
    word: "jõgi",
    stem: "jõe",
    kind: "inside",
    where: "jões",
    said: "Me ujume jões.",
    slips: ["jõges", "jõs", "jõgias"],
  },
  {
    word: "laud",
    stem: "laua",
    kind: "inside",
    where: "laual",
    said: "Raamat on laual.",
    slips: ["laudel", "lauel", "lauil"],
  },
  {
    word: "turg",
    stem: "turu",
    kind: "inside",
    where: "turul",
    said: "Nad on turul.",
    slips: ["turgul", "turl", "turgal"],
  },
  {
    word: "aken",
    stem: "akna",
    kind: "inside",
    where: "aknal",
    said: "Kohv on aknal.",
    slips: ["akenal", "akenil", "aknul"],
  },
  {
    word: "kool",
    stem: "kooli",
    kind: "vowel",
    where: "koolis",
    said: "Ta õpib koolis.",
    slips: ["kools", "koolos", "koolius"],
  },
  {
    word: "raamat",
    stem: "raamatu",
    kind: "vowel",
    where: "raamatus",
    said: "Pilt on raamatus.",
    slips: ["raamats", "raamatis", "raamatas"],
  },
  {
    word: "uks",
    stem: "ukse",
    kind: "vowel",
    where: "uksel",
    said: "Jaan on uksel.",
    slips: ["uksul", "uksal", "uksol"],
  },
  {
    word: "Tallinn",
    stem: "Tallinna",
    kind: "vowel",
    where: "Tallinnas",
    said: "Ma elan Tallinnas.",
    slips: ["Tallinns", "Tallinnis", "Tallinnus"],
  },
  {
    word: "sein",
    stem: "seina",
    kind: "vowel",
    where: "seinal",
    said: "Pilt on seinal.",
    slips: ["seinil", "seinel", "seinol"],
  },
  {
    word: "kohvik",
    stem: "kohviku",
    kind: "vowel",
    where: "kohvikus",
    said: "Me oleme kohvikus.",
    slips: ["kohvikis", "kohvikas", "kohvikos"],
  },
  {
    word: "kodu",
    stem: "kodu",
    kind: "same",
    where: "kodus",
    said: "Ta töötab kodus.",
    slips: ["kodes", "kodas", "koduis"],
  },
  {
    word: "haigla",
    stem: "haigla",
    kind: "same",
    where: "haiglas",
    said: "Mari töötab haiglas.",
    slips: ["haiglis", "haiglaas", "haigles"],
  },
  {
    word: "Tartu",
    stem: "Tartu",
    kind: "same",
    where: "Tartus",
    said: "Nad õpivad Tartus.",
    slips: ["Tartas", "Tartuis", "Tartes"],
  },
  {
    word: "töö",
    stem: "töö",
    kind: "same",
    where: "tööl",
    said: "Ma olen tööl.",
    slips: ["töl", "tööil", "tööel"],
  },
  {
    word: "Pärnu",
    stem: "Pärnu",
    kind: "same",
    where: "Pärnus",
    said: "Jaan elab Pärnus.",
    slips: ["Pärnes", "Pärnuis", "Pärnos"],
  },
  {
    word: "Soome",
    stem: "Soome",
    kind: "same",
    where: "Soomes",
    said: "Ma elan Soomes.",
    slips: ["Soomis", "Soomeis", "Soomos"],
  },
] as const satisfies readonly {
  word: string;
  stem: string;
  kind: StemKind;
  where: string;
  said: string;
  slips: readonly [string, string, string];
}[];

/** Saturday, who is where: the stems lesson's passage with gaps, recorded as one take. */
export const STEM_PASSAGE = [
  "Täna on laupäev.",
  "Ema on turul ja Jaan on poes.",
  "Kati on kohvikus.",
  "Mari on kodus.",
  "Ta istub toas ja loeb.",
  "Kohv on laual.",
] as const;

export const STEM_SORT = [
  { word: "jõgi", bin: "inside" },
  { word: "turg", bin: "inside" },
  { word: "aken", bin: "inside" },
  { word: "uks", bin: "vowel" },
  { word: "sein", bin: "vowel" },
  { word: "kohvik", bin: "vowel" },
  { word: "haigla", bin: "same" },
  { word: "töö", bin: "same" },
  { word: "Soome", bin: "same" },
] as const satisfies readonly { word: (typeof STEM_WORDS)[number]["word"]; bin: StemKind }[];

export const STEM_SAID_ALSO: Record<(typeof STEM_WORDS)[number]["said"], readonly string[]> = {
  "Ema on poes.": [],
  "Ta on toas.": ["Tema on toas."],
  "Me ujume jões.": ["Meie ujume jões.", "Ujume jões."],
  "Raamat on laual.": ["Raamat on laua peal."],
  "Nad on turul.": ["Nemad on turul."],
  "Kohv on aknal.": ["Kohv on akna peal."],
  "Ta õpib koolis.": ["Tema õpib koolis."],
  "Pilt on raamatus.": [],
  "Jaan on uksel.": ["Jaan on ukse juures."],
  "Ma elan Tallinnas.": ["Mina elan Tallinnas.", "Elan Tallinnas."],
  "Pilt on seinal.": ["Pilt on seina peal."],
  "Me oleme kohvikus.": ["Meie oleme kohvikus.", "Oleme kohvikus."],
  "Ta töötab kodus.": ["Tema töötab kodus."],
  "Mari töötab haiglas.": [],
  "Nad õpivad Tartus.": ["Nemad õpivad Tartus."],
  "Ma olen tööl.": ["Mina olen tööl.", "Olen tööl."],
  "Jaan elab Pärnus.": [],
  "Ma elan Soomes.": ["Mina elan Soomes.", "Elan Soomes."],
};

export const STEM_SAY = [
  "Ema on poes.",
  "Raamat on laual.",
  "Nad on turul.",
  "Me oleme kohvikus.",
  "Ma elan Tallinnas.",
  "Mari töötab haiglas.",
] as const satisfies readonly (typeof STEM_WORDS)[number]["said"][];

export const STEM_FIX = [
  { word: "pood", wrong: "Ema on poodis." },
  { word: "turg", wrong: "Nad on turgul." },
  { word: "tuba", wrong: "Ta on tubas." },
  { word: "aken", wrong: "Kohv on akenal." },
  { word: "kool", wrong: "Ta õpib kools." },
  { word: "raamat", wrong: "Pilt on raamats." },
] as const satisfies readonly { word: (typeof STEM_WORDS)[number]["word"]; wrong: string }[];

export const STEM_TALK = {
  turns: [
    { voice: "fourth", text: ["Tere, Mari!", "Kus sa oled?"] },
    { voice: "third", text: ["Tere, Jaan!", "Ma olen poes.", "Aga sina?"] },
    { voice: "fourth", text: ["Ma olen kodus.", "Ma olen toas ja loen."] },
    { voice: "third", text: "Kus Kati on?", say: "[curious] Kus Kati on?" },
    { voice: "fourth", text: ["Kati on koolis.", "Ema on turul."] },
    { voice: "third", text: "Ja isa?" },
    { voice: "fourth", text: ["Isa on tööl.", "Ta töötab täna Tartus."] },
    { voice: "third", text: "Kas minu raamat on laual?" },
    {
      voice: "fourth",
      text: "Ei, raamat on aknal.",
      say: "[laughs] Ei, raamat on aknal.",
    },
    { voice: "third", text: ["Aitäh!", "Head aega!"] },
  ],
} as const satisfies Conversation;

/**
 * The owners of the lesson on “to have”: each short pronoun, its -l form, the long -l form said
 * for stress, and a sentence. Checked in ÕS 2025 on Sõnaveeb (EKI morphology): mul, minul; sul,
 * sinul; tal, temal; meil; teil; neil, nendel.
 */
export const MUL_ON_OWNERS = [
  { pronoun: "ma", owner: "mul", long: "minul", said: "Mul on kass." },
  { pronoun: "sa", owner: "sul", long: "sinul", said: "Sul on auto." },
  { pronoun: "ta", owner: "tal", long: "temal", said: "Tal on koer." },
  { pronoun: "me", owner: "meil", long: "meil", said: "Meil on maja." },
  { pronoun: "te", owner: "teil", long: "teil", said: "Kas teil on küsimus?" },
  { pronoun: "nad", owner: "neil", long: "nendel", said: "Neil on laps." },
] as const;

export type MulOnOwner = (typeof MUL_ON_OWNERS)[number]["owner"];

/** “Who has it?”: two sentences for each owner, heard and matched to the owner. */
export const MUL_ON_HEARD = [
  { owner: "mul", said: "Mul on kass." },
  { owner: "mul", said: "Mul on küsimus." },
  { owner: "sul", said: "Sul on auto." },
  { owner: "sul", said: "Kas sul on raamat?" },
  { owner: "tal", said: "Tal on koer." },
  { owner: "tal", said: "Tal on hea õpetaja." },
  { owner: "meil", said: "Meil on maja." },
  { owner: "meil", said: "Meil on kodu Tartus." },
  { owner: "teil", said: "Kas teil on küsimus?" },
  { owner: "teil", said: "Kas teil on auto?" },
  { owner: "neil", said: "Neil on laps." },
  { owner: "neil", said: "Neil on maja Pärnus." },
] as const satisfies readonly { owner: MulOnOwner; said: string }[];

/** I am, or I have: the same words with the pronoun and olema, and with the -l form and on. */
export const MUL_ON_SWITCH = [
  { am: "Ma olen kass.", have: "Mul on kass." },
  { am: "Sa oled õpetaja.", have: "Sul on õpetaja." },
  { am: "Ta on hea sõber.", have: "Tal on hea sõber." },
  { am: "Te olete hea õpetaja.", have: "Teil on hea õpetaja." },
] as const;

/** “Am or have?”: pairs to tell apart by ear. */
export const MUL_ON_AM_HAVE = [
  { am: "Ma olen õpetaja.", have: "Mul on õpetaja." },
  { am: "Sa oled hea sõber.", have: "Sul on hea sõber." },
  { am: "Ta on laps.", have: "Tal on laps." },
  { am: "Ta on hea õpetaja.", have: "Tal on hea õpetaja." },
] as const;

/**
 * Names and nouns with -l, on the genitive: Mari, Mari, Maril; Jaan, Jaani, Jaanil; sõber, sõbra,
 * sõbral. ÕS 2025 on Sõnaveeb: emal, isal, sõbral, õpetajal, kellel; Maril and Jaanil as forms
 * of the names.
 */
export const MUL_ON_NAMES = [
  { word: "Mari", genitive: "Mari", owner: "Maril", said: "Maril on kass." },
  { word: "Jaan", genitive: "Jaani", owner: "Jaanil", said: "Jaanil on auto." },
  { word: "ema", genitive: "ema", owner: "emal", said: "Emal on küsimus." },
  { word: "isa", genitive: "isa", owner: "isal", said: "Isal on koer." },
  { word: "sõber", genitive: "sõbra", owner: "sõbral", said: "Minu sõbral on maja." },
  { word: "õpetaja", genitive: "õpetaja", owner: "õpetajal", said: "Õpetajal on raamat." },
] as const;

/** Questions and answers: kellel, yes and no, and mul on vaja. */
export const MUL_ON_LINES = {
  "q-kellel-auto": "Kellel on auto?",
  "a-jaanil": "Jaanil.",
  "q-kellel-kusimus": "Kellel on küsimus?",
  "a-minul": "Minul.",
  "q-sul-auto": "Kas sul on auto?",
  "a-jah-on": "Jah, on.",
  "a-ei-ole": "Ei ole.",
  "a-pole": "Pole.",
  "q-sul-aega": "Kas sul on aega?",
  "a-pole-aega": "Mul pole aega.",
  "v-raha": "Mul on vaja raha.",
  "v-abi": "Mul on vaja abi.",
  "v-sul-abi": "Kas sul on vaja abi?",
} as const;

/** Mari's note, with a gap at each owner and each on. */
export const MUL_ON_PASSAGE = [
  "Mina olen Mari.",
  "Mul on kass.",
  "Minu ema on õpetaja.",
  "Emal on auto.",
  "Jaan on minu sõber.",
  "Jaanil on koer.",
  "Me elame Tartus.",
  "Meil on hea kodu.",
  "Kas sul on kass?",
] as const;

/**
 * At home with a flatmate, Liis: her lines in the second voice, the learner's in the main one.
 * Jaani is Jaan's genitive, from the lesson on the genitive.
 */
export const MUL_ON_DIALOGUE = {
  "d-liis-1": { text: "Tere! Kas sul on aega?", voice: "second" },
  "d-sina-1": "Jah, on.",
  "d-liis-2": { text: "Mul on vaja abi. Kas sul on auto?", voice: "second" },
  "d-sina-2": "Ei ole. Aga Jaanil on auto.",
  "d-liis-3": { text: "Hästi! Kellel on Jaani number?", voice: "second" },
  "d-sina-3": "Minul.",
  "d-liis-4": { text: "Aitäh! Kas sul on homme aega?", voice: "second" },
  "d-sina-4": "Ei, mul pole homme aega.",
} as const satisfies Record<string, Clip>;

export const MUL_ON_SORT = [
  { w: "minu", bin: "whose" },
  { w: "sinu", bin: "whose" },
  { w: "tema", bin: "whose" },
  { w: "meie", bin: "whose" },
  { w: "nende", bin: "whose" },
  { w: "mul", bin: "has" },
  { w: "sul", bin: "has" },
  { w: "tal", bin: "has" },
  { w: "meil", bin: "has" },
  { w: "neil", bin: "has" },
] as const;

export const MUL_ON_SAY = [
  { id: "kass", said: "Mul on kass.", also: ["Minul on kass."] },
  { id: "auto", said: "Kas sul on auto?", also: ["Kas sinul on auto?", "Kas teil on auto?"] },
  { id: "maril", said: "Maril on küsimus.", also: [] },
  { id: "aega", said: "Meil pole aega.", also: ["Meil ei ole aega."] },
  { id: "kellel", said: "Kellel on koer?", also: [] },
  {
    id: "abi",
    said: "Mul on vaja abi.",
    also: [
      "Minul on vaja abi.",
      "Mul on abi vaja.",
      "Ma vajan abi.",
      "Mina vajan abi.",
      "Vajan abi.",
    ],
  },
] as const;

export const MUL_ON_FIX = [
  {
    id: "mul",
    rule: "owner",
    wrong: "Ma on kass.",
    right: "Mul on kass.",
    also: ["Minul on kass."],
  },
  {
    id: "sul",
    rule: "owner",
    wrong: "Kas sa on aega?",
    right: "Kas sul on aega?",
    also: ["Kas sinul on aega?", "Kas teil on aega?"],
  },
  { id: "jaanil", rule: "names", wrong: "Jaan on auto.", right: "Jaanil on auto.", also: [] },
  { id: "emal", rule: "names", wrong: "Ema on küsimus.", right: "Emal on küsimus.", also: [] },
  { id: "on", rule: "owner", wrong: "Meil oleme maja.", right: "Meil on maja.", also: [] },
  {
    id: "ole",
    rule: "no",
    wrong: "Mul ei on aega.",
    right: "Mul ei ole aega.",
    also: [],
  },
] as const;

export const MUL_ON_TALK = {
  turns: [
    { voice: "third", text: ["Tere, Jaan!", "Kas sul on täna aega?"] },
    { voice: "fourth", text: ["Jah, on.", "Miks?"], say: "Jah, on. [curious] Miks?" },
    { voice: "third", text: ["Mul on vaja abi.", "Kas sul on auto?"] },
    { voice: "fourth", text: ["Ei ole.", "Aga minu isal on auto."] },
    { voice: "third", text: "Kas sinu isal on täna aega?" },
    { voice: "fourth", text: ["Ei, isal pole aega.", "Ta on tööl."] },
    { voice: "third", text: ["Aga Kati?", "Kas Katil on auto?"] },
    { voice: "fourth", text: ["Jah, Katil on auto.", "Ja tal on aega."] },
    { voice: "third", text: ["Väga hea!", "Aitäh!"], say: "[relieved] Väga hea! Aitäh!" },
  ],
} as const satisfies Conversation;

/** Words the lesson on “to have” says on their own. */
export const MUL_ON_WORDS = [
  ...MUL_ON_OWNERS.flatMap(({ owner, long }) => [owner, long]),
  ...MUL_ON_NAMES.map(({ owner }) => owner),
  "kellel",
  "vaja",
  "koer",
  "küsimus",
  "raha",
  "abi",
  "Hästi, aitäh. Aga sul?",
  ...MUL_ON_NAMES.flatMap(({ word, genitive }) => [word, genitive]),
] as const;

/**
 * The practice parts' demo on /components/lessons: Jaan introduces himself, Mari writes about
 * herself, a passage with gaps, and meeting Mari. Words from lessons 1–5.
 */
export const KIT_PASSAGES = {
  jaan: [
    "Tere! Mina olen Jaan.",
    "Ma elan Tartus.",
    "Ma olen arst.",
    "Mari on minu sõber.",
    "Ta ei ole arst, ta on õpetaja.",
    "Me räägime eesti keelt.",
  ],
  mari: [
    "Tere! Minu nimi on Mari.",
    "Ma olen õpetaja.",
    "Ma elan Tallinnas.",
    "Ma loen palju.",
    "Minu vend Peeter ei loe.",
    "Ta kuulab muusikat.",
    "Kas sina loed palju?",
  ],
  peeter: [
    "Mina olen õpetaja.",
    "Minu vend Peeter on arst.",
    "Me elame Tallinnas.",
    "Peeter ei loe palju.",
    "Mina loen iga päev.",
  ],
} as const;

/** Meeting Mari: her lines in the second voice, the learner's in the main one. */
export const KIT_DIALOGUE = {
  "d-mari-1": { text: "Tere! Mina olen Mari. Kes sina oled?", voice: "second" },
  "d-sina-1": "Mina olen Jaan.",
  "d-mari-2": { text: "Väga meeldiv! Kas sa elad Tallinnas?", voice: "second" },
  "d-sina-2": "Ei, ma ei ela Tallinnas. Ma elan Tartus.",
  "d-mari-3": { text: "Tartus? Kas sa oled õpetaja?", voice: "second" },
  "d-sina-3": "Ei, ma olen arst.",
  "d-mari-4": { text: "Tore! Head aega!", voice: "second" },
  "d-sina-4": "Head aega!",
} as const satisfies Record<string, Clip>;

export const KIT_CONVERSATION: Conversation = {
  turns: [
    { voice: "main", text: KIT_PASSAGES.jaan },
    { voice: "second", text: KIT_PASSAGES.mari },
    { voice: "main", text: "Ma loen raamatut." },
    { voice: "second", text: KIT_DIALOGUE["d-mari-4"].text },
    { voice: "main", text: KIT_DIALOGUE["d-sina-4"] },
  ],
  clips: ["kit/p-jaan", "kit/p-mari", "olevik/s-loen-raamatut", "kit/d-mari-4", "kit/d-sina-4"],
};

const KIT_CLIPS: Record<string, Clip> = {
  "c-jaan-mari": KIT_CONVERSATION,
  "p-jaan": { sentences: KIT_PASSAGES.jaan },
  "p-mari": { sentences: KIT_PASSAGES.mari, voice: "second" },
  "p-peeter": { sentences: KIT_PASSAGES.peeter },
  ...KIT_DIALOGUE,
  // The explorers' forms and sentences: Paradigm, Scene, Timeline, Morph.
  ...words(KIT_EXPLORE_TEXTS),
};

/**
 * The practice lesson “A day in Tallinn”: Mari's message, Jaan's voice message, a Saturday with
 * gaps and a talk at a café. Words from lessons 1–10, plus buss and pühapäeval, which its glossary
 * explains.
 */
export const TALLINN_PASSAGES = {
  mari: [
    "Tere! Kuidas läheb?",
    "Täna on reede ja ma olen tööl.",
    "Homme on laupäev ja ma ei tööta.",
    "Ma joon kell kümme kohvikus kohvi.",
    "Kohv maksab kolm eurot.",
    "Kell kaksteist olen turul.",
    "Kas sa oled homme linnas?",
  ],
  jaan: [
    "Tere, see on Jaan!",
    "Ma olen täna Tartus, aga homme olen Tallinnas.",
    "Minu buss on Tallinnas kell pool üksteist.",
    "Ma olen homme kohvikus.",
    "Pühapäeval olen kodus.",
  ],
  saturday: [
    "Täna on laupäev.",
    "Ma ei tööta.",
    "Ma olen Tallinnas.",
    "Mari ja Jaan on minu sõbrad.",
    "Mari ja mina joome kell kümme kohvikus kohvi.",
    "Kohv maksab kolm eurot.",
  ],
} as const;

/** Meeting Mari at the café: her lines in the second voice, the learner's in the main one. */
export const TALLINN_DIALOGUE = {
  "d-mari-1": { text: "Tere! Kuidas läheb?", voice: "second" },
  "d-sina-1": "Hästi, aitäh. Aga sul?",
  "d-mari-2": { text: "Hästi! Istu! Kas sa jood kohvi?", voice: "second" },
  "d-sina-2": "Jah, ma joon kohvi.",
  "d-mari-3": { text: "Mis kell on?", voice: "second" },
  "d-sina-3": "Kell on kümme.",
  "d-mari-4": { text: "Kas sa töötad homme?", voice: "second" },
  "d-sina-4": "Ei, homme on pühapäev.",
} as const satisfies Record<string, Clip>;

/** The words of “A day in Tallinn” with a card, each heard on its own. */
export const TALLINN_WORDS = [
  "kohvik",
  "avatud",
  "suletud",
  "kohvikus",
  "turul",
  "tööl",
  "linnas",
  "kodus",
  "täna",
  "homme",
  "reede",
  "laupäev",
  "pühapäev",
  "pühapäeval",
  "kell",
  "kümme",
  "kaksteist",
  "üksteist",
  "pool",
  "pool üksteist",
  "maksab",
  "eurot",
  "buss",
  "ootan",
  "sind",
  "istu",
  "aga",
  "olema",
  "ei",
  "sõbrad",
  "Kuidas läheb?",
] as const;

export const TALLINN_TALK: Conversation = {
  turns: [
    { voice: "second", text: ["Tere, Jaan!", "Mis sa täna teed?"] },
    { voice: "third", text: "Täna on reede ja ma olen tööl." },
    { voice: "second", text: "Kas sa töötad homme?" },
    { voice: "third", text: ["Ei, homme ma ei tööta.", "Kell üksteist olen kohvikus."] },
    { voice: "second", text: "Ma olen kell kaksteist turul." },
    { voice: "third", text: "Hästi, ma tulen kell pool üks!" },
    { voice: "second", text: "Ja pühapäeval?" },
    { voice: "third", text: "Pühapäeval olen kodus." },
  ],
};

export const TALLINN_SORTED = [
  { w: "Kell on pool üksteist.", bin: "kell" },
  { w: "Kolm eurot.", bin: "hind" },
  { w: "Täna on reede.", bin: "paev" },
  { w: "See maksab neli eurot.", bin: "hind" },
  { w: "Kell on kaksteist.", bin: "kell" },
  { w: "Reede.", bin: "paev" },
  { w: "Kaksteist eurot.", bin: "hind" },
  { w: "Homme on laupäev.", bin: "paev" },
  { w: "Kell on kolm.", bin: "kell" },
] as const;

export const dictated = (said: string): [string, ...string[]] => [said];

export const TALLINN_HEARD = [
  { kind: "kell", said: "Kell on pool kaksteist." },
  { kind: "hind", said: "See maksab kuus eurot." },
  { kind: "paev", said: "Ülehomme on pühapäev." },
  { kind: "ei", said: "Täna ma ei tööta." },
  { kind: "kell", said: "Ma olen kell üksteist kodus." },
  { kind: "paev", said: "Kohvik on suletud." },
] as const;

export const TALLINN_DRILL_HEARD = [
  "Minu buss on kell kümme.",
  "Pühapäeval ma ei tööta.",
  "See maksab viis eurot.",
] as const;

export const TALLINN_TRANSLATED = [
  { kind: "kell", answers: ["Kell on kümme."] },
  { kind: "hind", answers: ["See maksab kaks eurot.", "Maksab kaks eurot."] },
  { kind: "paev", answers: dayTranslations("Täna on laupäev.") },
  {
    kind: "ei",
    answers: [
      "Homme ma ei tööta.",
      "Ma ei tööta homme.",
      "Ma homme ei tööta.",
      "Mina homme ei tööta.",
      "Mina ei tööta homme.",
      "Homme mina ei tööta.",
      "Homme ei tööta mina.",
      "Homme ei tööta ma.",
    ],
  },
  {
    kind: "kell",
    answers: [
      "Ma olen kell kaksteist turul.",
      "Kell kaksteist ma olen turul.",
      "Kell kaksteist mina olen turul.",
      "Ma olen turul kell kaksteist.",
      "Kell kaksteist olen ma turul.",
      "Kell kaksteist olen turul.",
      "Mina olen kell kaksteist turul.",
      "Mina olen turul kell kaksteist.",
      "Kell kaksteist olen mina turul.",
      "Ma kell kaksteist olen turul.",
      "Mina kell kaksteist olen turul.",
      "Olen kell kaksteist turul.",
      "Olen turul kell kaksteist.",
      "Turul olen kell kaksteist.",
      "Turul olen ma kell kaksteist.",
      "Turul olen mina kell kaksteist.",
      "Turul ma olen kell kaksteist.",
      "Turul mina olen kell kaksteist.",
    ],
  },
  {
    kind: "kell",
    answers: [
      "Me joome kell üksteist kohvi.",
      "Kell üksteist me joome kohvi.",
      "Kell üksteist meie joome kohvi.",
      "Me joome kohvi kell üksteist.",
      "Kell üksteist joome me kohvi.",
      "Kell üksteist joome kohvi.",
      "Meie joome kell üksteist kohvi.",
      "Meie joome kohvi kell üksteist.",
      "Kell üksteist joome meie kohvi.",
      "Me kell üksteist joome kohvi.",
      "Meie kell üksteist joome kohvi.",
      "Joome kell üksteist kohvi.",
      "Joome kohvi kell üksteist.",
      "Kohvi joome kell üksteist.",
      "Kohvi joome me kell üksteist.",
      "Kohvi joome meie kell üksteist.",
      "Kohvi me joome kell üksteist.",
      "Kohvi meie joome kell üksteist.",
    ],
  },
] as const;

export const TALLINN_DRILL_TRANSLATED = [
  { kind: "paev", answers: ["Kohvik on avatud."] },
  { kind: "hind", answers: ["See maksab kaksteist eurot.", "Maksab kaksteist eurot."] },
  {
    kind: "ei",
    answers: [
      "Mari ei tööta täna.",
      "Täna Mari ei tööta.",
      "Mari täna ei tööta.",
      "Täna ei tööta Mari.",
    ],
  },
] as const;

export const TALLINN_REPLY = [
  "Tere, Mari!",
  "Jah, ma olen homme linnas.",
  "Ma ei tööta.",
  "Kell kümme olen kohvikus.",
  "Pühapäeval olen kodus.",
] as const;

const TALLINN_CLIPS: Record<string, Clip> = {
  ...words(TALLINN_WORDS),
  ...words(TALLINN_SORTED.map(({ w }) => w)),
  ...words(TALLINN_HEARD.map(({ said }) => said)),
  ...words(TALLINN_DRILL_HEARD),
  ...words(TALLINN_TRANSLATED.map(({ answers }) => answers[0])),
  ...words(TALLINN_DRILL_TRANSLATED.map(({ answers }) => answers[0])),
  "d-plan": TALLINN_TALK,
  "p-reply": { sentences: TALLINN_REPLY },
  "p-mari": { sentences: TALLINN_PASSAGES.mari, voice: "second" },
  "p-jaan": { sentences: TALLINN_PASSAGES.jaan, voice: "third" },
  "p-saturday": { sentences: TALLINN_PASSAGES.saturday },
  ...TALLINN_DIALOGUE,
};

/**
 * The lesson on can, may and must. Checked in ÕS 2025 on Sõnaveeb: oskama, saama, võima and
 * tohtima take the -da infinitive (“mida teha”), pidama the -ma infinitive (“mida tegema”), tulema as “has to”
 * takes “kellel + mida teha”, and vaja takes “mida teha”. ujuma: ujuda, ujun.
 */

/** Know how or able to: the verbs that follow oskan and saan, each by its -ma and -da infinitive. */
export const MODAL_SKILLS = [
  { ma: "ujuma", da: "ujuda" },
  { ma: "lugema", da: "lugeda" },
] as const;
export type ModalSkill = (typeof MODAL_SKILLS)[number];
export type SkillLead = "oskan" | "saan";
/** “Ma oskan ujuda.” */
export const skillSentence = (lead: SkillLead, skill: ModalSkill) => `Ma ${lead} ${skill.da}.`;

/** Have to: the verbs that follow pean, tuleb and on vaja, with `|` before the ending to light. */
export const MODAL_DUTIES = [
  { ma: "mine|ma", da: "min|na" },
  { ma: "oota|ma", da: "ooda|ta" },
  { ma: "tööta|ma", da: "tööta|da" },
] as const;
export type ModalDuty = (typeof MODAL_DUTIES)[number];
export type DutyLead = "pean" | "tuleb" | "vaja";
const unlit = (form: string) => form.replace("|", "");
/** “Ma pean minema.”, “Tuleb minna.”, “Mul on vaja minna.” */
export function dutySentence(lead: DutyLead, duty: ModalDuty): string {
  if (lead === "pean") return `Ma pean ${unlit(duty.ma)}.`;
  return lead === "tuleb" ? `Tuleb ${unlit(duty.da)}.` : `Mul on vaja ${unlit(duty.da)}.`;
}

/** May and allowed: each key's form and the sentence it plays. */
export const MODAL_PERMISSION = [
  { lead: "võin", said: "Ma võin sind oodata." },
  { lead: "võid", said: "Sa võid siin istuda." },
  { lead: "tohin", said: "Kas ma tohin siin istuda?" },
  { lead: "ei tohi", said: "Siin ei tohi süüa." },
] as const;

/** Can't, mustn't, don't have to, each said about swimming. */
export const MODAL_NOT = [
  { lead: "ei oska", said: "Ta ei oska ujuda." },
  { lead: "ei saa", said: "Ta ei saa täna ujuda." },
  { lead: "ei tohi", said: "Siin ei tohi ujuda." },
  { lead: "ei pea", said: "Sa ei pea ujuma." },
  { lead: "pole vaja", said: "Sul pole vaja ujuda." },
] as const;

/** The four ways not to, heard in “What does it say?”. */
export const MODAL_HEARD_KINDS = ["oska", "saa", "tohi", "pea"] as const;
export type HeardKind = (typeof MODAL_HEARD_KINDS)[number];
/** The two verbs each way is heard with, by their -da and -ma infinitives. */
export const MODAL_HEARD_VERBS = [
  { da: "ujuda", ma: "ujuma" },
  { da: "lugeda", ma: "lugema" },
] as const;
export type HeardVerb = (typeof MODAL_HEARD_VERBS)[number];
/** “Ma ei oska ujuda.”, or after pea, the -ma infinitive: “Ma ei pea ujuma.” */
export const notSaid = (kind: HeardKind, verb: HeardVerb) =>
  `Ma ei ${kind} ${kind === "pea" ? verb.ma : verb.da}.`;

/** The sentences of “Why this verb?”, each matched with its reason. */
export const MODAL_REASONS = [
  "Ma oskan ujuda.",
  "Ma saan homme tulla.",
  "Sa võid siin istuda.",
  "Kas ma tohin siin istuda?",
  "Tuleb oodata.",
  "Mul on vaja minna.",
] as const;

/** Sentences the lesson's prose and asides play. */
export const MODAL_SENTENCES = [
  "Ma saan homme tulla.",
  "Ma oskan eesti keelt.",
  "Mul tuleb oodata.",
  "Ta võib homme tulla.",
  "Sa ei pea tulema.",
  "Sa ei tohi tulla.",
  "Ta tuleb ujuma.",
  "Tuleb ujuda.",
] as const;

/** Words the lesson glosses and plays on their own. */
export const MODAL_WORDS = [
  "oskan",
  "saan",
  "võin",
  "võib",
  "tohin",
  "pean",
  "tuleb",
  "vaja",
  "mul on vaja",
  "ei tohi",
  "ei pea",
  "pole vaja",
  "ujuma",
  "siin",
] as const;

/**
 * Plans with Mari: her lines in the second voice, the learner's in the main one. The learner can
 * swim, is free today and works tomorrow.
 */
export const MODAL_DIALOGUE = {
  "d-mari-1": { text: "Tere! Kas sa oskad ujuda?", voice: "second" },
  "d-sina-1": "Jah, ma oskan.",
  "d-mari-2": { text: "Tore! Kas sa tuled täna ujuma?", voice: "second" },
  "d-sina-2": "Jah, ma saan tulla.",
  "d-mari-3": { text: "Ja homme?", voice: "second" },
  "d-sina-3": "Ei, ma pean homme töötama.",
} as const satisfies Record<string, Clip>;

export const MODAL_SAY = [
  {
    id: "oskan",
    said: "Ma oskan eesti keelt rääkida.",
    also: [
      "Mina oskan eesti keelt rääkida.",
      "Oskan eesti keelt rääkida.",
      "Ma oskan rääkida eesti keelt.",
      "Ma oskan eesti keelt.",
      "Mina oskan eesti keelt.",
      "Oskan eesti keelt.",
      "Oskan rääkida eesti keelt.",
      "Mina oskan rääkida eesti keelt.",
      "Ma oskan eesti keeles rääkida.",
      "Oskan eesti keeles rääkida.",
      "Mina oskan eesti keeles rääkida.",
      "Ma oskan rääkida eesti keeles.",
      "Oskan rääkida eesti keeles.",
      "Mina oskan rääkida eesti keeles.",
    ],
  },
  {
    id: "ei-saa",
    said: "Ma ei saa täna tulla.",
    also: [
      "Mina ei saa täna tulla.",
      "Ei saa täna tulla.",
      "Täna ma ei saa tulla.",
      "Täna ei saa ma tulla.",
      "Ma ei saa tulla täna.",
      "Täna ei saa tulla.",
      "Ma täna ei saa tulla.",
      "Ei saa tulla täna.",
      "Mina ei saa tulla täna.",
      "Mina täna ei saa tulla.",
      "Täna mina ei saa tulla.",
    ],
  },
  {
    id: "void",
    said: "Sa võid siin oodata.",
    also: [
      "Sina võid siin oodata.",
      "Võid siin oodata.",
      "Siin võid sa oodata.",
      "Sa tohid siin oodata.",
      "Te võite siin oodata.",
      "Te tohite siin oodata.",
      "Võite siin oodata.",
      "Tohid siin oodata.",
      "Siin võite oodata.",
      "Siin võid oodata.",
      "Siin sa võid oodata.",
      "Sa võid oodata siin.",
      "Siin tohid oodata.",
      "Sina tohid siin oodata.",
      "Tohite siin oodata.",
      "Siin tohite oodata.",
      "Siin te võite oodata.",
      "Siin võite te oodata.",
      "Siin sa tohid oodata.",
      "Siin tohid sa oodata.",
      "Teie võite siin oodata.",
      "Teie tohite siin oodata.",
      "Siin te tohite oodata.",
      "Siin tohite te oodata.",
      "Te võite oodata siin.",
      "Võid oodata siin.",
      "Siin võib oodata.",
      "Siin tohib oodata.",
      "Sa tohid oodata siin.",
      "Sina tohid oodata siin.",
      "Tohid oodata siin.",
      "Te tohite oodata siin.",
      "Teie tohite oodata siin.",
      "Tohite oodata siin.",
      "Siin sina tohid oodata.",
      "Siin sina võid oodata.",
      "Siin teie tohite oodata.",
      "Siin teie võite oodata.",
      "Siin tohid sina oodata.",
      "Siin võid sina oodata.",
      "Sina võid oodata siin.",
      "Teie võite oodata siin.",
      "Võite oodata siin.",
    ],
  },
  {
    id: "ei-tohi",
    said: "Siin ei tohi süüa.",
    also: [
      "Siin ei või süüa.",
      "Siin süüa ei tohi.",
      "Sa ei tohi siin süüa.",
      "Sina ei tohi siin süüa.",
      "Te ei tohi siin süüa.",
      "Siin ei tohi sa süüa.",
      "Ei tohi siin süüa.",
      "Siin sa ei tohi süüa.",
      "Sa ei või siin süüa.",
      "Te ei või siin süüa.",
      "Sina ei või siin süüa.",
      "Siin te ei tohi süüa.",
      "Siin ei tohi te süüa.",
      "Teie ei tohi siin süüa.",
      "Teie ei või siin süüa.",
      "Ei või siin süüa.",
      "Siin sa ei või süüa.",
      "Siin ei või sa süüa.",
      "Siin te ei või süüa.",
      "Siin ei või te süüa.",
      "Sa ei tohi süüa siin.",
      "Te ei tohi süüa siin.",
      "Siin sina ei tohi süüa.",
      "Siin sina ei või süüa.",
      "Siin teie ei tohi süüa.",
      "Siin teie ei või süüa.",
      "Sina ei tohi süüa siin.",
      "Teie ei tohi süüa siin.",
    ],
  },
  {
    id: "pean",
    said: "Ma pean homme töötama.",
    also: [
      "Mina pean homme töötama.",
      "Pean homme töötama.",
      "Homme pean ma töötama.",
      "Homme ma pean töötama.",
      "Mul tuleb homme töötada.",
      "Mul on vaja homme töötada.",
      "Homme pean töötama.",
      "Ma pean töötama homme.",
      "Homme mul tuleb töötada.",
      "Homme tuleb mul töötada.",
      "Homme on mul vaja töötada.",
      "Minul tuleb homme töötada.",
      "Minul on vaja homme töötada.",
      "Mul on homme vaja töötada.",
      "Homme mul on vaja töötada.",
      "Homme pean mina töötama.",
      "Homme mina pean töötama.",
      "Pean töötama homme.",
      "Mina pean töötama homme.",
    ],
  },
  {
    id: "ei-pea",
    said: "Sa ei pea homme tulema.",
    also: [
      "Sina ei pea homme tulema.",
      "Te ei pea homme tulema.",
      "Homme sa ei pea tulema.",
      "Homme ei pea sa tulema.",
      "Sul pole vaja homme tulla.",
      "Sul ei ole vaja homme tulla.",
      "Teil pole vaja homme tulla.",
      "Teil ei ole vaja homme tulla.",
      "Ei pea homme tulema.",
      "Sa ei pea tulema homme.",
      "Homme ei pea tulema.",
      "Homme ei pea te tulema.",
      "Homme te ei pea tulema.",
      "Teie ei pea homme tulema.",
      "Sinul pole vaja homme tulla.",
      "Sinul ei ole vaja homme tulla.",
      "Sul pole homme vaja tulla.",
      "Teil pole homme vaja tulla.",
      "Sul ei ole homme vaja tulla.",
      "Homme pole teil vaja tulla.",
      "Homme pole sul vaja tulla.",
      "Te ei pea tulema homme.",
      "Ei pea tulema homme.",
      "Homme pole vaja tulla.",
      "Homme sina ei pea tulema.",
      "Homme teie ei pea tulema.",
      "Sina ei pea tulema homme.",
      "Teie ei pea tulema homme.",
    ],
  },
] as const;

export const MODAL_FIX = [
  {
    id: "saan",
    wrong: "Ma oskan homme tulla.",
    right: "Ma saan homme tulla.",
    also: ["Ma võin homme tulla."],
  },
  {
    id: "oskab",
    wrong: "Mu vend saab eesti keelt.",
    right: "Mu vend oskab eesti keelt.",
    also: [],
  },
  { id: "tootama", wrong: "Ma pean homme töötada.", right: "Ma pean homme töötama.", also: [] },
  { id: "minna", wrong: "Mul on vaja minema.", right: "Mul on vaja minna.", also: [] },
  { id: "ujuda", wrong: "Siin ei tohi ujuma.", right: "Siin ei tohi ujuda.", also: [] },
  { id: "tulema", wrong: "Sa ei pea tulla.", right: "Sa ei pea tulema.", also: [] },
] as const;

export const MODAL_DRILL = [
  {
    id: "oskab",
    rule: "skill",
    said: "Ta oskab hästi ujuda.",
    also: ["Tema oskab hästi ujuda.", "Ta oskab ujuda hästi.", "Tema oskab ujuda hästi."],
  },
  {
    id: "saad",
    rule: "skill",
    said: "Kas sa saad homme tulla?",
    also: [
      "Kas sina saad homme tulla?",
      "Kas sa saad tulla homme?",
      "Kas sa võid homme tulla?",
      "Kas te võite homme tulla?",
      "Saad sa homme tulla?",
      "Kas te saate homme tulla?",
      "Kas saad homme tulla?",
      "Kas saate homme tulla?",
      "Kas võid homme tulla?",
      "Kas sina võid homme tulla?",
      "Kas teie saate homme tulla?",
      "Saate te homme tulla?",
      "Kas võite homme tulla?",
      "Kas teie võite homme tulla?",
      "Võid sa homme tulla?",
      "Kas saad tulla homme?",
      "Kas te saate tulla homme?",
      "Kas sa homme saad tulla?",
      "Kas te homme saate tulla?",
      "Võid homme tulla?",
      "Võid sina homme tulla?",
    ],
  },
  {
    id: "tohin",
    rule: "allowed",
    said: "Kas ma tohin siin istuda?",
    also: [
      "Kas siin tohib istuda?",
      "Kas siia võib istuda?",
      "Kas mina tohin siin istuda?",
      "Kas ma võin siin istuda?",
      "Kas mina võin siin istuda?",
      "Kas tohin siin istuda?",
      "Kas võin siin istuda?",
      "Kas ma tohin siia istuda?",
      "Kas ma võin siia istuda?",
      "Kas mina tohin siia istuda?",
      "Kas tohin siia istuda?",
      "Kas võin siia istuda?",
      "Kas mina võin siia istuda?",
      "Tohin ma siin istuda?",
      "Võin ma siin istuda?",
      "Tohin ma siia istuda?",
      "Võin ma siia istuda?",
      "Kas ma saan siin istuda?",
      "Kas ma saan siia istuda?",
      "Kas mina saan siia istuda?",
      "Kas mina saan siin istuda?",
      "Kas saan siia istuda?",
      "Kas saan siin istuda?",
      "Tohin mina siia istuda?",
      "Tohin mina siin istuda?",
      "Tohin siia istuda?",
      "Tohin siin istuda?",
      "Võin mina siia istuda?",
      "Võin mina siin istuda?",
      "Võin siia istuda?",
      "Võin siin istuda?",
    ],
  },
  {
    id: "voin",
    rule: "allowed",
    said: "Ma võin sind oodata.",
    also: [
      "Ma võin sind ära oodata.",
      "Mina võin sind ära oodata.",
      "Võin sind ära oodata.",
      "Mina võin sind oodata.",
      "Võin sind oodata.",
      "Ma saan sind oodata.",
      "Ma võin teid oodata.",
      "Võin teid oodata.",
      "Mina võin teid oodata.",
      "Ma saan teid oodata.",
      "Saan sind oodata.",
      "Mina saan sind oodata.",
      "Saan teid oodata.",
      "Mina saan teid oodata.",
    ],
  },
  {
    id: "ei-pea",
    rule: "must",
    said: "Sa ei pea ujuma.",
    also: [
      "Sina ei pea ujuma.",
      "Te ei pea ujuma.",
      "Sul pole vaja ujuda.",
      "Sul ei ole vaja ujuda.",
      "Teil pole vaja ujuda.",
      "Ei pea ujuma.",
      "Teil ei ole vaja ujuda.",
      "Teie ei pea ujuma.",
      "Sinul pole vaja ujuda.",
      "Sinul ei ole vaja ujuda.",
      "Pole vaja ujuda.",
      "Ei ole vaja ujuda.",
    ],
  },
  {
    id: "pean",
    rule: "must",
    said: "Ma pean minema.",
    also: [
      "Mina pean minema.",
      "Pean minema.",
      "Mul tuleb minna.",
      "Mul on vaja minna.",
      "Minul tuleb minna.",
      "Minul on vaja minna.",
      "Ma pean ära minema.",
      "Pean ära minema.",
      "Mina pean ära minema.",
      "Mul tuleb ära minna.",
      "Mul on vaja ära minna.",
    ],
  },
] as const;

export const MODAL_FORMS = [
  {
    id: "lugeda",
    rule: "skill",
    base: "lugema",
    before: "Ma oskan ",
    after: ".",
    answer: "lugeda",
  },
  { id: "ujuda", rule: "skill", base: "ujuma", before: "Ta ei oska ", after: ".", answer: "ujuda" },
  {
    id: "istuda",
    rule: "allowed",
    base: "istuma",
    before: "Kas ma tohin siin ",
    after: "?",
    answer: "istuda",
  },
  {
    id: "oodata",
    rule: "allowed",
    base: "ootama",
    before: "Sa võid siin ",
    after: ".",
    answer: "oodata",
  },
  {
    id: "tulema",
    rule: "must",
    base: "tulema",
    before: "Ma ei pea homme ",
    after: ".",
    answer: "tulema",
  },
  {
    id: "minna",
    rule: "must",
    base: "minema",
    before: "Mul on vaja ",
    after: ".",
    answer: "minna",
  },
] as const;

export const modalFormSaid = ({ before, answer, after }: (typeof MODAL_FORMS)[number]) =>
  `${before}${answer}${after}`;

export const MODAL_TALK = {
  turns: [
    { voice: "fourth", text: ["Tere, Mari!", "Kas sa tuled täna ujuma?"] },
    { voice: "third", text: ["Täna ma ei saa.", "Ma pean kell kolm tööl olema."] },
    { voice: "fourth", text: "Aga homme?" },
    { voice: "third", text: ["Homme ma saan tulla.", "Aga Kati ei oska ujuda."] },
    { voice: "fourth", text: ["Pole midagi.", "Ta võib kohvikus oodata."] },
    { voice: "third", text: "Kas seal tohib süüa?" },
    { voice: "fourth", text: ["Vees ei tohi süüa.", "Aga kohvikus võib."] },
    { voice: "third", text: ["Hästi.", "Mis kell me läheme?"] },
    { voice: "fourth", text: ["Kell kümme.", "Ma pean kell kaksteist koju minema."] },
    {
      voice: "third",
      text: "Sa ei pea nii vara minema!",
      say: "[laughs] Sa ei pea nii vara minema!",
    },
    { voice: "fourth", text: ["Pean küll.", "Mu ema tuleb külla."] },
    { voice: "third", text: ["Selge.", "Kas mu vend võib ka tulla?"] },
    { voice: "fourth", text: ["Jah, muidugi.", "Kas ta oskab ujuda?"] },
    { voice: "third", text: "Jah, ta oskab väga hästi ujuda." },
    {
      voice: "fourth",
      text: ["Tore!", "Mina ei oska väga hästi ujuda."],
      say: "[laughs] Tore! Mina ei oska väga hästi ujuda.",
    },
    { voice: "third", text: ["Pole midagi.", "Me ujume koos."] },
    { voice: "fourth", text: ["Hästi.", "Siis homme kell kümme.", "Head aega!"] },
    { voice: "third", text: "Head aega, Jaan!" },
  ],
} as const satisfies Conversation;

const MODAL_CLIPS: Record<string, Clip> = {
  ...words(MODAL_WORDS),
  ...words(MODAL_SENTENCES),
  ...words(
    MODAL_SKILLS.flatMap((skill) => [skillSentence("oskan", skill), skillSentence("saan", skill)]),
  ),
  ...words(
    MODAL_DUTIES.flatMap((duty) =>
      (["pean", "tuleb", "vaja"] as const).map((lead) => dutySentence(lead, duty)),
    ),
  ),
  ...words(MODAL_PERMISSION.map(({ said }) => said)),
  ...words(MODAL_NOT.map(({ said }) => said)),
  ...words(
    MODAL_HEARD_KINDS.flatMap((kind) => MODAL_HEARD_VERBS.map((verb) => notSaid(kind, verb))),
  ),
  ...words(MODAL_REASONS),
  ...MODAL_DIALOGUE,
  ...words(MODAL_SAY.map(({ said }) => said)),
  ...words(MODAL_FIX.map(({ right }) => right)),
  ...words(MODAL_DRILL.map(({ said }) => said)),
  ...words(MODAL_FORMS.map(modalFormSaid)),
  "c-swim": MODAL_TALK,
};

/**
 * Lesson 32, “With, without, until, as”: -ga, -ta, -ni and -na on the genitive. Every form was
 * checked on Sõnaveeb (EKI) in November 2026.
 */
export const SOBRAGA_WITH = [
  "Mari tuleb sõbraga.",
  "Ma räägin emaga.",
  "Ma lähen bussiga tööle.",
  "Jaan tuleb rongiga.",
  "Kellega sa räägid?",
] as const;

/** Four lines said with -ga, then with -ta. */
export const SOBRAGA_WITHOUT = [
  { id: "piim", with: "Kohv piimaga, palun.", without: "Kohv piimata, palun." },
  { id: "suhkur", with: "Tee suhkruga, palun.", without: "Tee suhkruta, palun." },
  { id: "sidrun", with: "Tee sidruniga, palun.", without: "Tee sidrunita, palun." },
  { id: "auto", with: "Ma olen täna autoga.", without: "Ma olen täna autota." },
] as const;

export const SOBRAGA_UNTIL = [
  "Ma töötan kella viieni.",
  "Buss läheb Tartuni.",
  "Homseni!",
  "Nägemiseni!",
] as const;

/** Three people, each said with olema and the job, then with töötama and -na. */
export const SOBRAGA_AS = [
  { id: "kati", is: "Kati on arst.", as: "Kati töötab arstina." },
  { id: "mari", is: "Mari on õpetaja.", as: "Mari töötab õpetajana." },
  { id: "jaan", is: "Jaan on kokk.", as: "Jaan töötab kokana." },
] as const;

/** Forms to match with their meanings: two pairs share a word, so only the ending tells them apart. */
export const SOBRAGA_MATCH = [
  "lapsena",
  "lapsega",
  "piimata",
  "piimaga",
  "bussini",
  "bussiga",
] as const;

/** A word, its genitive, then the genitive with one of the four endings. */
export const SOBRAGA_CHAINS = [
  { id: "sober", steps: ["sõber", "sõbra", "sõbraga"] },
  { id: "laps", steps: ["laps", "lapse", "lapsena"] },
  { id: "suhkur", steps: ["suhkur", "suhkru", "suhkruta"] },
  { id: "pood", steps: ["pood", "poe", "poeni"] },
] as const;

export type CaseEnding = "ga" | "ta" | "ni" | "na";
export const CASE_ENDINGS: readonly CaseEnding[] = ["ga", "ta", "ni", "na"];

/** Words to build a form of, keyed by the ending: the genitive the ending goes on. */
export const SOBRAGA_FORMS = [
  { id: "buss", base: "buss", genitive: "bussi", ending: "ga" },
  { id: "raamat", base: "raamat", genitive: "raamatu", ending: "ga" },
  { id: "piim", base: "piim", genitive: "piima", ending: "ta" },
  { id: "sidrun", base: "sidrun", genitive: "sidruni", ending: "ta" },
  { id: "kool", base: "kool", genitive: "kooli", ending: "ni" },
  { id: "jogi", base: "jõgi", genitive: "jõe", ending: "ni" },
  { id: "arst", base: "arst", genitive: "arsti", ending: "na" },
  { id: "kokk", base: "kokk", genitive: "koka", ending: "na" },
] as const satisfies readonly { id: string; base: string; genitive: string; ending: CaseEnding }[];

/** Mari's message with the café order, and Kati's message with gaps. */
export const SOBRAGA_PASSAGES = {
  cafe: [
    "Tere, Kati! Kas sa oled kohvikus?",
    "Mulle üks kohv piimaga, palun.",
    "Peeter joob teed sidruniga, aga suhkruta.",
    "Jaan tahab kohvi ilma piimata.",
    "Me tuleme bussiga.",
    "Mul on aega kella kolmeni.",
  ],
  kati: [
    "Tere, Mari!",
    "Ma töötan haiglas arstina.",
    "Ma lähen tööle rongiga.",
    "Ma töötan kella neljani.",
    "Ma ei joo piima.",
    "Ma joon kohvi piimata.",
    "Homseni!",
  ],
} as const;

/** The words of “With, without, until, as” with a card, each heard on its own. */
export const SOBRAGA_TRANSLATE = [
  {
    id: "sobraga",
    answers: withPronouns([
      "Ma tulen sõbraga.",
      "Ma tulen koos sõbraga.",
      "Ma tulen sõbraga koos.",
      "Sõbraga tulen ma.",
      "Koos sõbraga tulen ma.",
      "Sõbraga koos tulen ma.",
    ]),
  },
  {
    id: "suhkruta",
    answers: withPronouns([
      "Ma joon teed suhkruta.",
      "Ma joon teed ilma suhkruta.",
      "Ma joon suhkruta teed.",
      "Ma joon ilma suhkruta teed.",
    ]),
  },
  {
    id: "kuueni",
    answers: [
      "Mari töötab kella kuueni.",
      "Mari töötab kuueni.",
      "Mari töötab kuni kella kuueni.",
      "Mari töötab kuni kuueni.",
      "Kella kuueni töötab Mari.",
      "Kuueni töötab Mari.",
    ],
  },
  {
    id: "opetajana",
    answers: [
      "Jaan töötab õpetajana.",
      "Jaan töötab õpetajaks.",
      "Õpetajana töötab Jaan.",
      "Õpetajaks töötab Jaan.",
    ],
  },
  {
    id: "bussiga",
    answers: withPronouns([
      "Me läheme bussiga Tartusse.",
      "Me läheme Tartusse bussiga.",
      "Me sõidame bussiga Tartusse.",
      "Me sõidame Tartusse bussiga.",
      "Bussiga läheme me Tartusse.",
      "Tartusse läheme me bussiga.",
      "Bussiga sõidame me Tartusse.",
      "Tartusse sõidame me bussiga.",
      "Me läheme bussiga Tartu.",
      "Me läheme Tartu bussiga.",
      "Me sõidame bussiga Tartu.",
      "Me sõidame Tartu bussiga.",
      "Bussiga läheme me Tartu.",
      "Tartu läheme me bussiga.",
      "Bussiga sõidame me Tartu.",
      "Tartu sõidame me bussiga.",
    ]),
  },
  {
    id: "lapsena",
    answers: withPronouns([
      "Lapsena elasin ma Tartus.",
      "Ma elasin lapsena Tartus.",
      "Ma elasin Tartus lapsena.",
      "Lapsena ma elasin Tartus.",
      "Tartus elasin ma lapsena.",
      "Tartus ma elasin lapsena.",
      "Lapsena elasin Tartus.",
    ]),
  },
] as const;

export const SOBRAGA_FIX = [
  { id: "fix-piimata", wrong: "Ma joon kohvi piimaga.", answers: ["Ma joon kohvi piimata."] },
  { id: "fix-emaga", wrong: "Ma räägin emana.", answers: ["Ma räägin emaga."] },
  { id: "fix-viieni", wrong: "Ma töötan kella viiega.", answers: ["Ma töötan kella viieni."] },
  {
    id: "fix-opetajana",
    wrong: "Mari töötab õpetaja.",
    answers: ["Mari töötab õpetajana.", "Mari töötab õpetajaks."],
  },
  { id: "fix-sobraga", wrong: "Jaan tuleb sõberga.", answers: ["Jaan tuleb sõbraga."] },
  { id: "fix-poeni", wrong: "Buss läheb poodini.", answers: ["Buss läheb poeni."] },
] as const;

export const SOBRAGA_DRILLED = ["Ma olen praegu rahata.", "Ma töötan kella neljani."] as const;

export const SOBRAGA_TALK: Conversation = {
  turns: [
    {
      voice: "second",
      text: ["Tere, Kati!", "Kas sa tuled laupäeval kohvikusse?", "Mari tuleb ka."],
      say: "[cheerful] Tere, Kati! Kas sa tuled laupäeval kohvikusse? Mari tuleb ka.",
    },
    {
      voice: "main",
      text: ["Tere, Jaan!", "Laupäeval ma ei saa.", "Ma lähen rongiga Tartusse."],
    },
    { voice: "second", text: ["Rongiga?", "Miks sa autoga ei lähe?"] },
    {
      voice: "main",
      text: ["Ma olen praegu autota.", "Ja rongis saab lugeda ja kohvi juua."],
    },
    { voice: "second", text: ["Kellega sa lähed?"] },
    {
      voice: "main",
      text: ["Õega.", "Lapsena elasime Pärnus.", "Nüüd elab ta Tartus ja töötab seal arstina."],
    },
    { voice: "second", text: ["Arstina?", "Tore!", "Kas ta töötab ka laupäeval?"] },
    {
      voice: "main",
      text: ["Jah, haiglas kella kaheni.", "Siis läheme koos linna ja sööme kohvikus."],
    },
    { voice: "second", text: ["Kui kaua te Tartus olete?"] },
    { voice: "main", text: ["Pühapäeva õhtuni.", "Siis tuleme bussiga tagasi."] },
    {
      voice: "second",
      text: ["Aga esmaspäeval?", "Ma töötan kella neljani.", "Siis olen vaba."],
    },
    {
      voice: "main",
      text: ["Esmaspäeval saan.", "Ma tulen kell viis.", "Kellega Mari tuleb?"],
    },
    {
      voice: "second",
      text: ["Vennaga.", "Aga ma olen praegu rahata."],
      say: "Vennaga. [sighs] Aga ma olen praegu rahata.",
    },
    {
      voice: "main",
      text: ["Pole midagi, ma maksan.", "Sa jood kohvi piimata, jah?"],
      say: "[laughs] Pole midagi, ma maksan. Sa jood kohvi piimata, jah?",
    },
    {
      voice: "second",
      text: ["Jah, piimata, aga suhkruga.", "Ja Mari joob teed sidruniga."],
    },
    { voice: "main", text: ["Hästi.", "Nägemiseni, Jaan!"] },
    { voice: "second", text: ["Nägemiseni!", "Head teed!"] },
  ],
};

export const SOBRAGA_WORDS = [
  "sõbraga",
  "emaga",
  "bussiga",
  "rongiga",
  "kellega",
  "piimaga",
  "piimata",
  "suhkruta",
  "rahata",
  "ilma",
  "ilma suhkruta",
  "kelle",
  "kella viieni",
  "Tartuni",
  "Homseni!",
  "Nägemiseni!",
  "arst",
  "arsti",
  "arstina",
  "kokana",
  "lapsena",
  "Lapsena elas Mari Tartus.",
  "poodi",
  "kooli",
  "kohvikus",
  "mulle",
  "kohv",
  "kohvi",
  "palun",
  "joob",
  "teed",
  "sidruniga",
  "aga",
  "tahab",
  "tuleme",
  "mul",
  "aega",
  "kolmeni",
] as const;

const SOBRAGA_CLIPS: Record<string, Clip> = {
  ...words([
    ...SOBRAGA_WITH,
    ...SOBRAGA_WITHOUT.flatMap((line) => [line.with, line.without]),
    ...SOBRAGA_UNTIL,
    ...SOBRAGA_AS.flatMap((line) => [line.is, line.as]),
    ...SOBRAGA_MATCH,
    ...SOBRAGA_CHAINS.flatMap(({ steps }) => steps),
    ...SOBRAGA_FORMS.map(({ genitive, ending }) => `${genitive}${ending}`),
    ...SOBRAGA_WORDS,
    ...SOBRAGA_TRANSLATE.map(({ answers }) => answers[0]),
    ...SOBRAGA_FIX.map(({ answers }) => answers[0]),
    ...SOBRAGA_DRILLED,
  ]),
  "p-cafe": { sentences: SOBRAGA_PASSAGES.cafe, voice: "second" },
  "p-kati": { sentences: SOBRAGA_PASSAGES.kati },
  "c-talk": SOBRAGA_TALK,
};

export const PRONOUN_CASES = [
  {
    id: "mina",
    short: "ma",
    genitive: "minu",
    shortGenitive: "mu",
    partitive: "mind",
    le: "minule",
    shortLe: "mulle",
    l: "minul",
    shortL: "mul",
    lt: "minult",
    shortLt: "mult",
    st: "minust",
    shortSt: null,
  },
  {
    id: "sina",
    short: "sa",
    genitive: "sinu",
    shortGenitive: "su",
    partitive: "sind",
    le: "sinule",
    shortLe: "sulle",
    l: "sinul",
    shortL: "sul",
    lt: "sinult",
    shortLt: "sult",
    st: "sinust",
    shortSt: null,
  },
  {
    id: "tema",
    short: "ta",
    genitive: "tema",
    shortGenitive: "ta",
    partitive: "teda",
    le: "temale",
    shortLe: "talle",
    l: "temal",
    shortL: "tal",
    lt: "temalt",
    shortLt: "talt",
    st: "temast",
    shortSt: null,
  },
  {
    id: "meie",
    short: "me",
    genitive: "meie",
    shortGenitive: "me",
    partitive: "meid",
    le: null,
    shortLe: "meile",
    l: null,
    shortL: "meil",
    lt: null,
    shortLt: "meilt",
    st: null,
    shortSt: "meist",
  },
  {
    id: "teie",
    short: "te",
    genitive: "teie",
    shortGenitive: "te",
    partitive: "teid",
    le: null,
    shortLe: "teile",
    l: null,
    shortL: "teil",
    lt: null,
    shortLt: "teilt",
    st: null,
    shortSt: "teist",
  },
  {
    id: "nemad",
    short: "nad",
    genitive: "nende",
    shortGenitive: null,
    partitive: "neid",
    le: "nendele",
    shortLe: "neile",
    l: "nendel",
    shortL: "neil",
    lt: "nendelt",
    shortLt: "neilt",
    st: "nendest",
    shortSt: "neist",
  },
] as const;

export type PronounCase = (typeof PRONOUN_CASES)[number];
export type PronounId = PronounCase["id"];
export const pronounWith = (genitive: string, ending: "ga" | "ta") => `${genitive}${ending}`;

export const PRONOUN_WITH = [
  "Tule minuga!",
  "Ma räägin temaga.",
  "Kas sa tuled meiega?",
  "Ma ei tule sinuta.",
  "Kas sa lähed nendega?",
] as const;

export const PRONOUN_SHORT = ["Helista mulle!", "Mul on aega.", "Ma küsin teilt."] as const;

export type PronounWay = "le" | "l" | "lt";
export const PRONOUN_WAYS: readonly PronounWay[] = ["le", "l", "lt"];

export function pronounShort(person: PronounCase, way: PronounWay): string {
  if (way === "le") return person.shortLe;
  if (way === "lt") return person.shortLt;
  return person.shortL;
}

export function pronounSentence(way: PronounWay, form: string): string {
  if (way === "le") return `Jaan helistab ${form}.`;
  if (way === "lt") return `Jaan küsib ${form}.`;
  return `${capital(form)} on aega.`;
}

export const PRONOUN_PARTITIVE = [
  "Ma armastan sind.",
  "Oota mind!",
  "Ma ootan teda.",
  "Me ootame teid.",
  "Nad ootavad meid.",
  "Kas sa ootad neid?",
] as const;

export const PRONOUN_WHICH = [
  {
    id: "minu-kass",
    person: "mina",
    form: "genitive",
    said: "See on minu kass.",
    cue: "See on … kass.",
  },
  {
    id: "jaan-ootab-mind",
    person: "mina",
    form: "partitive",
    said: "Jaan ootab mind.",
    cue: "Jaan ootab …",
  },
  { id: "sul-aega", person: "sina", form: "l", said: "Kas sul on aega?", cue: "Kas … on aega?" },
  {
    id: "armastan-sind",
    person: "sina",
    form: "partitive",
    said: "Ma armastan sind.",
    cue: "Ma armastan …",
  },
  { id: "tal-auto", person: "tema", form: "l", said: "Tal on auto.", cue: "… on auto." },
  {
    id: "tema-raamat",
    person: "tema",
    form: "genitive",
    said: "Kus on tema raamat?",
    cue: "Kus on … raamat?",
  },
  { id: "meil-kass", person: "meie", form: "l", said: "Meil on kass.", cue: "… on kass." },
  {
    id: "nende-auto",
    person: "nemad",
    form: "genitive",
    said: "See on nende auto.",
    cue: "See on … auto.",
  },
  {
    id: "ootad-neid",
    person: "nemad",
    form: "partitive",
    said: "Kas sa ootad neid?",
    cue: "Kas sa ootad …?",
  },
] as const satisfies readonly {
  id: string;
  person: PronounId;
  form: "genitive" | "l" | "partitive";
  said: string;
  cue: string;
}[];

export const PRONOUN_ABOUT = ["Ma räägin sinust.", "Nad räägivad meist."] as const;

export const PRONOUN_TRANSLATE = [
  { id: "tule-minuga", answers: ["Tule minuga!", "Tulge minuga!"] },
  { id: "ootan-sind", answers: ["Ma ootan sind.", "Mina ootan sind.", "Ootan sind."] },
  { id: "helista-mulle", answers: ["Helista mulle!", "Helista minule!"] },
  { id: "sul-on-aega", answers: ["Kas sul on aega?", "Kas sinul on aega?", "Sul on aega?"] },
  {
    id: "raagime-sinust",
    answers: ["Me räägime sinust.", "Meie räägime sinust.", "Räägime sinust."],
  },
  { id: "kusib-temalt", answers: ["Jaan küsib temalt.", "Jaan küsib talt."] },
] as const;

export const PRONOUN_FIX = [
  { id: "fix-minuga", wrong: "Tule minaga!", answers: ["Tule minuga!"] },
  { id: "fix-sind", wrong: "Ma ootan sinu.", answers: ["Ma ootan sind."] },
  { id: "fix-mul", wrong: "Minu on aega.", answers: ["Mul on aega.", "Minul on aega."] },
  {
    id: "fix-minu-nimi",
    wrong: "Mina nimi on Kati.",
    answers: ["Minu nimi on Kati.", "Mu nimi on Kati."],
  },
  { id: "fix-mulle", wrong: "Helista mind!", answers: ["Helista mulle!", "Helista minule!"] },
] as const;

export const PRONOUN_MESSAGE = [
  "Tere, Mari!",
  "Kas sa tuled täna minuga kohvikusse?",
  "Jaan tuleb ka meiega.",
  "Ma ootan sind kell viis.",
  "Mul on sulle raamat.",
  "Helista mulle!",
] as const;

export const PRONOUN_CALL: Conversation = {
  turns: [
    {
      voice: "second",
      text: ["Tere, Jaan! See on Mari.", "Kas sul on täna aega?"],
      say: "[cheerful] Tere, Jaan! See on Mari. Kas sul on täna aega?",
    },
    { voice: "main", text: ["Tere, Mari! Jah, mul on aega.", "Miks sa küsid?"] },
    { voice: "second", text: ["Me läheme Katiga kohvikusse.", "Kas sa tuled meiega?"] },
    {
      voice: "main",
      text: ["Jah, ma tulen teiega.", "Kas Peeter tuleb ka?"],
      say: "[pleased] Jah, ma tulen teiega. Kas Peeter tuleb ka?",
    },
    {
      voice: "second",
      text: [
        "Ei, Peeter ei tule.",
        "Tal pole täna aega, ta on tööl.",
        "Aga ta helistab sulle homme.",
      ],
    },
    { voice: "main", text: ["Hästi.", "Mul on talle raamat."] },
    { voice: "second", text: "Mis raamat see on?" },
    { voice: "main", text: "Üks hea raamat Tallinnast." },
    { voice: "second", text: "Peeter armastab Tallinna!" },
    { voice: "main", text: ["Ma tean.", "Ta räägib mulle palju Tallinnast."] },
    {
      voice: "second",
      text: ["Kati räägib ka sinust palju.", "Ta tahab sinuga rääkida."],
      say: "[teasing] Kati räägib ka sinust palju. Ta tahab sinuga rääkida.",
    },
    {
      voice: "main",
      text: ["Minuga?", "Mida ta minult tahab?"],
      say: "[surprised] Minuga? Mida ta minult tahab?",
    },
    {
      voice: "second",
      text: ["Ma ei tea.", "Küsi temalt!"],
      say: "[laughs] Ma ei tea. Küsi temalt!",
    },
    { voice: "main", text: ["Hästi, ma küsin temalt.", "Kas Kati tuleb sinuga?"] },
    {
      voice: "second",
      text: [
        "Jah, ta tuleb minuga.",
        "Me ootame sind kell seitse kohvikus.",
        "Kas sa tuled bussiga?",
      ],
    },
    { voice: "main", text: ["Ei, ma tulen autoga.", "Kas ma ostan Katile kohvi?"] },
    { voice: "second", text: ["Jah, osta talle kohvi piimaga!", "Ja helista mulle kell kuus."] },
    { voice: "main", text: ["Hästi.", "Aitäh sulle!"] },
    { voice: "second", text: ["Nägemiseni!", "Kell seitse kohvikus!"] },
  ],
};

export const PRONOUN_WORDS = [
  "keda?",
  "kellega?",
  "kellele?",
  "kellel?",
  "kellelt?",
  "kellest?",
  "Keda sa ootad?",
  "Jaan ootab teda.",
  "helistab",
  "küsib",
  "ootan",
  "armastan",
  "Mul on kass.",
] as const;

const PRONOUN_TABLE_FORMS = PRONOUN_CASES.flatMap((person) => [
  person.id,
  person.short,
  person.genitive,
  person.shortGenitive,
  person.partitive,
  pronounWith(person.genitive, "ga"),
  pronounWith(person.genitive, "ta"),
  person.le,
  person.shortLe,
  person.l,
  person.shortL,
  person.lt,
  person.shortLt,
  person.st,
  person.shortSt,
]).filter((form): form is string => form !== null);

const PRONOUN_CLIPS: Record<string, Clip> = {
  ...words([
    ...new Set([
      ...PRONOUN_TABLE_FORMS,
      ...PRONOUN_WITH,
      ...PRONOUN_SHORT,
      ...PRONOUN_CASES.flatMap((person) =>
        PRONOUN_WAYS.map((way) => pronounSentence(way, pronounShort(person, way))),
      ),
      ...PRONOUN_PARTITIVE,
      ...PRONOUN_WHICH.map(({ said }) => said),
      ...PRONOUN_ABOUT,
      ...PRONOUN_TRANSLATE.map(({ answers }) => answers[0]),
      ...PRONOUN_FIX.map(({ answers }) => answers[0]),
      ...PRONOUN_WORDS,
    ]),
  ]),
  "p-message": { sentences: PRONOUN_MESSAGE },
  "c-call": PRONOUN_CALL,
};

export const ordinalClip = (n: number) => `o${n}`;
export const ordinalOnClip = (n: number) => `on${n}`;

export const MONTH_DAYS: readonly number[] = Array.from({ length: 31 }, (_, i) => i + 1);

export const JARGARVUD_CHAINS = [
  { n: 4, genitive: "nelja" },
  { n: 5, genitive: "viie" },
  { n: 6, genitive: "kuue" },
  { n: 7, genitive: "seitsme" },
  { n: 8, genitive: "kaheksa" },
  { n: 10, genitive: "kümne" },
  { n: 3, genitive: "kolme" },
] as const;

export const JARGARVUD_MAKE = [6, 3, 9, 7, 10, 5] as const;

export const JARGARVUD_ON = [1, 2, 3, 5, 10, 13, 20, 21] as const;

export const JARGARVUD_DATES = [
  "Mis kuupäev täna on?",
  "Mitmes täna on?",
  "Täna on kahekümne esimene november.",
  "Homme on kahekümne teine november.",
  "Täna on esimene jaanuar.",
] as const;

export const JARGARVUD_ON_SENTENCES = [
  "Minu sünnipäev on viiendal mail.",
  "Millal sinu sünnipäev on?",
  "Ma elan kolmandal korrusel.",
  "Mitmendal korrusel sa elad?",
] as const;

export const JARGARVUD_HEARD = [
  { said: "Täna on teine veebruar.", day: 2, month: 2 },
  { said: "Homme on kolmeteistkümnes märts.", day: 13, month: 3 },
  { said: "Jaan tuleb esimesel septembril.", day: 1, month: 9 },
  { said: "Pood on suletud kahekümne viiendal detsembril.", day: 25, month: 12 },
  { said: "Ema sünnipäev on kaheteistkümnendal aprillil.", day: 12, month: 4 },
  { said: "Täna on kolmekümne esimene oktoober.", day: 31, month: 10 },
  { said: "Eesti sünnipäev on kahekümne neljandal veebruaril.", day: 24, month: 2 },
  { said: "Ma lähen Tartusse kaheksandal juunil.", day: 8, month: 6 },
  { said: "Homme on kahekümnes juuli.", day: 20, month: 7 },
] as const;

export const JARGARVUD_WHICH = [
  {
    id: "viies-mai",
    way: "which",
    base: "5.",
    cue: "Täna on … mai.",
    answer: "viies",
    said: "Täna on viies mai.",
    options: ["viis", "viies", "viiendal"],
  },
  {
    id: "viiendal-mail",
    way: "on",
    base: "5.",
    cue: "Minu sünnipäev on … mail.",
    answer: "viiendal",
    said: "Minu sünnipäev on viiendal mail.",
    options: ["viis", "viies", "viiendal"],
  },
  {
    id: "kolm-kassi",
    way: "count",
    base: "3",
    cue: "Mul on … kassi.",
    answer: "kolm",
    said: "Mul on kolm kassi.",
    options: ["kolm", "kolmas", "kolmandal"],
  },
  {
    id: "kolmandal-korrusel",
    way: "on",
    base: "3.",
    cue: "Ma elan … korrusel.",
    answer: "kolmandal",
    said: "Ma elan kolmandal korrusel.",
    options: ["kolm", "kolmas", "kolmandal"],
  },
  {
    id: "esimene-september",
    way: "which",
    base: "1.",
    cue: "Homme on … september.",
    answer: "esimene",
    said: "Homme on esimene september.",
    options: ["üks", "esimene", "esimesel"],
  },
  {
    id: "esimesel-septembril",
    way: "on",
    base: "1.",
    cue: "Jaan tuleb … septembril.",
    answer: "esimesel",
    said: "Jaan tuleb esimesel septembril.",
    options: ["üks", "esimene", "esimesel"],
  },
  {
    id: "kaks-last",
    way: "count",
    base: "2",
    cue: "Mul on … last.",
    answer: "kaks",
    said: "Mul on kaks last.",
    options: ["kaks", "teine", "teisel"],
  },
  {
    id: "teine-aprill",
    way: "which",
    base: "2.",
    cue: "Täna on … aprill.",
    answer: "teine",
    said: "Täna on teine aprill.",
    options: ["kaks", "teine", "teisel"],
  },
  {
    id: "kumme-eurot",
    way: "count",
    base: "10",
    cue: "Raamat maksab … eurot.",
    answer: "kümme",
    said: "Raamat maksab kümme eurot.",
    options: ["kümme", "kümnes", "kümnendal"],
  },
] as const satisfies readonly {
  id: string;
  way: "count" | "which" | "on";
  base: string;
  cue: string;
  answer: string;
  said: string;
  options: readonly [string, string, string];
}[];

export const JARGARVUD_TRANSLATE = [
  { id: "teine-mai", answers: ["Täna on teine mai."] },
  { id: "kumnes", answers: ["Homme on kümnes."] },
  {
    id: "kolmandal-juunil",
    answers: ["Minu sünnipäev on kolmandal juunil.", "Mu sünnipäev on kolmandal juunil."],
  },
  {
    id: "neljandal-korrusel",
    answers: [
      "Ma elan neljandal korrusel.",
      "Mina elan neljandal korrusel.",
      "Elan neljandal korrusel.",
    ],
  },
  { id: "esimesel-martsil", answers: ["Jaan tuleb esimesel märtsil."] },
  {
    id: "mis-kuupaev",
    answers: ["Mis kuupäev täna on?", "Mis kuupäev on täna?", "Mitmes täna on?", "Mitmes on täna?"],
  },
] as const;

export const JARGARVUD_FIX = [
  { id: "fix-viies", wrong: "Täna on viis mai.", answers: ["Täna on viies mai."] },
  {
    id: "fix-viiendal",
    wrong: "Minu sünnipäev on viies mail.",
    answers: ["Minu sünnipäev on viiendal mail."],
  },
  { id: "fix-kolmas", wrong: "Täna on kolmes märts.", answers: ["Täna on kolmas märts."] },
  {
    id: "fix-esimesel",
    wrong: "Jaan tuleb esimene septembril.",
    answers: ["Jaan tuleb esimesel septembril."],
  },
  {
    id: "fix-kahekumne",
    wrong: "Täna on kahekümnes esimene november.",
    answers: ["Täna on kahekümne esimene november."],
  },
  {
    id: "fix-korrusel",
    wrong: "Ma elan neljandal korrus.",
    answers: ["Ma elan neljandal korrusel."],
  },
] as const;

export const JARGARVUD_MESSAGE = [
  "Tere! Minu sünnipäev on laupäeval, kahekümne kolmandal märtsil.",
  "Tule kell kuus.",
  "Minu korter on neljandal korrusel.",
  "Peeter tuleb ka, kell seitse.",
  "Tema sünnipäev on kolmekümne esimesel märtsil.",
  "Kas sa tuled?",
] as const;

export const JARGARVUD_TALK: Conversation = {
  turns: [
    { voice: "second", text: ["Tere, Jaan!", "Kas sa tead, mis kuupäev täna on?"] },
    { voice: "main", text: ["Tere, Mari!", "Täna on kahekümne kolmas november."] },
    {
      voice: "second",
      text: ["Oi!", "Homme on Kati sünnipäev."],
      say: "[surprised] Oi! Homme on Kati sünnipäev.",
    },
    { voice: "main", text: "Kahekümne neljandal novembril?" },
    {
      voice: "second",
      text: ["Jah.", "Me läheme laupäeval temaga kohvikusse.", "Kohvik on teisel korrusel."],
    },
    { voice: "main", text: ["Hästi.", "Mis kell?"] },
    { voice: "second", text: ["Kell kuus.", "Kati ootab meid kohvikus."] },
    { voice: "main", text: "Kas Peeter tuleb ka?" },
    {
      voice: "second",
      text: ["Ei.", "Peeter on Tartus.", "Ta tuleb Tallinna esimesel detsembril."],
    },
    { voice: "main", text: ["Esimesel detsembril?", "See on teisipäev."] },
    { voice: "second", text: ["Jah.", "Aga millal sinu sünnipäev on?"] },
    { voice: "main", text: ["Minu sünnipäev on kolmekümnendal juulil.", "Ja sinu?"] },
    {
      voice: "second",
      text: [
        "Minu sünnipäev on kaheteistkümnendal jaanuaril.",
        "Aga minu ema sünnipäev on ka kolmekümnendal juulil!",
      ],
      say: "Minu sünnipäev on kaheteistkümnendal jaanuaril. [excited] Aga minu ema sünnipäev on ka kolmekümnendal juulil!",
    },
    { voice: "main", text: "Kas sa elad neljandal korrusel?" },
    {
      voice: "second",
      text: ["Ei, ma elan esimesel korrusel.", "Ja sina?"],
    },
    {
      voice: "main",
      text: ["Mina elan seitsmendal korrusel.", "Majas on seitse korrust."],
    },
    {
      voice: "second",
      text: ["Seitsmendal!", "Hästi, laupäevani!"],
      say: "[laughs] Seitsmendal! Hästi, laupäevani!",
    },
    { voice: "main", text: ["Laupäevani!", "Kell kuus, teisel korrusel!"] },
  ],
};

export const JARGARVUD_DRILL = [
  "Täna on kuues mai.",
  "Homme on seitsmes juuni.",
  "Mul on viis kassi.",
] as const;

export const JARGARVUD_WORDS = [
  ...[3, 4, 5, 6, 7, 8, 10, 11, 20].map((n) => numberWords(n)),
  ...JARGARVUD_CHAINS.map(({ genitive }) => genitive),
  "üheteistkümne",
  "kahekümne",
  "mitu",
  "mitmes",
  "mitmendal",
  "kuupäev",
  "korrus",
  "sünnipäev",
  "esmaspäev",
  ...MONTHS.map(({ name }) => name),
  "viiendal mail",
];

const JARGARVUD_CLIPS: Record<string, Clip> = {
  ...Object.fromEntries(MONTH_DAYS.map((n) => [ordinalClip(n), ordinalWords(n)])),
  ...Object.fromEntries(JARGARVUD_ON.map((n) => [ordinalOnClip(n), ordinalOn(n)])),
  ...words([
    ...new Set([
      ...JARGARVUD_WORDS,
      ...JARGARVUD_DATES,
      ...JARGARVUD_ON_SENTENCES,
      ...JARGARVUD_HEARD.map(({ said }) => said),
      ...JARGARVUD_WHICH.map(({ said }) => said),
      ...JARGARVUD_TRANSLATE.map(({ answers }) => answers[0]),
      ...JARGARVUD_FIX.map(({ answers }) => answers[0]),
      ...JARGARVUD_DRILL,
    ]),
  ]),
  "c-aastal": "Aastal kaks tuhat kakskümmend kuus.",
  "p-message": { sentences: JARGARVUD_MESSAGE, voice: "second" },
  "c-talk": JARGARVUD_TALK,
};

export const WHEN_L = [
  { base: "hommik", form: "hommikul", said: "Ma joon hommikul kohvi." },
  { base: "päev", form: "päeval", said: "Jaan töötab päeval." },
  { base: "õhtu", form: "õhtul", said: "Me oleme õhtul kodus." },
  { base: "öö", form: "öösel", said: "Kass magab öösel." },
  { base: "kevad", form: "kevadel", said: "Mari tuleb kevadel." },
  { base: "suvi", form: "suvel", said: "Me ujume suvel jões." },
  { base: "sügis", form: "sügisel", said: "Kati läheb sügisel kooli." },
  { base: "talv", form: "talvel", said: "Ta elab talvel Tartus." },
] as const;

export const WHEN_S = [
  { base: "jaanuar", form: "jaanuaris", said: "Ma olen jaanuaris Tallinnas." },
  { base: "mai", form: "mais", said: "Mari sünnipäev on mais." },
  { base: "juuli", form: "juulis", said: "Me oleme juulis Pärnus." },
  { base: "detsember", form: "detsembris", said: "Jaan tuleb detsembris." },
] as const;

export const WHEN_COMBINED = [
  "Me läheme laupäeva õhtul kohvikusse.",
  "Ma töötan esmaspäeva hommikul.",
] as const;

export const WHEN_EVERY = [
  "Ma joon hommikuti kohvi.",
  "Jaan töötab õhtuti.",
  "Me ujume laupäeviti.",
] as const;

export const WHEN_SORT = [
  { w: "mai", bin: "s" },
  { w: "november", bin: "s" },
  { w: "juuli", bin: "s" },
  { w: "märts", bin: "s" },
  { w: "suvi", bin: "l" },
  { w: "talv", bin: "l" },
  { w: "hommik", bin: "l" },
  { w: "õhtu", bin: "l" },
  { w: "esmaspäev", bin: "l" },
  { w: "kevad", bin: "l" },
] as const;

export const WHEN_SPANS = [
  { id: "paev", one: "päev", ago: "päev tagasi", eest: "päeva eest", in: "päeva pärast" },
  { id: "nadal", one: "nädal", ago: "nädal tagasi", eest: "nädala eest", in: "nädala pärast" },
  { id: "aasta", one: "aasta", ago: "aasta tagasi", eest: "aasta eest", in: "aasta pärast" },
  {
    id: "kaks-paeva",
    one: "kaks päeva",
    ago: "kaks päeva tagasi",
    eest: "kahe päeva eest",
    in: "kahe päeva pärast",
  },
  {
    id: "kolm-nadalat",
    one: "kolm nädalat",
    ago: "kolm nädalat tagasi",
    eest: "kolme nädala eest",
    in: "kolme nädala pärast",
  },
] as const;

export const WHEN_SPAN_SAID = [
  "Ma tulen nädala pärast.",
  "Ma olin Tartus nädal tagasi.",
  "Mari tuleb kahe päeva pärast.",
  "Jaan helistas kaks päeva tagasi.",
  "Me läheme Pärnusse aasta pärast.",
  "Kati elas siin aasta tagasi.",
] as const;

export const WHEN_AROUND = [
  "Ma tulen pärast tööd.",
  "Ma joon enne tööd kohvi.",
  "Mari läheb pärast kooli koju.",
  "Helista mulle enne kella viit!",
] as const;

export const WHEN_HEARD = [
  { said: "Ma tulen nädala pärast.", kind: "in" },
  { said: "Ma olin Tartus nädal tagasi.", kind: "ago" },
  { said: "Ma tulen pärast tööd.", kind: "after" },
  { said: "Mari tuleb kahe päeva pärast.", kind: "in" },
  { said: "Jaan helistas kaks päeva tagasi.", kind: "ago" },
  { said: "Mari läheb pärast kooli koju.", kind: "after" },
] as const;

export const WHEN_FROM = [
  "Pood on avatud esmaspäevast reedeni.",
  "Ma töötan kella kaheksast kella viieni.",
  "Me oleme Pärnus juunist augustini.",
] as const;

export const WHEN_SHOP = [
  "Tere!",
  "Meie pood on avatud esmaspäevast reedeni.",
  "Me töötame kella üheksast kella kuueni.",
  "Laupäeval oleme avatud kella kümnest kella kolmeni.",
  "Pühapäeval on pood suletud.",
  "Juulis on pood suletud.",
] as const;

export const WHEN_TRANSLATE = [
  {
    id: "hommikul",
    answers: withPronouns([
      "Ma töötan hommikul.",
      "Hommikul töötan ma.",
      "Hommikul ma töötan.",
      "Ma töötan hommikuti.",
      "Hommikuti töötan ma.",
      "Hommikuti ma töötan.",
    ]),
  },
  {
    id: "juulis",
    answers: withPronouns([
      "Me oleme juulis Pärnus.",
      "Juulis oleme me Pärnus.",
      "Juulis me oleme Pärnus.",
      "Me oleme Pärnus juulis.",
    ]),
  },
  {
    id: "nadala-parast",
    answers: withPronouns([
      "Ma tulen nädala pärast.",
      "Nädala pärast tulen ma.",
      "Nädala pärast ma tulen.",
    ]),
  },
  {
    id: "kaks-paeva-tagasi",
    answers: [
      "Jaan oli siin kaks päeva tagasi.",
      "Kaks päeva tagasi oli Jaan siin.",
      "Kaks päeva tagasi Jaan oli siin.",
      "Jaan oli kaks päeva tagasi siin.",
      "Jaan oli siin kahe päeva eest.",
      "Kahe päeva eest oli Jaan siin.",
      "Kahe päeva eest Jaan oli siin.",
      "Jaan oli kahe päeva eest siin.",
    ],
  },
  {
    id: "parast-tood",
    answers: withPronouns([
      "Ma lähen pärast tööd koju.",
      "Pärast tööd lähen ma koju.",
      "Pärast tööd ma lähen koju.",
      "Ma lähen koju pärast tööd.",
    ]),
  },
  {
    id: "esmaspaevast",
    answers: [
      "Pood on avatud esmaspäevast reedeni.",
      "Pood on esmaspäevast reedeni avatud.",
      "Esmaspäevast reedeni on pood avatud.",
      "Esmaspäevast reedeni pood on avatud.",
    ],
  },
] as const;

export const WHEN_FIX = [
  { id: "fix-nadala", wrong: "Ma tulen nädal pärast.", answers: ["Ma tulen nädala pärast."] },
  {
    id: "fix-nadal",
    wrong: "Ma olin Tartus nädala tagasi.",
    answers: ["Ma olin Tartus nädal tagasi."],
  },
  {
    id: "fix-suvel",
    wrong: "Me ujume suves jões.",
    answers: ["Me ujume suvel jões.", "Me ujume suviti jões."],
  },
  { id: "fix-mais", wrong: "Mari sünnipäev on mail.", answers: ["Mari sünnipäev on mais."] },
  { id: "fix-tood", wrong: "Ma tulen pärast töö.", answers: ["Ma tulen pärast tööd."] },
  {
    id: "fix-kaheksast",
    wrong: "Ma töötan kella kaheksa kella viieni.",
    answers: ["Ma töötan kella kaheksast kella viieni."],
  },
] as const;

export const WHEN_TALK: Conversation = {
  turns: [
    {
      voice: "second",
      text: ["Tere, Jaan!", "Kas sa oled juba Tallinnas?"],
      say: "[cheerful] Tere, Jaan! Kas sa oled juba Tallinnas?",
    },
    {
      voice: "main",
      text: [
        "Tere, Kati!",
        "Ei, ma olen veel Tartus.",
        "Ma tulen Tallinna nädala pärast, esmaspäeval.",
      ],
    },
    { voice: "second", text: ["Esmaspäeval?", "Millal sa olid viimati Tallinnas?"] },
    { voice: "main", text: ["Kolm nädalat tagasi.", "Aga esmaspäeval töötan ma terve päeva."] },
    { voice: "second", text: "Kas sa töötad ka õhtul?" },
    {
      voice: "main",
      text: ["Ei, ma töötan kella kaheksast kella neljani.", "Pärast tööd on mul aega."],
    },
    {
      voice: "second",
      text: ["Väga hea!", "Me läheme esmaspäeva õhtul Mariga kohvikusse.", "Tule ka!"],
      say: "[pleased] Väga hea! Me läheme esmaspäeva õhtul Mariga kohvikusse. Tule ka!",
    },
    { voice: "main", text: ["Jah, ma tulen.", "Kas Mari elab nüüd Tallinnas?"] },
    {
      voice: "second",
      text: [
        "Jah, ta tuli Tallinna kaks päeva tagasi.",
        "Suvel elas ta Pärnus.",
        "Nüüd töötab ta kella üheksast kella viieni.",
      ],
    },
    { voice: "main", text: "Ja laupäeval?" },
    { voice: "second", text: "Laupäeval ta ei tööta." },
    { voice: "main", text: ["Mina olen juulis Pärnus.", "Ma ei tööta juulis."] },
    { voice: "second", text: ["Mina ei tööta augustis.", "Augustis lähen ma Saaremaale."] },
    { voice: "main", text: ["Augustis?", "Kas terve kuu?"] },
    { voice: "second", text: "Ei, kaks nädalat." },
    { voice: "main", text: ["Tore!", "Ja talvel?"], say: "[curious] Tore! Ja talvel?" },
    {
      voice: "second",
      text: ["Talvel töötan ma palju, hommikuti ja õhtuti.", "Aga jaanuaris on mul aega."],
      say: "[sighs] Talvel töötan ma palju, hommikuti ja õhtuti. Aga jaanuaris on mul aega.",
    },
    { voice: "main", text: ["Hästi.", "Ma helistan sulle pühapäeval."] },
    { voice: "second", text: ["Hästi, pühapäevani!", "Ja esmaspäeval kell seitse kohvikus!"] },
  ],
};

export const WHEN_WORDS = [
  "esmaspäeval",
  "laupäeva õhtul",
  "hommikul",
  "päeval",
  "õhtul",
  "öösel",
  "kevadel",
  "suvel",
  "sügisel",
  "talvel",
  "hommik",
  "päev",
  "õhtu",
  "öö",
  "kevad",
  "suvi",
  "sügis",
  "talv",
  "jaanuar",
  "mai",
  "juuli",
  "detsember",
  "november",
  "märts",
  "esmaspäev",
  "jaanuaris",
  "mais",
  "juulis",
  "detsembris",
  "hommikuti",
  "õhtuti",
  "laupäeviti",
  "tagasi",
  "pärast",
  "enne",
  "millal?",
  "nädal tagasi",
  "nädala pärast",
  "pärast tööd",
  "enne tööd",
  "kella kaheksast",
  "kella viieni",
  "esmaspäevast reedeni",
  ...WHEN_SPANS.flatMap((span) => [span.ago, span.in]),
] as const;

export const WHEN_DRILL = [
  "Me läheme Pärnusse aasta pärast.",
  "Jaan tuleb kolme nädala pärast.",
  "Ma olin Tallinnas kolm nädalat tagasi.",
  "Ma ujun suvel.",
  "Ma töötan õhtuti.",
] as const;

const WHEN_CLIPS: Record<string, Clip> = {
  ...words([
    ...new Set([
      ...WHEN_WORDS,
      ...WHEN_L.map(({ said }) => said),
      ...WHEN_S.map(({ said }) => said),
      ...WHEN_COMBINED,
      ...WHEN_EVERY,
      ...WHEN_SPAN_SAID,
      ...WHEN_AROUND,
      ...WHEN_FROM,
      ...WHEN_TRANSLATE.map(({ answers }) => answers[0]),
      ...WHEN_FIX.map(({ answers }) => answers[0]),
      ...WHEN_DRILL,
    ]),
  ]),
  "p-shop": { sentences: WHEN_SHOP, voice: "third" },
  "c-talk": WHEN_TALK,
};

export const ORDER_PAIRS = [
  { id: "tana", plain: "Ma lähen täna Tartusse.", front: "Täna lähen ma Tartusse.", first: "Täna" },
  {
    id: "hommikul",
    plain: "Mari joob hommikul kohvi.",
    front: "Hommikul joob Mari kohvi.",
    first: "Hommikul",
  },
  { id: "ohtul", plain: "Me oleme õhtul kodus.", front: "Õhtul oleme me kodus.", first: "Õhtul" },
  {
    id: "laupaeval",
    plain: "Jaan töötab laupäeval.",
    front: "Laupäeval töötab Jaan.",
    first: "Laupäeval",
  },
  { id: "tartus", plain: "Kati elab Tartus.", front: "Tartus elab Kati.", first: "Tartus" },
  {
    id: "homme",
    plain: "Ma pean homme tööle minema.",
    front: "Homme pean ma tööle minema.",
    first: "Homme",
  },
] as const;

export const ORDER_QUESTIONS = [
  "Kus sa elad?",
  "Mida sa täna teed?",
  "Millal sa tuled?",
  "Kellega te räägite?",
  "Kas sa tuled homme?",
] as const;

export const ORDER_TWO = [
  "Homme pean ma tööle minema.",
  "Õhtul tahan ma raamatut lugeda.",
  "Laupäeval läheme me ujuma.",
] as const;

export const ORDER_NO = [
  "Täna ma ei tööta.",
  "Homme me ei tule.",
  "Õhtul ta ei ole kodus.",
] as const;

export const ORDER_HEARD = [
  { said: "Täna lähen ma Tartusse." },
  { said: "Hommikul joob Mari kohvi." },
  { said: "Tartus elab Kati." },
  { said: "Kus sa elad?" },
  { said: "Laupäeval läheme me ujuma." },
  { said: "Täna ma ei tööta." },
  { said: "Homme pean ma tööle minema." },
  { said: "Millal sa tuled?" },
] as const;

export const ORDER_MEANING = [
  { id: "kus-elad", answers: withPronouns(["Kus sa elad?"]) },
  {
    id: "tana-tootan",
    answers: withPronouns([
      "Täna töötan ma kodus.",
      "Ma töötan täna kodus.",
      "Täna ma töötan kodus.",
      "Ma töötan kodus täna.",
      "Ma täna töötan kodus.",
    ]),
  },
  { id: "mida-teed", answers: withPronouns(["Mida sa täna teed?", "Mida sa teed täna?"]) },
  {
    id: "homme-pean",
    answers: withPronouns([
      "Homme pean ma tööle minema.",
      "Homme pean ma minema tööle.",
      "Homme ma pean tööle minema.",
      "Homme ma pean minema tööle.",
      "Ma pean homme tööle minema.",
      "Ma pean homme minema tööle.",
    ]),
  },
  {
    id: "ohtul-tahan",
    answers: withPronouns([
      "Õhtul tahan ma raamatut lugeda.",
      "Õhtul tahan ma lugeda raamatut.",
      "Õhtul ma tahan raamatut lugeda.",
      "Õhtul ma tahan lugeda raamatut.",
      "Ma tahan õhtul raamatut lugeda.",
      "Ma tahan õhtul lugeda raamatut.",
      "Ma tahan raamatut lugeda õhtul.",
      "Ma tahan lugeda raamatut õhtul.",
    ]),
  },
  {
    id: "homme-ei-tule",
    answers: withPronouns([
      "Homme me ei tule.",
      "Homme ei tule me.",
      "Me ei tule homme.",
      "Me homme ei tule.",
    ]),
  },
  {
    id: "ohtul-ei-ole",
    answers: [
      "Õhtul ta ei ole kodus.",
      "Õhtul ei ole ta kodus.",
      "Ta ei ole õhtul kodus.",
      "Ta õhtul ei ole kodus.",
      "Ta ei ole kodus õhtul.",
    ],
  },
  {
    id: "laupaeval-ujuma",
    answers: withPronouns([
      "Laupäeval läheme me ujuma.",
      "Laupäeval me läheme ujuma.",
      "Me läheme laupäeval ujuma.",
      "Me läheme ujuma laupäeval.",
    ]),
  },
] as const;

const ORDER_REWRITE_MORE: Record<string, readonly string[]> = {
  tana: ["Täna ma lähen Tartusse."],
  hommikul: ["Hommikul Mari joob kohvi."],
  laupaeval: ["Laupäeval Jaan töötab."],
  ohtul: ["Õhtul me oleme kodus."],
  homme: [
    "Homme pean ma minema tööle.",
    "Homme ma pean tööle minema.",
    "Homme ma pean minema tööle.",
  ],
};

export const ORDER_REWRITE = ORDER_PAIRS.map(({ id, plain, front, first }) => ({
  id: `start-${id}`,
  from: plain,
  first,
  answers: withPronouns([front, ...(ORDER_REWRITE_MORE[id] ?? [])]),
}));

export const ORDER_TRANSLATE = [
  {
    id: "tana-tartusse",
    answers: withPronouns([
      "Täna lähen ma Tartusse.",
      "Täna ma lähen Tartusse.",
      "Ma lähen täna Tartusse.",
      "Ma lähen Tartusse täna.",
    ]),
  },
  { id: "kus-elad", answers: withPronouns(["Kus sa elad?"]) },
  {
    id: "homme-tootama",
    answers: withPronouns([
      "Homme pean ma töötama.",
      "Homme ma pean töötama.",
      "Ma pean homme töötama.",
    ]),
  },
  {
    id: "tana-ei-too",
    answers: withPronouns([
      "Täna me ei tööta.",
      "Täna ei tööta me.",
      "Me ei tööta täna.",
      "Me täna ei tööta.",
    ]),
  },
  {
    id: "hommikul-joob",
    answers: [
      "Hommikul joob Mari kohvi.",
      "Hommikul Mari joob kohvi.",
      "Mari joob hommikul kohvi.",
      "Mari joob kohvi hommikul.",
    ],
  },
  {
    id: "laupaeval-teed",
    answers: withPronouns([
      "Mida sa laupäeval teed?",
      "Mida sa teed laupäeval?",
      "Mis sa laupäeval teed?",
      "Mis sa teed laupäeval?",
    ]),
  },
] as const;

export const ORDER_DIALOGUE = {
  "d-liisa-1": { text: "Mida sa homme teed?", voice: "second" },
  "d-sina-1": "Homme pean ma tööle minema.",
  "d-liisa-2": { text: "Ja õhtul?", voice: "second" },
  "d-sina-2": "Õhtul olen ma kodus.",
  "d-liisa-3": { text: "Kas sa tuled laupäeval ujuma?", voice: "second" },
  "d-sina-3": "Ei, laupäeval ma ei tule.",
  "d-liisa-4": { text: "Aga pühapäeval?", voice: "second" },
  "d-sina-4": "Pühapäeval tulen.",
} as const satisfies Record<string, Clip>;

export const ORDER_TALK: Conversation = {
  turns: [
    {
      voice: "second",
      text: ["Tere, Peeter!", "Mida sa laupäeval teed?"],
      say: "[cheerful] Tere, Peeter! Mida sa laupäeval teed?",
    },
    {
      voice: "main",
      text: ["Tere, Liisa!", "Laupäeval pean ma hommikul tööle minema.", "Ma töötan kella kaheni."],
    },
    { voice: "second", text: "Ja pärast tööd?" },
    { voice: "main", text: ["Pärast tööd lähen ma poodi.", "Õhtul olen ma kodus."] },
    { voice: "second", text: ["Kas sa tahad õhtul meile tulla?", "Mari tuleb ka."] },
    {
      voice: "main",
      text: ["Jah, ma tulen.", "Mis kell?", "Kus sa nüüd elad?"],
      say: "[pleased] Jah, ma tulen. Mis kell? Kus sa nüüd elad?",
    },
    {
      voice: "second",
      text: ["Kell seitse.", "Nüüd elan ma Kalamajas.", "Minu korter on kolmandal korrusel."],
    },
    { voice: "main", text: "Kas Jaan tuleb ka?" },
    {
      voice: "second",
      text: ["Ei, Jaan ei tule.", "Laupäeval on ta Tartus.", "Pühapäeval tuleb ta tagasi."],
    },
    { voice: "main", text: ["Pühapäeval tahan ma ujuma minna.", "Kas sa tuled ka?"] },
    {
      voice: "second",
      text: [
        "Ei, pühapäeval ma ei saa.",
        "Pühapäeval pean ma õppima.",
        "Esmaspäeval on mul eksam.",
      ],
      say: "[sighs] Ei, pühapäeval ma ei saa. Pühapäeval pean ma õppima. Esmaspäeval on mul eksam.",
    },
    {
      voice: "main",
      text: ["Eksam?", "Mis eksam?", "Mis kell?"],
      say: "[curious] Eksam? Mis eksam? Mis kell?",
    },
    {
      voice: "second",
      text: ["Kell üheksa hommikul.", "Eesti keele eksam.", "Nüüd räägin ma eesti keelt iga päev."],
      say: "Kell üheksa hommikul. [laughs] Eesti keele eksam. Nüüd räägin ma eesti keelt iga päev.",
    },
    { voice: "main", text: ["Väga hea!", "Siis räägime me laupäeval eesti keelt!"] },
    { voice: "second", text: ["Jah!", "Laupäeval kell seitse.", "Ma ootan sind!"] },
  ],
};

export const ORDER_WORDS = [
  "täna",
  "homme",
  "hommikul",
  "õhtul",
  "laupäeval",
  "Tartus",
  "Täna lähen ma",
  "Kus sa elad?",
  "Täna ma ei tööta.",
] as const;

export const ORDER_DRILL = [
  "Õhtul loen ma raamatut.",
  "Pühapäeval pean ma õppima.",
  "Millal te tulete?",
  "Homme ta ei tööta.",
  "Laupäeval ma ei tööta.",
] as const;

const ORDER_CLIPS: Record<string, Clip> = {
  ...words([
    ...new Set([
      ...ORDER_WORDS,
      ...ORDER_PAIRS.flatMap(({ plain, front }) => [plain, front]),
      ...ORDER_QUESTIONS,
      ...ORDER_TWO,
      ...ORDER_NO,
      ...ORDER_HEARD.map(({ said }) => said),
      ...ORDER_MEANING.map(({ answers }) => answers[0]),
      ...ORDER_TRANSLATE.map(({ answers }) => answers[0]),
      ...ORDER_DRILL,
    ]),
  ]),
  ...ORDER_DIALOGUE,
  "c-talk": ORDER_TALK,
};

export const ADJ_PHRASES = [
  {
    id: "suur-maja",
    forms: ["suur maja", "suure maja", "suurt maja", "suures majas", "suure majaga"],
  },
  {
    id: "vaike-tuba",
    forms: ["väike tuba", "väikese toa", "väikest tuba", "väikeses toas", "väikese toaga"],
  },
  {
    id: "uus-raamat",
    forms: ["uus raamat", "uue raamatu", "uut raamatut", "uues raamatus", "uue raamatuga"],
  },
] as const;

export const ADJ_AGREE = [
  "Ma elan suures majas.",
  "Kass magab väikeses toas.",
  "Ma loen uut raamatut.",
  "Me istume vanas kohvikus.",
  "Mul on kaks suurt kassi.",
  "Jaan elab ilusas linnas.",
] as const;

export const ADJ_STEMS = [
  { id: "uus", steps: ["uus", "uue", "uut"] },
  { id: "vaike", steps: ["väike", "väikese", "väikest"] },
  { id: "ilus", steps: ["ilus", "ilusa", "ilusat"] },
  { id: "hea", steps: ["hea", "hea", "head"] },
] as const;

export const ADJ_GENITIVE = [
  "Ma sõidan suure autoga.",
  "Mari tuleb uue sõbraga.",
  "Ma joon kohvi sooja piimaga.",
  "Väikese lapsena elasin ma Tartus.",
] as const;

export const ADJ_PLURAL = [
  "Need on suured majad.",
  "Need on uued raamatud.",
  "Need on head sõbrad.",
] as const;

export const ADJ_MAKE = [
  {
    id: "suures-majas",
    way: "s",
    base: "suur maja",
    answer: "suures majas",
    said: "Ma elan suures majas.",
  },
  {
    id: "vaikeses-toas",
    way: "s",
    base: "väike tuba",
    answer: "väikeses toas",
    said: "Kass magab väikeses toas.",
  },
  {
    id: "vanas-linnas",
    way: "s",
    base: "vana linn",
    answer: "vanas linnas",
    said: "Me elame vanas linnas.",
  },
  {
    id: "heas-kohvikus",
    way: "s",
    base: "hea kohvik",
    answer: "heas kohvikus",
    said: "Me istume heas kohvikus.",
  },
  {
    id: "uut-raamatut",
    way: "partitive",
    base: "uus raamat",
    answer: "uut raamatut",
    said: "Ma loen uut raamatut.",
  },
  {
    id: "suurt-kassi",
    way: "partitive",
    base: "suur kass",
    answer: "suurt kassi",
    said: "Mul on kaks suurt kassi.",
  },
  {
    id: "uut-autot",
    way: "partitive",
    base: "uus auto",
    answer: "uut autot",
    said: "Mul ei ole uut autot.",
  },
  {
    id: "suured-majad",
    way: "plural",
    base: "suur maja",
    answer: "suured majad",
    said: "Need on suured majad.",
  },
] as const;

export const ADJ_WHICH = [
  {
    id: "suure-autoga",
    way: "ga",
    base: "suur auto",
    answer: "suure autoga",
    options: ["suure autoga", "suur autoga", "suures autoga"],
    said: "Ma sõidan suure autoga.",
  },
  {
    id: "uue-sobraga",
    way: "ga",
    base: "uus sõber",
    answer: "uue sõbraga",
    options: ["uus sõbraga", "uue sõbraga", "uues sõbraga"],
    said: "Mari tuleb uue sõbraga.",
  },
  {
    id: "sooja-piimaga",
    way: "ga",
    base: "soe piim",
    answer: "sooja piimaga",
    options: ["soojas piimaga", "soe piimaga", "sooja piimaga"],
    said: "Ma joon kohvi sooja piimaga.",
  },
  {
    id: "vaikese-lapsena",
    way: "ga",
    base: "väike laps",
    answer: "väikese lapsena",
    options: ["väikese lapsena", "väike lapsena", "väikeses lapsena"],
    said: "Väikese lapsena elasin ma Tartus.",
  },
  {
    id: "suures-autos",
    way: "s",
    base: "suur auto",
    answer: "suures autos",
    options: ["suure autos", "suures autos", "suur autos"],
    said: "Kass magab suures autos.",
  },
  {
    id: "uues-majas",
    way: "s",
    base: "uus maja",
    answer: "uues majas",
    options: ["uue majas", "uus majas", "uues majas"],
    said: "Mari elab uues majas.",
  },
  {
    id: "soojas-toas",
    way: "s",
    base: "soe tuba",
    answer: "soojas toas",
    options: ["soojas toas", "sooja toas", "soe toas"],
    said: "Me istume soojas toas.",
  },
  {
    id: "vaikeses-poes",
    way: "s",
    base: "väike pood",
    answer: "väikeses poes",
    options: ["väikese poes", "väikeses poes", "väike poes"],
    said: "Jaan töötab väikeses poes.",
  },
] as const;

export const ADJ_MESSAGE = [
  "Tere, Kati!",
  "Ma elan nüüd uues linnas.",
  "Minu korter on suures majas.",
  "Ma töötan väikeses poes.",
  "Ma sõidan tööle vana autoga.",
  "Mul on kaks head sõpra.",
] as const;

export const ADJ_TRANSLATE = [
  {
    id: "suures-majas",
    answers: withPronouns([
      "Ma elan suures majas.",
      "Suures majas elan ma.",
      "Ma elan ühes suures majas.",
    ]),
  },
  { id: "uue-autoga", answers: ["Jaan sõidab uue autoga."] },
  {
    id: "uut-raamatut",
    answers: withPronouns(["Ma loen uut raamatut."]),
  },
  { id: "kaks-suurt", answers: ["Mul on kaks suurt kassi.", "Minul on kaks suurt kassi."] },
  { id: "ilusas-linnas", answers: ["Mari elab ilusas linnas."] },
  { id: "head-sobrad", answers: ["Need on head sõbrad."] },
] as const;

export const ADJ_FIX = [
  { id: "fix-suures", wrong: "Ma elan suur majas.", answers: ["Ma elan suures majas."] },
  { id: "fix-suure", wrong: "Ma sõidan suurega autoga.", answers: ["Ma sõidan suure autoga."] },
  { id: "fix-suurt", wrong: "Mul on kaks suur kassi.", answers: ["Mul on kaks suurt kassi."] },
  { id: "fix-uut", wrong: "Ma loen uus raamatut.", answers: ["Ma loen uut raamatut."] },
  { id: "fix-vaikeses", wrong: "Kass magab väike toas.", answers: ["Kass magab väikeses toas."] },
  { id: "fix-uued", wrong: "Need on uus raamatud.", answers: ["Need on uued raamatud."] },
] as const;

export const ADJ_TALK: Conversation = {
  turns: [
    {
      voice: "second",
      text: ["Tere, Jaan!", "Kus sa eile olid?"],
      say: "[cheerful] Tere, Jaan! Kus sa eile olid?",
    },
    {
      voice: "main",
      text: ["Tere, Kati!", "Ma olin Tartus.", "Mu vend elab nüüd seal, ühes vanas majas."],
    },
    { voice: "second", text: ["Vanas majas?", "Kas see on suur maja?"] },
    {
      voice: "main",
      text: [
        "Ei, see on väike maja, aga väga ilus.",
        "Majas on kolm väikest tuba ja üks suur tuba.",
      ],
    },
    { voice: "second", text: ["Ja kus ta töötab?"] },
    {
      voice: "main",
      text: [
        "Ta töötab uues kohvikus.",
        "Kohvik on ilusas pargis, suure turu kõrval.",
        "Ta sõidab tööle vana autoga.",
      ],
    },
    {
      voice: "second",
      text: ["Vana autoga?", "Kas see on hea auto?"],
      say: "[curious] Vana autoga? Kas see on hea auto?",
    },
    { voice: "main", text: ["Jah, väga hea.", "See on vana, aga ilus auto."] },
    {
      voice: "second",
      text: ["Mina sõidan tööle uue bussiga.", "Buss on soe ja hea."],
      say: "[laughs] Mina sõidan tööle uue bussiga. Buss on soe ja hea.",
    },
    { voice: "main", text: ["Ja mis sa õhtul teed?"] },
    {
      voice: "second",
      text: [
        "Ma loen uut raamatut.",
        "See on suur raamat, aga väga hea.",
        "Kas sa tahad ka lugeda?",
      ],
      say: "Ma loen uut raamatut. See on suur raamat, aga väga hea. [curious] Kas sa tahad ka lugeda?",
    },
    {
      voice: "main",
      text: ["Jah!", "Mul on homme vaba päev."],
      say: "[pleased] Jah! Mul on homme vaba päev.",
    },
    {
      voice: "second",
      text: [
        "Hästi.",
        "Ma ootan sind homme väikeses kohvikus, kell kuus.",
        "Seal on hea kohv ja soe piim.",
      ],
    },
    { voice: "main", text: ["Väikeses kohvikus?", "Kas see on sinu maja kõrval?"] },
    { voice: "second", text: ["Jah, minu maja kõrval.", "Nägemiseni!"] },
    { voice: "main", text: ["Hästi.", "Homme kell kuus väikeses kohvikus!"] },
  ],
};

export const ADJ_WORDS = [
  "suur",
  "väike",
  "uus",
  "vana",
  "hea",
  "ilus",
  "soe",
  "suures majas",
  "suure autoga",
  "uut raamatut",
  "suured majad",
  ...ADJ_PHRASES.flatMap(({ forms }) => forms),
  ...ADJ_STEMS.flatMap(({ steps }) => steps),
] as const;

export const ADJ_DRILL = [
  "Ma istun vanas kohvikus.",
  "Ta tuleb hea sõbraga.",
  "Meil on kolm väikest tuba.",
  "Mari elab väikeses linnas.",
  "Need on ilusad linnad.",
] as const;

const ADJ_CLIPS: Record<string, Clip> = {
  ...words([
    ...new Set([
      ...ADJ_WORDS,
      ...ADJ_AGREE,
      ...ADJ_GENITIVE,
      ...ADJ_PLURAL,
      ...ADJ_MAKE.map(({ said }) => said),
      ...ADJ_WHICH.map(({ said }) => said),
      ...ADJ_TRANSLATE.map(({ answers }) => answers[0]),
      ...ADJ_FIX.map(({ answers }) => answers[0]),
      ...ADJ_DRILL,
    ]),
  ]),
  "p-message": { sentences: ADJ_MESSAGE, voice: "third" },
  "c-talk": ADJ_TALK,
};

export const CMP_CHAINS = [
  { id: "suur", steps: ["suur", "suure", "suurem"] },
  { id: "uus", steps: ["uus", "uue", "uuem"] },
  { id: "kallis", steps: ["kallis", "kalli", "kallim"] },
  { id: "vana", steps: ["vana", "vana", "vanem"] },
  { id: "vaike", steps: ["väike", "väikese", "väiksem"] },
  { id: "hea", steps: ["hea", "hea", "parem"] },
] as const;

export const CMP_THAN = [
  "Tallinn on suurem kui Tartu.",
  "Minu auto on uuem kui sinu auto.",
  "Kohv on kallim kui tee.",
  "Tartu on väiksem kui Tallinn.",
  "Täna on soojem kui eile.",
] as const;

export const CMP_ST = [
  {
    kui: "Tallinn on suurem kui Tartu.",
    st: "Tallinn on Tartust suurem.",
    answers: ["Tallinn on Tartust suurem.", "Tallinn on suurem Tartust."],
  },
  {
    kui: "Jaan on vanem kui Mari.",
    st: "Jaan on Marist vanem.",
    answers: ["Jaan on Marist vanem.", "Jaan on vanem Marist."],
  },
  {
    kui: "Kohv on kallim kui tee.",
    st: "Kohv on teest kallim.",
    answers: ["Kohv on teest kallim.", "Kohv on kallim teest."],
  },
  {
    kui: "Minu tuba on suurem kui sinu tuba.",
    st: "Minu tuba on sinu toast suurem.",
    answers: [
      "Minu tuba on sinu toast suurem.",
      "Minu tuba on sinu omast suurem.",
      "Minu tuba on suurem sinu toast.",
      "Minu tuba on suurem sinu omast.",
    ],
  },
  {
    kui: "Mari on noorem kui Kati.",
    st: "Mari on Katist noorem.",
    answers: ["Mari on Katist noorem.", "Mari on noorem Katist."],
  },
  {
    kui: "Tartu on vanem kui Tallinn.",
    st: "Tartu on Tallinnast vanem.",
    answers: ["Tartu on Tallinnast vanem.", "Tartu on vanem Tallinnast."],
  },
] as const;

export const CMP_MOST = [
  "Tallinn on Eesti kõige suurem linn.",
  "See on kõige parem kohvik.",
  "Jaan on kõige vanem.",
  "Mari on minu parim sõber.",
  "Minu tuba on sama suur kui sinu tuba.",
] as const;

export const CMP_MAKE = [
  { id: "suurem", kind: "plain", base: "suur", answer: "suurem" },
  { id: "vanem", kind: "a-to-e", base: "vana", answer: "vanem" },
  { id: "kulmem", kind: "a-to-e", base: "külm", answer: "külmem" },
  { id: "uuem", kind: "stem", base: "uus", answer: "uuem" },
  { id: "kallim", kind: "stem", base: "kallis", answer: "kallim" },
  { id: "ilusam", kind: "three", base: "ilus", answer: "ilusam" },
  { id: "parem", kind: "own", base: "hea", answer: "parem" },
  { id: "vaiksem", kind: "drop", base: "väike", answer: "väiksem" },
] as const;

export const CMP_HEARD = [
  { said: "Tallinn on suur linn.", word: "suur", kind: "plain" },
  { said: "Tallinn on suurem kui Tartu.", word: "suur", kind: "more" },
  { said: "Tallinn on Eesti kõige suurem linn.", word: "suur", kind: "most" },
  { said: "Jaan on vana.", word: "vana", kind: "plain" },
  { said: "Jaan on vanem kui Mari.", word: "vana", kind: "more" },
  { said: "Jaan on kõige vanem.", word: "vana", kind: "most" },
  { said: "See kohvik on hea.", word: "hea", kind: "plain" },
  { said: "See kohvik on parem.", word: "hea", kind: "more" },
  { said: "See on kõige parem kohvik.", word: "hea", kind: "most" },
] as const;

export const CMP_TRANSLATE = [
  {
    id: "suurem-kui",
    answers: [
      "Tallinn on suurem kui Tartu.",
      "Tallinn on Tartust suurem.",
      "Tallinn on suurem Tartust.",
      "Tallinn on suurem linn kui Tartu.",
    ],
  },
  {
    id: "kallim",
    answers: ["Kohv on kallim kui tee.", "Kohv on teest kallim.", "Kohv on kallim teest."],
  },
  {
    id: "koige-parem",
    answers: [
      "See on kõige parem kohvik.",
      "See on parim kohvik.",
      "See kohvik on kõige parem.",
      "See kohvik on parim.",
    ],
  },
  {
    id: "vanem",
    answers: ["Jaan on vanem kui Mari.", "Jaan on Marist vanem.", "Jaan on vanem Marist."],
  },
  {
    id: "sama-suur",
    answers: [
      "Minu tuba on sama suur kui sinu tuba.",
      "Mu tuba on sama suur kui su tuba.",
      "Minu tuba on sama suur kui sinu oma.",
      "Mu tuba on sama suur kui su oma.",
      "Minu tuba on sama suur nagu sinu tuba.",
      "Mu tuba on sama suur nagu su tuba.",
      "Minu tuba on sama suur nagu sinu oma.",
      "Mu tuba on sama suur nagu su oma.",
      "Mu tuba on sama suur kui sinu tuba.",
      "Minu tuba on sama suur kui su tuba.",
      "Mu tuba on sama suur kui sinu oma.",
      "Minu tuba on sama suur kui su oma.",
      "Mu tuba on sama suur nagu sinu tuba.",
      "Minu tuba on sama suur nagu su tuba.",
      "Mu tuba on sama suur nagu sinu oma.",
      "Minu tuba on sama suur nagu su oma.",
      "Minu tuba on sama suur kui teie tuba.",
      "Minu tuba on sama suur kui teie oma.",
      "Minu tuba on sama suur nagu teie tuba.",
      "Minu tuba on sama suur nagu teie oma.",
      "Mu tuba on sama suur kui teie tuba.",
      "Mu tuba on sama suur kui teie oma.",
      "Mu tuba on sama suur nagu teie tuba.",
      "Mu tuba on sama suur nagu teie oma.",
    ],
  },
  {
    id: "parim-sober",
    answers: [
      "Mari on minu parim sõber.",
      "Mari on mu parim sõber.",
      "Mari on minu kõige parem sõber.",
      "Mari on mu kõige parem sõber.",
      "Minu parim sõber on Mari.",
      "Mu parim sõber on Mari.",
      "Minu kõige parem sõber on Mari.",
      "Mu kõige parem sõber on Mari.",
    ],
  },
] as const;

export const CMP_FIX = [
  {
    id: "fix-kui",
    wrong: "Tallinn on suurem nagu Tartu.",
    answers: ["Tallinn on suurem kui Tartu."],
  },
  { id: "fix-parem", wrong: "Kohv on heam kui tee.", answers: ["Kohv on parem kui tee."] },
  {
    id: "fix-vaiksem",
    wrong: "Tartu on väikem kui Tallinn.",
    answers: ["Tartu on väiksem kui Tallinn.", "Tartu on väikesem kui Tallinn."],
  },
  {
    id: "fix-koige",
    wrong: "Tallinn on Eesti kõige suur linn.",
    answers: ["Tallinn on Eesti kõige suurem linn."],
  },
  { id: "fix-tartust", wrong: "Tallinn on Tartu suurem.", answers: ["Tallinn on Tartust suurem."] },
  { id: "fix-kulmem", wrong: "Täna on külm kui eile.", answers: ["Täna on külmem kui eile."] },
] as const;

export const CMP_TALK: Conversation = {
  turns: [
    {
      voice: "main",
      text: ["Tere, Mari!", "Kuidas sulle Tallinn meeldib?"],
      say: "[cheerful] Tere, Mari! Kuidas sulle Tallinn meeldib?",
    },
    {
      voice: "second",
      text: ["Tere, Jaan!", "Tallinn on ilus, aga palju suurem kui Tartu."],
    },
    { voice: "main", text: ["Ja korter?", "Kas see on suurem kui sinu vana korter?"] },
    {
      voice: "second",
      text: [
        "Ei, uus korter on väiksem.",
        "Aga see on uuem ja soojem.",
        "Tartus oli mul talvel väga külm.",
      ],
      say: "Ei, uus korter on väiksem. Aga see on uuem ja soojem. [laughs] Tartus oli mul talvel väga külm.",
    },
    { voice: "main", text: "Kas Tallinnas on kõik kallim?" },
    {
      voice: "second",
      text: [
        "Jah, korter on kallim ja kohv on ka kallim.",
        "Tartus maksis kohv kaks eurot, siin kolm eurot.",
      ],
    },
    {
      voice: "main",
      text: ["Kolm eurot!", "Aga kas kohv on ka parem?"],
      say: "[surprised] Kolm eurot! Aga kas kohv on ka parem?",
    },
    {
      voice: "second",
      text: [
        "Jah, minu maja kõrval on Tallinna kõige parem kohvik.",
        "Ma joon seal iga päev kohvi.",
      ],
    },
    { voice: "main", text: ["Ja töö?", "Kas uus töö on parem kui vana?"] },
    {
      voice: "second",
      text: [
        "Jah, palju parem.",
        "Mul on seal suurem laud ja uuem arvuti.",
        "Aga ma töötan kella üheksast kella kuueni.",
      ],
    },
    { voice: "main", text: ["Tartus töötasid sa kella viieni.", "Kas Tartu oli parem?"] },
    {
      voice: "second",
      text: ["Natuke.", "Tartu on vanem ja väiksem linn.", "Aga Tallinnas on mu parim sõber Kati."],
      say: "[sighs] Natuke. Tartu on vanem ja väiksem linn. Aga Tallinnas on mu parim sõber Kati.",
    },
    {
      voice: "main",
      text: ["Hästi.", "Ma tulen nädala pärast Tallinna.", "Siis joome kõige paremat kohvi!"],
    },
  ],
};

export const CMP_WORDS = [
  "suurem",
  "kõige suurem",
  "parem",
  "kõige parem",
  "parim",
  "kui",
  "sama",
  "Tallinn on suurem kui Tartu",
  "Tallinn on Tartust suurem",
  ...CMP_CHAINS.flatMap(({ steps }) => steps),
  ...CMP_MAKE.map(({ answer }) => answer),
] as const;

export const CMP_DRILL = [
  "Minu kass on vanem kui sinu kass.",
  "Tee on odavam kui kohv.",
  "Tallinn on palju suurem kui Tartu.",
  "Minu tuba on väiksem kui sinu tuba.",
] as const;

const CMP_CLIPS: Record<string, Clip> = {
  ...words([
    ...new Set([
      ...CMP_WORDS,
      ...CMP_THAN,
      ...CMP_ST.flatMap(({ kui, st }) => [kui, st]),
      ...CMP_MOST,
      ...CMP_HEARD.map(({ said }) => said),
      ...CMP_TRANSLATE.map(({ answers }) => answers[0]),
      ...CMP_FIX.map(({ answers }) => answers[0]),
      ...CMP_DRILL,
    ]),
  ]),
  "c-talk": CMP_TALK,
};

export const TRA_CHAINS = [
  { id: "arst", steps: ["arst", "arsti", "arstiks"] },
  { id: "opetaja", steps: ["õpetaja", "õpetaja", "õpetajaks"] },
  { id: "haige", steps: ["haige", "haige", "haigeks"] },
  { id: "kulm", steps: ["külm", "külma", "külmaks"] },
  { id: "soe", steps: ["soe", "sooja", "soojaks"] },
  { id: "nadal", steps: ["nädal", "nädala", "nädalaks"] },
] as const;

export const TRA_BECOME = [
  "Mari tahab saada arstiks.",
  "Jaan sai õpetajaks.",
  "Ma jäin haigeks.",
  "Ilm muutub külmaks.",
  "Tuba läheb soojaks.",
] as const;

export const TRA_MAKE = [
  {
    id: "arstiks",
    kind: "plain",
    base: "arst",
    gen: "arsti",
    cue: "Ta sai …",
    said: "Ta sai arstiks.",
  },
  {
    id: "nadalaks",
    kind: "plain",
    base: "nädal",
    gen: "nädala",
    cue: "Ma lähen … Pärnusse.",
    said: "Ma lähen nädalaks Pärnusse.",
  },
  {
    id: "opetajaks",
    kind: "same",
    base: "õpetaja",
    gen: "õpetaja",
    cue: "Mari tahab saada …",
    said: "Mari tahab saada õpetajaks.",
  },
  {
    id: "haigeks",
    kind: "same",
    base: "haige",
    gen: "haige",
    cue: "Ma jäin …",
    said: "Ma jäin haigeks.",
  },
  {
    id: "reedeks",
    kind: "same",
    base: "reede",
    gen: "reede",
    cue: "Ma tulen … tagasi.",
    said: "Ma tulen reedeks tagasi.",
  },
  {
    id: "kulmaks",
    kind: "change",
    base: "külm",
    gen: "külma",
    cue: "Ilm muutub …",
    said: "Ilm muutub külmaks.",
  },
  {
    id: "soojaks",
    kind: "change",
    base: "soe",
    gen: "sooja",
    cue: "Tuba läheb …",
    said: "Tuba läheb soojaks.",
  },
  {
    id: "sobraks",
    kind: "change",
    base: "sõber",
    gen: "sõbra",
    cue: "Mari sai mu …",
    said: "Mari sai mu sõbraks.",
  },
] as const;

export const TRA_NA_KS = [
  {
    id: "arstina",
    noun: "arst",
    base: "arst",
    way: "na",
    cue: "Ta alustas haiglas …",
    answer: "arstina",
    said: "Ta alustas haiglas arstina.",
  },
  {
    id: "arstiks",
    noun: "arst",
    base: "arst",
    way: "ks",
    cue: "Ta sai …",
    answer: "arstiks",
    said: "Ta sai arstiks.",
  },
  {
    id: "opetajana",
    noun: "opetaja",
    base: "õpetaja",
    way: "na",
    cue: "Mari alustas koolis …",
    answer: "õpetajana",
    said: "Mari alustas koolis õpetajana.",
  },
  {
    id: "opetajaks",
    noun: "opetaja",
    base: "õpetaja",
    way: "ks",
    cue: "Mari tahab saada …",
    answer: "õpetajaks",
    said: "Mari tahab saada õpetajaks.",
  },
  {
    id: "kokana",
    noun: "kokk",
    base: "kokk",
    way: "na",
    cue: "Jaan alustas restoranis …",
    answer: "kokana",
    said: "Jaan alustas restoranis kokana.",
  },
  {
    id: "kokaks",
    noun: "kokk",
    base: "kokk",
    way: "ks",
    cue: "Jaan tahab saada …",
    answer: "kokaks",
    said: "Jaan tahab saada kokaks.",
  },
  {
    id: "muujana",
    noun: "muuja",
    base: "müüja",
    way: "na",
    cue: "Kati alustas poes …",
    answer: "müüjana",
    said: "Kati alustas poes müüjana.",
  },
  {
    id: "muujaks",
    noun: "muuja",
    base: "müüja",
    way: "ks",
    cue: "Kati sai poes …",
    answer: "müüjaks",
    said: "Kati sai poes müüjaks.",
  },
] as const;

export const TRA_FOR = [
  "Ma tulen reedeks tagasi.",
  "Ma lähen nädalaks Pärnusse.",
  "Mida sa hommikusöögiks sööd?",
  "Mida sa sünnipäevaks tahad?",
  "Kas sa oled õhtuks kodus?",
] as const;

export const TRA_AGREE = [
  "Ta sai heaks arstiks.",
  "Ta alustas uue arstina.",
  "Ilm muutus väga külmaks.",
] as const;

export const TRA_MESSAGE = [
  "Tere, Mari!",
  "Mu vend sai heaks arstiks.",
  "Ta töötab nüüd Pärnus arstina.",
  "Ma lähen nädalaks Pärnusse.",
  "Ma tulen reedeks tagasi.",
  "Mida sa sünnipäevaks tahad?",
] as const;

export const TRA_TRANSLATE = [
  {
    id: "saada-arstiks",
    answers: withPronouns([
      "Ma tahan saada arstiks.",
      "Mina tahan saada arstiks.",
      "Tahan saada arstiks.",
      "Ma tahan arstiks saada.",
      "Tahan arstiks saada.",
      "Mina tahan arstiks saada.",
    ]),
  },
  {
    id: "kulmaks",
    answers: withPronouns([
      "Ilm muutub külmaks.",
      "Ilm läheb külmaks.",
      "Ilm on muutumas külmaks.",
      "Läheb külmaks.",
    ]),
  },
  {
    id: "reedeks",
    answers: withPronouns([
      "Ma tulen reedeks tagasi.",
      "Mina tulen reedeks tagasi.",
      "Tulen reedeks tagasi.",
      "Ma olen reedeks tagasi.",
      "Olen reedeks tagasi.",
      "Reedeks olen ma tagasi.",
      "Reedeks tulen ma tagasi.",
      "Reedeks olen tagasi.",
      "Reedeks tulen tagasi.",
      "Reedeks olen mina tagasi.",
      "Reedeks tulen mina tagasi.",
      "Mina olen reedeks tagasi.",
      "Ma tulen tagasi reedeks.",
      "Tulen tagasi reedeks.",
      "Ma olen tagasi reedeks.",
      "Olen tagasi reedeks.",
      "Mina tulen tagasi reedeks.",
      "Mina olen tagasi reedeks.",
    ]),
  },
  {
    id: "nadalaks",
    answers: withPronouns([
      "Ma lähen nädalaks Tartusse.",
      "Ma lähen Tartusse nädalaks.",
      "Lähen nädalaks Tartusse.",
      "Mina lähen nädalaks Tartusse.",
      "Ma sõidan nädalaks Tartusse.",
      "Nädalaks lähen ma Tartusse.",
      "Lähen Tartusse nädalaks.",
      "Ma sõidan Tartusse nädalaks.",
      "Sõidan nädalaks Tartusse.",
      "Mina lähen Tartusse nädalaks.",
      "Ma lähen nädalaks Tartu.",
      "Lähen nädalaks Tartu.",
      "Ma lähen Tartu nädalaks.",
      "Nädalaks lähen Tartusse.",
      "Ma sõidan nädalaks Tartu.",
      "Sõidan Tartusse nädalaks.",
      "Lähen Tartu nädalaks.",
      "Nädalaks sõidan ma Tartusse.",
      "Sõidan nädalaks Tartu.",
      "Ma sõidan Tartu nädalaks.",
      "Sõidan Tartu nädalaks.",
      "Nädalaks lähen ma Tartu.",
      "Nädalaks sõidan ma Tartu.",
      "Mina lähen nädalaks Tartu.",
      "Mina lähen Tartu nädalaks.",
      "Mina sõidan nädalaks Tartusse.",
      "Mina sõidan Tartusse nädalaks.",
      "Mina sõidan nädalaks Tartu.",
      "Mina sõidan Tartu nädalaks.",
      "Nädalaks sõidan Tartusse.",
      "Nädalaks lähen Tartu.",
      "Nädalaks sõidan Tartu.",
      "Nädalaks lähen mina Tartusse.",
      "Ma lähen üheks nädalaks Tartusse.",
      "Ma lähen Tartusse üheks nädalaks.",
    ]),
  },
  {
    id: "sunnipaevaks",
    answers: withPronouns([
      "Mida sa sünnipäevaks tahad?",
      "Mida sa tahad sünnipäevaks?",
      "Mida sa oma sünnipäevaks tahad?",
      "Mida sa tahad oma sünnipäevaks?",
      "Mis sa sünnipäevaks tahad?",
      "Mis sa tahad sünnipäevaks?",
      "Mis sa oma sünnipäevaks tahad?",
      "Mis sa tahad oma sünnipäevaks?",
      "Mida sa sünnipäevaks soovid?",
      "Mida sa soovid sünnipäevaks?",
      "Mida sa oma sünnipäevaks soovid?",
      "Mida sa soovid oma sünnipäevaks?",
      "Mis sa sünnipäevaks soovid?",
      "Mis sa soovid sünnipäevaks?",
      "Mis sa oma sünnipäevaks soovid?",
      "Mis sa soovid oma sünnipäevaks?",
      "Mida te sünnipäevaks tahate?",
      "Mida te tahate sünnipäevaks?",
      "Mida te oma sünnipäevaks tahate?",
      "Mida te tahate oma sünnipäevaks?",
      "Mis te sünnipäevaks tahate?",
      "Mis te tahate sünnipäevaks?",
      "Mis te oma sünnipäevaks tahate?",
      "Mis te tahate oma sünnipäevaks?",
      "Mida te sünnipäevaks soovite?",
      "Mida te soovite sünnipäevaks?",
      "Mida te oma sünnipäevaks soovite?",
      "Mida te soovite oma sünnipäevaks?",
      "Mis te sünnipäevaks soovite?",
      "Mis te soovite sünnipäevaks?",
      "Mis te oma sünnipäevaks soovite?",
      "Mis te soovite oma sünnipäevaks?",
      "Mida sa endale sünnipäevaks tahad?",
      "Mida te endale sünnipäevaks tahate?",
    ]),
  },
  {
    id: "heaks-opetajaks",
    answers: withPronouns([
      "Ta sai heaks õpetajaks.",
      "Tema sai heaks õpetajaks.",
      "Temast sai hea õpetaja.",
      "Tast sai hea õpetaja.",
    ]),
  },
] as const;

export const TRA_FIX = [
  { id: "fix-arstiks", wrong: "Ta sai arstina.", answers: ["Ta sai arstiks."] },
  {
    id: "fix-arstina",
    wrong: "Ta töötab arst.",
    answers: ["Ta töötab arstina.", "Ta töötab arstiks."],
  },
  { id: "fix-haigeks", wrong: "Ma jäin haige.", answers: ["Ma jäin haigeks."] },
  { id: "fix-heaks", wrong: "Ta sai hea arstiks.", answers: ["Ta sai heaks arstiks."] },
  { id: "fix-reedeks", wrong: "Ma tulen reede tagasi.", answers: ["Ma tulen reedeks tagasi."] },
  { id: "fix-kulmaks", wrong: "Ilm muutub külmeks.", answers: ["Ilm muutub külmaks."] },
] as const;

export const TRA_TALK: Conversation = {
  turns: [
    {
      voice: "main",
      text: ["Tere, Liisa!", "Kuidas läheb?"],
      say: "[cheerful] Tere, Liisa! Kuidas läheb?",
    },
    {
      voice: "second",
      text: ["Tere, Peeter!", "Mitte väga hästi.", "Ma jäin eile haigeks."],
      say: "[tired] Tere, Peeter! Mitte väga hästi. Ma jäin eile haigeks.",
    },
    { voice: "main", text: ["Oi!", "Kas sa oled homseks terve?"] },
    {
      voice: "second",
      text: [
        "Ma ei tea.",
        "Mul on palavik ja kurk on haige.",
        "Ma pean paariks päevaks koju jääma.",
      ],
    },
    { voice: "main", text: ["Kahju.", "Aga kuidas su uus töö on?"] },
    { voice: "second", text: ["Hea.", "Ma töötan nüüd koolis õpetajana."] },
    { voice: "main", text: ["Õpetajana?", "Sa tahtsid ju saada arstiks!"] },
    {
      voice: "second",
      text: [
        "Jah, aga õpetaja töö meeldib mulle väga.",
        "Ma õpetan eesti keelt.",
        "Lapsed on väga toredad.",
        "Ja sinu õde?",
      ],
    },
    {
      voice: "main",
      text: [
        "Minu õde sai aasta tagasi arstiks.",
        "Ta töötab nüüd Tartus.",
        "Ta on väga hea arst.",
      ],
    },
    { voice: "second", text: ["Tore!", "Mis plaanid sul laupäevaks on?"] },
    {
      voice: "main",
      text: [
        "Mu emal on laupäeval sünnipäev.",
        "Õde tuleb ka nädalaks koju.",
        "Mul on emale kingiks raamat.",
        "Ja õhtusöögiks teen ma kala.",
      ],
    },
    {
      voice: "second",
      text: ["Kala!", "Hea mõte!", "Ja ilm muutub ka soojaks."],
      say: "[laughs] Kala! Hea mõte! Ja ilm muutub ka soojaks.",
    },
    {
      voice: "main",
      text: ["Jah.", "Tule laupäeval ka!", "Aga praegu jää koju ja saa terveks!"],
    },
    {
      voice: "second",
      text: ["Aitäh!", "Ma olen reedeks kindlasti terve."],
    },
    { voice: "main", text: ["Head paranemist, Liisa!", "Nägemist!"] },
  ],
};

export const TRA_WORDS = [
  "arstiks",
  "saama",
  "jääma",
  "muutuma",
  "reedeks",
  "nädalaks",
  "heaks arstiks",
  "kingiks",
  "ilm",
  ...TRA_CHAINS.flatMap(({ steps }) => steps),
] as const;

export const TRA_DRILL = [
  "Jaan töötab restoranis kokana.",
  "Kati töötab poes müüjana.",
  "Ma tahan saada arstiks.",
  "Tuba läheb külmaks.",
  "Ma olen õhtuks kodus.",
  "Ta sai heaks õpetajaks.",
] as const;

const TRA_CLIPS: Record<string, Clip> = {
  ...words([
    ...new Set([
      ...TRA_WORDS,
      ...TRA_BECOME,
      ...TRA_MAKE.map(({ said }) => said),
      ...TRA_NA_KS.map(({ said }) => said),
      ...TRA_FOR,
      ...TRA_AGREE,
      ...TRA_TRANSLATE.map(({ answers }) => answers[0]),
      ...TRA_FIX.map(({ answers }) => answers[0]),
      ...TRA_DRILL,
      "hommikusöögiks",
      "sünnipäevaks",
      "õhtuks",
      "homseks",
    ]),
  ]),
  "p-message": { sentences: TRA_MESSAGE, voice: "third" },
  "c-talk": TRA_TALK,
};
export const GI_SOME = [
  "Keegi helistas.",
  "Kas sa tahad midagi?",
  "Mu võtmed on kuskil siin.",
  "Ma tahan kuhugi minna.",
  "Kas sa käid kunagi Pärnus?",
  "Tule millalgi külla!",
] as const;

export const GI_NOT = [
  {
    pos: "Keegi tuleb.",
    neg: "Keegi ei tule.",
    also: ["Mitte keegi ei tule.", "Kedagi ei tule.", "Ei tule kedagi.", "Mitte kedagi ei tule."],
  },
  {
    pos: "Ma näen kedagi.",
    neg: "Ma ei näe kedagi.",
    also: ["Ma ei näe mitte kedagi.", "Ma kedagi ei näe.", "Ei näe kedagi."],
  },
  {
    pos: "Mul on midagi.",
    neg: "Mul ei ole midagi.",
    also: [
      "Mul pole midagi.",
      "Mul ei ole mitte midagi.",
      "Mul pole mitte midagi.",
      "Mul midagi ei ole.",
      "Mul midagi pole.",
    ],
  },
  {
    pos: "Ta läheb kuhugi.",
    neg: "Ta ei lähe kuhugi.",
    also: [
      "Ta ei lähe mitte kuhugi.",
      "Ta ei lähe kuskile.",
      "Ta kuhugi ei lähe.",
      "Ta ei lähe mitte kuskile.",
      "Ta kuskile ei lähe.",
    ],
  },
  {
    pos: "Kati ostab midagi.",
    neg: "Kati ei osta midagi.",
    also: ["Kati ei osta mitte midagi.", "Kati midagi ei osta."],
  },
  {
    pos: "Ma räägin kellegagi.",
    neg: "Ma ei räägi kellegagi.",
    also: ["Ma ei räägi mitte kellegagi.", "Ma kellegagi ei räägi.", "Ei räägi kellegagi."],
  },
] as const;

export const GI_MITTE = ["Kes tuli? Mitte keegi.", "Mida sa tahad? Mitte midagi."] as const;

export const GI_EXCEPT = ["Kodus on keegi.", "Kodus ei ole kedagi."] as const;

export const GI_MAKE = [
  { id: "kellelegi", kind: "gi", base: "kellele", said: "Ma helistasin kellelegi." },
  { id: "kellelgi", kind: "gi", base: "kellel", said: "Kas kellelgi on pliiats?" },
  { id: "kellegagi", kind: "gi", base: "kellega", said: "Ma ei räägi kellegagi." },
  { id: "kedagi", kind: "gi", base: "keda", said: "Ma ei näe kedagi." },
  { id: "midagi", kind: "gi", base: "mida", said: "Kas sa tahad midagi?" },
  { id: "kuhugi", kind: "gi", base: "kuhu", said: "Ma tahan kuhugi minna." },
  { id: "kellestki", kind: "ki", base: "kellest", said: "Me rääkisime kellestki." },
  { id: "millestki", kind: "ki", base: "millest", said: "Ta ei räägi millestki." },
] as const;

export const GI_WHICH = [
  {
    id: "millelegi",
    kind: "gi",
    base: "millele",
    cue: "Ma mõtlen …",
    said: "Ma mõtlen millelegi.",
  },
  {
    id: "millegagi",
    kind: "gi",
    base: "millega",
    cue: "Kas sul on … kirjutada?",
    said: "Kas sul on millegagi kirjutada?",
  },
  {
    id: "millalgi",
    kind: "gi",
    base: "millal",
    cue: "Tule … külla!",
    said: "Tule millalgi külla!",
  },
  { id: "kellegi", kind: "gi", base: "kelle", cue: "See on … kott.", said: "See on kellegi kott." },
  {
    id: "kelleltki",
    kind: "ki",
    base: "kellelt",
    cue: "Ma sain … kirja.",
    said: "Ma sain kelleltki kirja.",
  },
  {
    id: "kellestki",
    kind: "ki",
    base: "kellest",
    cue: "Me rääkisime …",
    said: "Me rääkisime kellestki.",
  },
  {
    id: "millestki",
    kind: "ki",
    base: "millest",
    cue: "Ta ei räägi …",
    said: "Ta ei räägi millestki.",
  },
  {
    id: "kellekski",
    kind: "ki",
    base: "kelleks",
    cue: "Ta tahab … saada.",
    said: "Ta tahab kellekski saada.",
  },
] as const;

export const GI_TRANSLATE = [
  { id: "helistas", answers: ["Keegi helistas."] },
  {
    id: "kedagi",
    answers: withPronouns([
      "Ma ei näe kedagi.",
      "Mina ei näe kedagi.",
      "Ei näe kedagi.",
      "Ma kedagi ei näe.",
      "Mina kedagi ei näe.",
      "Mina ei näe mitte kedagi.",
      "Ma ei näe mitte kedagi.",
    ]),
  },
  {
    id: "midagi",
    answers: withPronouns([
      "Mul ei ole midagi.",
      "Mul pole midagi.",
      "Minul ei ole midagi.",
      "Minul pole midagi.",
      "Mul ei ole mitte midagi.",
      "Mul pole mitte midagi.",
      "Mul midagi ei ole.",
      "Mul midagi pole.",
      "Minul midagi ei ole.",
      "Minul midagi pole.",
      "Minul ei ole mitte midagi.",
      "Minul pole mitte midagi.",
    ]),
  },
  {
    id: "tahad",
    answers: withPronouns([
      "Kas sa tahad midagi?",
      "Kas sa midagi tahad?",
      "Kas te midagi tahate?",
      "Kas sina midagi tahad?",
      "Kas sina tahad midagi?",
      "Kas te tahate midagi?",
      "Kas tahad midagi?",
      "Tahad sa midagi?",
      "Kas tahate midagi?",
      "Tahate te midagi?",
      "Kas sa soovid midagi?",
      "Kas te soovite midagi?",
      "Kas sa midagi soovid?",
      "Kas te midagi soovite?",
    ]),
  },
  {
    id: "kuhugi",
    answers: withPronouns([
      "Ta ei lähe kuhugi.",
      "Tema ei lähe kuhugi.",
      "Ta ei lähe kuskile.",
      "Tema ei lähe kuskile.",
      "Ta ei lähe mitte kuhugi.",
      "Tema ei lähe mitte kuhugi.",
      "Ta kuhugi ei lähe.",
      "Tema kuhugi ei lähe.",
      "Ta kuskile ei lähe.",
      "Tema kuskile ei lähe.",
      "Ta ei lähe mitte kuskile.",
      "Tema ei lähe mitte kuskile.",
    ]),
  },
  {
    id: "keegi",
    answers: [
      "Keegi ei tule.",
      "Mitte keegi ei tule.",
      "Kedagi ei tule.",
      "Ei tule kedagi.",
      "Mitte kedagi ei tule.",
    ],
  },
] as const;

export const GI_FIX = [
  { id: "fix-kedagi", wrong: "Ma ei näe keegi.", answers: ["Ma ei näe kedagi."] },
  {
    id: "fix-kellelegi",
    wrong: "Ma helistasin kellelegki.",
    answers: ["Ma helistasin kellelegi."],
  },
  { id: "fix-kellestki", wrong: "Me rääkisime kellestgi.", answers: ["Me rääkisime kellestki."] },
  { id: "fix-midagi", wrong: "Mul ei ole mida.", answers: ["Mul ei ole midagi."] },
  {
    id: "fix-kuhugi",
    wrong: "Ta ei lähe kuhu.",
    answers: ["Ta ei lähe kuhugi.", "Ta ei lähe kuskile."],
  },
  { id: "fix-kellegagi", wrong: "Ma ei räägi kellegaki.", answers: ["Ma ei räägi kellegagi."] },
] as const;

export const GI_TALK: Conversation = {
  turns: [
    {
      voice: "second",
      text: ["Peeter, kas mu võtmed on kuskil siin?"],
      say: "[worried] Peeter, kas mu võtmed on kuskil siin?",
    },
    { voice: "main", text: ["Ei, ma ei näinud neid kuskil.", "Kus nad eile olid?"] },
    {
      voice: "second",
      text: ["Eile olid nad laual.", "Aga nüüd ei ole seal midagi.", "Ma otsisin terve hommiku."],
    },
    { voice: "main", text: ["Kas keegi käis eile siin?"] },
    { voice: "second", text: ["Jah, Mari käis.", "Aga ta ei võtnud midagi."] },
    { voice: "main", text: ["Kas sa helistasid talle?"] },
    { voice: "second", text: ["Helistasin, aga keegi ei vastanud."] },
    { voice: "main", text: ["Võib-olla ta magab.", "Hmm.", "Kas sa läksid eile kuhugi?"] },
    {
      voice: "second",
      text: ["Ma käisin poes ja kohvikus.", "Kohvikus jõin ma kohvi ja lugesin raamatut."],
    },
    { voice: "main", text: ["Võib-olla jäid võtmed kohvikusse."] },
    {
      voice: "second",
      text: ["Ei, ma ei unusta kunagi midagi!"],
      say: "[annoyed] Ei, ma ei unusta kunagi midagi!",
    },
    {
      voice: "main",
      text: ["Kunagi?", "Nädal tagasi jäi sul telefon poodi."],
      say: "[laughs] Kunagi? Nädal tagasi jäi sul telefon poodi.",
    },
    { voice: "second", text: ["Jah, see on tõsi.", "Hästi, ma helistan kohvikusse."] },
    { voice: "main", text: ["Noh?", "Kas keegi vastas?"] },
    {
      voice: "second",
      text: ["Jah!", "Kohvikus on laual võtmed.", "Need on minu võtmed!"],
      say: "[relieved] Jah! Kohvikus on laual võtmed. Need on minu võtmed!",
    },
    { voice: "main", text: ["Näed!", "Kas ma tulen sinuga?"] },
    { voice: "second", text: ["Ei, aitäh.", "Aga õhtul võime kuhugi sööma minna."] },
    { voice: "main", text: ["Hea mõte!", "Kuhu?"] },
    { voice: "second", text: ["Mulle on ükskõik.", "Kuhugi kohvikusse."] },
    { voice: "main", text: ["Kohvik on hea mõte.", "Siis näeme kell seitse!"] },
  ],
};

export const GI_WORDS = [
  "keegi",
  "midagi",
  "kuskil",
  "kuhugi",
  "kunagi",
  "millalgi",
  "millal",
  "mitte keegi",
  "mitte midagi",
] as const;

export const GI_DRILL = [
  "Kas sa tahad midagi juua?",
  "Ma ei tea midagi.",
  "Kas kellelgi on aega?",
] as const;

const GI_CLIPS: Record<string, Clip> = {
  ...words([
    ...new Set([
      ...GI_WORDS,
      ...GI_SOME,
      ...GI_NOT.flatMap(({ pos, neg }) => [pos, neg]),
      ...GI_MITTE,
      ...GI_EXCEPT,
      ...GI_MAKE.map(({ said }) => said),
      ...GI_WHICH.map(({ said }) => said),
      ...GI_TRANSLATE.map(({ answers }) => answers[0]),
      ...GI_FIX.map(({ answers }) => answers[0]),
      ...GI_DRILL,
    ]),
  ]),
  "c-talk": GI_TALK,
};

/** A noun's three forms in a dictionary's order: first, second, third. */
export type NounForms = readonly [string, string, string];

/** A noun's three forms written as a dictionary lists them: “pood, poe, poodi”. */
export const nounEntry = (forms: NounForms) => forms.join(", ");

/**
 * Nouns in their three forms, checked in Sõnaveeb. The first ten are lesson 14's table; the rest
 * show its patterns. Later lessons on the genitive, the partitive and the plural can import them.
 */
export const NOUN_FORMS = [
  ["kool", "kooli", "kooli"],
  ["pood", "poe", "poodi"],
  ["raamat", "raamatu", "raamatut"],
  ["maja", "maja", "maja"],
  ["auto", "auto", "autot"],
  ["linn", "linna", "linna"],
  ["uks", "ukse", "ust"],
  ["mees", "mehe", "meest"],
  ["naine", "naise", "naist"],
  ["laps", "lapse", "last"],
  ["kodu", "kodu", "kodu"],
  ["sõna", "sõna", "sõna"],
  ["tuba", "toa", "tuba"],
  ["laud", "laua", "lauda"],
  ["turg", "turu", "turgu"],
  ["küsimus", "küsimuse", "küsimust"],
  ["töö", "töö", "tööd"],
] as const satisfies readonly NounForms[];

/**
 * Lesson 14's “type the partitive” quiz: words whose ending gives the partitive away, by
 * pattern. Each shows its nominative; the learner types the partitive.
 */
export const POHIVORMID_TYPED = [
  { forms: ["inimene", "inimese", "inimest"], pattern: "ne" },
  { forms: ["hobune", "hobuse", "hobust"], pattern: "ne" },
  { forms: ["vastus", "vastuse", "vastust"], pattern: "us" },
  { forms: ["harjutus", "harjutuse", "harjutust"], pattern: "us" },
  { forms: ["maa", "maa", "maad"], pattern: "long" },
  { forms: ["tee", "tee", "teed"], pattern: "long" },
  { forms: ["puu", "puu", "puud"], pattern: "long" },
] as const satisfies readonly { forms: NounForms; pattern: "ne" | "us" | "long" }[];

/**
 * In class: Mari, the teacher, asks for a word's three forms in the second voice; the learner
 * answers in the main one. Words from lessons 2–6 and this lesson's nouns.
 */
export const POHIVORMID_DIALOGUE = {
  "d-mari-1": { text: "Tere! Mis on sõna pood põhivormid?", voice: "second" },
  "d-sina-1": "Pood, poe, poodi.",
  "d-mari-2": { text: "Jah. Ja laps?", voice: "second" },
  "d-sina-2": "Laps, lapse, last.",
  "d-mari-3": { text: "Jah. Ja maja?", voice: "second" },
  "d-sina-3": "Maja, maja, maja.",
  "d-mari-4": { text: "Ja vastus?", voice: "second" },
  "d-sina-4": "Vastus, vastuse, vastust.",
} as const satisfies Record<string, Clip>;

export const POHIVORMID_SORT = [
  { w: "toa", bin: "genitive" },
  { w: "turu", bin: "genitive" },
  { w: "lapse", bin: "genitive" },
  { w: "naise", bin: "genitive" },
  { w: "mehe", bin: "genitive" },
  { w: "lauda", bin: "partitive" },
  { w: "raamatut", bin: "partitive" },
  { w: "küsimust", bin: "partitive" },
  { w: "ust", bin: "partitive" },
  { w: "autot", bin: "partitive" },
] as const;

export const POHIVORMID_SAY = [
  { id: "koolis", said: "Laps on koolis.", also: [] },
  { id: "majas", said: "Mees on majas.", also: [] },
  { id: "toas", said: "Naine on toas.", also: [] },
  { id: "laual", said: "Raamat on laual.", also: ["Raamat on laua peal."] },
  { id: "linnas", said: "Me oleme linnas.", also: ["Meie oleme linnas.", "Oleme linnas."] },
  { id: "kodus", said: "Auto on kodus.", also: [] },
] as const;

export const POHIVORMID_FIX = [
  { first: "pood", wrong: "pood, pood, poodi" },
  { first: "laps", wrong: "laps, lapse, lapse" },
  { first: "raamat", wrong: "raamat, raamatu, raamatu" },
  { first: "tuba", wrong: "tuba, tuba, tuba" },
  { first: "naine", wrong: "naine, naine, naist" },
  { first: "mees", wrong: "mees, mees, meest" },
] as const;

export const POHIVORMID_DRILL = [
  { first: "linn", said: "Mees on linnas.", also: [] },
  { first: "pood", said: "Naine on poes.", also: [] },
  { first: "auto", said: "Laps on autos.", also: [] },
  { first: "uks", said: "Mees on uksel.", also: ["Mees on ukse juures."] },
  { first: "turg", said: "Laps on turul.", also: [] },
  { first: "töö", said: "Naine on tööl.", also: [] },
] as const;

export const POHIVORMID_HEARD = [
  { form: "poe", first: "pood", slot: "genitive" },
  { form: "poodi", first: "pood", slot: "partitive" },
  { form: "laua", first: "laud", slot: "genitive" },
  { form: "lauda", first: "laud", slot: "partitive" },
  { form: "mehe", first: "mees", slot: "genitive" },
  { form: "meest", first: "mees", slot: "partitive" },
] as const;

export const POHIVORMID_TALK = {
  turns: [
    { voice: "second", text: ["Tere, Jaan!", "Mis on sõna raamat põhivormid?"] },
    { voice: "fourth", text: "Raamat, raamatu, raamatut." },
    { voice: "second", text: ["Väga hea!", "Ja sõna laps?"] },
    { voice: "fourth", text: "Laps, lapse, lapse." },
    { voice: "second", text: "Ei, laps, lapse, last.", say: "[gently] Ei, laps, lapse, last." },
    { voice: "fourth", text: ["Last.", "Aitäh!"] },
    { voice: "second", text: "Ja sõna maja?" },
    { voice: "fourth", text: "Maja, maja, maja." },
    { voice: "second", text: "Väga hea, Jaan!", say: "[warmly] Väga hea, Jaan!" },
  ],
} as const satisfies Conversation;

const POHIVORMID_CLIPS: Record<string, Clip> = {
  ...words([
    "põhivormid",
    "koolis",
    "linnas",
    ...new Set([...NOUN_FORMS, ...POHIVORMID_TYPED.map(({ forms }) => forms)].flat()),
  ]),
  ...words(NOUN_FORMS.map(nounEntry)),
  ...words(POHIVORMID_TYPED.map(({ forms }) => nounEntry(forms))),
  ...POHIVORMID_DIALOGUE,
  ...words(POHIVORMID_SAY.map(({ said }) => said)),
  ...words(POHIVORMID_DRILL.map(({ said }) => said)),
  "c-class": POHIVORMID_TALK,
};

/*
 * The past-tense lesson, “Lihtminevik”. Every verb form was checked against its paradigm in
 * Sõnaveeb's EKI morphology database (ÕS 2025) on 21 November 2026.
 */

/** Verbs whose past puts -si- on the -ma infinitive's stem, with the stem the present builds on. */
export const PAST_SI_VERBS = [
  { verb: "elama", now: "ela", past: "ela" },
  { verb: "lugema", now: "loe", past: "luge" },
  { verb: "õppima", now: "õpi", past: "õppi" },
  { verb: "rääkima", now: "räägi", past: "rääki" },
  { verb: "töötama", now: "tööta", past: "tööta" },
  { verb: "ootama", now: "oota", past: "oota" },
] as const;

/** The six persons with what follows the stem in the past of a -si- verb. */
export const PAST_SI_ENDINGS = [
  { pronoun: "ma", ending: "sin" },
  { pronoun: "sa", ending: "sid" },
  { pronoun: "ta", ending: "s" },
  { pronoun: "me", ending: "sime" },
  { pronoun: "te", ending: "site" },
  { pronoun: "nad", ending: "sid" },
] as const;

/** Everyday verbs whose past takes -i-: the stem before it, and the forms for ma and ta. */
export const PAST_I_VERBS = [
  { verb: "olema", stem: "ol", ma: "olin", ta: "oli" },
  { verb: "tulema", stem: "tul", ma: "tulin", ta: "tuli" },
  { verb: "minema", stem: "läks", ma: "läksin", ta: "läks" },
  { verb: "tegema", stem: "teg", ma: "tegin", ta: "tegi" },
  { verb: "nägema", stem: "näg", ma: "nägin", ta: "nägi" },
  { verb: "sööma", stem: "sõ", ma: "sõin", ta: "sõi" },
  { verb: "jooma", stem: "jõ", ma: "jõin", ta: "jõi" },
] as const;

/** Time words on a line, each with a sentence whose verb is built as `build` shows. */
export const PAST_TIMELINE = [
  {
    id: "last-week",
    et: "eelmisel nädalal",
    at: -2,
    sentence: "Eelmisel nädalal lugesin palju.",
    build: "luge|sin",
  },
  { id: "yesterday", et: "eile", at: -1, sentence: "Eile õppisin eesti keelt.", build: "õppi|sin" },
  { id: "today", et: "täna", at: 0, sentence: "Täna õpin eesti keelt.", build: "õpi|n" },
] as const;

/** One sentence said now and in the past, for “Now or in the past?”. */
export const PAST_NOW_OR_THEN = [
  { verb: "olema", now: "Ta on kodus.", past: "Ta oli kodus." },
  { verb: "tulema", now: "Ta tuleb koju.", past: "Ta tuli koju." },
  { verb: "minema", now: "Ta läheb tööle.", past: "Ta läks tööle." },
  { verb: "tegema", now: "Mida ta teeb?", past: "Mida ta tegi?" },
  { verb: "sööma", now: "Ta sööb kodus.", past: "Ta sõi kodus." },
  { verb: "jooma", now: "Ta joob kohvi.", past: "Ta jõi kohvi." },
  { verb: "lugema", now: "Ta loeb raamatut.", past: "Ta luges raamatut." },
] as const;

/** Mari's Saturday, told the day after. */
export const PAST_SATURDAY = [
  "Eile oli laupäev.",
  "Kell kümme käis Mari turul.",
  "Ta ostis leiba ja juustu.",
  "Kell kaks tuli Jaan Tartust.",
  "Nad sõid kodus ja jõid kohvi.",
  "Siis läksid nad linna.",
  "Jaan läks kell üheksa koju.",
] as const;

/** Kati asks about yesterday: her lines in the second voice, the learner's in the main one. */
export const PAST_DIALOGUE = {
  "d-kati-1": { text: "Tere! Mida sa eile tegid?", voice: "second" },
  "d-sina-1": "Ma olin kodus ja lugesin raamatut.",
  "d-kati-2": { text: "Kas sa käisid ka poes?", voice: "second" },
  "d-sina-2": "Jah, ma käisin poes.",
  "d-kati-3": { text: "Mida sa ostsid?", voice: "second" },
  "d-sina-3": "Ma ostsin leiba ja piima.",
} as const satisfies Record<string, Clip>;

/** The words of the past-tense lesson with a card, each heard on its own. */
export const PAST_WORDS = [
  "lihtminevik",
  "eile",
  "täna",
  "eelmisel nädalal",
  "elama",
  "elasin",
  "lugema",
  "loen",
  "lugesin",
  "räägin",
  "rääkisin",
  "ostma",
  "ostsin",
  "ostis",
  "käisin",
  "rääkima",
  "ootama",
  "käima",
  "õppima",
  "töötama",
] as const;

/**
 * The verbs of “Which past?”: five that take -si- and five that take -i-. Three -i- verbs end in
 * -ema and two don't, and lugema does, so sorting by -ema scores 7 of 10, near chance.
 */
export const PAST_SORT = [
  { verb: "elama", past: "elasin", bin: "si" },
  { verb: "lugema", past: "lugesin", bin: "si" },
  { verb: "rääkima", past: "rääkisin", bin: "si" },
  { verb: "ootama", past: "ootasin", bin: "si" },
  { verb: "käima", past: "käisin", bin: "si" },
  { verb: "olema", past: "olin", bin: "i" },
  { verb: "tulema", past: "tulin", bin: "i" },
  { verb: "minema", past: "läksin", bin: "i" },
  { verb: "sööma", past: "sõin", bin: "i" },
  { verb: "jooma", past: "jõin", bin: "i" },
] as const;

const PAST_CLIPS: Record<string, Clip> = {
  ...words(PAST_WORDS),
  ...words(
    PAST_SI_VERBS.flatMap(({ past }) =>
      PAST_SI_ENDINGS.map(({ pronoun, ending }) => presentWithPronoun(pronoun, past, ending)),
    ),
  ),
  ...words(PAST_I_VERBS.flatMap(({ verb, ma, ta }) => [verb, ma, ta])),
  ...words(PAST_TIMELINE.map(({ sentence }) => sentence)),
  ...words(PAST_NOW_OR_THEN.flatMap(({ now, past }) => [now, past])),
  "p-saturday": { sentences: PAST_SATURDAY },
  ...PAST_DIALOGUE,
};

export const MEELDIMA_PERSONS = [
  { id: "ma", long: "mina", has: "mul", likes: "mulle" },
  { id: "sa", long: "sina", has: "sul", likes: "sulle" },
  { id: "ta", long: "tema", has: "tal", likes: "talle" },
  { id: "me", long: "meie", has: "meil", likes: "meile" },
  { id: "te", long: "teie", has: "teil", likes: "teile" },
  { id: "nad", long: "nemad", has: "neil", likes: "neile" },
] as const;

export type MeeldimaPerson = (typeof MEELDIMA_PERSONS)[number];

export const hasCat = (person: MeeldimaPerson) => `${capital(person.has)} on kass.`;
export const likesCat = (person: MeeldimaPerson) => `${capital(person.likes)} meeldib kass.`;

export const MEELDIMA_WHO: Readonly<Record<MeeldimaPerson["id"], string>> = {
  ma: "Mulle meeldib Tartu.",
  sa: "Sulle meeldib kohv.",
  ta: "Talle meeldib Tallinn.",
  me: "Meile meeldib eesti keel.",
  te: "Teile meeldib Pärnu.",
  nad: "Neile meeldib kool.",
};

export const MEELDIMA_MORE = [
  { one: "Mulle meeldib kass.", more: "Mulle meeldivad kassid." },
  { one: "Talle meeldib koer.", more: "Talle meeldivad koerad." },
  { one: "Meile meeldib raamat.", more: "Meile meeldivad raamatud." },
  { one: "Neile meeldib õun.", more: "Neile meeldivad õunad." },
] as const;

export const MEELDIMA_DOING = [
  "Mulle meeldib lugeda.",
  "Talle meeldib ujuda.",
  "Neile meeldib rääkida.",
  "Meile meeldib eesti keelt õppida.",
] as const;

export const MEELDIMA_WHICH = [
  { w: "kohv", verb: "meeldib" },
  { w: "Tallinn", verb: "meeldib" },
  { w: "pood", verb: "meeldib" },
  { w: "eesti keel", verb: "meeldib" },
  { w: "lugeda", verb: "meeldib" },
  { w: "ujuda", verb: "meeldib" },
  { w: "koerad", verb: "meeldivad" },
  { w: "raamatud", verb: "meeldivad" },
  { w: "lapsed", verb: "meeldivad" },
] as const;

export const MEELDIMA_NO = [
  { yes: "Mulle meeldib kohv.", no: "Mulle ei meeldi kohv." },
  { yes: "Talle meeldivad koerad.", no: "Talle ei meeldi koerad." },
  { yes: "Neile meeldib ujuda.", no: "Neile ei meeldi ujuda." },
  { yes: "Meile meeldivad kassid.", no: "Meile ei meeldi kassid." },
] as const;

export const MEELDIMA_ASK = [
  "Kas sulle meeldib Tallinn?",
  "Jah, meeldib.",
  "Kas sulle meeldivad kassid?",
  "Ei meeldi.",
  "Kellele meeldib kohv?",
  "Mulle!",
] as const;

export const MEELDIMA_FEELINGS = [
  "Mul on külm.",
  "Mul on palav.",
  "Mul on igav.",
  "Mul on hea meel.",
  "Mul on kahju.",
] as const;

export const MEELDIMA_PASSAGE = [
  "Tere, Jaan!",
  "Mul on täna igav.",
  "Mulle ei meeldi kodus olla.",
  "Kas sulle meeldib ujuda?",
  "Või tule kohvikusse.",
  "Kohvikus on kass.",
  "Mulle meeldivad kassid.",
  "Kirjuta mulle homme!",
] as const;

export const MEELDIMA_DIALOGUE = {
  "d-liis-1": { text: "Tere! Kas sa tuled ujuma?", voice: "second" },
  "d-sina-1": "Ei, mul on külm.",
  "d-liis-2": { text: "Väga kahju! Kas sulle meeldib kohv?", voice: "second" },
  "d-sina-2": "Jah, meeldib.",
  "d-liis-3": { text: "Mulle ka. Tule kohvikusse!", voice: "second" },
  "d-sina-3": "Jah, hea meelega!",
  "d-liis-4": { text: "Kohvikus on ka kass.", voice: "second" },
  "d-sina-4": "Mulle meeldivad kassid!",
} as const satisfies Record<string, Clip>;

export const MEELDIMA_WORDS = [
  "meeldima",
  "meeldib",
  "meeldivad",
  "ei meeldi",
  "kellele",
  ...MEELDIMA_PERSONS.map(({ likes }) => likes),
  "hea meelega",
  "maitseb",
  "Tal on igav.",
  "Kas sul on külm?",
  "Ma olen väsinud.",
  "Mulle maitseb kohv.",
  "Kas sulle maitseb?",
  "kassid",
] as const;

const MEELDIMA_CLIPS: Record<string, Clip> = {
  ...words([
    ...MEELDIMA_PERSONS.flatMap((person) => [hasCat(person), likesCat(person)]),
    ...Object.values(MEELDIMA_WHO),
    ...MEELDIMA_MORE.flatMap(({ one, more }) => [one, more]),
    ...MEELDIMA_DOING,
    ...MEELDIMA_WHICH.map(({ w }) => w),
    ...MEELDIMA_NO.flatMap(({ yes, no }) => [yes, no]),
    ...MEELDIMA_ASK,
    ...MEELDIMA_FEELINGS,
    ...MEELDIMA_WORDS,
  ]),
  "p-message": { sentences: MEELDIMA_PASSAGE },
  ...MEELDIMA_DIALOGUE,
};

/** How a verb's -da infinitive ends: -da, -ta, -la, -na, or a short -a. */
export type DaPattern = "da" | "ta" | "la" | "na" | "a";

/**
 * The verbs of the lesson on a verb's three forms: the -ma infinitive, the -da infinitive split before its
 * ending, the I form, and the command to more than one. Checked in EKI's morphology database on
 * Sõnaveeb (21 Nov 2026); ÕS lists lugema as “lugeda, loen”.
 */
export const VERB_FORMS = [
  { ma: "elama", da: ["ela", "da"], n: "elan", ge: "Elage!", pattern: "da" },
  { ma: "lugema", da: ["luge", "da"], n: "loen", ge: "Lugege!", pattern: "da" },
  { ma: "rääkima", da: ["rääki", "da"], n: "räägin", ge: "Rääkige!", pattern: "da" },
  { ma: "õppima", da: ["õppi", "da"], n: "õpin", ge: "Õppige!", pattern: "da" },
  { ma: "istuma", da: ["istu", "da"], n: "istun", ge: "Istuge!", pattern: "da" },
  { ma: "töötama", da: ["tööta", "da"], n: "töötan", ge: "Töötage!", pattern: "da" },
  { ma: "armastama", da: ["armasta", "da"], n: "armastan", ge: "Armastage!", pattern: "da" },
  { ma: "ootama", da: ["ooda", "ta"], n: "ootan", ge: "Oodake!", pattern: "ta" },
  { ma: "kuulama", da: ["kuula", "ta"], n: "kuulan", ge: "Kuulake!", pattern: "ta" },
  { ma: "vaatama", da: ["vaada", "ta"], n: "vaatan", ge: "Vaadake!", pattern: "ta" },
  { ma: "olema", da: ["ol", "la"], n: "olen", ge: "Olge!", pattern: "la" },
  { ma: "tulema", da: ["tul", "la"], n: "tulen", ge: "Tulge!", pattern: "la" },
  { ma: "minema", da: ["min", "na"], n: "lähen", ge: "Minge!", pattern: "na" },
  { ma: "tegema", da: ["teh", "a"], n: "teen", ge: "Tehke!", pattern: "a" },
  { ma: "nägema", da: ["näh", "a"], n: "näen", ge: "Nähke!", pattern: "a" },
  { ma: "sööma", da: ["süü", "a"], n: "söön", ge: "Sööge!", pattern: "a" },
  { ma: "jooma", da: ["juu", "a"], n: "joon", ge: "Jooge!", pattern: "a" },
] as const satisfies readonly {
  ma: string;
  da: readonly [string, string];
  n: string;
  ge: string;
  pattern: DaPattern;
}[];

export type VerbForms = (typeof VERB_FORMS)[number];

/** A -da infinitive whole: “lugeda”. */
export const daForm = (verb: VerbForms) => verb.da.join("");

/** The three forms said in a row, as a dictionary lists them: “lugema, lugeda, loen”. */
export const threeForms = (verb: VerbForms) => `${verb.ma}, ${daForm(verb)}, ${verb.n}`;

/** The commands the lesson builds from a -da infinitive. */
export const VORMID_COMMANDS = [
  "lugema",
  "rääkima",
  "istuma",
  "ootama",
  "olema",
  "tulema",
  "tegema",
];

/**
 * A teacher to her class, gap by gap: a command takes the -da infinitive's stem, the present the I
 * form's. Words from lessons 1–11.
 */
export const VORMID_CLASS = [
  "Tere! Istuge, palun.",
  "Täna me loeme raamatut.",
  "Lugege, palun.",
  "Te loete väga hästi.",
  "Kas te räägite kodus eesti keelt?",
  "Rääkige kodus eesti keelt!",
] as const;

export const VORMID_SAY = [
  { id: "lugeda", said: "Ma tahan lugeda.", also: ["Mina tahan lugeda.", "Tahan lugeda."] },
  { id: "lugege", said: "Lugege, palun!", also: ["Palun lugege!"] },
  {
    id: "ootan",
    said: "Ma ootan kohvikus.",
    also: [
      "Mina ootan kohvikus.",
      "Ootan kohvikus.",
      "Kohvikus ma ootan.",
      "Kohvikus ootan.",
      "Kohvikus ootan ma.",
      "Kohvikus ootan mina.",
      "Kohvikus mina ootan.",
    ],
  },
  { id: "oodake", said: "Oodake, palun!", also: ["Palun oodake!"] },
  { id: "suua", said: "Ma tahan süüa.", also: ["Mina tahan süüa.", "Tahan süüa."] },
  {
    id: "teeme",
    said: "Me teeme tööd.",
    also: ["Meie teeme tööd.", "Teeme tööd.", "Me töötame.", "Meie töötame.", "Töötame."],
  },
] as const;

export const VORMID_FIX = [
  { id: "loen", wrong: "Ma lugen raamatut.", right: "Ma loen raamatut." },
  { id: "oodake", wrong: "Ootage, palun!", right: "Oodake, palun!" },
  { id: "teen", wrong: "Ma tegen tööd.", right: "Ma teen tööd." },
  { id: "suua", wrong: "Ma tahan sööma.", right: "Ma tahan süüa." },
  { id: "kuulake", wrong: "Kuulage, palun!", right: "Kuulake, palun!" },
  { id: "tulla", wrong: "Ma tahan tulema.", right: "Ma tahan tulla." },
] as const;

export const VORMID_DRILL = [
  { id: "tulge", said: "Tulge siia!", rule: "command", also: ["Siia tulge!"] },
  {
    id: "juua",
    said: "Ma tahan kohvi juua.",
    rule: "da",
    also: [
      "Mina tahan kohvi juua.",
      "Tahan kohvi juua.",
      "Ma tahan juua kohvi.",
      "Mina tahan juua kohvi.",
      "Tahan juua kohvi.",
      "Kohvi tahan ma juua.",
      "Kohvi tahan juua.",
      "Kohvi ma tahan juua.",
      "Kohvi tahan mina juua.",
      "Kohvi mina tahan juua.",
    ],
  },
  {
    id: "raagime",
    said: "Me räägime eesti keelt.",
    rule: "present",
    also: [
      "Meie räägime eesti keelt.",
      "Räägime eesti keelt.",
      "Eesti keelt me räägime.",
      "Eesti keelt meie räägime.",
      "Eesti keelt räägime.",
    ],
  },
  {
    id: "vaadake",
    said: "Vaadake, palun!",
    rule: "command",
    also: ["Palun vaadake!"],
  },
  {
    id: "elavad",
    said: "Nad elavad Tartus.",
    rule: "present",
    also: [
      "Nemad elavad Tartus.",
      "Tartus nad elavad.",
      "Tartus elavad nad.",
      "Tartus nemad elavad.",
      "Tartus elavad nemad.",
    ],
  },
  {
    id: "oppida",
    said: "Ma tahan eesti keelt õppida.",
    rule: "da",
    also: [
      "Mina tahan eesti keelt õppida.",
      "Tahan eesti keelt õppida.",
      "Ma tahan õppida eesti keelt.",
      "Mina tahan õppida eesti keelt.",
      "Tahan õppida eesti keelt.",
      "Eesti keelt tahan ma õppida.",
      "Eesti keelt tahan õppida.",
      "Eesti keelt ma tahan õppida.",
      "Eesti keelt tahan mina õppida.",
      "Eesti keelt mina tahan õppida.",
    ],
  },
] as const;

export const VORMID_TALK = {
  turns: [
    { voice: "fourth", text: ["Tere, Mari!", "Mida sa teed?"] },
    { voice: "third", text: ["Tere, Jaan!", "Ma loen raamatut.", "Mu sõber Kati tuleb ka."] },
    { voice: "fourth", text: "Kas Kati tuleb täna?" },
    { voice: "third", text: ["Jah, ta tuleb kell kolm.", "Istu, palun!"] },
    { voice: "fourth", text: ["Aitäh.", "Mida sa loed?"] },
    { voice: "third", text: ["Ma loen eesti raamatut.", "Ma õpin eesti keelt."] },
    { voice: "fourth", text: "Kas sa räägid kodus eesti keelt?" },
    {
      voice: "third",
      text: ["Natuke.", "Mu mees räägib soome keelt."],
      say: "[laughs] Natuke. Mu mees räägib soome keelt.",
    },
    { voice: "fourth", text: "Ma tahan ka eesti keelt õppida." },
    { voice: "third", text: ["Tule meie kooli!", "Me loeme ja räägime palju."] },
    { voice: "fourth", text: ["Hästi!", "Kas õpetaja on hea?"] },
    { voice: "third", text: "Jah, väga hea." },
    { voice: "fourth", text: "Vaata, Kati tuleb!", say: "[excited] Vaata, Kati tuleb!" },
    { voice: "third", text: ["Kati, tule siia!", "Istu, palun!"] },
    { voice: "fourth", text: ["Tere, Kati!", "Mida te täna teete?"] },
    { voice: "third", text: ["Me loeme koos eesti raamatut.", "Tule ka homme, Jaan!"] },
    { voice: "fourth", text: ["Hästi, ma tulen.", "Head aega!"] },
    { voice: "third", text: "Head aega, Jaan!" },
  ],
} as const satisfies Conversation;

/** Which form a verb wants for the verb after it. */
export type Takes = "da" | "ma";

/**
 * The verbs of the lesson on infinitives that a second verb follows: the verb, the form a learner
 * meets it in (`lead`), which form the second verb takes, how a sentence with it starts
 * (`frame`), and one sentence whose second verb is `form`, written with `|` before its ending.
 * Sõnaveeb's EKI dictionary names the form under Rektsioon: “mida teha” for the -da infinitive, “mida
 * tegema” for the -ma form (pidama in its second entry), checked 21 Nov 2026.
 */
export const INFINITIVE_LEADS = [
  {
    verb: "tahtma",
    lead: "tahan",
    takes: "da",
    frame: "Ma tahan",
    said: "Ma tahan süüa.",
    form: "süü|a",
  },
  {
    verb: "võima",
    lead: "võin",
    takes: "da",
    frame: "Ma võin",
    said: "Ma võin sind oodata.",
    form: "ooda|ta",
  },
  {
    verb: "saama",
    lead: "saan",
    takes: "da",
    frame: "Ma saan",
    said: "Ma saan homme tulla.",
    form: "tul|la",
  },
  {
    verb: "oskama",
    lead: "oskan",
    takes: "da",
    frame: "Ma oskan",
    said: "Ma oskan natuke eesti keelt rääkida.",
    form: "rääki|da",
  },
  {
    verb: "tohtima",
    lead: "tohin",
    takes: "da",
    frame: "Ma tohin",
    said: "Ma tohin kodus töötada.",
    form: "tööta|da",
  },
  {
    verb: "proovima",
    lead: "proovin",
    takes: "da",
    frame: "Ma proovin",
    said: "Ma proovin eesti keelt õppida.",
    form: "õppi|da",
  },
  {
    verb: "armastama",
    lead: "armastan",
    takes: "da",
    frame: "Ma armastan",
    said: "Ma armastan lugeda.",
    form: "luge|da",
  },
  {
    verb: "meeldima",
    lead: "mulle meeldib",
    takes: "da",
    frame: "Mulle meeldib",
    said: "Mulle meeldib kohvi juua.",
    form: "juu|a",
  },
  {
    verb: "pidama",
    lead: "pean",
    takes: "ma",
    frame: "Ma pean",
    said: "Ma pean minema.",
    form: "mine|ma",
  },
  {
    verb: "hakkama",
    lead: "hakkan",
    takes: "ma",
    frame: "Ma hakkan",
    said: "Ma hakkan eesti keelt õppima.",
    form: "õppi|ma",
  },
  {
    verb: "minema",
    lead: "lähen",
    takes: "ma",
    frame: "Ma lähen",
    said: "Ma lähen kohvi jooma.",
    form: "joo|ma",
  },
  { verb: "tulema", lead: "tule", takes: "ma", frame: "Tule", said: "Tule sööma!", form: "söö|ma" },
  {
    verb: "jääma",
    lead: "jään",
    takes: "ma",
    frame: "Ma jään",
    said: "Ma jään koju lugema.",
    form: "luge|ma",
  },
] as const satisfies readonly {
  verb: string;
  lead: string;
  takes: Takes;
  frame: string;
  said: string;
  form: string;
}[];

export type InfinitiveLead = (typeof INFINITIVE_LEADS)[number];

/** Six verbs in their -ma and -da infinitives, `|` before the ending, for tahan and pean side by side. */
export const INFINITIVE_PAIRS = [
  { ma: "luge|ma", da: "luge|da" },
  { ma: "söö|ma", da: "süü|a" },
  { ma: "mine|ma", da: "min|na" },
  { ma: "tule|ma", da: "tul|la" },
  { ma: "õppi|ma", da: "õppi|da" },
  { ma: "tööta|ma", da: "tööta|da" },
] as const;

/** “Ma tahan lugeda.” or “Ma pean lugema.”: a pair's form after tahan or pean, as one clip. */
export const wantOrMust = (form: string, takes: Takes) =>
  `Ma ${takes === "da" ? "tahan" : "pean"} ${form.replace("|", "")}.`;

/** The second verb last, however much comes between it and the first. */
export const INFINITIVE_ORDER = [
  "Ma pean minema.",
  "Ma pean tööle minema.",
  "Ma pean homme tööle minema.",
  "Ma tahan täna kodus lugeda.",
] as const;

/**
 * Mari's message to Jaan, gap by gap: after pean the -ma form, after tahad and meeldib the -da
 * form, and with no verb before it the present. Words from lessons 1–22.
 */
export const INFINITIVE_MESSAGE = [
  "Tere, Jaan! Ma pean täna kodus töötama.",
  "Aga ma lähen kell neli linna.",
  "Kas sa tahad kohvi juua?",
  "Ma ootan sind kohvikus.",
  "Mulle meeldib kohvikus lugeda.",
  "Ma pean kell kuus koju minema.",
] as const;

export const INFINITIVE_SAY = [
  {
    id: "juua",
    said: "Ma tahan kohvi juua.",
    also: [
      "Mina tahan kohvi juua.",
      "Tahan kohvi juua.",
      "Ma tahan juua kohvi.",
      "Mina tahan juua kohvi.",
      "Tahan juua kohvi.",
      "Kohvi tahan ma juua.",
      "Kohvi tahan juua.",
      "Kohvi ma tahan juua.",
      "Kohvi tahan mina juua.",
      "Kohvi mina tahan juua.",
    ],
  },
  {
    id: "minema",
    said: "Ma pean koju minema.",
    also: [
      "Mina pean koju minema.",
      "Pean koju minema.",
      "Koju pean ma minema.",
      "Koju pean minema.",
      "Koju ma pean minema.",
      "Ma pean minema koju.",
      "Mina pean minema koju.",
      "Pean minema koju.",
      "Koju pean mina minema.",
      "Koju mina pean minema.",
      "Mul on vaja koju minna.",
      "Minul on vaja koju minna.",
      "Koju on mul vaja minna.",
      "Mul tuleb koju minna.",
    ],
  },
  {
    id: "oppima",
    said: "Ma hakkan eesti keelt õppima.",
    also: [
      "Mina hakkan eesti keelt õppima.",
      "Hakkan eesti keelt õppima.",
      "Ma hakkan õppima eesti keelt.",
      "Mina hakkan õppima eesti keelt.",
      "Hakkan õppima eesti keelt.",
      "Eesti keelt hakkan ma õppima.",
      "Eesti keelt hakkan õppima.",
      "Eesti keelt ma hakkan õppima.",
      "Eesti keelt hakkan mina õppima.",
      "Eesti keelt mina hakkan õppima.",
    ],
  },
  {
    id: "tulla",
    said: "Ma saan homme tulla.",
    also: [
      "Mina saan homme tulla.",
      "Homme saan ma tulla.",
      "Homme ma saan tulla.",
      "Saan homme tulla.",
      "Homme saan tulla.",
      "Ma saan tulla homme.",
      "Ma võin homme tulla.",
      "Mina võin homme tulla.",
      "Võin homme tulla.",
      "Homme võin ma tulla.",
      "Homme ma võin tulla.",
      "Ma võin tulla homme.",
      "Homme võin tulla.",
      "Mina saan tulla homme.",
      "Saan tulla homme.",
      "Mina võin tulla homme.",
      "Võin tulla homme.",
      "Homme saan mina tulla.",
      "Homme mina saan tulla.",
      "Homme võin mina tulla.",
      "Homme mina võin tulla.",
    ],
  },
  {
    id: "lugeda",
    said: "Mulle meeldib lugeda.",
    also: [
      "Minule meeldib lugeda.",
      "Lugeda mulle meeldib.",
      "Lugeda meeldib mulle.",
      "Lugeda meeldib minule.",
      "Lugeda minule meeldib.",
    ],
  },
  { id: "sooma", said: "Tule sööma!", also: ["Tulge sööma!"] },
] as const;

export const INFINITIVE_FIX = [
  { id: "minna", wrong: "Ma tahan linna minema.", right: "Ma tahan linna minna." },
  { id: "tulema", wrong: "Ma pean homme tulla.", right: "Ma pean homme tulema." },
  { id: "jooma", wrong: "Ma lähen kohvi juua.", right: "Ma lähen kohvi jooma." },
  { id: "raakida", wrong: "Ma oskan eesti keelt rääkima.", right: "Ma oskan eesti keelt rääkida." },
  { id: "oppima", wrong: "Ma hakkan homme õppida.", right: "Ma hakkan homme õppima." },
  { id: "lugeda", wrong: "Mulle meeldib lugema.", right: "Mulle meeldib lugeda." },
] as const;

export const INFINITIVE_TALK = {
  turns: [
    { voice: "third", text: ["Tere, Jaan!", "Mida sa täna teed?"] },
    { voice: "fourth", text: ["Täna ma pean tööle minema.", "Aga kell viis ma tulen koju."] },
    { voice: "third", text: "Kas sa tahad kohvikusse tulla?" },
    {
      voice: "fourth",
      text: ["Jah, ma tahan kohvi juua.", "Aga ma pean kell seitse kodus olema."],
    },
    {
      voice: "third",
      text: ["Hästi.", "Mulle meeldib kohvikus lugeda.", "Ma võin sind kohvikus oodata."],
    },
    { voice: "fourth", text: "Kas Kati saab ka tulla?" },
    { voice: "third", text: "Ei, Kati hakkab täna eesti keelt õppima." },
    { voice: "fourth", text: "Kas sa oskad süüa teha?", say: "[curious] Kas sa oskad süüa teha?" },
    { voice: "third", text: ["Natuke.", "Täna ma proovin süüa teha."] },
    {
      voice: "fourth",
      text: ["Hästi!", "Ma tulen homme sööma!"],
      say: "[laughs] Hästi! Ma tulen homme sööma!",
    },
    {
      voice: "third",
      text: ["Tule!", "Aga sa pead kell kuus tulema.", "Ma hakkan kell viis süüa tegema."],
    },
    { voice: "fourth", text: ["Hästi.", "Kas Kati võib ka tulla?"] },
    { voice: "third", text: ["Jah, muidugi.", "Kati armastab süüa."] },
    {
      voice: "fourth",
      text: ["Väga hea.", "Nüüd ma pean tööle minema.", "Homme näeme!", "Head aega!"],
    },
    { voice: "third", text: "Head aega, Jaan!" },
  ],
} as const satisfies Conversation;

export const INFINITIVE_GAPS = [
  { id: "juua", before: "Ma tahan vett ", answer: "juua", wrong: "jooma", after: ".", takes: "da" },
  {
    id: "tulla",
    before: "Kas sa saad täna ",
    answer: "tulla",
    wrong: "tulema",
    after: "?",
    takes: "da",
  },
  {
    id: "teha",
    before: "Ma oskan süüa ",
    answer: "teha",
    wrong: "tegema",
    after: ".",
    takes: "da",
  },
  {
    id: "olla",
    before: "Mulle meeldib kodus ",
    answer: "olla",
    wrong: "olema",
    after: ".",
    takes: "da",
  },
  {
    id: "minema",
    before: "Nad peavad homme tööle ",
    answer: "minema",
    wrong: "minna",
    after: ".",
    takes: "ma",
  },
  { id: "sooma", before: "Ta läheb ", answer: "sööma", wrong: "süüa", after: ".", takes: "ma" },
  {
    id: "tegema",
    before: "Ma hakkan õhtul süüa ",
    answer: "tegema",
    wrong: "teha",
    after: ".",
    takes: "ma",
  },
  {
    id: "olema",
    before: "Ma pean kell seitse kodus ",
    answer: "olema",
    wrong: "olla",
    after: ".",
    takes: "ma",
  },
] as const;

export const infinitiveGapSaid = ({ before, answer, after }: (typeof INFINITIVE_GAPS)[number]) =>
  `${before}${answer}${after}`;

export const INFINITIVE_ORDERS = {
  linna: [
    "Ma tahan homme linna minna.",
    "Homme tahan ma linna minna.",
    "Homme ma tahan linna minna.",
    "Ma tahan linna homme minna.",
    "Linna tahan ma homme minna.",
    "Ma tahan homme minna linna.",
    "Homme tahan ma minna linna.",
    "Linna ma tahan homme minna.",
    "Homme ma tahan minna linna.",
  ],
  oppima: [
    "Ma hakkan täna kodus õppima.",
    "Täna hakkan ma kodus õppima.",
    "Täna ma hakkan kodus õppima.",
    "Kodus hakkan ma täna õppima.",
    "Ma hakkan kodus täna õppima.",
    "Kodus ma hakkan täna õppima.",
    "Ma hakkan täna õppima kodus.",
    "Täna hakkan ma õppima kodus.",
    "Täna ma hakkan õppima kodus.",
  ],
  lugema: ["Ma jään koju lugema.", "Koju jään ma lugema.", "Koju ma jään lugema."],
  toole: [
    "Ma pean homme tööle minema.",
    "Homme pean ma tööle minema.",
    "Homme ma pean tööle minema.",
    "Ma pean tööle homme minema.",
    "Tööle pean ma homme minema.",
    "Ma pean homme minema tööle.",
    "Homme pean ma minema tööle.",
    "Tööle ma pean homme minema.",
    "Homme ma pean minema tööle.",
  ],
  lugeda: [
    "Ma tahan täna kodus lugeda.",
    "Täna tahan ma kodus lugeda.",
    "Täna ma tahan kodus lugeda.",
    "Kodus tahan ma täna lugeda.",
    "Ma tahan kodus täna lugeda.",
    "Kodus ma tahan täna lugeda.",
    "Ma tahan täna lugeda kodus.",
    "Täna tahan ma lugeda kodus.",
    "Täna ma tahan lugeda kodus.",
  ],
  tool: [
    "Me peame kell viis tööl olema.",
    "Kell viis peame me tööl olema.",
    "Kell viis me peame tööl olema.",
    "Me peame tööl kell viis olema.",
    "Tööl peame me kell viis olema.",
    "Me peame kell viis olema tööl.",
    "Kell viis peame me olema tööl.",
    "Tööl me peame kell viis olema.",
    "Kell viis me peame olema tööl.",
  ],
  oodata: [
    "Ma võin sind kohvikus oodata.",
    "Kohvikus võin ma sind oodata.",
    "Ma võin kohvikus sind oodata.",
    "Kohvikus ma võin sind oodata.",
    "Ma võin sind oodata kohvikus.",
    "Sind võin ma kohvikus oodata.",
    "Sind ma võin kohvikus oodata.",
  ],
} as const;

export const INFINITIVE_BUILD = [
  { id: "linna", words: ["ma", "tahan", "homme", "linna", "minema"] },
  { id: "oppima", words: ["ma", "hakkan", "täna", "kodus", "õppima"] },
  { id: "toole", words: ["ma", "pean", "homme", "tööle", "minema"] },
  { id: "lugeda", words: ["ma", "tahan", "täna", "kodus", "lugema"] },
  { id: "tool", words: ["me", "peame", "kell viis", "tööl", "olema"] },
  { id: "oodata", words: ["ma", "võin", "sind", "kohvikus", "ootama"] },
] as const;

/** Words of the infinitives lesson with a card, and the sentences its build quiz plays. */
export const INFINITIVE_WORDS = [
  "lugema",
  "lugeda",
  "Nad tahavad lugeda.",
  "Nad peavad lugema.",
  "teha",
  "tegema",
  "õppima",
  "Ma õpin lugema.",
  "Ma tahan homme linna minna.",
  "Ma hakkan täna kodus õppima.",
] as const;

export type Way = "ma" | "mas" | "mast";
export const WAYS: readonly Way[] = ["ma", "mas", "mast"];

export const WAY_LEADS: Record<Way, string> = { ma: "läheb", mas: "on", mast: "tuleb" };

export const GOING_VERBS = [
  { verb: "ujuma", stem: "uju" },
  { verb: "jooksma", stem: "jooks" },
  { verb: "sööma", stem: "söö" },
  { verb: "kohvi jooma", stem: "kohvi joo" },
] as const;

export type GoingVerb = (typeof GOING_VERBS)[number];

export const goingForm = (verb: GoingVerb, way: Way) => `${verb.stem}${way}`;

export const goingSentence = (verb: GoingVerb, way: Way) =>
  `Mari ${WAY_LEADS[way]} ${goingForm(verb, way)}.`;

export const GOING_SCENE = [
  { id: "majja", word: "sööma", sentence: "Kass läheb sööma." },
  { id: "majas", word: "söömas", sentence: "Kass on söömas." },
  { id: "majast", word: "söömast", sentence: "Kass tuleb söömast." },
] as const;

export const GOING_SORT = [
  { w: "jooksma", bin: "kuhu" },
  { w: "koju", bin: "kuhu" },
  { w: "linna", bin: "kuhu" },
  { w: "kohvi joomas", bin: "kus" },
  { w: "kohvikus", bin: "kus" },
  { w: "Tallinnas", bin: "kus" },
  { w: "söömast", bin: "kust" },
  { w: "koolist", bin: "kust" },
  { w: "kodust", bin: "kust" },
] as const;

export const GOING_KEYS = [
  { lead: "lähen", said: "Ma lähen ujuma.", form: "uju|ma" },
  { lead: "olen", said: "Ma olen ujumas.", form: "uju|mas" },
  { lead: "käin", said: "Ma käin iga päev ujumas.", form: "uju|mas" },
  { lead: "tulen", said: "Ma tulen ujumast.", form: "uju|mast" },
  { lead: "tule", said: "Tule sööma!", form: "söö|ma" },
] as const;

export const GOING_VOICE = [
  "Tere, Jaan! Ma olen kodus.",
  "Ema ei ole kodus, ta on ujumas.",
  "Ta käib iga päev ujumas.",
  "Isa tuleb kell viis jooksmast.",
  "Ma lähen kell kuus sööma.",
  "Tule ka sööma!",
] as const;

export const GOING_SAY = [
  { id: "ujuma", said: "Ma lähen ujuma.", also: ["Mina lähen ujuma.", "Lähen ujuma."] },
  { id: "ujumas", said: "Mari on ujumas.", also: ["Mari käib ujumas.", "Mari on väljas ujumas."] },
  {
    id: "jooksmast",
    said: "Isa tuleb jooksmast.",
    also: [
      "Isa tuleb jooksmast tagasi.",
      "Isa tuleb jooksmast koju.",
      "Isa tuleb tagasi jooksmast.",
    ],
  },
  {
    id: "kain",
    said: "Ma käin iga päev ujumas.",
    also: [
      "Mina käin iga päev ujumas.",
      "Käin iga päev ujumas.",
      "Iga päev käin ma ujumas.",
      "Iga päev ma käin ujumas.",
      "Ma käin ujumas iga päev.",
      "Iga päev käin ujumas.",
      "Käin ujumas iga päev.",
      "Mina käin ujumas iga päev.",
      "Ma lähen iga päev ujuma.",
      "Mina lähen iga päev ujuma.",
      "Lähen iga päev ujuma.",
      "Iga päev lähen ma ujuma.",
      "Iga päev ma lähen ujuma.",
      "Iga päev käin mina ujumas.",
      "Iga päev lähen mina ujuma.",
      "Iga päev lähen ujuma.",
      "Iga päev mina käin ujumas.",
      "Iga päev mina lähen ujuma.",
    ],
  },
  {
    id: "sooma",
    said: "Me läheme sööma.",
    also: [
      "Meie läheme sööma.",
      "Läheme sööma.",
      "Me lähme sööma.",
      "Meie lähme sööma.",
      "Lähme sööma.",
    ],
  },
  {
    id: "tuled",
    said: "Kas sa tuled ujumast?",
    also: [
      "Kas te tulete tagasi ujumast?",
      "Kas teie tulete tagasi ujumast?",
      "Kas tulete tagasi ujumast?",
      "Kas te tulete ujumast koju?",
      "Kas teie tulete ujumast koju?",
      "Kas tulete ujumast koju?",
      "Tulete ujumast?",
      "Kas sina tuled ujumast?",
      "Kas te tulete ujumast?",
      "Tuled sa ujumast?",
      "Kas tuled ujumast?",
      "Kas sa tuled ujumast tagasi?",
      "Kas tulete ujumast?",
      "Tulete te ujumast?",
      "Kas te tulete ujumast tagasi?",
      "Kas sina tuled ujumast tagasi?",
      "Tuled sa ujumast tagasi?",
      "Kas tuled ujumast tagasi?",
      "Kas tulete ujumast tagasi?",
      "Tulete te ujumast tagasi?",
      "Kas teie tulete ujumast?",
      "Kas teie tulete ujumast tagasi?",
      "Kas sa tuled tagasi ujumast?",
      "Tuled ujumast?",
      "Kas sa tuled ujumast koju?",
      "Kas sina tuled tagasi ujumast?",
      "Kas sina tuled ujumast koju?",
      "Kas tuled tagasi ujumast?",
      "Kas tuled ujumast koju?",
      "Tuled sina ujumast tagasi?",
      "Tuled sina ujumast?",
      "Tuled ujumast tagasi?",
    ],
  },
] as const;

export const GOING_FIX = [
  { id: "ujuma", wrong: "Ma lähen ujumas.", right: "Ma lähen ujuma." },
  { id: "ujumas", wrong: "Mari on ujuma.", right: "Mari on ujumas." },
  { id: "jooksmast", wrong: "Isa tuleb jooksma tagasi.", right: "Isa tuleb jooksmast tagasi." },
  { id: "kain", wrong: "Ma käin iga päev ujumast.", right: "Ma käin iga päev ujumas." },
  { id: "sooma", wrong: "Kass läheb söömas.", right: "Kass läheb sööma." },
  { id: "soomast", wrong: "Me tuleme söömas.", right: "Me tuleme söömast." },
] as const;

export const GOING_DRILL = [
  { id: "jooksma", rule: "ma", said: "Ta läheb jooksma.", also: ["Tema läheb jooksma."] },
  { id: "tule", rule: "ma", said: "Tule sööma!", also: ["Tulge sööma!"] },
  {
    id: "joomas",
    rule: "mas",
    said: "Ema on kohvi joomas.",
    also: ["Ema käib kohvi joomas.", "Ema on väljas kohvi joomas."],
  },
  {
    id: "kaivad",
    rule: "mas",
    said: "Nad käivad iga päev jooksmas.",
    also: [
      "Nemad käivad iga päev jooksmas.",
      "Iga päev käivad nad jooksmas.",
      "Iga päev nad käivad jooksmas.",
      "Nad käivad jooksmas iga päev.",
      "Nemad käivad jooksmas iga päev.",
      "Nad lähevad iga päev jooksma.",
      "Nemad lähevad iga päev jooksma.",
      "Iga päev lähevad nad jooksma.",
      "Iga päev käivad nemad jooksmas.",
      "Iga päev nemad käivad jooksmas.",
      "Nad lähevad jooksma iga päev.",
      "Iga päev nad lähevad jooksma.",
      "Nemad lähevad jooksma iga päev.",
      "Iga päev nemad lähevad jooksma.",
      "Iga päev lähevad nemad jooksma.",
    ],
  },
  {
    id: "ujumast",
    rule: "mast",
    said: "Ma tulen ujumast.",
    also: [
      "Mina tulen ujumast.",
      "Tulen ujumast.",
      "Ma tulen ujumast tagasi.",
      "Tulen ujumast tagasi.",
      "Mina tulen ujumast tagasi.",
      "Ma tulen tagasi ujumast.",
      "Ma tulen ujumast koju.",
      "Mina tulen tagasi ujumast.",
      "Mina tulen ujumast koju.",
      "Tulen tagasi ujumast.",
      "Tulen ujumast koju.",
    ],
  },
  {
    id: "soomast",
    rule: "mast",
    said: "Kati tuleb söömast.",
    also: ["Kati tuleb söömast tagasi.", "Kati tuleb tagasi söömast.", "Kati tuleb söömast koju."],
  },
] as const;

export const GOING_FORMS = [
  { id: "kass", rule: "ma", base: "sööma", before: "Kass läheb ", answer: "sööma", after: "." },
  { id: "me", rule: "ma", base: "ujuma", before: "Me läheme ", answer: "ujuma", after: "." },
  { id: "isa", rule: "mas", base: "jooksma", before: "Isa on ", answer: "jooksmas", after: "." },
  {
    id: "kain",
    rule: "mas",
    base: "ujuma",
    before: "Ma käin iga päev ",
    answer: "ujumas",
    after: ".",
  },
  {
    id: "ema",
    rule: "mast",
    base: "ujuma",
    before: "Ema tuleb ",
    answer: "ujumast",
    after: ".",
  },
  {
    id: "nad",
    rule: "mast",
    base: "sööma",
    before: "Nad tulevad ",
    answer: "söömast",
    after: ".",
  },
] as const;

export const goingFormSaid = ({ before, answer, after }: (typeof GOING_FORMS)[number]) =>
  `${before}${answer}${after}`;

export const GOING_TALK = {
  turns: [
    { voice: "fourth", text: ["Tere, Mari!", "Kus sa oled?"] },
    { voice: "third", text: ["Ma olen kodus.", "Aga täna lähen ma ujuma."] },
    { voice: "fourth", text: "Kas Kati on ka kodus?" },
    { voice: "third", text: ["Ei, Kati on jooksmas.", "Ta käib iga päev jooksmas."] },
    { voice: "fourth", text: "Ja sinu ema?" },
    { voice: "third", text: ["Ema tuleb kohvi joomast.", "Ta oli sõbraga kohvikus."] },
    { voice: "fourth", text: ["Mina tulen praegu söömast.", "Kas ma võin ka ujuma tulla?"] },
    { voice: "third", text: ["Jah, muidugi!", "Kas sa käid tihti ujumas?"] },
    { voice: "fourth", text: ["Ei, ma käin rohkem jooksmas.", "Aga täna tahan ma ujuda."] },
    { voice: "third", text: ["Tore.", "Siis läheme koos ujuma."] },
    { voice: "fourth", text: ["Hästi!", "Mis kell sa lähed?"] },
    { voice: "third", text: ["Kell viis.", "Ma ootan sind ujula ees."] },
    { voice: "fourth", text: ["Hästi, kell viis ujula ees.", "Kas Kati tuleb ka?"] },
    { voice: "third", text: ["Ei, Kati tuleb kell kuus jooksmast.", "Ta tuleb hiljem sööma."] },
    { voice: "fourth", text: ["Selge.", "Head aega!"] },
    { voice: "third", text: "Head aega, Jaan!" },
  ],
} as const satisfies Conversation;

export const GOING_WORDS = [
  "majja",
  "majas",
  "majast",
  "poodi",
  "poes",
  "poest",
  "Kus Mari on?",
  "Kuhu sa lähed?",
  "Kust sa tuled?",
  "lähen",
  "olen",
  "käin",
  "käima",
  "tulen",
  "tulema",
  "iga päev",
] as const;

/**
 * The plural lesson's nouns: the first and second forms a dictionary gives, and the plural, the
 * second form with -d. `same` words only gain a vowel or nothing; `changed` ones keep lesson 13's
 * stem change. Checked in ÕS 2025 on Sõnaveeb (EKI morphology, 21 Nov 2026).
 */
export const MITMUS_SAME = [
  { one: "maja", second: "maja", many: "majad" },
  { one: "auto", second: "auto", many: "autod" },
  { one: "kass", second: "kassi", many: "kassid" },
  { one: "kool", second: "kooli", many: "koolid" },
  { one: "linn", second: "linna", many: "linnad" },
  { one: "raamat", second: "raamatu", many: "raamatud" },
  { one: "laps", second: "lapse", many: "lapsed" },
  { one: "uks", second: "ukse", many: "uksed" },
] as const;

export const MITMUS_CHANGED = [
  { one: "pood", second: "poe", many: "poed" },
  { one: "tuba", second: "toa", many: "toad" },
  { one: "jõgi", second: "jõe", many: "jõed" },
  { one: "mees", second: "mehe", many: "mehed" },
  { one: "naine", second: "naise", many: "naised" },
  { one: "sõber", second: "sõbra", many: "sõbrad" },
] as const;

export type PluralNoun = (typeof MITMUS_SAME)[number] | (typeof MITMUS_CHANGED)[number];

/** A dictionary's first two forms, said as one clip: “tuba, toa”. */
export const dictionaryPair = ({ one, second }: { one: string; second: string }) =>
  `${one}, ${second}`;

/**
 * One person or thing and many, with the verb that agrees: the ta form ends in -b, the plural takes
 * the nad form in -vad, and on stays on. Sõnaveeb: loevad, räägivad, ootavad, töötavad, joovad.
 */
export const MITMUS_SENTENCES = [
  { one: "laps", many: "lapsed", verb: ["loe", "b", "vad"], tail: "" },
  { one: "õpetaja", many: "õpetajad", verb: ["räägi", "b", "vad"], tail: "" },
  { one: "sõber", many: "sõbrad", verb: ["oota", "b", "vad"], tail: "" },
  { one: "mees", many: "mehed", verb: ["tööta", "b", "vad"], tail: "" },
  { one: "naine", many: "naised", verb: ["joo", "b", "vad"], tail: " kohvi" },
  { one: "kass", many: "kassid", verb: ["on", "", ""], tail: " kodus" },
] as const;

export type PluralSentence = (typeof MITMUS_SENTENCES)[number];

/** The sentence for one or for many: “Laps loeb.”, “Lapsed loevad.” */
export const pluralSentence = ({ one, many, verb, tail }: PluralSentence, more: boolean) =>
  `${capital(more ? many : one)} ${verb[0]}${more ? verb[2] : verb[1]}${tail}.`;

/** Adjective and noun, one and many. Sõnaveeb: suured, väikesed, uued, vanad, head, ilusad. */
export const MITMUS_ADJECTIVES = [
  { one: "suur maja", many: "suured majad" },
  { one: "väike kass", many: "väikesed kassid" },
  { one: "uus raamat", many: "uued raamatud" },
  { one: "vana linn", many: "vanad linnad" },
  { one: "hea sõber", many: "head sõbrad" },
  { one: "ilus tuba", many: "ilusad toad" },
] as const;

/** A home in Tartu, cut into gaps in the lesson: three want one, three want many. Magama is glossed before it. */
export const MITMUS_PASSAGE = [
  "Me elame Tartus.",
  "Meie kodu on väike, aga toad on suured.",
  "Ema ja isa töötavad Tallinnas.",
  "Lapsed õpivad koolis.",
  "Meie kass magab kodus.",
  "Ta on väike ja ilus.",
] as const;

/** Words and lines the plural lesson says outside its lists. */
export const MITMUS_WORDS = [
  "nad",
  "kaks kassi",
  "Maja on suur.",
  "Majad on suured.",
  "magama",
  "suur",
  "suure",
  "suured",
  "väike",
  "ilus",
  "Ema ja isa töötavad.",
] as const;

export const MITMUS_SORT = [
  { one: "maja", many: "majad", bin: "same" },
  { one: "auto", many: "autod", bin: "same" },
  { one: "kass", many: "kassid", bin: "same" },
  { one: "linn", many: "linnad", bin: "same" },
  { one: "uks", many: "uksed", bin: "same" },
  { one: "pood", many: "poed", bin: "changed" },
  { one: "tuba", many: "toad", bin: "changed" },
  { one: "jõgi", many: "jõed", bin: "changed" },
  { one: "mees", many: "mehed", bin: "changed" },
  { one: "sõber", many: "sõbrad", bin: "changed" },
] as const;

export const MITMUS_SAY = [
  { id: "lapsed", said: "Lapsed loevad.", also: [] },
  { id: "kassid", said: "Kassid on kodus.", also: [] },
  { id: "toad", said: "Toad on suured.", also: [] },
  {
    id: "tootavad",
    said: "Ema ja isa töötavad Tallinnas.",
    also: ["Isa ja ema töötavad Tallinnas."],
  },
  { id: "sobrad", said: "Sõbrad ootavad.", also: [] },
  {
    id: "uued",
    said: "Uued raamatud on laual.",
    also: ["Laual on uued raamatud.", "Uued raamatud on laua peal."],
  },
] as const;

export const MITMUS_FIX = [
  { id: "loevad", wrong: "Lapsed loeb.", right: "Lapsed loevad." },
  { id: "poed", wrong: "Poodid on suured.", right: "Poed on suured." },
  { id: "tootavad", wrong: "Ema ja isa töötab.", right: "Ema ja isa töötavad." },
  { id: "joovad", wrong: "Naised joob kohvi.", right: "Naised joovad kohvi." },
  { id: "suured", wrong: "Majad on suur.", right: "Majad on suured." },
  { id: "sobrad", wrong: "Sõberid ootavad.", right: "Sõbrad ootavad." },
] as const;

export const MITMUS_TALK = {
  turns: [
    { voice: "fourth", text: "Mari, kus su lapsed on?" },
    { voice: "third", text: ["Lapsed on koolis.", "Nad õpivad."] },
    { voice: "fourth", text: "Ja su kassid?" },
    { voice: "third", text: "Kassid magavad kodus.", say: "[laughs] Kassid magavad kodus." },
    { voice: "fourth", text: "Kus su sõbrad elavad?" },
    { voice: "third", text: ["Sõbrad elavad Tallinnas.", "Nad töötavad haiglas."] },
    { voice: "fourth", text: "Kas Tallinna poed on suured?" },
    { voice: "third", text: "Jah, poed on suured ja ilusad." },
    { voice: "fourth", text: "Ja Tartu poed?" },
    { voice: "third", text: "Tartu poed on väikesed." },
    { voice: "fourth", text: ["Aitäh!", "Head aega!"] },
  ],
} as const satisfies Conversation;

const MITMUS_CLIPS: Record<string, Clip> = {
  ...words([
    ...[...MITMUS_SAME, ...MITMUS_CHANGED].flatMap((noun) => [
      noun.one,
      noun.second,
      noun.many,
      dictionaryPair(noun),
    ]),
    ...MITMUS_SENTENCES.flatMap((row) => [pluralSentence(row, false), pluralSentence(row, true)]),
    ...MITMUS_ADJECTIVES.flatMap(({ one, many }) => [one, many]),
    ...MITMUS_WORDS,
  ]),
  ...words(MITMUS_SAY.map(({ said }) => said)),
  ...words(MITMUS_FIX.map(({ right }) => right)),
  "p-home": { sentences: MITMUS_PASSAGE },
  "c-friends": MITMUS_TALK,
};

/**
 * The genitive lesson's pronouns: who, and whose. Checked in ÕS 2025 on Sõnaveeb: minu or mu,
 * sinu or su, tema or ta, meie or me, teie or te, and nende.
 */
export const OMASTAV_PRONOUNS = [
  { who: "mina", whose: "minu", short: "mu" },
  { who: "sina", whose: "sinu", short: "su" },
  { who: "tema", whose: "tema" },
  { who: "meie", whose: "meie" },
  { who: "teie", whose: "teie" },
  { who: "nemad", whose: "nende" },
] as const;

/** A pronoun's whose form before raamat, as the switch says it: “minu raamat”. */
export const ownedBook = (whose: string) => `${whose} raamat`;

/** How a noun's genitive differs from the word a dictionary gives first. */
export type GenitiveKind = "vowel" | "inside" | "same";

/**
 * Nouns in three forms: the word, its genitive, and the genitive with -s or -l. Checked in ÕS 2025
 * on Sõnaveeb: kooli, Tallinna, kohviku, raamatu, poe, toa, turu, laua, Tartu, haigla, kodu, töö.
 */
export const OMASTAV_FORMS: readonly {
  kind: GenitiveKind;
  word: string;
  whose: string;
  where: string;
}[] = [
  { kind: "vowel", word: "kool", whose: "kooli", where: "koolis" },
  { kind: "vowel", word: "Tallinn", whose: "Tallinna", where: "Tallinnas" },
  { kind: "vowel", word: "kohvik", whose: "kohviku", where: "kohvikus" },
  { kind: "vowel", word: "raamat", whose: "raamatu", where: "raamatus" },
  { kind: "inside", word: "pood", whose: "poe", where: "poes" },
  { kind: "inside", word: "tuba", whose: "toa", where: "toas" },
  { kind: "inside", word: "turg", whose: "turu", where: "turul" },
  { kind: "inside", word: "laud", whose: "laua", where: "laual" },
  { kind: "same", word: "Tartu", whose: "Tartu", where: "Tartus" },
  { kind: "same", word: "haigla", whose: "haigla", where: "haiglas" },
  { kind: "same", word: "kodu", whose: "kodu", where: "kodus" },
  { kind: "same", word: "töö", whose: "töö", where: "tööl" },
];

/**
 * “Which form goes first?”: a noun as a dictionary gives it, its genitive, the genitive with -s or
 * -l as the cue, and a phrase with the genitive in front. Only nouns whose genitive differs from the
 * word: the table shows the ones that don't change. ÕS 2025 on Sõnaveeb: kontori, jõe.
 */
export const OMASTAV_PHRASES: readonly {
  kind: GenitiveKind;
  word: string;
  whose: string;
  where: string;
  noun: string;
}[] = [
  { kind: "vowel", word: "kool", whose: "kooli", where: "koolis", noun: "uks" },
  { kind: "vowel", word: "kohvik", whose: "kohviku", where: "kohvikus", noun: "nimi" },
  { kind: "vowel", word: "kontor", whose: "kontori", where: "kontoris", noun: "aken" },
  { kind: "vowel", word: "Tallinn", whose: "Tallinna", where: "Tallinnas", noun: "turg" },
  { kind: "inside", word: "pood", whose: "poe", where: "poes", noun: "uks" },
  { kind: "inside", word: "tuba", whose: "toa", where: "toas", noun: "aken" },
  { kind: "inside", word: "turg", whose: "turu", where: "turul", noun: "kohvik" },
  { kind: "inside", word: "jõgi", whose: "jõe", where: "jões", noun: "nimi" },
];

/** A phrase of “Which form?”, as it is said: “kooli uks”. */
export const phraseOf = (each: { whose: string; noun: string }) => `${each.whose} ${each.noun}`;

/** “Whose?”: sentences with a pronoun's whose form, by the pronoun they use. */
export const OMASTAV_WHOSE: readonly {
  who: (typeof OMASTAV_PRONOUNS)[number]["who"];
  said: string;
}[] = [
  { who: "mina", said: "See on minu raamat." },
  { who: "mina", said: "Mu nimi on Kati." },
  { who: "sina", said: "See on sinu kohv." },
  { who: "sina", said: "Kas see on su kass?" },
  { who: "tema", said: "Tema raamat on laual." },
  { who: "tema", said: "Tema vend töötab haiglas." },
  { who: "meie", said: "Meie kool on Tartus." },
  { who: "meie", said: "Meie ema on õpetaja." },
  { who: "teie", said: "Kas see on teie kohvik?" },
  { who: "teie", said: "Teie kass on kodus." },
  { who: "nemad", said: "Nende kontor on Tallinnas." },
  { who: "nemad", said: "See on nende pilt." },
];

/** Whose, asked and answered, and an owner before a noun. Jaan's genitive is Jaani. */
export const OMASTAV_SENTENCES = [
  "Minu nimi on Mari.",
  "Mina elan Tartus.",
  "Mis su nimi on?",
  "Kelle raamat see on?",
  "See on minu raamat.",
  "See on Mari raamat.",
  "Kelle kass see on?",
  "See on Jaani kass.",
  "Eesti pealinn on Tallinn.",
] as const;

/** Kati writes about herself and her family: a passage with a gap at each who or whose. */
export const OMASTAV_PASSAGE = [
  "Tere! Minu nimi on Kati.",
  "Mina elan Tartus.",
  "Jaan on minu vend.",
  "Jaani kohvik on Tallinnas.",
  "Ema ja isa elavad Pärnus.",
  "Nende kassi nimi on Miisu.",
  "Mis sinu nimi on?",
  "Kus sina elad?",
] as const;

/** At home with Mari: her lines in the second voice, the learner's in the main one. */
export const OMASTAV_DIALOGUE = {
  "d-mari-1": { text: "Kelle raamat see on?", voice: "second" },
  "d-sina-1": "See on minu raamat.",
  "d-mari-2": { text: "Ja kelle kohv see on?", voice: "second" },
  "d-sina-2": "See on Martini kohv.",
  "d-mari-3": { text: "Kas see on teie kass?", voice: "second" },
  "d-sina-3": "Jah, see on meie kass.",
  "d-mari-4": { text: "Mis kassi nimi on?", voice: "second" },
  "d-sina-4": "Kassi nimi on Liisu.",
} as const satisfies Record<string, Clip>;

/** Words of the genitive lesson heard on their own, outside its lists. */
export const OMASTAV_WORDS = [
  "kelle",
  "pealinn",
  "uks",
  "aken",
  "nimi",
  "kass",
  "kassi",
  "Jaan",
  "Jaani",
  "Mari",
  "Mari raamat",
  "Eesti",
  "Eestis",
  "kümne minuti pärast",
] as const;

export const OMASTAV_SORT = [
  { w: "raamatu", bin: "whose" },
  { w: "Tallinna", bin: "whose" },
  { w: "turu", bin: "whose" },
  { w: "kohviku", bin: "whose" },
  { w: "jõe", bin: "whose" },
  { w: "poes", bin: "where" },
  { w: "toas", bin: "where" },
  { w: "laual", bin: "where" },
  { w: "Tartus", bin: "where" },
  { w: "haiglas", bin: "where" },
] as const;

export const OMASTAV_SAY = [
  { id: "jaani", said: "See on Jaani raamat.", also: [] },
  { id: "kelle", said: "Kelle kohv see on?", also: ["Kelle kohv on see?"] },
  { id: "vend", said: "Minu vend elab Tallinnas.", also: ["Mu vend elab Tallinnas."] },
  { id: "nende", said: "Nende kass on kodus.", also: [] },
  { id: "mari", said: "Mari kohvik on Tartus.", also: [] },
  { id: "opetaja", said: "Meie õpetaja nimi on Kati.", also: ["Me õpetaja nimi on Kati."] },
] as const;

export const OMASTAV_SAID_ALSO: Record<(typeof OMASTAV_WHOSE)[number]["said"], readonly string[]> =
  {
    "See on minu raamat.": ["See on mu raamat."],
    "Mu nimi on Kati.": ["Minu nimi on Kati."],
    "See on sinu kohv.": ["See on su kohv."],
    "Kas see on su kass?": ["Kas see on sinu kass?"],
    "Tema raamat on laual.": ["Ta raamat on laual."],
    "Tema vend töötab haiglas.": ["Ta vend töötab haiglas."],
    "Meie kool on Tartus.": ["Me kool on Tartus."],
    "Meie ema on õpetaja.": ["Me ema on õpetaja."],
    "Kas see on teie kohvik?": ["Kas see on te kohvik?"],
    "Teie kass on kodus.": ["Te kass on kodus."],
    "Nende kontor on Tallinnas.": [],
    "See on nende pilt.": [],
  };

export const OMASTAV_FIX = [
  {
    id: "minu",
    rule: "who",
    wrong: "Mina nimi on Kati.",
    right: "Minu nimi on Kati.",
    also: ["Mu nimi on Kati."],
  },
  {
    id: "mina",
    rule: "who",
    wrong: "Minu elan Tartus.",
    right: "Mina elan Tartus.",
    also: ["Ma elan Tartus."],
  },
  {
    id: "nende",
    rule: "who",
    wrong: "Nemad kass on Pärnus.",
    right: "Nende kass on Pärnus.",
    also: [],
  },
  {
    id: "jaani",
    rule: "owner",
    wrong: "Jaan kass on kodus.",
    right: "Jaani kass on kodus.",
    also: [],
  },
  { id: "poe", rule: "owner", wrong: "See on pood uks.", right: "See on poe uks.", also: [] },
  {
    id: "tallinnas",
    rule: "place",
    wrong: "Ma elan Tallinna.",
    right: "Ma elan Tallinnas.",
    also: [],
  },
] as const;

export const OMASTAV_TALK = {
  turns: [
    { voice: "third", text: "Jaan, kelle pilt see on?" },
    { voice: "fourth", text: "See on minu pilt." },
    { voice: "third", text: "Kes see on?", say: "[curious] Kes see on?" },
    { voice: "fourth", text: ["See on minu vend Martin.", "Ta elab Tartus."] },
    { voice: "third", text: "Ja kelle kass see on?" },
    { voice: "fourth", text: ["See on Martini kass.", "Kassi nimi on Miisu."] },
    { voice: "third", text: "Kas see on teie maja?" },
    { voice: "fourth", text: ["Ei, see on minu ema maja.", "Ta elab Pärnus."] },
    { voice: "third", text: "Ja kelle auto see on?" },
    { voice: "fourth", text: "See on minu auto!", say: "[laughs] See on minu auto!" },
  ],
} as const satisfies Conversation;

const OMASTAV_CLIPS: Record<string, Clip> = {
  ...words([
    ...OMASTAV_PRONOUNS.flatMap((each) => [
      each.who,
      each.whose,
      ownedBook(each.whose),
      ...("short" in each ? [each.short] : []),
    ]),
    ...OMASTAV_FORMS.flatMap(({ word, whose, where }) => [word, whose, where]),
    ...OMASTAV_PHRASES.flatMap((each) => [each.word, each.whose, each.where, phraseOf(each)]),
    ...OMASTAV_WHOSE.map(({ said }) => said),
    ...OMASTAV_SENTENCES,
    ...OMASTAV_WORDS,
  ]),
  ...words(OMASTAV_SAY.map(({ said }) => said)),
  ...words(OMASTAV_FIX.map(({ right }) => right)),
  "p-kati": { sentences: OMASTAV_PASSAGE, voice: "second" },
  ...OMASTAV_DIALOGUE,
  "c-photo": OMASTAV_TALK,
};

/**
 * The lesson on in, into and out of: each place in the forms that answer kus?, kuhu? and kust?.
 * `kuhu` is the form the lesson teaches for where to: the short form for kool, pood, linn, maja
 * and kodu, with `long` naming the -sse form beside it, and -sse for the rest. Tallinn has a short
 * form too, Tallinna; the lesson teaches Tallinnasse. Checked in ÕS 2025 on Sõnaveeb (EKI
 * morphology, 21 Nov 2026): kooli ~ koolisse, poodi ~ poesse, linna ~ linnasse, majja ~ majasse, koju ~ kodusse; Tartu, Pärnu, haigla,
 * kontor and kohvik have -sse only. `third` is the dictionary's third form where the short form
 * matches it.
 */
export const INNER_PLACES = [
  { place: "Tallinn", kus: "Tallinnas", kuhu: "Tallinnasse", kust: "Tallinnast" },
  { place: "Tartu", kus: "Tartus", kuhu: "Tartusse", kust: "Tartust" },
  { place: "Pärnu", kus: "Pärnus", kuhu: "Pärnusse", kust: "Pärnust" },
  { place: "haigla", kus: "haiglas", kuhu: "haiglasse", kust: "haiglast" },
  { place: "kontor", kus: "kontoris", kuhu: "kontorisse", kust: "kontorist" },
  { place: "kohvik", kus: "kohvikus", kuhu: "kohvikusse", kust: "kohvikust" },
  {
    place: "kool",
    kus: "koolis",
    kuhu: "kooli",
    long: "koolisse",
    kust: "koolist",
    third: "kool, kooli, kooli",
  },
  {
    place: "pood",
    kus: "poes",
    kuhu: "poodi",
    long: "poesse",
    kust: "poest",
    third: "pood, poe, poodi",
  },
  {
    place: "linn",
    kus: "linnas",
    kuhu: "linna",
    long: "linnasse",
    kust: "linnast",
    third: "linn, linna, linna",
  },
  { place: "maja", kus: "majas", kuhu: "majja", long: "majasse", kust: "majast" },
  { place: "kodu", kus: "kodus", kuhu: "koju", kust: "kodust" },
] as const;

export const INNER_TYPED: readonly {
  place: (typeof INNER_PLACES)[number]["place"];
  way: "kus" | "kuhu" | "kust";
  also: readonly string[];
}[] = [
  { place: "Tallinn", way: "kuhu", also: ["Tallinna"] },
  { place: "haigla", way: "kust", also: [] },
  { place: "kontor", way: "kus", also: [] },
  { place: "kohvik", way: "kuhu", also: [] },
  { place: "Pärnu", way: "kust", also: [] },
  { place: "maja", way: "kuhu", also: [] },
  { place: "kodu", way: "kuhu", also: ["kodusse"] },
  { place: "pood", way: "kust", also: [] },
];

export const INNER_SAY = [
  { id: "tartusse", said: "Ma lähen Tartusse.", also: ["Lähen Tartusse.", "Mina lähen Tartusse."] },
  {
    id: "parit",
    said: "Kust sa pärit oled?",
    also: [
      "Kust sa oled pärit?",
      "Kust te pärit olete?",
      "Kust te olete pärit?",
      "Kust teie olete pärit?",
      "Kust teie pärit olete?",
      "Kust sina pärit oled?",
      "Kust sina oled pärit?",
      "Kust oled pärit?",
      "Kust olete pärit?",
      "Kust sa oled?",
      "Kust te olete?",
      "Kust teie olete?",
      "Kust sina oled?",
      "Kust oled?",
      "Kust olete?",
    ],
  },
  { id: "poest", said: "Ma tulen poest.", also: ["Tulen poest.", "Mina tulen poest."] },
  { id: "majja", said: "Kass läheb majja.", also: ["Kass läheb majasse."] },
  {
    id: "linna",
    said: "Me läheme linna.",
    also: [
      "Me läheme linnasse.",
      "Meie läheme linna.",
      "Läheme linna.",
      "Läheme linnasse.",
      "Meie läheme linnasse.",
    ],
  },
  {
    id: "eestist",
    said: "Ma olen pärit Eestist.",
    also: [
      "Ma olen Eestist pärit.",
      "Olen pärit Eestist.",
      "Mina olen pärit Eestist.",
      "Ma olen Eestist.",
      "Olen Eestist pärit.",
      "Mina olen Eestist pärit.",
      "Olen Eestist.",
      "Mina olen Eestist.",
    ],
  },
] as const;

export const INNER_FIX = [
  { id: "tartusse", wrong: "Ma lähen Tartus.", right: "Ma lähen Tartusse.", also: [] },
  { id: "poest", wrong: "Ma tulen poes.", right: "Ma tulen poest.", also: [] },
  { id: "soomest", wrong: "Ma olen pärit Soomes.", right: "Ma olen pärit Soomest.", also: [] },
  { id: "majas", wrong: "Kass on majja.", right: "Kass on majas.", also: [] },
  { id: "koju", wrong: "Me läheme kodus.", right: "Me läheme koju.", also: ["Me läheme kodusse."] },
  { id: "kodus", wrong: "Ma olen kodust.", right: "Ma olen kodus.", also: [] },
] as const;

export const INNER_TALK = {
  turns: [
    { voice: "third", text: ["Tere, Jaan!", "Kust sa tuled?"] },
    { voice: "fourth", text: "Ma tulen haiglast.", say: "[tired] Ma tulen haiglast." },
    { voice: "third", text: "Kuhu sa lähed?" },
    { voice: "fourth", text: ["Ma lähen koju.", "Aga sina?"] },
    { voice: "third", text: "Ma lähen poodi ja kohvikusse." },
    { voice: "fourth", text: "Kas sa oled homme Tallinnas?" },
    { voice: "third", text: ["Ei, homme lähen Tartusse.", "Mu ema elab Tartus."] },
    { voice: "fourth", text: "Kas sa oled pärit Tartust?" },
    { voice: "third", text: ["Ei, ma olen pärit Pärnust.", "Head aega!"] },
  ],
} as const satisfies Conversation;

/** The sentences of the lesson on in, into and out of. */
export const INNER_SENTENCES = {
  "s-majas": "Kass on majas.",
  "s-majja": "Kass läheb majja.",
  "s-majast": "Kass tuleb majast.",
  "q-tuled": "Kust sa tuled?",
  "a-tulen-koolist": "Ma tulen koolist.",
  "a-tulen-poest": "Ma tulen poest.",
  "q-parit": "Kust sa pärit oled?",
  "p-eestist": "Ma olen pärit Eestist.",
  "p-soomest": "Ma olen pärit Soomest.",
  "p-ukrainast": "Ma olen pärit Ukrainast.",
  "p-tallinnast": "Ma olen pärit Tallinnast.",
  "q-lahed": "Kuhu sa lähed?",
  "a-lahen-tartusse": "Ma lähen Tartusse.",
  "a-lahen-haiglasse": "Ma lähen haiglasse.",
  "k-kooli": "Ma lähen kooli.",
  "k-poodi": "Ma lähen poodi.",
  "k-linna": "Me läheme linna.",
  "k-koju": "Tule koju!",
  "k-kodus": "Ma olen kodus.",
  "k-kodust": "Ma tulen kodust.",
} as const;

/** Meeting Mari in the street: her lines in the second voice, the learner's in the main one. */
export const INNER_DIALOGUE = {
  "d-mari-1": { text: "Tere! Kuhu sa lähed?", voice: "second" },
  "d-sina-1": "Tere! Ma lähen poodi.",
  "d-mari-2": { text: "Kust sa tuled?", voice: "second" },
  "d-sina-2": "Ma tulen koolist.",
  "d-mari-3": { text: "Kas sa oled homme kodus?", voice: "second" },
  "d-sina-3": "Ei, ma lähen homme Tartusse.",
  "d-mari-4": { text: "Kas sa oled pärit Tartust?", voice: "second" },
  "d-sina-4": "Ei, ma olen pärit Pärnust.",
  "d-mari-5": { text: "Head aega!", voice: "second" },
} as const satisfies Record<string, Clip>;

/** Words the lesson plays on their own: the three questions and every place form. */
export const INNER_WORDS = [
  "kus",
  "kuhu",
  "kust",
  "kass",
  "tööl",
  "pärit",
  "Eestist",
  "Soomest",
  "Ukrainast",
  ...INNER_PLACES.flatMap((each) => [
    each.place,
    each.kus,
    each.kuhu,
    each.kust,
    ...("long" in each ? [each.long] : []),
  ]),
];

/**
 * Nouns of the partitive lesson, each with its third form, the partitive. Checked in ÕS 2025 on
 * Sõnaveeb (EKI morphology, 21 Nov 2026). Later lessons on objects and the plural partitive can
 * import it.
 */
export const PARTITIVE_NOUNS = {
  kass: "kassi",
  raamat: "raamatut",
  laps: "last",
  auto: "autot",
  maja: "maja",
  euro: "eurot",
  kool: "kooli",
  laud: "lauda",
  kohv: "kohvi",
  vesi: "vett",
  juust: "juustu",
  leib: "leiba",
  piim: "piima",
  raha: "raha",
  aeg: "aega",
  kohvik: "kohvikut",
} as const;

export type PartitiveNoun = keyof typeof PARTITIVE_NOUNS;

/** “üks kass”, or from two up “kaks kassi”: a number with a noun in the form it takes. */
export const counted = (number: string, noun: PartitiveNoun) =>
  `${number} ${number === "üks" ? noun : PARTITIVE_NOUNS[noun]}`;

/** The counting switch: three numbers over six nouns, maja among them, whose forms look alike. */
export const OSASTAV_COUNT = {
  numbers: ["üks", "kaks", "viis"],
  nouns: ["kass", "raamat", "laps", "auto", "maja", "euro"],
} as const satisfies { numbers: readonly string[]; nouns: readonly PartitiveNoun[] };

/** “One or more?”: each noun once with üks and once with a number from two up. */
export const OSASTAV_COUNTED = [
  { noun: "kass", number: "kolm" },
  { noun: "auto", number: "kaks" },
  { noun: "euro", number: "kümme" },
  { noun: "laps", number: "kolm" },
  { noun: "kool", number: "neli" },
  { noun: "laud", number: "viis" },
] as const satisfies readonly { noun: PartitiveNoun; number: string }[];

/** Asking how many and how much, each with an answer. */
export const OSASTAV_EXCHANGES = [
  { q: "Mitu last sul on?", a: "Mul on kaks last." },
  { q: "Mitu kassi teil on?", a: "Meil on üks kass." },
  { q: "Kui palju see maksab?", a: "Viis eurot." },
] as const;

/** An amount and what it measures, in its third form. */
export const OSASTAV_AMOUNTS = [
  { phrase: "tass kohvi", noun: "kohv" },
  { phrase: "klaas vett", noun: "vesi" },
  { phrase: "kilo juustu", noun: "juust" },
  { phrase: "natuke piima", noun: "piim" },
  { phrase: "palju raha", noun: "raha" },
  { phrase: "vähe aega", noun: "aeg" },
] as const satisfies readonly { phrase: string; noun: PartitiveNoun }[];

/** Yes and no: the thing someone has, and the same thing when it isn't there. */
export const OSASTAV_NO = [
  { yes: "Mul on kass.", no: "Mul pole kassi.", noun: "kass" },
  { yes: "Sul on auto.", no: "Sul pole autot.", noun: "auto" },
  { yes: "Tal on laps.", no: "Tal pole last.", noun: "laps" },
  { yes: "Neil on maja.", no: "Neil pole maja.", noun: "maja" },
  { yes: "Laual on leib.", no: "Laual pole leiba.", noun: "leib" },
  { yes: "Toas on laud.", no: "Toas pole lauda.", noun: "laud" },
  // The thing first: it keeps its first form after pole too.
  { yes: "Kass on laual.", no: "Kass pole laual.", noun: "kass", first: true },
] as const satisfies readonly { yes: string; no: string; noun: PartitiveNoun; first?: true }[];

/**
 * “Which form after pole?”: a sentence with a gap for the noun. Where the noun comes first, it keeps
 * its first form; each noun comes both ways, so its two forms are both answers.
 */
export const OSASTAV_POLE_QUIZ = [
  { cue: "Mul pole …", noun: "kass", said: "Mul pole kassi." },
  { cue: "… pole laual", noun: "kass", said: "Kass pole laual.", first: true },
  { cue: "Sul pole …", noun: "auto", said: "Sul pole autot." },
  { cue: "… pole Tallinnas", noun: "auto", said: "Auto pole Tallinnas.", first: true },
  { cue: "Laual pole …", noun: "leib", said: "Laual pole leiba." },
  { cue: "… pole laual", noun: "leib", said: "Leib pole laual.", first: true },
  { cue: "Toas pole …", noun: "laud", said: "Toas pole lauda." },
  { cue: "… pole toas", noun: "laud", said: "Laud pole toas.", first: true },
] as const satisfies readonly { cue: string; noun: PartitiveNoun; said: string; first?: true }[];

/** “Type the form”: food and drink someone has, and two that are only talked about. */
export const OSASTAV_FOOD_QUIZ = [
  { cue: "Ma joon …", noun: "kohv", said: "Ma joon kohvi." },
  { cue: "Ta joob …", noun: "vesi", said: "Ta joob vett." },
  { cue: "Me sööme …", noun: "leib", said: "Me sööme leiba." },
  { cue: "Nad söövad …", noun: "juust", said: "Nad söövad juustu." },
  { cue: "Ma tahan …", noun: "piim", said: "Ma tahan piima." },
  { cue: "… maksab kaks eurot", noun: "piim", said: "Piim maksab kaks eurot.", first: true },
  { cue: "… on laual", noun: "leib", said: "Leib on laual.", first: true },
] as const satisfies readonly { cue: string; noun: PartitiveNoun; said: string; first?: true }[];

/** Food and drink taken without counting. */
export const OSASTAV_SOME = [
  "Ma joon kohvi.",
  "Ta joob vett.",
  "Me sööme leiba.",
  "Nad söövad juustu.",
  "Ma tahan piima.",
  "Kohvi, palun.",
] as const;

/**
 * Mari at the market, a passage with gaps, and Jaan's voice message from the market. Words from
 * lessons 1–16 and this lesson's nouns.
 */
export const OSASTAV_PASSAGES = {
  market: [
    "Täna on laupäev ja Mari on turul.",
    "Tal on vaja kilo juustu ja üks leib.",
    "Juust maksab seitse eurot.",
    "Aga turul pole täna leiba.",
    "Turul on kohvik.",
    "Mari joob kohvikus kohvi.",
    "Kohvikus on üks kass.",
  ],
  jaan: [
    "Tere, see on Jaan! Ma olen turul.",
    "Täna on palju juustu.",
    "Kilo juustu maksab kaheksa eurot.",
    "Leib maksab kaks eurot.",
    "Aga täna pole piima.",
    "Kas sa tahad kohvi?",
  ],
} as const;

/** Words and lines the partitive lesson says outside its lists. */
export const OSASTAV_WORDS = [
  "kass",
  "kassi",
  "raamat",
  "raamatut",
  "laps",
  "last",
  "maja",
  "kohv",
  "kohvi",
  "vesi",
  "vett",
  "juust",
  "juustu",
  "leib",
  "leiba",
  "piim",
  "piima",
  "aeg",
  "aega",
  "mitu",
  "tass",
  "klaas",
  "kilo",
  "palju",
  "natuke",
  "vähe",
  "pole",
  "tahan",
  "Mul ei ole kassi.",
  "Üks kohv, palun.",
  "Ma loen raamatut.",
] as const;

export const OSASTAV_SAY = [
  { id: "kassi", said: "Mul on kaks kassi.", also: ["Minul on kaks kassi.", "Mul on 2 kassi."] },
  {
    id: "tass",
    said: "Tass kohvi, palun.",
    also: ["Üks tass kohvi, palun.", "Palun tass kohvi.", "Palun üks tass kohvi."],
  },
  { id: "leiba", said: "Laual pole leiba.", also: ["Laual ei ole leiba."] },
  {
    id: "last",
    said: "Mitu last sul on?",
    also: [
      "Mitu last sinul on?",
      "Mitu last teil on?",
      "Kui mitu last sul on?",
      "Mitu last on sul?",
      "Mitu last on teil?",
    ],
  },
  { id: "vett", said: "Ta joob vett.", also: ["Tema joob vett."] },
  { id: "eurot", said: "Leib maksab kolm eurot.", also: ["Leib maksab 3 eurot."] },
] as const;

export const OSASTAV_FIX = [
  { id: "kassi", wrong: "Mul on kaks kass.", right: "Mul on kaks kassi." },
  { id: "kohvi", wrong: "Ma joon kohv.", right: "Ma joon kohvi." },
  { id: "leiba", wrong: "Laual pole leib.", right: "Laual pole leiba." },
  { id: "tass", wrong: "Tass kohv, palun.", right: "Tass kohvi, palun." },
  { id: "kass", wrong: "Meil on üks kassi.", right: "Meil on üks kass." },
  { id: "last", wrong: "Mitu laps sul on?", right: "Mitu last sul on?" },
] as const;

export const OSASTAV_TALK = {
  turns: [
    { voice: "third", text: "Jaan, kas meil on piima?" },
    { voice: "fourth", text: ["Ei, meil pole piima.", "Aga meil on vett."] },
    { voice: "third", text: "Kas meil on leiba?" },
    { voice: "fourth", text: ["Meil pole leiba.", "Meil on natuke juustu."] },
    { voice: "third", text: ["Hästi.", "Ma lähen poodi."] },
    { voice: "fourth", text: "Mul on vaja kohvi.", say: "[hopeful] Mul on vaja kohvi." },
    { voice: "third", text: "Kui palju?" },
    { voice: "fourth", text: "Kilo kohvi." },
    { voice: "third", text: "Ja leiba?" },
    { voice: "fourth", text: "Jah, üks leib." },
    { voice: "third", text: "Kas sul on raha?" },
    { voice: "fourth", text: "Mul on kümme eurot." },
    { voice: "third", text: ["Aitäh!", "Head aega!"] },
  ],
} as const satisfies Conversation;

const OSASTAV_CLIPS: Record<string, Clip> = {
  ...words([
    ...OSASTAV_COUNT.numbers.flatMap((number) =>
      OSASTAV_COUNT.nouns.map((noun) => counted(number, noun)),
    ),
    ...OSASTAV_COUNTED.flatMap(({ noun, number }) => [counted("üks", noun), counted(number, noun)]),
    ...OSASTAV_EXCHANGES.flatMap(({ q, a }) => [q, a]),
    ...OSASTAV_AMOUNTS.map(({ phrase }) => phrase),
    ...OSASTAV_NO.flatMap(({ yes, no }) => [yes, no]),
    ...OSASTAV_SOME,
    ...OSASTAV_POLE_QUIZ.map(({ said }) => said),
    ...OSASTAV_FOOD_QUIZ.map(({ said }) => said),
    ...OSASTAV_WORDS,
  ]),
  ...words(OSASTAV_SAY.map(({ said }) => said)),
  ...words(OSASTAV_FIX.map(({ right }) => right)),
  "p-market": { sentences: OSASTAV_PASSAGES.market },
  "p-jaan": { sentences: OSASTAV_PASSAGES.jaan },
  "c-shopping": OSASTAV_TALK,
};

export const OBJECT_PAIRS = [
  { id: "leib", part: "Ma ostsin leiba.", whole: "Ma ostsin leiva." },
  { id: "raamat", part: "Ma lugesin raamatut.", whole: "Ma lugesin raamatu läbi." },
  { id: "kook", part: "Ma sõin kooki.", whole: "Ma sõin koogi ära." },
  { id: "too", part: "Ma tegin tööd.", whole: "Ma tegin töö ära." },
  { id: "vesi", part: "Ma jõin vett.", whole: "Ma jõin vee ära." },
] as const;

export const OBJECT_NOW = [
  { id: "raamat", part: "Ma loen raamatut.", whole: "Ma loen raamatu läbi." },
  { id: "supp", part: "Ma söön suppi.", whole: "Ma söön supi ära." },
  { id: "too", part: "Ma teen tööd.", whole: "Ma teen töö ära." },
] as const;

export const OBJECT_HEARD = [
  {
    noun: "ostma",
    part: "Liis ostis leiba.",
    whole: "Liis ostis leiva.",
    now: "Liis ostab leiba.",
    will: "Liis ostab leiva.",
  },
  {
    noun: "kirjutama",
    part: "Mari kirjutas raamatut.",
    whole: "Mari kirjutas raamatu.",
    now: "Mari kirjutab raamatut.",
    will: "Mari kirjutab raamatu.",
  },
  {
    noun: "parandama",
    part: "Jaan parandas autot.",
    whole: "Jaan parandas auto.",
    now: "Jaan parandab autot.",
    will: "Jaan parandab auto.",
  },
  {
    noun: "ehitama",
    part: "Isa ehitas suvilat.",
    whole: "Isa ehitas suvila.",
    now: "Isa ehitab suvilat.",
    will: "Isa ehitab suvila.",
  },
  {
    noun: "tegema",
    part: "Kati tegi salatit.",
    whole: "Kati tegi salati.",
    now: "Kati teeb salatit.",
    will: "Kati teeb salati.",
  },
] as const;

export const OBJECT_NO = [
  "Ma ei osta piletit.",
  "Ma ei ostnud piletit.",
  "Ma ei ostnud leiba.",
  "Ta ei lugenud raamatut.",
] as const;

export const OBJECT_VERBS = [
  "Ma ootan sõpra.",
  "Ma aitan last.",
  "Jaan armastab Marit.",
  "Ma otsin võtit.",
] as const;

export const OBJECT_FOUND = { looked: "Ma otsisin võtit.", found: "Ma leidsin võtme." } as const;

export const OBJECT_FORM_QUIZ = [
  { noun: "pilet", cue: "Ma ei ostnud …", said: "Ma ei ostnud piletit.", answer: "piletit" },
  { noun: "pilet", cue: "Ma ostsin ühe …", said: "Ma ostsin ühe pileti.", answer: "pileti" },
  { noun: "sõber", cue: "Ma ootan …", said: "Ma ootan sõpra.", answer: "sõpra" },
  { noun: "võti", cue: "Ma otsin …", said: "Ma otsin võtit.", answer: "võtit" },
  { noun: "võti", cue: "Ma leidsin …", said: "Ma leidsin võtme.", answer: "võtme" },
  { noun: "laps", cue: "Ma aitan …", said: "Ma aitan last.", answer: "last" },
  { noun: "kook", cue: "Me ei söönud …", said: "Me ei söönud kooki.", answer: "kooki" },
  { noun: "kook", cue: "Me sõime … ära", said: "Me sõime koogi ära.", answer: "koogi" },
  { noun: "töö", cue: "Ma ei teinud …", said: "Ma ei teinud tööd.", answer: "tööd" },
  { noun: "töö", cue: "Ta tegi … ära", said: "Ta tegi töö ära.", answer: "töö" },
] as const;

export const OBJECT_COMMANDS = [
  { id: "pilet", done: "Ma ostsin pileti.", go: "Osta pilet!", not: "Ära osta piletit!" },
  {
    id: "raamat",
    done: "Ma lugesin raamatu läbi.",
    go: "Loe raamat läbi!",
    not: "Ära loe raamatut!",
  },
  { id: "supp", done: "Ma sõin supi ära.", go: "Söö supp ära!", not: "Ära söö suppi!" },
  { id: "vesi", done: "Ma jõin vee ära.", go: "Joo vesi ära!", not: "Ära joo vett!" },
] as const;

export const OBJECT_MANY = ["Ma ostsin piletid.", "Osta piletid!"] as const;

export const OBJECT_REWRITE = [
  { from: "Ma ostsin pileti.", to: "Osta pilet!", not: false },
  { from: "Ma lugesin raamatu läbi.", to: "Loe raamat läbi!", not: false },
  { from: "Ma sõin koogi ära.", to: "Söö kook ära!", not: false },
  { from: "Ma tegin töö ära.", to: "Tee töö ära!", not: false },
  { from: "Ma jõin vee ära.", to: "Ära joo vett!", not: true },
  { from: "Ma ostsin leiva.", to: "Ära osta leiba!", not: true },
  { from: "Ma sõin supi ära.", to: "Ära söö suppi!", not: true },
] as const;

export const OBJECT_VOICE = [
  "Tere, see on Liisa!",
  "Ma käisin poes ja ostsin leiba ja juustu.",
  "Ma ostsin ka ühe suure koogi.",
  "Piima ma ei ostnud.",
  "Aga ma ei leia oma võtit.",
  "Kas sa aitad mind?",
] as const;

export const OBJECT_FIXES = [
  { wrong: "Ma ei ostnud pileti.", right: "Ma ei ostnud piletit." },
  { wrong: "Ma ootan sõbra.", right: "Ma ootan sõpra." },
  { wrong: "Ma otsin võtme.", right: "Ma otsin võtit." },
  { wrong: "Ma lugesin raamatut läbi.", right: "Ma lugesin raamatu läbi." },
  { wrong: "Ma ostsin ühe leiba.", right: "Ma ostsin ühe leiva." },
  { wrong: "Ma sõin kooki ära.", right: "Ma sõin koogi ära." },
  { wrong: "Osta pileti!", right: "Osta pilet!" },
] as const;

export const OBJECT_FIX_ANSWERS: Record<string, readonly [string, ...string[]]> =
  Object.fromEntries(OBJECT_FIXES.map(({ right }) => [right, [right]]));

export const OBJECT_DIALOGUE = {
  "d-teenindaja-1": { text: "Tere! Mida te soovite?", voice: "second" },
  "d-sina-1": "Ma võtan ühe koogi, palun.",
  "d-teenindaja-2": { text: "Kas te soovite ka teed?", voice: "second" },
  "d-sina-2": "Ei, aitäh. Ma ei taha teed.",
  "d-teenindaja-3": { text: "Kas te otsite midagi?", voice: "second" },
  "d-sina-3": "Jah, ma otsin oma võtit.",
  "d-teenindaja-4": { text: "Palun, teie kook. Kas te sööte selle kohe ära?", voice: "second" },
  "d-sina-4": "Jah, ma söön koogi kohe ära.",
} as const satisfies Record<string, Clip>;

export const OBJECT_CONVERSATION: Conversation = {
  turns: [
    {
      voice: "second",
      text: ["Tere, Jaan!", "Kas sa lugesid selle raamatu, mille ma sulle andsin, juba läbi?"],
      say: "[cheerful] Tere, Jaan! Kas sa lugesid selle raamatu, mille ma sulle andsin, juba läbi?",
    },
    {
      voice: "main",
      text: ["Tere, Mari!", "Ma lugesin eile õhtul sinu raamatut, kuni jäin diivanil magama."],
      say: "[laughs] Tere, Mari! Ma lugesin eile õhtul sinu raamatut, kuni jäin diivanil magama.",
    },
    { voice: "second", text: "Nii et sa ei lugenud seda veel läbi?" },
    { voice: "main", text: "Ei, aga täna õhtul loen ma selle kindlasti läbi." },
    { voice: "second", text: "Miks sa nii väsinud olid, kas sul oli palju tööd?" },
    {
      voice: "main",
      text: [
        "Jah, ma tegin terve päeva tööd, sest kolleeg oli haige.",
        "Ja õhtul otsisin ma pool tundi oma võtit.",
      ],
      say: "[sighs] Jah, ma tegin terve päeva tööd, sest kolleeg oli haige. Ja õhtul otsisin ma pool tundi oma võtit.",
    },
    { voice: "second", text: "Kas sa leidsid lõpuks oma võtme?" },
    { voice: "main", text: "Jah, see oli köögis laua peal, kuhu ma selle hommikul panin." },
    { voice: "second", text: "Ja kas sa said õhtul ka midagi süüa?" },
    {
      voice: "main",
      text: [
        "Ma sõin supi ära, mille ema mulle eile tõi.",
        "Ja siis jõin ma veel kaks tassi teed.",
      ],
    },
    {
      voice: "second",
      text: "Mina käisin pärast tööd poes ja ostsin leiba, juustu ja koogi.",
    },
    { voice: "main", text: "Kas sa ostsid ka piima, mida me hommikuks vajame?" },
    { voice: "second", text: "Ei, piima ma ei ostnud, sest kodus on veel pool pakki." },
    {
      voice: "main",
      text: "Aga kas sa sõid koogi juba ära?",
      say: "[curious] Aga kas sa sõid koogi juba ära?",
    },
    {
      voice: "second",
      text: [
        "Ei, ma ei söönud kooki, see on täna õhtuks.",
        "Ma ootan kella seitsmeks sõbrannat ja me sööme koogi koos ära.",
      ],
    },
    { voice: "main", text: "Kas see sõbranna on Kati, kellega sa koos töötasid?" },
    { voice: "second", text: "Jah, ma ootan Katit, aga ta tuleb võib-olla natuke hiljem." },
    { voice: "main", text: "Kas ma võin ka tulla, kui ma raamatu enne läbi loen?" },
    {
      voice: "second",
      text: "Muidugi, aga too siis raamat kaasa ja räägi, kuidas lõpp sulle meeldis.",
      say: "[laughs] Muidugi, aga too siis raamat kaasa ja räägi, kuidas lõpp sulle meeldis.",
    },
    { voice: "main", text: "Hästi, ma toon raamatu kaasa ja ostan teel ühe pudeli mahla." },
    {
      voice: "second",
      text: [
        "Ära osta mahla, meil on kodus mahla küllalt.",
        "Osta parem lilli, Kati armastab lilli.",
      ],
    },
    { voice: "main", text: "Hea mõte, ma ostan lilled turult, kus need on odavamad." },
    {
      voice: "second",
      text: "Tore, siis näeme kell seitse, ja ära unusta võtit!",
      say: "[laughs] Tore, siis näeme kell seitse, ja ära unusta võtit!",
    },
    { voice: "main", text: "Ei unusta, ma panen võtme kohe taskusse." },
    { voice: "second", text: "Kui sa raamatu läbi loed, anna see pärast ka Katile." },
    { voice: "main", text: "Hea küll, aga enne pean ma selle ise lõpuni lugema." },
    { voice: "second", text: "Siis loe kiiresti, sest Kati läheb järgmisel nädalal puhkusele." },
    { voice: "main", text: "Hästi, ma loen täna õhtul kohe pärast sööki." },
  ],
};

export const OBJECT_WORDS = [
  "läbi",
  "ära",
  "pilet",
  "kook",
  "koogi",
  "võti",
  "supp",
  "otsima",
  "leidma",
  "aitama",
  "armastama",
  "ootama",
] as const;

export const OBJECT_DRILL = [
  "Ma ei ostnud leiba.",
  "Ma ostsin ühe leiva.",
  "Ära osta leiba!",
  "Loe raamat läbi!",
] as const;

export const OBJECT_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  "Ma lugesin raamatut.": ["Ma lugesin raamatut.", "Mina lugesin raamatut.", "Lugesin raamatut."],
  "Ma lugesin raamatu läbi.": [
    "Ma lugesin raamatu läbi.",
    "Mina lugesin raamatu läbi.",
    "Lugesin raamatu läbi.",
    "Ma lugesin raamatu lõpuni.",
    "Lugesin raamatu lõpuni.",
    "Mina lugesin raamatu lõpuni.",
  ],
  "Ma teen töö ära.": [
    "Ma teen töö ära.",
    "Mina teen töö ära.",
    "Teen töö ära.",
    "Ma teen oma töö ära.",
    "Teen oma töö ära.",
    "Mina teen oma töö ära.",
  ],
  "Ma ostsin leiba.": [
    "Ma ostsin leiba.",
    "Mina ostsin leiba.",
    "Ostsin leiba.",
    "Ma ostsin natuke leiba.",
    "Ostsin natuke leiba.",
    "Mina ostsin natuke leiba.",
  ],
  "Ma ostsin leiva.": [
    "Ma ostsin leiva.",
    "Ma ostsin ühe leiva.",
    "Mina ostsin leiva.",
    "Mina ostsin ühe leiva.",
    "Ostsin leiva.",
    "Ostsin ühe leiva.",
  ],
  "Ma ei ostnud piletit.": [
    "Ma ei ostnud piletit.",
    "Mina ei ostnud piletit.",
    "Ei ostnud piletit.",
  ],
  "Ma ootan sõpra.": [
    "Ma ootan sõpra.",
    "Mina ootan sõpra.",
    "Ootan sõpra.",
    "Ma ootan sõbrannat.",
    "Mina ootan sõbrannat.",
    "Ootan sõbrannat.",
  ],
  "Ma otsin võtit.": [
    "Ma otsin võtit.",
    "Ma otsin oma võtit.",
    "Mina otsin võtit.",
    "Mina otsin oma võtit.",
    "Otsin võtit.",
    "Otsin oma võtit.",
  ],
  "Ma leidsin võtme.": [
    "Ma leidsin võtme.",
    "Ma leidsin oma võtme.",
    "Mina leidsin võtme.",
    "Mina leidsin oma võtme.",
    "Leidsin võtme.",
    "Leidsin oma võtme.",
    "Ma leidsin võtme üles.",
    "Ma leidsin oma võtme üles.",
    "Mina leidsin võtme üles.",
    "Leidsin võtme üles.",
    "Mina leidsin oma võtme üles.",
    "Leidsin oma võtme üles.",
  ],
  "Söö supp ära!": [
    "Söö supp ära!",
    "Sööge supp ära!",
    "Söö kogu supp ära!",
    "Sööge kogu supp ära!",
    "Söö supp kõik ära!",
  ],
  "Ma jõin vett.": [
    "Ma jõin vett.",
    "Mina jõin vett.",
    "Jõin vett.",
    "Ma jõin natuke vett.",
    "Mina jõin natuke vett.",
    "Jõin natuke vett.",
  ],
  "Ma jõin vee ära.": [
    "Ma jõin vee ära.",
    "Mina jõin vee ära.",
    "Jõin vee ära.",
    "Ma jõin kogu vee ära.",
    "Jõin kogu vee ära.",
    "Mina jõin kogu vee ära.",
    "Ma jõin vee kõik ära.",
    "Mina jõin vee kõik ära.",
    "Jõin vee kõik ära.",
  ],
  "Ma söön supi ära.": [
    "Ma söön supi ära.",
    "Söön supi ära.",
    "Mina söön supi ära.",
    "Ma söön kogu supi ära.",
    "Söön kogu supi ära.",
    "Mina söön kogu supi ära.",
  ],
  "Ma ei teinud tööd.": [
    "Ma ei teinud tööd.",
    "Mina ei teinud tööd.",
    "Ma ei teinud tööd ära.",
    "Ei teinud tööd.",
    "Ei teinud tööd ära.",
    "Mina ei teinud tööd ära.",
  ],
  "Osta pilet!": ["Osta pilet!", "Ostke pilet!"],
  "Ära joo vett!": [
    "Ära joo vett!",
    "Ärge jooge vett!",
    "Ära joo vett ära!",
    "Ärge jooge vett ära!",
  ],
  "Ära osta leiba!": ["Ära osta leiba!", "Ärge ostke leiba!"],
  "Loe raamat läbi!": [
    "Loe raamat läbi!",
    "Lugege raamat läbi!",
    "Loe raamat lõpuni!",
    "Lugege raamat lõpuni!",
  ],
  "Ära söö suppi!": [
    "Ära söö suppi!",
    "Ära söö suppi ära!",
    "Ärge sööge suppi!",
    "Ärge sööge suppi ära!",
  ],
  "Söö kook ära!": ["Söö kook ära!", "Sööge kook ära!", "Söö kogu kook ära!"],
  "Tee töö ära!": ["Tee töö ära!", "Tehke töö ära!", "Tee oma töö ära!"],
};

const OBJECT_CLIPS: Record<string, Clip> = {
  ...words([
    ...OBJECT_WORDS,
    ...OBJECT_PAIRS.flatMap(({ part, whole }) => [part, whole]),
    ...OBJECT_NOW.flatMap(({ part, whole }) => [part, whole]),
    ...OBJECT_HEARD.flatMap(({ part, whole, now, will }) => [part, whole, now, will]),
    ...OBJECT_NO,
    ...OBJECT_VERBS,
    OBJECT_FOUND.looked,
    OBJECT_FOUND.found,
    ...OBJECT_FORM_QUIZ.map(({ said }) => said),
    ...OBJECT_COMMANDS.flatMap(({ done, go, not }) => [done, go, not]),
    ...OBJECT_MANY,
    ...OBJECT_REWRITE.map(({ to }) => to),
    ...OBJECT_FIXES.map(({ right }) => right),
    ...OBJECT_DRILL,
  ]),
  "p-voice": { sentences: OBJECT_VOICE, voice: "third" },
  ...OBJECT_DIALOGUE,
  "c-book-key-cake": OBJECT_CONVERSATION,
};

export const GRADATION_KINDS = {
  double: [
    { word: "kapp", of: "kapi", part: "kappi" },
    { word: "kott", of: "koti", part: "kotti" },
    { word: "tükk", of: "tüki", part: "tükki" },
  ],
  soft: [
    { word: "pank", of: "panga", part: "panka" },
    { word: "park", of: "pargi", part: "parki" },
    { word: "lamp", of: "lambi", part: "lampi" },
  ],
  gone: [
    { word: "jalg", of: "jala", part: "jalga" },
    { word: "tuba", of: "toa", part: "tuba" },
    { word: "pood", of: "poe", part: "poodi" },
    { word: "mägi", of: "mäe", part: "mäge" },
  ],
  blend: [
    { word: "lind", of: "linnu", part: "lindu" },
    { word: "rand", of: "ranna", part: "randa" },
    { word: "kuld", of: "kulla", part: "kulda" },
  ],
  other: [
    { word: "mõte", of: "mõtte", part: "mõtet" },
    { word: "hammas", of: "hamba", part: "hammast" },
    { word: "rikas", of: "rikka", part: "rikast" },
  ],
} as const;

export const GRADATION_MATCH = [
  { word: "aed", of: "aia" },
  { word: "lugu", of: "loo" },
  { word: "nurk", of: "nurga" },
  { word: "tund", of: "tunni" },
  { word: "sokk", of: "soki" },
  { word: "sild", of: "silla" },
] as const;

export const GRADATION_CASES = [
  { word: "jalg", forms: ["jalg", "jalga", "jala", "jalal", "jalad"] },
  { word: "kapp", forms: ["kapp", "kappi", "kapi", "kapis", "kapid"] },
  { word: "pank", forms: ["pank", "panka", "panga", "pangas", "pangad"] },
  { word: "lind", forms: ["lind", "lindu", "linnu", "linnul", "linnud"] },
] as const;

export const GRADATION_SORT = [
  { w: "jalga", strong: true },
  { w: "jalad", strong: false },
  { w: "kappi", strong: true },
  { w: "kapis", strong: false },
  { w: "poodi", strong: true },
  { w: "poes", strong: false },
  { w: "parki", strong: true },
  { w: "pargis", strong: false },
  { w: "lindu", strong: true },
  { w: "linnud", strong: false },
] as const;

export const GRADATION_FORM_QUIZ = [
  { word: "tuba", cue: "in", answer: "toas", said: "Kati on toas." },
  { word: "pood", cue: "in", answer: "poes", said: "Ema on poes." },
  { word: "kapp", cue: "in", answer: "kapis", said: "Kott on kapis." },
  { word: "pank", cue: "in", answer: "pangas", said: "Jaan on pangas." },
  { word: "park", cue: "in", answer: "pargis", said: "Lapsed on pargis." },
  { word: "rand", cue: "in", answer: "rannas", said: "Me oleme rannas." },
  { word: "mägi", cue: "on", answer: "mäel", said: "Maja on mäel." },
  { word: "jalg", cue: "many", answer: "jalad", said: "Mu jalad on väsinud." },
  { word: "lind", cue: "many", answer: "linnud", said: "Linnud on pargis." },
] as const;

export const GRADATION_VERBS = [
  { ma: "lugema", da: "lugeda", present: "loen" },
  { ma: "rääkima", da: "rääkida", present: "räägin" },
  { ma: "õppima", da: "õppida", present: "õpin" },
  { ma: "ootama", da: "oodata", present: "ootan" },
  { ma: "vaatama", da: "vaadata", present: "vaatan" },
  { ma: "hakkama", da: "hakata", present: "hakkan" },
] as const;

export const GRADATION_FIXES = [
  { wrong: "Kass on kappis.", right: "Kass on kapis.", word: "kappis" },
  { wrong: "Me oleme pankas.", right: "Me oleme pangas.", word: "pankas" },
  { wrong: "Kati on tubas.", right: "Kati on toas.", word: "tubas" },
  { wrong: "Lindud on pargis.", right: "Linnud on pargis.", word: "Lindud" },
  { wrong: "Ma lugen raamatut.", right: "Ma loen raamatut.", word: "lugen" },
  { wrong: "Ma õppin eesti keelt.", right: "Ma õpin eesti keelt.", word: "õppin" },
  { wrong: "Ta rääkib eesti keelt.", right: "Ta räägib eesti keelt.", word: "rääkib" },
] as const;

export const GRADATION_FIX_ANSWERS: Record<string, readonly [string, ...string[]]> =
  Object.fromEntries(GRADATION_FIXES.map(({ right }) => [right, [right]]));

export const GRADATION_ROOM = [
  "Kati tuba on väike.",
  "Kati toas on laud ja kapp.",
  "Raamatud on kapi peal.",
  "Õhtul läheb ta poodi.",
  "Ta tuleb poest koju kell viis.",
] as const;

export const GRADATION_CONVERSATION: Conversation = {
  turns: [
    {
      voice: "second",
      text: ["Tere, Jaan!", "Tule sisse, see on minu uus korter, kuhu ma eile kolisin."],
      say: "[cheerful] Tere, Jaan! Tule sisse, see on minu uus korter, kuhu ma eile kolisin.",
    },
    { voice: "main", text: ["Tere, Kati!", "Korter on ilus, aga kas su tuba on ka suur?"] },
    {
      voice: "second",
      text: [
        "Ei, tuba on väike, aga see on hele ja soe.",
        "Toas on ainult laud, voodi ja kapp, mille ma turult ostsin.",
      ],
    },
    { voice: "main", text: "Kus su raamatud on, kas sa tõid need kõik kaasa?" },
    { voice: "second", text: "Jah, raamatud on kapis ja kapi peal on lamp." },
    { voice: "main", text: "Ja kus su suur kott on, mida sa eile kandsid?" },
    { voice: "second", text: "Kott on toas laua all, sest mul pole veel riiulit." },
    { voice: "main", text: "Kas siin lähedal on pood, kus saab leiba osta?" },
    {
      voice: "second",
      text: [
        "Jah, pood on kohe nurga taga, maja kõrval.",
        "Ma käin poes peaaegu iga päev, sest see on nii lähedal.",
      ],
    },
    { voice: "main", text: "Ja pank, kas sa käid tihti pangas?" },
    {
      voice: "second",
      text: [
        "Pank on pargi kõrval, aga pangas ma ei käi.",
        "Ma maksan kõik arved telefoniga, see on lihtsam.",
      ],
    },
    { voice: "main", text: "Mis pargis on, kas seal on midagi huvitavat?" },
    {
      voice: "second",
      text: [
        "Pargis on suured vanad puud ja palju linde.",
        "Hommikul ma jooksen pargis, enne kui tööle lähen.",
      ],
    },
    { voice: "main", text: "Ja rand, kas rand on ka siit lähedal?" },
    {
      voice: "second",
      text: [
        "Ei, rand on kaugel, bussiga umbes pool tundi.",
        "Rannas käin ma ainult laupäeval, kui mul on aega.",
      ],
    },
    { voice: "main", text: "Kas sa käid ka talvel rannas?" },
    { voice: "second", text: "Talvel käin ma rannas ainult jalutamas, siis on seal vaikne." },
    { voice: "main", text: "Kus su ema praegu elab, kas ikka Tartus?" },
    {
      voice: "second",
      text: [
        "Jah, ema elab Tartus, ühe väikese mäe peal.",
        "Maja juures on suur aed, kus kasvavad õunapuud.",
        "Ma käin seal kord kuus ja aitan tal aias töötada.",
      ],
    },
    { voice: "main", text: "Kas sinu õde elab ka Tartus?" },
    { voice: "second", text: "Ei, õde elab Pärnus, mere ääres." },
    {
      voice: "main",
      text: ["Mu jalad on väsinud, sest ma tulin jala.", "Kas ma võin natuke istuda?"],
      say: "[laughs] Mu jalad on väsinud, sest ma tulin jala. Kas ma võin natuke istuda?",
    },
    {
      voice: "second",
      text: [
        "Muidugi, istu siia diivanile, see on mugav.",
        "Ma teen meile teed ja toon küpsiseid.",
      ],
    },
    { voice: "main", text: "Aitäh, sul on siin väga hubane, ma tulen jälle." },
    { voice: "second", text: "Tule järgmisel nädalal jälle, siis on mul juba uus riiul." },
  ],
};

export const GRADATION_WORDS = [
  "jalg",
  "jala",
  "tuba",
  "toa",
  "kapp",
  "kapi",
  "pank",
  "panga",
  "lind",
  "linnu",
  "mõte",
  "mõtte",
  "poodi",
  "lugema",
  "loen",
] as const;

export const GRADATION_DRILL = [
  "Ma lähen poodi.",
  "Mul pole kappi.",
  "Ma näen lindu.",
  "Me läheme parki.",
  "Siin pole panka.",
  "aia",
] as const;

export const GRADATION_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  "Kati on toas.": ["Kati on toas.", "Toas on Kati."],
  "Jaan on pangas.": ["Jaan on pangas.", "Pangas on Jaan."],
  "Lapsed on pargis.": ["Lapsed on pargis.", "Pargis on lapsed."],
  "Me oleme rannas.": [
    "Me oleme rannas.",
    "Meie oleme rannas.",
    "Oleme rannas.",
    "Me oleme rannal.",
    "Meie oleme rannal.",
    "Oleme rannal.",
  ],
  "Kott on kapis.": ["Kott on kapis.", "Kott on kapi sees."],
  "Mu jalad on väsinud.": [
    "Mu jalad on väsinud.",
    "Jalad on väsinud.",
    "Minu jalad on väsinud.",
    "Mul on jalad väsinud.",
    "Minul on jalad väsinud.",
  ],
  "Linnud on pargis.": ["Linnud on pargis.", "Pargis on linnud."],
};

const GRADATION_CLIPS: Record<string, Clip> = {
  ...words([
    ...GRADATION_WORDS,
    ...Object.values(GRADATION_KINDS).flatMap((nouns) =>
      nouns.flatMap((noun) => [noun.word, noun.of, noun.part]),
    ),
    ...GRADATION_MATCH.flatMap((noun) => [noun.word, noun.of]),
    ...GRADATION_CASES.flatMap((noun) => noun.forms),
    ...GRADATION_SORT.map(({ w }) => w),
    ...GRADATION_FORM_QUIZ.map(({ said }) => said),
    ...GRADATION_VERBS.flatMap((verb) => [verb.ma, verb.da, verb.present]),
    ...GRADATION_FIXES.map(({ right }) => right),
    ...GRADATION_DRILL,
  ]),
  "p-room": { sentences: GRADATION_ROOM },
  "c-new-flat": GRADATION_CONVERSATION,
};

export const PLURAL_PART_KINDS = {
  id: [
    { word: "raamat", of: "raamatu", part: "raamatut", many: "raamatuid" },
    { word: "õpik", of: "õpiku", part: "õpikut", many: "õpikuid" },
    { word: "kohvik", of: "kohviku", part: "kohvikut", many: "kohvikuid" },
  ],
  sid: [
    { word: "auto", of: "auto", part: "autot", many: "autosid" },
    { word: "kino", of: "kino", part: "kino", many: "kinosid" },
    { word: "ema", of: "ema", part: "ema", many: "emasid" },
  ],
  vowel: [
    { word: "maja", of: "maja", part: "maja", many: "maju" },
    { word: "õun", of: "õuna", part: "õuna", many: "õunu" },
    { word: "kool", of: "kooli", part: "kooli", many: "koole" },
    { word: "laps", of: "lapse", part: "last", many: "lapsi" },
  ],
  long: [
    { word: "maa", of: "maa", part: "maad", many: "maid" },
    { word: "puu", of: "puu", part: "puud", many: "puid" },
    { word: "tee", of: "tee", part: "teed", many: "teid" },
  ],
} as const;

export const PLURAL_PART_ALT: Record<string, string> = {
  maju: "majasid",
  õunu: "õunasid",
  koole: "koolisid",
  puid: "puusid",
  maid: "maasid",
  teid: "teesid",
  öid: "öösid",
  sõpru: "sõprasid",
  linde: "lindusid",
  lilli: "lillesid",
};

export const pluralPartVariants = (sentence: string): [string, ...string[]] => {
  const words = sentence.split(" ");
  const at = words.findIndex((word) => word.replace(/[.,!?]$/, "") in PLURAL_PART_ALT);
  if (at < 0) return [sentence];
  const word = words[at] as string;
  const bare = word.replace(/[.,!?]$/, "");
  const swapped = [...words];
  swapped[at] = word.replace(bare, PLURAL_PART_ALT[bare] as string);
  return [sentence, swapped.join(" ")];
};

export const PLURAL_PART_THREE = [
  { word: "raamat", two: "kaks raamatut", many: "palju raamatuid", the: "raamatud" },
  { word: "õun", two: "kaks õuna", many: "palju õunu", the: "õunad" },
  { word: "sõber", two: "kaks sõpra", many: "palju sõpru", the: "sõbrad" },
  { word: "laps", two: "kaks last", many: "palju lapsi", the: "lapsed" },
] as const;

export const PLURAL_PART_USES = [
  "Mul on palju raamatuid.",
  "Poes on õunu.",
  "Mul ei ole autosid.",
  "Ma armastan linde.",
  "Ma ostsin õunu.",
  "Ma ostsin õunad.",
] as const;

export const PLURAL_PART_GAPS = [
  { id: "raamat-two", noun: "raamat", before: "Mul on kaks", after: ".", answer: "raamatut" },
  { id: "raamat-many", noun: "raamat", before: "Mul on palju", after: ".", answer: "raamatuid" },
  { id: "raamat-where", noun: "raamat", before: "Kus mu", after: "on?", answer: "raamatud" },
  { id: "laps-two", noun: "laps", before: "Neil on kaks", after: ".", answer: "last" },
  { id: "laps-many", noun: "laps", before: "Neil on palju", after: ".", answer: "lapsi" },
  { id: "laps-where", noun: "laps", before: "Kus", after: "on?", answer: "lapsed" },
  { id: "sober-two", noun: "sõber", before: "Tal on kaks", after: ".", answer: "sõpra" },
  { id: "sober-many", noun: "sõber", before: "Tal on palju", after: ".", answer: "sõpru" },
  { id: "sober-where", noun: "sõber", before: "Kus ta", after: "on?", answer: "sõbrad" },
] as const;

export const PLURAL_PART_FORMS = {
  raamat: ["raamatut", "raamatuid", "raamatud"],
  laps: ["last", "lapsi", "lapsed"],
  sõber: ["sõpra", "sõpru", "sõbrad"],
} as const;

export const pluralGapSaid = (gap: { before: string; answer: string; after: string }) =>
  `${gap.before} ${gap.answer}${/^[.!?]$/.test(gap.after) ? "" : " "}${gap.after}`;

export const PLURAL_PART_FORM_QUIZ = [
  { word: "raamat", said: "Mul on palju raamatuid.", answer: "raamatuid", cue: "Mul on palju …" },
  { word: "auto", said: "Tänaval on palju autosid.", answer: "autosid", cue: "Tänaval on palju …" },
  { word: "maja", said: "Siin on vanu maju.", answer: "maju", cue: "Siin on vanu …" },
  { word: "õun", said: "Poes on õunu.", answer: "õunu", cue: "Poes on …" },
  { word: "kool", said: "Tallinnas on palju koole.", answer: "koole", cue: "Tallinnas on palju …" },
  { word: "puu", said: "Pargis on palju puid.", answer: "puid", cue: "Pargis on palju …" },
  { word: "sõber", said: "Mul on palju sõpru.", answer: "sõpru", cue: "Mul on palju …" },
  { word: "laps", said: "Neil ei ole lapsi.", answer: "lapsi", cue: "Neil ei ole …" },
] as const;

export const PLURAL_PART_SORT = [
  { w: "raamatuid", bin: "id" },
  { w: "õpikuid", bin: "id" },
  { w: "puid", bin: "id" },
  { w: "autosid", bin: "sid" },
  { w: "kinosid", bin: "sid" },
  { w: "emasid", bin: "sid" },
  { w: "maju", bin: "vowel" },
  { w: "õunu", bin: "vowel" },
  { w: "koole", bin: "vowel" },
] as const;

export const PLURAL_PART_MATCH = [
  { word: "kass", many: "kasse" },
  { word: "pood", many: "poode" },
  { word: "tädi", many: "tädisid" },
  { word: "tomat", many: "tomateid" },
  { word: "öö", many: "öid" },
  { word: "sõna", many: "sõnu" },
] as const;

export const PLURAL_PART_FIXES = [
  { wrong: "Mul on palju raamatut.", right: "Mul on palju raamatuid." },
  { wrong: "Mul on kaks raamatuid.", right: "Mul on kaks raamatut." },
  { wrong: "Mul ei ole lapsed.", right: "Mul ei ole lapsi." },
  { wrong: "Ma armastan lindud.", right: "Ma armastan linde." },
  { wrong: "Laual on palju õunad.", right: "Laual on palju õunu." },
  { wrong: "Ma ootan sõbrad.", right: "Ma ootan sõpru." },
  { wrong: "Ma ostsin kaks õunu.", right: "Ma ostsin kaks õuna." },
] as const;

export const PLURAL_PART_TRANSLATE = [
  "Mul on palju raamatuid.",
  "Mul on kaks last.",
  "Lapsed on kodus.",
  "Poes on õunu.",
  "Ma ostsin õunad.",
  "Mul ei ole autosid.",
  "Ma armastan linde.",
] as const;

export const PLURAL_PART_PARTY = [
  "Täna on Kati sünnipäev.",
  "Ta ostis poest õunu ja banaane.",
  "Õhtul tuleb palju külalisi.",
  "Kati sõbrad toovad lilli.",
  "Lapsed laulavad laule.",
] as const;

export const PLURAL_PART_CONVERSATION: Conversation = {
  turns: [
    { voice: "main", text: ["Tere, Mari!", "Kas sa käisid täna hommikul turul?"] },
    { voice: "second", text: "Jah, käisin, ja ostsin õunu, porgandeid ja kaks kilo kartuleid." },
    { voice: "main", text: "Kas turul oli ka tomateid, mida sa eile otsisid?" },
    { voice: "second", text: "Ei, tomateid täna ei olnud, sest müüja oli haige." },
    { voice: "main", text: "Kahju, ma tahtsin teha tomatisalatit." },
    {
      voice: "second",
      text: [
        "Ma võin homme uuesti minna, kui sul neid väga vaja on.",
        "Aga seal oli palju lilli, punaseid ja kollaseid.",
      ],
    },
    { voice: "main", text: "Kas sa ostsid ka lilli või ainult köögivilju?" },
    { voice: "second", text: "Jah, ma ostsin viis roosi, need on emale." },
    { voice: "main", text: "Kas su emal on sünnipäev, et sa talle lilli viid?" },
    {
      voice: "second",
      text: [
        "Ei, ta lihtsalt armastab lilli ja ootab mind täna külla.",
        "Tal on aias palju roose, aga praegu nad veel ei õitse.",
      ],
    },
    {
      voice: "main",
      text: [
        "Mul tulevad homme külalised ja ma pean veel poodi minema.",
        "Mul on vaja veel leiba, juustu ja mahla.",
      ],
    },
    { voice: "second", text: "Mitu külalist sul tuleb, kas palju?" },
    { voice: "main", text: "Kuus inimest: minu sõbrad ja nende lapsed." },
    {
      voice: "second",
      text: "Kuus inimest, see on palju, mida sa neile teed?",
      say: "[surprised] Kuus inimest, see on palju, mida sa neile teed?",
    },
    {
      voice: "main",
      text: "Ma teen suppi ja ostan kondiitrist kooke, sest lapsed armastavad kooke.",
    },
    { voice: "second", text: "Milliseid kooke sa ostad?" },
    { voice: "main", text: "Mõned õunakoogid ja mõned kohupiimakoogid." },
    { voice: "second", text: "Kas sul on piisavalt toole, et kõik saaksid istuda?" },
    {
      voice: "main",
      text: [
        "Ei, mul on ainult neli tooli ja üks diivan.",
        "Kas sa saad mulle kaks tooli laenata?",
      ],
    },
    {
      voice: "second",
      text: [
        "Muidugi, ma toon need homme hommikul autoga.",
        "Mul on köögis kuus tooli, aga me kasutame ainult kahte.",
      ],
    },
    { voice: "main", text: "Aitäh, sa oled tõeline sõber, ma teen sulle kooki." },
    { voice: "second", text: "Kas sul on ka piisavalt taldrikuid ja tasse?" },
    { voice: "main", text: "Jah, neid on mul palju, sest ema andis mulle oma vanad nõud." },
    { voice: "second", text: "Ja kas sa vajad veel midagi, näiteks klaase või lusikaid?" },
    { voice: "main", text: "Ei, klaase ja lusikaid on mul küll, aga mul pole vaase." },
    { voice: "second", text: "Siis toon ma ka ühe vaasi, sest külalised toovad sageli lilli." },
    {
      voice: "main",
      text: "Suurepärane, tule homme kell kuus ja too oma lapsed ka!",
      say: "[cheerful] Suurepärane, tule homme kell kuus ja too oma lapsed ka!",
    },
  ],
};

export const PLURAL_PART_WORDS = [
  "palju",
  "sünnipäev",
  "külalisi",
  "lilli",
  "kooke",
  "banaane",
  "linde",
] as const;

export const PLURAL_PART_DRILL = [
  "Mul on palju sõpru.",
  "Tal ei ole autosid.",
  "Ma armastan lilli.",
  "Mul on kaks sõpra.",
] as const;

export const PLURAL_PART_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  "Mul on palju raamatuid.": ["Mul on palju raamatuid.", "Minul on palju raamatuid."],
  "Mul on kaks last.": ["Mul on kaks last.", "Minul on kaks last."],
  "Lapsed on kodus.": ["Lapsed on kodus.", "Kodus on lapsed."],
  "Poes on õunu.": ["Poes on õunu.", "Poes on õunasid."],
  "Ma ostsin õunad.": ["Ma ostsin õunad.", "Mina ostsin õunad.", "Ostsin õunad."],
  "Mul ei ole autosid.": [
    "Mul ei ole autosid.",
    "Mul pole autosid.",
    "Minul ei ole autosid.",
    "Minul pole autosid.",
    "Mul pole ühtegi autot.",
    "Mul ei ole ühtegi autot.",
    "Minul pole ühtegi autot.",
    "Minul ei ole ühtegi autot.",
  ],
  "Ma armastan linde.": [
    "Ma armastan linde.",
    "Ma armastan lindusid.",
    "Mina armastan linde.",
    "Mina armastan lindusid.",
    "Armastan linde.",
    "Armastan lindusid.",
  ],
  "Mul on palju sõpru.": [
    "Mul on palju sõpru.",
    "Mul on palju sõprasid.",
    "Minul on palju sõpru.",
    "Minul on palju sõprasid.",
  ],
  "Mul on kaks sõpra.": ["Mul on kaks sõpra.", "Minul on kaks sõpra."],
  "Tal ei ole autosid.": [
    "Tal ei ole autosid.",
    "Tal pole autosid.",
    "Temal ei ole autosid.",
    "Temal pole autosid.",
  ],
  "Ma armastan lilli.": [
    "Ma armastan lilli.",
    "Ma armastan lillesid.",
    "Mina armastan lilli.",
    "Mina armastan lillesid.",
    "Armastan lilli.",
    "Armastan lillesid.",
  ],
};

const PLURAL_PART_CLIPS: Record<string, Clip> = {
  ...words([
    ...PLURAL_PART_WORDS,
    ...Object.values(PLURAL_PART_KINDS).flatMap((nouns) =>
      nouns.flatMap((noun) => [noun.word, noun.part, noun.many]),
    ),
    ...PLURAL_PART_THREE.flatMap(({ two, many, the }) => [two, many, the]),
    ...PLURAL_PART_USES,
    ...PLURAL_PART_GAPS.map(pluralGapSaid),
    ...PLURAL_PART_FORM_QUIZ.map(({ said }) => said),
    ...PLURAL_PART_SORT.map(({ w }) => w),
    ...PLURAL_PART_MATCH.flatMap((noun) => [noun.word, noun.many]),
    ...PLURAL_PART_FIXES.map(({ right }) => right),
    ...PLURAL_PART_TRANSLATE,
    ...PLURAL_PART_DRILL,
  ]),
  "p-party": { sentences: PLURAL_PART_PARTY },
  "c-market": PLURAL_PART_CONVERSATION,
};

export const PLURAL_CASE_STEMS = [
  { word: "maja", part: "maja", gen: "majade" },
  { word: "sõber", part: "sõpra", gen: "sõprade" },
  { word: "lind", part: "lindu", gen: "lindude" },
  { word: "kool", part: "kooli", gen: "koolide" },
  { word: "puu", part: "puud", gen: "puude" },
  { word: "raamat", part: "raamatut", gen: "raamatute" },
  { word: "inimene", part: "inimest", gen: "inimeste" },
  { word: "õpetaja", part: "õpetajat", gen: "õpetajate" },
  { word: "kohvik", part: "kohvikut", gen: "kohvikute" },
] as const;

export const PLURAL_CASE_NOUNS = {
  maja: {
    one: ["maja", "majas", "majast", "majale", "majal", "majaga"],
    many: ["majade", "majades", "majadest", "majadele", "majadel", "majadega"],
  },
  raamat: {
    one: ["raamatu", "raamatus", "raamatust", "raamatule", "raamatul", "raamatuga"],
    many: ["raamatute", "raamatutes", "raamatutest", "raamatutele", "raamatutel", "raamatutega"],
  },
  inimene: {
    one: ["inimese", "inimeses", "inimesest", "inimesele", "inimesel", "inimesega"],
    many: ["inimeste", "inimestes", "inimestest", "inimestele", "inimestel", "inimestega"],
  },
  sõber: {
    one: ["sõbra", "sõbras", "sõbrast", "sõbrale", "sõbral", "sõbraga"],
    many: ["sõprade", "sõprades", "sõpradest", "sõpradele", "sõpradel", "sõpradega"],
  },
} as const;

export const PLURAL_CASE_HEARD = [
  {
    noun: "inimene",
    one: "Ma räägin inimesega.",
    many: "Ma räägin inimestega.",
    other: "Ma räägin inimestele.",
  },
  {
    noun: "sõber",
    one: "Ta kirjutab sõbrale.",
    many: "Ta kirjutab sõpradele.",
    other: "Ta kirjutab sõpradest.",
  },
  {
    noun: "raamat",
    one: "Pildid on raamatus.",
    many: "Pildid on raamatutes.",
    other: "Pildid on raamatutel.",
  },
  {
    noun: "pood",
    one: "Me käime poes.",
    many: "Me käime poodides.",
    other: "Me tuleme poodidest.",
  },
] as const;

export const PLURAL_CASE_FORM_QUIZ = [
  { word: "maja", dict: "maja, maja, maja", answer: "majade" },
  { word: "sõber", dict: "sõber, sõbra, sõpra", answer: "sõprade" },
  { word: "lind", dict: "lind, linnu, lindu", answer: "lindude" },
  { word: "puu", dict: "puu, puu, puud", answer: "puude" },
  { word: "raamat", dict: "raamat, raamatu, raamatut", answer: "raamatute" },
  { word: "inimene", dict: "inimene, inimese, inimest", answer: "inimeste" },
  { word: "õpetaja", dict: "õpetaja, õpetaja, õpetajat", answer: "õpetajate" },
  { word: "pood", dict: "pood, poe, poodi", answer: "poodide" },
] as const;

export const PLURAL_CASE_SORT = [
  { w: "majade", bin: "de" },
  { w: "sõprade", bin: "de" },
  { w: "lindude", bin: "de" },
  { w: "puude", bin: "de" },
  { w: "koolide", bin: "de" },
  { w: "raamatute", bin: "te" },
  { w: "inimeste", bin: "te" },
  { w: "õpetajate", bin: "te" },
  { w: "kohvikute", bin: "te" },
] as const;

export const PLURAL_CASE_MATCH = [
  { one: "majas", many: "majades" },
  { one: "sõbrale", many: "sõpradele" },
  { one: "raamatust", many: "raamatutest" },
  { one: "inimesega", many: "inimestega" },
  { one: "linnul", many: "lindudel" },
  { one: "koolist", many: "koolidest" },
] as const;

export const PLURAL_CASE_TRANSLATE = [
  "Ma räägin inimestega.",
  "Ta kirjutab sõpradele.",
  "Raamatutes on pilte.",
  "Lindudel on puudes pesad.",
  "Me käime poodides.",
  "Lapsed tulevad koolidest.",
  "Ma lähen sõpradega kinno.",
] as const;

export const PLURAL_CASE_FIXES = [
  { wrong: "Ma räägin inimesedega.", right: "Ma räägin inimestega." },
  { wrong: "Ta kirjutab sõbradele.", right: "Ta kirjutab sõpradele." },
  { wrong: "Raamatudes on pilte.", right: "Raamatutes on pilte." },
  { wrong: "Me käime poodedes.", right: "Me käime poodides." },
  { wrong: "Me kirjutame kirju lapsedele.", right: "Me kirjutame kirju lastele." },
  { wrong: "Ma lähen sõbradega kinno.", right: "Ma lähen sõpradega kinno." },
  { wrong: "Õpetajadele meeldib kohv.", right: "Õpetajatele meeldib kohv." },
] as const;

export const PLURAL_CASE_FIX_ANSWERS: Record<string, readonly [string, ...string[]]> =
  Object.fromEntries(PLURAL_CASE_FIXES.map(({ right }) => [right, [right]]));

export const PLURAL_CASE_SHOPPING = [
  "Laupäeval käivad Kati ja Mari poodides.",
  "Nad otsivad kingitusi oma sõpradele.",
  "Raamatupoodides on palju inimesi.",
  "Mari räägib müüjatega eesti keeles.",
  "Kingitused panevad nad kottidesse.",
] as const;

export const PLURAL_CASE_CONVERSATION: Conversation = {
  turns: [
    {
      voice: "main",
      text: ["Tere, Mari!", "Kuidas nädalavahetus läks?"],
      say: "[cheerful] Tere, Mari! Kuidas nädalavahetus läks?",
    },
    {
      voice: "second",
      text: ["Väga hästi, aitäh!", "Ma olin kolm päeva Tartus koos sõpradega."],
    },
    { voice: "main", text: "Mida te seal tegite?" },
    {
      voice: "second",
      text: [
        "Laupäeval käisime muuseumides ja kohvikutes.",
        "Tartu kohvikutes on väga head koogid.",
      ],
    },
    { voice: "main", text: "Kas muuseumides oli palju inimesi?" },
    {
      voice: "second",
      text: [
        "Jah, väga palju.",
        "Kõikides saalides olid lapsed ja nende vanemad.",
        "Lapsed jooksid saalist saali.",
      ],
      say: "[laughs] Jah, väga palju. Kõikides saalides olid lapsed ja nende vanemad. Lapsed jooksid saalist saali.",
    },
    { voice: "main", text: "Kus te ööbisite?" },
    {
      voice: "second",
      text: [
        "Ühe sõbra juures.",
        "Tal on vanalinnas korter.",
        "Vanades majades on kõrged laed ja suured aknad.",
        "Õhtul istusime köögis ja rääkisime tundide kaupa.",
      ],
    },
    { voice: "main", text: "Ja pühapäeval?" },
    {
      voice: "second",
      text: [
        "Pühapäeval käisime poodides.",
        "Ma ostsin kingitusi oma õdedele.",
        "Neile meeldivad raamatud, nii et ma ostsin kaks raamatut.",
      ],
    },
    { voice: "main", text: "Kas sa rääkisid poodides eesti keelt?" },
    {
      voice: "second",
      text: [
        "Muidugi!",
        "Ma rääkisin müüjatega ainult eesti keeles.",
        "Nad olid väga sõbralikud.",
        "Ühes raamatupoes küsis müüja, kust ma pärit olen.",
        "Ta ei uskunud, et ma õpin eesti keelt alles kaks aastat.",
      ],
    },
    { voice: "main", text: ["Tubli!", "Mina olin terve nädalavahetuse kodus."] },
    { voice: "second", text: "Mida sa tegid?", say: "[curious] Mida sa tegid?" },
    {
      voice: "main",
      text: [
        "Kõigepealt kirjutasin kirju oma vanematele ja vendadele.",
        "Siis vaatasin vanu fotosid.",
      ],
    },
    { voice: "second", text: ["Vanu fotosid?", "Kust sa need leidsid?"] },
    {
      voice: "main",
      text: [
        "Need olid kastides keldris.",
        "Mõnedel piltidel on minu vanaisa ja vanaema.",
        "Nad seisavad oma maja ees.",
        "Mõnel pildil on ka meie vana koer.",
        "Ta magab alati laste voodite all.",
      ],
    },
    { voice: "second", text: ["Kui huvitav!", "Kas sa näitad neid mulle?"] },
    {
      voice: "main",
      text: [
        "Jah, muidugi.",
        "Ma panen kõige ilusamad pildid albumitesse.",
        "Tule homme minu juurde!",
      ],
    },
    {
      voice: "second",
      text: ["Hea mõte!", "Ma toon kooke.", "Kas kell viis sobib?"],
    },
    { voice: "main", text: "Jah, kell viis sobib väga hästi." },
    {
      voice: "second",
      text: ["Kas ma võin ka oma sõbrad kaasa võtta?", "Nad tahavad sinuga tuttavaks saada."],
    },
    {
      voice: "main",
      text: [
        "Muidugi, kõik on oodatud.",
        "Ma teen teed ja kohvi kõikidele külalistele.",
        "Kohtumiseni!",
      ],
    },
  ],
};

export const PLURAL_CASE_WORDS = [
  "kingitusi",
  "müüjatega",
  "kottidesse",
  "raamatupoodides",
  "majades",
  "inimestele",
] as const;

export const PLURAL_CASE_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  "Ma räägin inimestega.": [
    "Ma räägin inimestega.",
    "Mina räägin inimestega.",
    "Räägin inimestega.",
  ],
  "Ta kirjutab sõpradele.": ["Ta kirjutab sõpradele.", "Tema kirjutab sõpradele."],
  "Raamatutes on pilte.": ["Raamatutes on pilte."],
  "Lindudel on puudes pesad.": [
    "Lindudel on puudes pesad.",
    "Lindudel on pesad puudes.",
    "Puudes on lindudel pesad.",
    "Lindudel on puudes pesi.",
    "Lindudel on puudes pesasid.",
    "Puudes on lindudel pesi.",
    "Puudes on lindudel pesasid.",
  ],
  "Me käime poodides.": [
    "Me käime poodides.",
    "Meie käime poodides.",
    "Käime poodides.",
    "Me läheme poodidesse.",
    "Meie läheme poodidesse.",
    "Läheme poodidesse.",
    "Me käime poodides ringi.",
    "Käime poodides ringi.",
    "Meie käime poodides ringi.",
  ],
  "Lapsed tulevad koolidest.": ["Lapsed tulevad koolidest.", "Koolidest tulevad lapsed."],
  "Ma lähen sõpradega kinno.": [
    "Ma lähen sõpradega kinno.",
    "Ma lähen kinno sõpradega.",
    "Mina lähen sõpradega kinno.",
    "Lähen sõpradega kinno.",
    "Lähen kinno sõpradega.",
    "Mina lähen kinno sõpradega.",
    "Ma lähen koos sõpradega kinno.",
    "Lähen koos sõpradega kinno.",
    "Mina lähen koos sõpradega kinno.",
    "Ma lähen kinno koos sõpradega.",
    "Mina lähen kinno koos sõpradega.",
    "Lähen kinno koos sõpradega.",
    "Ma lähen sõpradega koos kinno.",
    "Mina lähen sõpradega koos kinno.",
    "Lähen sõpradega koos kinno.",
  ],
  "Me tuleme poodidest.": [
    "Me tuleme poodidest.",
    "Meie tuleme poodidest.",
    "Tuleme poodidest.",
    "Me tuleme poodidest välja.",
    "Meie tuleme poodidest välja.",
    "Tuleme poodidest välja.",
  ],
  "Ta kirjutab sõpradest.": [
    "Ta kirjutab sõpradest.",
    "Tema kirjutab sõpradest.",
    "Ta kirjutab sõprade kohta.",
    "Tema kirjutab sõprade kohta.",
  ],
  "Ma räägin inimestele.": [
    "Ma räägin inimestele.",
    "Mina räägin inimestele.",
    "Räägin inimestele.",
    "Ma ütlen inimestele.",
    "Ütlen inimestele.",
    "Mina ütlen inimestele.",
  ],
  "Pildid on raamatus.": ["Pildid on raamatus.", "Raamatus on pildid."],
  "Me käime poes.": [
    "Me käime poes.",
    "Meie käime poes.",
    "Käime poes.",
    "Me läheme poodi.",
    "Meie läheme poodi.",
    "Läheme poodi.",
    "Me läheme poesse.",
    "Läheme poesse.",
    "Meie läheme poesse.",
  ],
};

const PLURAL_CASE_CLIPS: Record<string, Clip> = {
  ...words([
    ...PLURAL_CASE_WORDS,
    ...PLURAL_CASE_STEMS.flatMap(({ part, gen }) => [part, gen]),
    ...Object.values(PLURAL_CASE_NOUNS).flatMap(({ one, many }) => [...one, ...many]),
    ...PLURAL_CASE_HEARD.flatMap(({ one, many, other }) => [one, many, other]),
    ...PLURAL_CASE_FORM_QUIZ.map(({ answer }) => answer),
    ...PLURAL_CASE_SORT.map(({ w }) => w),
    ...PLURAL_CASE_MATCH.flatMap(({ one, many }) => [one, many]),
    ...PLURAL_CASE_TRANSLATE,
    ...PLURAL_CASE_FIXES.map(({ right }) => right),
  ]),
  "p-shopping": { sentences: PLURAL_CASE_SHOPPING },
  "c-weekend": PLURAL_CASE_CONVERSATION,
};

export const PERFECT_NUD = [
  { ma: "elama", da: "elada", nud: "elanud", regular: true },
  { ma: "lugema", da: "lugeda", nud: "lugenud", regular: true },
  { ma: "õppima", da: "õppida", nud: "õppinud", regular: true },
  { ma: "käima", da: "käia", nud: "käinud", regular: true },
  { ma: "ostma", da: "osta", nud: "ostnud", regular: true },
  { ma: "olema", da: "olla", nud: "olnud", regular: true },
  { ma: "minema", da: "minna", nud: "läinud", regular: false },
  { ma: "tegema", da: "teha", nud: "teinud", regular: false },
  { ma: "sööma", da: "süüa", nud: "söönud", regular: false },
  { ma: "nägema", da: "näha", nud: "näinud", regular: false },
] as const;

export const PERFECT_TIMELINE = [
  {
    id: "pluperfect",
    at: -2,
    sentence: "Kui ma koju jõudsin, oli Mari juba söönud.",
    build: ["ol|i", "söö|nud"],
  },
  { id: "past", at: -1, sentence: "Eile sõin ma kodus.", build: ["sõ|in"] },
  {
    id: "perfect",
    at: -1,
    reach: 0,
    sentence: "Ma olen juba söönud.",
    build: ["ole|n", "söö|nud"],
  },
  { id: "present", at: 0, sentence: "Ma söön.", build: ["söö|n"] },
] as const;

export const PERFECT_PERSONS = [
  { person: "ma", olen: "Ma olen lugenud.", olin: "Ma olin lugenud." },
  { person: "sa", olen: "Sa oled lugenud.", olin: "Sa olid lugenud." },
  { person: "ta", olen: "Ta on lugenud.", olin: "Ta oli lugenud." },
  { person: "me", olen: "Me oleme lugenud.", olin: "Me olime lugenud." },
  { person: "te", olen: "Te olete lugenud.", olin: "Te olite lugenud." },
  { person: "nad", olen: "Nad on lugenud.", olin: "Nad olid lugenud." },
] as const;

export const PERFECT_USES = [
  "Ma olen Tartus käinud.",
  "Ma olen juba söönud.",
  "Ma ei ole veel söönud.",
  "Ta pole seda filmi näinud.",
  "Eile käisin ma Tartus.",
  "Kui ma jaama jõudsin, oli rong juba läinud.",
] as const;

export const PERFECT_HEARD = [
  {
    id: "kaima",
    past: "Mari käis Tallinnas.",
    perfect: "Mari on Tallinnas käinud.",
    pluperfect: "Mari oli Tallinnas käinud.",
  },
  {
    id: "sooma",
    past: "Jaan sõi lõunat.",
    perfect: "Jaan on lõunat söönud.",
    pluperfect: "Jaan oli lõunat söönud.",
  },
  {
    id: "lugema",
    past: "Kati luges selle raamatu läbi.",
    perfect: "Kati on selle raamatu läbi lugenud.",
    pluperfect: "Kati oli selle raamatu läbi lugenud.",
  },
  {
    id: "nagema",
    past: "Liis nägi seda filmi.",
    perfect: "Liis on seda filmi näinud.",
    pluperfect: "Liis oli seda filmi näinud.",
  },
] as const;

export const PERFECT_REWRITE = [
  { from: "Ma söön.", to: "Ma olen juba söönud.", cue: "already" },
  { from: "Ta läheb koju.", to: "Ta on juba koju läinud.", cue: "already" },
  { from: "Me teeme töö ära.", to: "Me oleme töö ära teinud.", cue: "done" },
  { from: "Ma ei näe seda filmi.", to: "Ma ei ole seda filmi näinud.", cue: "never" },
  { from: "Nad ostavad piletid.", to: "Nad on piletid ostnud.", cue: "done" },
  { from: "Sa loed raamatu läbi.", to: "Sa oled raamatu läbi lugenud.", cue: "done" },
] as const;

export const PERFECT_TRANSLATE = [
  "Ma käisin eile Tartus.",
  "Ma olen Tartus käinud.",
  "Ma ei ole veel söönud.",
  "Kui ma koju jõudsin, oli Mari juba söönud.",
  "Ta on eesti keelt kaks aastat õppinud.",
  "Kas sa oled seda filmi näinud?",
  "Eelmisel nädalal lugesin ma raamatu läbi.",
] as const;

export const PERFECT_FIXES = [
  { wrong: "Ma ei olen seda filmi näinud.", right: "Ma ei ole seda filmi näinud." },
  { wrong: "Ta on juba koju minnud.", right: "Ta on juba koju läinud." },
  { wrong: "Me oleme töö ära tegenud.", right: "Me oleme töö ära teinud." },
  { wrong: "Kas sa oled seda filmi nägenud?", right: "Kas sa oled seda filmi näinud?" },
  {
    wrong: "Ma olen eesti keelt kaks aastat õpinud.",
    right: "Ma olen eesti keelt kaks aastat õppinud.",
  },
  { wrong: "Me ole Tartus käinud.", right: "Me oleme Tartus käinud." },
  {
    wrong: "Kui ma jaama jõudsin, on rong juba läinud.",
    right: "Kui ma jaama jõudsin, oli rong juba läinud.",
  },
] as const;

export const PERFECT_FIX_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  ...Object.fromEntries(PERFECT_FIXES.map(({ right }) => [right, [right]])),
  "Ma ei ole seda filmi näinud.": [
    "Ma ei ole seda filmi näinud.",
    "Ma ei olnud seda filmi näinud.",
  ],
  "Me oleme Tartus käinud.": ["Me oleme Tartus käinud.", "Me olime Tartus käinud."],
  "Nad on piletid ostnud.": ["Nad on piletid ostnud.", "Nad olid piletid ostnud."],
};

export const PERFECT_DIALOGUE = {
  "d-mari-1": { text: "Tere! Kas sa oled Tartus käinud?", voice: "second" },
  "d-sina-1": "Jah, olen. Ma käisin seal eelmisel kuul.",
  "d-mari-2": { text: "Kas sa oled juba söönud?", voice: "second" },
  "d-sina-2": "Ei, ma ei ole veel midagi söönud.",
  "d-mari-3": { text: "Kas sa olid enne kursust eesti keelt õppinud?", voice: "second" },
  "d-sina-3": "Jah, ma olin natuke õppinud.",
  "d-mari-4": { text: "Tubli! Lähme siis koos sööma.", voice: "second" },
} as const satisfies Record<string, Clip>;

export const PERFECT_CONVERSATION: Conversation = {
  turns: [
    {
      voice: "second",
      text: ["Tere, Jaan!", "Kas sa oled kunagi Saaremaal käinud?"],
      say: "[cheerful] Tere, Jaan! Kas sa oled kunagi Saaremaal käinud?",
    },
    {
      voice: "main",
      text: ["Ei, ma ei ole seal kunagi käinud.", "Aga mu vend on seal mitu korda käinud."],
    },
    {
      voice: "second",
      text: ["Mina käisin eelmisel suvel Saaremaal.", "See oli väga ilus reis."],
    },
    { voice: "main", text: "Mida sa seal tegid?" },
    {
      voice: "second",
      text: ["Ma sõitsin rattaga ja ujusin meres.", "Varem olin ma ainult Pärnus meres ujunud."],
    },
    { voice: "main", text: "Kas Saaremaa meri on külm?" },
    {
      voice: "second",
      text: ["Natuke.", "Aga ma olen ka külmemas vees ujunud."],
    },
    {
      voice: "main",
      text: ["Sa oled julge!", "Kuidas sa sinna sõitsid?"],
      say: "[laughs] Sa oled julge! Kuidas sa sinna sõitsid?",
    },
    {
      voice: "second",
      text: [
        "Ma sõitsin bussiga ja siis praamiga.",
        "Aga kui ma sadamasse jõudsin, oli praam juba läinud.",
      ],
    },
    {
      voice: "main",
      text: ["Oh ei!", "Mida sa siis tegid?"],
      say: "[surprised] Oh ei! Mida sa siis tegid?",
    },
    {
      voice: "second",
      text: [
        "Ma ootasin kaks tundi järgmist praami.",
        "Ma lugesin raamatu läbi ja jõin kolm tassi kohvi.",
      ],
    },
    { voice: "main", text: "Kas sa olid varem praamiga sõitnud?" },
    {
      voice: "second",
      text: ["Ei, see oli esimene kord.", "Ma olin varem ainult laevaga Soome sõitnud."],
    },
    { voice: "main", text: "Kas sa oled Kuressaare lossi näinud?" },
    {
      voice: "second",
      text: [
        "Jah, olen.",
        "Ma käisin seal teisel päeval.",
        "Ma polnud varem nii vana lossi näinud.",
      ],
    },
    {
      voice: "main",
      text: ["Ma tahan ka sinna minna.", "Mida sa soovitad?"],
    },
    {
      voice: "second",
      text: ["Kas sa oled kunagi suitsukala söönud?"],
      say: "[curious] Kas sa oled kunagi suitsukala söönud?",
    },
    { voice: "main", text: ["Ei ole.", "Kas see on hea?"] },
    {
      voice: "second",
      text: [
        "Väga hea!",
        "Ma sõin seda iga päev.",
        "Ja sa pead kindlasti Kaali kraatrit vaatamas käima.",
      ],
    },
    { voice: "main", text: ["Kraatrit?", "Ma pole sellest kunagi kuulnud."] },
    {
      voice: "second",
      text: ["See on väga vana auk maas.", "Sinna kukkus kunagi meteoriit."],
    },
    { voice: "main", text: ["Huvitav!", "Kas sa oled reisist pilte teinud?"] },
    {
      voice: "second",
      text: ["Jah, ma olen sada pilti teinud.", "Ma saadan need sulle õhtul."],
    },
    { voice: "main", text: ["Aitäh!", "Kus sa seal ööbisid?"] },
    {
      voice: "second",
      text: [
        "Väikeses külalistemajas.",
        "Perenaine oli seal kolmkümmend aastat elanud.",
        "Ma annan sulle tema numbri.",
      ],
    },
    { voice: "main", text: "Suur aitäh!" },
    {
      voice: "second",
      text: ["Kas sa oled oma vennaga juba rääkinud?", "Ta võib sulle ka midagi soovitada."],
    },
    {
      voice: "main",
      text: [
        "Ei, ma pole temaga veel rääkinud.",
        "Ma helistan talle homme.",
        "Aga ma olen nüüd otsustanud.",
        "Suvel lähen ma Saaremaale.",
      ],
    },
    {
      voice: "second",
      text: ["Tore!", "Ja too mulle suitsukala!"],
      say: "[laughs] Tore! Ja too mulle suitsukala!",
    },
  ],
};

export const PERFECT_WORDS = [
  "juba",
  "veel",
  "kunagi",
  "jõudma",
  "lugenud",
  "söönud",
  "olen",
  "olin",
] as const;

export const PERFECT_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  "Ma käisin eile Tartus.": [
    "Ma käisin eile Tartus.",
    "Eile käisin ma Tartus.",
    "Eile käisin Tartus.",
    "Käisin eile Tartus.",
    "Mina käisin eile Tartus.",
    "Ma läksin eile Tartusse.",
    "Eile läksin ma Tartusse.",
    "Läksin eile Tartusse.",
    "Mina läksin eile Tartusse.",
    "Eile läksin Tartusse.",
    "Eile ma käisin Tartus.",
    "Eile ma läksin Tartusse.",
    "Ma käisin Tartus eile.",
    "Eile käisin mina Tartus.",
    "Eile läksin mina Tartusse.",
    "Eile mina käisin Tartus.",
    "Eile mina läksin Tartusse.",
    "Mina käisin Tartus eile.",
    "Käisin Tartus eile.",
    "Ma läksin Tartusse eile.",
    "Läksin Tartusse eile.",
    "Mina läksin Tartusse eile.",
  ],
  "Ma olen Tartus käinud.": [
    "Ma olen Tartus käinud.",
    "Olen Tartus käinud.",
    "Mina olen Tartus käinud.",
    "Ma olen Tartus olnud.",
    "Olen Tartus olnud.",
    "Mina olen Tartus olnud.",
    "Ma olen käinud Tartus.",
    "Olen käinud Tartus.",
    "Mina olen käinud Tartus.",
    "Ma olen olnud Tartus.",
    "Mina olen olnud Tartus.",
    "Olen olnud Tartus.",
  ],
  "Ma ei ole veel söönud.": [
    "Ma ei ole veel söönud.",
    "Ma pole veel söönud.",
    "Ma ei ole söönud veel.",
    "Mina ei ole veel söönud.",
    "Ei ole veel söönud.",
    "Pole veel söönud.",
    "Mina pole veel söönud.",
    "Ei ole söönud veel.",
    "Mina ei ole söönud veel.",
    "Ma pole söönud veel.",
    "Pole söönud veel.",
    "Mina pole söönud veel.",
  ],
  "Kui ma koju jõudsin, oli Mari juba söönud.": [
    "Kui ma koju jõudsin, oli Mari juba söönud.",
    "Kui ma koju jõudsin, Mari oli juba söönud.",
    "Kui ma jõudsin koju, oli Mari juba söönud.",
    "Kui ma jõudsin koju, Mari oli juba söönud.",
    "Kui koju jõudsin, oli Mari juba söönud.",
    "Mari oli juba söönud, kui ma koju jõudsin.",
    "Kui mina jõudsin koju, oli Mari juba söönud.",
    "Kui jõudsin koju, oli Mari juba söönud.",
    "Kui mina jõudsin koju, Mari oli juba söönud.",
    "Kui jõudsin koju, Mari oli juba söönud.",
    "Mari oli juba söönud, kui ma jõudsin koju.",
    "Mari oli juba söönud, kui koju jõudsin.",
    "Mari oli juba söönud, kui mina jõudsin koju.",
    "Mari oli juba söönud, kui jõudsin koju.",
  ],
  "Ta on eesti keelt kaks aastat õppinud.": [
    "Ta on eesti keelt kaks aastat õppinud.",
    "Ta on kaks aastat eesti keelt õppinud.",
    "Tema on eesti keelt kaks aastat õppinud.",
    "Ta õpib eesti keelt kaks aastat.",
    "Ta õpib eesti keelt juba kaks aastat.",
    "Ta on juba kaks aastat eesti keelt õppinud.",
    "Ta on eesti keelt juba kaks aastat õppinud.",
    "Tema õpib eesti keelt juba kaks aastat.",
    "Ta õpib juba kaks aastat eesti keelt.",
    "Tema on kaks aastat eesti keelt õppinud.",
    "Ta on õppinud eesti keelt kaks aastat.",
    "Tema õpib eesti keelt kaks aastat.",
    "Tema on juba kaks aastat eesti keelt õppinud.",
    "Tema on eesti keelt juba kaks aastat õppinud.",
    "Tema õpib juba kaks aastat eesti keelt.",
    "Tema on õppinud eesti keelt kaks aastat.",
    "Ta on kaks aastat õppinud eesti keelt.",
    "Ta on juba kaks aastat õppinud eesti keelt.",
    "Ta on õppinud eesti keelt juba kaks aastat.",
    "Tema on kaks aastat õppinud eesti keelt.",
    "Tema on juba kaks aastat õppinud eesti keelt.",
    "Tema on õppinud eesti keelt juba kaks aastat.",
  ],
  "Kas sa oled seda filmi näinud?": [
    "Kas sa oled seda filmi näinud?",
    "Kas sa oled seda filmi juba näinud?",
    "Kas te olete seda filmi näinud?",
    "Oled sa seda filmi näinud?",
    "Kas oled seda filmi näinud?",
    "Kas sina oled seda filmi näinud?",
    "Olete te seda filmi näinud?",
    "Kas sa oled näinud seda filmi?",
    "Kas sina oled seda filmi juba näinud?",
    "Kas oled seda filmi juba näinud?",
    "Kas teie olete seda filmi näinud?",
    "Kas olete seda filmi näinud?",
    "Oled sina seda filmi näinud?",
    "Oled seda filmi näinud?",
    "Kas sina oled näinud seda filmi?",
    "Kas oled näinud seda filmi?",
    "Oled sa seda filmi juba näinud?",
    "Kas te olete seda filmi juba näinud?",
    "Kas sa oled juba näinud seda filmi?",
    "Kas te olete näinud seda filmi?",
    "Olete te seda filmi juba näinud?",
    "Oled sina seda filmi juba näinud?",
    "Oled seda filmi juba näinud?",
    "Kas teie olete seda filmi juba näinud?",
    "Kas olete seda filmi juba näinud?",
    "Kas sina oled juba näinud seda filmi?",
    "Kas oled juba näinud seda filmi?",
    "Kas teie olete näinud seda filmi?",
    "Kas olete näinud seda filmi?",
  ],
  "Eelmisel nädalal lugesin ma raamatu läbi.": [
    "Eelmisel nädalal lugesin ma raamatu läbi.",
    "Eelmisel nädalal lugesin raamatu läbi.",
    "Ma lugesin eelmisel nädalal raamatu läbi.",
    "Lugesin eelmisel nädalal raamatu läbi.",
    "Mina lugesin eelmisel nädalal raamatu läbi.",
    "Eelmisel nädalal ma lugesin raamatu läbi.",
    "Ma lugesin raamatu eelmisel nädalal läbi.",
    "Eelmisel nädalal lugesin mina raamatu läbi.",
    "Eelmisel nädalal mina lugesin raamatu läbi.",
    "Mina lugesin raamatu eelmisel nädalal läbi.",
    "Lugesin raamatu eelmisel nädalal läbi.",
    "Ma lugesin raamatu läbi eelmisel nädalal.",
    "Lugesin raamatu läbi eelmisel nädalal.",
    "Mina lugesin raamatu läbi eelmisel nädalal.",
  ],
  "Ma olen juba söönud.": ["Ma olen juba söönud.", "Olen juba söönud.", "Mina olen juba söönud."],
  "Ta on juba koju läinud.": [
    "Ta on juba koju läinud.",
    "Ta on koju juba läinud.",
    "Tema on juba koju läinud.",
    "Tema on koju juba läinud.",
  ],
  "Nad on piletid ostnud.": [
    "Nad on piletid ostnud.",
    "Nemad on piletid ostnud.",
    "Nad on piletid juba ostnud.",
    "Nad on piletid ära ostnud.",
    "Nemad on piletid juba ostnud.",
    "Nemad on piletid ära ostnud.",
    "Nad on piletid juba ära ostnud.",
    "Nemad on piletid juba ära ostnud.",
  ],
  "Kui ma jaama jõudsin, oli rong juba läinud.": [
    "Kui ma jaama jõudsin, oli rong juba läinud.",
    "Kui ma jõudsin jaama, oli rong juba läinud.",
    "Kui ma jaama jõudsin, rong oli juba läinud.",
    "Kui ma jaama jõudsin, oli rong juba ära läinud.",
    "Kui ma jõudsin jaama, rong oli juba läinud.",
    "Kui jaama jõudsin, oli rong juba läinud.",
    "Rong oli juba läinud, kui ma jaama jõudsin.",
    "Kui mina jõudsin jaama, oli rong juba läinud.",
    "Kui jõudsin jaama, oli rong juba läinud.",
    "Kui mina jõudsin jaama, rong oli juba läinud.",
    "Kui jõudsin jaama, rong oli juba läinud.",
    "Kui ma jaama jõudsin, rong oli juba ära läinud.",
    "Kui ma jõudsin jaama, oli rong juba ära läinud.",
    "Kui ma jõudsin jaama, rong oli juba ära läinud.",
    "Kui jaama jõudsin, oli rong juba ära läinud.",
    "Kui jaama jõudsin, rong oli juba ära läinud.",
    "Rong oli juba ära läinud, kui ma jaama jõudsin.",
    "Rong oli juba läinud, kui ma jõudsin jaama.",
    "Rong oli juba läinud, kui jaama jõudsin.",
    "Kui mina jõudsin jaama, oli rong juba ära läinud.",
    "Kui jõudsin jaama, oli rong juba ära läinud.",
    "Kui mina jõudsin jaama, rong oli juba ära läinud.",
    "Kui jõudsin jaama, rong oli juba ära läinud.",
    "Rong oli juba läinud, kui mina jõudsin jaama.",
    "Rong oli juba läinud, kui jõudsin jaama.",
  ],
  "Ta pole seda filmi näinud.": [
    "Ta pole seda filmi näinud.",
    "Ta ei ole seda filmi näinud.",
    "Tema pole seda filmi näinud.",
    "Tema ei ole seda filmi näinud.",
  ],
  "Me oleme töö ära teinud.": [
    "Me oleme töö ära teinud.",
    "Oleme töö ära teinud.",
    "Meie oleme töö ära teinud.",
    "Me oleme töö juba ära teinud.",
    "Meie oleme töö juba ära teinud.",
    "Oleme töö juba ära teinud.",
  ],
  "Ma ei ole seda filmi näinud.": [
    "Ma ei ole seda filmi näinud.",
    "Ma pole seda filmi näinud.",
    "Ma ei ole seda filmi veel näinud.",
    "Ma ei ole seda filmi kunagi näinud.",
    "Ma pole seda filmi kunagi näinud.",
    "Ei ole seda filmi näinud.",
    "Pole seda filmi näinud.",
    "Mina ei ole seda filmi näinud.",
    "Ma pole seda filmi veel näinud.",
    "Mina pole seda filmi näinud.",
    "Ma ei ole kunagi seda filmi näinud.",
    "Ma pole kunagi seda filmi näinud.",
    "Ma ei ole veel seda filmi näinud.",
    "Mina ei ole seda filmi veel näinud.",
    "Mina ei ole seda filmi kunagi näinud.",
    "Mina pole seda filmi kunagi näinud.",
    "Mina pole seda filmi veel näinud.",
    "Mina ei ole kunagi seda filmi näinud.",
    "Mina pole kunagi seda filmi näinud.",
    "Mina ei ole veel seda filmi näinud.",
    "Ma pole veel seda filmi näinud.",
    "Mina pole veel seda filmi näinud.",
  ],
  "Sa oled raamatu läbi lugenud.": [
    "Sa oled raamatu läbi lugenud.",
    "Oled raamatu läbi lugenud.",
    "Sina oled raamatu läbi lugenud.",
    "Sa oled raamatu juba läbi lugenud.",
    "Sina oled raamatu juba läbi lugenud.",
    "Oled raamatu juba läbi lugenud.",
  ],
};

const PERFECT_CLIPS: Record<string, Clip> = {
  ...words([
    ...PERFECT_WORDS,
    ...PERFECT_NUD.flatMap(({ da, nud }) => [da, nud]),
    ...PERFECT_TIMELINE.map(({ sentence }) => sentence),
    ...PERFECT_PERSONS.flatMap(({ olen, olin }) => [olen, olin]),
    ...PERFECT_USES,
    ...PERFECT_HEARD.flatMap(({ past, perfect, pluperfect }) => [past, perfect, pluperfect]),
    ...PERFECT_REWRITE.map(({ to }) => to),
    ...PERFECT_TRANSLATE,
    ...PERFECT_FIXES.map(({ right }) => right),
  ]),
  ...PERFECT_DIALOGUE,
  "c-saaremaa": PERFECT_CONVERSATION,
};

export const COND_VERBS = [
  { ma: "lugema", n: "loen", cond: "loeksin" },
  { ma: "minema", n: "lähen", cond: "läheksin" },
  { ma: "olema", n: "olen", cond: "oleksin" },
  { ma: "tegema", n: "teen", cond: "teeksin" },
  { ma: "tahtma", n: "tahan", cond: "tahaksin" },
  { ma: "saama", n: "saan", cond: "saaksin" },
  { ma: "võima", n: "võin", cond: "võiksin" },
  { ma: "sööma", n: "söön", cond: "sööksin" },
  { ma: "elama", n: "elan", cond: "elaksin" },
] as const;

export const COND_PERSONS = [
  { person: "ma", said: "Ma läheksin.", no: "Ma ei läheks." },
  { person: "sa", said: "Sa läheksid.", no: "Sa ei läheks." },
  { person: "ta", said: "Ta läheks.", no: "Ta ei läheks." },
  { person: "me", said: "Me läheksime.", no: "Me ei läheks." },
  { person: "te", said: "Te läheksite.", no: "Te ei läheks." },
  { person: "nad", said: "Nad läheksid.", no: "Nad ei läheks." },
] as const;

export const COND_FORM_QUIZ = [
  { ma: "lugema", n: "loen", person: "sa", answer: "loeksid", said: "Sa loeksid." },
  { ma: "minema", n: "lähen", person: "ta", answer: "läheks", said: "Ta läheks." },
  { ma: "olema", n: "olen", person: "me", answer: "oleksime", said: "Me oleksime." },
  { ma: "tegema", n: "teen", person: "nad", answer: "teeksid", said: "Nad teeksid." },
  { ma: "tahtma", n: "tahan", person: "ma", answer: "tahaksin", said: "Ma tahaksin." },
  { ma: "saama", n: "saan", person: "te", answer: "saaksite", said: "Te saaksite." },
  { ma: "sööma", n: "söön", person: "ma", answer: "sööksin", said: "Ma sööksin." },
  { ma: "elama", n: "elan", person: "ta", answer: "elaks", said: "Ta elaks." },
] as const;

export const COND_HEARD = [
  { id: "tulema", now: "Ma tulen koju.", would: "Ma tuleksin koju.", past: "Ma tulin koju." },
  { id: "olema", now: "Mul on aega.", would: "Mul oleks aega.", past: "Mul oli aega." },
  { id: "ostma", now: "Ta ostab auto.", would: "Ta ostaks auto.", past: "Ta ostis auto." },
  { id: "sooma", now: "Me sööme kooki.", would: "Me sööksime kooki.", past: "Me sõime kooki." },
] as const;

export const COND_SORT = [
  { w: "läheksin", would: true },
  { w: "tahaksin", would: true },
  { w: "oleks", would: true },
  { w: "teeksid", would: true },
  { w: "lähen", would: false },
  { w: "tahan", would: false },
  { w: "on", would: false },
  { w: "teeb", would: false },
] as const;

export const COND_POLITE = [
  "Ma tahaksin kohvi.",
  "Kas sa saaksid mind aidata?",
  "Kas te võiksite seda korrata?",
] as const;

export const COND_IF = [
  "Kui mul oleks aega, läheksin ma kinno.",
  "Kui ilm oleks ilus, sõidaksime mere äärde.",
  "Kui ma oleksin rikas, ostaksin maja.",
] as const;

export const COND_REWRITE = [
  { from: "Ma tahan kohvi.", to: "Ma tahaksin kohvi.", cue: "politely" },
  { from: "Kas sa saad mind aidata?", to: "Kas sa saaksid mind aidata?", cue: "politely" },
  { from: "Ma lähen kinno.", to: "Ma läheksin kinno.", cue: "would" },
  { from: "Nad ostavad maja.", to: "Nad ostaksid maja.", cue: "would" },
  { from: "Ma ei lähe.", to: "Ma ei läheks.", cue: "would" },
  { from: "Me elame Tartus.", to: "Me elaksime Tartus.", cue: "would" },
] as const;

export const COND_TRANSLATE = [
  "Ma tahaksin kohvi.",
  "Kas sa saaksid mind aidata?",
  "Kui mul oleks aega, läheksin ma kinno.",
  "Ma ei läheks.",
  "Me elaksime Tartus.",
  "Kas sa loeksid seda raamatut?",
  "Kui oleks soe, ujuksime me meres.",
] as const;

export const COND_SHORT: Record<string, string> = {
  loeksid: "loeks",
  oleksime: "oleks",
  teeksid: "teeks",
  tahaksin: "tahaks",
  saaksite: "saaks",
  sööksin: "sööks",
};

export const COND_FIXES = [
  { wrong: "Ma ei läheksin kinno.", right: "Ma ei läheks kinno." },
  { wrong: "Kas sa saaksin mind aidata?", right: "Kas sa saaksid mind aidata?" },
  { wrong: "Kui mul on aega, läheksin ma kinno.", right: "Kui mul oleks aega, läheksin ma kinno." },
  { wrong: "Me läheksid homme kinno.", right: "Me läheksime homme kinno." },
  { wrong: "Ta läheksin koju.", right: "Ta läheks koju." },
  { wrong: "Kui ma oleksin rikas, ostan maja.", right: "Kui ma oleksin rikas, ostaksin maja." },
  { wrong: "Te loeksid seda raamatut.", right: "Te loeksite seda raamatut." },
] as const;

export const COND_FIX_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  ...Object.fromEntries(COND_FIXES.map(({ right }) => [right, [right]])),
  "Kas sa saaksid mind aidata?": ["Kas sa saaksid mind aidata?", "Kas sa saaks mind aidata?"],
  "Me läheksime homme kinno.": ["Me läheksime homme kinno.", "Me läheks homme kinno."],
  "Te loeksite seda raamatut.": ["Te loeksite seda raamatut.", "Te loeks seda raamatut."],
};

export const COND_DIALOGUE = {
  "d-teenindaja-1": { text: "Tere õhtust! Mida te sooviksite?", voice: "second" },
  "d-sina-1": "Ma tahaksin üht teed, palun.",
  "d-teenindaja-2": { text: "Kas te sooviksite ka midagi süüa?", voice: "second" },
  "d-sina-2": "Jah, ma võtaksin ühe võileiva.",
  "d-teenindaja-3": { text: "Kas te istuksite akna all või terrassil?", voice: "second" },
  "d-sina-3": "Ma istuksin hea meelega terrassil.",
  "d-teenindaja-4": { text: "Hästi. Ma toon teie tee kohe.", voice: "second" },
} as const satisfies Record<string, Clip>;

export const COND_CONVERSATION: Conversation = {
  turns: [
    {
      voice: "second",
      text: ["Jaan, mida sa teeksid, kui sul oleks terve kuu puhkust?"],
      say: "[curious] Jaan, mida sa teeksid, kui sul oleks terve kuu puhkust?",
    },
    { voice: "main", text: ["Hea küsimus!", "Ma sõidaksin kindlasti Jaapanisse."] },
    { voice: "second", text: ["Jaapanisse?", "Miks just sinna?"] },
    {
      voice: "main",
      text: [
        "Ma tahaksin näha vanu templeid ja süüa päris jaapani toitu.",
        "Ja ma õpiksin natuke jaapani keelt.",
      ],
    },
    { voice: "second", text: "Kui kaua sa seal oleksid?" },
    {
      voice: "main",
      text: ["Ma oleksin seal kolm nädalat.", "Viimasel nädalal sõidaksin ma mägedesse."],
    },
    { voice: "second", text: ["Jaapani keel on väga raske.", "Kas sa suudaksid seda õppida?"] },
    {
      voice: "main",
      text: ["Natuke kindlasti.", "Aga ma ei räägiks seda kunagi nii hästi kui eesti keelt."],
    },
    {
      voice: "second",
      text: "Sa räägid eesti keelt juba päris hästi.",
      say: "[laughs] Sa räägid eesti keelt juba päris hästi.",
    },
    { voice: "main", text: ["Aitäh!", "Aga sina?", "Mida sina teeksid?"] },
    {
      voice: "second",
      text: ["Mina ei sõidaks kuhugi kaugele.", "Ma elaksin terve kuu maal, vanaema juures."],
    },
    { voice: "main", text: ["Maal?", "Kas sul ei oleks igav?"] },
    {
      voice: "second",
      text: [
        "Ei, mitte üldse.",
        "Ma loeksin raamatuid, käiksin metsas ja ujuksin järves.",
        "Hommikuti magaksin ma kaua.",
      ],
    },
    { voice: "main", text: ["See kõlab hästi.", "Aga kui ilm oleks halb?"] },
    {
      voice: "second",
      text: [
        "Siis ma istuksin köögis ja küpsetaksin vanaemaga kooke.",
        "Me räägiksime tundide kaupa.",
      ],
    },
    {
      voice: "main",
      text: ["Kui mul oleks vanaema maal, teeksin ma sama.", "Minu vanavanemad elavad Tallinnas."],
    },
    {
      voice: "second",
      text: ["Siis sa võiksid tulla minuga kaasa.", "Vanaemale meeldivad külalised."],
    },
    {
      voice: "main",
      text: ["Tõesti?", "Ma tuleksin hea meelega!", "Kas ma saaksin aias aidata?"],
      say: "[surprised] Tõesti? Ma tuleksin hea meelega! Kas ma saaksin aias aidata?",
    },
    {
      voice: "second",
      text: ["Muidugi.", "Aias on alati tööd.", "Sa võiksid kartuleid kaevata."],
    },
    {
      voice: "main",
      text: ["Ma oleksin parem kokk kui aednik.", "Ma võiksin iga päev süüa teha."],
      say: "[laughs] Ma oleksin parem kokk kui aednik. Ma võiksin iga päev süüa teha.",
    },
    {
      voice: "second",
      text: ["Suurepärane!", "Siis sööksime me iga päev head toitu."],
    },
    { voice: "main", text: ["Aga Jaapan jääb minu unistuseks."] },
    {
      voice: "second",
      text: ["Võib-olla saaksime järgmisel aastal koos Jaapanisse sõita."],
    },
    { voice: "main", text: ["See oleks väga tore!"] },
    { voice: "second", text: ["Aga enne peaksime natuke raha koguma.", "Lennupiletid on kallid."] },
    { voice: "main", text: ["Õige.", "Ma ei ostaks enam iga päev kohvikust kohvi."] },
    {
      voice: "second",
      text: "See oleks sinu jaoks väga raske!",
      say: "[laughs] See oleks sinu jaoks väga raske!",
    },
  ],
};

export const COND_WORDS = ["kui", "hea meelega", "läheksin", "tahaksin", "oleks"] as const;

export const COND_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  "Ma tahaksin kohvi.": [
    "Ma tahaksin kohvi.",
    "Ma tahaksin kohvi, palun.",
    "Tahaksin kohvi.",
    "Tahaksin kohvi, palun.",
    "Mina tahaksin kohvi.",
    "Mina tahaksin kohvi, palun.",
    "Ma sooviksin kohvi.",
    "Ma sooviksin kohvi, palun.",
    "Sooviksin kohvi.",
    "Sooviksin kohvi, palun.",
    "Ma võtaksin kohvi.",
    "Ma võtaksin kohvi, palun.",
    "Võtaksin kohvi.",
    "Võtaksin kohvi, palun.",
    "Ma tahaksin üht kohvi.",
    "Ma tahaksin üht kohvi, palun.",
    "Tahaksin üht kohvi, palun.",
    "Ma võtaksin ühe kohvi, palun.",
    "Ma tahaks kohvi.",
    "Ma tahaks kohvi, palun.",
    "Mina sooviksin kohvi.",
    "Mina sooviksin kohvi, palun.",
    "Mina võtaksin kohvi.",
    "Mina võtaksin kohvi, palun.",
    "Mina tahaksin üht kohvi.",
    "Tahaksin üht kohvi.",
    "Mina tahaksin üht kohvi, palun.",
    "Mina võtaksin ühe kohvi, palun.",
    "Võtaksin ühe kohvi, palun.",
    "Mina tahaks kohvi.",
    "Mina tahaks kohvi, palun.",
    "Ma sooviks kohvi.",
    "Ma sooviks kohvi, palun.",
    "Ma võtaks kohvi.",
    "Ma võtaks kohvi, palun.",
    "Ma tahaks üht kohvi.",
    "Ma tahaksin ühte kohvi.",
    "Ma tahaks üht kohvi, palun.",
    "Ma tahaksin ühte kohvi, palun.",
    "Tahaksin ühte kohvi, palun.",
    "Ma võtaks ühe kohvi, palun.",
    "Mina sooviks kohvi.",
    "Mina sooviks kohvi, palun.",
    "Mina võtaks kohvi.",
    "Mina võtaks kohvi, palun.",
    "Mina tahaks üht kohvi.",
    "Mina tahaksin ühte kohvi.",
    "Tahaksin ühte kohvi.",
    "Mina tahaks üht kohvi, palun.",
    "Mina tahaksin ühte kohvi, palun.",
    "Mina võtaks ühe kohvi, palun.",
    "Ma tahaks ühte kohvi.",
    "Ma tahaks ühte kohvi, palun.",
    "Mina tahaks ühte kohvi.",
    "Mina tahaks ühte kohvi, palun.",
  ],
  "Kas sa saaksid mind aidata?": [
    "Kas sa saaksid mind aidata?",
    "Kas te saaksite mind aidata?",
    "Kas sa võiksid mind aidata?",
    "Kas te võiksite mind aidata?",
    "Saaksid sa mind aidata?",
    "Kas sa saaksid mulle appi tulla?",
    "Kas saaksid mind aidata?",
    "Kas saaksite mind aidata?",
    "Kas sina saaksid mind aidata?",
    "Saaksite te mind aidata?",
    "Võiksid sa mind aidata?",
    "Kas te saaksite mulle appi tulla?",
    "Kas sa aitaksid mind?",
    "Kas te aitaksite mind?",
    "Kas sa saaks mind aidata?",
    "Kas teie saaksite mind aidata?",
    "Kas sina võiksid mind aidata?",
    "Kas võiksid mind aidata?",
    "Kas teie võiksite mind aidata?",
    "Kas võiksite mind aidata?",
    "Saaksid sina mind aidata?",
    "Saaksid mind aidata?",
    "Kas sina saaksid mulle appi tulla?",
    "Kas saaksid mulle appi tulla?",
    "Võiksid sina mind aidata?",
    "Võiksid mind aidata?",
    "Kas teie saaksite mulle appi tulla?",
    "Kas saaksite mulle appi tulla?",
    "Kas sina aitaksid mind?",
    "Kas aitaksid mind?",
    "Kas teie aitaksite mind?",
    "Kas aitaksite mind?",
    "Kas te saaks mind aidata?",
    "Kas sa võiks mind aidata?",
    "Kas te võiks mind aidata?",
    "Saaks sa mind aidata?",
    "Kas sa saaks mulle appi tulla?",
    "Kas sina saaks mind aidata?",
    "Saaks te mind aidata?",
    "Võiks sa mind aidata?",
    "Kas te saaks mulle appi tulla?",
    "Kas sa aitaks mind?",
    "Kas te aitaks mind?",
    "Kas teie saaks mind aidata?",
    "Kas sina võiks mind aidata?",
    "Kas teie võiks mind aidata?",
    "Saaks sina mind aidata?",
    "Kas sina saaks mulle appi tulla?",
    "Võiks sina mind aidata?",
    "Kas teie saaks mulle appi tulla?",
    "Kas sina aitaks mind?",
    "Kas teie aitaks mind?",
  ],
  "Kui mul oleks aega, läheksin ma kinno.": [
    "Kui mul oleks aega, läheksin ma kinno.",
    "Kui mul oleks aega, ma läheksin kinno.",
    "Kui mul oleks aega, läheksin kinno.",
    "Ma läheksin kinno, kui mul oleks aega.",
    "Läheksin kinno, kui mul oleks aega.",
    "Kui mul oleks aega, siis läheksin ma kinno.",
    "Kui mul oleks aega, siis ma läheksin kinno.",
    "Kui mul oleks aega, siis läheksin kinno.",
    "Kui mul aega oleks, läheksin ma kinno.",
    "Kui mul aega oleks, läheksin kinno.",
    "Kui mul aega oleks, ma läheksin kinno.",
    "Ma läheksin kinno, kui mul aega oleks.",
    "Kui mul oleks aega, läheksin mina kinno.",
    "Kui mul oleks aega, mina läheksin kinno.",
    "Mina läheksin kinno, kui mul oleks aega.",
    "Kui mul oleks aega, siis läheksin mina kinno.",
    "Kui mul oleks aega, siis mina läheksin kinno.",
    "Kui mul aega oleks, läheksin mina kinno.",
    "Kui mul aega oleks, mina läheksin kinno.",
    "Mina läheksin kinno, kui mul aega oleks.",
    "Läheksin kinno, kui mul aega oleks.",
    "Kui mul oleks aega, läheks ma kinno.",
    "Kui mul oleks aega, ma läheks kinno.",
    "Ma läheks kinno, kui mul oleks aega.",
    "Kui mul oleks aega, siis läheks ma kinno.",
    "Kui mul oleks aega, siis ma läheks kinno.",
    "Kui mul aega oleks, läheks ma kinno.",
    "Kui mul aega oleks, ma läheks kinno.",
    "Ma läheks kinno, kui mul aega oleks.",
    "Kui mul oleks aega, läheks mina kinno.",
    "Kui mul oleks aega, mina läheks kinno.",
    "Mina läheks kinno, kui mul oleks aega.",
    "Kui mul oleks aega, siis läheks mina kinno.",
    "Kui mul oleks aega, siis mina läheks kinno.",
    "Kui mul aega oleks, läheks mina kinno.",
    "Kui mul aega oleks, mina läheks kinno.",
    "Mina läheks kinno, kui mul aega oleks.",
    "Kui mul aega oleks, siis läheksin ma kinno.",
    "Kui mul aega oleks, siis ma läheksin kinno.",
    "Kui mul aega oleks, siis läheksin kinno.",
    "Kui mul aega oleks, siis läheks ma kinno.",
    "Kui mul aega oleks, siis ma läheks kinno.",
    "Kui mul aega oleks, siis läheksin mina kinno.",
    "Kui mul aega oleks, siis mina läheksin kinno.",
  ],
  "Ma ei läheks.": ["Ma ei läheks.", "Mina ei läheks.", "Ei läheks."],
  "Me elaksime Tartus.": [
    "Me elaksime Tartus.",
    "Meie elaksime Tartus.",
    "Elaksime Tartus.",
    "Me elaks Tartus.",
    "Meie elaks Tartus.",
  ],
  "Kas sa loeksid seda raamatut?": [
    "Kas sa loeksid seda raamatut?",
    "Kas te loeksite seda raamatut?",
    "Loeksid sa seda raamatut?",
    "Kas sina loeksid seda raamatut?",
    "Kas loeksid seda raamatut?",
    "Kas loeksite seda raamatut?",
    "Loeksite te seda raamatut?",
    "Kas teie loeksite seda raamatut?",
    "Loeksid sina seda raamatut?",
    "Loeksid seda raamatut?",
    "Kas sa loeks seda raamatut?",
    "Kas te loeks seda raamatut?",
    "Loeks sa seda raamatut?",
    "Kas sina loeks seda raamatut?",
    "Loeks te seda raamatut?",
    "Kas teie loeks seda raamatut?",
    "Loeks sina seda raamatut?",
  ],
  "Kui oleks soe, ujuksime me meres.": [
    "Kui oleks soe, ujuksime me meres.",
    "Kui oleks soe, me ujuksime meres.",
    "Kui oleks soe, ujuksime meres.",
    "Kui ilm oleks soe, ujuksime me meres.",
    "Me ujuksime meres, kui oleks soe.",
    "Ujuksime meres, kui oleks soe.",
    "Kui oleks soe, siis ujuksime me meres.",
    "Kui oleks soe, siis me ujuksime meres.",
    "Kui oleks soe, siis ujuksime meres.",
    "Kui ilm oleks soe, siis ujuksime me meres.",
    "Kui ilm oleks soe, me ujuksime meres.",
    "Kui ilm oleks soe, ujuksime meres.",
    "Me ujuksime meres, kui ilm oleks soe.",
    "Kui ilm oleks soe, siis me ujuksime meres.",
    "Kui soe oleks, ujuksime me meres.",
    "Kui oleks soe, meie ujuksime meres.",
    "Meie ujuksime meres, kui oleks soe.",
    "Kui oleks soe, siis meie ujuksime meres.",
    "Kui ilm oleks soe, meie ujuksime meres.",
    "Meie ujuksime meres, kui ilm oleks soe.",
    "Ujuksime meres, kui ilm oleks soe.",
    "Kui ilm oleks soe, siis meie ujuksime meres.",
    "Kui ilm oleks soe, siis ujuksime meres.",
    "Kui oleks soe, ujuks me meres.",
    "Kui oleks soe, me ujuks meres.",
    "Kui ilm oleks soe, ujuks me meres.",
    "Me ujuks meres, kui oleks soe.",
    "Kui oleks soe, siis ujuks me meres.",
    "Kui oleks soe, siis me ujuks meres.",
    "Kui ilm oleks soe, siis ujuks me meres.",
    "Kui ilm oleks soe, me ujuks meres.",
    "Me ujuks meres, kui ilm oleks soe.",
    "Kui ilm oleks soe, siis me ujuks meres.",
    "Kui soe oleks, ujuks me meres.",
    "Kui oleks soe, meie ujuks meres.",
    "Meie ujuks meres, kui oleks soe.",
    "Kui oleks soe, siis meie ujuks meres.",
    "Kui ilm oleks soe, meie ujuks meres.",
    "Meie ujuks meres, kui ilm oleks soe.",
    "Kui ilm oleks soe, siis meie ujuks meres.",
    "Kui soe oleks, siis ujuksime me meres.",
    "Kui soe oleks, me ujuksime meres.",
    "Kui soe oleks, ujuksime meres.",
    "Kui soe oleks, siis ujuks me meres.",
    "Kui soe oleks, me ujuks meres.",
    "Kui soe oleks, meie ujuksime meres.",
  ],
  "Ma läheksin kinno.": [
    "Ma läheksin kinno.",
    "Läheksin kinno.",
    "Mina läheksin kinno.",
    "Ma läheks kinno.",
    "Mina läheks kinno.",
  ],
  "Nad ostaksid maja.": [
    "Nad ostaksid maja.",
    "Nemad ostaksid maja.",
    "Nad ostaks maja.",
    "Nemad ostaks maja.",
  ],
  "Kas te võiksite seda korrata?": [
    "Kas te võiksite seda korrata?",
    "Kas sa võiksid seda korrata?",
    "Kas te saaksite seda korrata?",
    "Kas sa saaksid seda korrata?",
    "Kas te võiksite seda palun korrata?",
    "Kas te võiksite palun seda korrata?",
    "Kas te võiksite seda korrata, palun?",
    "Kas võiksite seda korrata?",
    "Võiksite te seda korrata?",
    "Kas te võiksite seda uuesti öelda?",
    "Kas teie võiksite seda korrata?",
    "Kas sina võiksid seda korrata?",
    "Kas võiksid seda korrata?",
    "Kas teie saaksite seda korrata?",
    "Kas saaksite seda korrata?",
    "Kas sina saaksid seda korrata?",
    "Kas saaksid seda korrata?",
    "Kas teie võiksite seda palun korrata?",
    "Kas võiksite seda palun korrata?",
    "Kas teie võiksite palun seda korrata?",
    "Kas võiksite palun seda korrata?",
    "Kas teie võiksite seda korrata, palun?",
    "Kas võiksite seda korrata, palun?",
    "Kas teie võiksite seda uuesti öelda?",
    "Kas võiksite seda uuesti öelda?",
    "Kas te võiks seda korrata?",
    "Kas sa võiks seda korrata?",
    "Kas te saaks seda korrata?",
    "Kas sa saaks seda korrata?",
    "Kas te võiks seda palun korrata?",
    "Kas te võiks palun seda korrata?",
    "Kas te võiks seda korrata, palun?",
    "Võiks te seda korrata?",
    "Kas te võiks seda uuesti öelda?",
    "Kas teie võiks seda korrata?",
    "Kas sina võiks seda korrata?",
    "Kas teie saaks seda korrata?",
    "Kas sina saaks seda korrata?",
    "Kas teie võiks seda palun korrata?",
    "Kas teie võiks palun seda korrata?",
    "Kas teie võiks seda korrata, palun?",
    "Kas teie võiks seda uuesti öelda?",
  ],
};

const COND_CLIPS: Record<string, Clip> = {
  ...words([
    ...COND_WORDS,
    ...COND_VERBS.flatMap(({ n, cond }) => [n, cond]),
    ...COND_PERSONS.flatMap(({ said, no }) => [said, no]),
    ...COND_FORM_QUIZ.map(({ said }) => said),
    ...COND_HEARD.flatMap(({ now, would, past }) => [now, would, past]),
    ...COND_SORT.map(({ w }) => w),
    ...COND_POLITE,
    ...COND_IF,
    ...COND_REWRITE.map(({ to }) => to),
    ...COND_TRANSLATE,
    ...COND_FIXES.map(({ right }) => right),
  ]),
  ...COND_DIALOGUE,
  "c-holiday": COND_CONVERSATION,
};

export const LETS_VERBS = [
  { ma: "vaatama", n: "vaatan", we: "me vaatame", lets: "Vaatame!" },
  { ma: "tegema", n: "teen", we: "me teeme", lets: "Teeme!" },
  { ma: "lugema", n: "loen", we: "me loeme", lets: "Loeme!" },
  { ma: "sõitma", n: "sõidan", we: "me sõidame", lets: "Sõidame!" },
  { ma: "õppima", n: "õpin", we: "me õpime", lets: "Õpime!" },
  { ma: "ostma", n: "ostan", we: "me ostame", lets: "Ostame!" },
  { ma: "jooma", n: "joon", we: "me joome", lets: "Joome!" },
  { ma: "minema", n: "lähen", we: "me läheme", lets: "Lähme!" },
] as const;

export const LAS_USES = [
  "Las ta magab.",
  "Las lapsed mängivad õues.",
  "Las ma aitan sind.",
  "Las Mari otsustab.",
] as const;

export const LETS_GO_TO = ["Lähme ujuma!", "Lähme sööma!", "Lähme koju!"] as const;

export const LETS_GAPS = [
  { id: "minema-ta", verb: "minema", before: "Las ta", after: "koju.", answer: "läheb" },
  { id: "minema-nad", verb: "minema", before: "Las nad", after: "koju.", answer: "lähevad" },
  { id: "minema-lets", verb: "minema", before: "Kati,", after: "koju!", answer: "lähme" },
  { id: "sooma-ta", verb: "sööma", before: "Las ta", after: "kodus.", answer: "sööb" },
  { id: "sooma-nad", verb: "sööma", before: "Las nad", after: "kodus.", answer: "söövad" },
  { id: "sooma-lets", verb: "sööma", before: "Kati,", after: "midagi!", answer: "sööme" },
  { id: "mangima-ta", verb: "mängima", before: "Las ta", after: "õues.", answer: "mängib" },
  { id: "mangima-nad", verb: "mängima", before: "Las lapsed", after: "õues.", answer: "mängivad" },
  { id: "mangima-lets", verb: "mängima", before: "Tule,", after: "koos!", answer: "mängime" },
] as const;

export const LETS_OPTIONS: Record<(typeof LETS_GAPS)[number]["verb"], readonly string[]> = {
  minema: ["läheb", "lähevad", "lähme"],
  sööma: ["sööb", "söövad", "sööme"],
  mängima: ["mängib", "mängivad", "mängime"],
};

export const LETS_HEARD = [
  {
    id: "minema",
    lets: "Lähme kinno!",
    we: "Me läheme kinno.",
    one: "Mine kinno!",
    las: "Las ta läheb kinno.",
  },
  {
    id: "sooma",
    lets: "Sööme pitsat!",
    we: "Me sööme pitsat.",
    one: "Söö pitsat!",
    las: "Las ta sööb pitsat.",
  },
  {
    id: "vaatama",
    lets: "Vaatame filmi!",
    we: "Me vaatame filmi.",
    one: "Vaata filmi!",
    las: "Las ta vaatab filmi.",
  },
  {
    id: "mangima",
    lets: "Mängime õues!",
    we: "Me mängime õues.",
    one: "Mängi õues!",
    las: "Las ta mängib õues.",
  },
] as const;

export const LETS_TRANSLATE = [
  "Lähme ujuma!",
  "Las nad mängivad õues.",
  "Las ma aitan sind.",
  "Sööme koos!",
  "Las ta otsustab.",
  "Ostame koogi!",
  "Vaatame täna õhtul filmi!",
] as const;

export const LETS_FIXES = [
  { wrong: "Las ta tulla.", right: "Las ta tuleb." },
  { wrong: "Las nad mängib õues.", right: "Las nad mängivad õues." },
  { wrong: "Las ma aitab sind.", right: "Las ma aitan sind." },
  { wrong: "Vaatama filmi!", right: "Vaatame filmi!" },
  { wrong: "Las ta magama.", right: "Las ta magab." },
  { wrong: "Me sööma koos.", right: "Me sööme koos." },
  { wrong: "Ostame kook!", right: "Ostame koogi!" },
] as const;

export const LETS_FIX_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  ...Object.fromEntries(LETS_FIXES.map(({ right }) => [right, [right]])),
  "Las ta tuleb.": ["Las ta tuleb.", "Las ta tulgu."],
  "Las nad mängivad õues.": ["Las nad mängivad õues.", "Las nad mängigu õues."],
  "Las ta magab.": ["Las ta magab.", "Las ta magagu."],
};

export const LETS_DIALOGUE = {
  "d-kati-1": { text: "Mida me laupäeval teeme?", voice: "second" },
  "d-kati-2": { text: "Hea mõte! Aga Jaan tahab ka tulla.", voice: "second" },
  "d-sina-2": "Las ta tuleb!",
  "d-kati-3": { text: "Ja pärast filmi?", voice: "second" },
  "d-sina-3": "Sööme pitsat!",
} as const satisfies Record<string, Clip>;

export const LETS_CONVERSATION: Conversation = {
  turns: [
    {
      voice: "second",
      text: ["Jaan, mu õde Liisa tuleb laupäeval Tartust külla.", "Mida me temaga teeme?"],
      say: "[cheerful] Jaan, mu õde Liisa tuleb laupäeval Tartust külla. Mida me temaga teeme?",
    },
    {
      voice: "main",
      text: ["Hea küsimus.", "Kas ta on varem Tallinnas käinud?"],
    },
    { voice: "second", text: "Ainult üks kord, lapsena." },
    {
      voice: "main",
      text: ["Siis lähme hommikul vanalinna.", "Jalutame natuke ja vaatame Raekoja platsi."],
    },
    {
      voice: "second",
      text: ["Hea mõte.", "Aga Liisale ei meeldi kaua kõndida."],
    },
    {
      voice: "main",
      text: ["Siis võtame trammi.", "Või sõidame rattaga, see on lõbusam."],
    },
    {
      voice: "second",
      text: ["Ei, las ta puhkab.", "Ta sõidab ju kolm tundi bussiga."],
    },
    { voice: "main", text: ["Õige.", "Kus me lõunat sööme?"] },
    {
      voice: "second",
      text: ["Lähme sellesse väikesesse kohvikusse mere ääres.", "Seal on väga hea kalasupp."],
    },
    { voice: "main", text: "Aga Liisa ei söö kala." },
    {
      voice: "second",
      text: ["Ah jaa, ma unustasin.", "Siis las ta valib ise."],
    },
    { voice: "main", text: ["Jah, las ta otsustab.", "Ja pärastlõunal?"] },
    {
      voice: "second",
      text: ["Lähme Kumusse!", "Liisale meeldib kunst."],
    },
    { voice: "main", text: "Kumu on ju kaugel." },
    { voice: "second", text: "Ei ole, bussiga on see ainult kümme minutit." },
    {
      voice: "main",
      text: "Mina tahaksin pigem jalgpalli vaadata.",
      say: "[laughs] Mina tahaksin pigem jalgpalli vaadata.",
    },
    {
      voice: "second",
      text: ["Vaata siis kodus jalgpalli!", "Meie läheme kahekesi."],
    },
    { voice: "main", text: ["Ei, ei, ma tulen ka.", "Aga mida me õhtul teeme?"] },
    {
      voice: "second",
      text: "Teeme kodus süüa ja kutsume sõbrad külla.",
    },
    {
      voice: "main",
      text: ["Kutsume ka Peetri ja Kati.", "Las nad toovad koogi."],
    },
    { voice: "second", text: ["Hea küll.", "Ja mina teen salatit."] },
    { voice: "main", text: ["Ja las ma teen pitsa!"] },
    {
      voice: "second",
      text: ["Sina?", "Pitsa?"],
      say: "[surprised] Sina? Pitsa?",
    },
    { voice: "main", text: ["Jah!", "Ma olen seda juba kaks korda teinud."] },
    {
      voice: "second",
      text: ["Hästi, tee siis!", "Aga ärme kutsu liiga palju inimesi.", "Korter on väike."],
    },
    { voice: "main", text: ["Hea küll, ainult neli-viis inimest.", "Ja pühapäeval?"] },
    {
      voice: "second",
      text: [
        "Pühapäeval magame kaua.",
        "Siis viime Liisa bussijaama.",
        "Tema buss läheb kell kolm.",
      ],
    },
    {
      voice: "main",
      text: ["Enne seda lähme randa, kui ilm on ilus.", "Ujume ka?"],
    },
    {
      voice: "second",
      text: ["Mais?", "Vesi on veel liiga külm!", "Aga võtame teki kaasa ja istume liival."],
      say: "[laughs] Mais? Vesi on veel liiga külm! Aga võtame teki kaasa ja istume liival.",
    },
    { voice: "main", text: ["Hea küll, siis jalutame ainult.", "Kirjutame Liisale kohe."] },
    {
      voice: "second",
      text: ["Las ta vastab õhtul.", "Lähme nüüd sööma, ma olen näljane!"],
    },
  ],
};

export const LETS_WORDS = ["las", "koos", "kahekesi", "õues"] as const;

export const LETS_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  "Lähme ujuma!": ["Lähme ujuma!", "Läheme ujuma!"],
  "Las nad mängivad õues.": [
    "Las nad mängivad õues.",
    "Las nad mängivad väljas.",
    "Las nad õues mängivad.",
    "Las nemad mängivad õues.",
    "Las nad mängigu õues.",
    "Las nad õues mängigu.",
    "Las nemad mängivad väljas.",
    "Las nad väljas mängivad.",
    "Las nad mängigu väljas.",
    "Las nad väljas mängigu.",
    "Lase neil õues mängida.",
    "Laske neil õues mängida.",
  ],
  "Las ma aitan sind.": [
    "Las ma aitan sind.",
    "Las mina aitan sind.",
    "Las ma aitan teid.",
    "Las mina aitan teid.",
    "Las ma sind aitan.",
    "Lase mul sind aidata.",
    "Lubage mul teid aidata.",
  ],
  "Sööme koos!": ["Sööme koos!", "Sööme üheskoos!"],
  "Las ta otsustab.": [
    "Las ta otsustab.",
    "Las tema otsustab.",
    "Las ta ise otsustab.",
    "Las ta otsustab ise.",
    "Las tema ise otsustab.",
    "Las ta otsustagu.",
    "Las ta ise otsustagu.",
    "Las tema otsustab ise.",
    "Las ta otsustagu ise.",
    "Lase tal otsustada.",
    "Laske tal otsustada.",
  ],
  "Ostame koogi!": ["Ostame koogi!", "Ostame ühe koogi!", "Ostame tordi!"],
  "Vaatame täna õhtul filmi!": [
    "Vaatame täna õhtul filmi!",
    "Vaatame õhtul filmi!",
    "Täna õhtul vaatame filmi!",
    "Vaatame filmi täna õhtul!",
    "Õhtul vaatame filmi!",
    "Vaatame filmi õhtul!",
  ],
  "Lähme kinno!": ["Lähme kinno!", "Läheme kinno!"],
  "Sööme pitsat!": ["Sööme pitsat!"],
  "Vaatame filmi!": ["Vaatame filmi!"],
  "Mängime õues!": ["Mängime õues!"],
  "Las ta magab.": ["Las ta magab.", "Las ta magagu.", "Las tema magab."],
  "Las lapsed mängivad õues.": [
    "Las lapsed mängivad õues.",
    "Las lapsed mängivad väljas.",
    "Las lapsed õues mängivad.",
    "Las lapsed mängigu õues.",
    "Las lapsed õues mängigu.",
  ],
  "Mine kinno!": ["Mine kinno!"],
  lähme: ["lähme", "läheme"],
};

const LETS_CLIPS: Record<string, Clip> = {
  ...words([
    ...LETS_WORDS,
    ...LETS_VERBS.flatMap(({ n, we, lets }) => [n, we, lets]),
    ...LAS_USES,
    ...LETS_GO_TO,
    ...LETS_GAPS.map(({ before, answer, after }) => `${before} ${answer} ${after}`),
    ...LETS_HEARD.flatMap(({ lets, we, one, las }) => [lets, we, one, las]),
    ...LETS_TRANSLATE,
    ...LETS_FIXES.map(({ right }) => right),
  ]),
  ...LETS_DIALOGUE,
  "c-weekend": LETS_CONVERSATION,
};

export const IMPERSONAL_KINDS = {
  regular: [
    { ma: "rääkima", done: "räägitud", now: "räägitakse", past: "räägiti" },
    { ma: "lugema", done: "loetud", now: "loetakse", past: "loeti" },
    { ma: "elama", done: "elatud", now: "elatakse", past: "elati" },
    { ma: "ootama", done: "oodatud", now: "oodatakse", past: "oodati" },
    { ma: "ehitama", done: "ehitatud", now: "ehitatakse", past: "ehitati" },
    { ma: "kuulma", done: "kuuldud", now: "kuuldakse", past: "kuuldi" },
    { ma: "laulma", done: "lauldud", now: "lauldakse", past: "lauldi" },
    { ma: "saama", done: "saadud", now: "saadakse", past: "saadi" },
  ],
  heart: [
    { ma: "tegema", done: "tehtud", now: "tehakse", past: "tehti" },
    { ma: "nägema", done: "nähtud", now: "nähakse", past: "nähti" },
    { ma: "sööma", done: "söödud", now: "süüakse", past: "söödi" },
    { ma: "jooma", done: "joodud", now: "juuakse", past: "joodi" },
    { ma: "minema", done: "mindud", now: "minnakse", past: "mindi" },
    { ma: "tulema", done: "tuldud", now: "tullakse", past: "tuldi" },
    { ma: "panema", done: "pandud", now: "pannakse", past: "pandi" },
    { ma: "müüma", done: "müüdud", now: "müüakse", past: "müüdi" },
  ],
} as const;

export const IMPERSONAL_USES = [
  "Eestis räägitakse eesti keelt.",
  "Poes müüakse leiba.",
  "Pood avatakse kell üheksa.",
  "See maja ehitati 1920. aastal.",
] as const;

export const IMPERSONAL_FORM_QUIZ = [
  { ma: "rääkima", done: "räägitud", when: "now", answer: "räägitakse" },
  { ma: "lugema", done: "loetud", when: "past", answer: "loeti" },
  { ma: "elama", done: "elatud", when: "now", answer: "elatakse" },
  { ma: "laulma", done: "lauldud", when: "past", answer: "lauldi" },
  { ma: "ehitama", done: "ehitatud", when: "now", answer: "ehitatakse" },
  { ma: "kuulma", done: "kuuldud", when: "now", answer: "kuuldakse" },
  { ma: "tegema", done: "tehtud", when: "past", answer: "tehti" },
  { ma: "ootama", done: "oodatud", when: "past", answer: "oodati" },
] as const;

export const IMPERSONAL_GAPS = [
  {
    id: "raakima-person",
    verb: "rääkima",
    before: "Mari",
    after: "eesti keelt.",
    answer: "räägib",
  },
  {
    id: "raakima-now",
    verb: "rääkima",
    before: "Nüüd",
    after: "siin eesti keelt.",
    answer: "räägitakse",
  },
  {
    id: "raakima-past",
    verb: "rääkima",
    before: "Vanasti",
    after: "siin saksa keelt.",
    answer: "räägiti",
  },
  { id: "ehitama-person", verb: "ehitama", before: "Jaan", after: "maja.", answer: "ehitab" },
  {
    id: "ehitama-now",
    verb: "ehitama",
    before: "Siia",
    after: "järgmisel aastal uus kool.",
    answer: "ehitatakse",
  },
  {
    id: "ehitama-past",
    verb: "ehitama",
    before: "See maja",
    after: "1920. aastal.",
    answer: "ehitati",
  },
  { id: "avama-person", verb: "avama", before: "Kati", after: "akna.", answer: "avab" },
  {
    id: "avama-now",
    verb: "avama",
    before: "Pood",
    after: "iga päev kell üheksa.",
    answer: "avatakse",
  },
  { id: "avama-past", verb: "avama", before: "Uus pood", after: "eile.", answer: "avati" },
] as const;

export const IMPERSONAL_OPTIONS: Record<
  (typeof IMPERSONAL_GAPS)[number]["verb"],
  readonly string[]
> = {
  rääkima: ["räägib", "räägitakse", "räägiti"],
  ehitama: ["ehitab", "ehitatakse", "ehitati"],
  avama: ["avab", "avatakse", "avati"],
};

export const IMPERSONAL_HEARD = [
  { id: "smoke", now: "Siin suitsetatakse.", past: "Siin suitsetati.", no: "Siin ei suitsetata." },
  {
    id: "speak",
    now: "Siin räägitakse eesti keelt.",
    past: "Siin räägiti eesti keelt.",
    no: "Siin ei räägita eesti keelt.",
  },
  {
    id: "repair",
    now: "Siin tehakse remonti.",
    past: "Siin tehti remonti.",
    no: "Siin ei tehta remonti.",
  },
  { id: "fish", now: "Siin süüakse kala.", past: "Siin söödi kala.", no: "Siin ei sööda kala." },
] as const;

export const IMPERSONAL_NO = [
  { from: "Pühapäeval töötatakse.", to: "Pühapäeval ei töötata." },
  { from: "Eile räägiti sellest.", to: "Eile ei räägitud sellest." },
  { from: "Poes müüakse leiba.", to: "Poes ei müüda leiba." },
  { from: "Siin tehakse remonti.", to: "Siin ei tehta remonti." },
  { from: "Seal süüakse liha.", to: "Seal ei sööda liha." },
  { from: "Vanasti tantsiti palju.", to: "Vanasti ei tantsitud palju." },
] as const;

export const IMPERSONAL_TRANSLATE = [
  "Eestis räägitakse eesti keelt.",
  "Pood avatakse kell üheksa.",
  "See maja ehitati 1920. aastal.",
  "Siin ei suitsetata.",
  "Siin müüakse leiba.",
  "Jaanipäeval tehakse lõke.",
  "Pühapäeval ei töötata.",
] as const;

export const IMPERSONAL_FIXES = [
  { wrong: "Eestis räägib eesti keelt.", right: "Eestis räägitakse eesti keelt." },
  { wrong: "Siin ei suitsetatakse.", right: "Siin ei suitsetata." },
  { wrong: "Eile räägitakse sellest.", right: "Eile räägiti sellest." },
  { wrong: "Uus kool ehitab järgmisel aastal.", right: "Uus kool ehitatakse järgmisel aastal." },
  { wrong: "Jaanipäeval tegakse lõke.", right: "Jaanipäeval tehakse lõke." },
  { wrong: "Talvel minakse sauna.", right: "Talvel minnakse sauna." },
  { wrong: "Siin ei räägiti saksa keelt.", right: "Siin ei räägitud saksa keelt." },
] as const;

export const IMPERSONAL_FIX_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  ...Object.fromEntries(IMPERSONAL_FIXES.map(({ right }) => [right, [right]])),
  "Siin ei räägitud saksa keelt.": [
    "Siin ei räägitud saksa keelt.",
    "Siin ei räägita saksa keelt.",
  ],
  "Siin ei suitsetata.": ["Siin ei suitsetata.", "Siin ei suitsetatud."],
};

export const IMPERSONAL_CONVERSATION: Conversation = {
  turns: [
    {
      voice: "second",
      text: "Jaan, mida jaanipäeval Eestis tehakse?",
      say: "[curious] Jaan, mida jaanipäeval Eestis tehakse?",
    },
    {
      voice: "main",
      text: [
        "Oh, see on suur püha.",
        "Jaanilaupäeval sõidetakse maale.",
        "Linnad on siis peaaegu tühjad.",
      ],
    },
    { voice: "second", text: "Ja mida maal tehakse?" },
    {
      voice: "main",
      text: ["Tehakse suur lõke.", "Üle lõkke hüpatakse, see toob õnne."],
    },
    { voice: "second", text: "Kas lõkke ümber ka tantsitakse?" },
    {
      voice: "main",
      text: ["Jah, tantsitakse ja lauldakse vanu laule.", "Kõik laulavad kaasa."],
    },
    { voice: "second", text: "Mida süüakse?" },
    {
      voice: "main",
      text: ["Süüakse grillitud liha ja kartulisalatit.", "Juuakse õlut ja kalja."],
    },
    { voice: "second", text: "Kas kalja tehakse ise?" },
    { voice: "main", text: "Maal tehakse kodus, linnas ostetakse poest." },
    { voice: "second", text: "Kas magama ka minnakse?" },
    {
      voice: "main",
      text: ["Ei minda!", "Jaaniööl ei maga keegi.", "Vanasti otsiti metsast sõnajalaõit."],
      say: "[laughs] Ei minda! Jaaniööl ei maga keegi. Vanasti otsiti metsast sõnajalaõit.",
    },
    { voice: "second", text: "Mis see on?" },
    {
      voice: "main",
      text: [
        "Seda lille tegelikult ei ole olemas.",
        "Aga öeldi, et kes selle leiab, saab rikkaks.",
      ],
    },
    { voice: "second", text: "Kas seda otsitakse ka praegu?" },
    { voice: "main", text: "Mõnikord otsitakse, aga rohkem nalja pärast." },
    { voice: "second", text: "Kas jaanipäeval töötatakse?" },
    {
      voice: "main",
      text: ["Ei, siis ei töötata.", "Kahekümne kolmas ja kahekümne neljas juuni on puhkepäevad."],
    },
    { voice: "second", text: "Ja mida linnas tehakse, kui kõik on maal?" },
    { voice: "main", text: "Linnas peetakse ka pidusid, näiteks Tallinna vabaõhumuuseumis." },
    { voice: "second", text: "Kus sina eelmisel aastal jaani pidasid?" },
    {
      voice: "main",
      text: [
        "Me olime vanaema juures Saaremaal.",
        "Seal tehti mere ääres suur lõke.",
        "Ja hommikul mindi ujuma.",
      ],
    },
    {
      voice: "second",
      text: ["Hommikul vara?", "Vesi oli ju külm!"],
      say: "[surprised] Hommikul vara? Vesi oli ju külm!",
    },
    {
      voice: "main",
      text: "Jah, aga nii tehakse meie peres igal aastal.",
      say: "[laughs] Jah, aga nii tehakse meie peres igal aastal.",
    },
    { voice: "second", text: "Kas teie peres lauldi ka?" },
    { voice: "main", text: "Jah, vanaisa mängis lõõtsa ja kõik laulsid kaasa." },
    { voice: "second", text: ["Mulle meeldib see komme.", "Kas mind ka kutsutakse?"] },
    {
      voice: "main",
      text: ["Muidugi!", "Sel aastal peetakse pidu minu suvilas.", "Seal on saun ka."],
    },
    { voice: "second", text: "Kas sauna minnakse enne lõket?" },
    { voice: "main", text: "Jah, kõigepealt minnakse sauna ja siis süüakse." },
    { voice: "second", text: "Mida ma pean kaasa võtma?" },
    {
      voice: "main",
      text: [
        "Võta kaasa soojad riided ja hea tuju.",
        "Toitu tuuakse nii palju, et kõigile jätkub.",
      ],
    },
    {
      voice: "second",
      text: "Aitäh, ma tulen hea meelega!",
      say: "[cheerful] Aitäh, ma tulen hea meelega!",
    },
  ],
};

export const IMPERSONAL_WORDS = ["vanasti", "jaanipäev", "lõke", "püha", "komme"] as const;

export const IMPERSONAL_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  "Eestis räägitakse eesti keelt.": [
    "Eestis räägitakse eesti keelt.",
    "Eesti keelt räägitakse Eestis.",
  ],
  "Pood avatakse kell üheksa.": [
    "Pood avatakse kell üheksa.",
    "Pood avatakse kell 9.",
    "Kell üheksa avatakse pood.",
    "Pood tehakse lahti kell üheksa.",
    "Kell 9 avatakse pood.",
    "Pood tehakse kell üheksa lahti.",
    "Pood läheb kell üheksa lahti.",
    "Pood läheb lahti kell üheksa.",
    "Kell üheksa tehakse pood lahti.",
  ],
  "See maja ehitati 1920. aastal.": [
    "See maja ehitati 1920. aastal.",
    "See maja ehitati aastal 1920.",
    "1920. aastal ehitati see maja.",
    "See maja on ehitatud 1920. aastal.",
    "See maja on 1920. aastal ehitatud.",
    "See maja on ehitatud aastal 1920.",
  ],
  "Siin ei suitsetata.": [
    "Siin ei suitsetata.",
    "Siin ei tohi suitsetada.",
    "Siin on suitsetamine keelatud.",
    "Suitsetamine on siin keelatud.",
    "Siin suitsetada ei tohi.",
  ],
  "Siin müüakse leiba.": ["Siin müüakse leiba.", "Leiba müüakse siin."],
  "Jaanipäeval tehakse lõke.": [
    "Jaanipäeval tehakse lõke.",
    "Jaanipäeval tehakse lõket.",
    "Lõke tehakse jaanipäeval.",
    "Jaanipäeval teevad inimesed lõkke.",
    "Inimesed teevad jaanipäeval lõkke.",
    "Jaanipäeval süüdatakse lõke.",
  ],
  "Pühapäeval ei töötata.": [
    "Pühapäeval ei töötata.",
    "Pühapäeviti ei töötata.",
    "Inimesed ei tööta pühapäeval.",
    "Pühapäeval inimesed ei tööta.",
    "Pühapäeviti inimesed ei tööta.",
  ],
  "Eile ei räägitud sellest.": [
    "Eile ei räägitud sellest.",
    "Eile sellest ei räägitud.",
    "Sellest ei räägitud eile.",
    "Sellest eile ei räägitud.",
  ],
  "Poes ei müüda leiba.": ["Poes ei müüda leiba.", "Poes leiba ei müüda.", "Leiba poes ei müüda."],
  "Siin ei tehta remonti.": ["Siin ei tehta remonti.", "Siin remonti ei tehta."],
  "Seal ei sööda liha.": ["Seal ei sööda liha.", "Seal liha ei sööda."],
  "Vanasti ei tantsitud palju.": ["Vanasti ei tantsitud palju.", "Vanasti palju ei tantsitud."],
};

const IMPERSONAL_CLIPS: Record<string, Clip> = {
  ...words([
    ...IMPERSONAL_WORDS,
    ...Object.values(IMPERSONAL_KINDS).flatMap((verbs) =>
      verbs.flatMap(({ done, now, past }) => [done, now, past]),
    ),
    ...IMPERSONAL_USES,
    ...IMPERSONAL_GAPS.map(({ before, answer, after }) => `${before} ${answer} ${after}`),
    ...IMPERSONAL_HEARD.flatMap(({ now, past, no }) => [now, past, no]),
    ...IMPERSONAL_NO.map(({ to }) => to),
    ...IMPERSONAL_TRANSLATE,
    ...IMPERSONAL_FIXES.map(({ right }) => right),
  ]),
  "c-midsummer": IMPERSONAL_CONVERSATION,
};

export const GOVERNMENT_KINDS = {
  part: [
    { verb: "ootama", said: "Ma ootan sind." },
    { verb: "aitama", said: "Ma aitan sind." },
    { verb: "armastama", said: "Ma armastan sind." },
    { verb: "tänama", said: "Ma tänan sind." },
  ],
  from: [
    { verb: "rääkima", said: "Ma räägin sinust." },
    { verb: "hoolima", said: "Ma hoolin sinust." },
    { verb: "unistama", said: "Ma unistan sinust." },
    { verb: "aru saama", said: "Ma saan sinust aru." },
  ],
  to: [
    { verb: "helistama", said: "Ma helistan sulle." },
    { verb: "kirjutama", said: "Ma kirjutan sulle." },
    { verb: "vastama", said: "Ma vastan sulle." },
    { verb: "ütlema", said: "Ma ütlen sulle." },
  ],
  with: [
    { verb: "kohtuma", said: "Ma kohtun sinuga." },
    { verb: "abielluma", said: "Ma abiellun sinuga." },
    { verb: "rääkima", said: "Ma räägin sinuga." },
  ],
  off: [
    { verb: "küsima", said: "Ma küsin sinult." },
    { verb: "laenama", said: "Ma laenan sinult raha." },
    { verb: "saama", said: "Ma sain sinult kirja." },
  ],
} as const;

export const GOVERNMENT_QUESTIONS = [
  "keda?",
  "kellest?",
  "kellele?",
  "kellega?",
  "kellelt?",
] as const;

export const GOVERNMENT_FORM_QUIZ = [
  { noun: "Mari", cue: "Ma ootan …", answer: "Marit", said: "Ma ootan Marit." },
  { noun: "sõber", cue: "Ma hoolin oma …", answer: "sõbrast", said: "Ma hoolin oma sõbrast." },
  { noun: "ema", cue: "Ma helistan …", answer: "emale", said: "Ma helistan emale." },
  { noun: "Jaan", cue: "Ma kohtun homme …", answer: "Jaaniga", said: "Ma kohtun homme Jaaniga." },
  { noun: "õde", cue: "Ma küsin …", answer: "õelt", said: "Ma küsin õelt." },
  { noun: "vend", cue: "Ma tänan …", answer: "venda", said: "Ma tänan venda." },
  { noun: "õpetaja", cue: "Ma vastan …", answer: "õpetajale", said: "Ma vastan õpetajale." },
  { noun: "puhkus", cue: "Ma unistan …", answer: "puhkusest", said: "Ma unistan puhkusest." },
] as const;

export const GOVERNMENT_FORM_ALSO: Record<string, readonly string[]> = { õelt: ["õe käest"] };

export const GOVERNMENT_GAPS = [
  { id: "wait-part", before: "Ma ootan", after: "kell viis.", answer: "sind", fits: ["sinuga"] },
  { id: "help-part", before: "Kas ma võin", after: "aidata?", answer: "sind" },
  { id: "care-from", before: "Ma hoolin", after: "väga.", answer: "sinust" },
  { id: "understand-from", before: "Ma ei saa", after: "aru.", answer: "sinust" },
  { id: "call-to", before: "Ma helistan", after: "homme.", answer: "sulle" },
  { id: "answer-to", before: "Ma vastan", after: "kohe.", answer: "sulle" },
  { id: "meet-with", before: "Jaan tahab", after: "kohtuda.", answer: "sinuga" },
  { id: "marry-with", before: "Kas sa abiellud", after: "?", answer: "minuga" },
  { id: "ask-off", before: "Ma tahan", after: "nõu küsida.", answer: "sinult" },
  { id: "letter-off", before: "Ma sain", after: "kirja.", answer: "sinult" },
] as const;

export const GOVERNMENT_OPTIONS: Record<
  (typeof GOVERNMENT_GAPS)[number]["answer"],
  readonly string[]
> = {
  sind: ["sind", "sinust", "sulle", "sinuga", "sinult"],
  sinust: ["sind", "sinust", "sulle", "sinuga", "sinult"],
  sulle: ["sind", "sinust", "sulle", "sinuga", "sinult"],
  sinuga: ["sind", "sinust", "sulle", "sinuga", "sinult"],
  minuga: ["mind", "minust", "mulle", "minuga", "minult"],
  sinult: ["sind", "sinust", "sulle", "sinuga", "sinult"],
};

export const GOVERNMENT_HEARD = [
  { id: "sina", from: "Ma räägin sinust.", to: "Ma räägin sulle.", with: "Ma räägin sinuga." },
  { id: "ema", from: "Mari räägib emast.", to: "Mari räägib emale.", with: "Mari räägib emaga." },
  {
    id: "peeter",
    from: "Jaan räägib Peetrist.",
    to: "Jaan räägib Peetrile.",
    with: "Jaan räägib Peetriga.",
  },
] as const;

export const GOVERNMENT_TRANSLATE = [
  "Ma ootan sind.",
  "Ma helistan sulle homme.",
  "Me kohtusime Jaaniga.",
  "Mari hoolib oma vennast.",
  "Kas ma võin sinult midagi küsida?",
  "Ma tänan sind abi eest.",
  "Ma ei saa sinust aru.",
] as const;

export const GOVERNMENT_FIXES = [
  { wrong: "Ma aitan sulle.", right: "Ma aitan sind." },
  { wrong: "Ma helistan sind homme.", right: "Ma helistan sulle homme." },
  { wrong: "Ma kohtun sind kohvikus.", right: "Ma kohtun sinuga kohvikus." },
  { wrong: "Ma tänan sulle.", right: "Ma tänan sind." },
  { wrong: "Ma küsin sind midagi.", right: "Ma küsin sinult midagi." },
  { wrong: "Ma vastan sind kohe.", right: "Ma vastan sulle kohe." },
  { wrong: "Ma hoolin sind.", right: "Ma hoolin sinust." },
] as const;

export const GOVERNMENT_DIALOGUE = {
  "d-kadri-1": { text: "Tere! Kas sa said minu kirja?", voice: "second" },
  "d-sina-1": "Jah, aitäh! Ma vastan sulle õhtul.",
  "d-kadri-2": { text: "Kas me kohtume homme?", voice: "second" },
  "d-sina-2": "Jah, ma kohtun sinuga hea meelega.",
  "d-kadri-3": { text: "Siis ma räägin sulle oma uuest tööst.", voice: "second" },
  "d-sina-3": "Ma ootan seda väga!",
} as const satisfies Record<string, Clip>;

export const GOVERNMENT_CONVERSATION: Conversation = {
  turns: [
    {
      voice: "second",
      text: "Jaan, kas sa kuulsid, et mu vend Peeter abiellub?",
      say: "[cheerful] Jaan, kas sa kuulsid, et mu vend Peeter abiellub?",
    },
    { voice: "main", text: ["Ei kuulnud!", "Kellega ta abiellub?"] },
    { voice: "second", text: "Ta abiellub Liisaga, kellega ta kohtus kaks aastat tagasi Tartus." },
    { voice: "main", text: "Ma mäletan Liisat, ta töötas kunagi minu sõbraga samas kontoris." },
    {
      voice: "second",
      text: ["Jah, ja Peeter räägib temast iga päev."],
      say: "[laughs] Jah, ja Peeter räägib temast iga päev.",
    },
    { voice: "main", text: ["Kui tore!", "Millal pulm on?"] },
    {
      voice: "second",
      text: [
        "Pulm on juulis ja Peeter helistas mulle eile õhtul.",
        "Ma pean ema aitama, sest tema korraldab peo.",
        "Ma helistan kõigile külalistele ja kirjutan neile kutsed.",
      ],
    },
    { voice: "main", text: "Kas sa oled Liisaga juba kohtunud?" },
    {
      voice: "second",
      text: [
        "Ainult üks kord, aga me rääkisime terve õhtu muusikast.",
        "Ta hoolib muusikast väga ja mängib ise klaverit.",
      ],
    },
    { voice: "main", text: "Mina olen klaverist alati unistanud, aga mul pole aega." },
    { voice: "second", text: "Sa võiksid Liisalt tunde võtta, ta õpetab lapsi." },
    { voice: "main", text: ["Huvitav mõte.", "Aga mida sa neile kingid?"] },
    {
      voice: "second",
      text: [
        "Ma ei tea veel, ma pean Peetrilt küsima.",
        "Võib-olla kingin neile midagi kodu jaoks.",
      ],
    },
    { voice: "main", text: "Ma võin sind poes aidata, kui sa tahad." },
    { voice: "second", text: "Aitäh, see oleks tore, ma helistan sulle reedel." },
    { voice: "main", text: "Mis kell me kohtume ja kus?" },
    { voice: "second", text: "Kohtume kell viis kaubanduskeskuse ees, ma ootan sind seal." },
    { voice: "main", text: ["Hästi.", "Kas sa vastasid juba Peetri kutsele?"] },
    {
      voice: "second",
      text: [
        "Veel mitte, ma tahtsin enne sinuga rääkida.",
        "Peeter kutsus ka sind, sest ta mäletab sind ülikoolist.",
      ],
    },
    {
      voice: "main",
      text: [
        "Tõesti?",
        "Ma ei ole temaga ammu rääkinud.",
        "Ma kirjutan talle täna ja tänan teda kutse eest.",
      ],
      say: "[surprised] Tõesti? Ma ei ole temaga ammu rääkinud. Ma kirjutan talle täna ja tänan teda kutse eest.",
    },
    { voice: "second", text: "Hea mõte, ta ootab sinult kindlasti vastust." },
    { voice: "main", text: "Kas ma pean Liisale midagi ütlema, kui me kohtume?" },
    { voice: "second", text: "Lihtsalt õnnitle neid, see on täiesti piisav." },
    { voice: "main", text: "Ja mida ma Peetrile ütlen, kui me pulmas kohtume?" },
    { voice: "second", text: "Ütle talle, et sa oled tema pärast väga rõõmus." },
    { voice: "main", text: "Kas pulm on Tartus või Tallinnas?" },
    {
      voice: "second",
      text: [
        "Tartus, Liisa vanemate maakodus, kus on suur aed.",
        "Ja ära räägi Peetrile, et ma temast sulle rääkisin!",
      ],
      say: "Tartus, Liisa vanemate maakodus, kus on suur aed. [laughs] Ja ära räägi Peetrile, et ma temast sulle rääkisin!",
    },
    {
      voice: "main",
      text: ["Ma ei ütle kellelegi midagi, ma luban.", "Ma ootan seda pulma juba väga."],
    },
    { voice: "second", text: "Mina ka, ja ma loodan, et ilm on ilus." },
  ],
};

export const GOVERNMENT_WORDS = ["keda", "kellest", "kellele", "kellega", "kellelt"] as const;

export const GOVERNMENT_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  "Ma ootan sind.": [
    "Ma ootan sind.",
    "Ootan sind.",
    "Mina ootan sind.",
    "Ma ootan teid.",
    "Ootan teid.",
    "Mina ootan teid.",
  ],
  "Ma helistan sulle homme.": [
    "Ma helistan sulle homme.",
    "Homme ma helistan sulle.",
    "Ma helistan homme sulle.",
    "Helistan sulle homme.",
    "Mina helistan sulle homme.",
    "Helistan homme sulle.",
    "Mina helistan homme sulle.",
    "Homme helistan ma sulle.",
    "Homme helistan ma sinule.",
    "Homme helistan mina sinule.",
    "Homme helistan sulle.",
    "Ma helistan sinule homme.",
    "Ma helistan teile homme.",
    "Helistan teile homme.",
    "Homme helistan ma teile.",
    "Homme helistan teile.",
    "Homme ma helistan teile.",
    "Homme mina helistan sulle.",
    "Homme helistan mina sulle.",
    "Mina helistan sinule homme.",
    "Helistan sinule homme.",
    "Mina helistan teile homme.",
    "Homme helistan mina teile.",
    "Homme mina helistan teile.",
    "Ma helistan homme sinule.",
    "Homme helistan sinule.",
    "Homme ma helistan sinule.",
    "Ma helistan homme teile.",
    "Helistan homme teile.",
    "Mina helistan homme sinule.",
    "Helistan homme sinule.",
    "Homme mina helistan sinule.",
    "Mina helistan homme teile.",
  ],
  "Me kohtusime Jaaniga.": [
    "Me kohtusime Jaaniga.",
    "Kohtusime Jaaniga.",
    "Meie kohtusime Jaaniga.",
    "Me saime Jaaniga kokku.",
    "Saime Jaaniga kokku.",
    "Me saime kokku Jaaniga.",
    "Meie saime Jaaniga kokku.",
    "Meie saime kokku Jaaniga.",
    "Saime kokku Jaaniga.",
    "Me kohtasime Jaani.",
    "Kohtasime Jaani.",
    "Meie kohtasime Jaani.",
  ],
  "Mari hoolib oma vennast.": [
    "Mari hoolib oma vennast.",
    "Mari hoolib vennast.",
    "Mari hoolib enda vennast.",
  ],
  "Kas ma võin sinult midagi küsida?": [
    "Kas ma võin sinult midagi küsida?",
    "Kas ma tohin sinult midagi küsida?",
    "Kas ma saan sinult midagi küsida?",
    "Kas ma võin sult midagi küsida?",
    "Kas ma tohin sult midagi küsida?",
    "Kas ma saan sult midagi küsida?",
    "Võin ma sinult midagi küsida?",
    "Võin ma sult midagi küsida?",
    "Kas võin sinult midagi küsida?",
    "Kas ma võiksin sinult midagi küsida?",
    "Kas ma võiksin sult midagi küsida?",
    "Kas ma võin sinu käest midagi küsida?",
    "Kas ma võin sinult küsida midagi?",
    "Kas ma võin teilt midagi küsida?",
    "Kas võin teilt midagi küsida?",
    "Kas ma tohin teilt midagi küsida?",
    "Kas ma saan teilt midagi küsida?",
    "Kas ma võiksin teilt midagi küsida?",
    "Kas ma saaksin sinult midagi küsida?",
    "Kas mina saaksin sinult midagi küsida?",
    "Kas saaksin sinult midagi küsida?",
    "Kas ma saaksin sult midagi küsida?",
    "Kas mina saaksin sult midagi küsida?",
    "Kas saaksin sult midagi küsida?",
    "Kas ma saaksin teilt midagi küsida?",
    "Kas mina saaksin teilt midagi küsida?",
    "Kas saaksin teilt midagi küsida?",
    "Kas ma tohiksin sinult midagi küsida?",
    "Kas mina tohiksin sinult midagi küsida?",
    "Kas tohiksin sinult midagi küsida?",
    "Kas ma tohiksin sult midagi küsida?",
    "Kas mina tohiksin sult midagi küsida?",
    "Kas tohiksin sult midagi küsida?",
    "Kas ma tohiksin teilt midagi küsida?",
    "Kas mina tohiksin teilt midagi küsida?",
    "Kas tohiksin teilt midagi küsida?",
    "Kas ma võiksin sinu käest midagi küsida?",
    "Kas mina võiksin sinu käest midagi küsida?",
    "Kas võiksin sinu käest midagi küsida?",
    "Kas ma võiksin teie käest midagi küsida?",
    "Kas mina võiksin teie käest midagi küsida?",
    "Kas võiksin teie käest midagi küsida?",
    "Kas ma võin teie käest midagi küsida?",
    "Kas mina võin sinult midagi küsida?",
    "Kas mina tohin sinult midagi küsida?",
    "Kas tohin sinult midagi küsida?",
    "Kas mina saan sinult midagi küsida?",
    "Kas saan sinult midagi küsida?",
    "Kas mina võin sult midagi küsida?",
    "Kas võin sult midagi küsida?",
    "Kas mina tohin sult midagi küsida?",
    "Kas tohin sult midagi küsida?",
    "Kas mina saan sult midagi küsida?",
    "Kas saan sult midagi küsida?",
    "Võin mina sinult midagi küsida?",
    "Võin sinult midagi küsida?",
    "Võin mina sult midagi küsida?",
    "Võin sult midagi küsida?",
    "Kas mina võiksin sinult midagi küsida?",
    "Kas võiksin sinult midagi küsida?",
    "Kas mina võiksin sult midagi küsida?",
    "Kas võiksin sult midagi küsida?",
    "Kas mina võin sinu käest midagi küsida?",
    "Kas võin sinu käest midagi küsida?",
    "Kas mina võin sinult küsida midagi?",
    "Kas võin sinult küsida midagi?",
    "Kas mina võin teilt midagi küsida?",
    "Kas mina tohin teilt midagi küsida?",
    "Kas tohin teilt midagi küsida?",
    "Kas mina saan teilt midagi küsida?",
    "Kas saan teilt midagi küsida?",
    "Kas mina võiksin teilt midagi küsida?",
    "Kas võiksin teilt midagi küsida?",
    "Kas mina võin teie käest midagi küsida?",
    "Kas võin teie käest midagi küsida?",
    "Tohin ma sinult midagi küsida?",
    "Saan ma sinult midagi küsida?",
    "Kas ma tohin sinu käest midagi küsida?",
    "Kas ma saan sinu käest midagi küsida?",
    "Tohin mina sinult midagi küsida?",
    "Tohin sinult midagi küsida?",
    "Saan mina sinult midagi küsida?",
    "Saan sinult midagi küsida?",
    "Kas mina tohin sinu käest midagi küsida?",
    "Kas tohin sinu käest midagi küsida?",
    "Kas mina saan sinu käest midagi küsida?",
    "Kas saan sinu käest midagi küsida?",
  ],
  "Ma tänan sind abi eest.": [
    "Ma tänan sind abi eest.",
    "Tänan sind abi eest.",
    "Mina tänan sind abi eest.",
    "Tänan abi eest.",
    "Ma tänan teid abi eest.",
    "Tänan teid abi eest.",
  ],
  "Ma ei saa sinust aru.": [
    "Ma ei saa sinust aru.",
    "Ei saa sinust aru.",
    "Mina ei saa sinust aru.",
    "Ma ei saa sust aru.",
    "Ei saa sust aru.",
    "Ma ei mõista sind.",
    "Mina ei saa sust aru.",
    "Ma ei saa teist aru.",
    "Ei saa teist aru.",
    "Mina ei saa teist aru.",
    "Ma ei mõista teid.",
    "Mina ei mõista sind.",
    "Mina ei mõista teid.",
  ],
  "Ma räägin sinust.": [
    "Ma räägin sinust.",
    "Räägin sinust.",
    "Mina räägin sinust.",
    "Ma räägin sust.",
    "Räägin sust.",
    "Ma räägin teist.",
    "Mina räägin sust.",
    "Mina räägin teist.",
    "Räägin teist.",
    "Ma räägin sinu kohta.",
    "Räägin sinu kohta.",
    "Ma räägin teie kohta.",
    "Mina räägin sinu kohta.",
    "Mina räägin teie kohta.",
    "Räägin teie kohta.",
  ],
};

export const GOVERNMENT_FIX_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  ...Object.fromEntries(GOVERNMENT_FIXES.map(({ right }) => [right, [right]])),
  "Ma helistan sulle homme.": ["Ma helistan sulle homme.", "Ma helistan sinule homme."],
  "Ma vastan sulle kohe.": ["Ma vastan sulle kohe.", "Ma vastan sinule kohe."],
  "Ma hoolin sinust.": ["Ma hoolin sinust.", "Ma hoolin sust."],
  "Ma küsin sinult midagi.": ["Ma küsin sinult midagi.", "Ma küsin sult midagi."],
};

const GOVERNMENT_CLIPS: Record<string, Clip> = {
  ...words([
    ...GOVERNMENT_WORDS,
    ...Object.values(GOVERNMENT_KINDS).flatMap((verbs) =>
      verbs.flatMap(({ verb, said }) => [verb, said]),
    ),
    ...GOVERNMENT_FORM_QUIZ.map(({ said }) => said),
    ...GOVERNMENT_GAPS.map(
      ({ before, answer, after }) =>
        `${before} ${answer}${/^[.!?]$/.test(after) ? "" : " "}${after}`,
    ),
    ...GOVERNMENT_HEARD.flatMap(({ from, to, with: withIt }) => [from, to, withIt]),
    ...GOVERNMENT_TRANSLATE,
    ...GOVERNMENT_FIXES.map(({ right }) => right),
  ]),
  ...GOVERNMENT_DIALOGUE,
  "c-wedding": GOVERNMENT_CONVERSATION,
};

export const LETTER_MESSAGE = [
  "Tere, proua Tamm!",
  "Ma elan teie korteris Tartu tänaval number neli.",
  "Kirjutan teile, sest meie köögis on kraan katki läinud.",
  "Vesi tilgub juba kolm päeva ja öösel on seda väga hästi kuulda.",
  "Ma proovisin kraani ise kinni keerata, aga see ei aidanud.",
  "Kraan on vana ja ma arvan, et see tuleb välja vahetada.",
  "Kas te saaksite sel nädalal meistri saata?",
  "Ma olen kodus esmaspäeval ja teisipäeval pärast kella viit.",
  "Kolmapäeval olen ma terve päeva tööl, aga minu naaber võib meistri sisse lasta.",
  "Tema nimi on Jaan ja ta elab korteris number kaks.",
  "Ma annan talle võtme, nii et meister ei pea mind ootama.",
  "Lisaks tahtsin küsida, kas meister võiks ka vannitoa lambi üle vaadata.",
  "See vilgub mõnikord, kui ma tule põlema panen.",
  "Ma ei tea, kas viga on lambis või juhtmes.",
  "Kui teil on küsimusi, helistage mulle palun õhtul.",
  "Aitäh ette!",
] as const;

export const LETTER_PHRASES = [
  "Kirjutan teile, sest köögis on kraan katki.",
  "Kas te saaksite meistri saata?",
  "Kas oleks võimalik homme tulla?",
  "Ma olen kodus pärast kella viit.",
  "Aitäh ette!",
  "Lugupidamisega",
] as const;

export const LETTER_GAPS = [
  { id: "lainud", before: "Meie köögis on kraan katki", after: ".", answer: "läinud" },
  { id: "mulle", before: "Proua Tamm vastas", after: "kohe.", answer: "mulle" },
  { id: "tuleb", before: "Homme", after: "meister kell kümme.", answer: "tuleb" },
  {
    id: "voiksin",
    before: "Ma",
    after: "uue kraani ise osta, aga see on kallis.",
    answer: "võiksin",
  },
  { id: "kodus", before: "Hommikul olen ma", after: "ja ootan teda.", answer: "kodus" },
] as const;

export const LETTER_SPARE = ["läks", "mind", "kodust"] as const;

export const LETTER_FIXES = [
  { wrong: "Kas te saaksid meistri saata?", right: "Kas te saaksite meistri saata?" },
  { wrong: "Ma helistan teid homme.", right: "Ma helistan teile homme." },
  { wrong: "Kraan on katki minnud.", right: "Kraan on katki läinud." },
  { wrong: "Vesi tilgub juba kolm päevad.", right: "Vesi tilgub juba kolm päeva." },
  { wrong: "Ma olen kodus esmaspäevas.", right: "Ma olen kodus esmaspäeval." },
  { wrong: "Ma ootan teie vastus.", right: "Ma ootan teie vastust." },
  { wrong: "Ma olen teile väga tänulikud.", right: "Ma olen teile väga tänulik." },
] as const;

export const LETTER_TRANSLATE = [
  "Meie köögis on kraan katki.",
  "Kas te saaksite meistri saata?",
  "Ma olen esmaspäeval pärast kella viit kodus.",
  "Aitäh ette!",
  "Palun helistage mulle õhtul.",
  "Vesi tilgub juba kolm päeva.",
  "Lugupidamisega",
] as const;

export const LETTER_DIALOGUE = {
  "d-meister-1": { text: "Tere, siin meister. Mis juhtus?", voice: "second" },
  "d-sina-1": "Köögis on kraan katki läinud.",
  "d-meister-2": { text: "Kas te olete seda ise parandanud?", voice: "second" },
  "d-sina-2": "Ei, ma ei ole seda parandanud.",
  "d-meister-3": {
    text: "Homme ma ei saa. Kas ma võiksin ülehomme hommikul tulla?",
    voice: "second",
  },
  "d-sina-3": "Kas te saaksite pigem õhtul tulla?",
  "d-meister-4": { text: "Hästi. Ma helistan teile enne.", voice: "second" },
  "d-sina-4": "Aitäh, ma ootan teid.",
} as const satisfies Record<string, Clip>;

export const LETTER_MODEL_BODY = [
  "Tere, härra Saar!",
  "Kirjutan teile, sest meie vannitoas ei tööta lamp.",
  "See läks eile õhtul katki.",
  "Pirni vahetasin juba ära, aga see ei aidanud.",
  "Kas te saaksite sel nädalal elektriku saata?",
  "Ma olen kodus neljapäeval ja reedel pärast kella kuut.",
  "Palun helistage mulle enne.",
] as const;

export const LETTER_MODEL = [...LETTER_MODEL_BODY, "Aitäh ette!"] as const;

export const LETTER_MODEL_SIGN = ["Lugupidamisega", "Mari Mets"] as const;

export const LETTER_CONVERSATION: Conversation = {
  turns: [
    { voice: "second", text: ["Tere, siin Tamm.", "Kuidas ma saan teid aidata?"] },
    {
      voice: "main",
      text: [
        "Tere, proua Tamm!",
        "Siin Jaan, korterist number kaks.",
        "Ma helistan, sest meie elutoas on radiaator külm.",
      ],
    },
    { voice: "second", text: "Kui kaua see juba külm on olnud?" },
    { voice: "main", text: "Juba kolm päeva ja öösel on toas ainult viisteist kraadi." },
    {
      voice: "second",
      text: ["See on tõesti liiga külm, vabandust.", "Kas te proovisite radiaatorit ise õhutada?"],
    },
    {
      voice: "main",
      text: [
        "Jah, ma proovisin, aga see ei aidanud.",
        "Ma keerasin ka termostaadi kõige suuremaks, aga midagi ei muutunud.",
      ],
    },
    {
      voice: "second",
      text: [
        "Siis ma saadan teile meistri, kes tunneb neid radiaatoreid hästi.",
        "Kas te olete neljapäeval kodus?",
      ],
    },
    {
      voice: "main",
      text: [
        "Neljapäeval olen ma tööl kella neljani.",
        "Aga minu naabrinaine Mari võib meistri sisse lasta.",
      ],
    },
    { voice: "second", text: "Kas Mari teab, kus radiaator on ja mida meister peab vaatama?" },
    { voice: "main", text: "Jah, ta on mitu korda meil külas käinud, ma selgitan talle kõik." },
    {
      voice: "second",
      text: ["See sobib väga hästi.", "Meister tuleb neljapäeval kell kaks."],
    },
    {
      voice: "main",
      text: ["Suurepärane, ma ütlen Marile kohe.", "Ja veel üks asi: köögis tilgub kraan."],
    },
    { voice: "second", text: "Kas see tilgub palju või ainult natuke?" },
    { voice: "main", text: "Natuke, aga öösel on seda hästi kuulda." },
    { voice: "second", text: "Kas te olete kraani ise proovinud parandada?" },
    { voice: "main", text: "Ei, sest ma kardan, et teen asja ainult hullemaks." },
    { voice: "second", text: "Siis vaatab meister selle ka neljapäeval üle." },
    { voice: "main", text: ["Aitäh, see on väga hea.", "Kas ma pean meistrile midagi maksma?"] },
    {
      voice: "second",
      text: [
        "Ei, seda maksan mina, sest see on üürileandja töö.",
        "Aga palun kirjutage mulle pärast, kas kõik töötab.",
      ],
    },
    { voice: "main", text: "Muidugi, ma saadan teile reedel kirja." },
    {
      voice: "second",
      text: [
        "Väga hea, siis ma tean, kas meister tegi oma töö korralikult.",
        "Ja kas te mäletate, et järgmisest kuust on üür natuke kõrgem?",
      ],
    },
    { voice: "main", text: "Jah, ma lugesin teie kirja, kaheksasada eurot kuus." },
    {
      voice: "second",
      text: ["Just nii.", "Aga radiaatori parandus ei maksa teile midagi."],
    },
    {
      voice: "main",
      text: [
        "Hea teada.",
        "Kas üüri võib maksta ka iga kuu viiendaks kuupäevaks, mitte esimeseks?",
      ],
    },
    { voice: "second", text: "Jah, see sobib, kirjutage see palun ka oma kirja." },
    {
      voice: "main",
      text: "Aitäh, et te nii kiiresti vastasite!",
      say: "[cheerful] Aitäh, et te nii kiiresti vastasite!",
    },
    { voice: "second", text: ["Pole tänu väärt.", "Head õhtut, Jaan!"] },
    { voice: "main", text: "Head õhtut!" },
  ],
};

export const LETTER_WORDS = [
  "kiri",
  "üürileandja",
  "kraan",
  "katki",
  "meister",
  "parandama",
  "tilkuma",
  "lugupidamisega",
] as const;

export const LETTER_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  "Meie köögis on kraan katki.": [
    "Meie köögis on kraan katki.",
    "Meie köögi kraan on katki.",
    "Köögis on kraan katki.",
    "Meie köögis on kraan katki läinud.",
    "Meie köögi kraan on katki läinud.",
    "Köögi kraan on katki.",
    "Meil on köögis kraan katki.",
    "Meie köögikraan on katki.",
    "Kraan meie köögis on katki.",
    "Meie köögikraan on katki läinud.",
    "Meil on köögis kraan katki läinud.",
    "Meil on köögikraan katki.",
  ],
  "Kas te saaksite meistri saata?": [
    "Kas te saaksite meistri saata?",
    "Kas te võiksite meistri saata?",
    "Kas te saaksite saata meistri?",
    "Kas saaksite meistri saata?",
    "Kas võiksite meistri saata?",
    "Kas saaksite saata meistri?",
    "Kas te võiksite saata meistri?",
    "Saaksite te meistri saata?",
    "Kas sa saaksid meistri saata?",
    "Kas sa võiksid meistri saata?",
    "Kas teie saaksite meistri saata?",
    "Kas teie võiksite meistri saata?",
    "Kas teie saaksite saata meistri?",
    "Kas teie võiksite saata meistri?",
    "Kas võiksite saata meistri?",
    "Kas sina saaksid meistri saata?",
    "Kas saaksid meistri saata?",
    "Kas sina võiksid meistri saata?",
    "Kas võiksid meistri saata?",
    "Kas te saaksite palun meistri saata?",
    "Kas te saaksite meistri saata, palun?",
    "Kas teie saaksite palun meistri saata?",
    "Kas saaksite palun meistri saata?",
    "Kas teie saaksite meistri saata, palun?",
    "Kas saaksite meistri saata, palun?",
    "Kas te võiksite palun meistri saata?",
    "Kas teie võiksite palun meistri saata?",
    "Kas võiksite palun meistri saata?",
    "Kas te võiksite meistri saata, palun?",
    "Kas teie võiksite meistri saata, palun?",
    "Kas võiksite meistri saata, palun?",
  ],
  "Ma olen esmaspäeval pärast kella viit kodus.": [
    "Ma olen esmaspäeval pärast kella viit kodus.",
    "Olen esmaspäeval pärast kella viit kodus.",
    "Mina olen esmaspäeval pärast kella viit kodus.",
    "Ma olen kodus esmaspäeval pärast kella viit.",
    "Esmaspäeval pärast kella viit olen ma kodus.",
    "Esmaspäeval olen ma pärast kella viit kodus.",
    "Ma olen esmaspäeval kodus pärast kella viit.",
    "Olen kodus esmaspäeval pärast kella viit.",
    "Esmaspäeval olen ma kodus pärast kella viit.",
    "Esmaspäeval olen pärast kella viit kodus.",
    "Esmaspäeval pärast kella viit olen kodus.",
    "Mina olen esmaspäeval kodus pärast kella viit.",
    "Mina olen kodus esmaspäeval pärast kella viit.",
    "Ma olen esmaspäeval pärast viit kodus.",
    "Ma olen kodus esmaspäeval pärast viit.",
    "Esmaspäeval pärast viit olen ma kodus.",
    "Esmaspäeval pärast kella viit olen mina kodus.",
    "Esmaspäeval olen mina pärast kella viit kodus.",
    "Olen esmaspäeval kodus pärast kella viit.",
    "Esmaspäeval olen mina kodus pärast kella viit.",
    "Esmaspäeval olen kodus pärast kella viit.",
    "Mina olen esmaspäeval pärast viit kodus.",
    "Olen esmaspäeval pärast viit kodus.",
    "Mina olen kodus esmaspäeval pärast viit.",
    "Olen kodus esmaspäeval pärast viit.",
    "Esmaspäeval pärast viit olen mina kodus.",
    "Esmaspäeval pärast viit olen kodus.",
    "Esmaspäeval olen ma pärast viit kodus.",
    "Esmaspäeval olen ma kodus pärast viit.",
    "Ma olen esmaspäeval kodus pärast viit.",
    "Esmaspäeval olen mina pärast viit kodus.",
    "Esmaspäeval olen pärast viit kodus.",
    "Esmaspäeval olen mina kodus pärast viit.",
    "Esmaspäeval olen kodus pärast viit.",
    "Mina olen esmaspäeval kodus pärast viit.",
    "Olen esmaspäeval kodus pärast viit.",
  ],
  "Aitäh ette!": [
    "Aitäh ette!",
    "Tänan ette!",
    "Aitäh juba ette!",
    "Tänan juba ette!",
    "Tänan teid ette!",
    "Tänan teid juba ette!",
    "Ette tänades!",
  ],
  "Palun helistage mulle õhtul.": [
    "Palun helistage mulle õhtul.",
    "Helistage mulle palun õhtul.",
    "Helistage mulle õhtul, palun.",
    "Helistage palun mulle õhtul.",
    "Palun helista mulle õhtul.",
    "Helista mulle palun õhtul.",
    "Helista mulle õhtul, palun.",
    "Helista palun mulle õhtul.",
    "Palun helistage õhtul mulle.",
    "Palun helista õhtul mulle.",
  ],
  "Vesi tilgub juba kolm päeva.": [
    "Vesi tilgub juba kolm päeva.",
    "Vesi on juba kolm päeva tilkunud.",
    "Vesi on tilkunud juba kolm päeva.",
    "Juba kolm päeva tilgub vesi.",
    "Vesi on kolm päeva tilkunud.",
    "Vesi tilgub juba kolmandat päeva.",
    "Juba kolm päeva on vesi tilkunud.",
    "Vesi on tilkunud kolm päeva.",
  ],
  Lugupidamisega: ["Lugupidamisega", "Austusega"],
  "Kas oleks võimalik homme tulla?": [
    "Kas oleks võimalik homme tulla?",
    "Kas te saaksite homme tulla?",
    "Kas te võiksite homme tulla?",
    "Kas teil oleks võimalik homme tulla?",
    "Kas homme oleks võimalik tulla?",
    "Kas oleks võimalik tulla homme?",
    "Kas teie saaksite homme tulla?",
    "Kas saaksite homme tulla?",
    "Kas teie võiksite homme tulla?",
    "Kas võiksite homme tulla?",
    "Kas teil oleks homme võimalik tulla?",
    "Kas homme oleks teil võimalik tulla?",
  ],
  "Ma olen kodus pärast kella viit.": [
    "Ma olen kodus pärast kella viit.",
    "Ma olen pärast kella viit kodus.",
    "Pärast kella viit olen ma kodus.",
    "Olen kodus pärast kella viit.",
    "Olen pärast kella viit kodus.",
    "Pärast kella viit olen kodus.",
    "Mina olen kodus pärast kella viit.",
    "Ma olen kodus pärast viit.",
    "Mina olen pärast kella viit kodus.",
    "Pärast kella viit olen mina kodus.",
    "Mina olen kodus pärast viit.",
    "Olen kodus pärast viit.",
    "Ma olen pärast viit kodus.",
    "Pärast viit olen ma kodus.",
    "Pärast viit olen kodus.",
    "Mina olen pärast viit kodus.",
    "Olen pärast viit kodus.",
    "Pärast viit olen mina kodus.",
  ],
  "Kirjutan teile, sest köögis on kraan katki.": [
    "Kirjutan teile, sest köögis on kraan katki.",
    "Ma kirjutan teile, sest köögis on kraan katki.",
    "Kirjutan teile, sest meie köögis on kraan katki.",
    "Kirjutan teile, sest köögi kraan on katki.",
    "Ma kirjutan teile, sest meie köögis on kraan katki.",
    "Kirjutan teile, sest meie köögi kraan on katki.",
    "Kirjutan teile, sest meil on köögis kraan katki.",
    "Mina kirjutan teile, sest köögis on kraan katki.",
    "Mina kirjutan teile, sest meie köögis on kraan katki.",
    "Kirjutan teile, kuna köögis on kraan katki.",
    "Kirjutan teile, sest köögis on kraan katki läinud.",
    "Kirjutan teile, sest köögikraan on katki.",
    "Kirjutan sulle, sest köögis on kraan katki.",
  ],
};

export const LETTER_POLITE_SEND: readonly [string, ...string[]] = [
  ...LETTER_ANSWERS["Kas te saaksite meistri saata?"],
  "Palun saatke meister!",
  "Saatke palun meister!",
];

export const LETTER_FIX_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  ...Object.fromEntries(LETTER_FIXES.map(({ right }) => [right, [right]])),
  "Ma olen kodus esmaspäeval.": ["Ma olen kodus esmaspäeval.", "Ma olen kodus esmaspäeviti."],
};

const LETTER_CLIPS: Record<string, Clip> = {
  ...words([
    ...LETTER_WORDS,
    ...LETTER_PHRASES,
    ...LETTER_FIXES.map(({ right }) => right),
    ...LETTER_TRANSLATE,
  ]),
  "p-message": { sentences: LETTER_MESSAGE },
  "p-friend": {
    sentences: LETTER_GAPS.map(
      ({ before, answer, after }) =>
        `${before} ${answer}${/^[.!?]$/.test(after) ? "" : " "}${after}`,
    ),
  },
  "p-model": { sentences: LETTER_MODEL },
  ...LETTER_DIALOGUE,
  "c-radiator": LETTER_CONVERSATION,
};

export const PAST_NO_PERSONS = ["ma", "sa", "ta", "me", "te", "nad"] as const;

export const PAST_NO_TABLE = [
  {
    verb: "lugema",
    stem: "luge",
    yes: ["sin", "sid", "s", "sime", "site", "sid"],
    nud: "luge|nud",
  },
  { verb: "olema", stem: "ol", yes: ["in", "id", "i", "ime", "ite", "id"], nud: "ol|nud" },
  { verb: "minema", stem: "läks", yes: ["in", "id", "", "ime", "ite", "id"], nud: "läi|nud" },
] as const;

export const pastYesSaid = (pronoun: string, stem: string, ending: string) =>
  presentWithPronoun(pronoun, stem, ending);

export const pastNoSaid = (pronoun: string, nud: string) =>
  `${capital(pronoun)} ei ${nud.replace("|", "")}`;

export const PAST_NO_TIMELINE = [
  {
    id: "last-week",
    et: "eelmisel nädalal",
    at: -2,
    sentence: "Eelmisel nädalal ma ei olnud Tallinnas.",
    build: "ol|nud",
  },
  { id: "yesterday", et: "eile", at: -1, sentence: "Eile ma ei töötanud.", build: "tööta|nud" },
  { id: "today", et: "täna", at: 0, sentence: "Täna ma ei tööta.", build: "tööta" },
] as const;

export const nudForm = (verb: VerbForms) => `${verb.da[0]}nud`;

export const NUD_BUILT = VERB_FORMS.filter((verb) => ["da", "ta", "la"].includes(verb.pattern));

export const NUD_SHOWN = ["elama", "lugema", "töötama", "ootama", "olema"] as const;

export const NUD_WHOLE = [
  { verb: "minema", da: "minna", nud: "läinud", said: "Ma ei läinud tööle." },
  { verb: "tegema", da: "teha", nud: "teinud", said: "Ma ei teinud tööd." },
  { verb: "nägema", da: "näha", nud: "näinud", said: "Ma ei näinud kassi." },
  { verb: "sööma", da: "süüa", nud: "söönud", said: "Ma ei söönud kodus." },
  { verb: "jooma", da: "juua", nud: "joonud", said: "Ma ei joonud kohvi." },
] as const;

export const PAST_NO_WHEN = [
  { verb: "olema", now: "Ta pole kodus.", past: "Ta polnud kodus." },
  { verb: "tulema", now: "Mari ei tule koju.", past: "Mari ei tulnud koju." },
  { verb: "minema", now: "Ta ei lähe tööle.", past: "Ta ei läinud tööle." },
  { verb: "sööma", now: "Me ei söö leiba.", past: "Me ei söönud leiba." },
  { verb: "jooma", now: "Sa ei joo vett.", past: "Sa ei joonud vett." },
  { verb: "lugema", now: "Te ei loe raamatut.", past: "Te ei lugenud raamatut." },
  { verb: "elama", now: "Nad ei ela Tartus.", past: "Nad ei elanud Tartus." },
] as const;

export const PAST_NO_SORT = [
  { w: "ei loe", bin: "now" },
  { w: "ei joo", bin: "now" },
  { w: "pole", bin: "now" },
  { w: "elasin", bin: "yes" },
  { w: "läksin", bin: "yes" },
  { w: "olin", bin: "yes" },
  { w: "ei teinud", bin: "no" },
  { w: "ei joonud", bin: "no" },
  { w: "polnud", bin: "no" },
] as const;

export const PAST_NO_REWRITE = [
  { id: "tool", from: "Ma läksin eile tööle.", to: "Ma ei läinud eile tööle." },
  { id: "kodus", from: "Ta oli kodus.", to: "Ta ei olnud kodus." },
  { id: "kohvikus", from: "Me sõime kohvikus.", to: "Me ei söönud kohvikus." },
  { id: "raamatut", from: "Nad lugesid raamatut.", to: "Nad ei lugenud raamatut." },
  { id: "bussi", from: "Sa ootasid bussi.", to: "Sa ei oodanud bussi." },
  { id: "koju", from: "Te tulite koju.", to: "Te ei tulnud koju." },
] as const;

export const PAST_NO_FIX = [
  { id: "laksin", wrong: "Ma ei läksin poodi.", right: "Ma ei läinud poodi." },
  { id: "oli", wrong: "Ta ei oli tööl.", right: "Ta ei olnud tööl." },
  { id: "kaisime", wrong: "Me ei käisime turul.", right: "Me ei käinud turul." },
  { id: "tootanud", wrong: "Eile ma ei tööta.", right: "Eile ma ei töötanud." },
  { id: "soonud", wrong: "Sa ei söö eile kodus.", right: "Sa ei söönud eile kodus." },
  { id: "lugesite", wrong: "Te ei lugesite raamatut.", right: "Te ei lugenud raamatut." },
] as const;

export const PAST_NO_DIALOGUE = {
  "d-mari-1": { text: "Tere! Kas sa käisid eile poes?", voice: "second" },
  "d-sina-1": "Ei, ma ei käinud.",
  "d-mari-2": { text: "Miks sa ei käinud?", voice: "second" },
  "d-sina-2": "Mul polnud aega.",
  "d-mari-3": { text: "Mida sa siis tegid?", voice: "second" },
  "d-sina-3": "Ma töötasin kodus.",
  "d-mari-4": { text: "Kas Jaan oli kodus?", voice: "second" },
  "d-sina-4": "Ei, ta ei olnud.",
} as const satisfies Record<string, Clip>;

export const PAST_NO_TALK = {
  turns: [
    {
      voice: "third",
      text: "Tere, Jaan! Mida sa laupäeval tegid?",
      say: "[cheerful] Tere, Jaan! Mida sa laupäeval tegid?",
    },
    {
      voice: "main",
      text: ["Laupäeval olin ma kodus.", "Ma ei läinud tööle ja ma ei käinud poes."],
    },
    { voice: "third", text: "Miks sa poes ei käinud?", say: "[curious] Miks sa poes ei käinud?" },
    {
      voice: "main",
      text: ["Mul polnud aega.", "Minu ema tuli Tartust ja me rääkisime palju."],
    },
    { voice: "third", text: "Kas te sõite kohvikus?" },
    { voice: "main", text: ["Ei, me ei söönud kohvikus.", "Me sõime kodus.", "Ja sina?"] },
    {
      voice: "third",
      text: ["Mina ei olnud laupäeval kodus.", "Ma käisin Tallinnas ja jõin seal kohvi."],
    },
    { voice: "main", text: "Ja pühapäeval?" },
    {
      voice: "third",
      text: ["Pühapäeval olin kodus ja lugesin raamatut.", "Ma ei tahtnud linna minna."],
      say: "[laughs] Pühapäeval olin kodus ja lugesin raamatut. Ma ei tahtnud linna minna.",
    },
    { voice: "main", text: "Kas sa poes käisid?" },
    { voice: "third", text: ["Ei, ma ei käinud.", "Ma lähen täna."] },
    { voice: "main", text: ["Mina ka.", "Mul pole kodus leiba."] },
    { voice: "third", text: "Kas läheme koos kell kuus?" },
    { voice: "main", text: ["Jah!", "Kell kuus olen poe ees."] },
    { voice: "third", text: "Tore! Head aega!", say: "[cheerful] Tore! Head aega!" },
  ],
} as const satisfies Conversation;

export const PAST_NO_DRILL = [
  "Ma ei elanud Tartus.",
  "Ta ei rääkinud eesti keelt.",
  "Me ei õppinud eile.",
  "Nad ei kuulanud.",
  "Ta ei läinud koju.",
  "Me ei teinud tööd.",
  "Sa ei näinud kassi.",
  "Nad ei söönud leiba.",
  "Ma ei joonud vett.",
  "Te ei käinud poes.",
  "Ma ei tahtnud tulla.",
  "Nad ei olnud kodus.",
  "Sa ei töötanud eile.",
  "Me ei oodanud.",
  "Ta ei tulnud tööle.",
  "Ta luges raamatut.",
  "Ta ei loe raamatut.",
  "Ta ei lugenud raamatut.",
] as const;

export const PAST_NO_WORDS = [
  "ei",
  "eile",
  "täna",
  "töötasin",
  "ma ei töötanud",
  "lugesin",
  "ma ei lugenud",
  "nad ei lugenud",
  "ei olnud",
  "polnud",
  "Ma polnud kodus.",
  "ei lugenud",
  "ei läinud",
  "ei teinud",
  "ei näinud",
  "ei söönud",
  "ei joonud",
  "ei käinud",
  "ei tahtnud",
  "tahtma",
  "tahta",
  "tahtnud",
  "Ma ei tahtnud.",
  "käinud",
  "Kas sa käisid poes?",
  "mul polnud aega",
] as const;

const PAST_NO_CLIPS: Record<string, Clip> = {
  ...words(PAST_NO_WORDS),
  ...words(
    PAST_NO_TABLE.flatMap(({ stem, yes, nud }) =>
      PAST_NO_PERSONS.flatMap((pronoun, i) => [
        pastYesSaid(pronoun, stem, yes[i] ?? ""),
        pastNoSaid(pronoun, nud),
      ]),
    ),
  ),
  ...words(PAST_NO_TIMELINE.map(({ sentence }) => sentence)),
  ...words(NUD_BUILT.flatMap((verb) => [verb.ma, daForm(verb), nudForm(verb)])),
  ...words(NUD_WHOLE.flatMap(({ verb, da, nud, said }) => [verb, da, nud, said])),
  ...words(PAST_NO_WHEN.flatMap(({ now, past }) => [now, past])),
  ...words(PAST_NO_SORT.map(({ w }) => w)),
  ...words(PAST_NO_REWRITE.map(({ to }) => to)),
  ...words(PAST_NO_FIX.map(({ right }) => right)),
  ...words(PAST_NO_DRILL),
  ...PAST_NO_DIALOGUE,
  "c-weekend": PAST_NO_TALK,
};

export const MARKET_PASSAGES = {
  mari: [
    "Tere, Liis!",
    "Täna on laupäev ja ma lähen kell kümme turule.",
    "Mul on vaja kilo juustu, leiba ja piima.",
    "Kilo juustu maksab poes kümme eurot.",
    "Leib maksab kaks eurot.",
    "Homme tuleb minu ema meile ja talle meeldivad turu õunad.",
    "Mulle ei meeldi pood, mulle meeldib turg.",
    "Turul on ka väike kohvik.",
    "Kas sa tahad tulla?",
    "Jaan ei saa tulla, sest ta on täna tööl.",
    "Me võime kohvikus kohvi juua.",
    "Ma ootan sind kell kümme turul.",
    "Kell kaksteist pean ma kodus olema.",
  ],
  liis: [
    "Tere, Mari!",
    "Jah, ma tahan tulla.",
    "Ma olen kell kümme turul.",
    "Mul on ka vaja kilo kohvi.",
    "Ka mulle meeldivad turu õunad.",
    "Kas me saame kohvikus süüa?",
    "Kell kaksteist pean ma ka koju minema.",
  ],
} as const;

export const MARKET_LEADS = [
  { w: "tahan", bin: "da" },
  { w: "võin", bin: "da" },
  { w: "saan", bin: "da" },
  { w: "mul on vaja", bin: "da" },
  { w: "mulle meeldib", bin: "da" },
  { w: "pean", bin: "ma" },
  { w: "lähen", bin: "ma" },
  { w: "hakkan", bin: "ma" },
] as const;

export const MARKET_SAY = [
  { id: "juustu", said: "Mul on vaja kilo juustu." },
  { id: "maksab", said: "Kui palju see maksab?" },
  { id: "ounad", said: "Mulle meeldivad õunad." },
  { id: "turule", said: "Ma tahan turule minna." },
  { id: "kodus", said: "Ma pean kell kaksteist kodus olema." },
  { id: "leib", said: "Leib maksab kaks eurot." },
] as const;

export const MARKET_FIX = [
  { id: "juust", wrong: "Mul on vaja kilo juust.", right: "Mul on vaja kilo juustu." },
  { id: "minna", wrong: "Ma pean turule minna.", right: "Ma pean turule minema." },
  { id: "jooma", wrong: "Ma tahan kohvi jooma.", right: "Ma tahan kohvi juua." },
  { id: "meeldib", wrong: "Mulle meeldib õunad.", right: "Mulle meeldivad õunad." },
  { id: "euro", wrong: "Leib maksab kaks euro.", right: "Leib maksab kaks eurot." },
  { id: "turul", wrong: "Ma lähen täna turul.", right: "Ma lähen täna turule." },
  { id: "turult", wrong: "Ma tulen turul koju.", right: "Ma tulen turult koju." },
] as const;

export const MARKET_DIALOGUE = {
  "d-muuja-1": { text: "Tere! Mida te soovite?", voice: "second" },
  "d-sina-1": "Tere! Mul on vaja kilo juustu.",
  "d-muuja-2": { text: "Kilo maksab kaheksa eurot. Midagi veel?", voice: "second" },
  "d-sina-2": "Jah, ma tahan ka leiba.",
  "d-muuja-3": { text: "Juust ja leib on kümme eurot.", voice: "second" },
  "d-sina-3": "Palun, kümme eurot.",
} as const satisfies Record<string, Clip>;

export const MARKET_TALK = {
  turns: [
    { voice: "fourth", text: "Tere! Mida te soovite?" },
    { voice: "third", text: ["Tere! Mul on vaja kilo juustu.", "Kui palju see maksab?"] },
    {
      voice: "fourth",
      text: ["Kilo maksab kaheksa eurot.", "See juust on väga hea."],
      say: "Kilo maksab kaheksa eurot. [proudly] See juust on väga hea.",
    },
    { voice: "third", text: "Kas see on Eesti juust?", say: "[curious] Kas see on Eesti juust?" },
    { voice: "fourth", text: "Jah, see juust on Tartust." },
    { voice: "third", text: "Kas leib on ka Tartust?" },
    { voice: "fourth", text: "Ei, leib on Tallinnast." },
    { voice: "third", text: "Hästi, üks kilo, palun." },
    { voice: "fourth", text: "Midagi veel?" },
    { voice: "third", text: "Jah, ma tahan ka leiba ja piima." },
    { voice: "fourth", text: ["Leiba on, aga piima täna pole.", "Piima saate poest."] },
    {
      voice: "third",
      text: ["Kahju.", "Ma pean poodi minema."],
      say: "[sighs] Kahju. Ma pean poodi minema.",
    },
    { voice: "fourth", text: ["Kas teile meeldib kohv?", "Meil on ka kohvi."] },
    { voice: "third", text: "Mulle meeldib kohv, aga täna ma kohvi ei taha." },
    { voice: "fourth", text: "Leib ja juust on kümme eurot." },
    { voice: "third", text: ["Palun, kümme eurot.", "Aitäh, head aega!"] },
    { voice: "fourth", text: "Head aega!" },
  ],
} as const satisfies Conversation;

export const MARKET_DRILL = [
  "kilo juustu",
  "Mul on vaja kilo kohvi.",
  "kolm eurot",
  "Juust maksab kaheksa eurot.",
  "Kohv maksab kolm eurot.",
  "Ma tahan turule minna.",
  "Ma pean kodus olema.",
  "Mul on vaja poodi minna.",
  "Ma tahan kohvi juua.",
  "Ma pean koju minema.",
  "Me saame kohvikus süüa.",
  "Mulle meeldivad õunad.",
  "Mulle meeldib turg.",
  "Talle meeldib kohv.",
  "Mulle meeldivad kassid.",
  "Talle meeldivad õunad.",
  "Ma lähen turule.",
  "Ma olen turul.",
  "Ma tulen turult.",
  "Ma olen täna turul.",
  "Ma tulen turult koju.",
] as const;

export const MARKET_WORDS = [
  "turg",
  "turule",
  "turul",
  "turult",
  "õunad",
  "turu õunad",
  "kilo juustu",
  "maksab",
  "Mida te soovite?",
  "Midagi veel?",
  "mul on vaja",
  "kahju",
] as const;

const MARKET_CLIPS: Record<string, Clip> = {
  ...words(MARKET_WORDS),
  ...words(MARKET_LEADS.map(({ w }) => w)),
  ...words(MARKET_SAY.map(({ said }) => said)),
  ...words(MARKET_FIX.map(({ right }) => right)),
  ...words(MARKET_DRILL),
  "p-mari": { sentences: MARKET_PASSAGES.mari, voice: "third" },
  "p-liis": { sentences: MARKET_PASSAGES.liis, voice: "second" },
  ...MARKET_DIALOGUE,
  "c-stall": MARKET_TALK,
};

export const FUTURE_TIMELINE = [
  { id: "yesterday", et: "eile", at: -1, sentences: [["Eile läksin Tartusse.", "läks|in"]] },
  { id: "today", et: "täna", at: 0, sentences: [["Täna lähen Tartusse.", "lähe|n"]] },
  { id: "tomorrow", et: "homme", at: 1, sentences: [["Homme lähen Tartusse.", "lähe|n"]] },
  {
    id: "next-week",
    et: "järgmisel nädalal",
    at: 2,
    sentences: [
      ["Järgmisel nädalal lähen Tartusse.", "lähe|n"],
      ["Järgmisel nädalal hakkan Tartus õppima.", "hakka|n", "õppi|ma"],
    ],
  },
] as const;

export const FUTURE_HAKKAMA = [
  { lead: "hakkan", said: "Ma hakkan Tartus elama.", form: "ela|ma" },
  { lead: "hakkad", said: "Kas sa hakkad kodus töötama?", form: "tööta|ma" },
  { lead: "hakkab", said: "Homme hakkab vihma sadama.", form: "sada|ma" },
  { lead: "hakkame", said: "Me hakkame eesti keelt rääkima.", form: "rääki|ma" },
  { lead: "hakkate", said: "Millal te hakkate sööma?", form: "söö|ma" },
  { lead: "hakkavad", said: "Lapsed hakkavad mängima.", form: "mängi|ma" },
] as const;

export const FUTURE_BUILD = [
  { answers: ["Ma hakkan palju lugema."], spare: ["loen"] },
  {
    answers: [
      "Järgmisel nädalal hakkame eesti keelt õppima.",
      "Eesti keelt hakkame järgmisel nädalal õppima.",
    ],
    spare: ["õpime"],
  },
  {
    answers: ["Kati hakkab poes töötama.", "Poes hakkab Kati töötama."],
    spare: ["töötab"],
    tiles: ["Kati", "hakkab", "poes", "töötama"],
  },
] as const;

export const FUTURE_SORT = [
  { lead: "hakkan", takes: "ma" },
  { lead: "kavatsen", takes: "da" },
  { lead: "plaanin", takes: "da" },
  { lead: "pean", takes: "ma" },
  { lead: "tahan", takes: "da" },
  { lead: "lähen", takes: "ma" },
  { lead: "oskan", takes: "da" },
  { lead: "jään", takes: "ma" },
] as const satisfies readonly { lead: string; takes: Takes }[];

export const FUTURE_WHEN = [
  { verb: "olema", past: "Eile olin tööl.", now: "Ma olen tööl.", later: "Homme olen tööl." },
  {
    verb: "elama",
    past: "Ta elas Tallinnas.",
    now: "Ta elab Tallinnas.",
    later: "Ta hakkab Tallinnas elama.",
  },
  {
    verb: "jooma",
    past: "Me jõime kohvi.",
    now: "Me joome kohvi.",
    later: "Ülehomme joome kohvi.",
  },
  {
    verb: "lugema",
    past: "Nad lugesid raamatut.",
    now: "Nad loevad raamatut.",
    later: "Nad hakkavad raamatut lugema.",
  },
  {
    verb: "sööma",
    past: "Eile sõime kodus.",
    now: "Me sööme kodus.",
    later: "Järgmisel nädalal sööme kodus.",
  },
  {
    verb: "õppima",
    past: "Ta õppis eesti keelt.",
    now: "Ta õpib eesti keelt.",
    later: "Homme õpib ta eesti keelt.",
  },
  {
    verb: "töötama",
    past: "Ma töötasin kodus.",
    now: "Ma töötan kodus.",
    later: "Homme töötan kodus.",
  },
] as const;

export const FUTURE_DIALOGUE = {
  "d-kati-1": { text: "Tere! Mida sa homme teed?", voice: "second" },
  "d-sina-1": "Homme lähen Tallinnasse.",
  "d-kati-2": { text: "Mida sa Tallinnas teed?", voice: "second" },
  "d-sina-2": "Ma hakkan Tallinnas töötama.",
  "d-kati-3": { text: "Millal sa Tartusse tuled?", voice: "second" },
  "d-sina-3": "Ma kavatsen järgmisel nädalal tulla.",
} as const satisfies Record<string, Clip>;

export const FUTURE_WORDS = [
  "tulevik",
  "homme",
  "täna",
  "ülehomme",
  "järgmisel nädalal",
  "eelmisel nädalal",
  "Homme lähen Tartusse.",
  "Täna lähen Tartusse.",
  "Homme saab olema külm.",
  "Homme on külm.",
  "hakkama",
  "hakkan",
  "kavatsema",
  "kavatsen",
  "plaanima",
  "plaanin",
  "Ma kavatsen järgmisel nädalal Tallinnasse minna.",
  "Mida sa plaanid homme teha?",
  ...FUTURE_SORT.map(({ lead }) => lead),
] as const;

export const FUTURE_REWRITE = [
  { id: "lugema", from: "Ma loen palju.", to: "Ma hakkan palju lugema." },
  { id: "oppima", from: "Me õpime eesti keelt.", to: "Me hakkame eesti keelt õppima." },
  { id: "tootama", from: "Ta töötab Tallinnas.", to: "Ta hakkab Tallinnas töötama." },
  { id: "elama", from: "Sa elad Tartus.", to: "Sa hakkad Tartus elama." },
  { id: "raakima", from: "Nad räägivad eesti keelt.", to: "Nad hakkavad eesti keelt rääkima." },
  { id: "sooma", from: "Te sööte kodus.", to: "Te hakkate kodus sööma." },
] as const;

export const FUTURE_FIX = [
  { id: "tootada", wrong: "Ma hakkan kodus töötada.", right: "Ma hakkan kodus töötama." },
  {
    id: "minema",
    wrong: "Ma kavatsen Tallinnasse minema.",
    right: "Ma kavatsen Tallinnasse minna.",
  },
  { id: "laksin", wrong: "Homme läksin Tartusse.", right: "Homme lähen Tartusse." },
  {
    id: "hakkab",
    wrong: "Nad hakkab eesti keelt õppima.",
    right: "Nad hakkavad eesti keelt õppima.",
  },
  { id: "soome", wrong: "Me hakkame kodus sööme.", right: "Me hakkame kodus sööma." },
  { id: "tulema", wrong: "Ta plaanib homme tulema.", right: "Ta plaanib homme tulla." },
] as const;

export const FUTURE_TALK = {
  turns: [
    {
      voice: "third",
      text: "Tere, Jaan! Mida sa järgmisel nädalal teed?",
      say: "[curious] Tere, Jaan! Mida sa järgmisel nädalal teed?",
    },
    { voice: "main", text: ["Esmaspäeval hakkan Tallinnas töötama.", "Seal hakkan ka elama."] },
    {
      voice: "third",
      text: ["Tallinnas?", "Aga sinu kass?"],
      say: "[surprised] Tallinnas? Aga sinu kass?",
    },
    {
      voice: "main",
      text: "Kass tuleb ka Tallinnasse.",
      say: "[laughs] Kass tuleb ka Tallinnasse.",
    },
    { voice: "third", text: "Kas sa hakkad Tallinnas eesti keelt õppima?" },
    {
      voice: "main",
      text: ["Jah, ma hakkan iga päev eesti keelt õppima.", "Ma tahan tööl eesti keelt rääkida."],
    },
    { voice: "third", text: "Millal sa Tartusse tuled?" },
    { voice: "main", text: ["Ma kavatsen reedel tulla.", "Laupäeval olen Tartus."] },
    { voice: "third", text: ["Laupäeval lähen turule.", "Kas sa tuled ka?"] },
    { voice: "main", text: ["Jah, ma tulen.", "Kell kümme?"] },
    { voice: "third", text: ["Kell kümme on hea.", "Kell üksteist joome kohvikus kohvi."] },
    { voice: "main", text: "Aga pühapäeval pean ma Tallinnas olema." },
    { voice: "third", text: "Miks?" },
    { voice: "main", text: "Esmaspäeval hakkan kell kaheksa töötama." },
    { voice: "third", text: ["Hästi.", "Head aega!"] },
    { voice: "main", text: "Head aega!" },
  ],
} as const satisfies Conversation;

export const FUTURE_DRILL = [
  "Homme töötan kodus.",
  "Järgmisel nädalal läheme Tartusse.",
  "Nad hakkavad õppima.",
  "Sa hakkad töötama.",
  "Me hakkame Tartus elama.",
  "Ta hakkab palju lugema.",
  "Me hakkame kodus töötama.",
  "Ma hakkan eesti keelt rääkima.",
  "Ma kavatsen Tallinnasse minna.",
  "Mida sa plaanid homme teha?",
  "Me kavatseme eesti keelt õppida.",
  "Ta plaanib homme tulla.",
  "Nad hakkavad Tartus elama.",
  "Ma hakkan Tartus elama.",
  "Ma kavatsen Tartusse minna.",
] as const;

const FUTURE_CLIPS: Record<string, Clip> = {
  ...words(FUTURE_WORDS),
  ...words(FUTURE_TIMELINE.flatMap(({ sentences }) => sentences.map(([sentence]) => sentence))),
  ...words(FUTURE_HAKKAMA.map(({ said }) => said)),
  ...words(FUTURE_BUILD.map(({ answers }) => answers[0])),
  ...words(FUTURE_WHEN.flatMap(({ past, now, later }) => [past, now, later])),
  ...words(FUTURE_REWRITE.map(({ to }) => to)),
  ...words(FUTURE_FIX.map(({ right }) => right)),
  ...words(FUTURE_DRILL),
  ...FUTURE_DIALOGUE,
  "c-plans": FUTURE_TALK,
};

export const WEEKEND_PASSAGES = {
  kati: [
    "Tere, Mari!",
    "Eelmisel nädalavahetusel olin ma Tartus.",
    "Minu ema elab seal.",
    "Laupäeval käisin turul ja ostsin juustu ja leiba.",
    "Kell kuus olin kohvikus ja jõin kohvi.",
    "Pühapäeval ma ei läinud linna.",
    "Ma olin kodus ja lugesin raamatut.",
    "Järgmisel nädalal hakkan ma Tallinnas töötama.",
    "Esmaspäeval lähen Tallinnasse.",
    "Ma kavatsen seal elada.",
    "Kas sa tuled järgmisel nädalavahetusel Tallinnasse?",
    "Me võime seal turule minna.",
  ],
  mari: [
    "Tere, Kati!",
    "Laupäeval olin ma kodus ja ma ei läinud linna.",
    "Kodus lugesin raamatut.",
    "Pühapäeval ma ei olnud kodus.",
    "Järgmisel nädalal hakkan ma eesti keelt õppima.",
    "Jah, ma tulen Tallinnasse!",
    "Ma kavatsen laupäeval turule minna.",
  ],
} as const;

export const WEEKEND_SORT = [
  { w: "olin kodus", bin: "past" },
  { w: "ma ei läinud", bin: "past" },
  { w: "käisin turul", bin: "past" },
  { w: "ei teinud", bin: "past" },
  { w: "hakkan õppima", bin: "later" },
  { w: "homme lähen", bin: "later" },
  { w: "kavatsen tulla", bin: "later" },
  { w: "järgmisel nädalal", bin: "later" },
] as const;

export const WEEKEND_SAY = [
  { id: "tartus", said: "Eelmisel nädalavahetusel olin ma Tartus." },
  { id: "toole", said: "Ma ei läinud tööle." },
  { id: "tallinnasse", said: "Järgmisel nädalal lähen ma Tallinnasse." },
  { id: "oppima", said: "Ma hakkan eesti keelt õppima." },
  { id: "kodus", said: "Eile sõime kodus." },
  { id: "raamatut", said: "Ta ei lugenud raamatut." },
] as const;

export const WEEKEND_FIX = [
  {
    id: "kaisin",
    wrong: "Eelmisel nädalal ma ei käisin turul.",
    right: "Eelmisel nädalal ma ei käinud turul.",
  },
  { id: "olin", wrong: "Homme ma olin kodus.", right: "Homme ma olen kodus." },
  { id: "lahen", wrong: "Eile ma lähen tööle.", right: "Eile ma läksin tööle." },
  {
    id: "tootada",
    wrong: "Järgmisel nädalal hakkan ma töötada.",
    right: "Järgmisel nädalal hakkan ma töötama.",
  },
  { id: "olid", wrong: "Ta ei olid kodus.", right: "Ta ei olnud kodus." },
  { id: "soime", wrong: "Pühapäeval me ei sõime kodus.", right: "Pühapäeval me ei söönud kodus." },
] as const;

export const WEEKEND_DIALOGUE = {
  "d-mari-1": { text: "Tere! Mida sa nädalavahetusel tegid?", voice: "second" },
  "d-sina-1": "Ma olin nädalavahetusel Tartus.",
  "d-mari-2": { text: "Kas sa käisid ka turul?", voice: "second" },
  "d-sina-2": "Ei, ma ei käinud.",
  "d-mari-3": { text: "Mida sa järgmisel nädalal teed?", voice: "second" },
  "d-sina-3": "Ma hakkan Tallinnas töötama.",
} as const satisfies Record<string, Clip>;

export const WEEKEND_TALK = {
  turns: [
    {
      voice: "third",
      text: "Tere, Jaan! Kuidas nädalavahetus oli?",
      say: "[cheerful] Tere, Jaan! Kuidas nädalavahetus oli?",
    },
    {
      voice: "main",
      text: ["Hea!", "Laupäeval käisin ujumas.", "Vesi oli külm.", "Pühapäeval olin kodus."],
    },
    { voice: "third", text: "Kas sa käisid ka turul?" },
    { voice: "main", text: ["Ei, ma ei käinud.", "Mul polnud aega."] },
    { voice: "third", text: ["Mina käisin turul.", "Ma ostsin juustu ja leiba."] },
    { voice: "main", text: "Kui palju juust maksis?" },
    { voice: "third", text: "Kilo maksis kümme eurot." },
    { voice: "main", text: "Mida sa järgmisel nädalal teed?" },
    {
      voice: "third",
      text: ["Järgmisel nädalal hakkan ma eesti keelt õppima.", "Kolmapäeval ja reedel kell kuus."],
    },
    { voice: "main", text: ["Tore!", "Mina lähen esmaspäeval Tallinnasse."] },
    { voice: "third", text: "Millal sa Tartusse tuled?" },
    { voice: "main", text: ["Ma kavatsen reedel tulla.", "Laupäeval olen kodus."] },
    {
      voice: "third",
      text: ["Hästi.", "Tule laupäeval meile!"],
      say: "Hästi. [warmly] Tule laupäeval meile!",
    },
    { voice: "main", text: ["Jah, hea meelega!", "Mis kell?"] },
    { voice: "third", text: ["Kell neli.", "Head aega!"] },
  ],
} as const satisfies Conversation;

export const WEEKEND_DRILL = [
  "Eile olin kodus.",
  "Laupäeval käisin turul.",
  "Me sõime kohvikus.",
  "Eile ta luges raamatut.",
  "Eile ma olin kodus.",
  "Eelmisel laupäeval me käisime turul.",
  "Eile ma ei läinud tööle.",
  "Me ei käinud turul.",
  "Nad ei olnud kodus.",
  "Sa ei söönud kodus.",
  "Homme lähen Tartusse.",
  "Järgmisel nädalal hakkan õppima.",
  "Ma kavatsen tulla.",
  "Me hakkame Tallinnas elama.",
  "Ma ei lugenud raamatut.",
  "Homme ma lähen tööle.",
] as const;

export const WEEKEND_WORDS = [
  "nädalavahetus",
  "nädalavahetusel",
  "eelmisel nädalavahetusel",
  "järgmisel nädalavahetusel",
  "eelmisel nädalal",
  "järgmisel nädalal",
  "hea meelega",
] as const;

const WEEKEND_CLIPS: Record<string, Clip> = {
  ...words(WEEKEND_WORDS),
  ...words(WEEKEND_SORT.map(({ w }) => w)),
  ...words(WEEKEND_SAY.map(({ said }) => said)),
  ...words(WEEKEND_FIX.map(({ right }) => right)),
  ...words(WEEKEND_DRILL),
  "p-kati": { sentences: WEEKEND_PASSAGES.kati, voice: "third" },
  "p-mari": { sentences: WEEKEND_PASSAGES.mari, voice: "second" },
  ...WEEKEND_DIALOGUE,
  "c-weekend": WEEKEND_TALK,
};

export const IDIOM_PARTICLES = [
  "aru",
  "kokku",
  "läbi",
  "hakkama",
  "otsa",
  "maha",
  "ära",
  "välja",
  "vastu",
  "järele",
  "alla",
] as const;

export const IDIOM_VERBS = {
  saama: [
    { verb: "aru saama", said: "Ma ei saa sellest aru." },
    { verb: "kokku saama", said: "Saame homme kohvikus kokku." },
    { verb: "läbi saama", said: "Ma saan naabriga hästi läbi." },
    { verb: "hakkama saama", said: "Ära muretse, ma saan hakkama." },
    { verb: "otsa saama", said: "Kohv sai otsa." },
  ],
  jaama: [
    { verb: "maha jääma", said: "Ma jäin bussist maha." },
    { verb: "ära jääma", said: "Koosolek jääb täna ära." },
  ],
  other: [
    { verb: "välja nägema", said: "Sa näed täna väsinud välja." },
    { verb: "ära tundma", said: "Ma ei tundnud sind kohe ära." },
    { verb: "vastu võtma", said: "Ta võttis uue töö vastu." },
    { verb: "järele mõtlema", said: "Las ma mõtlen järele." },
    { verb: "alla andma", said: "Ära anna alla!" },
  ],
} as const;

export const IDIOM_PLAIN = [
  { verb: "saama", said: "Ma sain kirja." },
  { verb: "jääma", said: "Ma jään koju." },
] as const;

export const IDIOM_HEARD = [
  {
    id: "me",
    kokku: "Me saame homme kokku.",
    labi: "Me saame hästi läbi.",
    aru: "Me saame sellest aru.",
    hakkama: "Me saame ise hakkama.",
  },
  {
    id: "mari",
    kokku: "Mari sai Jaaniga kokku.",
    labi: "Mari sai Jaaniga hästi läbi.",
    aru: "Mari sai Jaanist aru.",
    hakkama: "Mari sai tööga hakkama.",
  },
  {
    id: "nad",
    kokku: "Nad saavad pärast tööd kokku.",
    labi: "Nad saavad omavahel hästi läbi.",
    aru: "Nad saavad eesti keelest aru.",
    hakkama: "Nad saavad kõigega hakkama.",
  },
] as const;

export const IDIOM_GAPS = [
  {
    id: "aru",
    verb: "saama",
    before: "Vabandust, ma ei saanud küsimusest",
    after: ".",
    answer: "aru",
    fits: [],
  },
  {
    id: "kokku",
    verb: "saama",
    before: "Kas me saame homme pärast tööd",
    after: "?",
    answer: "kokku",
    fits: ["hakkama"],
  },
  {
    id: "labi",
    verb: "saama",
    before: "Mari saab oma kolleegidega hästi",
    after: ".",
    answer: "läbi",
    fits: ["hakkama"],
  },
  {
    id: "hakkama",
    verb: "saama",
    before: "Ära muretse, ma saan selle tööga",
    after: ".",
    answer: "hakkama",
    fits: ["läbi"],
  },
  {
    id: "maha",
    verb: "jääma",
    before: "Kiirusta, muidu jääme rongist",
    after: ".",
    answer: "maha",
    fits: [],
  },
  {
    id: "ara",
    verb: "jääma",
    before: "Täna on torm, nii et kontsert jääb",
    after: ".",
    answer: "ära",
    fits: [],
  },
  {
    id: "valja",
    verb: "nägema",
    before: "Sa näed selles kleidis väga ilus",
    after: ".",
    answer: "välja",
    fits: [],
  },
  {
    id: "vastu",
    verb: "võtma",
    before: "Kas sa võtad selle kutse",
    after: "?",
    answer: "vastu",
    fits: ["ära", "välja"],
  },
  {
    id: "jarele",
    verb: "mõtlema",
    before: "Ma ei tea veel, ma pean",
    after: "mõtlema.",
    answer: "järele",
    fits: ["läbi", "välja"],
  },
  {
    id: "alla",
    verb: "andma",
    before: "Sa oled peaaegu kohal, ära anna",
    after: "!",
    answer: "alla",
    fits: ["ära", "välja", "vastu", "järele"],
  },
] as const;

export const IDIOM_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  "Ma ei saanud küsimusest aru.": [
    "Ma ei saanud küsimusest aru.",
    "Ei saanud küsimusest aru.",
    "Ma ei saanud aru küsimusest.",
    "Ei saanud aru küsimusest.",
    "Ma ei mõistnud küsimust.",
    "Küsimusest ei saanud ma aru.",
    "Küsimusest ei saanud aru.",
    "Ma ei saanud aru, mida küsiti.",
    "Mina ei saanud küsimusest aru.",
    "Mina ei saanud aru küsimusest.",
    "Mina ei mõistnud küsimust.",
    "Mina ei saanud aru, mida küsiti.",
  ],
  "Saame homme kokku.": [
    "Saame homme kokku.",
    "Saame kokku homme.",
    "Homme saame kokku.",
    "Me saame homme kokku.",
    "Homme saame me kokku.",
    "Me saame kokku homme.",
    "Kohtume homme.",
    "Homme kohtume.",
    "Me kohtume homme.",
    "Meie saame homme kokku.",
    "Meie saame kokku homme.",
    "Meie kohtume homme.",
  ],
  "Ma saan oma õega hästi läbi.": [
    "Ma saan oma õega hästi läbi.",
    "Ma saan õega hästi läbi.",
    "Ma saan enda õega hästi läbi.",
    "Ma saan hästi läbi oma õega.",
    "Oma õega saan ma hästi läbi.",
    "Õega saan ma hästi läbi.",
    "Mina saan oma õega hästi läbi.",
    "Saan oma õega hästi läbi.",
    "Mina saan õega hästi läbi.",
    "Saan õega hästi läbi.",
    "Mina saan enda õega hästi läbi.",
    "Saan enda õega hästi läbi.",
    "Mina saan hästi läbi oma õega.",
    "Saan hästi läbi oma õega.",
    "Oma õega saan mina hästi läbi.",
    "Oma õega saan hästi läbi.",
    "Õega saan mina hästi läbi.",
    "Õega saan hästi läbi.",
  ],
  "Meil sai piim otsa.": [
    "Meil sai piim otsa.",
    "Piim sai otsa.",
    "Piim sai meil otsa.",
    "Meil sai piim läbi.",
    "Piim sai läbi.",
    "Meie piim sai otsa.",
  ],
  "Ta jäi rongist maha.": [
    "Ta jäi rongist maha.",
    "Rongist jäi ta maha.",
    "Ta jäi maha rongist.",
    "Jäi rongist maha.",
    "Ta ei jõudnud rongile.",
    "Ta hilines rongile.",
    "Tema jäi rongist maha.",
    "Tema jäi maha rongist.",
    "Tema ei jõudnud rongile.",
  ],
  "Sa näed väsinud välja.": [
    "Sa näed väsinud välja.",
    "Sa näed välja väsinud.",
    "Te näete väsinud välja.",
    "Te näete välja väsinud.",
    "Sa paistad väsinud.",
    "Te paistate väsinud.",
    "Sina näed väsinud välja.",
    "Näed väsinud välja.",
    "Sina näed välja väsinud.",
    "Näed välja väsinud.",
    "Teie näete väsinud välja.",
    "Näete väsinud välja.",
    "Teie näete välja väsinud.",
    "Näete välja väsinud.",
    "Sina paistad väsinud.",
    "Paistad väsinud.",
    "Teie paistate väsinud.",
    "Paistate väsinud.",
  ],
  "Ma võtsin kutse vastu.": [
    "Ma võtsin kutse vastu.",
    "Ma võtsin vastu kutse.",
    "Kutse võtsin ma vastu.",
    "Ma nõustusin kutsega.",
    "Mina võtsin kutse vastu.",
    "Võtsin kutse vastu.",
    "Mina võtsin vastu kutse.",
    "Võtsin vastu kutse.",
    "Kutse võtsin mina vastu.",
    "Kutse võtsin vastu.",
    "Mina nõustusin kutsega.",
    "Nõustusin kutsega.",
  ],
  "Ära anna alla!": ["Ära anna alla!", "Ärge andke alla!"],
  "Ma ei tundnud teda ära.": [
    "Ma ei tundnud teda ära.",
    "Ei tundnud teda ära.",
    "Teda ma ära ei tundnud.",
    "Ma ei tundnud ära teda.",
    "Ei tundnud ära teda.",
    "Teda ei tundnud ära.",
    "Mina ei tundnud teda ära.",
    "Mina ei tundnud ära teda.",
  ],
};

export const IDIOM_TRANSLATE = [
  "Ma ei saanud küsimusest aru.",
  "Saame homme kokku.",
  "Ma saan oma õega hästi läbi.",
  "Meil sai piim otsa.",
  "Ta jäi rongist maha.",
  "Sa näed väsinud välja.",
  "Ma võtsin kutse vastu.",
] as const;

export const IDIOM_ORDER = [
  {
    id: "meet",
    answers: [
      "Ma tahan sinuga kokku saada.",
      "Sinuga tahan ma kokku saada.",
      "Ma tahan kokku saada sinuga.",
      "Kokku tahan ma saada sinuga.",
    ],
  },
  {
    id: "nothing",
    answers: [
      "Me ei saanud millestki aru.",
      "Me ei saanud aru millestki.",
      "Millestki ei saanud me aru.",
    ],
  },
  {
    id: "bus",
    answers: [
      "Kas sa jäid bussist maha?",
      "Kas sa jäid maha bussist?",
      "Kas bussist jäid sa maha?",
    ],
  },
  {
    id: "alone",
    answers: [
      "Ma ei saa sellega üksi hakkama.",
      "Ma ei saa üksi sellega hakkama.",
      "Üksi ei saa ma sellega hakkama.",
      "Sellega ei saa ma üksi hakkama.",
      "Ma ei saa sellega hakkama üksi.",
    ],
  },
  {
    id: "concert",
    answers: ["Kontsert jäi eile ära.", "Eile jäi kontsert ära.", "Kontsert jäi ära eile."],
  },
  {
    id: "think",
    answers: [
      "Sa pead enne järele mõtlema.",
      "Enne pead sa järele mõtlema.",
      "Sa pead järele mõtlema enne.",
    ],
  },
] as const;

export const IDIOM_FIXES = [
  { wrong: "Ma ei saanud õpetajat aru.", right: "Ma ei saanud õpetajast aru." },
  { wrong: "Ma jäin bussi maha.", right: "Ma jäin bussist maha." },
  { wrong: "Ma sain eile Marit kokku.", right: "Ma sain eile Mariga kokku." },
  { wrong: "Kas sa saad selle hakkama?", right: "Kas sa saad sellega hakkama?" },
  { wrong: "Ma ei tundnud sinu ära.", right: "Ma ei tundnud sind ära." },
  { wrong: "Ma saan oma vennaga hästi kokku.", right: "Ma saan oma vennaga hästi läbi." },
  { wrong: "Ta võttis kingitus vastu.", right: "Ta võttis kingituse vastu." },
] as const;

export const IDIOM_FIX_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  ...Object.fromEntries(IDIOM_FIXES.map(({ right }) => [right, [right]])),
};

export const IDIOM_REWRITE = [
  { from: "Ma saan sellest aru.", answer: "Ma tahan sellest aru saada." },
  { from: "Me saame homme kokku.", answer: "Me tahame homme kokku saada." },
  { from: "Ma saan sellega hakkama.", answer: "Ma pean sellega hakkama saama." },
  { from: "Ta jääb bussist maha.", answer: "Ta ei taha bussist maha jääda." },
] as const;

export const IDIOM_REWRITE_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  "Ma tahan sellest aru saada.": [
    "Ma tahan sellest aru saada.",
    "Ma tahan aru saada sellest.",
    "Sellest tahan ma aru saada.",
    "Mina tahan sellest aru saada.",
    "Tahan sellest aru saada.",
    "Mina tahan aru saada sellest.",
    "Tahan aru saada sellest.",
    "Sellest tahan mina aru saada.",
    "Sellest tahan aru saada.",
  ],
  "Me tahame homme kokku saada.": [
    "Me tahame homme kokku saada.",
    "Homme tahame me kokku saada.",
    "Homme tahame kokku saada.",
    "Me tahame kokku saada homme.",
    "Meie tahame homme kokku saada.",
    "Tahame homme kokku saada.",
    "Meie tahame kokku saada homme.",
    "Tahame kokku saada homme.",
  ],
  "Ma pean sellega hakkama saama.": [
    "Ma pean sellega hakkama saama.",
    "Sellega pean ma hakkama saama.",
    "Ma pean hakkama saama sellega.",
    "Mina pean sellega hakkama saama.",
    "Pean sellega hakkama saama.",
    "Sellega pean mina hakkama saama.",
    "Sellega pean hakkama saama.",
    "Mina pean hakkama saama sellega.",
    "Pean hakkama saama sellega.",
  ],
  "Ta ei taha bussist maha jääda.": [
    "Ta ei taha bussist maha jääda.",
    "Ta ei taha maha jääda bussist.",
    "Tema ei taha bussist maha jääda.",
    "Tema ei taha maha jääda bussist.",
  ],
};

export const IDIOM_LETTER = [
  "Tere!",
  "Mul on mure ja ma ei tea, mida teha.",
  "Olen kolmkümmend kaks aastat vana ja töötan raamatupidajana.",
  "Varem elasin väikeses külas, kus kõik tundsid üksteist.",
  "Ma kolisin pool aastat tagasi uude linna, sest võtsin vastu töökoha suures firmas.",
  "Töö ise meeldib mulle, aga kolleegidega ei saa ma hästi läbi.",
  "Lõuna ajal räägivad nad omavahel ja ma ei saa nende naljadest aru.",
  "Kui ma küsin, mis on naljakas, naeravad nad ja ütlevad, et see pole oluline.",
  "Eelmisel nädalal pidime pärast tööd kokku saama, aga kohtumine jäi viimasel hetkel ära.",
  "Keegi ei öelnud mulle midagi ja ma ootasin kohvikus üksi pool tundi.",
  "Järgmisel päeval ütles üks kolleeg, et ta unustas mulle kirjutada.",
  "Mu ema ütleb videokõnes, et ma näen kogu aeg väsinud välja.",
  "Nädalavahetustel olen enamasti üksi kodus, sest mul ei ole siin veel ühtegi sõpra.",
  "Mõnikord tahan alla anda ja tagasi koju kolida.",
  "Teisalt saan ma tööga väga hästi hakkama ja ülemus kiitis mind eile koosolekul.",
  "Kas ma peaksin veel järele mõtlema või kohe uut tööd otsima?",
  "Kaisa.",
] as const;

export const IDIOM_REPLY = [
  "Tere, Kaisa!",
  "Ma saan sinust väga hästi aru, sest mul oli eelmisel aastal sama mure.",
  "Ära anna veel alla.",
  "Pool aastat on uues kohas lühike aeg.",
  "Küsi ühelt kolleegilt, kas ta tahaks sinuga lõuna ajal kokku saada.",
  "Kahekesi on lihtsam rääkida kui suures grupis.",
  "Kui sa nende naljadest aru ei saa, küsi julgelt uuesti.",
  "Ülemus on sinuga rahul ja see on väga oluline.",
  "Mõtle veel paar kuud järele ja vaata, kas olukord läheb paremaks.",
  "Edu!",
  "Anne.",
] as const;

export const IDIOM_CONVERSATION: Conversation = {
  turns: [
    {
      voice: "fourth",
      text: [
        "Tere tulemast saatesse!",
        "Täna on meil külas Olga, kes kolis kolm aastat tagasi Ukrainast Tartusse.",
        "Olga, kuidas sa alguses hakkama said?",
      ],
    },
    {
      voice: "third",
      text: [
        "Tere!",
        "Alguses oli väga raske, sest ma ei saanud peaaegu millestki aru.",
        "Poes ja bussis rääkisid kõik minu jaoks liiga kiiresti.",
      ],
    },
    { voice: "fourth", text: "Kuidas sa siis eesti keelt õppima hakkasid?" },
    {
      voice: "third",
      text: [
        "Ma käisin kaks korda nädalas keelekursusel ja vaatasin õhtuti eesti filme.",
        "Esimesel kuul tahtsin mitu korda alla anda, aga õpetaja ütles, et see on täiesti normaalne.",
      ],
    },
    {
      voice: "fourth",
      text: ["Seda ütlevad kõik õpetajad.", "Kas sa said teiste kursuslastega hästi läbi?"],
      say: "[laughs] Seda ütlevad kõik õpetajad. Kas sa said teiste kursuslastega hästi läbi?",
    },
    {
      voice: "third",
      text: [
        "Väga hästi!",
        "Me saame siiamaani igal reedel kokku ja räägime ainult eesti keeles.",
        "Mõnikord jääb kohtumine ära, kui kellelgi on liiga palju tööd.",
      ],
    },
    { voice: "fourth", text: ["Sa töötad praegu raamatukogus.", "Kuidas sa selle töö leidsid?"] },
    {
      voice: "third",
      text: [
        "Üks sõber saatis mulle kuulutuse.",
        "Ma mõtlesin terve nädala järele, sest mu eesti keel ei olnud veel hea.",
        "Lõpuks võtsin töökoha vastu ja ma ei kahetse seda üldse.",
      ],
    },
    { voice: "fourth", text: "Kas su pere on ka Eestis?" },
    {
      voice: "third",
      text: [
        "Mu ema elab veel Kiievis, aga me räägime iga päev telefonis.",
        "Ta tuli eelmisel suvel külla ja sai minu sõpradega kohe hästi läbi.",
        "Nad rääkisid omavahel vene ja inglise keelt ning kätega.",
      ],
    },
    { voice: "fourth", text: "Mis oli tööl kõige raskem?" },
    {
      voice: "third",
      text: [
        "Telefonikõned!",
        "Telefonis on palju raskem aru saada kui näost näkku.",
        "Ma palusin inimestel aeglasemalt rääkida ja kõik olid väga kannatlikud.",
      ],
    },
    { voice: "fourth", text: "Kuidas sa oma naabritega läbi saad?" },
    {
      voice: "third",
      text: [
        "Hästi.",
        "Minu naaber Peeter aitas mind esimesel talvel väga palju.",
        "Kui mul sai raha otsa, laenas ta mulle ega küsinud kunagi, millal ma selle tagasi maksan.",
      ],
    },
    {
      voice: "fourth",
      text: ["See on tõesti lahke.", "Kas sul on olnud ka naljakaid olukordi?"],
    },
    {
      voice: "third",
      text: [
        "Muidugi.",
        "Kord jäin hommikul bussist maha ja jooksin tööle.",
        "Ma nägin nii väsinud välja, et ülemus saatis mu koju tagasi.",
      ],
      say: "[laughs] Muidugi. Kord jäin hommikul bussist maha ja jooksin tööle. Ma nägin nii väsinud välja, et ülemus saatis mu koju tagasi.",
    },
    { voice: "fourth", text: "Kuidas sa Eesti talvega hakkama said?" },
    {
      voice: "third",
      text: [
        "Esimene talv oli pikk ja pime ning ma jäin kaks korda haigeks.",
        "Nüüd tean ma, et talvel tuleb palju väljas käia, isegi kui on külm.",
        "Ma käin igal laupäeval naabriga metsas suusatamas.",
      ],
    },
    { voice: "fourth", text: "Kas inimesed tunnevad sind nüüd tänaval ära?" },
    {
      voice: "third",
      text: [
        "Mõned lugejad tunnevad küll.",
        "Eile ütles üks vanaproua poes, et ma näen välja nagu tema tütar.",
      ],
    },
    { voice: "fourth", text: "Mida sa vabal ajal teed?" },
    {
      voice: "third",
      text: [
        "Ma laulan kooris.",
        "Alguses oli raske laulude sõnadest aru saada, aga nüüd tean ma neid peast.",
      ],
    },
    {
      voice: "fourth",
      text: "Mida sa soovitaksid inimestele, kes on alles Eestisse kolinud?",
    },
    {
      voice: "third",
      text: [
        "Ärge kartke vigu teha ja ärge andke alla.",
        "Kui sõnad otsa saavad, kasutage käsi ja naeratage.",
        "Eestlased saavad aru, kui sa proovid.",
      ],
    },
    {
      voice: "fourth",
      text: ["Aitäh, Olga!", "Ja viimane küsimus: kas sa jääd Tartusse?"],
    },
    {
      voice: "third",
      text: ["Jah, kindlasti.", "Ma saan siin väga hästi hakkama ja mul on palju sõpru."],
    },
  ],
};

const IDIOM_CLIPS: Record<string, Clip> = {
  ...words([
    ...Object.values(IDIOM_VERBS).flatMap((verbs) =>
      verbs.flatMap(({ verb, said }) => [verb, said]),
    ),
    ...IDIOM_PLAIN.flatMap(({ verb, said }) => [verb, said]),
    ...IDIOM_HEARD.flatMap(({ kokku, labi, aru, hakkama }) => [kokku, labi, aru, hakkama]),
    ...IDIOM_GAPS.map(
      ({ before, answer, after }) =>
        `${before} ${answer}${/^[.!?]$/.test(after) ? "" : " "}${after}`,
    ),
    ...IDIOM_TRANSLATE,
    "Ära anna alla!",
    "Ma ei tundnud teda ära.",
    ...IDIOM_ORDER.map(({ answers }) => answers[0]),
    ...IDIOM_FIXES.map(({ right }) => right),
    ...IDIOM_REWRITE.map(({ answer }) => answer),
  ]),
  "c-olga": IDIOM_CONVERSATION,
};

export const DES_VERBS = {
  most: [
    { inf: "lugeda", form: "lugedes", said: "Ta joob kohvi ajalehte lugedes." },
    { inf: "õppida", form: "õppides", said: "Ma kuulan muusikat õppides." },
    { inf: "rääkida", form: "rääkides", said: "Me jalutasime rääkides." },
    { inf: "oodata", form: "oodates", said: "Ma loen raamatut bussi oodates." },
    { inf: "sõita", form: "sõites", said: "Ära kasuta telefoni sõites." },
    { inf: "kuulata", form: "kuulates", said: "Ma kirjutan kõik üles õpetajat kuulates." },
  ],
  short: [
    { inf: "süüa", form: "süües", said: "Ära räägi süües." },
    { inf: "juua", form: "juues", said: "Ta vaatas filmi teed juues." },
    { inf: "teha", form: "tehes", said: "Ta laulab süüa tehes." },
  ],
  double: [
    { inf: "minna", form: "minnes", said: "Ma ostan leiba koju minnes." },
    { inf: "tulla", form: "tulles", said: "Ma kuulan raadiot tööle tulles." },
    { inf: "olla", form: "olles", said: "Ma õpin eesti keelt kodus olles." },
  ],
} as const;

export const MATA_VERBS = {
  most: [
    { inf: "lugema", form: "lugemata", said: "Ta kirjutas lepingule alla seda lugemata." },
    { inf: "ütlema", form: "ütlemata", said: "Ta lahkus midagi ütlemata." },
    { inf: "küsima", form: "küsimata", said: "Ta võttis mu raamatu küsimata." },
    { inf: "helistama", form: "helistamata", said: "Ära tule külla helistamata." },
    { inf: "maksma", form: "maksmata", said: "Ta lahkus kohvikust maksmata." },
  ],
  odd: [
    { inf: "sööma", form: "söömata", said: "Ma läksin tööle hommikusööki söömata." },
    { inf: "jooma", form: "joomata", said: "Ma läksin tööle kohvi joomata." },
    { inf: "minema", form: "minemata", said: "Ta jäi koosolekule minemata." },
    { inf: "tulema", form: "tulemata", said: "Ta jäi eile tulemata." },
    { inf: "magama", form: "magamata", said: "Ma olin terve öö magamata." },
  ],
} as const;

export const DES_TYPED = [
  "lugeda",
  "õppida",
  "oodata",
  "sõita",
  "süüa",
  "juua",
  "minna",
  "tulla",
] as const;

export const MATA_TYPED = [
  "lugema",
  "ütlema",
  "küsima",
  "helistama",
  "sööma",
  "minema",
  "tulema",
  "magama",
] as const;

export const DES_HEARD = [
  { id: "knock-des", key: "koputa", means: "des", said: "Ta tuli sisse koputades." },
  { id: "knock-mata", key: "koputa", means: "mata", said: "Ta tuli sisse koputamata." },
  { id: "smile-des", key: "naerata", means: "des", said: "Ta lahkus naeratades." },
  { id: "smile-mata", key: "naerata", means: "mata", said: "Ta lahkus naeratamata." },
  { id: "bye-des", key: "jata", means: "des", said: "Ta lahkus hüvasti jättes." },
  { id: "bye-mata", key: "jata", means: "mata", said: "Ta lahkus hüvasti jätmata." },
  { id: "read-des", key: "loe", means: "des", said: "Ma sõin hommikusööki ajalehte lugedes." },
  { id: "eat-mata", key: "soo", means: "mata", said: "Ma läksin tööle hommikusööki söömata." },
  { id: "tea-des", key: "joo", means: "des", said: "Ta vaatas filmi teed juues." },
  { id: "ask-mata", key: "kusi", means: "mata", said: "Ta võttis mu raamatu küsimata." },
  { id: "home-des", key: "mine", means: "des", said: "Ma ostan leiba koju minnes." },
  { id: "go-mata", key: "mine", means: "mata", said: "Ta jäi koosolekule minemata." },
] as const;

export const DES_TRANSLATE = [
  "Ta lahkus midagi ütlemata.",
  "Ma kuulan muusikat õppides.",
  "Ära kasuta telefoni sõites.",
  "Ma ostan leiba koju minnes.",
  "Ära tule külla helistamata.",
  "Ta võttis mu raamatu küsimata.",
  "Ta laulab süüa tehes.",
] as const;

const DES_LEAVE: readonly [string, ...string[]] = [
  "Ta lahkus midagi ütlemata.",
  "Ta lahkus ütlemata midagi.",
  "Midagi ütlemata lahkus ta.",
  "Midagi ütlemata ta lahkus.",
  "Ta läks midagi ütlemata ära.",
  "Ta läks ära midagi ütlemata.",
  "Ta läks midagi ütlemata minema.",
  "Ta läks minema midagi ütlemata.",
  "Midagi ütlemata läks ta ära.",
  "Midagi ütlemata ta läks ära.",
  "Ta lahkus sõnagi ütlemata.",
  "Ta lahkus ütlemata sõnagi.",
  "Sõnagi ütlemata lahkus ta.",
  "Sõnagi ütlemata ta lahkus.",
  "Ta läks sõnagi ütlemata ära.",
  "Ta läks ära sõnagi ütlemata.",
  "Ta läks sõnagi ütlemata minema.",
  "Ta läks minema sõnagi ütlemata.",
  "Tema lahkus midagi ütlemata.",
  "Tema lahkus ütlemata midagi.",
  "Midagi ütlemata tema lahkus.",
  "Tema läks midagi ütlemata ära.",
  "Tema läks ära midagi ütlemata.",
  "Tema läks midagi ütlemata minema.",
  "Tema läks minema midagi ütlemata.",
  "Midagi ütlemata tema läks ära.",
  "Tema lahkus sõnagi ütlemata.",
  "Tema lahkus ütlemata sõnagi.",
  "Sõnagi ütlemata tema lahkus.",
  "Tema läks sõnagi ütlemata ära.",
  "Tema läks ära sõnagi ütlemata.",
  "Tema läks sõnagi ütlemata minema.",
  "Tema läks minema sõnagi ütlemata.",
];

const DES_MUSIC: readonly [string, ...string[]] = [
  "Ma kuulan muusikat õppides.",
  "Ma kuulan õppides muusikat.",
  "Õppides kuulan ma muusikat.",
  "Õppides ma kuulan muusikat.",
  "Muusikat kuulan ma õppides.",
  "Muusikat ma kuulan õppides.",
  "Kuulan muusikat õppides.",
  "Kuulan õppides muusikat.",
  "Õppides kuulan muusikat.",
  "Muusikat kuulan õppides.",
  "Mina kuulan muusikat õppides.",
  "Mina kuulan õppides muusikat.",
  "Õppides kuulan mina muusikat.",
  "Õppides mina kuulan muusikat.",
  "Muusikat kuulan mina õppides.",
  "Muusikat mina kuulan õppides.",
];

const DES_PHONE: readonly [string, ...string[]] = [
  "Ära kasuta telefoni sõites.",
  "Ära kasuta sõites telefoni.",
  "Sõites ära kasuta telefoni.",
  "Ära telefoni kasuta sõites.",
  "Ära kasuta mobiili sõites.",
  "Ära kasuta sõites mobiili.",
  "Sõites ära kasuta mobiili.",
  "Ärge kasutage telefoni sõites.",
  "Ärge kasutage sõites telefoni.",
  "Sõites ärge kasutage telefoni.",
  "Ärge kasutage mobiili sõites.",
  "Ärge kasutage sõites mobiili.",
  "Sõites ärge kasutage mobiili.",
];

const DES_BREAD: readonly [string, ...string[]] = [
  "Ma ostan leiba koju minnes.",
  "Ma ostan koju minnes leiba.",
  "Koju minnes ostan ma leiba.",
  "Koju minnes ma ostan leiba.",
  "Leiba ostan ma koju minnes.",
  "Leiba ma ostan koju minnes.",
  "Ostan leiba koju minnes.",
  "Ostan koju minnes leiba.",
  "Koju minnes ostan leiba.",
  "Leiba ostan koju minnes.",
  "Ma ostan leiva koju minnes.",
  "Ma ostan koju minnes leiva.",
  "Koju minnes ostan ma leiva.",
  "Koju minnes ma ostan leiva.",
  "Ostan leiva koju minnes.",
  "Ostan koju minnes leiva.",
  "Koju minnes ostan leiva.",
  "Mina ostan leiba koju minnes.",
  "Mina ostan koju minnes leiba.",
  "Koju minnes ostan mina leiba.",
  "Koju minnes mina ostan leiba.",
  "Leiba ostan mina koju minnes.",
  "Leiba mina ostan koju minnes.",
  "Mina ostan leiva koju minnes.",
  "Mina ostan koju minnes leiva.",
  "Koju minnes ostan mina leiva.",
  "Koju minnes mina ostan leiva.",
];

const DES_VISIT: readonly [string, ...string[]] = [
  "Ära tule külla helistamata.",
  "Ära tule helistamata külla.",
  "Helistamata ära tule külla.",
  "Külla ära tule helistamata.",
  "Ära tule külla ilma helistamata.",
  "Ära tule ilma helistamata külla.",
  "Ilma helistamata ära tule külla.",
  "Ärge tulge külla helistamata.",
  "Ärge tulge helistamata külla.",
  "Helistamata ärge tulge külla.",
  "Ärge tulge külla ilma helistamata.",
  "Ärge tulge ilma helistamata külla.",
  "Ilma helistamata ärge tulge külla.",
];

const DES_BOOK: readonly [string, ...string[]] = [
  "Ta võttis mu raamatu küsimata.",
  "Ta võttis minu raamatu küsimata.",
  "Ta võttis küsimata mu raamatu.",
  "Ta võttis küsimata minu raamatu.",
  "Küsimata võttis ta mu raamatu.",
  "Küsimata võttis ta minu raamatu.",
  "Küsimata ta võttis mu raamatu.",
  "Küsimata ta võttis minu raamatu.",
  "Mu raamatu võttis ta küsimata.",
  "Minu raamatu võttis ta küsimata.",
  "Ta võttis mu raamatu ilma küsimata.",
  "Ta võttis minu raamatu ilma küsimata.",
  "Ta võttis mu raamatu ära küsimata.",
  "Ta võttis minu raamatu ära küsimata.",
  "Tema võttis mu raamatu küsimata.",
  "Tema võttis minu raamatu küsimata.",
  "Tema võttis küsimata mu raamatu.",
  "Tema võttis küsimata minu raamatu.",
  "Küsimata tema võttis mu raamatu.",
  "Küsimata tema võttis minu raamatu.",
  "Tema võttis mu raamatu ilma küsimata.",
  "Tema võttis minu raamatu ilma küsimata.",
  "Tema võttis mu raamatu ära küsimata.",
  "Tema võttis minu raamatu ära küsimata.",
];

const DES_SING: readonly [string, ...string[]] = [
  "Ta laulab süüa tehes.",
  "Süüa tehes laulab ta.",
  "Süüa tehes ta laulab.",
  "Ta laulab toitu valmistades.",
  "Toitu valmistades laulab ta.",
  "Toitu valmistades ta laulab.",
  "Ta laulab sööki valmistades.",
  "Sööki valmistades laulab ta.",
  "Ta laulab süüa valmistades.",
  "Süüa valmistades laulab ta.",
  "Tema laulab süüa tehes.",
  "Süüa tehes tema laulab.",
  "Tema laulab toitu valmistades.",
  "Toitu valmistades tema laulab.",
  "Tema laulab sööki valmistades.",
  "Tema laulab süüa valmistades.",
];

const DES_COFFEE: readonly [string, ...string[]] = [
  "Ta joob kohvi ajalehte lugedes.",
  "Ta joob ajalehte lugedes kohvi.",
  "Ajalehte lugedes joob ta kohvi.",
  "Ajalehte lugedes ta joob kohvi.",
  "Kohvi joob ta ajalehte lugedes.",
  "Kohvi ta joob ajalehte lugedes.",
  "Ta joob kohvi lugedes ajalehte.",
  "Ta joob lugedes ajalehte kohvi.",
  "Tema joob kohvi ajalehte lugedes.",
  "Tema joob ajalehte lugedes kohvi.",
  "Ajalehte lugedes tema joob kohvi.",
  "Kohvi tema joob ajalehte lugedes.",
  "Tema joob kohvi lugedes ajalehte.",
  "Tema joob lugedes ajalehte kohvi.",
];

const DES_WAIT: readonly [string, ...string[]] = [
  "Ma loen raamatut bussi oodates.",
  "Ma loen bussi oodates raamatut.",
  "Bussi oodates loen ma raamatut.",
  "Bussi oodates ma loen raamatut.",
  "Raamatut loen ma bussi oodates.",
  "Raamatut ma loen bussi oodates.",
  "Loen raamatut bussi oodates.",
  "Loen bussi oodates raamatut.",
  "Bussi oodates loen raamatut.",
  "Raamatut loen bussi oodates.",
  "Mina loen raamatut bussi oodates.",
  "Mina loen bussi oodates raamatut.",
  "Bussi oodates loen mina raamatut.",
  "Bussi oodates mina loen raamatut.",
  "Raamatut loen mina bussi oodates.",
  "Raamatut mina loen bussi oodates.",
];

const DES_EAT: readonly [string, ...string[]] = [
  "Ära räägi süües.",
  "Süües ära räägi.",
  "Ärge rääkige süües.",
  "Süües ärge rääkige.",
];

const DES_TEA: readonly [string, ...string[]] = [
  "Ta vaatas filmi teed juues.",
  "Ta vaatas teed juues filmi.",
  "Teed juues vaatas ta filmi.",
  "Teed juues ta vaatas filmi.",
  "Filmi vaatas ta teed juues.",
  "Filmi ta vaatas teed juues.",
  "Tema vaatas filmi teed juues.",
  "Tema vaatas teed juues filmi.",
  "Teed juues vaatas tema filmi.",
  "Teed juues tema vaatas filmi.",
  "Filmi tema vaatas teed juues.",
];

const DES_RADIO: readonly [string, ...string[]] = [
  "Ma kuulan raadiot tööle tulles.",
  "Ma kuulan tööle tulles raadiot.",
  "Tööle tulles kuulan ma raadiot.",
  "Tööle tulles ma kuulan raadiot.",
  "Raadiot kuulan ma tööle tulles.",
  "Raadiot ma kuulan tööle tulles.",
  "Kuulan raadiot tööle tulles.",
  "Kuulan tööle tulles raadiot.",
  "Tööle tulles kuulan raadiot.",
  "Raadiot kuulan tööle tulles.",
  "Mina kuulan raadiot tööle tulles.",
  "Mina kuulan tööle tulles raadiot.",
  "Tööle tulles kuulan mina raadiot.",
  "Tööle tulles mina kuulan raadiot.",
  "Raadiot kuulan mina tööle tulles.",
  "Raadiot mina kuulan tööle tulles.",
];

const DES_PAY: readonly [string, ...string[]] = [
  "Ta lahkus kohvikust maksmata.",
  "Ta lahkus maksmata kohvikust.",
  "Maksmata lahkus ta kohvikust.",
  "Maksmata ta lahkus kohvikust.",
  "Kohvikust lahkus ta maksmata.",
  "Kohvikust ta lahkus maksmata.",
  "Ta läks kohvikust maksmata ära.",
  "Ta läks kohvikust ära maksmata.",
  "Ta läks maksmata kohvikust ära.",
  "Tema lahkus kohvikust maksmata.",
  "Tema lahkus maksmata kohvikust.",
  "Maksmata tema lahkus kohvikust.",
  "Kohvikust tema lahkus maksmata.",
  "Tema läks kohvikust maksmata ära.",
  "Tema läks kohvikust ära maksmata.",
  "Tema läks maksmata kohvikust ära.",
];

const DES_NO_COFFEE: readonly [string, ...string[]] = [
  "Ma läksin tööle kohvi joomata.",
  "Ma läksin kohvi joomata tööle.",
  "Kohvi joomata läksin ma tööle.",
  "Kohvi joomata ma läksin tööle.",
  "Läksin tööle kohvi joomata.",
  "Läksin kohvi joomata tööle.",
  "Kohvi joomata läksin tööle.",
  "Mina läksin tööle kohvi joomata.",
  "Mina läksin kohvi joomata tööle.",
  "Kohvi joomata läksin mina tööle.",
  "Kohvi joomata mina läksin tööle.",
];

const DES_NO_COME: readonly [string, ...string[]] = [
  "Ta jäi eile tulemata.",
  "Ta jäi tulemata eile.",
  "Eile jäi ta tulemata.",
  "Tulemata jäi ta eile.",
  "Tema jäi eile tulemata.",
  "Tema jäi tulemata eile.",
];

const DES_NO_SLEEP: readonly [string, ...string[]] = [
  "Ma olin terve öö magamata.",
  "Ma olin magamata terve öö.",
  "Terve öö olin ma magamata.",
  "Terve öö ma olin magamata.",
  "Olin terve öö magamata.",
  "Olin magamata terve öö.",
  "Terve öö olin magamata.",
  "Ma olin kogu öö magamata.",
  "Ma olin magamata kogu öö.",
  "Kogu öö olin ma magamata.",
  "Kogu öö ma olin magamata.",
  "Olin kogu öö magamata.",
  "Olin magamata kogu öö.",
  "Kogu öö olin magamata.",
  "Mina olin terve öö magamata.",
  "Mina olin magamata terve öö.",
  "Terve öö olin mina magamata.",
  "Terve öö mina olin magamata.",
  "Mina olin kogu öö magamata.",
  "Mina olin magamata kogu öö.",
  "Kogu öö olin mina magamata.",
  "Kogu öö mina olin magamata.",
];

export const DES_DRILL_ANSWERS = {
  wait: DES_WAIT,
  eat: DES_EAT,
  tea: DES_TEA,
  radio: DES_RADIO,
  pay: DES_PAY,
  coffee: DES_NO_COFFEE,
  come: DES_NO_COME,
  sleep: DES_NO_SLEEP,
} as const;

export const DES_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  "Ta lahkus midagi ütlemata.": DES_LEAVE,
  "Ma kuulan muusikat õppides.": DES_MUSIC,
  "Ära kasuta telefoni sõites.": DES_PHONE,
  "Ma ostan leiba koju minnes.": DES_BREAD,
  "Ära tule külla helistamata.": DES_VISIT,
  "Ta võttis mu raamatu küsimata.": DES_BOOK,
  "Ta laulab süüa tehes.": DES_SING,
};

export const DES_ORDER = [
  {
    id: "leave",
    answers: [
      "Ta lahkus midagi ütlemata.",
      "Ta lahkus ütlemata midagi.",
      "Midagi ütlemata lahkus ta.",
      "Midagi ütlemata ta lahkus.",
    ],
  },
  {
    id: "music",
    answers: [
      "Ma kuulan muusikat õppides.",
      "Ma kuulan õppides muusikat.",
      "Õppides kuulan ma muusikat.",
      "Õppides ma kuulan muusikat.",
      "Muusikat kuulan ma õppides.",
      "Muusikat ma kuulan õppides.",
    ],
  },
  {
    id: "phone",
    answers: [
      "Ära kasuta telefoni sõites.",
      "Ära kasuta sõites telefoni.",
      "Sõites ära kasuta telefoni.",
      "Ära telefoni kasuta sõites.",
    ],
  },
  {
    id: "visit",
    answers: [
      "Ära tule külla helistamata.",
      "Ära tule helistamata külla.",
      "Helistamata ära tule külla.",
      "Külla ära tule helistamata.",
    ],
  },
  {
    id: "book",
    answers: [
      "Ta võttis mu raamatu küsimata.",
      "Ta võttis küsimata mu raamatu.",
      "Küsimata võttis ta mu raamatu.",
      "Küsimata ta võttis mu raamatu.",
      "Mu raamatu võttis ta küsimata.",
    ],
  },
  {
    id: "homework",
    answers: [
      "Ma teen kodutööd raadiot kuulates.",
      "Ma teen raadiot kuulates kodutööd.",
      "Raadiot kuulates teen ma kodutööd.",
      "Raadiot kuulates ma teen kodutööd.",
      "Kodutööd teen ma raadiot kuulates.",
      "Kodutööd ma teen raadiot kuulates.",
    ],
  },
] as const;

export const DES_FIXES = [
  { wrong: "Ta lahkus sõnagi öeldes.", right: "Ta lahkus sõnagi ütlemata." },
  { wrong: "Ta luges kirja söömata.", right: "Ta luges kirja süües." },
  { wrong: "Ma ei tule kunagi helistades.", right: "Ma ei tule kunagi helistamata." },
  { wrong: "Ma kuulan muusikat õppimata.", right: "Ma kuulan muusikat õppides." },
  { wrong: "Ta jäi koosolekule minnemata.", right: "Ta jäi koosolekule minemata." },
  { wrong: "Ma ostan leiba koju minedes.", right: "Ma ostan leiba koju minnes." },
  {
    wrong: "Ta kirjutas lepingule alla see lugemata.",
    right: "Ta kirjutas lepingule alla seda lugemata.",
  },
] as const;

export const DES_FIX_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  ...Object.fromEntries(DES_FIXES.map(({ right }) => [right, [right]])),
};

export const DES_REWRITE = [
  {
    from: "Ta joob kohvi ja loeb ajalehte.",
    answer: "Ta joob kohvi ajalehte lugedes.",
  },
  { from: "Ta lahkus ja ei öelnud midagi.", answer: "Ta lahkus midagi ütlemata." },
  { from: "Ma lähen koju ja ostan leiba.", answer: "Ma ostan leiba koju minnes." },
  { from: "Ta võttis mu raamatu ega küsinud.", answer: "Ta võttis mu raamatu küsimata." },
] as const;

export const DES_REWRITE_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  "Ta joob kohvi ajalehte lugedes.": DES_COFFEE,
  "Ta lahkus midagi ütlemata.": DES_LEAVE,
  "Ma ostan leiba koju minnes.": DES_BREAD,
  "Ta võttis mu raamatu küsimata.": DES_BOOK,
};

export const DES_DIARY = [
  "Eelmisel nädalavahetusel sõitsime sõpradega Võrumaale vanaema juurde.",
  "Ma olin terve öö magamata ega tahtnud autot juhtida.",
  "Ma olin väsinud, aga õnnelik.",
  "Päike paistis ja tee oli tühi.",
  "Peeter sõitis ja mina vaatasin aknast välja raadiot kuulates.",
  "Tavaliselt räägib Peeter sõites kogu aeg, aga seekord ta vaikis.",
  "Ta oli hommikul kiirustanud ja joonud ainult kohvi, hommikusööki söömata.",
  "Teel peatusime ühes väikeses kohvikus.",
  "Peeter lahkus sealt maksmata ja pidi hiljem tagasi minema.",
  "Kell kümme jõudsime külla, kus vanaema elab.",
  "Õues oli soe ja lõhnas värske heina järele.",
  "Ta ootas meid õues ja kutsus kohe kööki sööma.",
  "Laual oli värske leib, mille ta oli hommikul vara küpsetanud.",
  "Me sõime ja vanaema rääkis süües oma lapsepõlvest.",
  "Ta ütles, et vanasti käisid kõik naabrid üksteisel külas helistamata, sest telefone polnud.",
  "Pärast sööki läks Peeter metsa jalutama.",
  "Mina jäin vanaemaga rääkima ja kuulasin teda kiirustamata.",
  "Kui Peeter tagasi tuli, oli tal käes suur korv seeni.",
  "Vanaema vaatas neid naeratades ja ütles, et need on mürgised.",
  "Õhtul sõitsime Tartusse tagasi ja Peeter laulis sõites kõvasti.",
  "Koju jõudes helistasin kohe emale ja rääkisin talle kõigest.",
  "Ema küsis, kas vanaema oli meid hästi toitnud.",
  "Ma vastasin, et ta ei lasknud kedagi näljasena minema.",
  "Ma ei mäleta, millal ma viimati nii hästi puhkasin.",
  "Nüüd ootan juba järgmist reisi.",
] as const;

export const DES_CONVERSATION: Conversation = {
  turns: [
    {
      voice: "fourth",
      text: [
        "Tere, Liisa!",
        "Kuidas sul uues korteris läheb?",
        "Kas sa oled oma korterikaaslasega juba tuttavaks saanud?",
      ],
    },
    {
      voice: "third",
      text: [
        "Tere, Kalev!",
        "Korter on väike, aga väga valge.",
        "Korterikaaslane on sõbralik, aga ta teeb mõnda asja hoopis teisiti kui mina.",
      ],
    },
    { voice: "fourth", text: "Näiteks mida?" },
    {
      voice: "third",
      text: [
        "Näiteks hommikul.",
        "Ta joob kohvi telefoni vaadates ja ei vasta, kui ma midagi küsin.",
      ],
    },
    {
      voice: "fourth",
      text: [
        "Mina teen hommikul sedasama.",
        "Ma loen uudiseid kohvi juues ja kellelgi ei ole selle vastu midagi.",
      ],
      say: "[laughs] Mina teen hommikul sedasama. Ma loen uudiseid kohvi juues ja kellelgi ei ole selle vastu midagi.",
    },
    {
      voice: "third",
      text: [
        "Hommikul ma ei pahanda.",
        "Aga eile tuli ta mu tuppa sisse koputamata, kui ma just õppisin.",
        "Siis võttis ta mu laadija küsimata ja läks midagi ütlemata minema.",
      ],
    },
    { voice: "fourth", text: ["See ei ole kena.", "Kas sa rääkisid temaga?"] },
    {
      voice: "third",
      text: [
        "Rääkisin õhtul.",
        "Ütlesin, et ta võiks vähemalt koputada, enne kui sisse tuleb.",
        "Ta vabandas ja ütles, et ei teadnud, et see mind häirib.",
      ],
    },
    { voice: "fourth", text: ["Noh, siis on juba parem.", "Kas ta teeb ka midagi head?"] },
    {
      voice: "third",
      text: [
        "Teeb küll.",
        "Õhtuti teeb ta süüa ja laulab seda tehes.",
        "Eile kutsus ta mind sööma ja see oli väga hea.",
      ],
    },
    { voice: "fourth", text: "Kas te koristate ka koos?" },
    {
      voice: "third",
      text: [
        "Ei, igaüks omal päeval.",
        "Tema koristab pühapäeviti ja kuulab seda tehes valju muusikat.",
        "Mõnikord olen terve öö magamata, sest ta räägib kodus olles valjusti telefoniga.",
      ],
    },
    {
      voice: "fourth",
      text: [
        "Oi, see ei ole hea.",
        "Mul oli kunagi korterikaaslane, kes jättis üüri iga kuu maksmata.",
        "Siis ma enam temaga hästi läbi ei saanud.",
      ],
    },
    { voice: "third", text: ["Oi, see on palju hullem!", "Minu oma maksab vähemalt õigel ajal."] },
    {
      voice: "fourth",
      text: ["Siis on sul vedanud.", "Kui ta hakkab veel koputama, pole sul millegi üle kurta."],
    },
    {
      voice: "third",
      text: ["Ma loodan seda.", "Kas sa arvad, et ma peaksin talle veel kord ütlema?"],
    },
    { voice: "fourth", text: ["Ei, oota nädal.", "Vaatame, kas ta jätab veel koputamata."] },
    {
      voice: "third",
      text: ["Hea mõte.", "Aga sinul, Kalev?", "Kuidas sul eile õhtul läks?"],
    },
    {
      voice: "fourth",
      text: [
        "Eile oli naljakas päev.",
        "Ma lugesin bussi oodates raamatut ja ei märganud, et buss tuli.",
        "Nii ma jäingi bussist maha.",
      ],
    },
    { voice: "third", text: ["Oi!", "Mis sa siis tegid?"] },
    {
      voice: "fourth",
      text: ["Kõndisin koju ja helistasin vanaemale.", "Ta naeris minu üle, aga mitte kurjalt."],
    },
    { voice: "third", text: ["Kas ta helistab sulle tihti?"] },
    {
      voice: "fourth",
      text: ["Iga pühapäev.", "Ta ei jäta kunagi helistamata, isegi siis, kui ma ei vasta."],
    },
    {
      voice: "third",
      text: ["Siis ta hoolib sinust väga.", "Kuule, kas sa tuled laupäeval külla?"],
    },
    {
      voice: "fourth",
      text: [
        "Tulen küll.",
        "Ma ei tule kunagi helistamata, nii et helistan enne.",
        "Ja ma toon kaasa head kooki.",
      ],
    },
    {
      voice: "third",
      text: [
        "Väga hea.",
        "Siis ma ootan sind laupäeval kell kuus ja teen midagi head.",
        "Ma ei tea veel, kas kalasuppi või köögiviljasuppi.",
      ],
    },
    {
      voice: "fourth",
      text: ["Tee köögiviljasuppi.", "Ma ei söö kala, aga ma söön hea meelega kõike muud."],
    },
    {
      voice: "third",
      text: [
        "Kokku lepitud.",
        "Meie maja on teisel pool parki, nii et jalutad mööda jõge otse meie maja juurde.",
      ],
    },
    {
      voice: "fourth",
      text: ["Hästi, siis jalutan kohale muusikat kuulates.", "Nägemist, Liisa!"],
    },
    { voice: "third", text: ["Nägemist, Kalev!", "Kohtume laupäeval."] },
  ],
};

const DES_CLIPS: Record<string, Clip> = {
  ...words([
    ...Object.values(DES_VERBS).flatMap((verbs) => verbs.flatMap(({ inf, said }) => [inf, said])),
    ...Object.values(MATA_VERBS).flatMap((verbs) => verbs.flatMap(({ inf, said }) => [inf, said])),
    ...Object.values(DES_VERBS).flatMap((verbs) => verbs.map(({ form }) => form)),
    ...Object.values(MATA_VERBS).flatMap((verbs) => verbs.map(({ form }) => form)),
    "koputades",
    "koputamata",
    ...DES_HEARD.map(({ said }) => said),
    ...DES_TRANSLATE,
    ...DES_ORDER.map(({ answers }) => answers[0]),
    ...DES_FIXES.map(({ right }) => right),
    ...DES_REWRITE.map(({ answer }) => answer),
  ]),
  "c-liisa": DES_CONVERSATION,
};

export const ROUTE_WORDS = ["läbi", "üle", "mööda", "ümber", "kaudu"] as const;

export const ROUTE_TABLE = [
  { word: "läbi", phrase: "läbi |metsa", said: "Rong sõidab läbi metsa." },
  { word: "üle", phrase: "üle |tee", said: "Lapsed jooksid üle tee." },
  { word: "mööda", phrase: "mööda |teed", said: "Me kõndisime mööda teed." },
  { word: "ümber", phrase: "|järve ümber", said: "Me sõitsime rattaga järve ümber." },
  { word: "kaudu", phrase: "|Riia kaudu", said: "Me lendasime Riia kaudu." },
] as const;

export const ROUTE_PAIRS = [
  { noun: "tee", across: "üle |tee", along: "mööda |teed" },
  { noun: "jõgi", across: "üle |jõe", along: "mööda |jõge" },
  { noun: "sild", across: "üle |silla", along: "mööda |silda" },
  { noun: "tänav", across: "üle |tänava", along: "mööda |tänavat" },
  { noun: "meri", across: "üle |mere", along: "mööda |merd" },
] as const;

export const ROUTE_HEARD = [
  { means: "through", said: "Valgus tuleb läbi akna." },
  { means: "through", said: "Ma lähen tööle läbi linna." },
  { means: "across", said: "Lapsed jooksid üle tänava." },
  { means: "across", said: "Me sõitsime praamiga üle mere." },
  { means: "along", said: "Me jalutasime mööda randa." },
  { means: "along", said: "Ta sõitis rattaga mööda jõge." },
  { means: "around", said: "Pere istub laua ümber." },
  { means: "around", said: "Koer jooksis ümber maja." },
] as const;

export const ROUTE_SORT = [
  { form: "jõe", bin: "gen", after: "üle" },
  { form: "jõge", bin: "part", after: "mööda" },
  { form: "mäe", bin: "gen", after: "üle" },
  { form: "mäge", bin: "part", after: "mööda" },
  { form: "silla", bin: "gen", after: "üle" },
  { form: "silda", bin: "part", after: "mööda" },
  { form: "mere", bin: "gen", after: "üle" },
  { form: "merd", bin: "part", after: "mööda" },
] as const;

export const ROUTE_FORMS = [
  { noun: "aed", cue: "Kass tuli läbi … .", answer: "aia", said: "Kass tuli läbi aia." },
  { noun: "sild", cue: "Me sõitsime üle … .", answer: "silla", said: "Me sõitsime üle silla." },
  { noun: "tee", cue: "Ma kõnnin mööda … .", answer: "teed", said: "Ma kõnnin mööda teed." },
  { noun: "laud", cue: "Me istusime … ümber.", answer: "laua", said: "Me istusime laua ümber." },
  {
    noun: "sõber",
    cue: "Ma sain selle töö … kaudu.",
    answer: "sõbra",
    said: "Ma sain selle töö sõbra kaudu.",
  },
  { noun: "linn", cue: "Buss sõidab läbi … .", answer: "linna", said: "Buss sõidab läbi linna." },
  {
    noun: "tänav",
    cue: "Nad jalutasid mööda … .",
    answer: "tänavat",
    said: "Nad jalutasid mööda tänavat.",
  },
  { noun: "jõgi", cue: "Me ujusime üle … .", answer: "jõe", said: "Me ujusime üle jõe." },
] as const;

export const ROUTE_TRANSLATE = [
  "Me kõndisime läbi metsa.",
  "Lapsed jooksid üle tee.",
  "Ma kõnnin igal hommikul mööda randa.",
  "Me istusime laua ümber.",
  "Me lendasime Riia kaudu.",
  "Kass hüppas läbi akna sisse.",
  "Me sõitsime üle silla.",
] as const;

export const ROUTE_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  "Me kõndisime läbi metsa.": [
    "Me kõndisime läbi metsa.",
    "Me kõndisime metsa läbi.",
    "Me kõndisime metsast läbi.",
    "Me läksime läbi metsa.",
    "Me jalutasime läbi metsa.",
    "Meie kõndisime läbi metsa.",
    "Kõndisime läbi metsa.",
    "Meie kõndisime metsa läbi.",
    "Kõndisime metsa läbi.",
    "Meie kõndisime metsast läbi.",
    "Kõndisime metsast läbi.",
    "Meie läksime läbi metsa.",
    "Läksime läbi metsa.",
    "Meie jalutasime läbi metsa.",
    "Jalutasime läbi metsa.",
  ],
  "Lapsed jooksid üle tee.": [
    "Lapsed jooksid üle tee.",
    "Lapsed jooksid teest üle.",
    "Lapsed jooksid üle tänava.",
    "Lapsed jooksid tänavast üle.",
    "Üle tee jooksid lapsed.",
    "Lapsed jooksid üle sõidutee.",
  ],
  "Ma kõnnin igal hommikul mööda randa.": [
    "Ma kõnnin igal hommikul mööda randa.",
    "Ma kõnnin mööda randa igal hommikul.",
    "Ma käin igal hommikul mööda randa.",
    "Igal hommikul jalutan ma randa mööda.",
    "Igal hommikul kõnnin ma mööda randa.",
    "Ma kõnnin igal hommikul randa mööda.",
    "Igal hommikul kõnnin ma randa mööda.",
    "Ma jalutan igal hommikul mööda randa.",
    "Igal hommikul jalutan ma mööda randa.",
    "Ma jalutan mööda randa igal hommikul.",
    "Iga hommik kõnnin ma mööda randa.",
    "Mina kõnnin igal hommikul mööda randa.",
    "Kõnnin igal hommikul mööda randa.",
    "Mina kõnnin mööda randa igal hommikul.",
    "Kõnnin mööda randa igal hommikul.",
    "Mina käin igal hommikul mööda randa.",
    "Käin igal hommikul mööda randa.",
    "Igal hommikul jalutan mina randa mööda.",
    "Igal hommikul jalutan randa mööda.",
    "Igal hommikul kõnnin mina mööda randa.",
    "Igal hommikul kõnnin mööda randa.",
    "Mina kõnnin igal hommikul randa mööda.",
    "Kõnnin igal hommikul randa mööda.",
    "Igal hommikul kõnnin mina randa mööda.",
    "Igal hommikul kõnnin randa mööda.",
    "Mina jalutan igal hommikul mööda randa.",
    "Jalutan igal hommikul mööda randa.",
    "Igal hommikul jalutan mina mööda randa.",
    "Igal hommikul jalutan mööda randa.",
    "Mina jalutan mööda randa igal hommikul.",
    "Jalutan mööda randa igal hommikul.",
    "Iga hommik kõnnin mina mööda randa.",
    "Iga hommik kõnnin mööda randa.",
  ],
  "Me istusime laua ümber.": [
    "Me istusime laua ümber.",
    "Me istusime ümber laua.",
    "Laua ümber istusime me.",
    "Laua ümber istusime.",
    "Ümber laua istusime.",
    "Meie istusime laua ümber.",
    "Istusime laua ümber.",
    "Meie istusime ümber laua.",
    "Istusime ümber laua.",
  ],
  "Me lendasime Riia kaudu.": [
    "Me lendasime Riia kaudu.",
    "Me lendasime läbi Riia.",
    "Riia kaudu lendasime me.",
    "Riia kaudu lendasime.",
    "Läbi Riia lendasime.",
    "Meie lendasime Riia kaudu.",
    "Lendasime Riia kaudu.",
    "Meie lendasime läbi Riia.",
    "Lendasime läbi Riia.",
  ],
  "Kass hüppas läbi akna sisse.": [
    "Kass hüppas läbi akna sisse.",
    "Kass hüppas aknast sisse.",
    "Kass hüppas akna kaudu sisse.",
    "Kass hüppas aknast sisse tuppa.",
    "Läbi akna hüppas kass sisse.",
  ],
  "Me sõitsime üle silla.": [
    "Me sõitsime üle silla.",
    "Me sõitsime sillast üle.",
    "Üle silla sõitsime me.",
    "Üle silla sõitsime.",
    "Sõitsime autoga üle silla.",
    "Meie sõitsime üle silla.",
    "Sõitsime üle silla.",
    "Meie sõitsime sillast üle.",
    "Sõitsime sillast üle.",
  ],
};

export const ROUTE_FIXES = [
  { wrong: "Me kõndisime mööda tee.", right: "Me kõndisime mööda teed." },
  { wrong: "Lapsed jooksid üle teed.", right: "Lapsed jooksid üle tee." },
  { wrong: "Me sõitsime läbi linnas.", right: "Me sõitsime läbi linna." },
  { wrong: "Nad istusid lauda ümber.", right: "Nad istusid laua ümber." },
  { wrong: "Ma ujusin üle jõge.", right: "Ma ujusin üle jõe." },
  { wrong: "Me jalutasime mööda jõe.", right: "Me jalutasime mööda jõge." },
  { wrong: "Me lendasime Riiast kaudu.", right: "Me lendasime Riia kaudu." },
] as const;

export const ROUTE_FIX_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  ...Object.fromEntries(ROUTE_FIXES.map(({ right }) => [right, [right]])),
};

export const ROUTE_EXTRA = [
  "Ma sõidan tööle Tartu kaudu.",
  "Lind lendas üle maja.",
  "Me sõitsime mööda merd.",
  "Lapsed jooksid ümber maja.",
] as const;

export const ROUTE_TRAIL = [
  "Kõrvemaa matkarada on kaheksa kilomeetrit pikk ja sobib ka lastega peredele.",
  "Rada algab parklast, kus on infostend ja tualett.",
  "Kõigepealt läheb rada läbi männimetsa, kus on alati vaikne ja jahe.",
  "Umbes kahe kilomeetri pärast jõuate väikese jõe juurde.",
  "Üle jõe viib kitsas puusild, nii et koeraga peab olema ettevaatlik.",
  "Pärast silda läheb rada mööda jõge edasi ja siis rappa.",
  "Rabas kõnnite mööda laudteed, sest maa on seal märg ja pehme.",
  "Ärge astuge laudteelt maha!",
  "Raba keskel on vaatetorn, kust näeb kaugele üle raba ja metsade.",
  "Seejärel läheb rada ümber väikese järve, kus suvel saab ujuda.",
  "Järve ääres on kolm lõkkekohta ja pingid, kus saab puhata.",
  "Tagasi parklasse jõuate mööda vana metsateed.",
  "Kogu ring võtab umbes kolm tundi.",
  "Rada on avatud aasta ringi, aga talvel on laudtee libe.",
  "Kevadel võib jõe ääres olla väga märg, nii et pange jalga kummikud.",
  "Bussiga saab parklasse Tallinnast Aegviidu kaudu.",
  "Palun võtke oma prügi endaga kaasa.",
] as const;

export const ROUTE_MODEL = [
  "Ma elan Tartus Karlova linnaosas.",
  "Igal hommikul sõidan ma rattaga tööle.",
  "Kõigepealt sõidan ma mööda meie tänavat raudtee juurde.",
  "Siis lähen ma üle raudtee ja sõidan läbi väikese pargi.",
  "Pargis on alati palju koeri, nii et ma sõidan aeglaselt.",
  "Pärast parki sõidan ma mööda jõge kesklinna poole.",
  "Kesklinnas sõidan ma ümber Raekoja platsi, sest seal on palju inimesi.",
  "Viimaks lähen ma üle silla ja olen tööl.",
  "Tee võtab umbes kakskümmend minutit.",
  "Kui sajab vihma, sõidan ma bussiga kesklinna kaudu.",
] as const;

export const ROUTE_CONVERSATION: Conversation = {
  turns: [
    { voice: "main", text: "Mari, kas sa oled laupäeva rattamatka plaani juba vaadanud?" },
    {
      voice: "second",
      text: [
        "Jah, ma vaatasin eile õhtul kaarti.",
        "Me võiksime sõita Tartust Elvasse, see on umbes kolmkümmend kilomeetrit.",
      ],
    },
    { voice: "main", text: "Kas me sõidame mööda suurt maanteed?" },
    {
      voice: "second",
      text: [
        "Ei, seal on liiga palju autosid.",
        "Ma leidsin parema tee, mis läheb kõigepealt mööda jõge ja siis läbi metsa.",
      ],
    },
    { voice: "main", text: ["Kõlab hästi.", "Kas seal on ka sild üle jõe?"] },
    {
      voice: "second",
      text: [
        "Jah, linnast väljas on üks väike sild.",
        "Me sõidame üle silla ja siis mööda kruusateed lõuna poole.",
      ],
    },
    {
      voice: "main",
      text: "Kruusateel on rattaga raske sõita, eriti kui on vihma sadanud.",
    },
    {
      voice: "second",
      text: [
        "See on tõsi, aga kruusateed on ainult viis kilomeetrit.",
        "Pärast seda tuleb uus rattatee, mis läheb otse Elvasse.",
      ],
    },
    { voice: "main", text: "Ja mida me Elvas teeme?" },
    {
      voice: "second",
      text: [
        "Elvas on kaks järve.",
        "Ma tahaksin ühe järve ümber jalutada ja siis kohvikus lõunat süüa.",
        "Ma tean ühte kohvikut järve ääres, kus on väga head supid.",
      ],
    },
    { voice: "main", text: "Kui kaua see sõit kestab?" },
    {
      voice: "second",
      text: [
        "Kui me sõidame rahulikult, siis umbes kaks ja pool tundi.",
        "Metsas teeme ühe pausi, sest seal on ilus vaade üle jõe.",
      ],
    },
    { voice: "main", text: "Kui ilm on soe, võiksime Elvas ka ujuma minna." },
    {
      voice: "second",
      text: ["Septembris?", "Vesi on juba päris külm, aga sina võid proovida."],
      say: "[laughs] Septembris? Vesi on juba päris külm, aga sina võid proovida.",
    },
    {
      voice: "main",
      text: ["Hea küll, vaatame.", "Kuidas me tagasi tuleme, kas jälle rattaga?"],
    },
    {
      voice: "second",
      text: [
        "Ei, ma arvan, et see oleks liiga palju.",
        "Elvast läheb rong Tartusse iga tunni tagant ja ratta võib rongi peale võtta.",
      ],
    },
    { voice: "main", text: "Kas rongipilet tuleb ette osta?" },
    {
      voice: "second",
      text: ["Ei pea, piletit saab osta ka rongis.", "Ratta eest tuleb natuke juurde maksta."],
    },
    { voice: "main", text: "Kas Peeter tuleb ka?" },
    {
      voice: "second",
      text: [
        "Peeter tahtis tulla, aga tal on laupäeval töö.",
        "Ta ütles, et võib-olla tuleb ta pühapäeval autoga Elvasse.",
        "Siis saame koos järve ümber jalutada.",
      ],
    },
    { voice: "main", text: "Mis kell me hommikul alustame?" },
    {
      voice: "second",
      text: [
        "Kohtume kell üheksa minu maja ees.",
        "Siis sõidame läbi kesklinna ja Raekoja platsi kaudu jõe äärde.",
      ],
    },
    {
      voice: "main",
      text: [
        "Raekoja platsil on laupäeva hommikul turg ja seal on palju inimesi.",
        "Võib-olla on parem sõita ümber kesklinna?",
      ],
    },
    {
      voice: "second",
      text: ["Hea mõte.", "Siis sõidame mööda Riia tänavat ja jõuame jõe äärde ülikooli juures."],
    },
    { voice: "main", text: "Mida ma pean kaasa võtma?" },
    {
      voice: "second",
      text: ["Vett, midagi süüa ja vihmajope.", "Ilmateade lubab pilvist ilma, aga mitte vihma."],
    },
    { voice: "main", text: "Ja kui mul läheb rattarehv katki?" },
    {
      voice: "second",
      text: [
        "Ma võtan tööriistad kaasa.",
        "Ma olen seda teed juba kaks korda sõitnud ja tean, et kõik läheb hästi.",
      ],
      say: "[laughs] Ma võtan tööriistad kaasa. Ma olen seda teed juba kaks korda sõitnud ja tean, et kõik läheb hästi.",
    },
    { voice: "main", text: "Väga hea, siis kohtume laupäeval kell üheksa!" },
    { voice: "second", text: "Hästi, aga saada mulle sõnum, kui sul on veel küsimusi." },
  ],
};

const ROUTE_CLIPS: Record<string, Clip> = {
  ...words([
    ...ROUTE_WORDS,
    ...ROUTE_TABLE.flatMap(({ phrase, said }) => [phrase.replace("|", ""), said]),
    ...ROUTE_PAIRS.flatMap(({ across, along }) => [
      across.replace("|", ""),
      along.replace("|", ""),
    ]),
    ...ROUTE_HEARD.map(({ said }) => said),
    ...ROUTE_SORT.map(({ form, after }) => `${after} ${form}`),
    ...ROUTE_FORMS.map(({ said }) => said),
    ...ROUTE_TRANSLATE,
    ...ROUTE_FIXES.map(({ right }) => right),
    ...ROUTE_EXTRA,
  ]),
  "c-elva": ROUTE_CONVERSATION,
};

export const AGENT_DOERS = [
  { verb: "õpetama", doer: "õpeta|ja", said: "Minu õde on õpetaja." },
  { verb: "müüma", doer: "müü|ja", said: "Müüja aitas mind." },
  { verb: "lugema", doer: "luge|ja", said: "Raamat meeldis lugejatele." },
  { verb: "laulma", doer: "laul|ja", said: "Laulja laulis kolm laulu." },
  { verb: "ostma", doer: "ost|ja", said: "Ostja maksis kaardiga." },
  { verb: "töötama", doer: "tööta|ja", said: "Firmas on sada töötajat." },
  { verb: "tegema", doer: "tegi|ja", said: "Ta on tõeline tegija." },
] as const;

export const AGENT_ACTIONS = [
  { verb: "lugema", action: "luge|mine", part: "luge|mist", said: "Mulle meeldib lugemine." },
  { verb: "ujuma", action: "uju|mine", part: "uju|mist", said: "Ujumine on tervisele hea." },
  {
    verb: "õppima",
    action: "õppi|mine",
    part: "õppi|mist",
    said: "Keele õppimine võtab aega.",
  },
  {
    verb: "suitsetama",
    action: "suitseta|mine",
    part: "suitseta|mist",
    said: "Suitsetamine on keelatud.",
  },
  { verb: "laulma", action: "laul|mine", part: "laul|mist", said: "Ma armastan laulmist." },
  {
    verb: "magama",
    action: "maga|mine",
    part: "maga|mist",
    said: "Ma loen enne magamist.",
  },
] as const;

export const AGENT_HEARD = [
  { id: "laul", ja: "laulja", mine: "laulmine", ma: "laulma" },
  { id: "luge", ja: "lugeja", mine: "lugemine", ma: "lugema" },
  { id: "ost", ja: "ostja", mine: "ostmine", ma: "ostma" },
] as const;

export const AGENT_SORT = [
  { w: "kuulaja", bin: "ja" },
  { w: "sõitja", bin: "ja" },
  { w: "õppija", bin: "ja" },
  { w: "mängija", bin: "ja" },
  { w: "kuulamine", bin: "mine" },
  { w: "sõitmine", bin: "mine" },
  { w: "parkimine", bin: "mine" },
  { w: "mängimine", bin: "mine" },
] as const;

export const AGENT_FORMS = [
  { verb: "õpetama", kind: "ja", answer: "õpetaja" },
  { verb: "ujuma", kind: "mine", answer: "ujumine" },
  { verb: "müüma", kind: "ja", answer: "müüja" },
  { verb: "suitsetama", kind: "mine", answer: "suitsetamine" },
  { verb: "jooksma", kind: "ja", answer: "jooksja" },
  { verb: "parkima", kind: "mine", answer: "parkimine" },
  { verb: "kuulama", kind: "ja", answer: "kuulaja" },
  { verb: "õppima", kind: "mine", answer: "õppimine" },
] as const;

export const AGENT_TRANSLATE = [
  "Mulle meeldib lugemine.",
  "Ujumine on tervisele hea.",
  "Mu õde on õpetaja.",
  "Müüja on väga lahke.",
  "Suitsetamine on siin keelatud.",
  "Eesti keele õppimine võtab aega.",
  "Ostja maksis sularahas.",
] as const;

export const AGENT_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  "Mulle meeldib lugemine.": [
    "Mulle meeldib lugemine.",
    "Mulle meeldib lugeda.",
    "Minule meeldib lugemine.",
    "Minule meeldib lugeda.",
    "Ma armastan lugemist.",
    "Ma armastan lugeda.",
    "Lugemine meeldib mulle.",
    "Lugemine meeldib minule.",
    "Lugeda meeldib mulle.",
    "Lugeda meeldib minule.",
    "Mina armastan lugemist.",
    "Armastan lugemist.",
    "Mina armastan lugeda.",
    "Armastan lugeda.",
  ],
  "Ujumine on tervisele hea.": [
    "Ujumine on tervisele hea.",
    "Ujumine on hea tervisele.",
    "Ujumine on tervisele kasulik.",
    "Ujumine on tervislik.",
    "Ujuda on tervisele hea.",
    "Tervisele on ujumine hea.",
    "Ujumine tuleb tervisele kasuks.",
  ],
  "Mu õde on õpetaja.": [
    "Mu õde on õpetaja.",
    "Minu õde on õpetaja.",
    "Mu õde töötab õpetajana.",
    "Minu õde töötab õpetajana.",
    "Õpetajana töötab mu õde.",
    "Õpetajana töötab minu õde.",
  ],
  "Müüja on väga lahke.": [
    "Müüja on väga lahke.",
    "Müüja on väga sõbralik.",
    "Müüja on väga kena.",
    "Müüja on väga viisakas.",
  ],
  "Suitsetamine on siin keelatud.": [
    "Suitsetamine on siin keelatud.",
    "Siin on suitsetamine keelatud.",
    "Siin ei tohi suitsetada.",
    "Siin ei või suitsetada.",
    "Suitsetada siin ei tohi.",
    "Suitsetada siin ei või.",
    "Suitsetamine on keelatud siin.",
    "Siin on keelatud suitsetada.",
    "Siin ei ole suitsetamine lubatud.",
  ],
  "Eesti keele õppimine võtab aega.": [
    "Eesti keele õppimine võtab aega.",
    "Eesti keele õppimine nõuab aega.",
    "Eesti keelt õppida võtab aega.",
    "Eesti keele õppimiseks kulub aega.",
  ],
  "Ostja maksis sularahas.": [
    "Ostja maksis sularahas.",
    "Ostja maksis sularahaga.",
    "Sularahas maksis ostja.",
  ],
};

export const AGENT_FIXES = [
  { wrong: "Mulle meeldib lugemist.", right: "Mulle meeldib lugemine." },
  { wrong: "Ma armastan ujumine.", right: "Ma armastan ujumist." },
  { wrong: "Ta töötab müüja.", right: "Ta töötab müüjana." },
  { wrong: "Mu vend on hea laulmine.", right: "Mu vend on hea laulja." },
  { wrong: "Siin on parkima keelatud.", right: "Siin on parkimine keelatud." },
  { wrong: "Kõik õpetajat olid koosolekul.", right: "Kõik õpetajad olid koosolekul." },
] as const;

export const AGENT_FIX_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  ...Object.fromEntries(AGENT_FIXES.map(({ right }) => [right, [right]])),
  "Siin on parkimine keelatud.": ["Siin on parkimine keelatud.", "Siin on parkida keelatud."],
};

export const AGENT_EXTRA = [
  "Kuulajad plaksutasid.",
  "Ta töötab müüjana.",
  "Ma armastan lugemist.",
  "Õppimine on raske.",
] as const;

export const AGENT_AD = [
  "Tartu kesklinna raamatupood otsib uut müüjat.",
  "Meie pood on avatud iga päev kella kümnest seitsmeni.",
  "Müüja töö on klientide nõustamine, raamatute tellimine ja kassas töötamine.",
  "Sobiv kandidaat armastab lugemist ja suhtlemist.",
  "Eesti keele oskus peab olema heal tasemel.",
  "Inglise ja vene keele oskus on plussiks.",
  "Varasem töökogemus ei ole vajalik, sest uue töötaja koolitamine toimub poes.",
  "Esimesel kuul aitab uut töötajat kogenud kolleeg.",
  "Töö on graafiku alusel, ka nädalavahetustel.",
  "Laupäeviti toimub poes lastele ettelugemine ja müüja aitab seda korraldada.",
  "Pakume toredat meeskonda, paindlikku tööaega ja soodustust raamatute ostmisel.",
  "Töötajad saavad tasuta osaleda kirjanike kohtumistel.",
  "Saatke oma CV ja lühike kiri hiljemalt 15. märtsiks.",
  "Kirjas kirjutage, milline on teie lemmikraamat ja miks.",
  "Vestlused toimuvad märtsi lõpus.",
  "Küsimuste korral helistage poe juhatajale Mari Tammele.",
] as const;

export const AGENT_MODEL = [
  "Tere!",
  "Mina olen Anna ja ma kandideerin teie poodi müüjaks.",
  "Ma olen kolm aastat töötanud müüjana toidupoes.",
  "Klientide nõustamine meeldib mulle ja ma olen kannatlik.",
  "Lugemine on mu suurim hobi, ma loen igal õhtul enne magamist.",
  "Minu lemmikraamat on Tammsaare „Tõde ja õigus”, sest see räägib Eesti elust.",
  "Ma räägin eesti, vene ja inglise keelt.",
  "Ma võin töötada ka nädalavahetustel.",
  "Lugupidamisega,",
  "Anna Kask.",
] as const;

export const AGENT_CONVERSATION: Conversation = {
  turns: [
    {
      voice: "fourth",
      text: [
        "Tere tulemast saatesse „Hobid”!",
        "Täna on stuudios Anne, kes on Pärnus inglise keele õpetaja ja juhib õhtuti lugejate klubi.",
      ],
    },
    {
      voice: "second",
      text: ["Tere!", "Jah, ma olen olnud õpetaja viisteist aastat ja lugemine on mu suurim hobi."],
    },
    { voice: "fourth", text: "Kuidas teie klubi alguse sai?" },
    {
      voice: "second",
      text: [
        "Viis aastat tagasi küsis üks õpilase ema, kas ma tean mõnda lugejate klubi täiskasvanutele.",
        "Ma ei teadnud ühtegi, nii et tegin ise ühe.",
      ],
    },
    { voice: "fourth", text: "Kui palju lugejaid teil praegu on?" },
    {
      voice: "second",
      text: [
        "Meid on kaksteist, kõige noorem on kakskümmend kaks ja kõige vanem seitsekümmend viis.",
        "Me saame kokku iga kuu esimesel neljapäeval raamatukogus.",
      ],
    },
    { voice: "fourth", text: "Mida te kohtumistel teete?" },
    {
      voice: "second",
      text: [
        "Iga kuu valib üks lugeja raamatu ja kõik loevad selle läbi.",
        "Kohtumisel räägime raamatust, joome teed ja sööme kooki.",
        "Mõnikord on vaidlus nii tuline, et raamatukogu töötaja peab meid kell üheksa välja saatma.",
      ],
    },
    {
      voice: "fourth",
      text: ["See kõlab lõbusalt.", "Kas kõik lugejad on eestlased?"],
      say: "[laughs] See kõlab lõbusalt. Kas kõik lugejad on eestlased?",
    },
    {
      voice: "second",
      text: [
        "Ei, meil on ka kaks soomlast ja üks naine Ukrainast.",
        "Nende jaoks on eesti keeles lugemine hea keeleõpe.",
        "Alguses oli neil raske, aga nüüd räägivad nad kohtumistel kõige rohkem.",
      ],
    },
    { voice: "fourth", text: "Mis on teie arvates lugemise juures kõige tähtsam?" },
    {
      voice: "second",
      text: [
        "Minu arvates on kõige tähtsam aeg.",
        "Inimesed ütlevad, et neil pole aega lugeda, aga telefonis on nad iga päev mitu tundi.",
      ],
    },
    { voice: "fourth", text: "Kas te ise loete ka telefonist?" },
    {
      voice: "second",
      text: [
        "Harva.",
        "Ma eelistan paberraamatut, aga bussis kuulan vahel audioraamatuid.",
        "Kuulamine on ka lugemine, kui raamat on hea.",
      ],
    },
    { voice: "fourth", text: "Milliseid raamatuid teie lugejad kõige rohkem armastavad?" },
    {
      voice: "second",
      text: [
        "Kõige populaarsemad on krimiromaanid ja reisiraamatud.",
        "Luulet loeme harvem, aga detsembris on meil alati luuleõhtu, kus igaüks loeb ette ühe luuletuse.",
      ],
    },
    { voice: "fourth", text: "Kas lugemine on ka teie tundides oluline?" },
    {
      voice: "second",
      text: [
        "Väga oluline.",
        "Minu õpilased loevad igal nädalal ühe lühikese jutu ja kirjutavad selle kohta paar lauset.",
        "Kirjutamine on raskem kui lugemine, aga see õpetab mõtlema.",
      ],
    },
    { voice: "fourth", text: "Mida te soovitate inimesele, kes tahab rohkem lugeda?" },
    {
      voice: "second",
      text: [
        "Alustage lühikestest raamatutest ja lugege igal õhtul enne magamist kümme minutit.",
        "Kümme minutit päevas teeb aastas üle kuuekümne tunni.",
      ],
    },
    { voice: "fourth", text: "Kas teil on ka teisi hobisid?" },
    {
      voice: "second",
      text: [
        "Suvel käin ma ujumas ja talvel suusatamas.",
        "Ujumine aitab mul pärast pikka koolipäeva puhata.",
        "Ja ma laulan koguduse kooris, aga hea laulja ma just ei ole.",
      ],
      say: "Suvel käin ma ujumas ja talvel suusatamas. Ujumine aitab mul pärast pikka koolipäeva puhata. [laughs] Ja ma laulan koguduse kooris, aga hea laulja ma just ei ole.",
    },
    { voice: "fourth", text: "Kas uued lugejad võivad teie klubiga liituda?" },
    {
      voice: "second",
      text: [
        "Muidugi!",
        "Tulge järgmisel neljapäeval kell kuus raamatukogu teisele korrusele.",
        "Osalemine on tasuta, aga palun lugege enne raamat läbi.",
      ],
    },
    { voice: "fourth", text: ["Aitäh, Anne!", "Ja mis raamatut te järgmiseks loete?"] },
    {
      voice: "second",
      text: [
        "Järgmisel korral loeme Tammsaare romaani.",
        "See on pikk, nii et lugejatel on kaks kuud aega.",
      ],
    },
  ],
};

const AGENT_CLIPS: Record<string, Clip> = {
  ...words([
    ...AGENT_DOERS.flatMap(({ verb, doer, said }) => [verb, doer.replace("|", ""), said]),
    ...AGENT_ACTIONS.flatMap(({ verb, action, part, said }) => [
      verb,
      action.replace("|", ""),
      part.replace("|", ""),
      said,
    ]),
    ...AGENT_HEARD.flatMap(({ ja, mine, ma }) => [ja, mine, ma]),
    ...AGENT_SORT.map(({ w }) => w),
    ...AGENT_FORMS.flatMap(({ verb, answer }) => [verb, answer]),
    ...AGENT_TRANSLATE,
    ...AGENT_FIXES.map(({ right }) => right),
    ...AGENT_EXTRA,
  ]),
  "c-anne": AGENT_CONVERSATION,
};

export const SUFFIX_TABLE = {
  lik: [
    { from: "sõber", word: "sõbra|lik", said: "Uus naaber on väga sõbralik." },
    { from: "laps", word: "lapse|lik", said: "Ära ole nii lapselik!" },
    { from: "koht", word: "koha|lik", said: "Kohalik pood on pühapäeval kinni." },
    { from: "oht", word: "oht|lik", said: "Talvel on see tee ohtlik." },
    { from: "tervis", word: "tervis|lik", said: "Puuvili on tervislik." },
  ],
  tu: [
    { from: "kodu", word: "kodu|tu", said: "Me leidsime kodutu kassi." },
    { from: "töö", word: "töö|tu", said: "Mu vend on praegu töötu." },
    { from: "maitse", word: "maitse|tu", said: "See supp on maitsetu." },
    { from: "lõpp", word: "lõpu|tu", said: "Koosolek tundus lõputu." },
    { from: "abi", word: "abi|tu", said: "Väike kassipoeg on veel abitu." },
  ],
  ke: [
    { from: "maja", word: "maja|ke", said: "Nad elavad metsas väikeses majakeses." },
    { from: "tükk", word: "tüki|ke", said: "Anna mulle tükike kooki." },
    { from: "kass", word: "kassi|ke", said: "Väike kassike magab diivanil." },
    { from: "poiss", word: "poisi|ke", said: "Väike poisike nuttis." },
    { from: "linn", word: "linna|ke", said: "Haapsalu on armas linnake." },
  ],
} as const;

export const SUFFIX_HEARD = [
  { kind: "lik", said: "sõbralik" },
  { kind: "lik", said: "kohalik" },
  { kind: "lik", said: "lapselik" },
  { kind: "lik", said: "ohtlik" },
  { kind: "tu", said: "kodutu" },
  { kind: "tu", said: "töötu" },
  { kind: "tu", said: "mõttetu" },
  { kind: "tu", said: "lõputu" },
  { kind: "ke", said: "majake" },
  { kind: "ke", said: "tükike" },
  { kind: "ke", said: "linnake" },
  { kind: "ke", said: "poisike" },
] as const;

export const HOUSE_DIMINUTIVES = ["majake", "majakene"] as const;

export const SUFFIX_FORMS = [
  { from: "kodu", kind: "tu", answer: "kodutu" },
  { from: "maja", kind: "ke", answer: HOUSE_DIMINUTIVES[0] },
  { from: "sõber", kind: "lik", answer: "sõbralik" },
  { from: "töö", kind: "tu", answer: "töötu" },
  { from: "tükk", kind: "ke", answer: "tükike" },
  { from: "koht", kind: "lik", answer: "kohalik" },
  { from: "viga", kind: "tu", answer: "veatu" },
  { from: "laps", kind: "lik", answer: "lapselik" },
] as const;

export const SUFFIX_TRANSLATE = [
  "Uus naaber on väga sõbralik.",
  "See supp on maitsetu.",
  "Me elame väikeses linnakeses.",
  "Kohalik pood on kinni.",
  "Talvel on tee ohtlik.",
  "Me leidsime kodutu kassi.",
  "Anna mulle tükike kooki.",
] as const;

export const SUFFIX_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  "Uus naaber on väga sõbralik.": [
    "Uus naaber on väga sõbralik.",
    "Uus naaber on väga lahke.",
    "Uus naabrinaine on väga sõbralik.",
  ],
  "See supp on maitsetu.": [
    "See supp on maitsetu.",
    "Sellel supil pole maitset.",
    "Sel supil ei ole maitset.",
    "Sellel supil ei ole maitset.",
  ],
  "Me elame väikeses linnakeses.": [
    "Me elame väikeses linnakeses.",
    "Me elame linnakeses.",
    "Me elame väikeses linnas.",
    "Väikeses linnas elame.",
    "Väikeses linnakeses elame.",
    "Väikeses linnas elame me.",
    "Väikeses linnakeses elame me.",
    "Meie elame väikeses linnakeses.",
    "Elame väikeses linnakeses.",
    "Meie elame linnakeses.",
    "Elame linnakeses.",
    "Meie elame väikeses linnas.",
    "Elame väikeses linnas.",
  ],
  "Kohalik pood on kinni.": [
    "Kohalik pood on kinni.",
    "Kohalik pood on suletud.",
    "Kohalik kauplus on kinni.",
    "Kohalik kauplus on suletud.",
    "Kohalik pood ei ole lahti.",
    "Kohalik kauplus pole avatud.",
  ],
  "Talvel on tee ohtlik.": [
    "Talvel on tee ohtlik.",
    "Tee on talvel ohtlik.",
    "Talvel on see tee ohtlik.",
    "See tee on talvel ohtlik.",
  ],
  "Me leidsime kodutu kassi.": [
    "Me leidsime kodutu kassi.",
    "Me leidsime ühe kodutu kassi.",
    "Me leidsime hulkuva kassi.",
    "Leidsime kassi, kellel polnud kodu.",
    "Meie leidsime kodutu kassi.",
    "Leidsime kodutu kassi.",
    "Meie leidsime ühe kodutu kassi.",
    "Leidsime ühe kodutu kassi.",
    "Meie leidsime hulkuva kassi.",
    "Leidsime hulkuva kassi.",
  ],
  "Anna mulle tükike kooki.": [
    "Anna mulle tükike kooki.",
    "Anna mulle üks tükike kooki.",
    "Andke mulle tükike kooki.",
    "Anna mulle väike tükk kooki.",
    "Andke mulle väike tükk kooki.",
    "Anna mulle palun tükike kooki.",
    "Palun anna mulle tükike kooki.",
    "Palun andke mulle tükike kooki.",
    "Andke palun mulle tükike kooki.",
    "Kas sa annaksid mulle tükikese kooki?",
    "Kas te annaksite mulle tükikese kooki?",
    "Kas sina annaksid mulle tükikese kooki?",
    "Kas annaksid mulle tükikese kooki?",
    "Kas teie annaksite mulle tükikese kooki?",
    "Kas annaksite mulle tükikese kooki?",
  ],
};

export const SUFFIX_FIXES = [
  { wrong: "Nad elavad väikeses majake.", right: "Nad elavad väikeses majakeses." },
  { wrong: "Ta rääkis sõbralik naisega.", right: "Ta rääkis sõbraliku naisega." },
  { wrong: "Supp oli maitselik.", right: "Supp oli maitsetu." },
  {
    wrong: "Lapsed ehitasid liivast kaks majaket.",
    right: "Lapsed ehitasid liivast kaks majakest.",
  },
  { wrong: "Ta on kolmkümmend, aga väga lapsetu.", right: "Ta on kolmkümmend, aga väga lapselik." },
  { wrong: "Kodutu koerad otsivad toitu.", right: "Kodutud koerad otsivad toitu." },
] as const;

export const SUFFIX_FIX_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  ...Object.fromEntries(SUFFIX_FIXES.map(({ right }) => [right, [right]])),
};

export const SUFFIX_EXTRA = ["Ta on juba aasta töötu."] as const;

export const SUFFIX_AD = [
  "Üürile anda väike majake Saaremaal, mere ääres.",
  "Majakeses on üks tuba, köök ja saun.",
  "Toas on kaks suurt voodit ja üks väike voodi lastele.",
  "Maja ümber on suur aed, kus lapsed saavad vabalt mängida.",
  "Koht on vaikne ja rahulik, sest lähim naaber elab kilomeetri kaugusel.",
  "Mereni on ainult kakssada meetrit ja rand on lastele ohutu.",
  "Kohalik pood ja kohvik asuvad külas, kolme kilomeetri kaugusel.",
  "Poes müüakse ka kohalikku leiba ja suitsukala.",
  "Majakeses ei ole televiisorit ja internet on aeglane.",
  "See on hea koht neile, kes tahavad puhata linna mürast.",
  "Koerad on teretulnud, aga kasside jaoks on aed ohtlik, sest metsas elavad rebased.",
  "Suitsetamine toas on keelatud.",
  "Majake on vaba juunist augustini.",
  "Hind on seitsekümmend eurot öö eest, nädala eest on hind odavam.",
  "Omanik on sõbralik ja räägib eesti, inglise ja soome keelt.",
  "Kui soovite majakest broneerida, kirjutage meile e-posti teel.",
] as const;

export const SUFFIX_MODEL = [
  "Tere!",
  "Mind huvitab teie majake Saaremaal.",
  "Me oleme neljaliikmeline pere ja meil on üks väike sõbralik koer.",
  "Kas majake on vaba juuli esimesel nädalal?",
  "Kas aias on ka grill ja kas saunas võib igal õhtul käia?",
  "Me tahaksime osta kohalikku kala, kas pood on ka pühapäeval avatud?",
  "Kui palju maksab üks nädal koos koeraga?",
  "Aitäh ette!",
  "Parimate soovidega,",
  "Liis Kask.",
] as const;

export const SUFFIX_CONVERSATION: Conversation = {
  turns: [
    {
      voice: "fourth",
      text: [
        "Tere õhtust, kallid kuulajad!",
        "Täna oleme Viljandis loomade varjupaigas ja minuga räägib Kati, kes töötab siin vabatahtlikuna.",
        "Kati, mitu looma teil praegu on?",
      ],
    },
    {
      voice: "third",
      text: [
        "Tere!",
        "Praegu on meil kakskümmend kaks koera ja peaaegu nelikümmend kassi.",
        "Suvel on kodutuid loomi alati rohkem, sest mõned inimesed jätavad oma looma suvilasse maha.",
      ],
    },
    { voice: "fourth", text: ["See on kurb.", "Kuidas loomad teie juurde jõuavad?"] },
    {
      voice: "third",
      text: [
        "Tavaliselt helistab meile mõni kohalik elanik, kes on näinud tänaval kodutut koera.",
        "Siis sõidab meie töötaja kohale ja toob looma varjupaika.",
        "Esimesed kaks nädalat elab loom eraldi, et arst saaks teda vaadata.",
      ],
    },
    { voice: "fourth", text: "Kas kõik loomad on sõbralikud?" },
    {
      voice: "third",
      text: [
        "Enamik on väga sõbralikud, aga mõned kardavad alguses inimesi.",
        "Meil on praegu üks suur must koer, Muki, kes oli kaks aastat ketis.",
        "Esimesel kuul ei lasknud ta kedagi enda lähedale, aga nüüd tuleb ta ise pai küsima.",
      ],
    },
    { voice: "fourth", text: ["Kui armas!", "Ja kassid?"] },
    {
      voice: "third",
      text: [
        "Praegu on meil viis kassikest, kes leiti ühest kastist bussipeatuse kõrval.",
        "Nad olid väga väikesed ja abitud, aga nüüd on nad terved ja mängivad terve päeva.",
      ],
    },
    { voice: "fourth", text: "Kas kassipoegadele on juba uued kodud leitud?" },
    {
      voice: "third",
      text: [
        "Kahele on, aga ülejäänud kolm on veel liiga pisikesed.",
        "Neil on ka nimed: Muru, Kõrv ja Tükike, sest tema on kõige väiksem.",
      ],
    },
    { voice: "fourth", text: "Kes teie juures vabatahtlikuna töötab?" },
    {
      voice: "third",
      text: [
        "Väga erinevad inimesed.",
        "Meil on õpilasi, pensionäre ja ka töötuid, kes tahavad päeval midagi kasulikku teha.",
        "Mina tulin siia kolm aastat tagasi, kui ma olin ise töötu.",
      ],
    },
    { voice: "fourth", text: "Mida vabatahtlikud teevad?" },
    {
      voice: "third",
      text: [
        "Kõige tähtsam on koertega jalutamine.",
        "Iga koer peab käima väljas vähemalt kaks korda päevas, aga töötajaid on ainult neli.",
        "Vabatahtlikud aitavad ka koristada, loomi toita ja pilte teha, et loomad leiaksid kiiremini kodu.",
      ],
    },
    { voice: "fourth", text: "Kuidas saab looma koju võtta?" },
    {
      voice: "third",
      text: [
        "Kõigepealt tuleb täita ankeet meie kodulehel.",
        "Siis tulete varjupaika ja tutvute loomaga.",
        "Me ei anna looma kohe kaasa, sest tahame, et loom ja pere sobiksid kokku.",
      ],
    },
    { voice: "fourth", text: "Kas looma võtmine on tasuta?" },
    {
      voice: "third",
      text: [
        "Ei ole päris tasuta.",
        "Koera eest maksab pere viiskümmend eurot ja kassi eest kolmkümmend.",
        "Selle raha eest on loomal juba kõik vajalikud süstid tehtud.",
      ],
    },
    {
      voice: "fourth",
      text: "Mida te soovitate inimestele, kes tahavad aidata, aga ei saa looma võtta?",
    },
    {
      voice: "third",
      text: [
        "Tulge nädalavahetusel jalutama!",
        "Iga koer on tänulik isegi lühikese jalutuskäigu eest.",
        "Ja kui teil on kodus vanu tekke või rätikuid, tooge need meile, sest talvel on neid alati vähe.",
      ],
    },
    {
      voice: "fourth",
      text: [
        "Aitäh, Kati!",
        "Kallid kuulajad, varjupaik on avatud iga päev kella kümnest neljani.",
      ],
    },
    {
      voice: "third",
      text: "Ja Muki ootab teid juba!",
      say: "[laughs] Ja Muki ootab teid juba!",
    },
  ],
};

const SUFFIX_CLIPS: Record<string, Clip> = {
  ...words([
    ...Object.values(SUFFIX_TABLE).flatMap((rows) =>
      rows.flatMap(({ from, word, said }) => [from, word.replace("|", ""), said]),
    ),
    ...SUFFIX_HEARD.map(({ said }) => said),
    ...SUFFIX_FORMS.flatMap(({ from, answer }) => [from, answer]),
    ...SUFFIX_TRANSLATE,
    ...SUFFIX_FIXES.map(({ right }) => right),
    ...SUFFIX_EXTRA,
  ]),
  "c-varjupaik": SUFFIX_CONVERSATION,
};

export const PART_TUD = [
  { verb: "lugema", impersonal: "loetakse", form: "loetud", noun: "loetud raamat" },
  { verb: "sulgema", impersonal: "suletakse", form: "suletud", noun: "suletud uks" },
  { verb: "tegema", impersonal: "tehakse", form: "tehtud", noun: "tehtud töö" },
  { verb: "avama", impersonal: "avatakse", form: "avatud", noun: "avatud aken" },
  { verb: "kirjutama", impersonal: "kirjutatakse", form: "kirjutatud", noun: "kirjutatud kiri" },
  { verb: "pesema", impersonal: "pestakse", form: "pestud", noun: "pestud nõud" },
  { verb: "müüma", impersonal: "müüakse", form: "müüdud", noun: "müüdud maja" },
  { verb: "tooma", impersonal: "tuuakse", form: "toodud", noun: "toodud kingitus" },
] as const;

export const PART_NUD = [
  { verb: "väsima", form: "väsinud", noun: "väsinud mees" },
  { verb: "kukkuma", form: "kukkunud", noun: "kukkunud leht" },
  { verb: "kuivama", form: "kuivanud", noun: "kuivanud lill" },
  { verb: "külmuma", form: "külmunud", noun: "külmunud järv" },
  { verb: "sulama", form: "sulanud", noun: "sulanud lumi" },
  { verb: "kaduma", form: "kadunud", noun: "kadunud kass" },
  { verb: "tulema", form: "tulnud", noun: "tulnud külaline" },
] as const;

export const PART_V = [
  { verb: "jooksma", ta: "jookseb", form: "jooksev", noun: "jooksev vesi" },
  { verb: "magama", ta: "magab", form: "magav", noun: "magav laps" },
  { verb: "kasvama", ta: "kasvab", form: "kasvav", noun: "kasvav puu" },
  { verb: "töötama", ta: "töötab", form: "töötav", noun: "töötav masin" },
  { verb: "lendama", ta: "lendab", form: "lendav", noun: "lendav lind" },
  { verb: "sulama", ta: "sulab", form: "sulav", noun: "sulav jää" },
  { verb: "tulema", ta: "tuleb", form: "tulev", noun: "tulev nädal" },
  { verb: "lugema", ta: "loeb", form: "lugev", noun: "lugev laps" },
] as const;

export const PART_CASES = {
  v: ["jooksev vesi", "jooksva vee", "jooksvat vett", "jooksvas vees"],
  tud: ["loetud raamat", "loetud raamatu", "loetud raamatut", "loetud raamatus"],
} as const;

export const PART_HEARD = [
  { id: "sleeping", kind: "now", said: "Magav laps on voodis." },
  { id: "tired", kind: "did", said: "Väsinud mees istus pingile." },
  { id: "closed", kind: "done", said: "Ta avas suletud ukse." },
  { id: "water", kind: "now", said: "Jooksev vesi on väga külm." },
  { id: "leaf", kind: "did", said: "Kukkunud leht on maas." },
  { id: "dishes", kind: "done", said: "Pestud nõud on kapis." },
  { id: "ice", kind: "now", said: "Sulav jää on ohtlik." },
  { id: "cat", kind: "did", said: "Kadunud kass tuli koju." },
  { id: "house", kind: "done", said: "Müüdud maja on praegu tühi." },
] as const;

export const PART_GAPS = [
  { id: "closed", base: "sulgema", before: "Ta avas", answers: ["suletud"], after: "ukse." },
  { id: "book", base: "lugema", before: "Laual on", answers: ["loetud"], after: "raamat." },
  { id: "tired", base: "väsima", before: "Seal istub", answers: ["väsinud"], after: "mees." },
  { id: "water", base: "jooksma", before: "Ma kuulen", answers: ["jooksvat"], after: "vett." },
  { id: "child", base: "magama", before: "Ma nägin voodis", answers: ["magavat"], after: "last." },
  {
    id: "flower",
    base: "kuivama",
    before: "Ta viskas ära",
    answers: ["kuivanud"],
    after: "lille.",
  },
  { id: "work", base: "tegema", before: "", answers: ["Tehtud"], after: "töö on laual." },
  {
    id: "letter",
    base: "kirjutama",
    before: "Ma sain käsitsi",
    answers: ["kirjutatud"],
    after: "kirja.",
  },
  {
    id: "week",
    base: "tulema",
    before: "Ma ootan",
    answers: ["tulevat"],
    after: "nädalavahetust.",
  },
  { id: "cat", base: "kaduma", before: "Me otsime", answers: ["kadunud"], after: "kassi." },
] as const;

export const PART_TRANSLATE = [
  {
    id: "car",
    said: "Ma ostsin kasutatud auto.",
    answers: withPronouns(["Ma ostsin kasutatud auto.", "Kasutatud auto ostsin ma."]),
  },
  {
    id: "leaf",
    said: "Kukkunud leht on maas.",
    answers: withPronouns(["Kukkunud leht on maas.", "Maas on kukkunud leht."]),
  },
  {
    id: "water",
    said: "Ma kuulen jooksvat vett.",
    answers: withPronouns(["Ma kuulen jooksvat vett.", "Jooksvat vett kuulen ma."]),
  },
  {
    id: "man",
    said: "Väsinud mees istus pingile.",
    answers: withPronouns([
      "Väsinud mees istus pingile.",
      "Pingile istus väsinud mees.",
      "Väsinud mees istus pingi peale.",
      "Väsinud mees istus pingile maha.",
      "Väsinud mees istus maha pingile.",
    ]),
  },
  {
    id: "door",
    said: "Ta avas suletud ukse.",
    answers: withPronouns(["Ta avas suletud ukse.", "Suletud ukse avas ta."]),
  },
  {
    id: "cat",
    said: "Me otsime kadunud kassi.",
    answers: withPronouns(["Me otsime kadunud kassi.", "Kadunud kassi otsime me."]),
  },
  {
    id: "weekend",
    said: "Ma ootan tulevat nädalavahetust.",
    answers: withPronouns(["Ma ootan tulevat nädalavahetust.", "Tulevat nädalavahetust ootan ma."]),
  },
  {
    id: "work",
    said: "Tehtud töö on laual.",
    answers: withPronouns([
      "Tehtud töö on laual.",
      "Laual on tehtud töö.",
      "Tehtud töö on laua peal.",
      "Laua peal on tehtud töö.",
    ]),
  },
] as const;

export const PART_FIXES = [
  { wrong: "Ta ostis kasutanud auto.", right: "Ta ostis kasutatud auto." },
  { wrong: "Kukkuv leht on maas.", right: "Kukkunud leht on maas." },
  { wrong: "Ma nägin voodis magav last.", right: "Ma nägin voodis magavat last." },
  { wrong: "Ma ootan tulev nädalavahetust.", right: "Ma ootan tulevat nädalavahetust." },
  { wrong: "Me otsime kadunud kass.", right: "Me otsime kadunud kassi." },
  { wrong: "Ma kuulen jooksev vett.", right: "Ma kuulen jooksvat vett." },
] as const;

export const PART_FIX_ANSWERS: Record<string, readonly [string, ...string[]]> = Object.fromEntries(
  PART_FIXES.map(({ right }) => [right, [right]]),
);

export const PART_LETTER = [
  "Eile õhtul oli meie külas tugev torm ja öösel ma peaaegu ei maganud.",
  "Hommikul läksin vara õue ja ei uskunud oma silmi.",
  "Aias oli kukkunud puu ning kõikjal lebasid märjad lehed.",
  "Naabri hoovis oli kukkunud ka vana kask ja tee peal seisis suur loik.",
  "Aia taga oli ojas tavalisest rohkem jooksvat vett ja kõikjal kostis vee kohin.",
  "Mõned oksad olid nii suured, et neid ei jõudnud üks inimene tõsta.",
  "Ma kutsusin naabri Tõnu appi, sest üksi ma sellega hakkama ei saa.",
  "Tõnu tuli kohe, kuigi ta nägi väga väsinud välja.",
  "Me kogusime kokku kõik kukkunud oksad ja viisime need metsa.",
  "Töö oli raske, sest märjad oksad olid rasked ja käed said väga külmaks.",
  "Lõpuks istusime köögis ja jõime kuuma kohvi.",
  "Tõnu tõi kaasa ka värskelt küpsetatud saia ja me sõime seda hea meelega.",
  "Raadios öeldi, et enamik teid on nüüd vabad.",
  "Tõnu ütles, et tulev nädal tuleb päikeseline ja soe.",
  "Ma loodan, et tal on õigus, sest aias on veel palju teha.",
  "Vanaema ütles alati, et pärast tormi on õhk kõige puhtam.",
  "Ta teadis ilmast alati rohkem kui raadio.",
  "Õhtuks oli kogu pooleli jäänud töö tehtud ja suletud uks tundus jälle turvaline.",
  "Ma istusin diivanile ja vaatasin akna taga magavat küla.",
  "Üle pika aja olin rahul, kuigi olin väga väsinud.",
] as const;

export const PART_CONVERSATION: Conversation = {
  turns: [
    {
      voice: "fourth",
      text: [
        "Tere, Liis! Aitäh, et sa nii kaugele tulid.",
        "See vana talu on nüüd minu, sest onu jättis selle mulle.",
      ],
    },
    { voice: "third", text: ["Oi, kui vaikne koht!", "Kas siin on keegi viimasel ajal elanud?"] },
    {
      voice: "fourth",
      text: [
        "Ei ole, vähemalt kümme aastat mitte.",
        "Uks on suletud, aga võti on mul kaasas.",
        "Vaata, aias on kukkunud õunapuu, torm oli vist suur.",
      ],
    },
    { voice: "third", text: ["Kui kurb!", "Kuivanud oksi võib ahjus siiski hästi kasutada."] },
    {
      voice: "fourth",
      text: ["See on hea mõte.", "Tule sisse ja ava see aken, siin on nii hapu õhk."],
    },
    {
      voice: "third",
      text: ["Oi, siin on külm ja pime.", "Kas elekter töötab, või peame küünlaid ostma?"],
    },
    {
      voice: "fourth",
      text: [
        "Elekter töötab, aga majas ei ole jooksvat vett.",
        "Kaev on aias ja seal on väga hea vesi.",
      ],
    },
    { voice: "third", text: ["Siis on siin palju tööd.", "Mis köögis on?"] },
    {
      voice: "fourth",
      text: ["Seal on vana laud ja kuus tooli.", "Laual on veel onu loetud ajalehed."],
    },
    { voice: "third", text: "Kas su onu luges tõesti nii palju?" },
    {
      voice: "fourth",
      text: ["Jah, ta oli väga palju lugenud inimene.", "Ta luges iga päev, kuni silmad väsisid."],
    },
    { voice: "third", text: ["Näe, diivanil on magav kass!", "Kas see on sinu oma?"] },
    {
      voice: "fourth",
      text: [
        "Ei ole, aga naaber Mari otsib kadunud kassi.",
        "Võib-olla see ongi tema, sest uks oli terve nädala lahti.",
      ],
    },
    {
      voice: "third",
      text: ["Siis anname talle kohe teada.", "Aga mida sa selle majaga teha tahad?"],
    },
    {
      voice: "fourth",
      text: [
        "Ma ei tea veel, kas parem on maja müüa või remontida.",
        "Linnas on korter kallis ja siin on palju ruumi.",
      ],
    },
    {
      voice: "third",
      text: [
        "Müüdud maja ei ole enam sinu.",
        "Mina tahaksin siia kolida, kui mul oleks selline koht.",
      ],
    },
    {
      voice: "fourth",
      text: ["Ma olen sama mõelnud.", "Tulev suvi on minu jaoks vaba, nii et saan siin töötada."],
    },
    {
      voice: "third",
      text: [
        "Siis alustame kohe, enne kui sa meelt muudad.",
        "Ma tõin kuuma kohvi ja värskelt küpsetatud saia.",
      ],
    },
    {
      voice: "fourth",
      text: ["Oh, see on nii armas!", "Ma olen täna väga väsinud, sest ma sõitsin terve öö."],
    },
    {
      voice: "third",
      text: ["Istu siis maha ja söö.", "Väsinud inimene ei peaks üksi suurt tööd tegema."],
    },
    {
      voice: "fourth",
      text: ["Hea küll, sul on õigus.", "Pärast kohvi vaatame ülakorrust ja otsustame, mida teha."],
    },
    { voice: "third", text: "Kas seal on kõik aknad kinni?" },
    {
      voice: "fourth",
      text: ["Üks on lahti, ja sulav lumi tuli kevadel tuppa.", "Põrand on seal veel märg."],
    },
    {
      voice: "third",
      text: ["Oh ei, siis tuleb kõigepealt põrand kuivaks teha.", "Mul on kaasas ka vana rätik."],
    },
    {
      voice: "fourth",
      text: ["See aitab.", "Pärast seda pesen kõik nõud ära ja siis teeme lõunat."],
    },
    {
      voice: "third",
      text: ["Hea küll, tööle!", "Õhtul oleme väsinud ja külmunud, aga väga rahul."],
    },
    { voice: "fourth", text: ["Täpselt nii.", "Aitäh, et sa mind aitad, Liis."] },
  ],
};

const PART_CLIPS: Record<string, Clip> = {
  ...words([
    ...PART_TUD.flatMap(({ verb, impersonal, noun }) => [verb, impersonal, noun]),
    ...PART_NUD.flatMap(({ verb, form, noun }) => [verb, form, noun]),
    ...PART_V.flatMap(({ verb, ta, noun }) => [verb, ta, noun]),
    ...PART_CASES.v,
    ...PART_CASES.tud,
    ...PART_HEARD.map(({ said }) => said),
    ...PART_GAPS.map(({ before, answers, after }) =>
      [before, answers[0], after].filter(Boolean).join(" "),
    ),
    ...PART_TRANSLATE.map(({ said }) => said),
    ...PART_FIXES.map(({ right }) => right),
  ]),
  "c-liis": PART_CONVERSATION,
};

export const CONJ_WORDS = ["et", "sest", "kui", "kuna", "nii et"] as const;

export const CONJ_EXTRA_WORDS = [
  "prügi",
  "komistas",
  "ehitajad",
  "remont",
  "enamik",
  "kindad",
  "kuid",
  "meremuuseum",
  "ilmateade",
  "hommikuinimene",
] as const;

export const CONJ_TABLE = [
  { word: "et", phrase: "Ma tean, |et sa oled väsinud.", said: "Ma tean, et sa oled väsinud." },
  {
    word: "sest",
    phrase: "Me jäime koju, |sest sadas.",
    said: "Me jäime koju, sest sadas.",
  },
  {
    word: "kui",
    phrase: "Helistan sulle, |kui ma koju jõuan.",
    said: "Helistan sulle, kui ma koju jõuan.",
  },
  {
    word: "kuna",
    phrase: "Ma lähen vara magama, |kuna ma olen väsinud.",
    said: "Ma lähen vara magama, kuna ma olen väsinud.",
  },
  { word: "nii et", phrase: "Sadas, |nii et me jäime koju.", said: "Sadas, nii et me jäime koju." },
] as const;

export const CONJ_GAPS = [
  { id: "know", before: "Ma tean,", answer: "et", after: "sa oled väsinud.", fits: [] },
  {
    id: "school",
    before: "Ma ei läinud kooli,",
    answer: "sest",
    after: "ma olin haige.",
    fits: ["kuna"],
  },
  { id: "rain", before: "Sadas,", answer: "nii et", after: "me jäime koju.", fits: [] },
  { id: "home", before: "Helista mulle,", answer: "kui", after: "sa koju jõuad.", fits: [] },
  { id: "wrote", before: "Mari kirjutas,", answer: "et", after: "ta ei saa tulla.", fits: [] },
  {
    id: "time",
    before: "Ma ei tulnud,",
    answer: "sest",
    after: "mul ei olnud aega.",
    fits: ["kuna"],
  },
  {
    id: "bus",
    before: "Buss hilines,",
    answer: "nii et",
    after: "ma tulin tööle hilja.",
    fits: [],
  },
  { id: "visit", before: "Tule meile külla,", answer: "kui", after: "sul on aega.", fits: [] },
  {
    id: "storm",
    before: "Täna jääme koju,",
    answer: "kuna",
    after: "väljas sajab.",
    fits: ["sest"],
  },
  {
    id: "work",
    before: "Ma õpin eesti keelt,",
    answer: "et",
    after: "siin tööd leida.",
    fits: [],
  },
] as const;

export const CONJ_CAUSE = [
  { id: "stay", said: "Jäime koju, sest sadas.", cause: "second" },
  { id: "rain", said: "Sadas, nii et jäime koju.", cause: "first" },
  { id: "storm", said: "Kuna väljas sajab, jääme koju.", cause: "first" },
  { id: "phone", said: "Ma ostsin uue telefoni, sest vana läks katki.", cause: "second" },
  { id: "tired", said: "Ta oli väga väsinud, nii et ta läks vara magama.", cause: "first" },
  { id: "time", said: "Ma ei tulnud, kuna mul polnud aega.", cause: "second" },
] as const;

export const CONJ_COMMAS = [
  {
    id: "know",
    said: "Ma tean, et sa oled väsinud.",
    wrong: ["Ma tean et, sa oled väsinud.", "Ma, tean et sa oled väsinud."],
  },
  {
    id: "rain",
    said: "Me jäime koju, sest sadas.",
    wrong: ["Me jäime koju sest, sadas.", "Me jäime, koju sest sadas."],
  },
  {
    id: "first",
    said: "Kui ma koju jõuan, helistan sulle.",
    wrong: ["Kui ma koju, jõuan helistan sulle.", "Kui, ma koju jõuan helistan sulle."],
  },
  {
    id: "so",
    said: "Oli külm, nii et läksime koju.",
    wrong: ["Oli külm nii, et läksime koju.", "Oli külm nii et, läksime koju."],
  },
  {
    id: "call",
    said: "Helista mulle, kui sa koju jõuad.",
    wrong: ["Helista, mulle kui sa koju jõuad.", "Helista mulle kui, sa koju jõuad."],
  },
] as const;

export const CONJ_ORDER = [
  {
    id: "know",
    answers: [
      "Ma tean, et ta tuleb homme.",
      "Ma tean, et homme tuleb ta.",
      "Ma tean, et homme ta tuleb.",
      "Ma tean, et ta homme tuleb.",
    ],
  },
  {
    id: "cold",
    answers: [
      "Me jäime koju, sest väljas oli külm.",
      "Me jäime koju, sest oli väljas külm.",
      "Koju jäime me, sest väljas oli külm.",
    ],
  },
  {
    id: "home",
    answers: [
      "Kui ma koju jõuan, helistan sulle.",
      "Kui ma jõuan koju, helistan sulle.",
      "Helistan sulle, kui ma koju jõuan.",
      "Helistan sulle, kui ma jõuan koju.",
    ],
  },
  {
    id: "rain",
    answers: ["Sadas, nii et me jäime koju.", "Sadas, nii et jäime me koju."],
  },
  {
    id: "visit",
    answers: [
      "Kui sul on aega, tule meile külla.",
      "Kui sul aega on, tule meile külla.",
      "Tule meile külla, kui sul on aega.",
      "Tule meile külla, kui sul aega on.",
    ],
  },
  {
    id: "ill",
    answers: [
      "Kuna ta oli haige, ei tulnud ta.",
      "Kuna ta oli haige, ta ei tulnud.",
      "Ta ei tulnud, kuna ta oli haige.",
      "Ei tulnud ta, kuna ta oli haige.",
    ],
  },
] as const;

const closed = (sentences: readonly [string, ...string[]]): [string, ...string[]] => {
  let now = withPronouns(sentences);
  for (let i = 0; i < 3; i++) {
    const next = withPronouns(now);
    if (next.length === now.length) break;
    now = next;
  }
  return now;
};

const because = (main: readonly string[], reasons: readonly string[]) =>
  main.flatMap((first) =>
    ["sest", "kuna"].flatMap((word) => reasons.map((reason) => `${first}, ${word} ${reason}.`)),
  );

export const CONJ_ANSWERS: Record<string, readonly [string, ...string[]]> = {
  "Ma tean, et sa oled väsinud.": closed([
    "Ma tean, et sa oled väsinud.",
    "Ma tean, et te olete väsinud.",
    "Tean, et te olete väsinud.",
    "Ma tean, et oled väsinud.",
    "Tean, et oled väsinud.",
    "Ma tean, et olete väsinud.",
    "Tean, et olete väsinud.",
  ]),
  "Me jäime koju, sest sadas.": closed([
    "Me jäime koju, sest sadas.",
    ...because(
      ["Me jäime koju", "Jäime koju", "Koju jäime me", "Meie jäime koju"],
      ["sadas", "sadas vihma", "vihma sadas"],
    ),
    ...["Kuna sadas", "Kuna sadas vihma", "Kuna vihma sadas"].flatMap((opener) => [
      `${opener}, jäime koju.`,
      `${opener}, me jäime koju.`,
      `${opener}, jäime me koju.`,
    ]),
  ]),
  "Kui ma koju jõuan, helistan sulle.": closed([
    "Kui ma koju jõuan, helistan sulle.",
    ...[
      "Kui ma koju jõuan",
      "Kui ma jõuan koju",
      "Kui ma koju saan",
      "Kui koju jõuan",
      "Kui jõuan koju",
    ].flatMap((opener) =>
      [
        "helistan sulle",
        "ma helistan sulle",
        "helistan ma sulle",
        "siis helistan sulle",
        "siis ma helistan sulle",
      ].map((main) => `${opener}, ${main}.`),
    ),
    ...["Helistan sulle", "Ma helistan sulle"].flatMap((main) =>
      ["kui ma koju jõuan", "kui ma jõuan koju", "kui koju jõuan", "kui ma koju saan"].map(
        (tail) => `${main}, ${tail}.`,
      ),
    ),
  ]),
  "Ta oli haige, nii et ta jäi koju.": closed(["Ta oli haige, nii et ta jäi koju."]),
  "Ta ütles, et ta ei tule.": closed(["Ta ütles, et ta ei tule.", "Ta ütles, et ei tule."]),
  "Kuna ma olen väsinud, lähen vara magama.": closed([
    "Kuna ma olen väsinud, lähen vara magama.",
    ...["Kuna ma olen väsinud", "Kuna olen väsinud"].flatMap((opener) =>
      [
        "lähen vara magama",
        "ma lähen vara magama",
        "lähen ma vara magama",
        "siis lähen vara magama",
        "siis ma lähen vara magama",
      ].map((main) => `${opener}, ${main}.`),
    ),
    ...["Ma lähen vara magama", "Lähen vara magama"].flatMap((main) =>
      ["sest", "kuna"].flatMap((word) =>
        ["ma olen väsinud", "olen väsinud"].map((reason) => `${main}, ${word} ${reason}.`),
      ),
    ),
  ]),
  "Kui sul on aega, tule meile külla.": closed([
    "Kui sul on aega, tule meile külla.",
    ...["Kui sul on aega", "Kui sul aega on", "Kui sul on vaba aega"].flatMap((opener) =>
      ["tule meile külla", "siis tule meile külla", "tule külla meile"].map(
        (main) => `${opener}, ${main}.`,
      ),
    ),
    ...["Kui teil on aega", "Kui teil aega on"].flatMap((opener) =>
      ["tulge meile külla", "siis tulge meile külla"].map((main) => `${opener}, ${main}.`),
    ),
    "Tule meile külla, kui sul on aega.",
    "Tule meile külla, kui sul aega on.",
    "Tule külla meile, kui sul on aega.",
    "Tulge meile külla, kui teil on aega.",
    "Tulge meile külla, kui teil aega on.",
  ]),
  "Ma õpin eesti keelt, et siin tööd leida.": closed([
    "Ma õpin eesti keelt, et siin tööd leida.",
    ...["Ma õpin eesti keelt", "Õpin eesti keelt"].flatMap((main) =>
      [
        "et leida siin tööd",
        "et ma saaksin siin tööd leida",
        "et saaksin siin tööd leida",
        "et ma leiaksin siin tööd",
        "et leiaksin siin tööd",
        "et ma siin tööd leiaksin",
        "et siin tööd leiaksin",
      ].map((tail) => `${main}, ${tail}.`),
    ),
    "Õpin eesti keelt, et siin tööd leida.",
  ]),
  "Ma arvan, et see on hea mõte.": closed([
    "Ma arvan, et see on hea mõte.",
    "Ma arvan, et see on hea idee.",
    "Arvan, et see on hea idee.",
    "Ma arvan, et see on hea plaan.",
    "Arvan, et see on hea plaan.",
  ]),
  "Ma jäin koju, sest ma olin haige.": closed([
    "Ma jäin koju, sest ma olin haige.",
    "Ma jäin koju, kuna ma olin haige.",
    "Kuna ma olin haige, jäin koju.",
    "Kuna ma olin haige, ma jäin koju.",
    "Kuna ma olin haige, jäin ma koju.",
    "Kuna olin haige, jäin koju.",
    "Jäin koju, sest olin haige.",
    "Jäin koju, kuna olin haige.",
  ]),
  "Oli külm, nii et läksime koju.": closed([
    "Oli külm, nii et läksime koju.",
    "Oli külm, nii et me läksime koju.",
    "Väljas oli külm, nii et läksime koju.",
    "Väljas oli külm, nii et me läksime koju.",
    "Oli külm, nii et läksime me koju.",
  ]),
};

export const CONJ_TRANSLATE = [
  "Ma tean, et sa oled väsinud.",
  "Me jäime koju, sest sadas.",
  "Kui ma koju jõuan, helistan sulle.",
  "Ta oli haige, nii et ta jäi koju.",
  "Ta ütles, et ta ei tule.",
  "Kuna ma olen väsinud, lähen vara magama.",
  "Kui sul on aega, tule meile külla.",
  "Ma õpin eesti keelt, et siin tööd leida.",
] as const;

export const CONJ_FIXES = [
  {
    id: "stay",
    wrong: "Ma jäin koju, et ma olin haige.",
    right: "Ma jäin koju, sest ma olin haige.",
    also: ["Ma jäin koju, kuna ma olin haige."],
  },
  {
    id: "think",
    wrong: "Ma arvan, sest see on hea mõte.",
    right: "Ma arvan, et see on hea mõte.",
    also: [],
  },
  {
    id: "call",
    wrong: "Helista mulle, sest sa koju jõuad.",
    right: "Helista mulle, kui sa koju jõuad.",
    also: [],
  },
  {
    id: "said",
    wrong: "Ta ütles, kui ta tuleb homme.",
    right: "Ta ütles, et ta tuleb homme.",
    also: [],
  },
  {
    id: "work",
    wrong: "Ma õpin eesti keelt, sest siin tööd leida.",
    right: "Ma õpin eesti keelt, et siin tööd leida.",
    also: [],
  },
  {
    id: "time",
    wrong: "Ma ei tulnud, kui mul polnud aega.",
    right: "Ma ei tulnud, sest mul polnud aega.",
    also: ["Ma ei tulnud, kuna mul polnud aega."],
  },
] as const;

export const CONJ_FIX_ANSWERS: Record<string, readonly [string, ...string[]]> = Object.fromEntries(
  CONJ_FIXES.map(({ right, also }) => [right, [right, ...also] as [string, ...string[]]]),
);

export const CONJ_DRILL = {
  heard: [
    { id: "hope", said: "Ma loodan, et sa tuled.", means: "say" },
    { id: "fever", said: "Ta jäi koju, sest tal oli palavik.", means: "reason" },
    { id: "cafe", said: "Kohvik oli kinni, nii et me läksime koju.", means: "result" },
    { id: "tired", said: "Kui ma väsin, puhkan natuke.", means: "when" },
  ],
  gaps: [
    {
      id: "back",
      before: "Ta ütleb,",
      answer: "et",
      after: "ta on kohe tagasi.",
      wrong: ["sest", "kui", "nii et"],
    },
    {
      id: "gift",
      before: "Ma ostan kingituse,",
      answer: "sest",
      after: "tal on homme sünnipäev.",
      wrong: ["et", "nii et", "kui"],
    },
    {
      id: "stay",
      before: "Täna sajab,",
      answer: "nii et",
      after: "me jääme koju.",
      wrong: ["sest", "et", "kui"],
    },
    {
      id: "call",
      before: "Ma helistan sulle,",
      answer: "kui",
      after: "ma koju jõuan.",
      wrong: ["et", "nii et", "sest"],
    },
  ],
  rewrites: [
    {
      from: "Jäime koju, sest sadas.",
      cue: "nii et",
      answers: closed([
        "Sadas, nii et jäime koju.",
        "Sadas, nii et me jäime koju.",
        "Sadas vihma, nii et jäime koju.",
        "Sadas vihma, nii et me jäime koju.",
      ]),
    },
    {
      from: "Sadas, nii et me jäime koju.",
      cue: "reason",
      answers: closed([
        "Me jäime koju, sest sadas.",
        "Me jäime koju, kuna sadas.",
        "Jäime koju, sest sadas.",
        "Jäime koju, kuna sadas.",
        "Kuna sadas, jäime koju.",
        "Kuna sadas, me jäime koju.",
        "Kuna sadas, jäime me koju.",
      ]),
    },
    {
      from: "Ma helistan sulle, kui ma koju jõuan.",
      cue: "kui",
      answers: closed([
        "Kui ma koju jõuan, helistan sulle.",
        "Kui ma jõuan koju, helistan sulle.",
        "Kui ma koju jõuan, ma helistan sulle.",
        "Kui ma koju jõuan, helistan ma sulle.",
        "Kui ma koju jõuan, siis helistan sulle.",
        "Kui ma koju jõuan, siis ma helistan sulle.",
        "Kui koju jõuan, helistan sulle.",
        "Kui koju jõuan, siis helistan sulle.",
        "Kui ma koju saan, helistan sulle.",
        "Kui ma koju saan, siis ma helistan sulle.",
      ]),
    },
    {
      from: "Kui sul on aega, tule külla.",
      cue: "tule",
      answers: [
        "Tule külla, kui sul on aega.",
        "Tule külla, kui sul aega on.",
        "Tule külla, kui sul on vaba aega.",
      ],
    },
  ],
  translate: [
    "Ma arvan, et see on hea mõte.",
    "Ma jäin koju, sest ma olin haige.",
    "Oli külm, nii et läksime koju.",
  ],
  dictation: [
    "Kui sul on aega, tule meile külla.",
    "Ta ei tulnud, sest ta oli haige.",
    "Sadas, nii et me jäime koju.",
  ],
} as const;

export const CONJ_NOTICE = [
  "Kallid naabrid!",
  "Kirjutan teile, sest meie maja ees on probleem, mis puudutab meid kõiki.",
  "Eelmisel nädalal lõppes naabermaja remont, kuid ehitajad jätsid meie hoovi palju prügi.",
  "Kui ma hommikul tööle lähen, pean ma jalgrattaga suurest prügihunnikust mööda sõitma.",
  "Hommikul on seal veel pime, nii et ma ei näe seda hästi.",
  "Eile ütles üks naine, et tema poeg komistas seal ja kukkus.",
  "Õnneks ei juhtunud midagi tõsist, nii et poiss sai kooli minna.",
  "Helistasin ehitajatele, aga nad ütlesid, et nad ei saa enne järgmist nädalat tulla, kuna neil on praegu väga palju tööd.",
  "See ei sobi mulle, sest meie hoovis mängivad iga päev lapsed.",
  "Ma ei taha, et lapsed saaksid viga, kui nad hoovis jooksevad.",
  "Kui keegi teist teab, kuidas seda kiiremini lahendada, andke palun teada.",
  "Mõtlesin, et me võiksime laupäeval kokku saada ja prügi ise ära viia.",
  "Kui meid tuleb kümme inimest, oleme tunniga valmis.",
  "Ilmateate järgi on laupäeval kuiv ilm, nii et töö läheb kiiresti.",
  "Ma toon kindad ja suured kotid, nii et teil ei ole vaja midagi ostma minna.",
  "Kui te ei saa tulla, kirjutage mulle, et ma teaksin, kui palju meid on.",
  "Pärast tööd joome koos kohvi, sest enamik meist ei tunne üksteist veel.",
  "Meie maja on ilus ja ma tahan, et see jääks selliseks.",
  "Aitäh ette!",
  "Tiiu, korter 12.",
] as const;

export const CONJ_REPLY = [
  "Tere, Tiiu!",
  "Aitäh, et sa meile kirjutasid.",
  "Ma tulen laupäeval kindlasti, sest minu lapsed mängivad samuti selles hoovis.",
  "Hommikul ma ei saa, kuna mul on siis tööd, nii et jõuan kohale kell kaksteist.",
  "Kui sa kindad ja kotid tood, võtan mina kaasa kohvi ja kruusid.",
  "Kui te tahate, võin ma ka teistele naabritele helistada.",
  "Ootan laupäeva.",
  "Peeter, korter 8.",
] as const;

export const CONJ_CONVERSATION: Conversation = {
  turns: [
    { voice: "third", text: ["Tere, Jaan!", "Kas sa kuulsid, et laupäeval hakkab sadama?"] },
    {
      voice: "fourth",
      text: [
        "Ei kuulnud.",
        "Ma lootsin, et me saame laupäeval Lahemaal matkata, sest ma olen sinna juba ammu tahtnud minna.",
        "Kui sajab terve päeva, ei ole seal midagi teha.",
      ],
    },
    {
      voice: "third",
      text: "Ilmateade ütleb, et pühapäeval paistab päike, nii et võime matka pühapäevale tõsta.",
    },
    {
      voice: "fourth",
      text: [
        "Pühapäev sobib mulle, aga mu õel on sünnipäev.",
        "Ta kutsus mind õhtul külla, sest ta tahab, et kõik oleksid koos.",
      ],
    },
    {
      voice: "third",
      text: [
        "Siis peame vara minema.",
        "Kui me sõidame hommikul kell kaheksa välja, oleme õhtul tagasi.",
      ],
    },
    {
      voice: "fourth",
      text: [
        "Kell kaheksa on mulle vara, kuna ma ei ole hommikuinimene.",
        "Aga hea küll.",
        "Kes sõidab?",
      ],
    },
    {
      voice: "third",
      text: [
        "Sinu auto on remondis, nii et sõidame minu autoga.",
        "Bensiini eest maksad sina, kui sa tahad.",
      ],
    },
    {
      voice: "fourth",
      text: [
        "Sobib.",
        "Ma võtan võileivad ja tee kaasa, sest sa unustasid eelmisel korral toidu koju.",
      ],
    },
    {
      voice: "third",
      text: ["See juhtus ainult üks kord!", "Aga võta ka šokolaadi, kui sul poes aega on."],
      say: "[laughs] See juhtus ainult üks kord! Aga võta ka šokolaadi, kui sul poes aega on.",
    },
    {
      voice: "fourth",
      text: ["Hea küll.", "Mida me selga paneme?", "Kui hommikul veel sajab, võtan vihmajope."],
    },
    {
      voice: "third",
      text: [
        "Pane soojad riided ja tugevad kingad, sest metsas on pärast vihma märg.",
        "Matk on kümme kilomeetrit, nii et vajame terve päeva.",
      ],
    },
    {
      voice: "fourth",
      text: [
        "Kümme kilomeetrit on palju, aga ma proovin, sest mul on vaja liikuda.",
        "Mul on ainult vanad tossud, nii et ostan täna uued saapad.",
      ],
    },
    {
      voice: "third",
      text: [
        "Hea mõte.",
        "Mina võtan kaasa kaardi, kuna metsas ei ole alati levi.",
        "Mina toon kuuma kohvi ja kaks tassi, sest metsas maitseb see kõige paremini.",
      ],
    },
    {
      voice: "fourth",
      text: ["Kus me kohtume?", "Kui sa tuled mulle järele, pean ma sulle aadressi saatma."],
    },
    {
      voice: "third",
      text: [
        "Ma tulen kell kaheksa sinu maja juurde, nii et ole palun õigel ajal väljas.",
        "Ma ei saa kaua oodata, sest seal on parkimine keelatud.",
      ],
    },
    {
      voice: "fourth",
      text: [
        "Ma olen kümme minutit enne kaheksat väljas, kuna ma tean, et sulle ei meeldi oodata.",
        "Ma saadan sulle õhtul aadressi, et sa ei peaks hommikul küsima.",
        "Kuhu me lõunaks jõuame?",
      ],
    },
    {
      voice: "third",
      text: [
        "Käsmusse.",
        "Ma tahan sinna minna, sest seal on väike meremuuseum ja ma ei ole seal kunagi käinud.",
        "Pärast saame minna mere äärde jalutama, kui ilm on ilus.",
      ],
    },
    {
      voice: "fourth",
      text: [
        "Mina käisin seal suvel, nii et saan sulle kõike näidata.",
        "Aga kui pühapäeval ikkagi sajab, siis jääme linna.",
        "Siis läheme hoopis kinno.",
      ],
    },
    {
      voice: "third",
      text: [
        "Kui sajab ainult natuke, lähme siiski.",
        "Vihm ei ole probleem, kui riided on õiged.",
      ],
    },
    {
      voice: "fourth",
      text: ["Nõus.", "Aga kui tuul läheb tugevaks, pöörame tagasi, sest metsas on siis ohtlik."],
    },
    {
      voice: "third",
      text: [
        "Kokku lepitud.",
        "Ma vaatan hommikul ilmateadet ja helistan sulle, kui me ikkagi läheme.",
      ],
    },
    { voice: "fourth", text: ["Tore.", "Nägemist!"] },
    { voice: "third", text: "Nägemist!" },
  ],
};

const CONJ_CLIPS: Record<string, Clip> = {
  ...words([
    ...CONJ_WORDS,
    ...CONJ_EXTRA_WORDS,
    ...CONJ_TABLE.map(({ said }) => said),
    ...CONJ_GAPS.map(({ before, answer, after }) =>
      [before, answer, after].filter(Boolean).join(" "),
    ),
    ...CONJ_CAUSE.map(({ said }) => said),
    ...CONJ_COMMAS.map(({ said }) => said),
    ...CONJ_ORDER.map(({ answers }) => answers[0]),
    ...CONJ_TRANSLATE,
    ...CONJ_FIXES.map(({ right }) => right),
    ...CONJ_DRILL.heard.map(({ said }) => said),
    ...CONJ_DRILL.gaps.map(({ before, answer, after }) => `${before} ${answer} ${after}`),
    ...CONJ_DRILL.rewrites.map(({ answers }) => answers[0]),
    ...CONJ_DRILL.translate,
    ...CONJ_DRILL.dictation,
  ]),
  "c-matk": CONJ_CONVERSATION,
};

export const FLAT_PASSAGES = {
  advert: [
    "Kahetoaline korter Tartu kesklinnas.",
    "Korter on kolmandal korrusel ja majas on lift.",
    "Maja on vana, aga korter on uus ja ilus.",
    "Suures toas on kaks suurt akent ja väike rõdu.",
    "Väiksem tuba on magamistuba.",
    "Toad on soojad ja valged.",
    "Köök on väike, aga seal on pesumasin.",
    "Köök on uuem kui toad.",
    "Korter on ilma mööblita, aga köögis on pliit.",
    "Korteris on ka vannituba.",
    "See on kesklinna kõige vaiksem maja.",
    "Naabrid on sõbralikud ja vaiksed.",
    "Üür on nelisada viiskümmend eurot kuus.",
    "Ma üürin korteri välja üheks aastaks.",
    "Korter on vaba esimesest detsembrist.",
    "Pood on maja kõrval ja bussipeatus on maja ees.",
    "Maja kõrval on ilus park ja väike kohvik.",
    "Bussiga on rongijaama viis minutit.",
    "Kass või koer ei saa korteris elada.",
    "Praegu ei ela korteris keegi.",
    "Korter sobib hästi ühele või kahele inimesele.",
    "Korterit saab vaadata esmaspäevast reedeni.",
    "Helistage mulle õhtul pärast kella kuut!",
    "Minuga saab rääkida ka inglise keeles.",
    "Mari Tamm, telefon 5555 1234.",
  ],
  reply: [
    "Tere, Mari!",
    "Mina olen Jaan ja ma nägin teie kuulutust.",
    "Korter meeldib mulle väga.",
    "Ma töötan Tartus õpetajana.",
    "Mul ei ole kassi.",
    "Kas ma võin homme korterit vaatama tulla?",
    "Ma tahan sisse kolida esimesel detsembril.",
    "Kas köögis on ka pliit?",
    "Aitäh!",
  ],
} as const;

export const FLAT_SORT = [
  { w: "korteris", bin: "kus" },
  { w: "korterisse", bin: "kuhu" },
  { w: "köögis", bin: "kus" },
  { w: "kööki", bin: "kuhu" },
  { w: "toas", bin: "kus" },
  { w: "tuppa", bin: "kuhu" },
  { w: "rõdul", bin: "kus" },
  { w: "rõdule", bin: "kuhu" },
] as const;

const FLAT_CALL = [
  "Helistage mulle õhtul.",
  "Helista mulle õhtul.",
  "Palun helistage mulle õhtul.",
  "Palun helista mulle õhtul.",
  "Helistage õhtul mulle.",
  "Helista õhtul mulle.",
  "Õhtul helistage mulle.",
  "Õhtul helista mulle.",
  "Helistage mulle palun õhtul.",
  "Helista mulle palun õhtul.",
  "Helistage palun mulle õhtul.",
  "Helista palun mulle õhtul.",
  "Palun helistage õhtul mulle.",
  "Palun helista õhtul mulle.",
  "Õhtul palun helistage mulle.",
  "Õhtul palun helista mulle.",
] as const;

const FLAT_YEAR = ["korteri", "korterit"].flatMap((flat) => [
  `Ma tahan ${flat} üheks aastaks üürida.`,
  `Ma tahan üheks aastaks ${flat} üürida.`,
  `Ma tahan üürida ${flat} üheks aastaks.`,
  `Ma tahan ${flat} üürida üheks aastaks.`,
  `Üheks aastaks tahan ma ${flat} üürida.`,
  `Üheks aastaks ma tahan ${flat} üürida.`,
]);

export const FLAT_SAY = [
  { id: "korrusel", answers: ["Korter on kolmandal korrusel.", "Korter on 3. korrusel."] },
  { id: "lift", answers: ["Kas majas on lift?", "Kas maja on liftiga?", "Kas majas lift on?"] },
  {
    id: "uur",
    answers: [
      "Kui palju on üür?",
      "Kui suur on üür?",
      "Mis on üür?",
      "Kui palju üür maksab?",
      "Kui palju maksab üür?",
      "Kui suur üür on?",
      "Kui palju üür on?",
    ],
  },
  {
    id: "kolida",
    answers: withPronouns([
      "Ma tahan reedel sisse kolida.",
      "Reedel tahan ma sisse kolida.",
      "Reedel ma tahan sisse kolida.",
      "Ma tahan sisse kolida reedel.",
      "Ma tahan reedel kolida sisse.",
    ]),
  },
  {
    id: "kook",
    answers: [
      "Köök on väike, aga uus.",
      "Köök on väike, kuid uus.",
      "Köök on küll väike, aga uus.",
      "Köök on väike, aga see on uus.",
    ],
  },
  {
    id: "vaatama",
    answers: withPronouns([
      "Kas ma võin homme korterit vaatama tulla?",
      "Kas ma võin homme tulla korterit vaatama?",
      "Kas ma saan homme korterit vaatama tulla?",
      "Kas ma saan homme tulla korterit vaatama?",
      "Kas võin homme tulla korterit vaatama?",
      "Kas ma võin korterit homme vaatama tulla?",
      "Kas ma võin tulla homme korterit vaatama?",
      "Kas ma saan korterit homme vaatama tulla?",
      "Kas ma saan tulla homme korterit vaatama?",
      "Kas ma võin homme tulla ja korterit vaadata?",
      "Kas ma saan homme tulla ja korterit vaadata?",
    ]),
  },
  { id: "helista", answers: FLAT_CALL },
  { id: "aasta", answers: withPronouns(FLAT_YEAR as [string, ...string[]]) },
] as const;

export const FLAT_FIX = [
  {
    id: "kolmandal",
    wrong: "Korter on kolmas korrusel.",
    answers: ["Korter on kolmandal korrusel.", "Korter on 3. korrusel."],
  },
  { id: "lifti", wrong: "Majas ei ole lift.", answers: ["Majas ei ole lifti."] },
  { id: "kolida", wrong: "Ma tahan sisse kolima.", answers: ["Ma tahan sisse kolida."] },
  {
    id: "vaiksem",
    wrong: "Köök on väikem kui tuba.",
    answers: ["Köök on väiksem kui tuba.", "Köök on väikesem kui tuba."],
  },
  {
    id: "esimesest",
    wrong: "Korter on vaba esimene detsembrist.",
    answers: ["Korter on vaba esimesest detsembrist.", "Korter on vaba 1. detsembrist."],
  },
  { id: "suures", wrong: "Korter on suur majas.", answers: ["Korter on suures majas."] },
  { id: "korterisse", wrong: "Ma lähen korteris.", answers: ["Ma lähen korterisse."] },
] as const;

export const FLAT_DIALOGUE = {
  "d-mari-1": { text: "Tere! Tulge sisse!", voice: "second" },
  "d-sina-1": "Tere! Aitäh.",
  "d-mari-2": { text: "See on suur tuba. Siin on kaks akent.", voice: "second" },
  "d-sina-2": "Tuba on väga ilus. Kus on köök?",
  "d-mari-3": { text: "Köök on seal. Kas teil on kass?", voice: "second" },
  "d-sina-3": "Ei, mul ei ole kassi.",
  "d-mari-4": { text: "Hea. Millal te tahate sisse kolida?", voice: "second" },
  "d-sina-4": "Esimesel detsembril.",
} as const;

export const FLAT_MESSAGE = [
  "Tere, Mari!",
  "Mina olen Jaan ja ma nägin teie kuulutust.",
  "Ma töötan Tartus õpetajana.",
  "Ma tahan korteris elada üheks aastaks.",
  "Kas ma võin homme koos sõbraga korterit vaatama tulla?",
  "Ma tahan sisse kolida esimesel detsembril.",
  "Palun helistage mulle õhtul.",
  "Aitäh!",
  "Jaan.",
] as const;

export const FLAT_TALK: Conversation = {
  turns: [
    { voice: "second", text: ["Tere, Jaan!", "Kas sa käisid täna korterit vaatamas?"] },
    {
      voice: "main",
      text: [
        "Tere, Liis!",
        "Jah, ma käisin kahes korteris.",
        "Üks on kesklinnas ja teine Annelinnas.",
      ],
    },
    { voice: "second", text: ["Tore!", "Kumb on parem?"] },
    {
      voice: "main",
      text: [
        "Kesklinnas on korter suurem ja ilusam.",
        "Seal on kaks tuba ja suur köök.",
        "Köögis on ka pesumasin.",
      ],
    },
    { voice: "second", text: ["Kui palju see maksab?"] },
    { voice: "main", text: ["Kuussada eurot.", "See on minu jaoks liiga kallis."] },
    { voice: "second", text: ["Kas seal on ka rõdu?"] },
    {
      voice: "main",
      text: [
        "Jah, ja rõdult näeb jõge.",
        "See meeldib mulle väga.",
        "Aga kesklinnas ei ole vaikne.",
      ],
    },
    { voice: "second", text: ["Ja teine korter?"] },
    {
      voice: "main",
      text: [
        "Teine on väiksem, ainult üks tuba ja väike köök.",
        "Aga see on palju odavam, nelisada eurot.",
      ],
    },
    { voice: "second", text: ["Kas see on kesklinnast kaugel?"] },
    { voice: "main", text: ["Bussiga kakskümmend minutit.", "Bussipeatus on maja ees."] },
    { voice: "second", text: ["See pole palju.", "Kas seal on vaikne?"] },
    {
      voice: "main",
      text: ["Jah, see on kõige vaiksem maja Annelinnas.", "Maja kõrval on park."],
    },
    { voice: "second", text: ["Mis korrusel see on?"] },
    { voice: "main", text: ["Viiendal korrusel, aga majas on lift."] },
    { voice: "second", text: ["Kas sa tahad elada üksi?"] },
    {
      voice: "main",
      text: [
        "Ei, ma tahan elada koos Katiga.",
        "Kati töötab Tallinnas, aga tuleb reedeks Tartusse.",
      ],
    },
    { voice: "second", text: ["Kas keegi elab seal praegu?"] },
    {
      voice: "main",
      text: ["Ei, praegu ei ela seal keegi.", "Omanik üürib korteri välja üheks aastaks."],
    },
    { voice: "second", text: ["Ja millal sa saad sisse kolida?"] },
    {
      voice: "main",
      text: [
        "Väike korter on vaba esimesest detsembrist.",
        "Suur korter on vaba alles jaanuarist.",
      ],
    },
    {
      voice: "second",
      text: ["Siis on väike korter parem.", "Ja odavam ka!", "Sa ei vaja suurt korterit."],
    },
    { voice: "main", text: ["Jah.", "Homme helistan ma omanikule."] },
    { voice: "second", text: ["Kas ma tulen siis appi?"] },
    {
      voice: "main",
      text: [
        "Jah, palun!",
        "Mul on ainult kaks kasti ja voodi.",
        "Esimesel detsembril tõusen ma vara üles ja kolin sisse.",
      ],
    },
    { voice: "second", text: ["Hästi.", "Ma võtan oma auto kaasa."] },
    { voice: "main", text: ["Aitäh sulle!", "Õhtul läheme koos välja sööma."] },
  ],
};

export const FLAT_WORDS = [
  "korter",
  "tuba",
  "köök",
  "rõdu",
  "üür",
  "lift",
  "kesklinnas",
  "sisse kolima",
] as const;

export const FLAT_DRILL = [
  "Kass on rõdul.",
  "Ma olen köögis.",
  "Tule kööki!",
  "Mul ei ole kassi.",
  "Korteris ei ole rõdu.",
  "Mari elab teisel korrusel.",
  "Ma elan neljandal korrusel.",
  "Korter on viiendal korrusel.",
  "Ma tulen koos sõbraga.",
  "Korter on ilma mööblita.",
  "Ma töötan Tartus õpetajana.",
  "Mari töötab poes müüjana.",
  "Ma elan siin üheks aastaks.",
  "Suures toas on kaks suurt akent.",
  "Köök on väiksem kui tuba.",
  "See on kõige vaiksem maja.",
  "Korteris ei ela keegi.",
  "Tule minuga korterit vaatama!",
] as const;

const FLAT_CLIPS: Record<string, Clip> = {
  ...words([
    ...new Set([
      ...FLAT_WORDS,
      ...FLAT_SORT.map(({ w }) => w),
      ...FLAT_SAY.map(({ answers }) => answers[0]),
      ...FLAT_FIX.map(({ answers }) => answers[0]),
      ...FLAT_DRILL,
    ]),
  ]),
  "p-advert": { sentences: FLAT_PASSAGES.advert, voice: "third" },
  "p-reply": { sentences: FLAT_PASSAGES.reply, voice: "main" },
  ...FLAT_DIALOGUE,
  "p-message": { sentences: FLAT_MESSAGE, voice: "main" },
  "c-talk": FLAT_TALK,
};

export const CLIPS: Record<string, Record<string, Clip>> = {
  haaldus: {
    ...words(HAALDUS_WORDS),
    ...words(HAALDUS_APART.map(apartSaid)),
    ...words(HAALDUS_SENTENCES),
    "d-ema": HAALDUS_TALK,
  },
  numbrid: {
    ...Object.fromEntries(SPOKEN_NUMBERS.map((n) => [numberClip(n), numberWords(n)])),
    ...NUMBER_SENTENCES,
    ...words(NUMBER_DRILLED),
    "p-jaan": { sentences: NUMBER_PASSAGE },
  },
  eitus: {
    ...words([
      ...FLIP_STEMS.flatMap((stem) =>
        PERSON_ENDINGS.flatMap(([person]) => [
          verbSentence(person, stem, false),
          verbSentence(person, stem, true),
        ]),
      ),
      ...NEGATION_VERBS.flatMap(({ stem }) => [
        verbSentence("ma", stem, false),
        verbSentence("ma", stem, true),
      ]),
      ...NO_QUIZ.flatMap(([stem, person]) => [
        verbSentence(person, stem, false),
        verbSentence(person, stem, true),
      ]),
      ...OLEMA_ROWS.flatMap((row) =>
        (["yes", "ei ole", "pole"] as const).map((mode) => olemaSentence(row, mode)),
      ),
      ...NO_ANSWERS.flatMap(({ ask, answer }) => [ask, answer]),
      ...NEGATION_PHRASES,
      ...NEGATION_TURNED.map(({ no }) => no),
      ...NEGATION_FIXES.map(({ said }) => said),
    ]),
    "d-mari": NEGATION_TALK,
  },
  kusimused: {
    ...words(KUSIMUSED_WORDS),
    ...KUSIMUSED_SENTENCES,
    ...words(KUSIMUSED_ASKED.map(({ answers }) => answers[0])),
    ...words(KUSIMUSED_TRANSLATED.map(({ answers }) => answers[0])),
    "d-kati": KUSIMUSED_TALK,
  },
  kohad: {
    ...words(["kus", ...KOHAD_PLACES.flatMap(({ place, where }) => [place, where])]),
    ...KOHAD_SENTENCES,
    ...words(KOHAD_ASKED.map(({ answers }) => answers[0])),
    ...words(KOHAD_WRITTEN),
    "p-mari": { sentences: KOHAD_MESSAGE, voice: "third" },
  },
  "mina-sina-tema": {
    ...words([
      ...PRONOUNS.flatMap(({ long, short }) => [long, short]),
      "olema",
      "olen",
      "oled",
      "on",
      "oleme",
      "olete",
    ]),
    ...words(
      PRONOUNS.flatMap(({ long, short, verb }) => [
        pronounWithOlema(long, verb),
        pronounWithOlema(short, verb),
      ]),
    ),
    ...PRONOUN_SENTENCES,
    ...words(PRONOUN_BUILT.map(({ said }) => said)),
    ...words(PRONOUN_DRILLED.map((id) => PRONOUN_SENTENCES[id])),
    ...words(PRONOUN_HEARD.map(({ said }) => said)),
    ...words(["kodus", "valmis", "väsinud", "õpetaja"]),
    "p-liis": { sentences: PRONOUN_PASSAGE, voice: "second" },
  },
  olevik: {
    ...words([
      ...PRESENT_VERBS.map(({ verb }) => verb),
      ...PRESENT_ENDINGS.map(({ ending }) => `ela${ending}`),
      "olema",
      "olen",
      "oled",
      "on",
      "oleme",
      "olete",
    ]),
    ...words(
      PRESENT_VERBS.flatMap(({ stem }) =>
        PRESENT_ENDINGS.map(({ pronoun, ending }) => presentWithPronoun(pronoun, stem, ending)),
      ),
    ),
    ...PRESENT_SENTENCES,
    ...words(PRESENT_TURNED.map(({ said }) => said)),
    ...words(PRESENT_FIXES.map(({ said }) => said)),
    ...words(["loevad", "Nad armastavad sind."]),
    "p-jaan": { sentences: PRESENT_PASSAGE },
  },
  kell: {
    ...words(KELL_WORDS),
    ...Object.fromEntries(ALL_TIMES.map((time) => [timeClip(time), timeSentence(time)])),
    ...words([...KELL_DRILLED, ...KELL_HEARD, ...KELL_WRITTEN].map(timeSentence)),
    "p-mari": { sentences: KELL_PASSAGE, voice: "third" },
  },
  paevad: {
    ...words(PAEVAD_WORDS),
    ...words(PAEVAD_SENTENCES),
    "p-jaan": { sentences: PAEVAD_PASSAGE, voice: "main" },
  },
  tutvumine: {
    ...words(TUTVUMINE_WORDS),
    ...TUTVUMINE_ANSWERING,
    ...TUTVUMINE_ASKING,
    "p-jaan": { sentences: TUTVUMINE_PASSAGES.jaan },
    "p-kati": { sentences: TUTVUMINE_PASSAGES.kati, voice: "second" },
    "d-kati": TUTVUMINE_TALK,
    "p-message": { sentences: TUTVUMINE_MESSAGE },
    ...words(["kas", "kus", "kes"]),
    ...words(TUTVUMINE_ASKED.map(({ answers }) => answers[0])),
    ...words(TUTVUMINE_TRANSLATED.map(({ answers }) => answers[0])),
    ...words(TUTVUMINE_FIXES.map(({ said }) => said)),
    ...words([
      "Ma ei ela Tallinnas.",
      "Kati õpib Tallinnas.",
      "Me töötame kohvikus.",
      "Kus te õpite?",
      "Kas te olete kodus?",
      "Sa oled kodus.",
    ]),
  },
  kaskiv: {
    ...words([
      ...KASKIV_STEMS.flatMap(({ ma, stem }) => [`Ma ${ma}.`, commandTo(stem)]),
      ...KASKIV_EVERYDAY.map(({ one }) => one),
      ...KASKIV_FLIP.flatMap((stem) => [commandTo(stem), commandTo(stem, true)]),
      ...KASKIV_HEARD.map(notSentence),
      ...KASKIV_MORE.flatMap(({ one, more }) => [one, more]),
      "Rääkige aeglasemalt, palun.",
      ...KASKIV_WORDS,
    ]),
    ...KASKIV_DIALOGUE,
    "p-class": { sentences: KASKIV_CLASS, voice: "fourth" },
  },
  "paev-tallinnas": TALLINN_CLIPS,
  modaalverbid: MODAL_CLIPS,
  "laual-lauale-laualt": {
    ...words([
      ...OUTER_PLACES.flatMap(({ place, kus, kuhu, kust }) => [place, kus, kuhu, kust]),
      ...OUTER_INNER_PLACES.flatMap(({ place, kus, kuhu }) => [place, kus, kuhu]),
      ...OUTER_WORDS,
    ]),
    ...OUTER_SENTENCES,
    "p-saturday": { sentences: OUTER_PASSAGE },
    ...words(OUTER_SAY.map(({ said }) => said)),
    ...words(OUTER_FIX.map(({ right }) => right)),
    "c-call": OUTER_TALK,
  },
  "peal-all-taga": {
    ...words(PLACE_WORD_WORDS),
    ...Object.fromEntries(
      PLACE_WORDS.flatMap((word) =>
        (["kus", "kuhu", "kust"] as const).map((direction) => [
          `s-${word.id}-${direction}`,
          placeWordSentence(word, direction),
        ]),
      ),
    ),
    ...PLACE_WORD_SENTENCES,
    ...words(PLACE_WORD_SAY.map(({ said }) => said)),
    ...words(PLACE_WORD_FIX.map(({ right }) => right)),
    "p-miisu": { sentences: PLACE_WORD_PASSAGE },
    "c-book": PLACE_WORD_TALK,
  },
  "sobraga-rahata": SOBRAGA_CLIPS,
  asesonad: PRONOUN_CLIPS,
  jargarvud: JARGARVUD_CLIPS,
  millal: WHEN_CLIPS,
  sonajarg: ORDER_CLIPS,
  omadussonad: ADJ_CLIPS,
  vordlus: CMP_CLIPS,
  saav: TRA_CLIPS,
  keegi: GI_CLIPS,
  "mul-on": {
    ...words([
      ...MUL_ON_WORDS,
      ...MUL_ON_HEARD.map(({ said }) => said),
      ...MUL_ON_SWITCH.flatMap(({ am, have }) => [am, have]),
      ...MUL_ON_AM_HAVE.flatMap(({ am, have }) => [am, have]),
      ...MUL_ON_NAMES.map(({ said }) => said),
      ...MUL_ON_SORT.map(({ w }) => w),
      ...MUL_ON_SAY.map(({ said }) => said),
      ...MUL_ON_FIX.map(({ right }) => right),
      "Mul pole aega.",
      "Ei, mul pole homme aega.",
    ]),
    ...MUL_ON_LINES,
    "c-car": MUL_ON_TALK,
    "p-mari": { sentences: MUL_ON_PASSAGE },
    ...MUL_ON_DIALOGUE,
  },
  "pood-poe": {
    ...words([
      ...STEM_WORDS.flatMap(({ word, stem, where, said }) => [word, stem, where, said]),
      "ujume",
    ]),
    "p-saturday": { sentences: STEM_PASSAGE },
    "c-call": STEM_TALK,
  },
  pohivormid: POHIVORMID_CLIPS,
  omastav: OMASTAV_CLIPS,
  "majas-majja-majast": {
    ...words(INNER_WORDS),
    ...INNER_SENTENCES,
    ...INNER_DIALOGUE,
    ...words(INNER_SAY.map(({ said }) => said)),
    ...words(INNER_FIX.map(({ right }) => right)),
    "c-street": INNER_TALK,
  },
  meeldima: MEELDIMA_CLIPS,
  "verbi-pohivormid": {
    ...words(VERB_FORMS.flatMap((verb) => [verb.ma, daForm(verb), verb.n, threeForms(verb)])),
    ...words(VERB_FORMS.filter((verb) => VORMID_COMMANDS.includes(verb.ma)).map((verb) => verb.ge)),
    ...words(["tahan", "Ma tahan lugeda."]),
    ...words(VORMID_SAY.map(({ said }) => said)),
    ...words(VORMID_FIX.map(({ right }) => right)),
    ...words(VORMID_DRILL.map(({ said }) => said)),
    "p-class": { sentences: VORMID_CLASS },
    "c-cafe": VORMID_TALK,
  },
  tegevusnimed: {
    ...words(INFINITIVE_LEADS.flatMap(({ lead, said }) => [lead, said])),
    ...words(
      INFINITIVE_PAIRS.flatMap(({ ma, da }) => [wantOrMust(da, "da"), wantOrMust(ma, "ma")]),
    ),
    ...words(INFINITIVE_ORDER),
    ...words(INFINITIVE_WORDS),
    ...words(INFINITIVE_SAY.map(({ said }) => said)),
    ...words(INFINITIVE_FIX.map(({ right }) => right)),
    ...words(INFINITIVE_GAPS.map(infinitiveGapSaid)),
    ...words(INFINITIVE_BUILD.map(({ id }) => INFINITIVE_ORDERS[id][0])),
    ...words(INFINITIVE_ORDERS.lugema.slice(0, 1)),
    "p-message": { sentences: INFINITIVE_MESSAGE },
    "c-plans": INFINITIVE_TALK,
  },
  "ujuma-ujumas-ujumast": {
    ...words(GOING_VERBS.flatMap((verb) => WAYS.map((way) => goingForm(verb, way)))),
    ...words(GOING_VERBS.flatMap((verb) => WAYS.map((way) => goingSentence(verb, way)))),
    ...words(GOING_SCENE.map(({ sentence }) => sentence)),
    ...words(GOING_SORT.map(({ w }) => w)),
    ...words(GOING_KEYS.map(({ said }) => said)),
    ...words(GOING_WORDS),
    ...words(GOING_SAY.map(({ said }) => said)),
    ...words(GOING_FIX.map(({ right }) => right)),
    ...words(GOING_DRILL.map(({ said }) => said)),
    ...words(GOING_FORMS.map(goingFormSaid)),
    "p-voice": { sentences: GOING_VOICE, voice: "second" },
    "c-pool": GOING_TALK,
  },
  mitmus: MITMUS_CLIPS,
  osastav: OSASTAV_CLIPS,
  "jalg-jala": GRADATION_CLIPS,
  "raamatut-voi-raamatu": OBJECT_CLIPS,
  "raamatuid-maju": PLURAL_PART_CLIPS,
  "majades-inimestele": PLURAL_CASE_CLIPS,
  "olen-lugenud": PERFECT_CLIPS,
  laheksin: COND_CLIPS,
  "lahme-las": LETS_CLIPS,
  raagitakse: IMPERSONAL_CLIPS,
  "ootan-sind": GOVERNMENT_CLIPS,
  "aru-saama": IDIOM_CLIPS,
  "lugedes-lugemata": DES_CLIPS,
  "labi-metsa": ROUTE_CLIPS,
  "opetaja-lugemine": AGENT_CLIPS,
  "sobralik-kodutu": SUFFIX_CLIPS,
  "loetud-raamat": PART_CLIPS,
  "et-sest-kui": CONJ_CLIPS,
  kiri: LETTER_CLIPS,
  turul: MARKET_CLIPS,
  lihtminevik: PAST_CLIPS,
  "mineviku-eitus": PAST_NO_CLIPS,
  tulevik: FUTURE_CLIPS,
  nadalavahetusel: WEEKEND_CLIPS,
  korter: FLAT_CLIPS,
  kit: KIT_CLIPS,
};
