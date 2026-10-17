/**
 * How to write cards in one language, field by field, keyed by primary language subtag. The
 * deck's samples and instructions override it. Keep each rule short and plain.
 */
type Guide = { notes?: string; pronunciation?: string; meaning?: string; example?: string };

const GUIDES: Record<string, Guide> = {
  et: {
    notes:
      "Give the three forms on one line, in italics. Noun or adjective: nominative · genitive · partitive singular (*maja · maja · maja*). Verb: ma-infinitive · da-infinitive · present tense, first person (*tulema · tulla · tulen*). Add one short line only if needed: the case a verb takes (*aitama* + partitive), or a similar word to tell apart (*pikk* for people, *kõrge* for buildings). For a sentence: list its main words with their forms, and say which case or form matters and why, like the partitive object after *ei*.",
    pronunciation: "Estonian is read as it is written. Leave pronunciation null.",
  },
  fi: {
    notes:
      "Give the main forms on one line, in italics. Noun or adjective: nominative · genitive · partitive singular (*talo · talon · taloa*). Verb: first infinitive · present tense, first person (*tulla · tulen*). Add one short line only for the case a verb takes (*pitää* + elative: *pitää jostakin*). For a sentence: say which case matters and why.",
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
      "Noun: the article and plural (*de hond, honden*; *het huis, huizen*). Strong or irregular verb: infinitive · past singular · past participle (*lopen · liep · gelopen*).",
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
    pronunciation: "Pinyin with tone marks (xuéxí). Not IPA.",
  },
  ja: {
    notes:
      "Verb or adjective: its type and polite form on one line (*ichidan verb · 食べます*, *i-adjective · 高いです*), and its transitive or intransitive pair if it has one (*開ける / 開く*).",
    pronunciation: "The reading in hiragana (たべる). Null if the term is written only in kana.",
    example:
      "Put the reading in hiragana in square brackets right after each run of kanji, and nothing over kana: 毎朝[まいあさ]パンを食[た]べます。",
  },
  ko: {
    notes: "Verb or adjective: its polite present form (*가다 → 가요*).",
    pronunciation: "Revised Romanization (hakgyo). Not IPA.",
  },
};

/** A deck's guide as one block of text the model reads, or undefined for a language without one. */
export function languageGuide(tag: string | null | undefined): string | undefined {
  const guide = tag ? GUIDES[tag.split("-")[0]?.toLowerCase() ?? ""] : undefined;
  if (!guide) return undefined;
  return (["meaning", "example", "notes", "pronunciation"] as const)
    .flatMap((field) => (guide[field] ? [`${field}: ${guide[field]}`] : []))
    .join("\n");
}

/** Every language with a guide, for the evaluation's coverage report. */
export const GUIDED_LANGUAGES = Object.keys(GUIDES);
