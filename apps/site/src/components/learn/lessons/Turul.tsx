import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  MARKET_DIALOGUE,
  MARKET_FIX,
  MARKET_LEADS,
  MARKET_PASSAGES,
  MARKET_SAY,
  MARKET_TALK,
} from "../../../lib/learn/clips";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { LessonView, Prose } from "../LessonView";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Sort, type SortBin, type SortItem } from "../Sort";
import { Word } from "../Word";

const SLUG = "turul";
const src = (text: string) => clipUrl(SLUG, clipId(text));

function End({ children }: { children: ReactNode }) {
  return (
    <span lang="et" className="whitespace-nowrap">
      -{children}
    </span>
  );
}

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const GLOSSARY: Glossary = {
  turg: { en: msg`market`, note: msg`Turul is at the market, turule to it, turult from it.` },
  turule: { en: msg`to the market` },
  turul: { en: msg`at the market` },
  turult: { en: msg`from the market` },
  turu: { en: msg`of the market`, note: msg`The genitive of turg.` },
  "turu õunad": { en: msg`apples from the market` },
  õunad: { en: msg`apples` },
  "kilo juustu": { en: msg`a kilo of cheese`, note: msg`After an amount, the partitive.` },
  maksab: { en: msg`costs` },
  "mida te soovite?": {
    en: msg`What would you like?`,
    show: "Mida te soovite?",
    note: msg`What a seller asks. Soovima is to wish, to want.`,
  },
  "midagi veel?": { en: msg`Anything else?`, show: "Midagi veel?" },
  "mul on vaja": { en: msg`I need` },
  kahju: { en: msg`a pity, too bad` },
  väike: { en: msg`small` },
  kohvik: { en: msg`café` },
};

function useReplyGaps(): GapItem[] {
  const [hi, yes, at, coffee, apples, eat, home] = MARKET_PASSAGES.liis;
  const cut = (sentence: string, word: string) => {
    const at = sentence.indexOf(word);
    return { before: sentence.slice(0, at).trim(), after: sentence.slice(at + word.length).trim() };
  };
  return [
    {
      id: "tulla",
      ...cut(`${hi} ${yes}`, "tulla"),
      answer: "tulla",
      why: (
        <Trans>
          After <Et>tahan</Et>, the <End>da</End> infinitive: <Et>tulla</Et>.
        </Trans>
      ),
    },
    {
      id: "turul",
      ...cut(at, "turul"),
      answer: "turul",
      why: (
        <Trans>
          Liis says where she will be, so <End>l</End>: <Et>turul</Et>. <Et>Turule</Et> would be
          where she goes.
        </Trans>
      ),
    },
    {
      id: "kohvi",
      ...cut(coffee, "kohvi"),
      answer: "kohvi",
      why: (
        <Trans>
          After an amount, the partitive: <Et>kilo kohvi</Et>.
        </Trans>
      ),
    },
    {
      id: "meeldivad",
      ...cut(apples, "meeldivad"),
      answer: "meeldivad",
      why: (
        <Trans>
          More than one apple, so <Et>meeldivad</Et>.
        </Trans>
      ),
    },
    {
      id: "saame",
      ...cut(eat, "saame"),
      answer: "saame",
      why: (
        <Trans>
          With <Et>me</Et>, we, the verb ends in <End>me</End>: <Et>me saame</Et>.
        </Trans>
      ),
    },
    {
      id: "minema",
      ...cut(home, "minema"),
      answer: "minema",
      why: (
        <Trans>
          After <Et>pean</Et>, the <End>ma</End> infinitive: <Et>minema</Et>.
        </Trans>
      ),
    },
  ];
}

const SAY_PROMPTS: Record<(typeof MARKET_SAY)[number]["id"], MessageDescriptor> = {
  juustu: msg`I need a kilo of cheese.`,
  maksab: msg`How much does it cost?`,
  ounad: msg`I like apples.`,
  turule: msg`I want to go to the market.`,
  kodus: msg`I have to be at home at twelve.`,
  leib: msg`Bread costs two euros.`,
};

const SAY_ALSO: Record<(typeof MARKET_SAY)[number]["id"], readonly string[]> = {
  juustu: ["Mul on kilo juustu vaja."],
  maksab: ["Mis see maksab?"],
  ounad: [],
  turule: ["Ma tahan minna turule.", "Mina tahan turule minna.", "Tahan turule minna."],
  kodus: [
    "Kell kaksteist pean ma kodus olema.",
    "Ma pean kodus olema kell kaksteist.",
    "Mina pean kell kaksteist kodus olema.",
  ],
  leib: [],
};

export function sayItems(i18n: I18n): SentenceItem[] {
  return MARKET_SAY.map(({ id, said }) => ({
    kind: "translate",
    id: `say-${id}`,
    prompt: i18n._(SAY_PROMPTS[id]),
    src: src(said),
    answers: [said, ...SAY_ALSO[id]],
  }));
}

const FIX_WHY: Record<(typeof MARKET_FIX)[number]["id"], ReactNode> = {
  juust: (
    <Trans>
      After <Et>kilo</Et>, the partitive: <Et>kilo juustu</Et>.
    </Trans>
  ),
  minna: (
    <Trans>
      After <Et>pean</Et>, the <End>ma</End> infinitive: <Et>minema</Et>.
    </Trans>
  ),
  jooma: (
    <Trans>
      After <Et>tahan</Et>, the <End>da</End> infinitive: <Et>juua</Et>.
    </Trans>
  ),
  meeldib: (
    <Trans>
      More than one apple, so <Et>meeldivad</Et>.
    </Trans>
  ),
  euro: (
    <Trans>
      After a number from two up, the partitive: <Et>kaks eurot</Et>.
    </Trans>
  ),
  turul: (
    <Trans>
      Going there takes <Et>turule</Et>; <Et>turul</Et> is being there.
    </Trans>
  ),
};

export function fixItems(): FixItem[] {
  return MARKET_FIX.map(({ id, wrong, right }) => ({
    kind: "fix",
    id: `fix-${id}`,
    wrong,
    answers: [right],
    src: src(right),
    explain: FIX_WHY[id],
  }));
}

function useContent() {
  const { t } = useLingui();
  return useMemo(() => {
    const message: PassageQuestion[] = [
      {
        id: "when",
        ask: t`When is Mari going to the market?`,
        options: [
          { id: "ten", label: t`At ten` },
          { id: "twelve", label: t`At twelve` },
          { id: "eight", label: t`At eight` },
        ],
        answer: "ten",
        line: 1,
      },
      {
        kind: "short",
        id: "cheese-price",
        ask: t`How much is a kilo of cheese in the shop? Write it in Estonian.`,
        answers: ["kümme eurot", "kümme", "10 eurot", "10", "10 €", "€10"],
        line: 3,
      },
      {
        kind: "truefalse",
        id: "likes-shop",
        ask: t`Mari likes the shop more than the market.`,
        answer: false,
        line: 6,
      },
      {
        kind: "truefalse",
        id: "jaan-work",
        ask: t`Jaan is at work today.`,
        answer: true,
        line: 9,
      },
      {
        id: "coffee",
        ask: t`Where does Mari want to have coffee?`,
        options: [
          { id: "home", label: t`At home` },
          { id: "cafe", label: t`At the café at the market` },
          { id: "shop", label: t`At the shop` },
        ],
        answer: "cafe",
        line: 10,
      },
    ];

    const stall: PassageQuestion[] = [
      {
        id: "first",
        ask: t`What does Mari ask for first?`,
        options: [
          { id: "apples", label: t`Two kilos of apples` },
          { id: "cheese", label: t`A kilo of cheese` },
          { id: "bread", label: t`Bread` },
        ],
        answer: "cheese",
        line: 1,
      },
      {
        kind: "short",
        id: "kilo-price",
        ask: t`How much is a kilo of cheese? Write it in Estonian.`,
        answers: ["kaheksa eurot", "kaheksa", "8 eurot", "8", "8 €", "€8"],
        line: 3,
      },
      {
        id: "from",
        ask: t`Where is the cheese from?`,
        options: [
          { id: "tallinn", label: t`From Tallinn` },
          { id: "shop", label: t`From the shop` },
          { id: "tartu", label: t`From Tartu` },
        ],
        answer: "tartu",
        line: 6,
      },
      {
        kind: "truefalse",
        id: "bread",
        ask: t`The seller has bread today.`,
        answer: true,
        line: 12,
      },
      {
        kind: "truefalse",
        id: "milk",
        ask: t`The seller has milk today.`,
        answer: false,
        line: 12,
      },
      {
        id: "milk-where",
        ask: t`Where will Mari get milk?`,
        options: [
          { id: "cafe", label: t`At a café` },
          { id: "shop", label: t`At the shop` },
          { id: "home", label: t`At home` },
        ],
        answer: "shop",
        line: 15,
      },
      {
        kind: "truefalse",
        id: "coffee-buy",
        ask: t`Mari buys coffee today.`,
        answer: false,
        line: 18,
      },
      {
        kind: "short",
        id: "total",
        ask: t`How much does Mari pay in all? Write it in Estonian.`,
        answers: ["kümme eurot", "kümme", "10 eurot", "10", "10 €", "€10"],
        line: 19,
      },
    ];

    const line = (clip: keyof typeof MARKET_DIALOGUE) => {
      const said = MARKET_DIALOGUE[clip];
      return typeof said === "string" ? said : said.text;
    };
    const talk: DialogueTurn[] = [
      { who: "them", clip: "d-muuja-1", line: line("d-muuja-1") },
      {
        who: "you",
        clip: "d-sina-1",
        replies: [
          {
            line: "Tere! Mul on vaja kilo juust.",
            why: (
              <Trans>
                After <Et>kilo</Et>, the partitive: <Et>kilo juustu</Et>.
              </Trans>
            ),
          },
          { line: line("d-sina-1"), right: true },
          {
            line: "Tere! Mulle meeldib juust.",
            why: <Trans>That says you like cheese. She asked what you’d like to buy.</Trans>,
          },
        ],
      },
      { who: "them", clip: "d-muuja-2", line: line("d-muuja-2") },
      {
        who: "you",
        clip: "d-sina-2",
        replies: [
          {
            line: "Jah, mul on vaja ka kaks leib.",
            why: (
              <Trans>
                After <Et>kaks</Et>, the partitive: <Et>kaks leiba</Et>. And you need only one loaf.
              </Trans>
            ),
          },
          {
            line: "Jah, ma tahan ka leib.",
            why: (
              <Trans>
                After <Et>tahan</Et>, the thing you want takes the partitive:{" "}
                <Et>ma tahan leiba</Et>.
              </Trans>
            ),
          },
          { line: line("d-sina-2"), right: true },
        ],
      },
      { who: "them", clip: "d-muuja-3", line: line("d-muuja-3") },
      {
        who: "you",
        clip: "d-sina-3",
        replies: [
          { line: line("d-sina-3"), right: true },
          {
            line: "Palun, kaheksa eurot.",
            why: <Trans>Cheese and bread together are ten euros, not eight.</Trans>,
          },
          {
            line: "Palun, see on kümme euro.",
            why: (
              <Trans>
                After a number from two up, the partitive: <Et>kümme eurot</Et>.
              </Trans>
            ),
          },
        ],
      },
    ];

    return { message, stall, talk };
  }, [t]);
}

export function TurulLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const gaps = useReplyGaps();
  const verbs = lessonBySlug("tegevusnimed")?.n;
  const amounts = lessonBySlug("osastav")?.n;
  const liking = lessonBySlug("meeldima")?.n;

  const bins: SortBin[] = [
    {
      id: "da",
      label: "-da",
      hint: (
        <Trans>
          infinitive, as in <Et>tahan juua</Et>
        </Trans>
      ),
      rule: (
        <Trans>
          Wanting, being able, being allowed, needing and liking take the <End>da</End> infinitive:{" "}
          <Et>tahan juua</Et>.
        </Trans>
      ),
    },
    {
      id: "ma",
      label: "-ma",
      hint: (
        <Trans>
          infinitive, as in <Et>pean jooma</Et>
        </Trans>
      ),
      rule: (
        <Trans>
          Having to, going and starting take the <End>ma</End> infinitive: <Et>pean jooma</Et>.
        </Trans>
      ),
    },
  ];
  const leads: SortItem[] = MARKET_LEADS.map(({ w, bin }) => ({ w, bin, src: src(w) }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Read a friend’s message and answer it, buy cheese and bread at a stall, and follow a
          conversation at the market: amounts, prices, <Et>meeldib</Et> and <Et>meeldivad</Et>, and
          the <End>da</End> and <End>ma</End> infinitive after <Et>tahan</Et> and <Et>pean</Et>, and{" "}
          <Et>turule</Et>, <Et>turul</Et> and <Et>turult</Et>.
        </Trans>
      }
      facts={[
        <Trans key="m">15 minutes</Trans>,
        <Trans key="q">6 exercises and a conversation you can play twice</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "turg",
        "turule",
        "turul",
        "turult",
        "turu õunad",
        "kilo juustu",
        "maksab",
        "mul on vaja",
        "mida te soovite?",
        "midagi veel?",
        "kahju",
      ]}
      recap={[
        <Trans key="1">
          After an amount or a number from two up, the partitive: <b lang="et">kilo juustu</b>,{" "}
          <b lang="et">kaks eurot</b>.
        </Trans>,
        <Trans key="2">
          Say a price with <b lang="et">maksab</b>: <b lang="et">Leib maksab kaks eurot.</b> Ask for
          one with <b lang="et">Kui palju see maksab?</b>
        </Trans>,
        <Trans key="3">
          <b lang="et">Tahan</b>, <b lang="et">saan</b> and <b lang="et">mul on vaja</b> take the{" "}
          <End>da</End> infinitive; <b lang="et">pean</b> and <b lang="et">lähen</b> take{" "}
          <End>ma</End>: <b lang="et">tahan juua, pean minema</b>.
        </Trans>,
        <Trans key="4">
          One thing <b lang="et">meeldib</b>, more than one <b lang="et">meeldivad</b>:{" "}
          <b lang="et">mulle meeldib turg, mulle meeldivad õunad</b>.
        </Trans>,
        <Trans key="5">
          <b lang="et">Turule</b> is where you go, <b lang="et">turul</b> where you are, and{" "}
          <b lang="et">turult</b> where you come from.
        </Trans>,
      ]}
      sections={[
        {
          id: "list",
          title: t`Mari’s message`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari is going to the <Word w="turg" />, the market, and asks Liis to come. Read
                    her message, then answer the questions. Once you check your answers, tap a word
                    in the message to open its card.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="mari-message"
                title={<Trans>Mari’s message to Liis</Trans>}
                by={t`Mari writes`}
                clip="p-mari"
                sentences={MARKET_PASSAGES.mari}
                questions={content.message}
              />
            </>
          ),
        },
        {
          id: "reply",
          title: t`Liis answers`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Drag a word from below Liis’s answer into each gap, or tap a word to put it in
                    the open gap. Some words are spare. The gaps test the infinitive after{" "}
                    <Et>tahan</Et> or <Et>pean</Et>, where someone is, an amount, the ending after{" "}
                    <Et>me</Et>, and <Et>meeldib</Et> or <Et>meeldivad</Et>.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="liis-answer"
                title={<Trans>Fill the gaps: Liis’s answer</Trans>}
                gaps={gaps}
                mode="drag"
                spare={["minna", "turule", "kohv", "meeldib", "tulema"]}
                clip="p-liis"
              />
            </>
          ),
        },
        {
          id: "which-verb",
          title: t`Which infinitive follows`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {verbs} split the verbs that go before another verb in two. Put each in
                    its group: does the next verb take the <End>da</End> infinitive or the{" "}
                    <End>ma</End> infinitive? Tap a word to hear it.
                  </Trans>
                </p>
              </Prose>
              <Sort
                id="which-infinitive"
                title={
                  <Trans>
                    Followed by <End>da</End> or <End>ma</End>?
                  </Trans>
                }
                bins={bins}
                items={leads}
              />
            </>
          ),
        },
        {
          id: "say-it",
          title: t`Write it in Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write what you’d say at the market. After an amount comes the partitive, as
                    lesson {amounts} showed, and liking more than one thing takes <Et>meeldivad</Et>
                    , as in lesson {liking}.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="say-market"
                title={<Trans>Write it in Estonian</Trans>}
                items={sayItems(i18n)}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six written right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Read the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Read Mari’s message once more, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "fix",
          title: t`Fix the sentence`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Each sentence has one wrong word. Tap it, then write it right.</Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-market"
                title={<Trans>Find and fix the mistake</Trans>}
                items={fixItems()}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Look again at the ones you missed.</Trans>
                  ) : (
                    <Trans>
                      Go back to Liis’s answer, read why each word fits, then try again.
                    </Trans>
                  )
                }
                recall={fixRecall}
                round={(props) => <FixRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "stall",
          title: t`At a stall`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The seller asks <Word w="Mida te soovite?" /> (What would you like?), then{" "}
                    <Word w="Midagi veel?" /> (Anything else?). If you pick a wrong reply, you see
                    why, then hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="at-the-stall"
                title={<Trans>Talk: buying cheese and bread</Trans>}
                part={
                  <Trans>
                    You need a kilo of cheese and a loaf of bread, and you have ten euros. The
                    seller speaks first; pick what you say back.
                  </Trans>
                }
                them={t({ message: "Seller", context: "the woman at the stall in the dialogue" })}
                turns={content.talk}
              />
            </>
          ),
        },
        {
          id: "listen",
          title: t`Listen: Mari at the market`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari buys cheese at a stall. Read the questions first. You can play the
                    recording twice, as in the A2 exam.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="mari-stall"
                title={<Trans>Listen: Mari at a cheese stall</Trans>}
                clip="c-stall"
                turns={MARKET_TALK.turns}
                names={{
                  third: "Mari",
                  fourth: t({
                    message: "Seller",
                    context: "the man at the stall in the recording",
                  }),
                }}
                questions={content.stall}
                plays={2}
              />
            </>
          ),
        },
      ]}
    />
  );
}
