import { numberWords } from "./estonian-numbers";

/**
 * Every sound a lesson plays, by lesson and clip id, with the Estonian it says. Read by
 * `pnpm --filter @lymi/site lesson:audio`, which records what is new or changed with the
 * product's Estonian voice into `public/audio/estonian-lessons/<lesson>/<clip>.mp3`.
 */
export const CLIP_ROOT = "/audio/estonian-lessons";

/** A word's clip id: its letters, with õ ä ö ü spelled out so file names stay ASCII. */
export function clipId(text: string): string {
  return text
    .toLowerCase()
    .replace(/õ/g, "o3")
    .replace(/ä/g, "a2")
    .replace(/ö/g, "o2")
    .replace(/ü/g, "u2")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function clipUrl(lesson: string, id: string): string {
  return `${CLIP_ROOT}/${lesson}/${id}.mp3`;
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
  "vanna",
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

export const CLIPS: Record<string, Record<string, string>> = {
  haaldus: words(HAALDUS_WORDS),
  numbrid: {
    ...Object.fromEntries(SPOKEN_NUMBERS.map((n) => [numberClip(n), numberWords(n)])),
    ...NUMBER_SENTENCES,
  },
};
