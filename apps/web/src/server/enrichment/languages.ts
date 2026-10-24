import { LANGUAGE_FORMATS, languageFormat, languageKey, pronunciationGuide } from "@lymi/core";
import { type FieldGuide, LANGUAGE_PROMPTS, languagePrompts } from "../languages";

const FILIPINO: FieldGuide = {
  notes:
    "Verb: Root: *kain*, then Focus: actor (*-um-*, *mag-*), object (*-in*, *i-*) or place (*-an*), then Aspects: *kumain · kumakain · kakain*, completed · ongoing · future.",
};

const NORWEGIAN: FieldGuide = {
  notes:
    "In Bokmål, the standard a plain no tag means. Noun: Gender: en, ei or et where the term lacks its article (*ei/en jente*), Definite: *jenta*, Plural: *jenter*. Verb: Present: *kjører*, Past: *kjørte*, Perfect: *har kjørt*. Usage: a word told apart from another only by its pitch accent, with its tone and what the other tone means (Tone 2: *hender*, happens; tone 1: hands), or the word that differs from Swedish or Danish.",
  pronunciation:
    "Leave pronunciation null, unless the word isn't said as Norwegian spelling suggests.",
};

/**
 * How to write cards in one language, field by field, keyed by primary language subtag. The
 * deck's samples and instructions override it. Labels in notes are written in English here and
 * in the meaning language on the card. Keep each rule short and plain. A supported language's
 * guide lives in its module under server/languages.
 */
const GUIDES: Record<string, FieldGuide> = {
  et: {
    notes:
      "If the term doesn't show its forms, the first line gives all three: Forms: *tulema · tulla · tulen* for a verb (ma-infinitive · da-infinitive · present, first person), *vesi · vee · vett* for a noun or adjective (nominative · genitive · partitive). Then, only where hard to guess: Past: *tulin*, Illative: *majja* for a short illative, Imperative: *tule!*. Usage: the case a verb takes (+ partitive: *kardan koera*) or a look-alike (*pikk* for people, *kõrge* for buildings). For a sentence: a line per main word with its forms (Find: *leidma · leida · leian*), then the case or form to notice and why.",
    pronunciation: "Estonian is read as it is written. Leave pronunciation null.",
  },
  fi: {
    notes:
      "Noun or adjective: Genitive: *kadun*, Partitive: *katua*, Partitive plural: *katuja*, so consonant gradation shows. Verb: Present: *tulen*, Past: *tulin*, first person. Usage: the case a verb takes (+ elative: *pitää jostakin*). For a sentence: the case that matters and why.",
    pronunciation: "Finnish is read as it is written. Leave pronunciation null.",
  },
  de: {
    meaning: "The term for a noun has its article. Don't repeat the article in the meaning.",
    notes:
      "Noun: Plural: *die Hunde*, if the term doesn't show it. Strong or irregular verb: Present: *er fährt* only when the vowel changes, Past: *fuhr*, Perfect: *ist gefahren*, always with ist or hat. Separable verb whose term doesn't mark it: Separable: *an|rufen*. Usage: a fixed preposition and its case (+ auf + accusative: *warten auf*) or a look-alike.",
    pronunciation:
      "Leave pronunciation null, unless the word doesn't follow German spelling rules.",
  },
  nl: {
    notes:
      "Noun: Article: *het huis* where the term lacks it, Plural: *huizen*. Strong or irregular verb: Past: *kwam*, Perfect: *is gekomen*, with *is* when it takes zijn. Separable verb whose term doesn't mark it: Separable: *op|bellen*. Usage: a fixed phrase or a false friend.",
    pronunciation: "Leave pronunciation null, unless the word doesn't follow Dutch spelling rules.",
  },
  sv: {
    notes:
      "Noun: Article: *ett hus* where the term lacks it, Definite: *huset*, Plural: *hus*. Verb: Present: *skriver*, Past: *skrev*, Supine: *skrivit*. Usage: a word told apart from another only by its pitch accent, with its accent and what the other accent means (Accent 2: *anden*, the spirit; accent 1: the duck), or a near-synonym (*gå* on foot, *åka* by vehicle).",
    pronunciation:
      "Leave pronunciation null, unless the word doesn't follow Swedish spelling rules.",
  },
  uk: {
    notes:
      "Mark the stress on every form, as in the pronunciation. Verb: Perfective: *купи́ти* (or Imperfective: on a perfective term), Present: *купу́ю, купу́єш* (a perfective: Future: *ку́плю, ку́пиш*). Noun: Gender where the ending hides it, Genitive and Plural when the stress moves or the stem changes (Plural: *міста́*). Usage: a case other than the accusative (+ dative: *дя́кувати*), or a Russian look-alike (*неді́ля* is Sunday, not a week).",
    pronunciation:
      "The term in Cyrillic with an accent mark on the stressed vowel (молоко́), for each word of two or more syllables. Not IPA.",
  },
  pl: {
    notes:
      "Verb: Perfective: *zrobić* (or Imperfective: on a perfective term), Present: *robię, robisz* (a perfective: Future: *zrobię, zrobisz*). Noun: Gender where the ending hides it, Genitive where the stem changes (*pies, psa*), Plural where irregular or masculine-personal (Plural: *studenci*). Usage: the case a verb takes (+ genitive: *bać się psa*), *na* vs *w*, or, for a reader in Ukrainian or Russian, a false friend (False friend: *dywan*, a carpet, not a sofa).",
    pronunciation:
      "Polish stress is on the second-to-last syllable. Leave pronunciation null, unless the word breaks that rule: then the term with a grave accent on the stressed vowel (mùzyka), because an acute would turn o into the letter ó.",
  },
  cs: {
    notes:
      "Verb: Perfective: *udělat* (or Imperfective: on a perfective term), Present: *dělám*. Noun: Gender where the ending hides it, Genitive: *domu*, Plural where irregular (*člověk*, Plural: *lidé*). Usage: the case a verb takes, or a pair like *doma / domů*. Keep háček and čárka, and ů apart from ú, as written.",
    pronunciation:
      "Czech is read as it is written, stressed on the first syllable. Leave pronunciation null.",
  },
  sr: {
    example: "One short sentence in Cyrillic, in the ekavian standard.",
    notes:
      "Forms in Cyrillic. Verb: Perfective: *купити* (or Imperfective: on a perfective term), Present: *купим, купиш*. Noun: Gender where the ending hides it, Genitive or Plural when the stem changes. Usage: the case a verb takes, or the Croatian word where it differs (In Croatian: *kruh*).",
    pronunciation:
      "The term in Serbian Latin script, letter for letter (купити → kupiti, ћевапи → ćevapi). Not IPA.",
  },
  fr: {
    notes:
      "Noun: Gender where the article hides it (*l'arbre*, Gender: masculine), and an irregular Plural: *les yeux*. Adjective: Feminine: *belle* and Plural: *beaux*, when irregular. Verb: Present: *je viens, nous venons* when irregular, Participle: *venu*, and a With *être* line when it takes être in the passé composé. Usage: a construction learners miss (+ de: *avoir besoin de*).",
  },
  es: {
    notes:
      "Verb: Present: *tengo, tienes*, the yo and tú forms, so a stem change shows, when irregular or stem-changing, and Preterite: *tuve* when irregular. Noun: Gender where the ending hides it (*el mapa*, Gender: masculine). Usage: ser or estar, the word Spain and Latin America say differently (In Latin America: *carro*), or a construction (*me gusta*).",
    example: "Keep every written accent, ñ and ü (*árbol*, *niño*, *pingüino*).",
    pronunciation: "Spanish is read as it is written. Leave pronunciation null.",
  },
  it: {
    meaning:
      "The term for a noun has its article, to show gender. Don't repeat the article in the meaning.",
    notes:
      "Verb: Present: *vengo, vieni* when irregular, Participle: *venuto* when irregular, and Past with *essere*: *sono venuto* when it takes essere. Noun: an irregular Plural: *le uova*. Usage: a look-alike or a usage point.",
    example: "Keep every written accent (*città*, *perché*).",
    pronunciation:
      "Leave pronunciation null, unless the stress falls before the second-to-last syllable: then the term with a grave accent on the stressed vowel (telèfono).",
  },
  pt: {
    notes:
      "Verb: Present: *faço, faz* when irregular, Past: *fiz*, Participle: *feito* when irregular. Noun: Gender only where the ending hides it (*o mapa*), and an irregular Plural. Usage: where Brazil and Portugal use different words (*ônibus* and *autocarro*, *trem* and *comboio*), always the other variety's word, so a Brazilian deck gets In Portugal: *autocarro* and a Portuguese deck gets In Brazil: *ônibus*, even when nothing else is irregular. Otherwise a near-synonym (*tomar* vs *beber*). Write each word in its own variety's spelling.",
  },
  ro: {
    notes:
      "Noun, listed without its article: Gender, Definite: *ușa*, Plural: *uși*, on every noun. Verb, listed with *a*: Present: *fac, faci*, Participle: *făcut*. Adjective: Feminine and Plural when irregular. Usage: a near-synonym (*vechi* for things, *bătrân* for people).",
    example: "Write ș and ț with a comma below, never a cedilla, and keep ă, â and î.",
    pronunciation:
      "The term with an acute on the stressed vowel of each word of two or more syllables (a fáce, úșă). Not IPA.",
  },
  el: {
    meaning:
      "The term for a noun has its article; don't repeat it in the meaning. A verb is listed in the first person present: translate it as the infinitive (πίνω: to drink).",
    notes:
      "Noun: Plural: *τα σπίτια*, and Genitive: *του σπιτιού* when the stress moves. Verb: Past: *ήπια*, Future: *θα πιω*. Usage: a construction (*μου αρέσει*) or *όχι* vs *δεν*.",
    pronunciation:
      "A simple romanization as the word is said, with an acute on the stressed vowel (πίνω píno, σπίτι spíti, ευχαριστώ efcharistó). Not IPA.",
  },
  tr: {
    notes:
      "Verb, listed in -mek or -mak: Present: *gidiyorum*, Aorist: *gider*, Past: *gitti*. Noun: Accusative: *kitabı*, Plural: *kitaplar*, which show vowel harmony and consonant softening. Usage: the case the verb takes (+ dative: *eve gitmek*).",
    pronunciation: "Turkish is read as it is written. Leave pronunciation null.",
  },
  ar: {
    example: "One short sentence in Modern Standard Arabic, fully vowelled.",
    notes:
      "Modern Standard Arabic, each form fully vowelled with its romanization after it. Noun: Plural: *كُتُب* (*kutub*), and Feminine or Masculine where the ending hides it. Verb, listed in the past, third person masculine: Present: *يَكْتُبُ* (*yaktubu*), and Verbal noun when common. Usage: the root with one or two common words (Root *ك ت ب*, writing: *مَكْتَب* office), or the spoken word where it differs completely.",
    pronunciation:
      "A romanization: a macron over each long vowel, and ʿ ʾ ḥ ṣ ḍ ṭ ẓ gh for the sounds English lacks (كِتَاب kitāb). Not IPA.",
  },
  he: {
    example: "One short sentence in unpointed Hebrew, without niqqud.",
    notes:
      "Forms unpointed, each with its romanization after it. Noun: Masculine or Feminine, Plural: *ספרים* (*sfarim*). Verb, listed in the infinitive: Binyan: pa'al, Present: *כותב, כותבת* (*kotev, kotevet*). Usage: the root with a word that shares it (Root *ס-פ-ר*: *סיפור* story).",
    pronunciation:
      "A romanization as the word is said, with an acute on the stressed vowel (ספר séfer, בית báyit, תודה todá). Not IPA.",
  },
  hi: {
    example: "One short sentence in Devanagari.",
    notes:
      "Forms in Devanagari, each with its romanization after it. Noun: Masculine or Feminine on every noun, and Plural when it changes. Verb: Past: *किया* (*kiyā*) when irregular, and Takes *ने* for a transitive verb, whose subject takes ने in the perfective. Usage: the form a woman says, or the Urdu or Sanskrit doublet and its register.",
    pronunciation:
      "A romanization: a macron over each long vowel and ṃ for a nasal vowel (घर ghar, करना karnā, मैं maiṃ). Not IPA.",
  },
  en: {
    notes:
      "Irregular verb: Past: *went*, Participle: *gone*, unless the term shows them (*go · went · gone*). Noun: Plural: *children* when irregular, and Uncountable for an uncountable noun. Usage: the preposition it takes (+ on: *depend on*), whether a phrasal verb's object can go between the verb and the particle, or a false friend for the reader (*magazine*, a journal, not a shop).",
    pronunciation:
      "IPA, because English spelling doesn't show how a word sounds. General British or American, as the deck's samples use.",
  },
  ko: {
    notes:
      "Verb or adjective: Polite: *가요*, and Irregular: ㅂ when it is irregular. Usage: the honorific word for elders (For elders: *드시다*), or for a word built from Chinese characters (Sino-Korean), each root's hanja and Korean reading with one or two common words that share it (Hanja: 學 학, as in *학생*, *학년*). A native Korean word has no hanja line.",
  },
  hu: {
    notes:
      "Noun: Plural and Accusative on every noun, so the linking vowel and any stem change show (*ló*: Plural: *lovak*, Accusative: *lovat*; *tűz*: Accusative: *tüzet*; *kenyér*: Accusative: *kenyeret*). Verb: Present: *olvas · olvassa* on every verb, third person singular, indefinite and definite (*kér · kéri*). An -ik verb (*eszik*) gets a first line of its own: -ik verb. Keep long vowels (á é í ó ö ő ú ü ű) as written.",
    pronunciation:
      "Hungarian is read as it is written, stressed on the first syllable. Leave pronunciation null.",
  },
  lv: {
    notes:
      "Noun: Genitive: *suņa*, and Gender where the ending hides it (*sirds*, Gender: feminine). Verb: Present: *eju*, Past: *gāju*, first person singular.",
    pronunciation:
      "Latvian is read as it is written, stressed on the first syllable. Leave pronunciation null.",
  },
  lt: {
    notes:
      "Noun: Genitive: *namo*, and Gender where the ending hides it. Verb: Present: *eina*, Past: *ėjo*, third person.",
  },
  nb: NORWEGIAN,
  no: NORWEGIAN,
  nn: {
    notes:
      "In Nynorsk. Noun: Gender: ein, ei or eit where the term lacks its article, Definite: *jenta*, Plural: *jenter*. Verb: Present: *køyrer*, Past: *køyrde*, Perfect: *har køyrt*.",
    pronunciation:
      "Leave pronunciation null, unless the word isn't said as Norwegian spelling suggests.",
  },
  da: {
    notes:
      "Noun: Article: *et hus* where the term lacks it, Definite: *huset*, Plural: *huse*. Verb: Present: *kører*, Past: *kørte*, Perfect: *har kørt*. Usage: a near-synonym (*gå* on foot, *køre* by vehicle).",
  },
  is: {
    notes:
      "Noun: Gender, Genitive: *hests*, Plural: *hestar*. Strong verb: Past: *fór*, Participle: *farið*. Keep þ, ð, æ and ö as written.",
    pronunciation:
      "Leave pronunciation null, unless the word isn't said as Icelandic spelling suggests.",
  },
  fil: FILIPINO,
  tl: FILIPINO,
  vi: {
    example: "Write every word with its tone marks.",
    notes:
      "Noun: Classifier: *con chó*. Usage: the other region's word where north and south differ (In the south: *chén*; In the north: *bát*).",
  },
  ka: {
    notes:
      "Verb, listed as its verbal noun: Present: *წერს*, Aorist: *დაწერა*, third person singular. Noun: Genitive: *ფანჯრის* only when the stem drops a vowel. Usage: the postposition it takes, or a usage point.",
  },
  hy: {
    notes:
      "Noun: an irregular Plural: *մարդիկ*. Verb: Present: *գրում եմ*, first person singular, and an irregular Aorist.",
  },
};

/** A deck's guide as one block of text the model reads, or undefined for a language without one. */
export function languageGuide(tag: string | null | undefined): string | undefined {
  const enrich = languagePrompts(tag)?.enrich;
  const format = languageFormat(tag);
  const general = GUIDES[languageKey(tag)];
  const guide: FieldGuide = {
    ...(enrich?.guide ?? general),
    ...(format?.example && { example: `${format.example.format} ${format.example.sample}` }),
    // A general guide keeps its own pronunciation line until its language's prompt module replaces it.
    ...(format &&
      (enrich?.guide || !general?.pronunciation) && {
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
