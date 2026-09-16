// The comparison corpus. Each language has plain learner vocabulary, sentences, and — where the
// language writes a phonemic contrast ambiguously — a `contrast` group that probes it directly.
// A contrast item carries `expect`, describing what a correct reading sounds like, so a listener
// who does not speak the language can still judge.

/**
 * @typedef {{ text: string, note?: string, expect?: string, reference?: string }} Item
 * @typedef {{ locale: string, name: string, words: Item[], contrasts: Item[], sentences: Item[] }} Language
 */

/** @type {Language[]} */
export const LANGUAGES = [
  {
    locale: "en-US",
    name: "English",
    words: [
      { text: "though" },
      { text: "colonel", note: "spelling gives no clue to /ˈkɜːrnəl/" },
      { text: "schedule" },
      { text: "Worcestershire" },
      { text: "awry", note: "commonly misread as AW-ree" },
      { text: "hyperbole", note: "commonly misread as HYPER-bowl" },
    ],
    contrasts: [
      {
        text: "read",
        expect: "Ambiguous in isolation: either /riːd/ or /rɛd/. Note which one each model picks.",
      },
      {
        text: "live",
        expect:
          "Either /lɪv/ (verb) or /laɪv/ (adjective). The control case — English does this too.",
      },
    ],
    sentences: [
      { text: "I have read that book, and I will read it again tomorrow." },
      { text: "The lantern on the shelf has been lit since Tuesday." },
      { text: "Could you spell that out for me, slowly?" },
    ],
  },
  {
    locale: "et-EE",
    name: "Estonian",
    words: [
      { text: "tere" },
      { text: "aitäh" },
      { text: "õpetaja" },
      { text: "raamatukogu" },
      { text: "jäätis" },
      { text: "kolmkümmend" },
      { text: "hommikusöök" },
      { text: "sügisene" },
    ],
    // Estonian marks neither the third (overlong) quantity nor palatalisation in spelling, so a
    // model with no Estonian grapheme-to-phoneme stage can only guess. These are the probes.
    contrasts: [
      {
        text: "lina",
        expect: "Q1, short. The baseline of the lina / linna / linna series.",
        reference: "https://sonaveeb.ee/search/unif/dlall/dsall/lina",
      },
      {
        text: "linna",
        expect:
          "Spelled one way, said two: Q2 genitive 'of the town' and Q3 partitive/illative 'into the town'. Either is defensible alone; listen for whether it is a confident Estonian quantity at all, or an undifferentiated mush.",
        reference: "https://sonaveeb.ee/search/unif/dlall/dsall/linn",
      },
      {
        text: "sada",
        expect: "Q1, short. Baseline of sada / saada / saada.",
        reference: "https://sonaveeb.ee/search/unif/dlall/dsall/sada",
      },
      {
        text: "saada",
        expect: "Q2 'send!' versus Q3 'to get', identical on the page. Same test as linna.",
        reference: "https://sonaveeb.ee/search/unif/dlall/dsall/saatma",
      },
      {
        text: "kabi",
        expect: "Q1 'hoof'. First of the textbook kabi / kapi / kappi quantity triple.",
        reference: "https://sonaveeb.ee/search/unif/dlall/dsall/kabi",
      },
      {
        text: "kapi",
        expect: "Q2 'of the cupboard'. Should be audibly longer than kabi.",
        reference: "https://sonaveeb.ee/search/unif/dlall/dsall/kapp",
      },
      {
        text: "kappi",
        expect:
          "Q3 'into the cupboard'. Should be audibly longer again than kapi. If kapi and kappi sound the same, the model has no Estonian quantity.",
        reference: "https://sonaveeb.ee/search/unif/dlall/dsall/kapp",
      },
      {
        text: "palk",
        expect:
          "Palatalisation, never written: [palk] 'wage' versus [palʲk] 'log'. Listen for whether the l is palatalised at all.",
        reference: "https://sonaveeb.ee/search/unif/dlall/dsall/palk",
      },
    ],
    sentences: [
      { text: "Ma lähen homme kooli." },
      { text: "Kas sa räägid eesti keelt?" },
      { text: "Palun üks kohv ja üks sai." },
    ],
  },
  {
    locale: "ru-RU",
    name: "Russian",
    words: [
      { text: "здравствуйте" },
      { text: "библиотека" },
      { text: "сейчас" },
      { text: "что", note: "said [ʂto], not [tʂto]" },
      { text: "солнце", note: "silent l" },
      { text: "его", note: "genitive -го said [vo]" },
    ],
    // Russian stress is phonemic and unwritten — the same failure class as Estonian quantity.
    contrasts: [
      {
        text: "замок",
        expect: "зáмок 'castle' or замóк 'lock'. Stress decides; spelling does not.",
      },
      { text: "мука", expect: "мýка 'torment' or мукá 'flour'." },
      { text: "плачу", expect: "плáчу 'I cry' or плачý 'I pay'." },
      { text: "дорогой", expect: "дорогóй 'dear/expensive' — commonly stressed wrongly by TTS." },
    ],
    sentences: [
      { text: "Сегодня я весь день читал эту книгу." },
      { text: "Извините, я не говорю по-русски очень хорошо." },
      { text: "Сколько это стоит?" },
    ],
  },
  {
    locale: "uk-UA",
    name: "Ukrainian",
    words: [
      { text: "дякую" },
      { text: "будь ласка" },
      { text: "бібліотека" },
      { text: "щастя" },
      { text: "зозуля" },
      { text: "паляниця", note: "the shibboleth; hard for non-native models" },
    ],
    contrasts: [
      {
        text: "ґанок",
        expect: "Must use ґ [g], not г [ɦ]. Models trained mostly on Russian collapse the two.",
      },
      {
        text: "гроші",
        expect: "г here is [ɦ], a soft breathy h — not the Russian [g].",
      },
      {
        text: "и",
        expect: "Ukrainian и is [ɪ], not the Russian [i]. A model leaning on Russian will say [i].",
      },
    ],
    sentences: [
      { text: "Доброго дня, як ваші справи?" },
      { text: "Я вивчаю українську мову вже три роки." },
      { text: "Де тут найближча аптека?" },
    ],
  },
  {
    locale: "es-ES",
    name: "Spanish",
    words: [
      { text: "desarrollador" },
      { text: "ferrocarril", note: "double trill" },
      { text: "murciélago" },
      { text: "otorrinolaringólogo" },
      { text: "cigüeña", note: "diaeresis: the u is pronounced" },
      { text: "ahorrar" },
    ],
    contrasts: [
      {
        text: "cinco",
        expect:
          "es-ES uses distinción: c before e/i is [θ]. If it comes out [s], you are getting Latin American Spanish under a Spain locale.",
      },
      {
        text: "zapato",
        expect: "Same test: [θapato] in Spain, [sapato] in Latin America.",
      },
    ],
    sentences: [
      { text: "¿Podrías repetirlo más despacio, por favor?" },
      { text: "El desarrollador escribió cinco mil líneas de código." },
      { text: "Mañana voy a la biblioteca a estudiar." },
    ],
  },
  {
    locale: "ja-JP",
    name: "Japanese",
    words: [
      { text: "図書館" },
      { text: "ありがとうございます" },
      { text: "美味しい" },
      { text: "郵便局" },
      { text: "喫茶店" },
      { text: "初めまして" },
    ],
    // Japanese pitch accent is phonemic and unwritten, and kanji readings are ambiguous in
    // isolation. Same class of problem as Estonian quantity, different surface.
    contrasts: [
      {
        text: "箸",
        expect:
          "hashi 'chopsticks', HL accent. Contrast with 橋 below — same kana, opposite pitch.",
      },
      { text: "橋", expect: "hashi 'bridge', LH accent. Should differ audibly from 箸." },
      { text: "雨", expect: "ame 'rain', HL." },
      { text: "飴", expect: "ame 'candy', LH. Should differ audibly from 雨." },
      {
        text: "一日",
        expect:
          "Reading ambiguity, not pitch: tsuitachi 'the 1st' or ichinichi 'one day'. Note which each model picks.",
      },
      {
        text: "今日",
        expect: "kyō normally, konnichi in compounds. In isolation it should be kyō.",
      },
    ],
    sentences: [
      { text: "すみません、駅はどこですか。" },
      { text: "毎日日本語を三十分勉強しています。" },
      { text: "この本はとても面白かったです。" },
    ],
  },
];

/** Flatten the corpus into one list of rows to synthesise. */
export function items() {
  const rows = [];
  for (const language of LANGUAGES) {
    for (const [kind, group] of [
      ["word", language.words],
      ["contrast", language.contrasts],
      ["sentence", language.sentences],
    ]) {
      for (const item of group) {
        rows.push({ ...item, kind, locale: language.locale, language: language.name });
      }
    }
  }
  return rows;
}
