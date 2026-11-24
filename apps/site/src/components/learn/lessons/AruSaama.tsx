import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  IDIOM_ANSWERS,
  IDIOM_CONVERSATION,
  IDIOM_FIX_ANSWERS,
  IDIOM_FIXES,
  IDIOM_GAPS,
  IDIOM_HEARD,
  IDIOM_LETTER,
  IDIOM_ORDER,
  IDIOM_PARTICLES,
  IDIOM_PLAIN,
  IDIOM_REPLY,
  IDIOM_TRANSLATE,
  IDIOM_VERBS,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { type OrderItem, OrderRound } from "../OrderRound";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";
import { Writing } from "../Writing";

const SLUG = "aru-saama";
const src = (text: string) => clipUrl(SLUG, clipId(text));
const gapSaid = (gap: { before: string; answer: string; after: string }) =>
  `${gap.before} ${gap.answer}${/^[.!?]$/.test(gap.after) ? "" : " "}${gap.after}`;

type Group = keyof typeof IDIOM_VERBS;
const GROUPS: readonly Group[] = ["saama", "jaama", "other"];

const MEANS: Record<string, MessageDescriptor> = {
  "aru saama": msg`to understand`,
  "kokku saama": msg`to meet up`,
  "läbi saama": msg`to get on`,
  "hakkama saama": msg`to cope, to manage`,
  "otsa saama": msg`to run out`,
  "maha jääma": msg`to miss a bus or train`,
  "ära jääma": msg`to be called off`,
  "välja nägema": msg`to look, to seem`,
  "ära tundma": msg`to recognise`,
  "vastu võtma": msg`to accept`,
  "järele mõtlema": msg`to think over`,
  "alla andma": msg`to give up`,
};

const VERB_MEANS: Record<(typeof IDIOM_GAPS)[number]["verb"], MessageDescriptor> = {
  saama: msg`to get`,
  jääma: msg`to stay`,
  nägema: msg`to see`,
  võtma: msg`to take`,
  mõtlema: msg`to think`,
  andma: msg`to give`,
};

const GLOSSARY: Glossary = {
  saama: { en: msg`to get` },
  jääma: { en: msg`to stay` },
  aru: { en: msg`a particle: aru saama, to understand`, clip: false },
  "aru saama": { en: msg`to understand`, note: msg`Of what: -st. Ma saan sellest aru.` },
  "kokku saama": { en: msg`to meet up`, note: msg`With whom: -ga. Saame homme kokku.` },
  "läbi saama": { en: msg`to get on`, note: msg`With whom: -ga. Ma saan temaga hästi läbi.` },
  "hakkama saama": { en: msg`to cope, to manage`, note: msg`With what: -ga. Ma saan hakkama.` },
  "otsa saama": { en: msg`to run out`, note: msg`The thing is the subject: Kohv sai otsa.` },
  "maha jääma": { en: msg`to miss a bus or train`, note: msg`Ma jäin bussist maha.` },
  "ära jääma": { en: msg`to be called off`, note: msg`Koosolek jääb ära.` },
  "välja nägema": { en: msg`to look, to seem`, note: msg`Sa näed väsinud välja.` },
  "ära tundma": { en: msg`to recognise`, note: msg`Ma tundsin su ära.` },
  "vastu võtma": { en: msg`to accept, to receive`, note: msg`Ta võttis töö vastu.` },
  "järele mõtlema": { en: msg`to think over`, note: msg`Las ma mõtlen järele.` },
  "alla andma": { en: msg`to give up`, note: msg`Ära anna alla!` },
};

const lit = (said: string, verb: string) => {
  const particle = verb.split(" ")[0] as string;
  const at = said.lastIndexOf(particle);
  return `${said.slice(0, at)}|${said.slice(at).replace(/[.!?]$/, "")}`;
};

function VerbTable() {
  const { t, i18n } = useLingui();
  const [group, setGroup] = useState<Group>("saama");
  const labels: Record<Group, string> = {
    saama: t`“To get”`,
    jaama: t`“To stay”`,
    other: t`Other verbs`,
  };
  const plain = IDIOM_PLAIN.find((each) =>
    group === "saama" ? each.verb === "saama" : each.verb === "jääma",
  );
  const tips: Record<Group, ReactNode> = {
    saama: (
      <Trans>
        On its own, <b lang="et">saama</b> is to get: <b lang="et">Ma sain kirja.</b> With a
        particle it can mean something else entirely.
      </Trans>
    ),
    jaama: (
      <Trans>
        On its own, <b lang="et">jääma</b> is to stay: <b lang="et">Ma jään koju.</b>
      </Trans>
    ),
    other: <Trans>Each of these has a meaning its verb alone doesn’t have.</Trans>,
  };
  const rows: ParadigmRow[] = [
    ...(plain && group !== "other"
      ? [
          {
            id: plain.verb,
            label: group === "saama" ? t`to get` : t`to stay`,
            cells: [
              { form: plain.verb, src: src(plain.verb) },
              { form: plain.said.replace(/\.$/, ""), src: src(plain.said) },
            ],
          },
        ]
      : []),
    ...IDIOM_VERBS[group].map((each) => ({
      id: each.verb,
      label: i18n._(MEANS[each.verb] as MessageDescriptor),
      cells: [
        { form: each.verb, src: src(each.verb) },
        { form: lit(each.said, each.verb), src: src(each.said) },
      ],
    })),
  ];
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Verbs`}
        items={GROUPS.map((each) => ({ label: labels[each], value: each }))}
        value={group}
        onPick={setGroup}
      />
      <Paradigm
        key={group}
        label={t`Particle verbs and their meanings`}
        columns={[t`The verb`, t`In a sentence`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{ title: t`Tap a form`, tip: tips[group] }}
      />
    </Panel>
  );
}

type Saama = "kokku" | "labi" | "aru" | "hakkama";
const SAAMA: readonly Saama[] = ["kokku", "labi", "aru", "hakkama"];
const HEARD_MEANS: Record<(typeof IDIOM_HEARD)[number]["id"], Record<Saama, MessageDescriptor>> = {
  me: {
    kokku: msg`We’re meeting tomorrow.`,
    labi: msg`We get on well.`,
    aru: msg`We understand it.`,
    hakkama: msg`We can manage on our own.`,
  },
  mari: {
    kokku: msg`Mari met Jaan.`,
    labi: msg`Mari got on well with Jaan.`,
    aru: msg`Mari understood Jaan.`,
    hakkama: msg`Mari coped with the work.`,
  },
  nad: {
    kokku: msg`They meet after work.`,
    labi: msg`They get on well with each other.`,
    aru: msg`They understand Estonian.`,
    hakkama: msg`They can cope with anything.`,
  },
};

const heardOptions = (id: (typeof IDIOM_HEARD)[number]["id"], i18n: I18n) =>
  SAAMA.map((means) => ({
    id: means,
    label: (
      <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
        {i18n._(HEARD_MEANS[id][means])}
      </span>
    ),
  }));

type GapItem = FormItem & {
  said: string;
  options: readonly string[];
  pool: readonly string[];
  pair: readonly [string, string];
};

const pickOptions = (answer: string, pool: readonly string[]) =>
  shuffle([answer, ...shuffle(pool).slice(0, 3)]);

const gapRun = (items: readonly GapItem[], pinned?: GapItem): GapItem[] =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned
      ? item
      : { ...item, options: pickOptions(item.answers[0] as string, item.pool) },
  );

const pairRun = <T extends { pair: readonly [string, string] }>(items: readonly T[], pinned?: T) =>
  eachPairFirst(items, pinned);

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const pairs: MatchPair[] = (
      [
        "aru saama",
        "kokku saama",
        "läbi saama",
        "hakkama saama",
        "maha jääma",
        "ära tundma",
      ] as const
    ).map((verb) => ({
      id: clipId(verb),
      left: verb,
      right: i18n._(MEANS[verb] as MessageDescriptor),
      src: src(verb),
    }));

    const heardWhy: Record<Saama, ReactNode> = {
      kokku: (
        <Trans>
          <b lang="et">Kokku saama</b>: to meet up.
        </Trans>
      ),
      labi: (
        <Trans>
          <b lang="et">Läbi saama</b>: to get on with someone.
        </Trans>
      ),
      aru: (
        <Trans>
          <b lang="et">Aru saama</b>: to understand.
        </Trans>
      ),
      hakkama: (
        <Trans>
          <b lang="et">Hakkama saama</b>: to cope, to manage.
        </Trans>
      ),
    };
    const heard: (ChoiceItem & { said: string; pair: readonly [string, string] })[] =
      IDIOM_HEARD.flatMap((group) =>
        SAAMA.map((means) => ({
          said: group[means],
          src: src(group[means]),
          answer: means,
          options: heardOptions(group.id, i18n),
          pair: [means, group[means]] as const,
          explain: heardWhy[means],
        })),
      );

    const gaps: GapItem[] = IDIOM_GAPS.map((gap) => {
      const said = gapSaid(gap);
      const fits = gap.fits as readonly string[];
      const pool = IDIOM_PARTICLES.filter((each) => each !== gap.answer && !fits.includes(each));
      return {
        said,
        base: gap.verb,
        gloss: i18n._(VERB_MEANS[gap.verb]),
        cue: `${gap.before} …${/^[.!?]$/.test(gap.after) ? gap.after : ` ${gap.after}`}`,
        cueLang: "et",
        src: src(said),
        options: [gap.answer, ...pool.slice(0, 3)],
        pool,
        answers: [gap.answer],
        pair: [gap.id, gap.id] as const,
        explain: (
          <Trans>
            <b lang="et">
              {gap.answer} {gap.verb}
            </b>
            : {i18n._(MEANS[`${gap.answer} ${gap.verb}`] as MessageDescriptor)}.
          </Trans>
        ),
      };
    });

    const orderMeans: Record<(typeof IDIOM_ORDER)[number]["id"], MessageDescriptor> = {
      meet: msg`I want to meet up with you.`,
      nothing: msg`We didn’t understand anything.`,
      bus: msg`Did you miss the bus?`,
      alone: msg`I can’t cope with this on my own.`,
      concert: msg`The concert was called off yesterday.`,
      think: msg`You have to think it over first.`,
    };
    const neutralOrder = (
      <Trans>
        In neutral word order, the particle usually comes last. An extra detail can follow it.
      </Trans>
    );
    const orderWhy: Record<(typeof IDIOM_ORDER)[number]["id"], ReactNode> = {
      meet: (
        <Trans>
          After <b lang="et">tahan</b>, this example puts the particle before <b lang="et">saada</b>
          .
        </Trans>
      ),
      nothing: neutralOrder,
      bus: neutralOrder,
      alone: neutralOrder,
      concert: (
        <Trans>
          In neutral word order, <b lang="et">ära</b> usually comes last. A time word like{" "}
          <b lang="et">eile</b> can follow it.
        </Trans>
      ),
      think: (
        <Trans>
          After <b lang="et">pead</b>, this example puts the particle before{" "}
          <b lang="et">mõtlema</b>.
        </Trans>
      ),
    };
    const built: (OrderItem & { id: string })[] = IDIOM_ORDER.map(({ id, answers }) => ({
      id,
      answers,
      src: src(answers[0]),
      meaning: i18n._(orderMeans[id]),
      explain: orderWhy[id],
    }));

    const translatePrompts: Record<(typeof IDIOM_TRANSLATE)[number], MessageDescriptor> = {
      "Ma ei saanud küsimusest aru.": msg`I didn’t understand the question.`,
      "Saame homme kokku.": msg`Let’s meet up tomorrow.`,
      "Ma saan oma õega hästi läbi.": msg`I get on well with my sister.`,
      "Meil sai piim otsa.": msg`We’ve run out of milk.`,
      "Ta jäi rongist maha.": msg`She missed the train.`,
      "Sa näed väsinud välja.": msg`You look tired.`,
      "Ma võtsin kutse vastu.": msg`I accepted the invitation.`,
    };
    const translateWhy: Partial<Record<(typeof IDIOM_TRANSLATE)[number], ReactNode>> = {
      "Ma ei saanud küsimusest aru.": (
        <Trans>
          You understand of something: <b lang="et">küsimusest</b>.
        </Trans>
      ),
      "Meil sai piim otsa.": (
        <Trans>
          The milk is what runs out, so it’s the subject: <b lang="et">piim sai otsa</b>.
        </Trans>
      ),
      "Ta jäi rongist maha.": (
        <Trans>
          You miss from the train: <b lang="et">rongist</b>.
        </Trans>
      ),
      "Ma võtsin kutse vastu.": (
        <Trans>
          The action is complete here, so the object is genitive: <b lang="et">kutse</b>.
        </Trans>
      ),
    };
    const translations: (SentenceItem & { pair: readonly [string, string] })[] =
      IDIOM_TRANSLATE.map((said) => ({
        kind: "translate",
        id: clipId(said),
        prompt: i18n._(translatePrompts[said]),
        src: src(said),
        answers: IDIOM_ANSWERS[said] as readonly [string, ...string[]],
        pair: [clipId(said), clipId(said)] as const,
        explain: translateWhy[said],
      }));

    const fixWhy: Record<(typeof IDIOM_FIXES)[number]["right"], ReactNode> = {
      "Ma ei saanud õpetajast aru.": (
        <Trans>
          <b lang="et">Aru saama</b> usually takes <b lang="et">-st</b>: <b lang="et">õpetajast</b>.
        </Trans>
      ),
      "Ma jäin bussist maha.": (
        <Trans>
          You miss from the bus: <b lang="et">bussist</b>.
        </Trans>
      ),
      "Ma sain eile Mariga kokku.": (
        <Trans>
          You meet up with someone: <b lang="et">Mariga</b>.
        </Trans>
      ),
      "Kas sa saad sellega hakkama?": (
        <Trans>
          You cope with something: <b lang="et">sellega</b>.
        </Trans>
      ),
      "Ma ei tundnud sind ära.": (
        <Trans>
          After <b lang="et">ei</b>, the object takes the partitive: <b lang="et">sind</b>.
        </Trans>
      ),
      "Ma saan oma vennaga hästi läbi.": (
        <Trans>
          To get on is <b lang="et">läbi saama</b>. <b lang="et">Kokku saama</b> is to meet up.
        </Trans>
      ),
      "Ta võttis kingituse vastu.": (
        <Trans>
          The action is complete here, so the object is genitive: <b lang="et">kingituse</b>.
        </Trans>
      ),
    };
    const fixPrompts: Partial<Record<(typeof IDIOM_FIXES)[number]["right"], MessageDescriptor>> = {
      "Ma saan oma vennaga hästi läbi.": msg`I get on well with my brother.`,
    };
    const fixes: FixItem[] = IDIOM_FIXES.map((item) => {
      const prompt = fixPrompts[item.right];
      return {
        kind: "fix",
        id: `fix-${clipId(item.right)}`,
        wrong: item.wrong,
        answers: IDIOM_FIX_ANSWERS[item.right] ?? [item.right],
        src: src(item.right),
        explain: fixWhy[item.right],
        ...(prompt ? { prompt: i18n._(prompt) } : {}),
      };
    });

    const letter: PassageQuestion[] = [
      {
        id: "why-move",
        ask: t`Why did Kaisa move to a new town?`,
        options: [
          { id: "job", label: t`For a job` },
          { id: "family", label: t`To be near her mother` },
          { id: "big", label: t`Her village had become too small and quiet for her` },
        ],
        answer: "job",
        line: 4,
      },
      {
        id: "colleagues",
        kind: "truefalse",
        ask: t`Kaisa gets on well with her colleagues.`,
        answer: false,
        line: 5,
      },
      {
        id: "lunch",
        ask: t`What happens at lunch?`,
        options: [
          { id: "alone", label: t`She eats alone.` },
          { id: "jokes", label: t`Her colleagues make jokes she can’t follow.` },
          { id: "boss", label: t`Nobody talks at all.` },
        ],
        answer: "jokes",
        line: 6,
      },
      {
        id: "wait",
        kind: "short",
        ask: t`How long did Kaisa wait in the café? Write it as she does.`,
        answers: ["pool tundi"],
        line: 9,
      },
      {
        id: "boss",
        kind: "truefalse",
        ask: t`Kaisa’s boss is pleased with her work.`,
        answer: true,
        line: 14,
      },
      {
        id: "asks",
        ask: t`What does Kaisa want to know?`,
        options: [
          { id: "friends", label: t`Where to meet people` },
          { id: "boss", label: t`How to tell her boss about her colleagues` },
          { id: "wait", label: t`Whether to wait or look for a new job` },
        ],
        answer: "wait",
        line: 15,
      },
    ];

    const checks = [
      { id: "greet", label: <Trans>Greet Kaisa.</Trans> },
      { id: "understand", label: <Trans>Say that you understand her.</Trans> },
      { id: "advice", label: <Trans>Give her two pieces of advice.</Trans> },
      { id: "particles", label: <Trans>Use two particle verbs from this lesson.</Trans> },
      { id: "sign", label: <Trans>Sign with your name.</Trans> },
    ];

    const exam: PassageQuestion[] = [
      {
        id: "hard",
        ask: t`Why was it hard at first?`,
        options: [
          { id: "understand", label: t`She understood almost nothing.` },
          { id: "job", label: t`She couldn’t find a job for a long time.` },
          { id: "buses", label: t`It was cold.` },
        ],
        answer: "understand",
        line: 4,
      },
      {
        id: "give-up",
        kind: "truefalse",
        ask: t`In her first month, Olga wanted to give up.`,
        answer: true,
        line: 8,
      },
      {
        id: "friday",
        kind: "short",
        ask: t`When does Olga meet her course friends? Write it as Olga says it.`,
        answers: ["igal reedel"],
        line: 12,
      },
      {
        id: "cancelled",
        kind: "truefalse",
        ask: t`The Friday meetings are never called off.`,
        answer: false,
        line: 13,
      },
      {
        id: "think",
        ask: t`How long did Olga think about the job?`,
        options: [
          { id: "day", label: t`One evening` },
          { id: "week", label: t`A week` },
          { id: "month", label: t`About a month, until spring` },
        ],
        answer: "week",
        line: 17,
      },
      {
        id: "mother",
        kind: "truefalse",
        ask: t`Olga’s mother got on well with Olga’s friends.`,
        answer: true,
        line: 21,
      },
      {
        id: "hardest",
        ask: t`What was hardest at work?`,
        options: [
          { id: "boss", label: t`Her boss` },
          { id: "phone", label: t`Calls on the phone, when people speak fast` },
          { id: "books", label: t`Finding old books` },
        ],
        answer: "phone",
        line: 24,
      },
      {
        id: "who",
        kind: "match",
        ask: t`Who did it?`,
        options: [
          { id: "teacher", label: t`Her teacher` },
          { id: "friend", label: t`A friend` },
          { id: "peeter", label: t`Peeter` },
          { id: "boss", label: t`Her boss` },
          { id: "mother", label: t`Her mother` },
        ],
        statements: [
          {
            id: "normal",
            label: t`Said that wanting to give up is normal.`,
            answer: "teacher",
            line: 8,
          },
          { id: "ad", label: t`Sent her the job advert.`, answer: "friend", line: 16 },
          { id: "money", label: t`Lent her money.`, answer: "peeter", line: 30 },
          { id: "home", label: t`Sent her home.`, answer: "boss", line: 35 },
        ],
      },
      {
        id: "daughter",
        kind: "short",
        ask: t`Who does the old lady say Olga looks like? Write it as Olga says it.`,
        answers: ["tema tütar", "tütar"],
        line: 42,
      },
      {
        id: "stay",
        kind: "truefalse",
        ask: t`Olga is going to leave Tartu.`,
        answer: false,
        line: 52,
      },
    ];

    return { pairs, heard, gaps, built, translations, fixes, letter, checks, exam };
  }, [t, i18n]);
}

export function AruSaamaLesson() {
  const { t } = useLingui();
  const content = useContent();
  const government = lessonBySlug("ootan-sind")?.n;
  const particles = lessonBySlug("ules-valja-ara")?.n;
  const object = lessonBySlug("raamatut-voi-raamatu")?.n;
  const names = { fourth: t`Kalev`, third: t`Olga` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <b lang="et">Saan aru</b> is I understand, <b lang="et">saame kokku</b> is we meet up: a
          particle can give a verb a new meaning, so learn the two together.
        </Trans>
      }
      facts={[
        <Trans key="m">24 minutes</Trans>,
        <Trans key="q">8 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "aru saama",
        "kokku saama",
        "läbi saama",
        "hakkama saama",
        "otsa saama",
        "maha jääma",
        "ära jääma",
        "välja nägema",
        "ära tundma",
        "vastu võtma",
        "järele mõtlema",
        "alla andma",
      ]}
      recap={[
        <Trans key="1">
          A particle can change what a verb means: <b lang="et">ma sain kirja</b>, I got a letter;{" "}
          <b lang="et">ma sain aru</b>, I understood. Learn the particle and the verb as one word.
        </Trans>,
        <Trans key="2">
          With <b lang="et">saama</b>: <b lang="et">aru</b> understand, <b lang="et">kokku</b> meet
          up, <b lang="et">läbi</b> get on, <b lang="et">hakkama</b> cope, <b lang="et">otsa</b> run
          out.
        </Trans>,
        <Trans key="3">
          In neutral word order, the particle usually comes last. A place, time or other detail can
          follow it. After a verb such as <b lang="et">tahan</b>, it usually goes just before the
          infinitive: <b lang="et">Ma tahan aru saada.</b>
        </Trans>,
        <Trans key="4">
          Each verb usually asks for its case: <b lang="et">aru saama</b> and{" "}
          <b lang="et">maha jääma</b> take <b lang="et">-st</b>; <b lang="et">kokku saama</b>,{" "}
          <b lang="et">läbi saama</b> and <b lang="et">hakkama saama</b> take <b lang="et">-ga</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "particles",
          title: t`A particle that changes the meaning`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {particles} added particles such as up and out to verbs, where each part
                    keeps its meaning. With some verbs, the pair means something new. On its own,{" "}
                    <Word w="saama" /> is to get. With <Word w="aru" />, it’s to understand: you
                    can’t guess it from the parts.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Pick a verb and tap the sentences. The first row is the verb on its own.
                  </Trans>
                </p>
              </Prose>
              <VerbTable />
              <Aside>
                <Trans>
                  A dictionary lists these under the verb, with the particle first:{" "}
                  <b lang="et">aru saama</b>, <b lang="et">maha jääma</b>. That’s how this lesson
                  writes them too.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Match each particle verb with its meaning.</Trans>
                </p>
              </Prose>
              <Match
                id="particle-meaning"
                title={<Trans>What does it mean?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="v">Verb</Trans>, <Trans key="m">Meaning</Trans>]}
              />
            </>
          ),
        },
        {
          id: "saama",
          title: t`Four meanings of one verb`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Kokku saama" /> and <Word w="läbi saama" /> usually take{" "}
                    <b lang="et">-ga</b>, so <b lang="et">Mari sai Jaaniga</b> can go on either way.
                    The particle tells you whether she met him or got on with him.{" "}
                    <Word w="Aru saama" /> means to understand and <Word w="hakkama saama" /> means
                    to manage.
                  </Trans>
                </p>
                <p>
                  <Trans>Hear a sentence, then pick what it means. Listen for the particle.</Trans>
                </p>
              </Prose>
              <Quiz
                id="hear-saama"
                title={<Trans>What does it mean?</Trans>}
                items={content.heard}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight: you heard the particle every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you got wrong once more.</Trans>
                  ) : (
                    <Trans>Tap the sentences under “To get” once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={(items, pinned) =>
                  eachPairFirst(items, pinned).map((item) =>
                    item === pinned ? item : { ...item, options: shuffle(item.options) },
                  )
                }
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "pick",
          title: t`Pick the particle`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has a gap for the particle. The verb on its own means what it says
                    above the sentence; the rest of the sentence tells you which particle makes the
                    meaning it needs. Pick it, then hear the sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="pick-particle"
                title={<Trans>Which particle?</Trans>}
                items={content.gaps}
                rounds={10}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All ten particles right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Read the meaning under each one you got wrong.</Trans>
                  ) : (
                    <Trans>Go through the table once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={gapRun}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "order",
          title: t`Where the particle goes`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In neutral word order, the particle usually comes last, including in questions
                    and negatives. A place, time or other detail can follow it, as in{" "}
                    <b lang="et">Kontsert jäi ära eile.</b>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    When the verb is an infinitive after <b lang="et">tahan</b>,{" "}
                    <b lang="et">pean</b> or <b lang="et">ei taha</b>, the particle usually goes
                    just before it: <b lang="et">Ma tahan aru saada.</b>{" "}
                    <b lang="et">Sa pead järele mõtlema.</b>
                  </Trans>
                </p>
                <p>
                  <Trans>Build each sentence from what it means.</Trans>
                </p>
              </Prose>
              <Quiz
                id="particle-order"
                title={<Trans>Build the sentence</Trans>}
                items={content.built}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, each particle in its place.</Trans>
                  ) : (
                    <Trans>Read why under each one you missed, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.answers[0] ?? "", src: item.src })}
                round={(props) => <OrderRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "cases",
          title: t`The case after the verb`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Like the verbs in lesson {government}, a particle verb usually asks for a set
                    case. You understand of something: <b lang="et">Ma saan sellest aru.</b> You
                    miss from a bus: <b lang="et">Ma jäin bussist maha.</b>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    To say who you meet or get on with, or what you cope with, usually use{" "}
                    <b lang="et">-ga</b>: <b lang="et">Ma saan temaga hästi läbi.</b> With{" "}
                    <b lang="et">otsa saama</b> and <b lang="et">ära jääma</b>, the thing that runs
                    out or is called off is the subject: <b lang="et">Kohv sai otsa.</b>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <b lang="et">Vastu võtma</b> and <b lang="et">ära tundma</b> take an object, as
                    lesson {object} showed: usually the genitive for a completed action in a
                    statement, and the partitive after <b lang="et">ei</b>.{" "}
                    <b lang="et">Ma tundsin su ära. Ma ei tundnud sind ära.</b>
                  </Trans>
                </p>
                <p>
                  <Trans>Write each sentence in Estonian.</Trans>
                </p>
              </Prose>
              <Quiz
                id="write-particle"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven, each with its particle and case.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the particle and the case in the ones you missed.</Trans>
                  ) : (
                    <Trans>Read What to remember below, then try again.</Trans>
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
          title: t`Fix the sentence`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has one wrong word: a case, or the wrong particle. Tap it, then
                    type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-particle"
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
          id: "letter",
          title: t`A letter about a new job`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kaisa writes to a magazine for advice. Read her letter and answer the questions,
                    as in the reading part of the B1 exam.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="kaisa-letter"
                title={<Trans>What does Kaisa write?</Trans>}
                by={t`Kaisa writes`}
                sentences={IDIOM_LETTER}
                questions={content.letter}
              />
              <Prose>
                <p>
                  <Trans>
                    Now answer Kaisa in about 80 words, then compare your letter with a model.
                  </Trans>
                </p>
              </Prose>
              <Writing
                id="reply-kaisa"
                title={<Trans>Write back to Kaisa</Trans>}
                prompt={
                  <p>
                    <Trans>
                      Write to Kaisa. Say you understand her, give her two pieces of advice and use
                      at least two particle verbs from this lesson.
                    </Trans>
                  </p>
                }
                model={IDIOM_REPLY}
                checks={content.checks}
              />
            </>
          ),
        },
        {
          id: "radio",
          title: t`A radio interview`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kalev talks to Olga, who moved to Tartu three years ago, about her first years
                    in Estonia.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="olga-interview"
                title={<Trans>Listen: Kalev and Olga</Trans>}
                clip="c-olga"
                turns={IDIOM_CONVERSATION.turns}
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
