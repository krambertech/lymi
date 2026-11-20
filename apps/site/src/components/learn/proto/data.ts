/** Prototype content for the four new lesson types, from lessons 1–5. Not for shipping. */
export const src = (id: string) => `/audio/estonian-lessons/proto/${id}.mp3`;

export interface Line {
  id: string;
  et: string;
  en: string;
}

export interface Question {
  id: string;
  q: string;
  options: readonly { id: string; label: string }[];
  answer: string;
  /** The sentence that answers it. */
  evidence: string;
}

/** Listening: Jaan introduces himself. */
export const JAAN: readonly Line[] = [
  { id: "l1", et: "Tere! Mina olen Jaan.", en: "Hi! I'm Jaan." },
  { id: "l2", et: "Ma elan Tartus.", en: "I live in Tartu." },
  { id: "l3", et: "Ma olen arst.", en: "I'm a doctor." },
  { id: "l4", et: "Mari on minu sõber.", en: "Mari is my friend." },
  { id: "l5", et: "Ta ei ole arst, ta on õpetaja.", en: "She isn't a doctor, she's a teacher." },
  { id: "l6", et: "Me räägime eesti keelt.", en: "We speak Estonian." },
];

export const JAAN_QS: readonly Question[] = [
  {
    id: "job",
    q: "What does Jaan do?",
    options: [
      { id: "teacher", label: "He's a teacher" },
      { id: "doctor", label: "He's a doctor" },
      { id: "student", label: "He's a student" },
    ],
    answer: "doctor",
    evidence: "l3",
  },
  {
    id: "where",
    q: "Where does Jaan live?",
    options: [
      { id: "tallinn", label: "In Tallinn" },
      { id: "parnu", label: "In Pärnu" },
      { id: "tartu", label: "In Tartu" },
    ],
    answer: "tartu",
    evidence: "l2",
  },
  {
    id: "mari",
    q: "Is Mari a doctor?",
    options: [
      { id: "yes", label: "Yes, she is" },
      { id: "teacher", label: "No, she's a teacher" },
      { id: "student", label: "No, she's a student" },
    ],
    answer: "teacher",
    evidence: "l5",
  },
  {
    id: "lang",
    q: "Which language do they speak?",
    options: [
      { id: "et", label: "Estonian" },
      { id: "en", label: "English" },
      { id: "ru", label: "Russian" },
    ],
    answer: "et",
    evidence: "l6",
  },
];

/** Reading: Mari writes about herself and her brother. */
export const MARI: readonly Line[] = [
  { id: "r1", et: "Tere! Minu nimi on Mari.", en: "Hi! My name is Mari." },
  { id: "r2", et: "Ma olen õpetaja.", en: "I'm a teacher." },
  { id: "r3", et: "Ma elan Tallinnas.", en: "I live in Tallinn." },
  { id: "r4", et: "Ma loen palju.", en: "I read a lot." },
  { id: "r5", et: "Minu vend Peeter ei loe.", en: "My brother Peeter doesn't read." },
  { id: "r6", et: "Ta kuulab muusikat.", en: "He listens to music." },
  { id: "r7", et: "Kas sina loed palju?", en: "Do you read a lot?" },
];

export const MARI_QS: readonly Question[] = [
  {
    id: "job",
    q: "What does Mari do?",
    options: [
      { id: "doctor", label: "She's a doctor" },
      { id: "teacher", label: "She's a teacher" },
      { id: "student", label: "She's a student" },
    ],
    answer: "teacher",
    evidence: "r2",
  },
  {
    id: "who",
    q: "Who is Peeter?",
    options: [
      { id: "brother", label: "Mari's brother" },
      { id: "friend", label: "Mari's friend" },
      { id: "father", label: "Mari's father" },
    ],
    answer: "brother",
    evidence: "r5",
  },
  {
    id: "peeter",
    q: "What does Peeter do instead of reading?",
    options: [
      { id: "works", label: "He works" },
      { id: "music", label: "He listens to music" },
      { id: "writes", label: "He writes" },
    ],
    answer: "music",
    evidence: "r6",
  },
];

/** “Find it in the text” asks for a sentence, not an option. */
export const MARI_FIND: readonly { q: string; answer: string }[] = [
  { q: "Where does Mari say what she does?", answer: "r2" },
  { q: "Where does it say Peeter doesn't read?", answer: "r5" },
  { q: "Which sentence asks you something?", answer: "r7" },
];

export interface Gap {
  id: string;
  before: string;
  after: string;
  answer: string;
  options: readonly string[];
  en: string;
  why: string;
}

/** A passage with gaps: olema, the present tense and ei. */
export const GAPS: readonly Gap[] = [
  {
    id: "g1",
    before: "Mina",
    after: "õpetaja.",
    answer: "olen",
    options: ["olen", "oled", "on"],
    en: "I'm a teacher.",
    why: "Mina, I, takes olen.",
  },
  {
    id: "g2",
    before: "Minu vend Peeter",
    after: "arst.",
    answer: "on",
    options: ["olen", "on", "olete"],
    en: "My brother Peeter is a doctor.",
    why: "Peeter is ta, he, so: on.",
  },
  {
    id: "g3",
    before: "Me",
    after: "Tallinnas.",
    answer: "elame",
    options: ["elan", "elame", "elavad"],
    en: "We live in Tallinn.",
    why: "Me, we, ends in -me: elame.",
  },
  {
    id: "g4",
    before: "Peeter",
    after: "loe palju.",
    answer: "ei",
    options: ["ei", "ole", "ära"],
    en: "Peeter doesn't read much.",
    why: "Ei before the bare verb says not: ei loe.",
  },
  {
    id: "g5",
    before: "Mina",
    after: "iga päev.",
    answer: "loen",
    options: ["loen", "loed", "loeb"],
    en: "I read every day.",
    why: "Mina takes -n: loen.",
  },
];

export interface Reply {
  et: string;
  ok?: boolean;
  why?: string;
}

export type Turn =
  | { who: "mari"; id: string; et: string; en: string }
  | { who: "you"; id: string; options: readonly Reply[]; en: string };

/** Meeting Mari. The learner plays Jaan, a doctor from Tartu. */
export const DIALOGUE: readonly Turn[] = [
  { who: "mari", id: "d1", et: "Tere! Mina olen Mari. Kes sina oled?", en: "Hi! I'm Mari. Who are you?" },
  {
    who: "you",
    id: "y1",
    en: "I'm Jaan.",
    options: [
      { et: "Sina oled Jaan.", why: "Sina is you: this says “You are Jaan.”" },
      { et: "Mina olen Jaan.", ok: true },
      { et: "Ta on Jaan.", why: "Ta is he or she: “He is Jaan.”" },
    ],
  },
  {
    who: "mari",
    id: "d2",
    et: "Väga meeldiv! Kas sa elad Tallinnas?",
    en: "Nice to meet you! Do you live in Tallinn?",
  },
  {
    who: "you",
    id: "y2",
    en: "No, I don't live in Tallinn. I live in Tartu.",
    options: [
      { et: "Jah, ma elan Tallinnas.", why: "You live in Tartu." },
      { et: "Ei, ma ei elan Tallinnas.", why: "After ei the verb drops its ending: ei ela." },
      { et: "Ei, ma ei ela Tallinnas. Ma elan Tartus.", ok: true },
    ],
  },
  { who: "mari", id: "d3", et: "Tartus? Kas sa oled õpetaja?", en: "In Tartu? Are you a teacher?" },
  {
    who: "you",
    id: "y3",
    en: "No, I'm a doctor.",
    options: [
      { et: "Ei, ma olen arst.", ok: true },
      { et: "Jah, ma olen õpetaja.", why: "You're a doctor, arst." },
      { et: "Ei, ma ei olen arst.", why: "Ei goes with ole, and you are a doctor: ma olen arst." },
    ],
  },
  { who: "mari", id: "d4", et: "Tore! Head aega!", en: "Great! Goodbye!" },
  {
    who: "you",
    id: "y4",
    en: "Goodbye!",
    options: [
      { et: "Tere hommikust!", why: "That's good morning; Mari is leaving." },
      { et: "Kes sina oled?", why: "That asks who she is; she told you." },
      { et: "Head aega!", ok: true },
    ],
  },
];
