import { numberWords } from "./estonian-numbers";
import { ALL_TIMES, timeClip, timeSentence } from "./estonian-time";
import { KIT_EXPLORE_TEXTS } from "./kit-explore";

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

/**
 * The practice lesson on meeting someone, built only from lessons 1 to 6. Mari speaks in the
 * second voice; the learner, Andres, in the main one.
 */
export const TUTVUMINE_ANSWERING = {
  "a-mari-1": { text: "Tere! Mina olen Mari. Mis su nimi on?", voice: "second" },
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
 * The commands lesson's verbs from the present-tense lesson, each with its ma form and its stem,
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
 * Everyday commands: the verb, its ma form, the command to one person, and to more than one or
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

const KIT_CLIPS: Record<string, Clip> = {
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
    "Ma ootan sind kohvikus.",
    "Pühapäeval olen kodus.",
  ],
  saturday: [
    "Täna on laupäev.",
    "Ma ei tööta.",
    "Ma olen Tallinnas.",
    "Mari ja Jaan on minu sõbrad.",
    "Me joome kell kümme kohvikus kohvi.",
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
  "d-sina-3": "Kell on pool üksteist.",
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

const TALLINN_CLIPS: Record<string, Clip> = {
  ...words(TALLINN_WORDS),
  "p-mari": { sentences: TALLINN_PASSAGES.mari, voice: "second" },
  "p-jaan": { sentences: TALLINN_PASSAGES.jaan },
  "p-saturday": { sentences: TALLINN_PASSAGES.saturday },
  ...TALLINN_DIALOGUE,
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
  kohad: {
    ...words(["kus", ...KOHAD_PLACES.flatMap(({ place, where }) => [place, where])]),
    ...KOHAD_SENTENCES,
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
  tutvumine: {
    ...words(TUTVUMINE_WORDS),
    ...TUTVUMINE_ANSWERING,
    ...TUTVUMINE_ASKING,
    "p-jaan": { sentences: TUTVUMINE_PASSAGES.jaan },
    "p-kati": { sentences: TUTVUMINE_PASSAGES.kati, voice: "second" },
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
  },
  "paev-tallinnas": TALLINN_CLIPS,
  "mul-on": {
    ...words([
      ...MUL_ON_WORDS,
      ...MUL_ON_HEARD.map(({ said }) => said),
      ...MUL_ON_SWITCH.flatMap(({ am, have }) => [am, have]),
      ...MUL_ON_AM_HAVE.flatMap(({ am, have }) => [am, have]),
      ...MUL_ON_NAMES.map(({ said }) => said),
    ]),
    ...MUL_ON_LINES,
    "p-mari": { sentences: MUL_ON_PASSAGE },
    ...MUL_ON_DIALOGUE,
  },
  kit: KIT_CLIPS,
};
