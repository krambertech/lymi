import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  GRADATION_KINDS,
  GRADATION_MATCH,
  GRADATION_VERBS,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "jalg-jala";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Kind = keyof typeof GRADATION_KINDS;
const KINDS = Object.keys(GRADATION_KINDS) as Kind[];

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

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
  aed: msg`garden`,
  lugu: msg`story`,
  kord: msg`time, as in one time`,
  tund: msg`hour, lesson`,
  sokk: msg`sock`,
  sild: msg`bridge`,
  lugema: msg`to read`,
  rääkima: msg`to speak`,
  õppima: msg`to learn`,
  ootama: msg`to wait`,
  vaatama: msg`to look, to watch`,
  hakkama: msg`to start, to be going to`,
};

const KIND_LABELS: Record<Kind, MessageDescriptor> = {
  double: msg`Double to single`,
  soft: msg`Hard to soft`,
  gone: msg`Gone`,
  blend: msg`Blended`,
  other: msg`The other way`,
};

const GLOSSARY: Glossary = {
  jalg: { en: msg`foot, leg` },
  jala: { en: msg`of the foot`, note: msg`The genitive of jalg: the g is gone.` },
  tuba: { en: msg`room` },
  toa: { en: msg`of the room`, note: msg`The genitive of tuba: the b is gone and u turns into o.` },
  kapp: { en: msg`cupboard` },
  kapi: { en: msg`of the cupboard`, note: msg`The genitive of kapp: pp turns into p.` },
  pank: { en: msg`bank` },
  panga: { en: msg`of the bank`, note: msg`The genitive of pank: k turns into g.` },
  lind: { en: msg`bird` },
  linnu: { en: msg`of the bird`, note: msg`The genitive of lind: nd turns into nn.` },
  mõte: { en: msg`thought, idea` },
  mõtte: { en: msg`of the thought`, note: msg`The genitive of mõte: here t turns into tt.` },
  poodi: { en: msg`into the shop`, note: msg`The short “into” form of pood keeps its d.` },
  lugema: { en: msg`to read` },
  loen: { en: msg`I read`, note: msg`From lugema: the g is gone and u turns into o.` },
};

const ROOM_GAPS: GapItem[] = [
  {
    id: "tuba",
    before: "Kati",
    after: "on väike.",
    answer: "tuba",
    options: ["toa", "tuba", "toas"],
  },
  {
    id: "toas",
    before: "Kati",
    after: "on laud ja kapp.",
    answer: "toas",
    options: ["toas", "tuba", "toa"],
  },
  {
    id: "kapi",
    before: "Raamatud on",
    after: "peal.",
    answer: "kapi",
    options: ["kapis", "kapi", "kapp"],
  },
  {
    id: "poodi",
    before: "Õhtul läheb ta",
    after: ".",
    answer: "poodi",
    options: ["pood", "poest", "poodi"],
  },
  {
    id: "poest",
    before: "Ta tuleb",
    after: "kell viis.",
    answer: "poest",
    options: ["poes", "poest", "poodi"],
  },
];

function KindTable() {
  const { t, i18n } = useLingui();
  const [kind, setKind] = useState<Kind>("gone");
  const tips: Record<Kind, ReactNode> = {
    double: (
      <Trans>
        A double letter goes single: <Et>kapp, kapi</Et>.
      </Trans>
    ),
    soft: (
      <Trans>
        k turns into g and p into b: <Et>pank, panga</Et>; <Et>lamp, lambi</Et>.
      </Trans>
    ),
    gone: (
      <Trans>
        g, b or d is gone, and the vowel before it may change: <Et>tuba, toa</Et>.
      </Trans>
    ),
    blend: (
      <Trans>
        d takes the sound of the letter before it: <Et>lind, linnu</Et>; <Et>kuld, kulla</Et>.
      </Trans>
    ),
    other: (
      <Trans>
        Here the dictionary form is the short one, and the genitive is long: <Et>mõte, mõtte</Et>.
      </Trans>
    ),
  };
  const rows: ParadigmRow[] = GRADATION_KINDS[kind].map((noun) => ({
    id: noun.word,
    label: i18n._(MEANS[noun.word] as MessageDescriptor),
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
        label={t`Dictionary form, genitive and third form`}
        columns={[t`Dictionary form`, t`Genitive`, t`Third form`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{ title: t`Tap a form`, tip: tips[kind] }}
      />
    </Panel>
  );
}

function VerbTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = GRADATION_VERBS.map((verb) => ({
    id: verb.ma,
    label: i18n._(MEANS[verb.ma] as MessageDescriptor),
    cells: [
      { form: verb.ma, src: src(verb.ma) },
      { form: verb.da, src: src(verb.da) },
      { form: verb.present, src: src(verb.present) },
    ],
  }));
  return (
    <Paradigm
      label={t`Three forms of six verbs`}
      columns={[t`I have to …`, t`I want to …`, t`I …`]}
      rows={rows}
      empty={{
        title: t`Tap a form`,
        tip: (
          <Trans>
            The <Et>-ma</Et> form keeps the strong consonant. Look at the other two.
          </Trans>
        ),
      }}
    />
  );
}

type Grade = "strong" | "weak";
type GradeItem = ChoiceItem & { pair: readonly [string, string] };

const GRADE_LABELS: Record<Grade, MessageDescriptor> = {
  strong: msg`Strong, like the dictionary form`,
  weak: msg`Weak, like the genitive`,
};

const gradeOptions = (grades: readonly Grade[], i18n: I18n) =>
  grades.map((grade) => ({
    id: grade,
    label: <span lang={i18n.locale}>{i18n._(GRADE_LABELS[grade])}</span>,
  }));

function useContent() {
  const { i18n } = useLingui();
  return useMemo(() => {
    const usual: readonly { word: string; of: string; part: string }[] = (
      ["double", "soft", "gone", "blend"] as const
    ).flatMap((kind): readonly { word: string; of: string; part: string }[] =>
      GRADATION_KINDS[kind].slice(0, 2),
    );
    const grade: GradeItem[] = usual.flatMap((noun, i) =>
      (["weak", "strong"] as const).map((answer, k) => {
        const said = answer === "weak" ? noun.of : noun.part;
        const means = i18n._(MEANS[noun.word] as MessageDescriptor);
        const word = noun.word;
        return {
          src: src(said),
          answer,
          pair: [noun.word, `${noun.word}-${answer}`] as const,
          options: gradeOptions((i + k) % 2 === 0 ? ["strong", "weak"] : ["weak", "strong"], i18n),
          explain:
            answer === "weak" ? (
              <Trans>
                <Et>{said}</Et> is the genitive of <Et>{word}</Et>, {means}.
              </Trans>
            ) : (
              <Trans>
                <Et>{said}</Et> is the third form of <Et>{word}</Et>, {means}.
              </Trans>
            ),
        };
      }),
    );
    const gradeRun = (items: readonly GradeItem[], pinned?: GradeItem): GradeItem[] =>
      eachPairFirst(items, pinned).map((item) =>
        item === pinned
          ? item
          : { ...item, options: gradeOptions(shuffle(["strong", "weak"] as Grade[]), i18n) },
      );

    const pairs: MatchPair[] = GRADATION_MATCH.map((noun) => ({
      id: noun.word,
      left: noun.word,
      right: noun.of,
      rightLang: "et",
      src: src(noun.of),
    }));

    return { grade, gradeRun, pairs };
  }, [i18n]);
}

export function JalgJalaLesson() {
  const { t } = useLingui();
  const content = useContent();
  const genitive = lessonBySlug("omastav")?.n;
  const stems = lessonBySlug("pood-poe")?.n;
  const inside = lessonBySlug("majas-majja-majast")?.n;
  const verbForms = lessonBySlug("verbi-pohivormid")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Why <Et>jalg</Et> becomes <Et>jala</Et> and <Et>tuba</Et> becomes <Et>toa</Et>: which
          forms weaken, the four ways a consonant does it, and the same change in verbs.
        </Trans>
      }
      facts={[
        <Trans key="m">14 minutes</Trans>,
        <Trans key="q">3 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["jalg", "tuba", "kapp", "pank", "lind", "mõte"]}
      recap={[
        <Trans key="1">
          Many words have a strong and a weak form of the consonant inside:{" "}
          <b lang="et">jalg, jala</b>; <b lang="et">kapp, kapi</b>.
        </Trans>,
        <Trans key="2">
          The genitive is the odd one out. The dictionary form and the third form match; the
          genitive and the cases built on it differ: <b lang="et">jalg, jala, jalga</b>;{" "}
          <b lang="et">jalas</b>.
        </Trans>,
        <Trans key="3">
          The weak form goes single, turns soft, drops the letter or blends it:{" "}
          <b lang="et">kapi, panga, toa, linnu</b>. A few words go the other way:{" "}
          <b lang="et">mõte, mõtte</b>.
        </Trans>,
        <Trans key="4">
          Verbs do it too. The <b lang="et">-ma</b> form is strong:{" "}
          <b lang="et">lugema, lugeda, loen</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "odd-one-out",
          title: t`The genitive is the odd one out`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {stems} showed that a stem can lose or change a letter inside:{" "}
                    <Word w="tuba" />, room, has the stem <Word w="toa" />. This change has a name,
                    consonant gradation, and a pattern. It is like foot and feet in English: the
                    word changes inside, not only at the end.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The consonant has a strong form and a weak one. The dictionary form and the
                    third form have one, and the genitive of lesson {genitive} has the other:{" "}
                    <Word w="jalg" />, <Word w="jala" />, <Et>jalga</Et>. Every case built on the
                    genitive follows it, so in the room is <Et>toas</Et>, and on the foot is{" "}
                    <Et>jalal</Et>.
                  </Trans>
                </p>
              </Prose>
              <KindTable />
              <Aside>
                <Trans>
                  You can’t always tell from the dictionary form which change a word makes, so learn
                  each word with its genitive and third form, as a dictionary gives them. That’s why
                  this course always shows the three together.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "four-ways",
          title: t`Four ways to weaken`,
          children: (
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
                    A hard letter turns soft, k into g and p into b: <Word w="pank" />,{" "}
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
                  A few words go the other way: the dictionary form is weak, and the genitive is
                  strong. <Word w="mõte" />, thought, has the genitive <Word w="mõtte" />. The
                  genitive is still the odd one out.
                </Trans>
              </p>
              <p>
                <Trans>
                  The short “into” forms of lesson {inside} keep the strong form, like the third
                  form: into the shop is <Word w="poodi" />, but in the shop is <Et>poes</Et>.
                </Trans>
              </p>
            </Prose>
          ),
        },
        {
          id: "strong-or-weak",
          title: t`Hearing strong and weak`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The two forms often differ by one sound: a long pp or a short p, a d or none.
                    Listen to a form of a word from the table and say whether it is strong, like the
                    dictionary form and the third form, or weak, like the genitive.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="strong-or-weak"
                title={<Trans>Strong or weak?</Trans>}
                items={content.grade}
                order={content.gradeRun}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight. You heard the difference every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Tap the table once more for the ones you missed.</Trans>
                  ) : (
                    <Trans>Switch through the kinds in the table, then try again.</Trans>
                  )
                }
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "new-words",
          title: t`Six new words`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Here are six words you haven’t met in this lesson. Match each with its genitive,
                    using the four ways.
                  </Trans>
                </p>
              </Prose>
              <Match
                id="new-genitives"
                title={<Trans>Which genitive?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="w">Word</Trans>, <Trans key="g">Genitive</Trans>]}
              />
            </>
          ),
        },
        {
          id: "verbs",
          title: t`The same change in verbs`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Verbs weaken the same way. Of the three forms of lesson {verbForms}, the{" "}
                    <Et>-ma</Et> form is the strong one. The <Et>-da</Et> form, the present, or both
                    can be weak: <Word w="lugema" />, <Et>lugeda</Et>, <Word w="loen" />.
                  </Trans>
                </p>
              </Prose>
              <VerbTable />
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
                    Pick the form for each gap. Ask whether the word is in the dictionary form, the
                    genitive or a case built on it, or a short “into” form.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="kati-room"
                title={<Trans>Fill the gaps</Trans>}
                gaps={ROOM_GAPS}
                mode="pick"
                clip="p-room"
              />
            </>
          ),
        },
      ]}
    />
  );
}
