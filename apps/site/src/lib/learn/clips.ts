import { numberWords } from "./estonian-numbers";
import { MONTHS, ordinalOn, ordinalWords } from "./estonian-ordinals";
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

/** The gap passage: a Saturday with Mari, every gap filled. */
export const OUTER_PASSAGE = [
  "Täna on laupäev ja Mari ei lähe tööle.",
  "Ta läheb turule.",
  "Ta helistab emale.",
  "Isa on poes.",
  "Mari tuleb turult koju.",
  "Isa tuleb ka poest koju.",
] as const;

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
  ]),
  "p-cafe": { sentences: SOBRAGA_PASSAGES.cafe, voice: "second" },
  "p-kati": { sentences: SOBRAGA_PASSAGES.kati },
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
  { id: "paev", one: "päev", ago: "päev tagasi", in: "päeva pärast" },
  { id: "nadal", one: "nädal", ago: "nädal tagasi", in: "nädala pärast" },
  { id: "aasta", one: "aasta", ago: "aasta tagasi", in: "aasta pärast" },
  { id: "kaks-paeva", one: "kaks päeva", ago: "kaks päeva tagasi", in: "kahe päeva pärast" },
  {
    id: "kolm-nadalat",
    one: "kolm nädalat",
    ago: "kolm nädalat tagasi",
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
    answers: [
      "Ma töötan hommikul.",
      "Mina töötan hommikul.",
      "Hommikul töötan ma.",
      "Hommikul ma töötan.",
    ],
  },
  {
    id: "juulis",
    answers: [
      "Me oleme juulis Pärnus.",
      "Meie oleme juulis Pärnus.",
      "Juulis oleme me Pärnus.",
      "Juulis me oleme Pärnus.",
      "Oleme juulis Pärnus.",
    ],
  },
  {
    id: "nadala-parast",
    answers: [
      "Ma tulen nädala pärast.",
      "Mina tulen nädala pärast.",
      "Nädala pärast tulen ma.",
      "Tulen nädala pärast.",
    ],
  },
  {
    id: "kaks-paeva-tagasi",
    answers: ["Jaan oli siin kaks päeva tagasi.", "Kaks päeva tagasi oli Jaan siin."],
  },
  {
    id: "parast-tood",
    answers: [
      "Ma lähen pärast tööd koju.",
      "Pärast tööd lähen ma koju.",
      "Pärast tööd ma lähen koju.",
      "Pärast tööd lähen koju.",
    ],
  },
  { id: "esmaspaevast", answers: ["Pood on avatud esmaspäevast reedeni."] },
] as const;

export const WHEN_FIX = [
  { id: "fix-nadala", wrong: "Ma tulen nädal pärast.", answers: ["Ma tulen nädala pärast."] },
  {
    id: "fix-nadal",
    wrong: "Ma olin Tartus nädala tagasi.",
    answers: ["Ma olin Tartus nädal tagasi."],
  },
  { id: "fix-suvel", wrong: "Me ujume suvis jões.", answers: ["Me ujume suvel jões."] },
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
 * Lesson 14's “type the third form” quiz: words whose ending gives the third form away, by
 * pattern. Each shows its first form; the learner types the third.
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

const POHIVORMID_CLIPS: Record<string, Clip> = {
  ...words([
    "põhivormid",
    "koolis",
    ...new Set([...NOUN_FORMS, ...POHIVORMID_TYPED.map(({ forms }) => forms)].flat()),
  ]),
  ...words(NOUN_FORMS.map(nounEntry)),
  ...words(POHIVORMID_TYPED.map(({ forms }) => nounEntry(forms))),
  ...POHIVORMID_DIALOGUE,
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
  "p-home": { sentences: MITMUS_PASSAGE },
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
  "p-kati": { sentences: OMASTAV_PASSAGE, voice: "second" },
  ...OMASTAV_DIALOGUE,
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
  "p-market": { sentences: OSASTAV_PASSAGES.market },
  "p-jaan": { sentences: OSASTAV_PASSAGES.jaan },
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
  modaalverbid: MODAL_CLIPS,
  "laual-lauale-laualt": {
    ...words([
      ...OUTER_PLACES.flatMap(({ place, kus, kuhu, kust }) => [place, kus, kuhu, kust]),
      ...OUTER_INNER_PLACES.flatMap(({ place, kus, kuhu }) => [place, kus, kuhu]),
      ...OUTER_WORDS,
    ]),
    ...OUTER_SENTENCES,
    "p-saturday": { sentences: OUTER_PASSAGE },
  },
  "sobraga-rahata": SOBRAGA_CLIPS,
  asesonad: PRONOUN_CLIPS,
  jargarvud: JARGARVUD_CLIPS,
  millal: WHEN_CLIPS,
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
  "pood-poe": {
    ...words([
      ...STEM_WORDS.flatMap(({ word, stem, where, said }) => [word, stem, where, said]),
      "ujume",
    ]),
    "p-saturday": { sentences: STEM_PASSAGE },
  },
  pohivormid: POHIVORMID_CLIPS,
  omastav: OMASTAV_CLIPS,
  "majas-majja-majast": {
    ...words(INNER_WORDS),
    ...INNER_SENTENCES,
    ...INNER_DIALOGUE,
  },
  meeldima: MEELDIMA_CLIPS,
  "verbi-pohivormid": {
    ...words(VERB_FORMS.flatMap((verb) => [verb.ma, daForm(verb), verb.n, threeForms(verb)])),
    ...words(VERB_FORMS.filter((verb) => VORMID_COMMANDS.includes(verb.ma)).map((verb) => verb.ge)),
    ...words(["tahan", "Ma tahan lugeda."]),
    "p-class": { sentences: VORMID_CLASS },
  },
  tegevusnimed: {
    ...words(INFINITIVE_LEADS.flatMap(({ lead, said }) => [lead, said])),
    ...words(
      INFINITIVE_PAIRS.flatMap(({ ma, da }) => [wantOrMust(da, "da"), wantOrMust(ma, "ma")]),
    ),
    ...words(INFINITIVE_ORDER),
    ...words(INFINITIVE_WORDS),
    "p-message": { sentences: INFINITIVE_MESSAGE },
  },
  "ujuma-ujumas-ujumast": {
    ...words(GOING_VERBS.flatMap((verb) => WAYS.map((way) => goingForm(verb, way)))),
    ...words(GOING_VERBS.flatMap((verb) => WAYS.map((way) => goingSentence(verb, way)))),
    ...words(GOING_SCENE.map(({ sentence }) => sentence)),
    ...words(GOING_SORT.map(({ w }) => w)),
    ...words(GOING_KEYS.map(({ said }) => said)),
    ...words(GOING_WORDS),
    "p-voice": { sentences: GOING_VOICE, voice: "second" },
  },
  mitmus: MITMUS_CLIPS,
  osastav: OSASTAV_CLIPS,
  turul: MARKET_CLIPS,
  lihtminevik: PAST_CLIPS,
  "mineviku-eitus": PAST_NO_CLIPS,
  tulevik: FUTURE_CLIPS,
  nadalavahetusel: WEEKEND_CLIPS,
  kit: KIT_CLIPS,
};
