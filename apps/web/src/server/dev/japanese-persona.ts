import type { Persona, PersonaCard } from "./personas";

/**
 * The `japanese` persona: real Japanese words with English meanings, so furigana, kana readings,
 * katakana and the Japanese voice can be looked at. A term's reading is its pronunciation; an
 * example carries readings inline, `食[た]べる`.
 */

type Row = [term: string, reading: string | null, meaning: string, example?: string];

const section = (name: string, tags: string[], rows: Row[]): PersonaCard[] =>
  rows.map(([term, reading, meaning, example]) => ({
    term,
    meaning,
    section: name,
    meaningSource: "lesson",
    source: "Genki I",
    ...(reading && { pronunciation: reading }),
    ...(example && { example }),
    ...(tags.length > 0 && { tags }),
  }));

const NOUNS: Row[] = [
  ["水", "みず", "water", "水[みず]を一杯[いっぱい]ください。"],
  ["山", "やま", "mountain"],
  ["川", "かわ", "river"],
  ["空", "そら", "sky"],
  ["雨", "あめ", "rain", "明日[あした]は雨[あめ]です。"],
  ["雪", "ゆき", "snow"],
  ["花", "はな", "flower"],
  ["木", "き", "tree"],
  ["犬", "いぬ", "dog"],
  ["猫", "ねこ", "cat"],
  ["魚", "さかな", "fish"],
  ["肉", "にく", "meat"],
  ["卵", "たまご", "egg"],
  ["野菜", "やさい", "vegetables"],
  ["果物", "くだもの", "fruit"],
  ["朝ご飯", "あさごはん", "breakfast"],
  ["昼ご飯", "ひるごはん", "lunch"],
  ["晩ご飯", "ばんごはん", "dinner"],
  ["学校", "がっこう", "school"],
  ["先生", "せんせい", "teacher"],
  ["学生", "がくせい", "student"],
  ["友達", "ともだち", "friend", "友達[ともだち]と映画[えいが]を見[み]ました。"],
  ["家族", "かぞく", "family"],
  ["電車", "でんしゃ", "train"],
  ["駅", "えき", "station", "駅[えき]はどこですか。"],
  ["道", "みち", "road; way"],
  ["店", "みせ", "shop"],
  ["本", "ほん", "book"],
  ["新聞", "しんぶん", "newspaper"],
  ["手紙", "てがみ", "letter"],
  ["時計", "とけい", "clock; watch"],
  ["傘", "かさ", "umbrella"],
  ["部屋", "へや", "room"],
  ["窓", "まど", "window"],
  ["机", "つくえ", "desk"],
  ["椅子", "いす", "chair"],
  ["天気", "てんき", "weather", "今日[きょう]はいい天気[てんき]ですね。"],
  ["今日", "きょう", "today"],
  ["明日", "あした", "tomorrow"],
  ["昨日", "きのう", "yesterday"],
  ["毎日", "まいにち", "every day"],
  ["時間", "じかん", "time"],
  ["名前", "なまえ", "name"],
  ["言葉", "ことば", "word; language"],
];

const VERBS: Row[] = [
  ["食べる", "たべる", "to eat", "毎朝[まいあさ]パンを食[た]べる。"],
  ["飲む", "のむ", "to drink"],
  ["行く", "いく", "to go", "週末[しゅうまつ]に京都[きょうと]へ行[い]きます。"],
  ["来る", "くる", "to come"],
  ["帰る", "かえる", "to go home"],
  ["見る", "みる", "to see; to watch"],
  ["聞く", "きく", "to listen; to ask"],
  ["話す", "はなす", "to speak"],
  ["読む", "よむ", "to read"],
  ["書く", "かく", "to write"],
  ["買う", "かう", "to buy"],
  ["待つ", "まつ", "to wait", "ちょっと待[ま]ってください。"],
  ["起きる", "おきる", "to get up"],
  ["寝る", "ねる", "to sleep; to go to bed"],
  ["働く", "はたらく", "to work"],
  ["休む", "やすむ", "to rest; to take a day off"],
  ["歩く", "あるく", "to walk"],
  ["走る", "はしる", "to run"],
  ["泳ぐ", "およぐ", "to swim"],
  ["遊ぶ", "あそぶ", "to play; to hang out"],
  ["教える", "おしえる", "to teach; to tell"],
  ["覚える", "おぼえる", "to memorise; to remember"],
  ["忘れる", "わすれる", "to forget", "傘[かさ]を忘[わす]れました。"],
  ["分かる", "わかる", "to understand"],
];

const ADJECTIVES: Row[] = [
  ["大きい", "おおきい", "big"],
  ["小さい", "ちいさい", "small"],
  ["新しい", "あたらしい", "new"],
  ["古い", "ふるい", "old (of things)"],
  ["高い", "たかい", "expensive; tall"],
  ["安い", "やすい", "cheap"],
  ["暑い", "あつい", "hot (weather)"],
  ["寒い", "さむい", "cold (weather)"],
  ["楽しい", "たのしい", "fun"],
  ["難しい", "むずかしい", "difficult"],
  ["易しい", "やさしい", "easy"],
  ["美味しい", "おいしい", "delicious", "このラーメンは美味[おい]しい。"],
  ["静か", "しずか", "quiet"],
  ["便利", "べんり", "convenient"],
  ["元気", "げんき", "well; energetic"],
  ["上手", "じょうず", "skilful"],
  ["下手", "へた", "unskilful"],
];

// Kana only: no reading, so the term is its own pronunciation.
const KANA: Row[] = [
  ["ありがとう", null, "thank you"],
  ["すみません", null, "excuse me; sorry"],
  ["おはよう", null, "good morning"],
  ["こんにちは", null, "hello; good afternoon"],
  ["こんばんは", null, "good evening"],
  ["さようなら", null, "goodbye"],
  ["いただきます", null, "said before eating"],
  ["ごちそうさま", null, "said after eating"],
  ["ちょっと", null, "a little; a moment"],
  ["もう", null, "already"],
  ["まだ", null, "not yet; still"],
  ["とても", null, "very"],
  ["ゆっくり", null, "slowly"],
  ["たくさん", null, "a lot"],
];

const KATAKANA: Row[] = [
  ["コンビニ", null, "convenience store"],
  ["コーヒー", null, "coffee"],
  ["パン", null, "bread"],
  ["テレビ", null, "television"],
  ["パソコン", null, "computer"],
  ["スマホ", null, "smartphone"],
  ["エレベーター", null, "lift; elevator"],
  ["タクシー", null, "taxi"],
  ["ホテル", null, "hotel"],
  ["レストラン", null, "restaurant"],
  ["アルバイト", null, "part-time job"],
  ["メール", null, "email"],
  ["ニュース", null, "news"],
  ["スーパー", null, "supermarket"],
  ["チケット", null, "ticket"],
  ["アイスクリーム", null, "ice cream"],
];

const N4: Row[] = [
  ["経験", "けいけん", "experience"],
  ["説明", "せつめい", "explanation"],
  ["準備", "じゅんび", "preparation"],
  ["約束", "やくそく", "promise; appointment"],
  ["予定", "よてい", "plan; schedule", "来週[らいしゅう]の予定[よてい]はまだ決[き]めていません。"],
  ["意見", "いけん", "opinion"],
  ["趣味", "しゅみ", "hobby"],
  ["習慣", "しゅうかん", "habit; custom"],
  ["興味", "きょうみ", "interest"],
  ["理由", "りゆう", "reason"],
  ["場所", "ばしょ", "place"],
  ["季節", "きせつ", "season"],
  ["空港", "くうこう", "airport"],
  ["地図", "ちず", "map"],
  ["病院", "びょういん", "hospital"],
  ["薬", "くすり", "medicine"],
  ["遅れる", "おくれる", "to be late", "会議[かいぎ]に十分[じゅっぷん]遅[おく]れた。"],
  ["間に合う", "まにあう", "to be in time"],
  ["頑張る", "がんばる", "to do one's best"],
  ["片付ける", "かたづける", "to tidy up"],
  ["調べる", "しらべる", "to look up; to investigate"],
  ["届ける", "とどける", "to deliver"],
  ["集める", "あつめる", "to collect"],
  ["決める", "きめる", "to decide"],
];

const SENTENCES: Row[] = [
  ["電車に乗り遅れた", "でんしゃにのりおくれた", "I missed the train"],
  ["お腹が空いた", "おなかがすいた", "I'm hungry"],
  ["道に迷いました", "みちにまよいました", "I got lost"],
  ["気をつけて", "きをつけて", "take care"],
  ["楽しみにしています", "たのしみにしています", "I'm looking forward to it"],
  ["お先に失礼します", "おさきにしつれいします", "excuse me for leaving first"],
  ["少々お待ちください", "しょうしょうおまちください", "please wait a moment"],
  ["もう一度お願いします", "もういちどおねがいします", "once more, please"],
  ["写真を撮ってもいいですか", "しゃしんをとってもいいですか", "may I take a photo?"],
  ["いくらですか", null, "how much is it?"],
];

// Asked both ways, so the production side of a Japanese card can be seen.
const NUMBERS_AND_DAYS: PersonaCard[] = (
  [
    ["一", "いち", "one"],
    ["二", "に", "two"],
    ["三", "さん", "three"],
    ["十", "じゅう", "ten"],
    ["百", "ひゃく", "hundred"],
    ["千", "せん", "thousand"],
    ["円", "えん", "yen"],
    ["月曜日", "げつようび", "Monday"],
    ["火曜日", "かようび", "Tuesday"],
    ["水曜日", "すいようび", "Wednesday"],
    ["木曜日", "もくようび", "Thursday"],
    ["金曜日", "きんようび", "Friday"],
    ["土曜日", "どようび", "Saturday"],
    ["日曜日", "にちようび", "Sunday"],
    ["午前", "ごぜん", "a.m.; morning"],
    ["午後", "ごご", "p.m.; afternoon"],
    ["半", "はん", "half (past)"],
    ["何時", "なんじ", "what time"],
    ["先週", "せんしゅう", "last week"],
    ["来週", "らいしゅう", "next week"],
  ] as const
).map(([term, reading, meaning]) => ({
  term,
  pronunciation: reading,
  meaning,
  tags: ["numbers"],
  meaningSource: "lesson" as const,
}));

/** Most days for five months, with a few gaps. */
const studyDays = Array.from({ length: 150 }, (_, i) => i).filter(
  (day) => day <= 1 || day % 9 !== 4,
);

export const JAPANESE: Persona = {
  id: "japanese",
  name: "Mika",
  group: "Languages",
  description:
    "Five months of Japanese with English meanings: kanji with readings, kana, katakana and sentences with furigana, in JLPT sections. One deck asked both ways.",
  appLanguage: "en",
  reviewDays: studyDays,
  reviewsPerDay: { min: 10, max: 30 },
  dueNow: 24,
  decks: [
    {
      name: "日本語 N5–N4",
      description: "Genki I, chapters 1 to 12.",
      defaultLanguage: "ja",
      introducedDaysAgo: 150,
      sections: ["N5 nouns", "N5 verbs", "N5 adjectives", "Kana", "Katakana", "N4", "Sentences"],
      cards: [
        ...section("N5 nouns", ["noun"], NOUNS),
        ...section("N5 verbs", ["verb"], VERBS),
        ...section("N5 adjectives", ["adjective"], ADJECTIVES),
        ...section("Kana", [], KANA),
        ...section("Katakana", ["loanword"], KATAKANA),
        ...section("N4", [], N4).map((c) => ({ ...c, introducedDaysAgo: 40 })),
        ...section("Sentences", ["phrase"], SENTENCES).map((c) => ({
          ...c,
          introducedDaysAgo: 20,
        })),
      ],
    },
    {
      name: "数字と曜日",
      description: "Numbers and days, asked both ways.",
      defaultLanguage: "ja",
      directions: "both",
      introducedDaysAgo: 90,
      cards: NUMBERS_AND_DAYS,
    },
  ],
};
