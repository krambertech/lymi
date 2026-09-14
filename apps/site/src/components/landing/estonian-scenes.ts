import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";

/** One word of a line, with what it means on its own. Punctuation and spaces carry no gloss. */
export type Token = string | { text: string; gloss: MessageDescriptor };

export interface SceneLine {
  /** Who says it; `you` sits on the right like your own messages. */
  speaker: "you" | { name: string; avatar: string };
  tokens: Token[];
  translation: MessageDescriptor;
}

export interface Scene {
  id: string;
  title: MessageDescriptor;
  lines: SceneLine[];
}

const barista = { name: "Jonas", avatar: "jonas" };
const friend = { name: "Mari", avatar: "mari" };
const cashier = { name: "Aiko", avatar: "aiko" };

const w = (text: string, gloss: MessageDescriptor): Token => ({ text, gloss });

/** Small conversations from a first week in Estonia, word by word. */
export const ESTONIAN_SCENES: Scene[] = [
  {
    id: "cafe",
    title: msg`At the café`,
    lines: [
      {
        speaker: barista,
        tokens: [
          w("Tere", msg`hello`),
          "! ",
          w("Mida", msg`what`),
          " ",
          w("teile", msg`for you`),
          "?",
        ],
        translation: msg`Hi! What can I get you?`,
      },
      {
        speaker: "you",
        tokens: [
          w("Üks", msg`one`),
          " ",
          w("kohv", msg`coffee`),
          " ",
          w("ja", msg`and`),
          " ",
          w("kaneelisai", msg`cinnamon bun`),
          ", ",
          w("palun", msg`please`),
          ".",
        ],
        translation: msg`A coffee and a cinnamon bun, please.`,
      },
      {
        speaker: barista,
        tokens: [w("Siin", msg`here`), " ", w("või", msg`or`), " ", w("kaasa", msg`to go`), "?"],
        translation: msg`For here or to go?`,
      },
      {
        speaker: "you",
        tokens: [w("Kaasa", msg`to go`), ", ", w("palun", msg`please`), "."],
        translation: msg`To go, please.`,
      },
      {
        speaker: barista,
        tokens: [
          w("Kaardiga", msg`by card`),
          " ",
          w("või", msg`or`),
          " ",
          w("sularahas", msg`in cash`),
          "?",
        ],
        translation: msg`Card or cash?`,
      },
      {
        speaker: "you",
        tokens: [w("Kaardiga", msg`by card`), ". ", w("Aitäh", msg`thank you`), "!"],
        translation: msg`Card. Thanks!`,
      },
    ],
  },
  {
    id: "hello",
    title: msg`Saying hello`,
    lines: [
      {
        speaker: friend,
        tokens: [
          w("Tere", msg`hello`),
          "! ",
          w("Kuidas", msg`how`),
          " ",
          w("läheb", msg`it goes`),
          "?",
        ],
        translation: msg`Hi! How’s it going?`,
      },
      {
        speaker: "you",
        tokens: [
          w("Hästi", msg`well`),
          ", ",
          w("aitäh", msg`thank you`),
          "! ",
          w("Ja", msg`and`),
          " ",
          w("sul", msg`you`),
          "?",
        ],
        translation: msg`Good, thanks! And you?`,
      },
      {
        speaker: friend,
        tokens: [
          w("Normaalselt", msg`all right`),
          ". ",
          w("Palju", msg`a lot of`),
          " ",
          w("tööd", msg`work`),
          ".",
        ],
        translation: msg`All right. Lots of work.`,
      },
      {
        speaker: "you",
        tokens: [w("Jõudu", msg`strength; hang in there`), "!"],
        translation: msg`Hang in there!`,
      },
      {
        speaker: friend,
        tokens: [
          w("Aitäh", msg`thank you`),
          "! ",
          w("Näeme", msg`see you; literally, we see`),
          "!",
        ],
        translation: msg`Thanks! See you!`,
      },
    ],
  },
  {
    id: "shop",
    title: msg`At the shop`,
    lines: [
      {
        speaker: cashier,
        tokens: [
          w("Tere", msg`hello`),
          "! ",
          w("Kas", msg`a word that makes a question`),
          " ",
          w("teil", msg`you have (with “on”)`),
          " ",
          w("on", msg`is; have`),
          " ",
          w("kliendikaart", msg`loyalty card`),
          "?",
        ],
        translation: msg`Hi! Do you have a loyalty card?`,
      },
      {
        speaker: "you",
        tokens: [w("Ei", msg`no; not`), " ", w("ole", msg`have; am`), "."],
        translation: msg`No, I don’t.`,
      },
      {
        speaker: cashier,
        tokens: [
          w("Kas", msg`a word that makes a question`),
          " ",
          w("kotti", msg`a bag`),
          " ",
          w("on", msg`is`),
          " ",
          w("vaja", msg`needed`),
          "?",
        ],
        translation: msg`Do you need a bag?`,
      },
      {
        speaker: "you",
        tokens: [w("Jah", msg`yes`), ", ", w("üks", msg`one`), ", ", w("palun", msg`please`), "."],
        translation: msg`Yes, one, please.`,
      },
      {
        speaker: cashier,
        tokens: [
          w("Kaks", msg`two`),
          " ",
          w("eurot", msg`euros`),
          " ",
          w("ja", msg`and`),
          " ",
          w("kümme", msg`ten`),
          " ",
          w("senti", msg`cents`),
          ".",
        ],
        translation: msg`Two euros ten.`,
      },
      {
        speaker: "you",
        tokens: [
          w("Aitäh", msg`thank you`),
          ", ",
          w("head", msg`good`),
          " ",
          w("päeva", msg`day`),
          "!",
        ],
        translation: msg`Thanks, have a good day!`,
      },
    ],
  },
];
