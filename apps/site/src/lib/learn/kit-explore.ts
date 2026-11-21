/**
 * The Estonian the kit page's explorers show: Paradigm, Scene, Timeline and Morph. Every form was
 * checked on Sõnaveeb in November 2026. Their clips are recorded under the kit's entry in `clips.ts`.
 */
import { formText } from "./forms";

/** Maja's forms, one and more than one, written with `|` before the ending. */
export const KIT_MAJA = [
  { id: "nom", ask: "mis?", et: "nimetav", forms: ["maja", "maja|d"] },
  { id: "gen", ask: "mille?", et: "omastav", forms: ["maja", "maja|de"] },
  { id: "part", ask: "mida?", et: "osastav", forms: ["maja", "maj|u"] },
  { id: "ill", ask: "millesse?", et: "sisseütlev", forms: ["maj|ja", "maja|desse"] },
  { id: "iness", ask: "milles?", et: "seesütlev", forms: ["maja|s", "maja|des"] },
  { id: "elat", ask: "millest?", et: "seestütlev", forms: ["maja|st", "maja|dest"] },
] as const;

/** Lugema now and in the past, by person. */
export const KIT_LUGEMA = [
  { id: "ma", forms: ["loe|n", "luge|sin"] },
  { id: "sa", forms: ["loe|d", "luge|sid"] },
  { id: "ta", forms: ["loe|b", "luge|s"] },
  { id: "me", forms: ["loe|me", "luge|sime"] },
  { id: "te", forms: ["loe|te", "luge|site"] },
  { id: "nad", forms: ["loe|vad", "luge|sid"] },
] as const;

/** Where the cat is, around a box. */
export const KIT_BOX = [
  { id: "peal", word: "peal", sentence: "Kass on kasti peal." },
  { id: "all", word: "all", sentence: "Kass on kasti all." },
  { id: "taga", word: "taga", sentence: "Kass on kasti taga." },
  { id: "ees", word: "ees", sentence: "Kass on kasti ees." },
  { id: "korval", word: "kõrval", sentence: "Kass on kasti kõrval." },
  { id: "sees", word: "sees", sentence: "Kass on kasti sees." },
] as const;

/** Into, in and out of a house. */
export const KIT_HOUSE = [
  { id: "majja", word: "majja", sentence: "Kass läheb majja." },
  { id: "majas", word: "majas", sentence: "Kass on majas." },
  { id: "majast", word: "majast", sentence: "Kass tuleb majast välja." },
] as const;

/** Sööma in each tense, with how its verb is built. */
export const KIT_TENSES = [
  {
    id: "pluperfect",
    et: "enneminevik",
    at: -2.2,
    reach: -1.3,
    examples: [{ sentence: "Ma olin juba söönud.", build: ["ol|in", "söö|nud"] }],
  },
  {
    id: "past",
    et: "lihtminevik",
    at: -1.3,
    examples: [{ sentence: "Eile sõin ma kodus.", build: ["sõi|n"] }],
  },
  {
    id: "perfect",
    et: "täisminevik",
    at: -0.6,
    reach: 0,
    examples: [{ sentence: "Ma olen juba söönud.", build: ["ole|n", "söö|nud"] }],
  },
  {
    id: "present",
    et: "olevik",
    at: 0,
    examples: [{ sentence: "Praegu ma söön.", build: ["söö|n"] }],
  },
  {
    id: "future",
    at: 1.2,
    examples: [
      { sentence: "Homme söön ma kodus.", build: ["söö|n"] },
      { sentence: "Ma hakkan sööma.", build: ["hakka|n", "söö|ma"] },
    ],
  },
] as const;

/** Words that change their stem: a base form, then the forms it turns into. */
export const KIT_MORPHS = [
  { id: "pood", steps: ["pood", "poe", "poes"] },
  { id: "jalg", steps: ["jalg", "jala", "jalga"] },
  { id: "tuba", steps: ["tuba", "toa", "toas"] },
  { id: "lugema", steps: ["lugema", "lugeda", "loen"] },
] as const;

/** Every word and sentence the explorers play. */
export const KIT_EXPLORE_TEXTS: readonly string[] = [
  ...KIT_MAJA.flatMap((row) => row.forms.map(formText)),
  ...KIT_LUGEMA.flatMap((row) => row.forms.map(formText)),
  ...KIT_BOX.map((place) => place.sentence),
  ...KIT_HOUSE.map((place) => place.sentence),
  ...KIT_TENSES.flatMap((tense) => tense.examples.map((example) => example.sentence)),
  ...KIT_MORPHS.flatMap((chain) => chain.steps),
];
