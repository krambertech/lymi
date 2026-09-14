import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";

export interface FloatingWord {
  term: string;
  meaning: MessageDescriptor;
}

export interface WordFrame {
  /** BCP 47 tag, for `lang` and to pick the headline. */
  language: FieldLanguage;
  words: FloatingWord[];
}

export type FieldLanguage =
  | "es"
  | "ja"
  | "fr"
  | "de"
  | "et"
  | "ko"
  | "it"
  | "pt"
  | "fi"
  | "uk"
  | "zh"
  | "tr"
  | "ar";

/** Six everyday words per language, drifting behind the languages hero while its name is shown. */
export const WORD_FRAMES: WordFrame[] = [
  {
    language: "es",
    words: [
      { term: "vale", meaning: msg`Okay` },
      { term: "madrugar", meaning: msg`To get up early` },
      { term: "ojalá", meaning: msg`I hope so; if only` },
      { term: "sobremesa", meaning: msg`Lingering at the table after a meal` },
      { term: "¿qué tal?", meaning: msg`How’s it going?` },
      { term: "quedar", meaning: msg`To meet up` },
    ],
  },
  {
    language: "ja",
    words: [
      { term: "木漏れ日", meaning: msg`Sunlight through leaves` },
      { term: "いただきます", meaning: msg`Said before eating` },
      { term: "駅", meaning: msg`Station` },
      { term: "大丈夫", meaning: msg`It’s fine; I’m OK` },
      { term: "お疲れ様です", meaning: msg`Thanks for your hard work` },
      { term: "積ん読", meaning: msg`A pile of unread books` },
    ],
  },
  {
    language: "fr",
    words: [
      { term: "je veux bien", meaning: msg`Yes, please` },
      { term: "ça marche", meaning: msg`Sounds good` },
      { term: "bref", meaning: msg`Anyway; long story short` },
      { term: "la veille", meaning: msg`The day before` },
      { term: "un truc", meaning: msg`A thing; a whatsit` },
      { term: "d’habitude", meaning: msg`Usually` },
    ],
  },
  {
    language: "de",
    words: [
      { term: "Feierabend", meaning: msg`The evening after work` },
      { term: "doch", meaning: msg`Yes, actually` },
      { term: "gemütlich", meaning: msg`Cosy` },
      { term: "aufhören", meaning: msg`To stop` },
      { term: "eigentlich", meaning: msg`Actually; really` },
      { term: "Schnapsidee", meaning: msg`An idea that only sounds good after a few drinks` },
    ],
  },
  {
    language: "et",
    words: [
      { term: "palun", meaning: msg`Please; here you go` },
      { term: "tere", meaning: msg`Hello` },
      { term: "jäääär", meaning: msg`The edge of the ice` },
      { term: "kallis", meaning: msg`Dear; expensive` },
      { term: "mõnus", meaning: msg`Pleasant; cosy` },
      { term: "head aega", meaning: msg`Goodbye` },
    ],
  },
  {
    language: "ko",
    words: [
      { term: "눈치", meaning: msg`The knack of reading the room` },
      { term: "괜찮아요", meaning: msg`It’s okay` },
      { term: "안녕하세요", meaning: msg`Hello` },
      { term: "화이팅", meaning: msg`You can do it!` },
      { term: "잘 먹겠습니다", meaning: msg`Said before a meal` },
      { term: "정", meaning: msg`Deep, lasting affection` },
    ],
  },
  {
    language: "it",
    words: [
      { term: "magari", meaning: msg`If only` },
      { term: "boh", meaning: msg`Who knows?` },
      { term: "volentieri", meaning: msg`Gladly` },
      { term: "allora", meaning: msg`So; well then` },
      { term: "in bocca al lupo", meaning: msg`Good luck!` },
      { term: "sprezzatura", meaning: msg`Effortless grace` },
    ],
  },
  {
    language: "pt",
    words: [
      { term: "saudade", meaning: msg`Longing for what is gone` },
      { term: "tudo bem?", meaning: msg`All good?` },
      { term: "valeu", meaning: msg`Thanks; cheers` },
      { term: "cafuné", meaning: msg`Running your fingers through someone’s hair` },
      { term: "puxar", meaning: msg`To pull` },
      { term: "obrigada", meaning: msg`Thank you` },
    ],
  },
  {
    language: "fi",
    words: [
      { term: "sisu", meaning: msg`Stubborn grit` },
      { term: "kiitos", meaning: msg`Thank you` },
      { term: "moi", meaning: msg`Hi` },
      { term: "löyly", meaning: msg`The steam in a sauna` },
      { term: "ihan sama", meaning: msg`I don’t mind` },
      { term: "kalsarikännit", meaning: msg`Drinking at home in your underwear` },
    ],
  },
  {
    language: "uk",
    words: [
      { term: "смачного", meaning: msg`Enjoy your meal` },
      { term: "дякую", meaning: msg`Thank you` },
      { term: "будь ласка", meaning: msg`Please` },
      { term: "затишно", meaning: msg`Cosy` },
      { term: "обійми", meaning: msg`Hugs` },
      { term: "до зустрічі", meaning: msg`See you soon` },
    ],
  },
  {
    language: "zh",
    words: [
      { term: "加油", meaning: msg`You can do it!` },
      { term: "没关系", meaning: msg`It doesn’t matter` },
      { term: "好久不见", meaning: msg`Long time no see` },
      { term: "马马虎虎", meaning: msg`So-so` },
      { term: "吃了吗", meaning: msg`Have you eaten? A way to say hello` },
      { term: "买", meaning: msg`To buy` },
    ],
  },
  {
    language: "tr",
    words: [
      { term: "kolay gelsin", meaning: msg`May it come easy` },
      { term: "afedersiniz", meaning: msg`Excuse me` },
      { term: "keyif", meaning: msg`Enjoying the moment` },
      { term: "çay", meaning: msg`Tea` },
      { term: "maşallah", meaning: msg`Said to admire something` },
      { term: "hayırlı olsun", meaning: msg`Congratulations` },
    ],
  },
  {
    language: "ar",
    words: [
      { term: "مرحبا", meaning: msg`Hello` },
      { term: "شكرا", meaning: msg`Thank you` },
      { term: "يلا", meaning: msg`Come on; let’s go` },
      { term: "صباح الخير", meaning: msg`Good morning` },
      { term: "إن شاء الله", meaning: msg`God willing` },
      { term: "حبيبي", meaning: msg`My dear` },
    ],
  },
];
