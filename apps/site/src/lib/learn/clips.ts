import { numberWords } from "./estonian-numbers";
import { ALL_TIMES, timeClip, timeSentence } from "./estonian-time";

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
 * The two voices a lesson records with: `main` is the product's Estonian voice, `second` the other
 * speaker in a dialogue.
 */
export type LessonVoice = "main" | "second";

/**
 * A clip: a word or sentence in the main voice; a line in a chosen voice; or a passage, several
 * sentences recorded as one take, with the time each sentence starts saved beside it.
 */
export type Clip =
  | string
  | { text: string; voice: LessonVoice }
  | { sentences: readonly string[]; voice?: LessonVoice };

/** What a clip says, as it is sent to be recorded. */
export function clipText(clip: Clip): string {
  if (typeof clip === "string") return clip;
  return "text" in clip ? clip.text : clip.sentences.join(" ");
}

export function clipVoice(clip: Clip): LessonVoice {
  return typeof clip === "string" ? "main" : (clip.voice ?? "main");
}

/** A passage is one take whose sentences are timed. */
export function isPassage(
  clip: Clip,
): clip is { sentences: readonly string[]; voice?: LessonVoice } {
  return typeof clip !== "string" && "sentences" in clip;
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
  "säng",
  "sang",
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

/** What day it is, and the day after: “Täna on reede.” “Homme on laupäev.” */
export const PAEVAD_SENTENCES = [
  "Mis päev täna on?",
  ...WEEK.map((day) => `Täna on ${day}.`),
  ...WEEK.map((day) => `Homme on ${day}.`),
];
/** The negation lesson's present-tense verbs, each by its stem: the ma form without its -n. */
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
  { ask: "Kas sa loed?", answer: "Ei loe.", wrong: ["Ei loed.", "Ei oota.", "Ei ootad."] },
  { ask: "Kas sa töötad?", answer: "Ei tööta.", wrong: ["Ei töötad.", "Ei joo.", "Ei jood."] },
  { ask: "Kas te sööte?", answer: "Ei söö.", wrong: ["Ei sööte.", "Ei õpi.", "Ei õpite."] },
  {
    ask: "Kas ta räägib eesti keelt?",
    answer: "Ei räägi.",
    wrong: ["Ei räägib.", "Ei loe.", "Ei loeb."],
  },
  { ask: "Kas sa oled väsinud?", answer: "Ei ole.", wrong: ["Ei oled.", "Ei ela.", "Ei elad."] },
  { ask: "Kas ta on kodus?", answer: "Ei ole.", wrong: ["Ei on.", "Ei oota.", "Ei ootab."] },
  { ask: "Kas nad joovad?", answer: "Ei joo.", wrong: ["Ei joovad.", "Ei söö.", "Ei söövad."] },
  { ask: "Kas te ootate?", answer: "Ei oota.", wrong: ["Ei ootate.", "Ei tööta.", "Ei töötate."] },
  { ask: "Kas sa õpid?", answer: "Ei õpi.", wrong: ["Ei õpid.", "Ei räägi.", "Ei räägid."] },
] as const;

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

/** The verbs of the present-tense lesson: the -ma form and the stem the endings go on. */
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

const KIT_CLIPS: Record<string, Clip> = {
  "p-jaan": { sentences: KIT_PASSAGES.jaan },
  "p-mari": { sentences: KIT_PASSAGES.mari, voice: "second" },
  "p-peeter": { sentences: KIT_PASSAGES.peeter },
  ...KIT_DIALOGUE,
};

export const CLIPS: Record<string, Record<string, Clip>> = {
  haaldus: words(HAALDUS_WORDS),
  numbrid: {
    ...Object.fromEntries(SPOKEN_NUMBERS.map((n) => [numberClip(n), numberWords(n)])),
    ...NUMBER_SENTENCES,
  },
  eitus: words([
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
  ]),
  kusimused: { ...words(KUSIMUSED_WORDS), ...KUSIMUSED_SENTENCES },
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
  },
  kell: {
    ...words(KELL_WORDS),
    ...Object.fromEntries(ALL_TIMES.map((time) => [timeClip(time), timeSentence(time)])),
  },
  paevad: { ...words(PAEVAD_WORDS), ...words(PAEVAD_SENTENCES) },
  kit: KIT_CLIPS,
};
