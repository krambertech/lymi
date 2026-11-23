import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  PLURAL_PART_CONVERSATION,
  PLURAL_PART_FIXES,
  PLURAL_PART_ALT,
  PLURAL_PART_FORM_QUIZ,
  PLURAL_PART_FORMS,
  PLURAL_PART_GAPS,
  PLURAL_PART_KINDS,
  PLURAL_PART_MATCH,
  PLURAL_PART_SORT,
  PLURAL_PART_THREE,
  PLURAL_PART_USES,
  pluralGapSaid,
  pluralPartVariants,
  PLURAL_PART_ANSWERS,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, ListenRows, Panel, type RowItem } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import { type GapItem as PassageGap, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Sort, type SortItem } from "../Sort";
import { Word } from "../Word";

const SLUG = "raamatuid-maju";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Kind = keyof typeof PLURAL_PART_KINDS;
const KINDS = Object.keys(PLURAL_PART_KINDS) as Kind[];

const NOUNS: Record<string, MessageDescriptor> = {
  raamat: msg`book`,
  õpik: msg`textbook`,
  kohvik: msg`café`,
  auto: msg`car`,
  kino: msg`cinema`,
  ema: msg`mother`,
  maja: msg`house`,
  õun: msg`apple`,
  kool: msg`school`,
  laps: msg`child`,
  maa: msg`land, country`,
  puu: msg`tree`,
  tee: msg`road, tea`,
  sõber: msg`friend`,
};

const MEANS: Record<string, MessageDescriptor> = {
  "kaks raamatut": msg`two books`,
  "palju raamatuid": msg`a lot of books`,
  raamatud: msg`the books`,
  "kaks õuna": msg`two apples`,
  "palju õunu": msg`a lot of apples`,
  õunad: msg`the apples`,
  "kaks sõpra": msg`two friends`,
  "palju sõpru": msg`a lot of friends`,
  sõbrad: msg`the friends`,
  "kaks last": msg`two children`,
  "palju lapsi": msg`a lot of children`,
  lapsed: msg`the children`,
  "Mul on palju raamatuid.": msg`I have a lot of books.`,
  "Poes on õunu.": msg`There are apples in the shop.`,
  "Mul ei ole autosid.": msg`I don’t have any cars.`,
  "Ma armastan linde.": msg`I love birds.`,
  "Ma ostsin õunu.": msg`I bought some apples.`,
  "Ma ostsin õunad.": msg`I bought the apples.`,
};

const means = (text: string, i18n: I18n) => {
  const found = MEANS[text];
  return found ? i18n._(found) : "";
};

const KIND_LABELS: Record<Kind, MessageDescriptor> = {
  id: msg`Like a book`,
  sid: msg`Like a car`,
  vowel: msg`Like a house`,
  long: msg`Like a tree`,
};

const GLOSSARY: Glossary = {
  palju: { en: msg`a lot, many` },
  raamatuid: { en: msg`books`, note: msg`The plural partitive of raamat.` },
  maju: { en: msg`houses`, note: msg`The plural partitive of maja.` },
  autosid: { en: msg`cars`, note: msg`The plural partitive of auto.` },
  koole: { en: msg`schools`, note: msg`The plural partitive of kool.` },
  linde: { en: msg`birds`, note: msg`The plural partitive of lind.` },
  lilli: { en: msg`flowers`, note: msg`The plural partitive of lill.` },
  ...Object.fromEntries(
    Object.entries(MEANS).map(([text, en]) => [text.toLowerCase(), { en, show: text }]),
  ),
};

function ThreeTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = PLURAL_PART_THREE.map((row) => ({
    id: row.word,
    label: i18n._(NOUNS[row.word] as MessageDescriptor),
    et: row.word,
    cells: [row.two, row.many, row.the].map((text) => ({
      form: text,
      src: src(text),
      note: means(text, i18n),
    })),
  }));
  return (
    <Panel>
      <Paradigm
        label={t`Two, many and the ones you mean`}
        columns={[t`After a number`, t`Some or many`, t`The ones you mean`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a form`,
          tip: t`A number from two up takes the singular partitive. Some or many usually takes the plural partitive.`,
        }}
      />
    </Panel>
  );
}

function KindTable() {
  const { t, i18n } = useLingui();
  const [kind, setKind] = useState<Kind>("id");
  const tips: Record<Kind, ReactNode> = {
    id: (
      <Trans>
        Many words of two or more syllables add <b lang="et">-id</b> to the genitive:{" "}
        <b lang="et">raamatu, raamatuid</b>; <b lang="et">õpiku, õpikuid</b>.
      </Trans>
    ),
    sid: (
      <Trans>
        Many words that end in a vowel add <b lang="et">-sid</b> to the genitive:{" "}
        <b lang="et">auto, autosid</b>.
      </Trans>
    ),
    vowel: (
      <Trans>
        Many short words swap the partitive’s last vowel for <b lang="et">-u</b>,{" "}
        <b lang="et">-e</b> or <b lang="et">-i</b>: <b lang="et">maja, maju</b>;{" "}
        <b lang="et">kooli, koole</b>; <b lang="et">sõpra, sõpru</b>.
      </Trans>
    ),
    long: (
      <Trans>
        A one-syllable word with a long vowel usually shortens it and takes <b lang="et">-id</b>:{" "}
        <b lang="et">puu, puid</b>. Most of these also have <b lang="et">-sid</b>:{" "}
        <b lang="et">puusid</b>.
      </Trans>
    ),
  };
  const rows: ParadigmRow[] = PLURAL_PART_KINDS[kind].map((noun) => ({
    id: noun.word,
    label: i18n._(NOUNS[noun.word] as MessageDescriptor),
    et: noun.word,
    tip: tips[kind],
    cells: [
      { form: noun.part, src: src(noun.part) },
      { form: noun.many, src: src(noun.many) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Kinds of ending`}
        items={KINDS.map((each) => ({ label: i18n._(KIND_LABELS[each]), value: each }))}
        value={kind}
        onPick={setKind}
      />
      <Paradigm
        key={kind}
        label={t`Singular and plural partitive`}
        columns={[t`Singular partitive`, t`Plural partitive`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{ title: t`Tap a form`, tip: tips[kind] }}
      />
    </Panel>
  );
}

type Use = "two" | "many" | "where";
type GapRun = FormItem & {
  said: string;
  options: readonly string[];
  answers: readonly string[];
  pair: readonly [string, string];
};

export const gapRun = <T extends { pair: readonly [string, string]; options: readonly string[] }>(
  items: readonly T[],
  pinned?: T,
): T[] =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle(item.options) },
  );

const BASES: Record<string, string> = { sõber: "sõber, sõbra, sõpra" };

const PARTY_GAPS: PassageGap[] = [
  {
    id: "ounu",
    before: "Täna on Kati sünnipäev. Ta ostis poest",
    after: "ja banaane.",
    answer: "õunu",
  },
  { id: "kulalisi", before: "", after: "tuleb palju.", answer: "Külalisi" },
  { id: "sobrad", before: "Kati", after: "toovad lilli.", answer: "sõbrad" },
  { id: "laule", before: "Lapsed laulavad", after: ".", answer: "laule" },
];

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const whys: Record<Use, ReactNode> = {
      two: <Trans>After a number from two up, the singular partitive.</Trans>,
      many: (
        <Trans>
          After <b lang="et">palju</b>, many, the plural partitive.
        </Trans>
      ),
      where: <Trans>These are the ones you mean, so the plural nominative.</Trans>,
    };
    const gaps: GapRun[] = PLURAL_PART_GAPS.map((gap) => {
      const said = pluralGapSaid(gap);
      const use = gap.id.split("-")[1] as Use;
      return {
        said,
        base: gap.noun,
        gloss: i18n._(NOUNS[gap.noun] as MessageDescriptor),
        cue: `${gap.before} …${gap.after === "." ? "" : ` ${gap.after}`}`,
        cueLang: "et",
        src: src(said),
        options: PLURAL_PART_FORMS[gap.noun],
        answers: [gap.answer],
        pair: [use, gap.id] as const,
        explain: whys[use],
      };
    });

    const sort: SortItem[] = PLURAL_PART_SORT.map(({ w, bin }) => ({ w, bin, src: src(w) }));

    const pairs: MatchPair[] = PLURAL_PART_MATCH.map((noun) => ({
      id: noun.word,
      left: noun.word,
      right: noun.many,
      rightLang: "et",
      src: src(noun.many),
    }));

    const forms: FormItem[] = PLURAL_PART_FORM_QUIZ.map((item) => {
      const kind = KINDS.find((each) =>
        PLURAL_PART_KINDS[each].some((noun) => noun.word === item.word),
      );
      const noun = kind && PLURAL_PART_KINDS[kind].find((each) => each.word === item.word);
      return {
        base: noun ? `${noun.word}, ${noun.of}, ${noun.part}` : (BASES[item.word] ?? item.word),
        gloss: i18n._(NOUNS[item.word] as MessageDescriptor),
        cue: item.cue,
        cueLang: "et",
        answers: [
          item.answer,
          ...(PLURAL_PART_ALT[item.answer] ? [PLURAL_PART_ALT[item.answer] as string] : []),
        ],
        src: src(item.said),
        said: item.said,
        explain:
          item.word === "laps" ? (
            <Trans>
              After <b lang="et">ei</b>, the plural partitive.
            </Trans>
          ) : (
            <Trans>Some or many, not counted: usually the plural partitive.</Trans>
          ),
      };
    });

    const translations: (SentenceItem & { pair: readonly [string, string] })[] = [
      {
        kind: "translate",
        id: "many-books",
        prompt: t`I have a lot of books.`,
        src: src("Mul on palju raamatuid."),
        answers: PLURAL_PART_ANSWERS["Mul on palju raamatuid."],
        pair: ["many", "many-books"],
      },
      {
        kind: "translate",
        id: "two-children",
        prompt: t`I have two children.`,
        src: src("Mul on kaks last."),
        answers: PLURAL_PART_ANSWERS["Mul on kaks last."],
        pair: ["two", "two-children"],
        explain: <Trans>After a number, the singular partitive.</Trans>,
      },
      {
        kind: "translate",
        id: "children-home",
        prompt: t`The children are at home.`,
        src: src("Lapsed on kodus."),
        answers: PLURAL_PART_ANSWERS["Lapsed on kodus."],
        pair: ["the", "children-home"],
        explain: <Trans>The ones you mean, the subject: the plural nominative.</Trans>,
      },
      {
        kind: "translate",
        id: "apples-shop",
        prompt: t`There are apples in the shop.`,
        src: src("Poes on õunu."),
        answers: PLURAL_PART_ANSWERS["Poes on õunu."],
        pair: ["many", "apples-shop"],
      },
      {
        kind: "translate",
        id: "the-apples",
        prompt: t`I bought the apples.`,
        src: src("Ma ostsin õunad."),
        answers: PLURAL_PART_ANSWERS["Ma ostsin õunad."],
        pair: ["the", "the-apples"],
        explain: <Trans>All of them, done: the plural nominative.</Trans>,
      },
      {
        kind: "translate",
        id: "no-cars",
        prompt: t`I don’t have any cars.`,
        src: src("Mul ei ole autosid."),
        answers: PLURAL_PART_ANSWERS["Mul ei ole autosid."],
        pair: ["no", "no-cars"],
      },
      {
        kind: "translate",
        id: "love-birds",
        prompt: t`I love birds.`,
        src: src("Ma armastan linde."),
        answers: PLURAL_PART_ANSWERS["Ma armastan linde."],
        pair: ["no", "love-birds"],
      },
    ];

    const many = (
      <Trans>
        After <b lang="et">palju</b>, the plural partitive.
      </Trans>
    );
    const fixWhy: Record<string, ReactNode> = {
      "Mul on palju raamatuid.": many,
      "Mul on kaks raamatut.": <Trans>After a number, the singular partitive.</Trans>,
      "Mul ei ole lapsi.": (
        <Trans>
          After <b lang="et">ei</b>, a plural noun takes the plural partitive.
        </Trans>
      ),
      "Ma armastan linde.": (
        <Trans>
          <b lang="et">Armastama</b> takes the partitive, so many birds are <b lang="et">linde</b>.
        </Trans>
      ),
      "Laual on palju õunu.": many,
      "Ma ootan sõpru.": (
        <Trans>
          <b lang="et">Ootama</b> takes the partitive, so many friends are <b lang="et">sõpru</b>.
        </Trans>
      ),
      "Ma ostsin kaks õuna.": <Trans>After a number, the singular partitive.</Trans>,
    };
    const fixes: FixItem[] = PLURAL_PART_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${clipId(item.right)}`,
      wrong: item.wrong,
      answers: pluralPartVariants(item.right),
      src: src(item.right),
      explain: fixWhy[item.right],
    }));

    const exam: PassageQuestion[] = [
      {
        id: "two-kilos",
        ask: t`What did Mari buy two kilos of?`,
        options: [
          { id: "apples", label: t`Apples` },
          { id: "potatoes", label: t`Potatoes` },
          { id: "carrots", label: t`Carrots` },
        ],
        answer: "potatoes",
        line: 2,
      },
      {
        id: "tomatoes",
        kind: "truefalse",
        ask: t`There were tomatoes at the market today.`,
        answer: false,
        line: 4,
      },
      {
        id: "roses",
        kind: "short",
        ask: t`How many roses did Mari buy? Write the number as she says it.`,
        answers: ["viis", "5"],
        line: 9,
      },
      {
        id: "mother",
        kind: "truefalse",
        ask: t`The roses are for Mari’s mother.`,
        answer: true,
        line: 9,
      },
      {
        id: "birthday",
        kind: "truefalse",
        ask: t`It’s Mari’s mother’s birthday.`,
        answer: false,
        line: 11,
      },
      {
        id: "guests",
        ask: t`How many guests is Jaan expecting?`,
        options: [
          { id: "four", label: t`Four` },
          { id: "two", label: t({ message: "Two", context: "how many guests" }) },
          { id: "six", label: t`Six` },
        ],
        answer: "six",
        line: 16,
      },
      {
        id: "who",
        kind: "match",
        ask: t`Who says it?`,
        options: [
          { id: "mari", label: t`Mari` },
          { id: "jaan", label: t`Jaan` },
        ],
        statements: [
          { id: "roses", label: t`I bought some flowers.`, answer: "mari", line: 9 },
          { id: "guests", label: t`I have guests tomorrow.`, answer: "jaan", line: 13 },
          { id: "chairs", label: t`I only have four chairs.`, answer: "jaan", line: 22 },
          { id: "bring", label: t`I’ll bring them tomorrow morning.`, answer: "mari", line: 24 },
          { id: "cake", label: t`I’ll make you a cake.`, answer: "jaan", line: 26 },
        ],
      },
    ];

    return { gaps, sort, pairs, forms, translations, fixes, exam };
  }, [t, i18n]);
}

const pairRun = <T extends { pair: readonly [string, string] }>(items: readonly T[], pinned?: T) =>
  eachPairFirst(items, pinned);

export function RaamatuidMajuLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const partitive = lessonBySlug("osastav")?.n;
  const plural = lessonBySlug("mitmus")?.n;
  const object = lessonBySlug("raamatut-voi-raamatu")?.n;
  const gradation = lessonBySlug("jalg-jala")?.n;
  const names = { main: t`Jaan`, second: t`Mari` };
  const rowsOf = (texts: readonly string[]): RowItem[] =>
    texts.map((text) => ({ main: text, sub: means(text, i18n), src: src(text) }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          The partitive for more than one: some or many things you don’t count, after{" "}
          <b lang="et">ei</b>, and after verbs that take the partitive. How it differs from{" "}
          <b lang="et">kaks raamatut</b> and <b lang="et">raamatud</b>, and how to build it.
        </Trans>
      }
      facts={[
        <Trans key="m">20 minutes</Trans>,
        <Trans key="q">8 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["palju", "raamatuid", "maju", "autosid", "koole", "linde", "lilli"]}
      recap={[
        <Trans key="1">
          Some or many things you don’t count usually take the plural partitive:{" "}
          <b lang="et">Mul on palju raamatuid. Poes on õunu.</b> After <b lang="et">mõned</b>, some,
          the plural nominative: <b lang="et">mõned raamatud</b>.
        </Trans>,
        <Trans key="2">
          After a number from two up, the singular partitive stays: <b lang="et">kaks raamatut</b>.
          The ones you mean take the plural nominative: <b lang="et">raamatud</b>.
        </Trans>,
        <Trans key="3">
          After <b lang="et">ei</b> and after verbs such as <b lang="et">armastama</b>, the plural
          partitive too: <b lang="et">Mul ei ole autosid. Ma armastan linde.</b>
        </Trans>,
        <Trans key="4">
          The plural partitive ends in <b lang="et">-id</b> (<b lang="et">raamatuid</b>),{" "}
          <b lang="et">-sid</b> (<b lang="et">autosid</b>) or a changed last vowel (
          <b lang="et">maju, koole</b>). Learn it with each word.
        </Trans>,
      ]}
      sections={[
        {
          id: "some-many",
          title: t`Two, many or the ones you mean`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {partitive} used the partitive after a number: <Word w="kaks raamatut" />
                    , two books. For some or many things you don’t count, Estonian uses the plural
                    partitive: <Word w="palju raamatuid" />, a lot of books.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The ones you mean take the plural nominative, which lesson {plural} teaches:{" "}
                    <Word w="raamatud" />, the books. Tap across each row.
                  </Trans>
                </p>
              </Prose>
              <ThreeTable />
              <Prose>
                <p>
                  <Trans>
                    Apart from numbers, the plural partitive does the partitive’s jobs for more than
                    one: <b lang="et">Poes on õunu</b>, after <b lang="et">ei</b>, and after verbs
                    such as <b lang="et">armastama</b>. The whole or part of lesson {object} works
                    too: <b lang="et">Ma ostsin õunu</b>, some apples;{" "}
                    <b lang="et">Ma ostsin õunad</b>, the apples.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rowsOf(PLURAL_PART_USES)} />
              <Prose>
                <p>
                  <Trans>Pick the form each sentence needs, then hear it.</Trans>
                </p>
              </Prose>
              <Quiz
                id="two-many-the"
                title={<Trans>Two, many or the ones you mean?</Trans>}
                items={content.gaps}
                rounds={9}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All nine. You told a number from many and from the ones you mean.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap across the table’s rows once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={gapRun}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "endings",
          title: t`Three endings`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The plural partitive is built on the genitive or the partitive, in one of three
                    ways: <b lang="et">-id</b>, <b lang="et">-sid</b>, or a changed last vowel. Pick
                    a kind and tap the forms.
                  </Trans>
                </p>
              </Prose>
              <KindTable />
              <Aside>
                <Trans>
                  You can’t always tell from a word which way it goes, and some words have two
                  forms, both correct: <b lang="et">maju</b> and <b lang="et">majasid</b>. A
                  dictionary lists the plural partitive, so learn it with the word. Where the stem
                  changes, as lesson {gradation} explains, a changed vowel goes on the partitive’s
                  stem: <b lang="et">sõber, sõpra, sõpru</b>.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Put each plural partitive in the bin of its ending.</Trans>
                </p>
              </Prose>
              <Sort
                id="plural-endings"
                title={<Trans>Which ending?</Trans>}
                bins={[
                  {
                    id: "id",
                    label: "-id",
                    rule: (
                      <Trans>
                        Adds <b lang="et">-id</b>: <b lang="et">raamatuid, puid</b>.
                      </Trans>
                    ),
                  },
                  {
                    id: "sid",
                    label: "-sid",
                    rule: (
                      <Trans>
                        Adds <b lang="et">-sid</b>: <b lang="et">autosid</b>.
                      </Trans>
                    ),
                  },
                  {
                    id: "vowel",
                    label: t`A changed vowel`,
                    lang: i18n.locale,
                    rule: (
                      <Trans>
                        Changes the last vowel: <b lang="et">maju, koole</b>.
                      </Trans>
                    ),
                  },
                ]}
                items={content.sort}
              />
            </>
          ),
        },
        {
          id: "make",
          title: t`Make the plural partitive`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round gives a word with its genitive and partitive, as a dictionary lists
                    them, and a sentence. Type the plural partitive.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-plural-partitive"
                title={<Trans>Type the form</Trans>}
                items={content.forms}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, typed in full.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Nearly. Switch through the kinds in the table for the ones you missed.
                    </Trans>
                  ) : (
                    <Trans>Switch through the kinds in the table, then try again.</Trans>
                  )
                }
                recall={formRecall}
                round={(props) => <FormRound {...props} />}
              />
              <Prose>
                <p>
                  <Trans>
                    Six more words, none of them in this lesson yet. Match each with its plural
                    partitive.
                  </Trans>
                </p>
              </Prose>
              <Match
                id="more-plurals"
                title={<Trans>Which plural partitive?</Trans>}
                pairs={content.pairs}
                columns={[
                  <Trans key="w">Nominative</Trans>,
                  <Trans key="p">Plural partitive</Trans>,
                ]}
              />
            </>
          ),
        },
        {
          id: "sentences",
          title: t`In a sentence`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write each sentence in Estonian. Decide first: a number, some or many, a no, or
                    the ones you mean.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-plural"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven, each noun in the form its meaning needs.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Look at the noun in the ones you missed.</Trans>
                  ) : (
                    <Trans>Tap across the first table once more, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                order={pairRun}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "fix",
          title: t`Fix the noun`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has one noun in the wrong form. Tap it, then type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-plural"
                title={<Trans>Fix the sentence</Trans>}
                items={content.fixes}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Compare the right sentence under each one you missed.</Trans>
                  ) : (
                    <Trans>Read What to remember below, then try again.</Trans>
                  )
                }
                recall={fixRecall}
                round={(props) => <FixRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "party",
          title: t`Kati’s birthday`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Drag a word into each gap, or tap one to fill the open gap. Two of the words
                    belong nowhere.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="kati-party"
                title={<Trans>Fill the gaps</Trans>}
                gaps={PARTY_GAPS}
                mode="drag"
                spare={["õunad", "kook"]}
                clip="p-party"
              />
            </>
          ),
        },
        {
          id: "market",
          title: t`After the market`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Jaan asks Mari what she bought at the market.</Trans>
                </p>
              </Prose>
              <Listening
                id="after-market"
                title={<Trans>Listen: Jaan and Mari</Trans>}
                clip="c-market"
                turns={PLURAL_PART_CONVERSATION.turns}
                names={names}
                questions={content.exam}
                plays={2}
              />
            </>
          ),
        },
      ]}
    />
  );
}
