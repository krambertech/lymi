import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { HandCard } from "./hand-cards";
import { noun, verb } from "./hand-cards";

/**
 * The Japanese page's words. Terms and their readings are Japanese and never translated; meanings
 * follow the page. The clips in `/audio/japanese/` are the published N5 and kana decks' own.
 */

const card = (
  id: string,
  term: string,
  furigana: string,
  meaning: MessageDescriptor,
  state: HandCard["state"],
  kind: MessageDescriptor = noun,
): HandCard => ({
  id,
  source: "N5",
  kind,
  language: "ja",
  term,
  furigana,
  meaning,
  state,
  audio: `/audio/japanese/${id}.mp3`,
});

/**
 * Dealt in this order. Words still being learned come first, with their readings; the Known ones,
 * whose readings wait for the turn, come once the visitor has seen why.
 */
export const JAPANESE_HAND: HandCard[] = [
  card("densha", "電車", "でんしゃ", msg`Train`, "new"),
  card("taberu", "食べる", "たべる", msg`To eat`, "learning", verb),
  card("ashita", "明日", "あした", msg`Tomorrow`, "new"),
  {
    id: "a",
    source: msg`Kana`,
    kind: msg`hiragana`,
    language: "ja",
    term: "あ",
    meaning: msg`a, as in “father”`,
    state: "new",
    audio: "/audio/japanese/a.mp3",
  },
  card("kouen", "公園", "こうえん", msg`Park`, "learning"),
  card("yomu", "読む", "よむ", msg`To read`, "new", verb),
  card("tomodachi", "友達", "ともだち", msg`Friend`, "known"),
  card("mainichi", "毎日", "まいにち", msg`Every day`, "known"),
  card("denwa", "電話", "でんわ", msg`Phone; a phone call`, "known"),
];

/**
 * Sentences that use the front card's word, drawn faintly behind the hand. The marked run, between
 * asterisks, is the word as the sentence bends it: 食べ in 食べたい.
 */
export const HAND_EXAMPLES: Record<string, string[]> = {
  densha: [
    "*電車*で会社に行きます。",
    "次の*電車*は何時ですか。",
    "*電車*が少し遅れています。",
    "毎朝、*電車*の中で本を読みます。",
  ],
  tomodachi: [
    "*友達*と映画を見ました。",
    "日本人の*友達*がいます。",
    "週末、*友達*の家に行きます。",
    "昔からの*友達*です。",
  ],
  taberu: [
    "朝ご飯を*食べ*ましたか。",
    "お寿司が*食べ*たいです。",
    "一緒に*食べ*ませんか。",
    "何を*食べる*？",
  ],
  ashita: [
    "*明日*は雨が降るそうです。",
    "*明日*、また会いましょう。",
    "*明日*の朝、早く起きます。",
    "じゃあ、また*明日*。",
  ],
  mainichi: [
    "*毎日*、日本語を勉強しています。",
    "*毎日*少しずつ覚えます。",
    "父は*毎日*走っています。",
    "*毎日*が楽しいです。",
  ],
  kouen: [
    "*公園*を散歩します。",
    "駅の近くに*公園*があります。",
    "子供たちが*公園*で遊んでいます。",
    "*公園*で待っています。",
  ],
  yomu: [
    "本を*読む*のが好きです。",
    "毎晩、漫画を*読み*ます。",
    "この漢字は何と*読み*ますか。",
    "新聞を*読ん*でいます。",
  ],
  a: ["*あ*さ", "*あ*め", "*あ*りがとう", "*あ*した"],
  denwa: [
    "後で*電話*します。",
    "*電話*番号を教えてください。",
    "母から*電話*がありました。",
    "*電話*に出られません。",
  ],
};

/** One kanji in seven words: the runs before and after the 日 in focus, and how that 日 is read. */
export interface KanjiWord {
  word: string;
  before: [string, string][];
  after: [string, string][];
  reading: string;
  meaning: MessageDescriptor;
  /** The reading belongs to the whole word, not to 日 alone, as in 今日. */
  whole?: boolean;
}

export const HI_WORDS: KanjiWord[] = [
  { word: "日", before: [], after: [], reading: "ひ", meaning: msg`Sun; day` },
  { word: "日本", before: [], after: [["本", "ほん"]], reading: "に", meaning: msg`Japan` },
  { word: "毎日", before: [["毎", "まい"]], after: [], reading: "にち", meaning: msg`Every day` },
  { word: "休日", before: [["休", "きゅう"]], after: [], reading: "じつ", meaning: msg`A day off` },
  {
    word: "日曜日",
    before: [
      ["日", "にち"],
      ["曜", "よう"],
    ],
    after: [],
    reading: "び",
    meaning: msg`Sunday`,
  },
  {
    word: "三日",
    before: [["三", "みっ"]],
    after: [],
    reading: "か",
    meaning: msg`The 3rd of the month`,
  },
  {
    word: "今日",
    before: [["今", ""]],
    after: [],
    reading: "きょう",
    meaning: msg`Today`,
    whole: true,
  },
];

export interface PathWord {
  term: string;
  /** Kana over the kanji; left out for a kana card, whose sound is its answer. */
  furigana?: string;
  /** A kana card's sound, or a message for a word's meaning. */
  answer: string | MessageDescriptor;
}

export interface PathStep {
  slug: string;
  about: MessageDescriptor;
  words: PathWord[];
}

/** The order to take the beginner decks in, as Welcome offers them. */
export const JAPANESE_PATH: PathStep[] = [
  {
    slug: "read-japanese-kana",
    about: msg`Hiragana, then katakana, a few rows at a time. Each sign comes with its sound.`,
    words: [
      { term: "あ", answer: "a" },
      { term: "か", answer: "ka" },
      { term: "し", answer: "shi" },
      { term: "ア", answer: "a" },
      { term: "きゃ", answer: "kya" },
    ],
  },
  {
    slug: "japanese-n5-vocabulary-practice",
    about: msg`Everyday words, from family and food to your first verbs.`,
    words: [
      { term: "毎日", furigana: "まいにち", answer: msg`Every day` },
      { term: "食べる", furigana: "たべる", answer: msg`To eat` },
      { term: "友達", furigana: "ともだち", answer: msg`Friend` },
      { term: "電車", furigana: "でんしゃ", answer: msg`Train` },
    ],
  },
  {
    slug: "japanese-n4-vocabulary",
    about: msg`Feelings, travel and polite speech, once N5 feels easy.`,
    words: [
      { term: "花見", furigana: "はなみ", answer: msg`Cherry-blossom viewing` },
      { term: "乗り換える", furigana: "のりかえる", answer: msg`To change trains` },
      { term: "約束", furigana: "やくそく", answer: msg`A promise; plans to meet` },
      { term: "復習", furigana: "ふくしゅう", answer: msg`Going over a lesson again` },
    ],
  },
];

export interface VoiceWord {
  id: string;
  term: string;
  reading: string;
  meaning: MessageDescriptor;
}

export const VOICE_WORDS: VoiceWord[] = [
  { id: "ashita", term: "明日", reading: "あした", meaning: msg`Tomorrow` },
  { id: "kyou", term: "今日", reading: "きょう", meaning: msg`Today` },
  { id: "mainichi", term: "毎日", reading: "まいにち", meaning: msg`Every day` },
  { id: "nichiyoubi", term: "日曜日", reading: "にちようび", meaning: msg`Sunday` },
  { id: "taberu", term: "食べる", reading: "たべる", meaning: msg`To eat` },
  { id: "densha", term: "電車", reading: "でんしゃ", meaning: msg`Train` },
];

/** A class deck's newest cards, as the owner added them after a lesson. */
export const CLASS_CARDS = [
  { term: "花見", reading: "はなみ", meaning: msg`Cherry-blossom viewing` },
  { term: "乗り換える", reading: "のりかえる", meaning: msg`To change trains` },
  { term: "約束", reading: "やくそく", meaning: msg`A promise; plans to meet` },
];
