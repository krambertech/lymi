import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  PLURAL_CASE_CONVERSATION,
  PLURAL_CASE_FIXES,
  PLURAL_CASE_FIX_ANSWERS,
  PLURAL_CASE_FORM_QUIZ,
  PLURAL_CASE_HEARD,
  PLURAL_CASE_MATCH,
  PLURAL_CASE_NOUNS,
  PLURAL_CASE_SORT,
  PLURAL_CASE_STEMS,
  PLURAL_CASE_ANSWERS,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import { type GapItem as PassageGap, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Sort, type SortItem } from "../Sort";
import { Word } from "../Word";

const SLUG = "majades-inimestele";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const NOUNS: Record<string, MessageDescriptor> = {
  maja: msg`house`,
  sõber: msg`friend`,
  lind: msg`bird`,
  kool: msg`school`,
  puu: msg`tree`,
  raamat: msg`book`,
  inimene: msg`person`,
  õpetaja: msg`teacher`,
  kohvik: msg`café`,
  pood: msg`shop`,
};

const CASES: readonly MessageDescriptor[] = [
  msg`Genitive`,
  msg`In`,
  msg`Out of`,
  msg`To`,
  msg`On, at`,
  msg`With`,
];

type Noun = keyof typeof PLURAL_CASE_NOUNS;
const CASE_NOUNS = Object.keys(PLURAL_CASE_NOUNS) as Noun[];

const GLOSSARY: Glossary = {
  majades: { en: msg`in houses`, note: msg`Majade, the plural genitive, with -s.` },
  inimestele: { en: msg`to people`, note: msg`Inimeste, the plural genitive, with -le.` },
  majade: { en: msg`of houses`, note: msg`The plural genitive of maja.` },
  inimeste: { en: msg`of people`, note: msg`The plural genitive of inimene.` },
  sõprade: { en: msg`of friends`, note: msg`The plural genitive of sõber.` },
  raamatute: { en: msg`of books`, note: msg`The plural genitive of raamat.` },
};

const litStem = (form: string, gen: string) =>
  form.startsWith(gen) && form !== gen ? `${gen}|${form.slice(gen.length)}` : form;

function StemTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = PLURAL_CASE_STEMS.map((noun) => ({
    id: noun.word,
    label: i18n._(NOUNS[noun.word] as MessageDescriptor),
    et: noun.word,
    cells: [
      { form: noun.part, src: src(noun.part) },
      {
        form: noun.gen.endsWith("te")
          ? `${noun.gen.slice(0, -1)}|e`
          : `${noun.gen.slice(0, -2)}|de`,
        src: src(noun.gen),
      },
    ],
  }));
  return (
    <Panel>
      <Paradigm
        label={t`Partitive and plural genitive of nine nouns`}
        columns={[t`Partitive`, t`Plural genitive`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a form`,
          tip: (
            <Trans>
              In most nouns, a partitive in <b lang="et">-t</b> adds <b lang="et">-e</b>. Any other{" "}
              drops any <b lang="et">-d</b> and adds <b lang="et">-de</b>.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

function CaseTable() {
  const { t, i18n } = useLingui();
  const [noun, setNoun] = useState<Noun>("maja");
  const forms = PLURAL_CASE_NOUNS[noun];
  const gen = forms.many[0];
  const rows: ParadigmRow[] = CASES.map((name, i) => ({
    id: String(i),
    label: i18n._(name),
    cells: [
      { form: forms.one[i] as string, src: src(forms.one[i] as string) },
      { form: litStem(forms.many[i] as string, gen), src: src(forms.many[i] as string) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Nouns`}
        items={CASE_NOUNS.map((each) => ({
          label: i18n._(NOUNS[each] as MessageDescriptor),
          value: each,
        }))}
        value={noun}
        onPick={setNoun}
      />
      <Paradigm
        key={noun}
        label={t`One and many in six cases`}
        columns={[t`One`, t`Many`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a form`,
          tip: t`The plural forms are the plural genitive with the ending you already know.`,
        }}
      />
    </Panel>
  );
}

type HeardKind = "one" | "many" | "other";
type HeardItem = ChoiceItem & { said: string; pair: readonly [string, string] };

const HEARD_MEANS: Record<
  (typeof PLURAL_CASE_HEARD)[number]["noun"],
  Record<HeardKind, MessageDescriptor>
> = {
  inimene: {
    one: msg`I’m talking with a person.`,
    many: msg`I’m talking with people.`,
    other: msg`I’m telling people.`,
  },
  sõber: {
    one: msg`He or she writes to a friend.`,
    many: msg`He or she writes to friends.`,
    other: msg`He or she writes about friends.`,
  },
  raamat: {
    one: msg`The pictures are in one book.`,
    many: msg`The pictures are in several books.`,
    other: msg`The pictures are on top of the books.`,
  },
  pood: {
    one: msg`We go to one shop.`,
    many: msg`We go round the shops.`,
    other: msg`We come out of the shops.`,
  },
};

const HEARD_KINDS: readonly HeardKind[] = ["one", "many", "other"];

export const heardOptions = (
  noun: (typeof PLURAL_CASE_HEARD)[number]["noun"],
  kinds: readonly HeardKind[],
  i18n: I18n,
) =>
  kinds.map((kind) => ({
    id: kind,
    label: (
      <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
        {i18n._(HEARD_MEANS[noun][kind])}
      </span>
    ),
  }));

export const heardRun = <T extends { pair: readonly [string, string] }>(
  items: readonly T[],
  pinned: T | undefined,
  reorder: (item: T) => T,
): T[] => eachPairFirst(items, pinned).map((item) => (item === pinned ? item : reorder(item)));

const SHOPPING_GAPS: PassageGap[] = [
  { id: "poodides", before: "Laupäeval käivad Kati ja Mari", after: ".", answer: "poodides" },
  {
    id: "sopradele",
    before: "Nad otsivad kingitusi oma",
    after: ". Raamatupoodides on palju inimesi.",
    answer: "sõpradele",
  },
  { id: "muujatega", before: "Mari räägib", after: "eesti keeles.", answer: "müüjatega" },
  { id: "kottidesse", before: "Kingitused panevad nad", after: ".", answer: "kottidesse" },
];

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const heard: HeardItem[] = PLURAL_CASE_HEARD.flatMap((group) =>
      HEARD_KINDS.map((kind) => ({
        said: group[kind],
        src: src(group[kind]),
        answer: kind,
        options: heardOptions(group.noun, HEARD_KINDS, i18n),
        pair: [group.noun, group[kind]] as const,
        explain:
          kind === "one" ? (
            <Trans>One: the singular genitive with the ending.</Trans>
          ) : (
            <Trans>Many: the plural genitive with the ending.</Trans>
          ),
      })),
    );

    const forms: FormItem[] = PLURAL_CASE_FORM_QUIZ.map((item) => ({
      base: item.dict,
      gloss: i18n._(NOUNS[item.word] as MessageDescriptor),
      cue: t`Plural genitive`,
      answers: [item.answer],
      src: src(item.answer),
      explain: item.answer.endsWith("te") ? (
        <Trans>
          The partitive ends in <b lang="et">-t</b>, so add <b lang="et">-e</b>.
        </Trans>
      ) : (
        <Trans>
          Take the partitive, drop any <b lang="et">-d</b>, and add <b lang="et">-de</b>.
        </Trans>
      ),
    }));

    const sort: SortItem[] = PLURAL_CASE_SORT.map(({ w, bin }) => ({ w, bin, src: src(w) }));

    const pairs: MatchPair[] = PLURAL_CASE_MATCH.map((pair) => ({
      id: pair.one,
      left: pair.one,
      right: pair.many,
      rightLang: "et",
      src: src(pair.many),
    }));

    const translations: (SentenceItem & { pair: readonly [string, string] })[] = [
      {
        kind: "translate",
        id: "talk-people",
        prompt: t`I’m talking with people.`,
        src: src("Ma räägin inimestega."),
        answers: PLURAL_CASE_ANSWERS["Ma räägin inimestega."],
        pair: ["ga", "talk-people"],
      },
      {
        kind: "translate",
        id: "write-friends",
        prompt: t`He or she writes to friends.`,
        src: src("Ta kirjutab sõpradele."),
        answers: PLURAL_CASE_ANSWERS["Ta kirjutab sõpradele."],
        pair: ["le", "write-friends"],
      },
      {
        kind: "translate",
        id: "pictures-books",
        prompt: t`There are pictures in the books.`,
        src: src("Raamatutes on pilte."),
        answers: PLURAL_CASE_ANSWERS["Raamatutes on pilte."],
        pair: ["s", "pictures-books"],
      },
      {
        kind: "translate",
        id: "birds-trees",
        prompt: t`The birds have nests in the trees.`,
        src: src("Lindudel on puudes pesad."),
        answers: PLURAL_CASE_ANSWERS["Lindudel on puudes pesad."],
        pair: ["l", "birds-trees"],
      },
      {
        kind: "translate",
        id: "go-shops",
        prompt: t`We go to the shops.`,
        src: src("Me käime poodides."),
        answers: PLURAL_CASE_ANSWERS["Me käime poodides."],
        pair: ["s", "go-shops"],
        explain: (
          <Trans>
            With <b lang="et">käima</b>, going and coming back, the place takes <b lang="et">-s</b>.
          </Trans>
        ),
      },
      {
        kind: "translate",
        id: "from-schools",
        prompt: t`The children are coming from the schools.`,
        src: src("Lapsed tulevad koolidest."),
        answers: PLURAL_CASE_ANSWERS["Lapsed tulevad koolidest."],
        pair: ["st", "from-schools"],
      },
      {
        kind: "translate",
        id: "cinema-friends",
        prompt: t`I’m going to the cinema with friends.`,
        src: src("Ma lähen sõpradega kinno."),
        answers: PLURAL_CASE_ANSWERS["Ma lähen sõpradega kinno."],
        pair: ["ga", "cinema-friends"],
      },
    ];

    const fixWhy: Record<string, ReactNode> = {
      "Ma räägin inimestega.": (
        <Trans>
          The plural genitive is <b lang="et">inimeste</b>, so <b lang="et">inimestega</b>, not the
          plural nominative <b lang="et">inimesed</b>.
        </Trans>
      ),
      "Ta kirjutab sõpradele.": (
        <Trans>
          The plural genitive is built on the partitive <b lang="et">sõpra</b>:{" "}
          <b lang="et">sõprade</b>, <b lang="et">sõpradele</b>.
        </Trans>
      ),
      "Raamatutes on pilte.": (
        <Trans>
          <b lang="et">Raamatut</b> ends in <b lang="et">-t</b>, so the plural genitive is{" "}
          <b lang="et">raamatute</b>: <b lang="et">raamatutes</b>.
        </Trans>
      ),
      "Me käime poodides.": (
        <Trans>
          The partitive is <b lang="et">poodi</b>, so <b lang="et">poodide</b>,{" "}
          <b lang="et">poodides</b>.
        </Trans>
      ),
      "Me kirjutame kirju lastele.": (
        <Trans>
          The partitive of <b lang="et">laps</b> is <b lang="et">last</b>, so the plural genitive is{" "}
          <b lang="et">laste</b>: <b lang="et">lastele</b>.
        </Trans>
      ),
      "Ma lähen sõpradega kinno.": (
        <Trans>
          The plural genitive is <b lang="et">sõprade</b>, from <b lang="et">sõpra</b>:{" "}
          <b lang="et">sõpradega</b>.
        </Trans>
      ),
      "Õpetajatele meeldib kohv.": (
        <Trans>
          <b lang="et">Õpetajat</b> ends in <b lang="et">-t</b>: <b lang="et">õpetajate</b>,{" "}
          <b lang="et">õpetajatele</b>.
        </Trans>
      ),
    };
    const fixes: FixItem[] = PLURAL_CASE_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${clipId(item.right)}`,
      wrong: item.wrong,
      answers: PLURAL_CASE_FIX_ANSWERS[item.right] ?? [item.right],
      src: src(item.right),
      explain: fixWhy[item.right],
    }));

    const exam: PassageQuestion[] = [
      {
        id: "alone",
        kind: "truefalse",
        ask: t`Mari spent the weekend in Tartu on her own.`,
        answer: false,
        line: 3,
      },
      {
        id: "saturday",
        ask: t`Where did they go on Saturday?`,
        options: [
          { id: "shops", label: t`To the shops` },
          { id: "museums", label: t`To museums and cafés` },
          { id: "market", label: t`To a market by the river` },
        ],
        answer: "museums",
        line: 5,
      },
      {
        id: "stayed",
        kind: "short",
        ask: t`Where did they stay the night? Write the last two words Mari says.`,
        answers: ["sõbra juures"],
        line: 12,
      },
      {
        id: "presents",
        kind: "truefalse",
        ask: t`Mari bought presents for her sisters.`,
        answer: true,
        line: 18,
      },
      {
        id: "believe",
        ask: t`What did the shop assistant not believe?`,
        options: [
          { id: "from", label: t`That Mari is from Tartu` },
          { id: "years", label: t`That Mari has been learning Estonian for only two years` },
          { id: "books", label: t`That she bought two books` },
        ],
        answer: "years",
        line: 25,
      },
      {
        id: "photos",
        kind: "short",
        ask: t`What were the old photos kept in? Write the word as Jaan says it.`,
        answers: ["kastides"],
        line: 33,
      },
      {
        id: "dog",
        kind: "truefalse",
        ask: t`The dog sleeps under the children’s beds.`,
        answer: true,
        line: 37,
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
          { id: "kitchen", label: t`We talked for hours.`, answer: "mari", line: 15 },
          { id: "estonian", label: t`I spoke only Estonian.`, answer: "mari", line: 22 },
          { id: "letters", label: t`I wrote letters.`, answer: "jaan", line: 29 },
          { id: "cakes", label: t`I’ll bring cakes.`, answer: "mari", line: 44 },
          { id: "welcome", label: t`Everyone is welcome.`, answer: "jaan", line: 49 },
        ],
      },
    ];

    return { heard, forms, sort, pairs, translations, fixes, exam };
  }, [t, i18n]);
}

const pairRun = <T extends { pair: readonly [string, string] }>(items: readonly T[], pinned?: T) =>
  eachPairFirst(items, pinned);

export function MajadesInimesteleLesson() {
  const { t } = useLingui();
  const content = useContent();
  const plural = lessonBySlug("mitmus")?.n;
  const forms = lessonBySlug("pohivormid")?.n;
  const inside = lessonBySlug("majas-majja-majast")?.n;
  const names = { main: t`Jaan`, second: t`Mari` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Most plural cases are one step away from the singular ones: build the plural genitive,
          then add the ending you already know.
        </Trans>
      }
      facts={[
        <Trans key="m">22 minutes</Trans>,
        <Trans key="q">8 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["majades", "inimestele", "majade", "inimeste", "sõprade", "raamatute"]}
      recap={[
        <Trans key="1">
          In most nouns the plural genitive comes from the partitive. A partitive in{" "}
          <b lang="et">-t</b> adds <b lang="et">-e</b>: <b lang="et">raamatut, raamatute</b>. Any
          other drops any <b lang="et">-d</b> and adds <b lang="et">-de</b>:{" "}
          <b lang="et">maja, majade</b>; <b lang="et">puud, puude</b>.
        </Trans>,
        <Trans key="2">
          The plurals with <b lang="et">-s</b>, <b lang="et">-st</b>, <b lang="et">-sse</b>,{" "}
          <b lang="et">-le</b>, <b lang="et">-l</b> and <b lang="et">-ga</b> are the plural genitive
          plus that ending: <b lang="et">majades, inimestele, sõpradega</b>.
        </Trans>,
        <Trans key="3">
          Not the plural nominative: <b lang="et">inimestega</b>, not <b lang="et">inimesedega</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "stem",
          title: t`The plural genitive`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In the singular, the endings of lesson {inside} go on the genitive:{" "}
                    <b lang="et">maja, majas</b>. In the plural they go on the plural genitive:{" "}
                    <Word w="majade" />, of houses, and <Word w="majades" />, in houses.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The plural genitive usually comes from the partitive, the third of lesson{" "}
                    {forms}’s three forms. If the partitive ends in <b lang="et">-t</b>, add{" "}
                    <b lang="et">-e</b>: <Word w="raamatute" />. If not, drop any{" "}
                    <b lang="et">-d</b> and add <b lang="et">-de</b>: <Word w="sõprade" />. Tap each
                    form in both columns to hear it.
                  </Trans>
                </p>
              </Prose>
              <StemTable />
              <Aside>
                <Trans>
                  Some words have a second, shorter plural, such as <b lang="et">majus</b> beside{" "}
                  <b lang="et">majades</b>. The long one is always right, so this lesson uses it.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>
                    Each round gives a noun’s three forms, as a dictionary lists them. Type its
                    plural genitive.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-plural-genitive"
                title={<Trans>Type the plural genitive</Trans>}
                items={content.forms}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, typed in full.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Look at the partitive in the ones you got wrong.</Trans>
                  ) : (
                    <Trans>Tap each form in the table once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "de-or-te",
          title: t`Two endings`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Put each plural genitive in the bin of its ending. Ask what the partitive ends
                    in.
                  </Trans>
                </p>
              </Prose>
              <Sort
                id="de-or-te"
                title={<Trans>Which ending?</Trans>}
                bins={[
                  {
                    id: "de",
                    label: "-de",
                    rule: (
                      <Trans>
                        The partitive doesn’t end in <b lang="et">-t</b>:{" "}
                        <b lang="et">sõpra, sõprade</b>.
                      </Trans>
                    ),
                  },
                  {
                    id: "te",
                    label: "-te",
                    rule: (
                      <Trans>
                        The partitive ends in <b lang="et">-t</b>, so it adds <b lang="et">-e</b>:{" "}
                        <b lang="et">inimest, inimeste</b>.
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
          id: "cases",
          title: t`Every case on one stem`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Add any ending you know to the plural genitive: <b lang="et">-s</b>,{" "}
                    <b lang="et">-st</b>, <b lang="et">-sse</b>, <b lang="et">-le</b>,{" "}
                    <b lang="et">-l</b>, <b lang="et">-ga</b>. <Word w="Inimestele" /> is to people;{" "}
                    <b lang="et">sõpradega</b> is with friends. Pick a noun and compare the columns.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Don’t build on the plural nominative from lesson {plural}: it’s{" "}
                    <b lang="et">inimestega</b>, not <b lang="et">inimesedega</b>.
                  </Trans>
                </p>
              </Prose>
              <CaseTable />
              <Prose>
                <p>
                  <Trans>Match each singular form with its plural.</Trans>
                </p>
              </Prose>
              <Match
                id="one-to-many"
                title={<Trans>One and many</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="o">One</Trans>, <Trans key="m">Many</Trans>]}
              />
            </>
          ),
        },
        {
          id: "hear",
          title: t`One or many, by ear`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence, then pick what it means. Listen for the plural genitive and for
                    the ending after it.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="one-or-many"
                title={<Trans>What does it mean?</Trans>}
                items={content.heard}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight. You heard both the number and the case.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you got wrong once more.</Trans>
                  ) : (
                    <Trans>Compare the columns of the table once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={(items, pinned) =>
                  heardRun(items, pinned, (item) => ({ ...item, options: shuffle(item.options) }))
                }
                round={(props) => <ChoiceRound {...props} />}
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
                    Write each sentence in Estonian. Each one has a plural noun in a case.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-plural-cases"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven, each plural on its genitive.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the plural genitive in the ones you got wrong.</Trans>
                  ) : (
                    <Trans>Tap each form in the first table once more, then try again.</Trans>
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
          title: t`Fix the plural`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has one plural built on the wrong stem. Tap it, then type it
                    right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-plural-case"
                title={<Trans>Fix the sentence</Trans>}
                items={content.fixes}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Read the reason under each one you got wrong.</Trans>
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
          id: "shopping",
          title: t`Saturday shopping`,
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
                id="saturday-shopping"
                title={<Trans>Fill the gaps</Trans>}
                gaps={SHOPPING_GAPS}
                mode="drag"
                spare={["poodidesse", "müüjad"]}
                clip="p-shopping"
              />
            </>
          ),
        },
        {
          id: "weekend",
          title: t`Mari’s weekend in Tartu`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Jaan asks Mari about her weekend, and tells her about his.</Trans>
                </p>
              </Prose>
              <Listening
                id="weekend-tartu"
                title={<Trans>Listen: Jaan and Mari</Trans>}
                clip="c-weekend"
                turns={PLURAL_CASE_CONVERSATION.turns}
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
