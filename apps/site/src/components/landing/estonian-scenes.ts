import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";

/** One word of a line, with what it means on its own. Punctuation and spaces carry no gloss. */
export type Token = string | { text: string; gloss: MessageDescriptor };

export interface SceneLine {
  /** Who says it; `you` sits on the right like your own messages. */
  speaker: "you" | "them";
  /** The clip's name under `/audio/hand/`; `pnpm --filter @lymi/site hand:audio` renders `say`. */
  audio: string;
  say: string;
  tokens: Token[];
  translation: MessageDescriptor;
}

export interface Scene {
  id: string;
  title: MessageDescriptor;
  detail: MessageDescriptor;
  lines: SceneLine[];
}

const w = (text: string, gloss: MessageDescriptor): Token => ({ text, gloss });

/** Small conversations from a first week in Estonia, word by word. */
export const ESTONIAN_SCENES: Scene[] = [
  {
    id: "hello",
    title: msg`Saying hello`,
    detail: msg`Catching up with a friend`,
    lines: [
      {
        speaker: "them",
        audio: "scene-hello-1",
        say: "Tere! Kuidas läheb?",
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
        audio: "scene-hello-2",
        say: "Hästi, aitäh! Ja sul?",
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
        speaker: "them",
        audio: "scene-hello-3",
        say: "Normaalselt. Palju tööd.",
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
        audio: "scene-hello-4",
        say: "Jõudu!",
        tokens: [w("Jõudu", msg`strength; hang in there`), "!"],
        translation: msg`Hang in there!`,
      },
      {
        speaker: "them",
        audio: "scene-hello-5",
        say: "Aitäh! Näeme!",
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
    id: "cafe",
    title: msg`At the café`,
    detail: msg`Ordering a coffee to go`,
    lines: [
      {
        speaker: "them",
        audio: "scene-cafe-1",
        say: "Tere! Mida teile?",
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
        audio: "scene-cafe-2",
        say: "Üks kohv ja kaneelisai, palun.",
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
        speaker: "them",
        audio: "scene-cafe-3",
        say: "Siin või kaasa?",
        tokens: [w("Siin", msg`here`), " ", w("või", msg`or`), " ", w("kaasa", msg`to go`), "?"],
        translation: msg`For here or to go?`,
      },
      {
        speaker: "you",
        audio: "scene-cafe-4",
        say: "Kaasa, palun.",
        tokens: [w("Kaasa", msg`to go`), ", ", w("palun", msg`please`), "."],
        translation: msg`To go, please.`,
      },
      {
        speaker: "them",
        audio: "scene-cafe-5",
        say: "Kaardiga või sularahas?",
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
        audio: "scene-cafe-6",
        say: "Kaardiga. Aitäh!",
        tokens: [w("Kaardiga", msg`by card`), ". ", w("Aitäh", msg`thank you`), "!"],
        translation: msg`Card. Thanks!`,
      },
    ],
  },
  {
    id: "shop",
    title: msg`At the shop`,
    detail: msg`Paying at the checkout`,
    lines: [
      {
        speaker: "them",
        audio: "scene-shop-1",
        say: "Tere! Kas teil on kliendikaart?",
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
        audio: "scene-shop-2",
        say: "Ei ole.",
        tokens: [w("Ei", msg`no; not`), " ", w("ole", msg`have; am`), "."],
        translation: msg`No, I don’t.`,
      },
      {
        speaker: "them",
        audio: "scene-shop-3",
        say: "Kas kotti on vaja?",
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
        audio: "scene-shop-4",
        say: "Jah, üks, palun.",
        tokens: [w("Jah", msg`yes`), ", ", w("üks", msg`one`), ", ", w("palun", msg`please`), "."],
        translation: msg`Yes, one, please.`,
      },
      {
        speaker: "them",
        audio: "scene-shop-5",
        say: "Kaks eurot ja kümme senti.",
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
        audio: "scene-shop-6",
        say: "Aitäh, head päeva!",
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
