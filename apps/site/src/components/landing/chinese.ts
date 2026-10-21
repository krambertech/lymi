import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { HandCard } from "./hand-cards";
import { noun, verb } from "./hand-cards";
import type { PathStep, VoiceWord } from "./japanese";

/**
 * The Chinese page's words. Terms and their pinyin are Chinese and never translated; meanings follow
 * the page. Pinyin is written one syllable per character, as the page draws it over the hanzi. The
 * clips in `/audio/chinese/` are the published HSK decks' own.
 */

const card = (
  id: string,
  source: string,
  term: string,
  pinyin: string,
  meaning: MessageDescriptor,
  state: HandCard["state"],
  kind: MessageDescriptor = noun,
): HandCard => ({
  id,
  source,
  kind,
  language: "zh-Hans",
  term,
  furigana: pinyin,
  meaning,
  state,
  audio: `/audio/chinese/${id}.mp3`,
});

/** Learning words first, with their pinyin; the Known ones last, whose pinyin waits for the turn. */
export const CHINESE_HAND: HandCard[] = [
  card("xihuan", "HSK 1", "喜欢", "xǐ huan", msg`To like`, "learning", verb),
  card("dongxi", "HSK 1", "东西", "dōng xi", msg`A thing; stuff`, "new"),
  card("dache", "HSK 2", "打车", "dǎ chē", msg`To take a taxi`, "new", verb),
  card("shuijiao", "HSK 1", "睡觉", "shuì jiào", msg`To sleep; to go to bed`, "learning", verb),
  card("juede", "HSK 1", "觉得", "jué de", msg`To feel; to think`, "new", verb),
  card("ditie", "HSK 2", "地铁", "dì tiě", msg`Metro; subway`, "learning"),
  card("pengyou", "HSK 1", "朋友", "péng you", msg`Friend`, "known"),
  card("mingtian", "HSK 1", "明天", "míng tiān", msg`Tomorrow`, "known"),
  card("yinhang", "HSK 2", "银行", "yín háng", msg`Bank`, "known"),
];

/** Sentences that use the front card's word, drawn faintly behind the hand; the word sits between asterisks. */
export const CHINESE_EXAMPLES: Record<string, string[]> = {
  xihuan: ["我很*喜欢*这本书。", "你*喜欢*喝茶吗？", "我*喜欢*在家看电影。", "他不*喜欢*下雨天。"],
  dongxi: ["你买了什么*东西*？", "这个*东西*很好用。", "我忘了带*东西*。", "*东西*太多了。"],
  dache: ["我们*打车*去吧。", "太晚了，*打车*回家。", "*打车*要多少钱？", "下雨了，我想*打车*。"],
  shuijiao: ["我十一点*睡觉*。", "孩子已经*睡觉*了。", "*睡觉*前别喝咖啡。", "我想*睡觉*。"],
  juede: ["我*觉得*很好。", "你*觉得*怎么样？", "我*觉得*他是对的。", "今天我*觉得*有点累。"],
  ditie: ["我每天坐*地铁*上班。", "*地铁*站在哪儿？", "*地铁*比公共汽车快。", "坐*地铁*去机场。"],
  pengyou: [
    "他是我的好*朋友*。",
    "我和*朋友*去吃饭。",
    "这是我的中国*朋友*。",
    "我们是老*朋友*了。",
  ],
  mingtian: ["*明天*见！", "*明天*会下雨吗？", "我*明天*去北京。", "*明天*是星期六。"],
  yinhang: ["我去*银行*取钱。", "*银行*几点开门？", "她在*银行*工作。", "附近有*银行*吗？"],
};

/** The order to take the HSK decks in. */
export const CHINESE_PATH: PathStep[] = [
  {
    slug: "chinese-hsk-1-vocabulary",
    about: msg`People, food, time and your first verbs.`,
    words: [
      { term: "朋友", furigana: "péng you", answer: msg`Friend` },
      { term: "喜欢", furigana: "xǐ huan", answer: msg`To like` },
      { term: "火车", furigana: "huǒ chē", answer: msg`Train` },
      { term: "谢谢", furigana: "xiè xie", answer: msg`Thank you` },
    ],
  },
  {
    slug: "chinese-hsk-2-vocabulary",
    about: msg`Travel, health and opinions, once HSK 1 feels easy.`,
    words: [
      { term: "银行", furigana: "yín háng", answer: msg`Bank` },
      { term: "打车", furigana: "dǎ chē", answer: msg`To take a taxi` },
      { term: "地铁", furigana: "dì tiě", answer: msg`Metro; subway` },
      { term: "可以", furigana: "kě yǐ", answer: msg`Can; may` },
    ],
  },
];

export const CHINESE_VOICE_WORDS: VoiceWord[] = [
  { id: "keyi", term: "可以", reading: "kěyǐ", meaning: msg`Can; may` },
  { id: "bukeqi", term: "不客气", reading: "bù kèqi", meaning: msg`You’re welcome` },
  { id: "xiexie", term: "谢谢", reading: "xièxie", meaning: msg`Thank you` },
  { id: "meiguanxi", term: "没关系", reading: "méi guānxi", meaning: msg`It’s OK` },
  { id: "renshi", term: "认识", reading: "rènshi", meaning: msg`To get to know` },
  { id: "zhongwen", term: "中文", reading: "zhōngwén", meaning: msg`Chinese` },
];

/** A class deck's newest cards, as the owner added them after a lesson. */
export const CHINESE_CLASS_CARDS = [
  { term: "打车", reading: "dǎ chē", meaning: msg`To take a taxi` },
  { term: "地铁", reading: "dì tiě", meaning: msg`Metro; subway` },
  { term: "机场", reading: "jī chǎng", meaning: msg`Airport` },
];

/** 行 in six words, alternating its two readings; the runs are the characters before and after it. */
export interface XingWord {
  word: string;
  before: [string, string][];
  after: [string, string][];
  reading: "háng" | "xíng";
  pinyin: string;
  meaning: MessageDescriptor;
}

export const XING_WORDS: XingWord[] = [
  {
    word: "银行",
    before: [["银", "yín"]],
    after: [],
    reading: "háng",
    pinyin: "yínháng",
    meaning: msg`Bank`,
  },
  {
    word: "不行",
    before: [["不", "bù"]],
    after: [],
    reading: "xíng",
    pinyin: "bùxíng",
    meaning: msg`No good; won’t do`,
  },
  {
    word: "行长",
    before: [],
    after: [["长", "zhǎng"]],
    reading: "háng",
    pinyin: "hángzhǎng",
    meaning: msg`Bank president`,
  },
  {
    word: "自行车",
    before: [["自", "zì"]],
    after: [["车", "chē"]],
    reading: "xíng",
    pinyin: "zìxíngchē",
    meaning: msg`Bicycle`,
  },
  {
    word: "外行",
    before: [["外", "wài"]],
    after: [],
    reading: "háng",
    pinyin: "wàiháng",
    meaning: msg`An amateur`,
  },
  {
    word: "行人",
    before: [],
    after: [["人", "rén"]],
    reading: "xíng",
    pinyin: "xíngrén",
    meaning: msg`Pedestrian`,
  },
];

/** A short text whose pinyin leaves each character as the card that teaches it reaches Known. */
export const FADE_TEXT = [
  { zh: "明天我要去银行。", pinyin: "míng tiān wǒ yào qù yín háng" },
  { zh: "我朋友是那家银行的行长。", pinyin: "wǒ péng you shì nà jiā yín háng de háng zhǎng" },
  { zh: "他说今天不行。", pinyin: "tā shuō jīn tiān bù xíng" },
];

/** The learner's cards in the order they reach Known; 银行 comes last, for its twist. */
export const FADE_CARDS = [
  { term: "我", pinyin: "wǒ" },
  { term: "明天", pinyin: "míng tiān" },
  { term: "朋友", pinyin: "péng you" },
  { term: "是", pinyin: "shì" },
  { term: "去", pinyin: "qù" },
  { term: "今天", pinyin: "jīn tiān" },
  { term: "他", pinyin: "tā" },
  { term: "说", pinyin: "shuō" },
  { term: "要", pinyin: "yào" },
  { term: "的", pinyin: "de" },
  { term: "银行", pinyin: "yín háng" },
];
