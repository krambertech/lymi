import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  ADJ_AGREE,
  ADJ_FIX,
  ADJ_GENITIVE,
  ADJ_MAKE,
  ADJ_PHRASES,
  ADJ_PLURAL,
  ADJ_STEMS,
  ADJ_TALK,
  ADJ_TRANSLATE,
  ADJ_WHICH,
  clipId,
  clipUrl,
} from "../../../lib/learn/clips";
import type { PassageQuestion } from "../../../lib/learn/questions";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, ListenRows, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { LessonView, Prose } from "../LessonView";
import { Morph, type MorphChain } from "../Morph";
import { Paradigm } from "../Paradigm";
import { Listening } from "../Passage";
import { Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "omadussonad";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const MEANS: Record<string, MessageDescriptor> = {
  "Ma elan suures majas.": msg`I live in a big house.`,
  "Kass magab väikeses toas.": msg`The cat sleeps in the small room.`,
  "Ma loen uut raamatut.": msg`I’m reading a new book.`,
  "Me istume vanas kohvikus.": msg`We’re sitting in an old café.`,
  "Mul on kaks suurt kassi.": msg`I have two big cats.`,
  "Jaan elab ilusas linnas.": msg`Jaan lives in a beautiful town.`,
  "Ma sõidan suure autoga.": msg`I drive a big car.`,
  "Mari tuleb uue sõbraga.": msg`Mari is coming with a new friend.`,
  "Ma joon kohvi sooja piimaga.": msg`I drink coffee with warm milk.`,
  "Väikese lapsena elasin ma Tartus.": msg`As a small child, I lived in Tartu.`,
  "Need on suured majad.": msg`These are big houses.`,
  "Need on uued raamatud.": msg`These are new books.`,
  "Need on head sõbrad.": msg`These are good friends.`,
};

const PHRASE_MEANS: Record<(typeof ADJ_PHRASES)[number]["id"], MessageDescriptor> = {
  "suur-maja": msg`a big house`,
  "vaike-tuba": msg`a small room`,
  "uus-raamat": msg`a new book`,
};

const ROW_NAMES = [
  { id: "nominative", label: msg`Nominative`, ask: "mis?" },
  { id: "genitive", label: msg`Genitive`, ask: "mille?" },
  { id: "partitive", label: msg`Partitive`, ask: "mida?" },
  {
    id: "in",
    label: msg({ message: "In", context: "case row: the -s ending, inside something" }),
    ask: "milles?",
  },
  { id: "with", label: msg`With`, ask: "millega?" },
] as const;

const GLOSSARY: Glossary = {
  suur: { en: msg`big` },
  väike: { en: msg`small, little` },
  uus: { en: msg`new` },
  vana: { en: msg`old` },
  hea: { en: msg`good` },
  ilus: { en: msg`beautiful` },
  soe: { en: msg`warm`, note: msg`Its genitive is sooja.` },
  "suures majas": { en: msg`in a big house` },
  "suure autoga": { en: msg`with a big car` },
  "uut raamatut": { en: msg`a new book`, note: msg`Both words in the partitive.` },
  "suured majad": { en: msg`big houses` },
};

const MAKE_CUES: Record<(typeof ADJ_MAKE)[number]["id"], MessageDescriptor | { et: string }> = {
  "suures-majas": msg`in a big house`,
  "vaikeses-toas": msg`in the small room`,
  "vanas-linnas": msg`in an old town`,
  "heas-kohvikus": msg`in a good café`,
  "uut-raamatut": { et: "Ma loen …" },
  "suurt-kassi": { et: "Mul on kaks …" },
  "uut-autot": { et: "Mul ei ole …" },
  "suured-majad": msg`big houses`,
};

const WHICH_CUES: Record<(typeof ADJ_WHICH)[number]["id"], MessageDescriptor> = {
  "suure-autoga": msg`with a big car`,
  "uue-sobraga": msg`with a new friend`,
  "sooja-piimaga": msg`with warm milk`,
  "vaikese-lapsena": msg`as a small child`,
  "suures-autos": msg`in a big car`,
  "uues-majas": msg`in a new house`,
  "soojas-toas": msg`in a warm room`,
  "vaikeses-poes": msg`in a small shop`,
};

const TRANSLATE_PROMPTS: Record<(typeof ADJ_TRANSLATE)[number]["id"], MessageDescriptor> = {
  "suures-majas": msg`I live in a big house.`,
  "uue-autoga": msg`Jaan drives a new car.`,
  "uut-raamatut": msg`I’m reading a new book.`,
  "kaks-suurt": msg`I have two big cats.`,
  "ilusas-linnas": msg`Mari lives in a beautiful town.`,
  "head-sobrad": msg`These are good friends.`,
};

const meaning = (said: string, i18n: I18n) => i18n._(MEANS[said] as MessageDescriptor);

type MakeItem = FormItem & { pair: readonly [string, string] };
type WhichItem = FormItem & { pair: readonly [string, string]; options: readonly string[] };

export const whichRun = (items: readonly WhichItem[], pinned?: WhichItem): WhichItem[] =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle([...item.options]) },
  );

const MESSAGE_GAPS: readonly GapItem[] = [
  {
    id: "uues",
    before: "Tere, Kati! Ma elan nüüd",
    after: "linnas.",
    answer: "uues",
    options: ["uut", "uues", "uue"],
  },
  {
    id: "suures",
    before: "Minu korter on",
    after: "majas.",
    answer: "suures",
    options: ["suures", "suure", "suurt"],
  },
  {
    id: "vaikeses",
    before: "Ma töötan",
    after: "poes.",
    answer: "väikeses",
    options: ["väikese", "väikesega", "väikeses"],
  },
  {
    id: "vana",
    before: "Ma sõidan tööle",
    after: "autoga.",
    answer: "vana",
    options: ["vanaga", "vana", "vanas"],
  },
  {
    id: "head",
    before: "Mul on kaks",
    after: "sõpra.",
    answer: "head",
    options: ["heas", "heaga", "head"],
  },
];

function PhraseTable() {
  const { t, i18n } = useLingui();
  const [id, setId] = useState<(typeof ADJ_PHRASES)[number]["id"]>("suur-maja");
  const phrase = ADJ_PHRASES.find((each) => each.id === id) ?? ADJ_PHRASES[0];
  return (
    <Panel>
      <Chips
        label={t`Phrase`}
        items={ADJ_PHRASES.map((each) => ({ label: each.forms[0], value: each.id, lang: "et" }))}
        value={id}
        onPick={setId}
      />
      <Paradigm
        key={id}
        label={t`Forms of ${phrase.forms[0]}`}
        columns={[i18n._(PHRASE_MEANS[phrase.id])]}
        rows={ROW_NAMES.map((row, i) => ({
          id: row.id,
          label: i18n._(row.label),
          ask: row.ask,
          tip:
            row.id === "with" ? (
              <Trans>
                Only the noun takes <span lang="et">-ga</span>; the adjective stays in the genitive.
              </Trans>
            ) : (
              <Trans>Both words take the same case.</Trans>
            ),
          cells: [{ form: phrase.forms[i] as string, src: src(phrase.forms[i] as string) }],
        }))}
        empty={{ title: t`Tap a form`, tip: t`You’ll hear it and see what the adjective does.` }}
      />
    </Panel>
  );
}

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const why: Record<string, ReactNode> = {
      uues: (
        <Trans>
          In a town: both words take <span lang="et">-s</span>, <span lang="et">uues linnas</span>.
        </Trans>
      ),
      suures: (
        <Trans>
          In a house: both words take <span lang="et">-s</span>, <span lang="et">suures majas</span>
          .
        </Trans>
      ),
      vaikeses: (
        <Trans>
          In a shop: both words take <span lang="et">-s</span>, <span lang="et">väikeses poes</span>
          .
        </Trans>
      ),
      vana: (
        <Trans>
          With <span lang="et">-ga</span>, the adjective stays in the genitive, and the genitive of{" "}
          <span lang="et">vana</span> is <span lang="et">vana</span>:{" "}
          <span lang="et">vana autoga</span>.
        </Trans>
      ),
      head: (
        <Trans>
          After <span lang="et">kaks</span>, <span lang="et">kolm</span> and higher numbers, both
          words usually take the partitive singular: <span lang="et">kaks head sõpra</span>.
        </Trans>
      ),
    };
    const gaps = MESSAGE_GAPS.map((gap) => ({ ...gap, why: why[gap.id] }));

    const sentences: SentenceItem[] = ADJ_TRANSLATE.map(({ id, answers }) => ({
      kind: "translate",
      id,
      prompt: i18n._(TRANSLATE_PROMPTS[id]),
      answers,
      src: src(answers[0]),
    }));

    const fixWhy: Record<(typeof ADJ_FIX)[number]["id"], ReactNode> = {
      "fix-suures": (
        <Trans>
          The adjective takes <span lang="et">-s</span> as well: <span lang="et">suures majas</span>
          .
        </Trans>
      ),
      "fix-suure": (
        <Trans>
          With <span lang="et">-ga</span>, only the noun takes it; the adjective stays in the
          genitive: <span lang="et">suure autoga</span>.
        </Trans>
      ),
      "fix-suurt": (
        <Trans>
          After <span lang="et">kaks</span>, <span lang="et">kolm</span> and higher numbers, the
          adjective is usually in the partitive singular as well:{" "}
          <span lang="et">kaks suurt kassi</span>.
        </Trans>
      ),
      "fix-uut": (
        <Trans>
          Both words in the partitive: <span lang="et">uut raamatut</span>.
        </Trans>
      ),
      "fix-vaikeses": (
        <Trans>
          The adjective takes <span lang="et">-s</span> on its genitive{" "}
          <span lang="et">väikese</span>: <span lang="et">väikeses toas</span>.
        </Trans>
      ),
      "fix-uued": (
        <Trans>
          More than one book: the adjective is plural as well, <span lang="et">uued raamatud</span>.
        </Trans>
      ),
    };
    const fix: FixItem[] = ADJ_FIX.map(({ id, wrong, answers }) => ({
      kind: "fix",
      id,
      wrong,
      answers,
      src: src(answers[0]),
      explain: fixWhy[id],
    }));

    const talk: PassageQuestion[] = [
      {
        id: "where",
        ask: t`Where was Jaan yesterday?`,
        options: [
          { id: "parnu", label: t`In Pärnu` },
          { id: "tartu", label: t`In Tartu` },
          { id: "narva", label: t`In Narva` },
        ],
        answer: "tartu",
        line: 3,
      },
      {
        id: "new-house",
        kind: "truefalse",
        ask: t`Jaan’s brother lives in a new house.`,
        answer: false,
        line: 4,
      },
      {
        id: "rooms",
        ask: t`How many small rooms does the brother’s house have?`,
        options: [
          { id: "two", label: t`Two` },
          { id: "three", label: t`Three` },
          { id: "one", label: t`One` },
        ],
        answer: "three",
        line: 8,
      },
      {
        id: "work",
        ask: t`Where does Jaan’s brother work?`,
        options: [
          { id: "cafe", label: t`In a new café` },
          { id: "shop", label: t`In a big shop` },
          { id: "market", label: t`At the market` },
        ],
        answer: "cafe",
        line: 10,
      },
      {
        id: "car",
        kind: "short",
        ask: t`How does the brother get to work? Write the two words as Jaan says them.`,
        answers: ["vana autoga"],
        line: 12,
      },
      { id: "bus", kind: "truefalse", ask: t`Kati goes to work by bus.`, answer: true, line: 17 },
      {
        id: "book",
        ask: t`What is Kati reading?`,
        options: [
          { id: "letter", label: t`A long letter` },
          { id: "new-letter", label: t`A new letter` },
          { id: "new", label: t`A new book` },
        ],
        answer: "new",
        line: 20,
      },
      {
        id: "free",
        kind: "truefalse",
        ask: t`Jaan works tomorrow.`,
        answer: false,
        line: 24,
      },
      {
        id: "meet",
        kind: "short",
        ask: t`Where will Kati wait for Jaan? Write the two words as she says them.`,
        answers: ["väikeses kohvikus"],
        line: 26,
      },
    ];
    return { gaps, sentences, fix, talk };
  }, [t, i18n]);
}

export function OmadussonadLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const forms = lessonBySlug("pohivormid")?.n;
  const withLesson = lessonBySlug("sobraga-rahata")?.n;
  const plural = lessonBySlug("mitmus")?.n;

  const rows = (list: readonly string[]) =>
    list.map((said) => ({
      main: <span lang="et">{said}</span>,
      sub: meaning(said, i18n),
      src: src(said),
    }));

  const chains: MorphChain[] = ADJ_STEMS.map((chain) => ({
    id: chain.id,
    steps: chain.steps.map((word, i) => ({
      word,
      label: [t`nominative`, t`genitive`, t`partitive`][i] as string,
      src: src(word),
    })),
  }));

  const makeItems = useMemo<MakeItem[]>(
    () =>
      ADJ_MAKE.map(({ id, way, base, answer, said }) => ({
        base,
        cue: "et" in MAKE_CUES[id] ? MAKE_CUES[id].et : i18n._(MAKE_CUES[id]),
        cueLang: "et" in MAKE_CUES[id] ? "et" : undefined,
        answers: [answer],
        src: src(said),
        pair: [way, id] as const,
        explain:
          way === "plural" ? (
            <Trans>More than one: both words in the plural.</Trans>
          ) : way === "partitive" ? (
            <Trans>Both words in the partitive.</Trans>
          ) : (
            <Trans>
              Both words take <span lang="et">-s</span>.
            </Trans>
          ),
      })),
    [i18n],
  );

  const whichItems = useMemo<WhichItem[]>(
    () =>
      ADJ_WHICH.map(({ id, way, base, answer, options, said }) => ({
        base,
        cue: i18n._(WHICH_CUES[id]),
        answers: [answer],
        options,
        src: src(said),
        pair: [way, id] as const,
        explain:
          way === "ga" ? (
            <Trans>
              With <span lang="et">-ga</span>, <span lang="et">-ta</span>,{" "}
              <span lang="et">-ni</span> or <span lang="et">-na</span>, only the noun takes the
              ending; the adjective stays in the genitive.
            </Trans>
          ) : (
            <Trans>
              With <span lang="et">-s</span>, both words take the ending.
            </Trans>
          ),
      })),
    [i18n],
  );

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          An adjective usually takes the noun’s case: <span lang="et">suur maja</span>, a big house,
          and <span lang="et">suures majas</span>, in a big house. With <span lang="et">-ga</span>,{" "}
          <span lang="et">-ta</span>, <span lang="et">-ni</span> and <span lang="et">-na</span>,
          only the noun takes the ending: <span lang="et">suure autoga</span>.
        </Trans>
      }
      facts={[
        <Trans key="m">16 minutes</Trans>,
        <Trans key="q">5 exercises, 3 of them typed, and a conversation</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["suur", "väike", "uus", "vana", "hea", "ilus", "soe", "suures majas", "suure autoga"]}
      recap={[
        <Trans key="1">
          An adjective usually takes the noun’s case and number: <b lang="et">suures majas</b>,{" "}
          <b lang="et">uut raamatut</b>, <b lang="et">suured majad</b>.
        </Trans>,
        <Trans key="2">
          An adjective adds <b lang="et">-s</b> and plural <b lang="et">-d</b> to its own genitive:{" "}
          <b lang="et">uus, uue, uues, uued</b>; <b lang="et">väike, väikese, väikeses</b>.
        </Trans>,
        <Trans key="3">
          With <b lang="et">-ga</b>, <b lang="et">-ta</b>, <b lang="et">-ni</b> and{" "}
          <b lang="et">-na</b>, only the noun takes the ending, and the adjective stays in the
          genitive: <b lang="et">suure autoga</b>.
        </Trans>,
        <Trans key="4">
          After <b lang="et">kaks</b>, <b lang="et">kolm</b> and higher numbers, both words usually
          take the partitive singular: <b lang="et">kaks suurt kassi</b>. With other endings, the
          number changes as well: <b lang="et">kahes suures majas</b>,{" "}
          <b lang="et">kahe suure kassiga</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "agree",
          title: t`The adjective usually takes the noun’s case`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Suur" /> is big, and <span lang="et">suur maja</span> is a big house.
                    The adjective usually goes into the same case as the noun:{" "}
                    <Word w="suures majas" />, in a big house; <Word w="uut raamatut" />, a new
                    book, as the object of <span lang="et">loen</span>, I’m reading. Each word
                    builds the case on its own forms, so the endings can differ:{" "}
                    <span lang="et">suurt maja</span>. Four endings work differently; a section
                    below shows them.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Pick a phrase, then tap its forms. The question word beside each form is the
                    question that case answers.
                  </Trans>
                </p>
              </Prose>
              <PhraseTable />
              <ListenRows items={rows(ADJ_AGREE)} />
              <Prose>
                <p>
                  <Trans>Now type each phrase in the form the cue asks for.</Trans>
                </p>
              </Prose>
              <Quiz
                id="make-agree"
                title={<Trans>Both words, one case</Trans>}
                items={makeItems}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them, the adjective in the noun’s case every time.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Check that the adjective took the ending as well.</Trans>
                  ) : (
                    <Trans>Tap the forms in the table once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={eachPairFirst}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "stems",
          title: t`Adjectives change like nouns`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Like a noun, an adjective has three main forms, as lesson {forms} shows for
                    nouns: <span lang="et">uus, uue, uut</span>. The <span lang="et">-s</span> form
                    and plural <span lang="et">-d</span> are built on the genitive{" "}
                    <span lang="et">uue</span>: <span lang="et">uues majas</span>,{" "}
                    <span lang="et">uued majad</span>. With <span lang="et">-ga</span> the adjective
                    stays <span lang="et">uue</span>: <span lang="et">uue autoga</span>, as the next
                    section shows. Pick a word and tap its forms.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Morph label={t`Adjectives`} chains={chains} />
              </Panel>
            </>
          ),
        },
        {
          id: "genitive",
          title: t`Four endings: only the noun`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Four endings from lesson {withLesson} work differently:{" "}
                    <span lang="et">-ga</span>, <span lang="et">-ta</span>,{" "}
                    <span lang="et">-ni</span> and <span lang="et">-na</span>. Only the noun takes
                    them, and the adjective stays in the genitive: <Word w="suure autoga" />, with a
                    big car; <span lang="et">uue autota</span>, without a new car;{" "}
                    <span lang="et">suure majani</span>, as far as the big house;{" "}
                    <span lang="et">väikese lapsena</span>, as a small child.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    So in a big car is <span lang="et">suures autos</span>, and with a big car is{" "}
                    <span lang="et">suure autoga</span>. Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(ADJ_GENITIVE)} />
              <Prose>
                <p>
                  <Trans>Pick the phrase the cue asks for.</Trans>
                </p>
              </Prose>
              <Quiz
                id="which-form"
                title={<Trans>In a big car, with a big car</Trans>}
                items={whichItems}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All eight: both words with <span lang="et">-s</span>, the noun alone with{" "}
                      <span lang="et">-ga</span> or <span lang="et">-na</span>.
                    </Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Look at the noun’s ending before you pick.</Trans>
                  ) : (
                    <Trans>Tap the lines above once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={whichRun}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "plural",
          title: t`Adjectives in the plural`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    When the noun takes plural <span lang="et">-d</span>, from lesson {plural}, the
                    adjective takes <span lang="et">-d</span> as well: <Word w="suured majad" />,
                    big houses. Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(ADJ_PLURAL)} />
            </>
          ),
        },
        {
          id: "message",
          title: t`Mari’s new town`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari writes to Kati about her new town. Pick the adjective for each gap: the
                    noun after it says which form it takes.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="new-town"
                title={<Trans>Fill the gaps</Trans>}
                gaps={content.gaps}
                mode="pick"
                clip="p-message"
              />
            </>
          ),
        },
        {
          id: "write",
          title: t`Write it in Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Write each sentence in Estonian.</Trans>
                </p>
              </Prose>
              <Quiz
                id="write-adjectives"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.sentences}
                rounds={content.sentences.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, every adjective in the right form.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Check the adjective in the ones you missed.</Trans>
                  ) : (
                    <Trans>Read What to remember at the end, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "mistakes",
          title: t`Six mistakes to catch`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In each sentence, one adjective is in the wrong form. Tap it, then type it
                    right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-adjective"
                title={<Trans>Fix the sentence</Trans>}
                items={content.fix}
                rounds={content.fix.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Read the reason under each one you missed.</Trans>
                  ) : (
                    <Trans>Read What to remember at the end, then try again.</Trans>
                  )
                }
                recall={fixRecall}
                round={(props) => <FixRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "talk",
          title: t`Jaan’s brother`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Kati asks Jaan where he was yesterday.</Trans>
                </p>
              </Prose>
              <Listening
                id="kati-and-jaan"
                title={<Trans>Listen: Kati and Jaan</Trans>}
                clip="c-talk"
                turns={ADJ_TALK.turns}
                names={{ main: t`Jaan`, second: t`Kati` }}
                questions={content.talk}
                plays={2}
              />
            </>
          ),
        },
      ]}
    />
  );
}
