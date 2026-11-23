import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  GRADATION_CASES,
  GRADATION_CONVERSATION,
  GRADATION_FIXES,
  GRADATION_FORM_QUIZ,
  GRADATION_KINDS,
  GRADATION_MATCH,
  GRADATION_SORT,
  GRADATION_VERBS,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Sort, type SortItem } from "../Sort";
import { Word } from "../Word";

const SLUG = "jalg-jala";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Kind = keyof typeof GRADATION_KINDS;
const KINDS = Object.keys(GRADATION_KINDS) as Kind[];

const MEANS: Record<string, MessageDescriptor> = {
  kapp: msg`cupboard`,
  kott: msg`bag`,
  tükk: msg`piece`,
  pank: msg`bank`,
  park: msg`park`,
  lamp: msg`lamp`,
  jalg: msg`foot, leg`,
  tuba: msg`room`,
  pood: msg`shop`,
  mägi: msg`hill, mountain`,
  lind: msg`bird`,
  rand: msg`beach`,
  kuld: msg`gold`,
  mõte: msg`thought, idea`,
  hammas: msg`tooth`,
  rikas: msg`rich`,
  lugema: msg`to read`,
  rääkima: msg`to speak`,
  õppima: msg`to learn`,
  ootama: msg`to wait`,
  vaatama: msg`to look, to watch`,
  hakkama: msg`to start`,
};

const KIND_LABELS: Record<Kind, MessageDescriptor> = {
  double: msg`Double to single`,
  soft: msg`Hard to soft`,
  gone: msg`Dropped`,
  blend: msg`Blended`,
  other: msg`The other way`,
};

const GLOSSARY: Glossary = {
  jalg: { en: msg`foot, leg`, note: msg`Jalg, jala, jalga.` },
  jala: { en: msg`foot, leg`, note: msg`The genitive of jalg: the g is gone.` },
  tuba: { en: msg`room`, note: msg`Tuba, toa, tuba.` },
  toa: { en: msg`room`, note: msg`The genitive of tuba: the b is gone and u turns into o.` },
  kapp: { en: msg`cupboard`, note: msg`Kapp, kapi, kappi.` },
  kapi: { en: msg`cupboard`, note: msg`The genitive of kapp: pp turns into p.` },
  pank: { en: msg`bank`, note: msg`Pank, panga, panka.` },
  panga: { en: msg`bank`, note: msg`The genitive of pank: k turns into g.` },
  lind: { en: msg`bird`, note: msg`Lind, linnu, lindu.` },
  linnu: { en: msg`bird`, note: msg`The genitive of lind: nd turns into nn.` },
  mõte: { en: msg`thought, idea`, note: msg`Mõte, mõtte, mõtet.` },
  mõtte: { en: msg`thought, idea`, note: msg`The genitive of mõte: here t turns into tt.` },
  poodi: { en: msg`into the shop`, note: msg`The short “into” form of pood keeps its d.` },
  lugema: { en: msg`to read` },
  loen: { en: msg`I read`, note: msg`From lugema: the g is gone and u turns into o.` },
};

function KindTable() {
  const { t, i18n } = useLingui();
  const [kind, setKind] = useState<Kind>("gone");
  const tips: Record<Kind, ReactNode> = {
    double: (
      <Trans>
        A double letter goes single: <b lang="et">kapp, kapi</b>.
      </Trans>
    ),
    soft: (
      <Trans>
        k turns into g, p into b and t into d: <b lang="et">pank, panga</b>;{" "}
        <b lang="et">lamp, lambi</b>.
      </Trans>
    ),
    gone: (
      <Trans>
        g, b or d is gone, and the vowel next to it may change: <b lang="et">tuba, toa</b>.
      </Trans>
    ),
    blend: (
      <Trans>
        d takes the sound of the letter before it: <b lang="et">lind, linnu</b>;{" "}
        <b lang="et">kuld, kulla</b>.
      </Trans>
    ),
    other: (
      <Trans>
        Here the genitive is the strong one: <b lang="et">mõte, mõtte</b>;{" "}
        <b lang="et">hammas, hamba</b>.
      </Trans>
    ),
  };
  const rows: ParadigmRow[] = GRADATION_KINDS[kind].map((noun) => ({
    id: noun.word,
    label: i18n._(MEANS[noun.word] as MessageDescriptor),
    et: noun.word,
    tip: tips[kind],
    cells: [
      { form: noun.word, src: src(noun.word) },
      { form: noun.of, src: src(noun.of) },
      { form: noun.part, src: src(noun.part) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Kinds of change`}
        items={KINDS.map((each) => ({ label: i18n._(KIND_LABELS[each]), value: each }))}
        value={kind}
        onPick={setKind}
      />
      <Paradigm
        key={kind}
        label={t`Nominative, genitive and partitive`}
        columns={[t`Nominative`, t`Genitive`, t`Partitive`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{ title: t`Tap a form`, tip: tips[kind] }}
      />
    </Panel>
  );
}

function CaseTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = GRADATION_CASES.map((noun) => ({
    id: noun.word,
    label: i18n._(MEANS[noun.word] as MessageDescriptor),
    et: noun.word,
    cells: noun.forms.map((form) => ({ form, src: src(form) })),
  }));
  return (
    <Panel>
      <Paradigm
        label={t`Strong and weak forms of four nouns`}
        columns={[t`Nominative`, t`Partitive`, t`Genitive`, t`In or on`, t`More than one`]}
        rows={rows}
        empty={{
          title: t`Tap a form`,
          tip: t`The first two columns are strong. The genitive and the forms built on it are weak.`,
        }}
      />
    </Panel>
  );
}

function VerbTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = GRADATION_VERBS.map((verb) => ({
    id: verb.ma,
    label: i18n._(MEANS[verb.ma] as MessageDescriptor),
    et: verb.ma,
    cells: [
      {
        form: verb.ma,
        src: src(verb.ma),
        note: (
          <Trans>
            The <b lang="et">-ma</b> infinitive.
          </Trans>
        ),
      },
      {
        form: verb.da,
        src: src(verb.da),
        note: (
          <Trans>
            The <b lang="et">-da</b> infinitive.
          </Trans>
        ),
      },
      { form: verb.present, src: src(verb.present), note: <Trans>The present, for “I”.</Trans> },
    ],
  }));
  return (
    <Panel>
      <Paradigm
        label={t`Three forms of six verbs`}
        rows={rows}
        empty={{
          title: t`Tap a form`,
          tip: (
            <Trans>
              Each row holds the <b lang="et">-ma</b> infinitive, the <b lang="et">-da</b>{" "}
              infinitive and the present. The <b lang="et">-ma</b> infinitive is strong.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

type Grade = "strong" | "weak";
type GradeItem = ChoiceItem & { said: string; pair: readonly [string, string] };

const GRADE_LABELS: Record<Grade, MessageDescriptor> = {
  strong: msg`Strong, like the nominative`,
  weak: msg`Weak, like the genitive`,
};

export const gradeOptions = (grades: readonly Grade[], i18n: I18n) =>
  grades.map((grade) => ({
    id: grade,
    label: (
      <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
        {i18n._(GRADE_LABELS[grade])}
      </span>
    ),
  }));

export const gradeRun = <T extends { pair: readonly [string, string] }>(
  items: readonly T[],
  pinned: T | undefined,
  reorder: (item: T) => T,
): T[] => eachPairFirst(items, pinned).map((item) => (item === pinned ? item : reorder(item)));

const CUES: Record<(typeof GRADATION_FORM_QUIZ)[number]["cue"], MessageDescriptor> = {
  in: msg`In the …`,
  on: msg`On the …`,
  many: msg`More than one`,
};

const ROOM_GAPS: GapItem[] = [
  { id: "tuba", before: "Kati", after: "on väike.", answer: "tuba" },
  { id: "toas", before: "Kati", after: "on laud ja kapp.", answer: "toas" },
  { id: "kapi", before: "Raamatud on", after: "peal.", answer: "kapi" },
  { id: "poodi", before: "Õhtul läheb ta", after: ".", answer: "poodi" },
  { id: "poest", before: "Ta tuleb", after: "koju kell viis.", answer: "poest" },
];

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    type Noun = { word: string; of: string; part: string };
    const usual = (["double", "soft", "gone", "blend"] as const).flatMap((kind): readonly Noun[] =>
      GRADATION_KINDS[kind].slice(0, 2),
    );
    const grade: GradeItem[] = usual.flatMap((noun, i) =>
      (["weak", "strong"] as const).map((answer, k) => {
        const said = answer === "weak" ? noun.of : noun.part;
        const means = i18n._(MEANS[noun.word] as MessageDescriptor);
        const word = noun.word;
        return {
          said,
          src: src(said),
          answer,
          pair: [noun.word, said] as const,
          options: gradeOptions((i + k) % 2 === 0 ? ["strong", "weak"] : ["weak", "strong"], i18n),
          explain:
            answer === "weak" ? (
              <Trans>
                <b lang="et">{said}</b> is the genitive of <b lang="et">{word}</b>, {means}.
              </Trans>
            ) : (
              <Trans>
                <b lang="et">{said}</b> is the partitive of <b lang="et">{word}</b>, {means}.
              </Trans>
            ),
        };
      }),
    );

    const pairs: MatchPair[] = GRADATION_MATCH.map((noun) => ({
      id: noun.word,
      left: noun.word,
      right: noun.of,
      rightLang: "et",
      src: src(noun.of),
    }));

    const sort: SortItem[] = GRADATION_SORT.map(({ w, strong }) => ({
      w,
      bin: strong ? "strong" : "weak",
      src: src(w),
    }));

    const forms: (FormItem & { pair: readonly [string, string] })[] = GRADATION_FORM_QUIZ.map(
      (item) => ({
        base: item.word,
        gloss: i18n._(MEANS[item.word] as MessageDescriptor),
        cue: i18n._(CUES[item.cue]),
        answers: [item.answer],
        src: src(item.said),
        said: item.said,
        pair: [item.word, item.said] as const,
        explain:
          item.cue === "many" ? (
            <Trans>The plural is built on the genitive, so it takes the weak form.</Trans>
          ) : (
            <Trans>
              <b lang="et">-s</b> and <b lang="et">-l</b> go on the genitive, so the weak form.
            </Trans>
          ),
      }),
    );

    const translations: (SentenceItem & { pair: readonly [string, string] })[] = [
      {
        kind: "translate",
        id: "in-room",
        prompt: t`Kati is in the room.`,
        src: src("Kati on toas."),
        answers: ["Kati on toas."],
        pair: ["in", "in-room"],
      },
      {
        kind: "translate",
        id: "at-bank",
        prompt: t`Jaan is at the bank.`,
        src: src("Jaan on pangas."),
        answers: ["Jaan on pangas."],
        pair: ["in", "at-bank"],
      },
      {
        kind: "translate",
        id: "in-park",
        prompt: t`The children are in the park.`,
        src: src("Lapsed on pargis."),
        answers: ["Lapsed on pargis."],
        pair: ["in", "in-park"],
      },
      {
        kind: "translate",
        id: "on-beach",
        prompt: t`We’re on the beach.`,
        src: src("Me oleme rannas."),
        answers: ["Me oleme rannas.", "Meie oleme rannas.", "Oleme rannas."],
        pair: ["in", "on-beach"],
        explain: (
          <Trans>
            On a beach is <b lang="et">rannas</b>, with <b lang="et">-s</b>.
          </Trans>
        ),
      },
      {
        kind: "translate",
        id: "in-cupboard",
        prompt: t`The bag is in the cupboard.`,
        src: src("Kott on kapis."),
        answers: ["Kott on kapis."],
        pair: ["in", "in-cupboard"],
      },
      {
        kind: "translate",
        id: "tired-feet",
        prompt: t`My feet are tired.`,
        src: src("Mu jalad on väsinud."),
        answers: ["Mu jalad on väsinud.", "Minu jalad on väsinud."],
        pair: ["many", "tired-feet"],
      },
      {
        kind: "translate",
        id: "birds",
        prompt: t`The birds are in the park.`,
        src: src("Linnud on pargis."),
        answers: ["Linnud on pargis."],
        pair: ["many", "birds"],
      },
    ];

    const fixWhy: Record<string, ReactNode> = {
      "Kass on kapis.": (
        <Trans>
          <b lang="et">-s</b> goes on the genitive <b lang="et">kapi</b>: <b lang="et">kapis</b>.
        </Trans>
      ),
      "Me oleme pangas.": (
        <Trans>
          <b lang="et">-s</b> goes on the genitive <b lang="et">panga</b>: <b lang="et">pangas</b>.
        </Trans>
      ),
      "Kati on toas.": (
        <Trans>
          <b lang="et">-s</b> goes on the genitive <b lang="et">toa</b>: <b lang="et">toas</b>.
        </Trans>
      ),
      "Linnud on pargis.": (
        <Trans>
          The plural goes on the genitive <b lang="et">linnu</b>: <b lang="et">linnud</b>.
        </Trans>
      ),
      "Ma loen raamatut.": (
        <Trans>
          The present of <b lang="et">lugema</b> is weak: <b lang="et">loen</b>.
        </Trans>
      ),
      "Ma õpin eesti keelt.": (
        <Trans>
          The present of <b lang="et">õppima</b> is weak: <b lang="et">õpin</b>.
        </Trans>
      ),
      "Ta räägib eesti keelt.": (
        <Trans>
          The present of <b lang="et">rääkima</b> is weak: <b lang="et">räägib</b>.
        </Trans>
      ),
    };
    const fixes: FixItem[] = GRADATION_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${clipId(item.right)}`,
      wrong: item.wrong,
      answers: [item.right],
      src: src(item.right),
      explain: fixWhy[item.right],
    }));

    const exam: PassageQuestion[] = [
      { id: "big", kind: "truefalse", ask: t`Kati’s room is big.`, answer: false, line: 5 },
      {
        id: "books",
        ask: t`Where are Kati’s books?`,
        options: [
          { id: "table", label: t`On the table` },
          { id: "in", label: t`In the cupboard` },
          { id: "on", label: t`On top of the cupboard` },
        ],
        answer: "in",
        line: 8,
      },
      {
        id: "shop",
        kind: "short",
        ask: t`Where is the shop? Write it in two words, as Kati says it.`,
        answers: ["nurga taga"],
        line: 13,
      },
      {
        id: "bank",
        kind: "truefalse",
        ask: t`Kati pays with her phone.`,
        answer: true,
        line: 18,
      },
      {
        id: "beach",
        ask: t`When does Kati go to the beach?`,
        options: [
          { id: "saturday", label: t`Only on Saturdays` },
          { id: "morning", label: t`In the morning` },
          { id: "day", label: t`Every day` },
        ],
        answer: "saturday",
        line: 25,
      },
      {
        id: "mother",
        kind: "truefalse",
        ask: t`Kati’s mother lives in Tartu.`,
        answer: true,
        line: 27,
      },
      {
        id: "who",
        kind: "match",
        ask: t`Who says it?`,
        options: [
          { id: "kati", label: t`Kati` },
          { id: "jaan", label: t`Jaan` },
        ],
        statements: [
          { id: "every-day", label: t`I go to the shop every day.`, answer: "kati", line: 14 },
          { id: "often", label: t`Do you often go to the bank?`, answer: "jaan", line: 16 },
          { id: "run", label: t`I run in the park in the morning.`, answer: "kati", line: 21 },
          { id: "tired", label: t`My feet are tired.`, answer: "jaan", line: 30 },
          { id: "tea", label: t`I’ll make tea.`, answer: "kati", line: 33 },
        ],
      },
    ];

    return { grade, pairs, sort, forms, translations, fixes, exam };
  }, [t, i18n]);
}

const pairRun = <T extends { pair: readonly [string, string] }>(items: readonly T[], pinned?: T) =>
  eachPairFirst(items, pinned);

export function JalgJalaLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const genitive = lessonBySlug("omastav")?.n;
  const stems = lessonBySlug("pood-poe")?.n;
  const inside = lessonBySlug("majas-majja-majast")?.n;
  const verbForms = lessonBySlug("verbi-pohivormid")?.n;
  const plural = lessonBySlug("mitmus")?.n;
  const names = { second: t`Kati`, main: t`Jaan` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Why <b lang="et">jalg</b> becomes <b lang="et">jala</b> and <b lang="et">tuba</b> becomes{" "}
          <b lang="et">toa</b>: which forms take the weak consonant, the four ways it weakens, and
          the same change in verbs.
        </Trans>
      }
      facts={[
        <Trans key="m">20 minutes</Trans>,
        <Trans key="q">8 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["jalg", "tuba", "kapp", "pank", "lind", "mõte", "lugema"]}
      recap={[
        <Trans key="1">
          Many words have a strong and a weak form of the consonant inside:{" "}
          <b lang="et">jalg, jala</b>; <b lang="et">kapp, kapi</b>.
        </Trans>,
        <Trans key="2">
          The nominative and the partitive are strong. The genitive and every form built on it are
          weak: <b lang="et">jala, jalal, jalad</b>. The short “into” form is strong:{" "}
          <b lang="et">poodi</b>.
        </Trans>,
        <Trans key="3">
          The weak form goes single, turns soft, drops the letter or blends it:{" "}
          <b lang="et">kapi, panga, toa, linnu</b>. A few words go the other way:{" "}
          <b lang="et">mõte, mõtte</b>.
        </Trans>,
        <Trans key="4">
          Verbs change too. The <b lang="et">-ma</b> infinitive is strong, and the present is often
          weak: <b lang="et">lugema, loen</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "odd-one-out",
          title: t`The genitive is the odd one out`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {stems} showed that a stem can lose or change a letter inside:{" "}
                    <Word w="tuba" />, room, has the stem <Word w="toa" />. This change is called
                    consonant gradation. The word changes inside, as foot and feet do in English.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The consonant has a strong form and a weak one. The nominative and the partitive
                    have one, and the genitive of lesson {genitive} has the other: <Word w="jalg" />
                    , <Word w="jala" />, <b lang="et">jalga</b>. Pick a kind of change and tap the
                    forms.
                  </Trans>
                </p>
              </Prose>
              <KindTable />
              <Aside>
                <Trans>
                  The nominative doesn’t tell you which change a word makes, or whether it makes
                  one. Learn each noun with its genitive and partitive, as a dictionary lists them.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>
                    Hear a form of a word from the table, then say whether it’s strong, like the
                    nominative, or weak, like the genitive.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="strong-or-weak"
                title={<Trans>Strong or weak?</Trans>}
                items={content.grade}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight. You heard the difference every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Switch through the kinds in the table, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={(items, pinned) =>
                  gradeRun(items, pinned, (item) => ({
                    ...item,
                    options: gradeOptions(shuffle(["strong", "weak"] as Grade[]), i18n),
                  }))
                }
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "four-ways",
          title: t`Four ways to weaken`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The weak form is shorter or softer than the strong one, in one of four ways:
                  </Trans>
                </p>
                <ul>
                  <li>
                    <Trans>
                      A double letter goes single: <Word w="kapp" />, <Word w="kapi" />.
                    </Trans>
                  </li>
                  <li>
                    <Trans>
                      A hard letter turns soft, k into g, p into b and t into d: <Word w="pank" />,{" "}
                      <Word w="panga" />.
                    </Trans>
                  </li>
                  <li>
                    <Trans>
                      g, b or d is gone, and the vowel next to it may change: <Word w="tuba" />,{" "}
                      <Word w="toa" />.
                    </Trans>
                  </li>
                  <li>
                    <Trans>
                      d blends into the letter before it: <Word w="lind" />, <Word w="linnu" />.
                    </Trans>
                  </li>
                </ul>
                <p>
                  <Trans>
                    A few words go the other way: the nominative is weak and the genitive strong.{" "}
                    <Word w="mõte" />, thought, has the genitive <Word w="mõtte" />. The genitive is
                    still the odd one out.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Match six words you haven’t met in this lesson with their genitives. Each one
                    weakens in one of the four ways.
                  </Trans>
                </p>
              </Prose>
              <Match
                id="new-genitives"
                title={<Trans>Which genitive?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="w">Nominative</Trans>, <Trans key="g">Genitive</Trans>]}
              />
            </>
          ),
        },
        {
          id: "which-forms",
          title: t`Which forms are weak`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Every form built on the genitive is weak too: in and on with <b lang="et">-s</b>{" "}
                    and <b lang="et">-l</b>, and the plural with <b lang="et">-d</b> from lesson{" "}
                    {plural}. So on the foot is <b lang="et">jalal</b>, and feet are{" "}
                    <b lang="et">jalad</b>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The short “into” forms of lesson {inside} are built like the partitive, so they
                    stay strong: into the shop is <Word w="poodi" />, but in the shop is{" "}
                    <b lang="et">poes</b>.
                  </Trans>
                </p>
              </Prose>
              <CaseTable />
              <Prose>
                <p>
                  <Trans>Put each form in its bin. Listen for the consonant in the middle.</Trans>
                </p>
              </Prose>
              <Sort
                id="strong-weak-sort"
                title={<Trans>Strong or weak form?</Trans>}
                bins={[
                  {
                    id: "strong",
                    label: t`Strong`,
                    lang: i18n.locale,
                    hint: t`nominative, partitive, into`,
                    rule: t`The partitive and the short “into” form are strong.`,
                  },
                  {
                    id: "weak",
                    label: t`Weak`,
                    lang: i18n.locale,
                    hint: t`genitive, in, on, plural`,
                    rule: (
                      <Trans>
                        <b lang="et">-s</b>, <b lang="et">-l</b> and the plural <b lang="et">-d</b>{" "}
                        go on the genitive, so they are weak.
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
          title: t`Make the weak form`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round gives a noun’s nominative and what to make of it. Type the form.
                    Every answer is built on the genitive, so start from its weak form.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-weak"
                title={<Trans>Type the form</Trans>}
                items={content.forms}
                rounds={9}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All nine, typed in full.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Tap the forms in the tables for the ones you missed.</Trans>
                  ) : (
                    <Trans>Tap the forms in the tables once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={pairRun}
                round={(props) => <FormRound {...props} />}
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
                    Write each sentence in Estonian. Each place and each plural takes the weak form.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-weak"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences, each with the weak form.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Look at the place in the ones you missed.</Trans>
                  ) : (
                    <Trans>Tap the forms in the tables once more, then try again.</Trans>
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
          id: "verbs",
          title: t`The same change in verbs`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Verbs weaken the same way. Of the three forms of lesson {verbForms}, the{" "}
                    <b lang="et">-ma</b> infinitive is strong. The <b lang="et">-da</b> infinitive,
                    the present or both can be weak: <Word w="lugema" />, <b lang="et">lugeda</b>,{" "}
                    <Word w="loen" />.
                  </Trans>
                </p>
              </Prose>
              <VerbTable />
              <Aside>
                <Trans>
                  In <b lang="et">ootama</b> and <b lang="et">vaatama</b> the present stays strong
                  and the <b lang="et">-da</b> infinitive weakens: <b lang="et">ootan</b>, but{" "}
                  <b lang="et">oodata</b>. <b lang="et">Hakkama</b> keeps kk in the present and
                  weakens in <b lang="et">hakata</b>.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has one word with the strong form where the weak one belongs. Tap
                    it, then type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-weak"
                title={<Trans>Fix the sentence</Trans>}
                items={content.fixes}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Read the reason under each one you missed.</Trans>
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
          id: "room",
          title: t`In Kati’s room`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Drag a form into each gap, or tap one to fill the open gap. Three of the words
                    belong nowhere.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="kati-room"
                title={<Trans>Fill the gaps</Trans>}
                gaps={ROOM_GAPS}
                mode="drag"
                spare={["toa", "kappi", "poes"]}
                clip="p-room"
              />
            </>
          ),
        },
        {
          id: "new-flat",
          title: t`Kati’s new flat`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Jaan visits Kati’s new flat and asks what is near it.</Trans>
                </p>
              </Prose>
              <Listening
                id="new-flat"
                title={<Trans>Listen: Kati and Jaan</Trans>}
                clip="c-new-flat"
                turns={GRADATION_CONVERSATION.turns}
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
