import { LANGUAGE_FORMATS, languageFormat, languageKey, pronunciationGuide } from "@lymi/core";
import { type FieldGuide, LANGUAGE_PROMPTS, languagePrompts } from "../languages";

const FILIPINO: FieldGuide = {
  notes:
    "Verb: the root and the focus its affix marks, actor (*-um-*, *mag-*), object (*-in*, *i-*) or place (*-an*), then the completed · ongoing · future forms (*kumain · kumakain · kakain*, root *kain*, actor focus).",
};

const NORWEGIAN: FieldGuide = {
  notes:
    "Noun: the gender, then the definite singular and the plural, in Bokmål (*en bil, bilen, biler*; *ei jente, jenta, jenter*). Verb: infinitive · present · past · perfect (*kjøre · kjører · kjørte · har kjørt*).",
  pronunciation:
    "Leave pronunciation null, unless the word isn't said as Norwegian spelling suggests.",
};

/**
 * How to write cards in one language, field by field, keyed by primary language subtag. The
 * deck's samples and instructions override it. Keep each rule short and plain. A supported
 * language's guide lives in its module under server/languages.
 */
const GUIDES: Record<string, FieldGuide> = {
  et: {
    notes:
      "Give the three forms on one line, in italics. Noun or adjective: nominative · genitive · partitive singular (*maja · maja · maja*). Verb: ma-infinitive · da-infinitive · present tense, first person (*tulema · tulla · tulen*). Add one short line only if needed: the case a verb takes (*aitama* + partitive), a short illative that is hard to guess (*maja → majja*), or a similar word to tell apart (*pikk* for people, *kõrge* for buildings). For a sentence: list its main words with their forms, and say which case or form matters and why, like the partitive object after *ei*.",
    pronunciation: "Estonian is read as it is written. Leave pronunciation null.",
  },
  fi: {
    notes:
      "Give the main forms on one line, in italics. Noun or adjective: nominative · genitive · partitive singular (*talo · talon · taloa*). Verb: first infinitive · present tense, first person · past tense, first person (*tulla · tulen · tulin*). Add one short line only for the case a verb takes (*pitää* + elative: *pitää jostakin*). For a sentence: say which case matters and why.",
    pronunciation: "Finnish is read as it is written. Leave pronunciation null.",
  },
  de: {
    meaning: "The term for a noun has its article. Don't repeat the article in the meaning.",
    notes:
      "Noun: the plural (*die Hunde*), if the term doesn't show it. Strong or irregular verb: infinitive · third person present if the vowel changes · past · perfect (*fahren · fährt · fuhr · ist gefahren*). Verb with a fixed preposition or case: give it (*warten auf* + accusative). Separable verb: mark the prefix (*an|rufen*).",
    pronunciation:
      "Leave pronunciation null, unless the word doesn't follow German spelling rules.",
  },
  nl: {
    notes:
      "Noun: the article and plural (*de hond, honden*; *het huis, huizen*). Strong or irregular verb: infinitive · past singular · past participle, with *is* when the perfect takes *zijn* (*komen · kwam · is gekomen*). Separable verb: mark the prefix (*op|bellen*).",
    pronunciation: "Leave pronunciation null, unless the word doesn't follow Dutch spelling rules.",
  },
  sv: {
    notes:
      "Noun: en or ett, and the plural (*en bil, bilar*). Verb: infinitive · present · past · supine (*skriva · skriver · skrev · skrivit*).",
    pronunciation:
      "Leave pronunciation null, unless the word doesn't follow Swedish spelling rules.",
  },
  ru: {
    notes:
      "Verb: the aspect pair, imperfective / perfective (*делать / сделать*), and the case or preposition it takes if it isn't the accusative (*заниматься* + instrumental). Noun: the gender only if the ending doesn't show it (*ночь*, feminine), and an irregular plural or genitive plural.",
    pronunciation:
      "The term in Cyrillic with an accent mark on the stressed vowel (молоко́), for each word of two or more syllables. Not IPA.",
  },
  uk: {
    notes:
      "Verb: the aspect pair, imperfective / perfective (*робити / зробити*), and the case or preposition it takes if it isn't the accusative. Noun: the gender only if the ending doesn't show it, and an irregular plural.",
    pronunciation:
      "The term in Cyrillic with an accent mark on the stressed vowel (молоко́), for each word of two or more syllables. Not IPA.",
  },
  pl: {
    notes:
      "Verb: the aspect pair, imperfective / perfective (*robić / zrobić*), and the case it takes if it isn't the accusative (*bać się* + genitive). Noun: an irregular plural or genitive.",
    pronunciation:
      "Polish stress is on the second-to-last syllable. Leave pronunciation null, unless the word breaks that rule.",
  },
  it: {
    meaning:
      "The term for a noun has its article, to show gender. Don't repeat the article in the meaning.",
    notes:
      "Noun: an irregular plural (*l'uovo, le uova*). Verb: its irregular forms (*venire: vengo, venuto*), and *essere* if it uses it in compound tenses.",
    pronunciation: "Leave pronunciation null, unless the stress isn't where the spelling suggests.",
  },
  es: {
    notes:
      "Verb: stem changes or irregular forms (*poder: puedo*; *tener: tengo, tuve*). Noun: the gender if the ending doesn't show it (*el mapa*).",
    pronunciation: "Spanish is read as it is written. Leave pronunciation null.",
  },
  fr: {
    notes:
      "Noun: the gender if the article doesn't show it (*l'arbre*, masculine), and an irregular plural. Verb: its irregular forms (*venir: je viens, venu*), and *être* if it uses it in the passé composé.",
    pronunciation: "IPA, because French spelling doesn't show how a word sounds.",
  },
  pt: {
    notes:
      "Verb: its irregular forms (*fazer: faço, fiz, feito*). Noun: the gender if the ending doesn't show it (*o mapa*).",
    pronunciation: "IPA. European Portuguese, unless the deck's language is pt-BR.",
  },
  en: {
    notes:
      "Irregular verb: base · past · past participle (*go · went · gone*). Phrasal verb: whether the object can go between the verb and the particle. Noun: an irregular plural.",
    pronunciation: "IPA, because English spelling doesn't show how a word sounds.",
  },
  zh: {
    notes: "Noun: its usual measure word (*一本书*: 本 for books).",
  },
  ko: {
    notes:
      "Verb or adjective: its polite present form (*가다 → 가요*). A word built from Chinese characters (Sino-Korean): each root's hanja and Korean reading, with one or two common words that share the root (*學 학: 학생, 학년*). A native Korean word has no roots line.",
  },
  lv: {
    notes:
      "Noun: the genitive singular, and the gender if the ending doesn't show it (*suns, suņa*; *sirds*, feminine). Verb: infinitive · present · past, first person singular (*iet · eju · gāju*).",
    pronunciation:
      "Latvian is read as it is written, stressed on the first syllable. Leave pronunciation null.",
  },
  lt: {
    notes:
      "Noun: nominative · genitive singular (*namas · namo*), and the gender if the ending doesn't show it. Verb: infinitive · present · past, third person (*eiti · eina · ėjo*).",
  },
  nb: NORWEGIAN,
  no: NORWEGIAN,
  nn: {
    notes:
      "Noun: the gender, then the definite singular and the plural, in Nynorsk (*ein bil, bilen, bilar*; *ei jente, jenta, jenter*). Verb: infinitive · present · past · perfect (*køyre · køyrer · køyrde · har køyrt*).",
    pronunciation:
      "Leave pronunciation null, unless the word isn't said as Norwegian spelling suggests.",
  },
  da: {
    notes:
      "Noun: en or et, the definite singular and the plural (*en bil, bilen, biler*; *et hus, huset, huse*). Verb: infinitive · present · past · perfect (*køre · kører · kørte · har kørt*).",
    pronunciation: "Leave pronunciation null; the audio says the word.",
  },
  fil: FILIPINO,
  tl: FILIPINO,
  vi: {
    example: "Write every word with its tone marks.",
    notes:
      "Noun: its usual classifier (*con chó*, *cái bàn*). A word that differs between the north and the south: give the other one (*bát*, north; *chén*, south).",
  },
  ka: {
    notes:
      "Verb: the verbal noun it is listed under, then the present and the aorist, third person singular (*წერა: წერს · დაწერა*). Noun: its stem only if it drops a vowel (*ფანჯარა → ფანჯრის*).",
  },
  hy: {
    notes:
      "Noun: an irregular plural (*մարդ → մարդիկ*). Verb: the present, first person singular (*գրել → գրում եմ*), and an irregular aorist.",
  },
  ta: {
    notes:
      "Verb: the root, which is also the command, with the past and future, first person singular (*வா: வந்தேன் · வருவேன்*). Where everyday speech says the word differently from its written form, give the spoken form (*தண்ணீர்*, said *taṇṇi*).",
  },
};

/** A deck's guide as one block of text the model reads, or undefined for a language without one. */
export function languageGuide(tag: string | null | undefined): string | undefined {
  const enrich = languagePrompts(tag)?.enrich;
  const format = languageFormat(tag);
  const guide: FieldGuide = {
    ...(enrich?.guide ?? GUIDES[languageKey(tag)]),
    ...(format?.example && { example: `${format.example.format} ${format.example.sample}` }),
    ...(format && {
      pronunciation: `${pronunciationGuide(tag)} For example: ${format.pronunciation.sample.term} → ${format.pronunciation.sample.pronunciation}.`,
    }),
  };
  const lines = (["meaning", "example", "notes", "pronunciation"] as const).flatMap((field) =>
    guide[field] ? [`${field}: ${guide[field]}`] : [],
  );
  if (lines.length === 0) return undefined;
  return lines.concat(enrich ? [`worked example: ${enrich.example}`] : []).join("\n");
}

/** Every language with a guide, for the evaluation's coverage report. */
export const GUIDED_LANGUAGES = [
  ...new Set([
    ...Object.keys(GUIDES),
    ...Object.keys(LANGUAGE_PROMPTS),
    ...LANGUAGE_FORMATS.map((format) => format.tag),
  ]),
];
