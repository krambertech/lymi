import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import {
  type Clip,
  clipId,
  clipUrl,
  KOHVIKUS_FIXES,
  KOHVIKUS_HAVE,
  KOHVIKUS_HEARD,
  KOHVIKUS_MENU,
  KOHVIKUS_MESSAGE,
  KOHVIKUS_ORDERING,
  KOHVIKUS_PASSAGES,
  KOHVIKUS_SORTED,
  KOHVIKUS_TALK,
  KOHVIKUS_TRANSLATED,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { ListenRows } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import type { Glossary } from "../lesson-context";
import { LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Sort, type SortBin, type SortItem } from "../Sort";
import { Word } from "../Word";
import { Writing } from "../Writing";

const SLUG = "kohvikus";

type Thing = (typeof KOHVIKUS_MENU)[number];

const src = (text: string) => clipUrl(SLUG, clipId(text));

const said = (clip: Clip) => (typeof clip === "string" ? clip : "text" in clip ? clip.text : "");
const ordering = (id: keyof typeof KOHVIKUS_ORDERING) => said(KOHVIKUS_ORDERING[id]);

const THINGS: Record<Thing, MessageDescriptor> = {
  kohv: msg`coffee`,
  tee: msg`tea`,
  vesi: msg`water`,
  mahl: msg`juice`,
  piim: msg`milk`,
  suhkur: msg`sugar`,
  kook: msg`cake`,
  saiake: msg`bun`,
  võileib: msg`sandwich`,
  supp: msg`soup`,
  arve: msg`bill`,
};

const PHRASES: readonly { say: string; means: MessageDescriptor }[] = [
  { say: "Palun üks kohv.", means: msg`A coffee, please.` },
  { say: "Palun üks tee ja üks saiake.", means: msg`A tea and a bun, please.` },
  { say: "Kas teil on piima?", means: msg`Do you have milk?` },
  { say: "Siin või kaasa?", means: msg`Here or to take away?` },
  { say: "Kaardiga või sularahas?", means: msg`By card or in cash?` },
  { say: "Palun arve.", means: msg`The bill, please.` },
  { say: "Kui palju see maksab?", means: msg`How much is it?` },
  { say: "Aitäh!", means: msg`Thank you!` },
  { say: "Palun!", means: msg`Here you are! You’re welcome!` },
];

const HAVE_MEANS: Record<(typeof KOHVIKUS_HAVE)[number], MessageDescriptor> = {
  "Kas teil on piima?": msg`Do you have milk?`,
  "Kas teil on suppi?": msg`Do you have soup?`,
  "Kas teil on kooki?": msg`Do you have cake?`,
  "Kas teil on mahla?": msg`Do you have juice?`,
  "Kas teil on vett?": msg`Do you have water?`,
  "Kas teil on teed?": msg`Do you have tea?`,
};

const TRANSLATED_MEANS: readonly MessageDescriptor[] = [
  msg`A coffee, please.`,
  msg`A tea and a bun, please.`,
  msg`Here or to take away?`,
  msg`Do you have soup?`,
  msg`Do you have juice?`,
  msg`Card or cash?`,
  msg`The bill, please.`,
  msg`How much is it?`,
];

const GLOSSARY: Glossary = {
  palun: {
    en: msg`please; here you are; you’re welcome`,
    note: msg`You ask with it, you hand something over with it, and you answer Aitäh with it.`,
    show: "Palun",
  },
  aitäh: { en: msg`thank you`, show: "Aitäh" },
  kohv: { en: msg`coffee` },
  tee: { en: msg`tea` },
  vesi: { en: msg`water` },
  mahl: { en: msg`juice` },
  piim: { en: msg`milk` },
  suhkur: { en: msg`sugar` },
  kook: { en: msg`cake` },
  saiake: { en: msg`bun; a small roll` },
  võileib: { en: msg`sandwich` },
  supp: { en: msg`soup` },
  arve: { en: msg`bill`, note: msg`The paper you pay from.` },
  teil: {
    en: msg`you have`,
    note: msg`Kas teil on …? is polite, to a stranger. To a friend, Kas sul on …?`,
  },
  on: { en: msg`is; has` },
  ka: { en: msg`also; too` },
  ja: { en: msg`and` },
  või: { en: msg`or` },
  siin: { en: msg`here` },
  kaasa: { en: msg`to take away; along`, note: msg`Siin või kaasa? Here or to take away?` },
  kaardiga: { en: msg`by card`, note: msg`Kaart, card, with -ga: with the card.` },
  sularahas: { en: msg`in cash`, note: msg`Sularaha, cash, with -s: in cash.` },
  maksab: { en: msg`costs`, note: msg`From maksma, to cost; also to pay.` },
  see: { en: msg`this; it` },
  meil: { en: msg`we have; at our place`, note: msg`Meil on kook: we have cake.` },
  siis: { en: msg`then; in that case` },
  piima: {
    en: msg`milk`,
    note: msg`After Kas teil on the word usually takes an ending: piim becomes piima.`,
  },
  suppi: {
    en: msg`soup`,
    note: msg`After Kas teil on the word usually takes an ending: supp becomes suppi.`,
  },
  kooki: {
    en: msg`cake`,
    note: msg`After Kas teil on the word usually takes an ending: kook becomes kooki.`,
  },
  mahla: {
    en: msg`juice`,
    note: msg`After Kas teil on the word usually takes an ending: mahl becomes mahla.`,
  },
  vett: {
    en: msg`water`,
    note: msg`After Kas teil on the word usually takes an ending: vesi becomes vett.`,
  },
  teed: {
    en: msg`tea`,
    note: msg`After Kas teil on the word usually takes an ending: tee becomes teed.`,
  },
  kohvi: { en: msg`coffee`, note: msg`Joob kohvi: drinks coffee. Learn it as a phrase for now.` },
  laual: { en: msg`on the table` },
  kohvikus: { en: msg`in a café` },
  "kas teil on piima?": { en: msg`Do you have milk?`, show: "Kas teil on piima?" },
  "siin või kaasa?": { en: msg`Here or to take away?`, show: "Siin või kaasa?" },
  "kaardiga või sularahas?": { en: msg`By card or in cash?`, show: "Kaardiga või sularahas?" },
  "palun arve": { en: msg`The bill, please`, show: "Palun arve" },
  "kui palju see maksab?": { en: msg`How much is it?`, show: "Kui palju see maksab?" },
  "head isu": {
    en: msg`Enjoy your meal`,
    note: msg`Word for word: “good appetite”.`,
    show: "Head isu!",
  },
  "suhkur on laual": { en: msg`The sugar is on the table`, show: "Suhkur on laual" },
};

const noun = (word: Thing) => THINGS[word];

const option = (i18n: I18n, word: Thing) => ({
  id: word,
  label: <span lang="et">{word}</span>,
  sub: i18n._(noun(word)),
});

function useContent() {
  const { t, i18n } = useLingui();

  const turns: DialogueTurn[] = [
    { who: "them", clip: "o-liis-1", line: ordering("o-liis-1") },
    {
      who: "you",
      clip: "o-sina-1",
      replies: [
        {
          line: "Tere! Siin või kaasa?",
          why: (
            <Trans>
              <b lang="et">Siin või kaasa?</b> is the question the café asks you.
            </Trans>
          ),
        },
        { line: ordering("o-sina-1"), right: true },
        {
          line: "Tere! Kaardiga või sularahas?",
          why: (
            <Trans>
              <b lang="et">Kaardiga või sularahas?</b> is the café’s question, and it comes later.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "o-liis-2", line: ordering("o-liis-2") },
    {
      who: "you",
      clip: "o-sina-2",
      replies: [
        {
          line: "Kaardiga, aitäh.",
          why: (
            <Trans>
              <b lang="et">Kaardiga</b> is how you pay. She asked where you’ll have it.
            </Trans>
          ),
        },
        { line: ordering("o-sina-2"), right: true },
        {
          line: "Jah, aitäh.",
          why: (
            <Trans>
              <b lang="et">Siin või kaasa?</b> gives two choices, so <b lang="et">jah</b> doesn’t
              answer it.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "o-liis-3", line: ordering("o-liis-3") },
    {
      who: "you",
      clip: "o-sina-3",
      replies: [
        {
          line: "Kaardiga või sularahas?",
          why: <Trans>That’s the café’s question. You want milk first.</Trans>,
        },
        {
          line: "Siin, palun.",
          why: (
            <Trans>
              You already said <b lang="et">siin</b>. Ask for the milk.
            </Trans>
          ),
        },
        { line: ordering("o-sina-3"), right: true },
      ],
    },
    { who: "them", clip: "o-liis-4", line: ordering("o-liis-4") },
    {
      who: "you",
      clip: "o-sina-4",
      replies: [
        { line: ordering("o-sina-4"), right: true },
        {
          line: "Aitäh, siin.",
          why: (
            <Trans>
              <b lang="et">Siin</b> answers here or to take away. She asked how you’ll pay.
            </Trans>
          ),
        },
        {
          line: "Jah, sularahas.",
          why: (
            <Trans>
              The question gives two choices, so just say one: <b lang="et">sularahas</b>.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "o-liis-5", line: ordering("o-liis-5") },
    {
      who: "you",
      clip: "o-sina-5",
      replies: [
        {
          line: "Palun! Tere!",
          why: (
            <Trans>
              <b lang="et">Tere</b> is hello, and you’re leaving. Say goodbye.
            </Trans>
          ),
        },
        {
          line: "Palun! Head aega!",
          why: (
            <Trans>
              <b lang="et">Palun</b> is what she says when she hands you things. You thank her.
            </Trans>
          ),
        },
        { line: ordering("o-sina-5"), right: true },
      ],
    },
  ];

  const reading: PassageQuestion[] = [
    {
      id: "where-works",
      ask: t`Where does Mari work?`,
      options: [
        { id: "cafe", label: t`Café in Tallinn` },
        { id: "school", label: t`School in Tartu` },
        { id: "office", label: t`Office in Pärnu` },
      ],
      answer: "cafe",
      line: 1,
    },
    {
      id: "soup",
      kind: "truefalse",
      ask: t`The café has soup.`,
      answer: true,
      line: 4,
    },
    {
      id: "sugar",
      ask: t`Where is the sugar?`,
      options: [
        { id: "counter", label: t`Behind a counter` },
        { id: "cake", label: t`Next to cups` },
        { id: "table", label: t`On the table` },
      ],
      answer: "table",
      line: 5,
    },
    {
      id: "jaan",
      ask: t`What does Jaan drink at the café?`,
      options: [
        { id: "tea", label: t`A lot of tea` },
        { id: "coffee", label: t`A lot of coffee` },
        { id: "juice", label: t`A lot of juice` },
      ],
      answer: "coffee",
      line: 8,
    },
    {
      id: "mari-drinks",
      kind: "truefalse",
      ask: t`Mari drinks coffee.`,
      answer: false,
      line: 9,
    },
    {
      id: "card-only",
      kind: "truefalse",
      ask: t`You can pay only by card.`,
      answer: false,
      line: 11,
    },
  ];

  const listening: PassageQuestion[] = [
    {
      id: "first-order",
      ask: t`What does he ask for first?`,
      options: [
        { id: "coffee-bun", label: t`A coffee and a bun` },
        { id: "tea-cake", label: t`A tea and a cake` },
        { id: "water-sandwich", label: t`A water and a sandwich` },
      ],
      answer: "coffee-bun",
      line: 3,
    },
    {
      id: "here",
      ask: t`Where will he have it?`,
      options: [
        { id: "away", label: t`He takes it away` },
        { id: "here", label: t`In the café` },
        { id: "unsaid", label: t`He doesn’t say` },
      ],
      answer: "here",
      line: 5,
    },
    {
      id: "sugar",
      kind: "truefalse",
      ask: t`Liis says where the sugar is.`,
      answer: true,
      line: 7,
    },
    {
      id: "no-soup",
      kind: "truefalse",
      ask: t`The café has soup today.`,
      answer: false,
      line: 15,
    },
    {
      id: "cake-good",
      kind: "truefalse",
      ask: t`Liis says the cake is good.`,
      answer: true,
      line: 18,
    },
    {
      id: "second-order",
      ask: t`What does he order after that?`,
      options: [
        { id: "bun-tea", label: t`A bun and a tea` },
        { id: "soup-tea", label: t`Soup and tea` },
        { id: "cake-juice", label: t`A cake and a juice` },
      ],
      answer: "cake-juice",
      line: 19,
    },
    {
      id: "pay",
      ask: t`How does he pay?`,
      options: [
        { id: "cash", label: t`In cash` },
        { id: "later", label: t`He asks to pay later` },
        { id: "card", label: t`By card` },
      ],
      answer: "card",
      line: 23,
    },
  ];

  const sortBins: SortBin[] = [
    {
      id: "order",
      label: t`Ordering`,
      lang: i18n.locale,
      hint: t`asking for things`,
      rule: (
        <Trans>
          You usually ask for things with <b lang="et">palun</b> or <b lang="et">Kas teil on …?</b>,
          and the café asks <b lang="et">Siin või kaasa?</b>
        </Trans>
      ),
    },
    {
      id: "pay",
      label: t`Paying`,
      lang: i18n.locale,
      hint: t`the bill and the price`,
      rule: (
        <Trans>
          You usually pay with <b lang="et">kaardiga</b> or <b lang="et">sularahas</b>, ask{" "}
          <b lang="et">Palun arve</b> for the bill and <b lang="et">Kui palju?</b> for the price.
        </Trans>
      ),
    },
  ];
  const sortItems: SortItem[] = KOHVIKUS_SORTED.map(({ w, bin }) => ({ w, bin, src: src(w) }));

  return { turns, reading, listening, sortBins, sortItems };
}

const FIRST_OPTIONS: Record<(typeof KOHVIKUS_HEARD)[number]["item"], readonly Thing[]> = {
  mahl: ["kook", "mahl", "piim"],
  piim: ["piim", "vesi", "tee"],
  supp: ["kohv", "saiake", "supp"],
  kook: ["võileib", "kook", "suhkur"],
  vesi: ["mahl", "supp", "vesi"],
  võileib: ["tee", "võileib", "kook"],
};

type HeardItem = ChoiceItem & { id: string; answer: Thing; pair: readonly [string, string] };

export function KohvikusLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();

  const threeThings = (answer: Thing): Thing[] =>
    shuffle([answer, ...shuffle(KOHVIKUS_MENU.filter((each) => each !== answer)).slice(0, 2)]);

  const heardRun = (items: readonly HeardItem[], pinned?: HeardItem): HeardItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned
        ? item
        : { ...item, options: threeThings(item.answer).map((word) => option(i18n, word)) },
    );

  const heardItems = useMemo<HeardItem[]>(
    () =>
      KOHVIKUS_HEARD.map(({ item, said: line }) => ({
        id: item,
        src: src(line),
        answer: item,
        pair: [item, line] as const,
        options: FIRST_OPTIONS[item].map((word) => option(i18n, word)),
        explain: (
          <>
            <span lang="et" className="font-medium text-ink">
              {line}
            </span>{" "}
            {i18n._(noun(item))}
          </>
        ),
      })),
    [i18n],
  );

  const pairs = useMemo<MatchPair[]>(
    () =>
      (["kohv", "tee", "vesi", "mahl", "piim", "suhkur", "kook", "supp"] as const).map((word) => ({
        id: word,
        left: word,
        right: i18n._(noun(word)),
        src: src(word),
      })),
    [i18n],
  );

  const translatedItems = useMemo<(SentenceItem & { pair: readonly [string, string] })[]>(
    () =>
      KOHVIKUS_TRANSLATED.map((each, i) => ({
        kind: "translate" as const,
        id: `translate-${clipId(each.answers[0])}`,
        prompt: i18n._(TRANSLATED_MEANS[i] as MessageDescriptor),
        src: src(each.answers[0]),
        answers: each.answers,
        pair: [each.kind, each.answers[0]] as const,
      })),
    [i18n],
  );

  const fixItems = useMemo<(FixItem & { pair: readonly [string, string] })[]>(
    () =>
      KOHVIKUS_FIXES.map(({ wrong, said: right, kind }) => ({
        kind: "fix" as const,
        id: `fix-${clipId(wrong)}`,
        wrong,
        answers: [right],
        src: src(right),
        pair: [kind, wrong] as const,
        explain:
          kind === "order" ? (
            <Trans>
              You usually ask with <b lang="et">palun</b>, and the café asks{" "}
              <b lang="et">Siin või kaasa?</b>
            </Trans>
          ) : kind === "have" ? (
            <Trans>
              A question to the café is usually <b lang="et">Kas teil on …?</b>, with{" "}
              <b lang="et">teil</b>.
            </Trans>
          ) : (
            <Trans>
              You usually pay by card with <b lang="et">kaardiga</b>, and ask the price with{" "}
              <b lang="et">Kui palju see maksab?</b>
            </Trans>
          ),
      })),
    [],
  );

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Order a drink and something to eat in Estonian, answer the two questions every café asks,
          and pay.
        </Trans>
      }
      facts={[
        <Trans key="m">20 minutes</Trans>,
        <Trans key="p">Situation: at the counter</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "palun",
        "aitäh",
        "kohv",
        "tee",
        "vesi",
        "mahl",
        "piim",
        "suhkur",
        "kook",
        "saiake",
        "võileib",
        "supp",
        "arve",
        "kas teil on piima?",
        "siin või kaasa?",
        "kaardiga või sularahas?",
        "kui palju see maksab?",
        "head isu",
      ]}
      recap={[
        <Trans key="1">
          You usually ask with <b lang="et">palun</b> and the thing:{" "}
          <b lang="et">Palun üks kohv. Palun üks tee ja üks saiake.</b> Thank with{" "}
          <b lang="et">Aitäh!</b>, and answer it with <b lang="et">Palun!</b>
        </Trans>,
        <Trans key="2">
          Ask if they have something with <b lang="et">Kas teil on …?</b> The thing usually takes an
          ending after <b lang="et">on</b>: <b lang="et">Kas teil on piima? Kas teil on suppi?</b>
        </Trans>,
        <Trans key="3">
          A café usually asks two questions, and you answer with one of the choices:{" "}
          <b lang="et">Siin või kaasa? Siin, palun.</b>{" "}
          <b lang="et">Kaardiga või sularahas? Kaardiga, palun.</b>
        </Trans>,
        <Trans key="4">
          You usually ask for the bill with <b lang="et">Palun arve.</b> and the price with{" "}
          <b lang="et">Kui palju see maksab?</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "phrases",
          title: t`The phrases at the counter`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A café uses the same few phrases whatever you order. You ask with{" "}
                    <Word w="Palun" />, please, and thank with <Word w="Aitäh" />. The person at the
                    counter usually answers <Word w="Palun" /> when they hand you something.
                  </Trans>
                </p>
              </Prose>
              <ListenRows
                items={PHRASES.map(({ say, means }) => ({
                  main: <span lang="et">{say}</span>,
                  sub: i18n._(means),
                  src: src(say),
                }))}
              />
              <Prose>
                <p>
                  <Trans>
                    To ask if they have something, start with <Word w="Kas teil on piima?" />. The
                    thing you ask for usually takes an ending after <Word w="on" />, as milk does
                    here: <b lang="et">piim</b> becomes <b lang="et">piima</b>. A later lesson
                    explains that ending. For now, learn each question as it is.
                  </Trans>
                </p>
              </Prose>
              <ListenRows
                items={KOHVIKUS_HAVE.map((say) => ({
                  main: <span lang="et">{say}</span>,
                  sub: i18n._(HAVE_MEANS[say]),
                  src: src(say),
                }))}
              />
            </>
          ),
        },
        {
          id: "counter",
          title: t`What’s on the counter`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    These are the words you’ll see on a menu and hear at a counter. Tap a word to
                    hear it. Then match eight of them with what they mean.
                  </Trans>
                </p>
              </Prose>
              <ListenRows
                items={KOHVIKUS_MENU.map((word) => ({
                  main: <span lang="et">{word}</span>,
                  sub: i18n._(noun(word)),
                  src: src(word),
                }))}
              />
              <Match id="match-menu" title={<Trans>Match the words</Trans>} pairs={pairs} />
            </>
          ),
        },
        {
          id: "ordering",
          title: t`Ordering at the counter`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Liis works at the café. Pick each of your replies; a wrong one says why.
                    Everything you need is in the phrases above.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="order-at-the-counter"
                title={t`Talk: at the counter`}
                part={t`You are Andres. You want a tea and a bun and some milk, and you’ll pay by card.`}
                them={t`Liis`}
                turns={content.turns}
              />
            </>
          ),
        },
        {
          id: "heard",
          title: t`What did they ask for?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence asks for one thing. Listen and pick the word you hear.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-thing"
                title={<Trans>Which thing?</Trans>}
                items={heardItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six. You heard every word.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the words above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.answer, src: src(item.answer) })}
                order={heardRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "which",
          title: t`Ordering or paying?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Some phrases ask for things and some are about the bill. Put each phrase under
                    what it is for.
                  </Trans>
                </p>
              </Prose>
              <Sort
                id="sort-phrases"
                title={<Trans>Ordering or paying?</Trans>}
                bins={content.sortBins}
                items={content.sortItems}
              />
            </>
          ),
        },
        {
          id: "translate",
          title: t`Write it in Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each line is something you’d say at the counter. Write it in Estonian. Several
                    answers are right, so write what you would say.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="translate-counter"
                title={<Trans>Write it in Estonian</Trans>}
                items={translatedItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, every phrase right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the words you missed in the phrases above.</Trans>
                  ) : (
                    <Trans>Go through Ordering at the counter once more, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                order={eachPairFirst}
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
                  <Trans>In each sentence one word is wrong. Tap it, then type it right.</Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-counter"
                title={<Trans>Fix the sentence</Trans>}
                items={fixItems}
                rounds={5}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All five, each found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Read the sentence out loud and listen for the odd word.</Trans>
                  ) : (
                    <Trans>Look at the phrases at the top once more, then try again.</Trans>
                  )
                }
                recall={fixRecall}
                order={eachPairFirst}
                round={(props) => <FixRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "reading",
          title: t`A note from Mari`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari works at a café and writes to her friend Liis about it. Read the note and
                    answer the questions. Once you’ve answered, tap a word to see what it means.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="mari-note"
                title={<Trans>What does Mari write?</Trans>}
                by={t`Mari writes`}
                clip="p-mari"
                sentences={KOHVIKUS_PASSAGES.mari}
                questions={content.reading}
              />
            </>
          ),
        },
        {
          id: "listening",
          title: t`Listening: at the café`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Andres orders at the counter and Liis serves him. Listen for what he asks for,
                    what the café doesn’t have, and how he pays.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="andres-at-the-cafe"
                title={<Trans>Listen: Andres at the café</Trans>}
                clip="d-kohvik"
                turns={KOHVIKUS_TALK.turns}
                names={{ second: t`Liis`, main: t`Andres` }}
                questions={content.listening}
              />
            </>
          ),
        },
        {
          id: "write",
          title: t`Write your order`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write what you’d say at the counter, then compare it with a model and tick what
                    yours does. Nothing is marked for you here.
                  </Trans>
                </p>
              </Prose>
              <Writing
                id="write-order"
                title={<Trans>Write your order</Trans>}
                prompt={
                  <Trans>
                    Three to five short lines: say hello, order something with{" "}
                    <span lang="et">palun</span>, answer here or to take away, say how you pay and
                    say thank you.
                  </Trans>
                }
                model={KOHVIKUS_MESSAGE}
                src={clipUrl(SLUG, "p-order")}
                checks={[
                  { id: "hello", label: <Trans>Says hello.</Trans> },
                  {
                    id: "order",
                    label: (
                      <Trans>
                        Orders something with <span lang="et">palun</span>.
                      </Trans>
                    ),
                  },
                  { id: "here", label: <Trans>Says here or to take away.</Trans> },
                  { id: "pay", label: <Trans>Says how you pay.</Trans> },
                  {
                    id: "thanks",
                    label: (
                      <Trans>
                        Says <span lang="et">aitäh</span>.
                      </Trans>
                    ),
                  },
                ]}
              />
            </>
          ),
        },
      ]}
    />
  );
}
