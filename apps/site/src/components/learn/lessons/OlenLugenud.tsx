import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { LESSONS, lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  PERFECT_CONVERSATION,
  PERFECT_DIALOGUE,
  PERFECT_FIXES,
  PERFECT_HEARD,
  PERFECT_NUD,
  PERFECT_PERSONS,
  PERFECT_REWRITE,
  PERFECT_TIMELINE,
  PERFECT_USES,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { ListenRows, Panel, type RowItem } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Timeline, type TimelinePoint } from "../Timeline";
import { Word } from "../Word";

const SLUG = "olen-lugenud";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const VERBS: Record<string, MessageDescriptor> = {
  elama: msg`to live`,
  lugema: msg`to read`,
  õppima: msg`to learn`,
  käima: msg`to go, to visit`,
  ostma: msg`to buy`,
  olema: msg`to be`,
  minema: msg`to go`,
  tegema: msg`to do, to make`,
  sööma: msg`to eat`,
  nägema: msg`to see`,
};

const MEANS: Record<string, MessageDescriptor> = {
  "Ma olen Tartus käinud.": msg`I have been to Tartu.`,
  "Ma olen juba söönud.": msg`I have already eaten.`,
  "Ma ei ole veel söönud.": msg`I haven’t eaten yet.`,
  "Ta pole seda filmi näinud.": msg`He or she hasn’t seen this film.`,
  "Eile käisin ma Tartus.": msg`Yesterday I went to Tartu.`,
  "Kui ma jaama jõudsin, oli rong juba läinud.": msg`When I got to the station, the train had already left.`,
  "Kui ma koju jõudsin, oli Mari juba söönud.": msg`When I got home, Mari had already eaten.`,
  "Eile sõin ma kodus.": msg`Yesterday I ate at home.`,
  "Ma söön.": msg`I’m eating.`,
};

const means = (text: string, i18n: I18n) => {
  const found = MEANS[text];
  return found ? i18n._(found) : "";
};

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    Object.entries(MEANS).map(([text, en]) => [text.toLowerCase(), { en, show: text }]),
  ),
  juba: { en: msg`already` },
  veel: { en: msg`yet, still`, note: msg`Ei ole veel: not yet.` },
  kunagi: { en: msg`ever; once`, note: msg`Ei … kunagi: never.` },
  jõudma: { en: msg`to arrive, to get to`, note: msg`Past: jõudsin, I arrived.` },
  lugenud: { en: msg`read`, note: msg`The -nud form of lugema.` },
  söönud: { en: msg`eaten`, note: msg`The -nud form of sööma.` },
  olen: { en: msg`I am; I have`, note: msg`With a -nud form: ma olen lugenud, I have read.` },
  olin: { en: msg`I was; I had`, note: msg`With a -nud form: ma olin lugenud, I had read.` },
};

type Tense = "past" | "perfect" | "pluperfect";
const TENSES: readonly Tense[] = ["past", "perfect", "pluperfect"];

const HEARD_MEANS: Record<
  (typeof PERFECT_HEARD)[number]["id"],
  Record<Tense, MessageDescriptor>
> = {
  kaima: {
    past: msg`Mari went to Tallinn.`,
    perfect: msg`Mari has been to Tallinn.`,
    pluperfect: msg`Mari had been to Tallinn.`,
  },
  sooma: {
    past: msg`Jaan ate lunch.`,
    perfect: msg`Jaan has eaten lunch.`,
    pluperfect: msg`Jaan had eaten lunch.`,
  },
  lugema: {
    past: msg`Kati read the book to the end.`,
    perfect: msg`Kati has read the book to the end.`,
    pluperfect: msg`Kati had read the book to the end.`,
  },
  nagema: {
    past: msg`Liis saw the film.`,
    perfect: msg`Liis has seen the film.`,
    pluperfect: msg`Liis had seen the film.`,
  },
};

export const heardOptions = (
  id: (typeof PERFECT_HEARD)[number]["id"],
  tenses: readonly Tense[],
  i18n: I18n,
) =>
  tenses.map((tense) => ({
    id: tense,
    label: (
      <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
        {i18n._(HEARD_MEANS[id][tense])}
      </span>
    ),
  }));

export const heardRun = <T extends { pair: readonly [string, string] }>(
  items: readonly T[],
  pinned: T | undefined,
  reorder: (item: T) => T,
): T[] => eachPairFirst(items, pinned).map((item) => (item === pinned ? item : reorder(item)));

function NudTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = PERFECT_NUD.map((verb) => ({
    id: verb.ma,
    label: i18n._(VERBS[verb.ma] as MessageDescriptor),
    et: verb.ma,
    cells: [
      { form: verb.da, src: src(verb.da) },
      { form: verb.nud.replace(/nud$/, "|nud"), src: src(verb.nud) },
    ],
  }));
  return (
    <Panel>
      <Paradigm
        label={t`The -da infinitive and the -nud form of ten verbs`}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a form`,
          tip: (
            <Trans>
              Each row holds the <b lang="et">-da</b> infinitive and the <b lang="et">-nud</b> form.
              The first five are regular; the last five are irregular: learn their{" "}
              <b lang="et">-nud</b> form by heart.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

const PERSONS: Record<string, MessageDescriptor> = {
  ma: msg`I`,
  sa: msg`you`,
  ta: msg`he or she`,
  me: msg`we`,
  te: msg`you, to more than one; polite you`,
  nad: msg`they`,
};

function PersonTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = PERFECT_PERSONS.map((row) => ({
    id: row.person,
    label: i18n._(PERSONS[row.person] as MessageDescriptor),
    et: row.person,
    cells: [
      { form: row.olen.replace(/\.$/, ""), src: src(row.olen) },
      { form: row.olin.replace(/\.$/, ""), src: src(row.olin) },
    ],
  }));
  return (
    <Panel>
      <Paradigm
        label={t`The perfect and the pluperfect of lugema`}
        columns={[t`Has read`, t`Had read`]}
        rows={rows}
        empty={{
          title: t`Tap a form`,
          tip: (
            <Trans>
              Only <b lang="et">olema</b> changes for the person. The <b lang="et">-nud</b> form
              stays the same.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

function TenseLine() {
  const { t, i18n } = useLingui();
  const labels: Record<string, string> = {
    pluperfect: t`Pluperfect`,
    past: t`Past`,
    perfect: t`Perfect`,
    present: t`Present`,
  };
  const ets: Record<string, string> = {
    pluperfect: "enneminevik",
    past: "lihtminevik",
    perfect: "täisminevik",
    present: "olevik",
  };
  const pieces: Record<string, string> = {
    "ol|i": t`was`,
    "söö|nud": t`eaten: the -nud form`,
    "sõ|in": t`I ate`,
    "ole|n": t`I am`,
    "söö|n": t`I eat`,
  };
  const points: TimelinePoint[] = PERFECT_TIMELINE.map((point) => ({
    id: point.id,
    label: labels[point.id] ?? "",
    et: ets[point.id],
    at: point.at,
    reach: "reach" in point ? point.reach : undefined,
    examples: [
      {
        sentence: point.sentence,
        meaning: means(point.sentence, i18n),
        src: src(point.sentence),
        build: point.build.map((form) => ({ form, note: pieces[form] ?? "" })),
      },
    ],
  }));
  return (
    <Panel>
      <Timeline
        label={t`Four tenses of one verb`}
        points={points}
        empty={{
          title: t`Tap a tense`,
          tip: t`The perfect reaches up to now. The pluperfect is before another past.`,
        }}
      />
    </Panel>
  );
}

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const forms: FormItem[] = PERFECT_NUD.slice(0, 8).map((verb) => ({
      base: `${verb.ma}, ${verb.da}`,
      gloss: i18n._(VERBS[verb.ma] as MessageDescriptor),
      cue: t`The -nud form`,
      answers: [verb.nud],
      src: src(verb.nud),
      explain: verb.regular ? (
        <Trans>
          Drop <b lang="et">-da</b> or <b lang="et">-a</b> from the <b lang="et">-da</b> infinitive
          and add <b lang="et">-nud</b>.
        </Trans>
      ) : (
        <Trans>
          Irregular: learn its <b lang="et">-nud</b> form by heart.
        </Trans>
      ),
    }));

    const heard: (ChoiceItem & { said: string; pair: readonly [string, string] })[] =
      PERFECT_HEARD.flatMap((group) =>
        TENSES.map((tense) => ({
          said: group[tense],
          src: src(group[tense]),
          answer: tense,
          options: heardOptions(group.id, TENSES, i18n),
          pair: [tense, group[tense]] as const,
          explain:
            tense === "past" ? (
              <Trans>
                The simple past: one word, no <b lang="et">olema</b>.
              </Trans>
            ) : tense === "perfect" ? (
              <Trans>
                <b lang="et">On</b> plus the <b lang="et">-nud</b> form: the perfect.
              </Trans>
            ) : (
              <Trans>
                <b lang="et">Oli</b> plus the <b lang="et">-nud</b> form: the pluperfect.
              </Trans>
            ),
        })),
      );

    const cues: Record<(typeof PERFECT_REWRITE)[number]["cue"], string> = {
      already: t`already`,
      done: t`it’s done now`,
      never: t`up to now`,
    };
    const rewrites: SentenceItem[] = PERFECT_REWRITE.map((item) => ({
      kind: "rewrite",
      id: clipId(item.to),
      from: item.from,
      cue: cues[item.cue],
      src: src(item.to),
      answers: [item.to],
      explain: (
        <Trans>
          <b lang="et">Olema</b> in the present, and the <b lang="et">-nud</b> form, usually at the
          end.
        </Trans>
      ),
    }));
    const extra: Record<string, readonly string[]> = {
      "Ma olen juba söönud.": ["Ma olen juba söönud.", "Olen juba söönud."],
      "Ma ei ole seda filmi näinud.": [
        "Ma ei ole seda filmi näinud.",
        "Ma pole seda filmi näinud.",
        "Ma ei ole seda filmi veel näinud.",
        "Ma ei ole seda filmi kunagi näinud.",
        "Ma pole seda filmi kunagi näinud.",
      ],
    };
    for (const item of rewrites) {
      const more = extra[item.answers[0] as string];
      if (more) item.answers = more;
    }

    const translations: (SentenceItem & { pair: readonly [string, string] })[] = [
      {
        kind: "translate",
        id: "went-yesterday",
        prompt: t`I went to Tartu yesterday.`,
        src: src("Ma käisin eile Tartus."),
        answers: [
          "Ma käisin eile Tartus.",
          "Eile käisin ma Tartus.",
          "Eile käisin Tartus.",
          "Käisin eile Tartus.",
          "Mina käisin eile Tartus.",
        ],
        pair: ["past", "went-yesterday"],
        explain: <Trans>A finished time is named, yesterday, so the simple past.</Trans>,
      },
      {
        kind: "translate",
        id: "have-been",
        prompt: t`I have been to Tartu.`,
        src: src("Ma olen Tartus käinud."),
        answers: ["Ma olen Tartus käinud.", "Olen Tartus käinud.", "Mina olen Tartus käinud."],
        pair: ["perfect", "have-been"],
        explain: <Trans>No finished time is named: the perfect.</Trans>,
      },
      {
        kind: "translate",
        id: "not-yet",
        prompt: t`I haven’t eaten yet.`,
        src: src("Ma ei ole veel söönud."),
        answers: [
          "Ma ei ole veel söönud.",
          "Ma pole veel söönud.",
          "Ma ei ole söönud veel.",
          "Mina ei ole veel söönud.",
        ],
        pair: ["perfect", "not-yet"],
      },
      {
        kind: "translate",
        id: "had-eaten",
        prompt: t`When I got home, Mari had already eaten.`,
        src: src("Kui ma koju jõudsin, oli Mari juba söönud."),
        answers: [
          "Kui ma koju jõudsin, oli Mari juba söönud.",
          "Kui ma koju jõudsin, Mari oli juba söönud.",
          "Kui ma jõudsin koju, oli Mari juba söönud.",
        ],
        pair: ["pluperfect", "had-eaten"],
        explain: (
          <Trans>
            Before another past event: the pluperfect, with <b lang="et">oli</b>.
          </Trans>
        ),
      },
      {
        kind: "translate",
        id: "two-years",
        prompt: t`He or she has been learning Estonian for two years.`,
        src: src("Ta on eesti keelt kaks aastat õppinud."),
        answers: [
          "Ta on eesti keelt kaks aastat õppinud.",
          "Ta on kaks aastat eesti keelt õppinud.",
          "Tema on eesti keelt kaks aastat õppinud.",
          "Ta õpib eesti keelt kaks aastat.",
        ],
        pair: ["perfect", "two-years"],
      },
      {
        kind: "translate",
        id: "seen-film",
        prompt: t`Have you seen this film?`,
        src: src("Kas sa oled seda filmi näinud?"),
        answers: [
          "Kas sa oled seda filmi näinud?",
          "Kas sa oled seda filmi juba näinud?",
          "Kas te olete seda filmi näinud?",
          "Oled sa seda filmi näinud?",
        ],
        pair: ["perfect", "seen-film"],
      },
      {
        kind: "translate",
        id: "last-week",
        prompt: t`Last week I read the book to the end.`,
        src: src("Eelmisel nädalal lugesin ma raamatu läbi."),
        answers: [
          "Eelmisel nädalal lugesin ma raamatu läbi.",
          "Eelmisel nädalal lugesin raamatu läbi.",
          "Ma lugesin eelmisel nädalal raamatu läbi.",
        ],
        pair: ["past", "last-week"],
        explain: <Trans>Last week is named, so the simple past.</Trans>,
      },
    ];
    translations.find((item) => item.id === "two-years")!.answers = [
      "Ta on eesti keelt kaks aastat õppinud.",
      "Ta on kaks aastat eesti keelt õppinud.",
      "Tema on eesti keelt kaks aastat õppinud.",
    ];

    const fixWhy: Record<string, ReactNode> = {
      "Ma ei ole seda filmi näinud.": (
        <Trans>
          After <b lang="et">ei</b>, <b lang="et">olema</b> is <b lang="et">ole</b> for every
          person.
        </Trans>
      ),
      "Ta on juba koju läinud.": (
        <Trans>
          The <b lang="et">-nud</b> form of <b lang="et">minema</b> is <b lang="et">läinud</b>.
        </Trans>
      ),
      "Me oleme töö ära teinud.": (
        <Trans>
          The <b lang="et">-nud</b> form of <b lang="et">tegema</b> is <b lang="et">teinud</b>.
        </Trans>
      ),
      "Kas sa oled seda filmi näinud?": (
        <Trans>
          The <b lang="et">-nud</b> form of <b lang="et">nägema</b> is <b lang="et">näinud</b>.
        </Trans>
      ),
      "Ma olen eesti keelt kaks aastat õppinud.": (
        <Trans>
          The <b lang="et">-nud</b> form comes from <b lang="et">õppida</b>, so it keeps{" "}
          <b lang="et">pp</b>: <b lang="et">õppinud</b>.
        </Trans>
      ),
      "Me oleme Tartus käinud.": (
        <Trans>
          <b lang="et">Olema</b> agrees with the person: <b lang="et">me oleme</b>.
        </Trans>
      ),
      "Kui ma jaama jõudsin, oli rong juba läinud.": (
        <Trans>
          Before another past event, the pluperfect: <b lang="et">oli</b>, not <b lang="et">on</b>.
        </Trans>
      ),
    };
    const fixes: FixItem[] = PERFECT_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${clipId(item.right)}`,
      wrong: item.wrong,
      answers: [item.right],
      src: src(item.right),
      explain: fixWhy[item.right],
    }));

    const line = (id: keyof typeof PERFECT_DIALOGUE) => {
      const clip = PERFECT_DIALOGUE[id];
      return typeof clip === "string" ? clip : clip.text;
    };
    const talk: DialogueTurn[] = [
      { who: "them", clip: "d-mari-1", line: line("d-mari-1") },
      {
        who: "you",
        clip: "d-sina-1",
        replies: [
          {
            line: "Jah, ma olen eelmisel kuul seal käinud.",
            why: (
              <Trans>
                A finished time is named, last month, so the simple past: <b lang="et">käisin</b>.
              </Trans>
            ),
          },
          { line: line("d-sina-1"), right: true },
          {
            line: "Ei, ma pole Tartus käinud.",
            why: <Trans>You went to Tartu last month.</Trans>,
          },
        ],
      },
      { who: "them", clip: "d-mari-2", line: line("d-mari-2") },
      {
        who: "you",
        clip: "d-sina-2",
        replies: [
          { line: line("d-sina-2"), right: true },
          {
            line: "Ei, ma ei olen veel midagi söönud.",
            why: (
              <Trans>
                After <b lang="et">ei</b>: <b lang="et">ei ole</b>.
              </Trans>
            ),
          },
          {
            line: "Jah, aitäh, olen just kõhu täis söönud.",
            why: <Trans>You haven’t eaten yet.</Trans>,
          },
        ],
      },
      { who: "them", clip: "d-mari-3", line: line("d-mari-3") },
      {
        who: "you",
        clip: "d-sina-3",
        replies: [
          {
            line: "Jah, ma olen natuke õppinud.",
            why: (
              <Trans>
                Before the course, another past: the pluperfect, <b lang="et">olin</b>.
              </Trans>
            ),
          },
          {
            line: "Ei, ma ei olnud enne kursust üldse midagi õppinud.",
            why: <Trans>You had learned a little before the course.</Trans>,
          },
          { line: line("d-sina-3"), right: true },
        ],
      },
      { who: "them", clip: "d-mari-4", line: line("d-mari-4") },
    ];

    const exam: PassageQuestion[] = [
      {
        id: "jaan-been",
        kind: "truefalse",
        ask: t`Jaan has been to Saaremaa.`,
        answer: false,
        line: 2,
      },
      {
        id: "when",
        ask: t`When was Kati on Saaremaa?`,
        options: [
          { id: "winter", label: t`Last winter` },
          { id: "summer", label: t`Last summer` },
          { id: "years", label: t`Two years ago, in the autumn` },
        ],
        answer: "summer",
        line: 4,
      },
      {
        id: "parnu",
        kind: "truefalse",
        ask: t`Before this trip, Kati had swum in the sea only in Pärnu.`,
        answer: true,
        line: 8,
      },
      {
        id: "wait",
        ask: t`Why did Kati wait two hours?`,
        options: [
          { id: "bus", label: t`The bus was late` },
          { id: "ferry", label: t`The ferry had already left` },
          { id: "read", label: t`She wanted to read` },
        ],
        answer: "ferry",
        line: 15,
      },
      {
        id: "country",
        kind: "short",
        ask: t`Which country had Kati sailed to before? Write it as she says it.`,
        answers: ["Soome", "Soomes"],
        line: 22,
      },
      {
        id: "castle",
        kind: "truefalse",
        ask: t`Kati had seen such an old castle before.`,
        answer: false,
        line: 26,
      },
      {
        id: "fish",
        kind: "short",
        ask: t`What should Jaan eat there? Write it in one word.`,
        answers: ["suitsukala"],
        line: 29,
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
          { id: "coffee", label: t`I drank three cups of coffee.`, answer: "kati", line: 19 },
          { id: "heard", label: t`I’ve never heard of it.`, answer: "jaan", line: 36 },
          { id: "photos", label: t`I’ve taken a hundred photos.`, answer: "kati", line: 41 },
          { id: "call", label: t`I’ll call him tomorrow.`, answer: "jaan", line: 52 },
          { id: "decided", label: t`I’ve made up my mind.`, answer: "jaan", line: 53 },
        ],
      },
    ];

    return { forms, heard, rewrites, translations, fixes, talk, exam };
  }, [t, i18n]);
}

const pairRun = <T extends { pair: readonly [string, string] }>(items: readonly T[], pinned?: T) =>
  eachPairFirst(items, pinned);

export function OlenLugenudLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const past = lessonBySlug("lihtminevik")?.n;
  const pastNo = LESSONS.find((lesson) => lesson.et === "Ma ei läinud")?.n;
  const verbForms = lessonBySlug("verbi-pohivormid")?.n;
  const object = lessonBySlug("raamatut-voi-raamatu")?.n;
  const names = { second: t`Kati`, main: t`Jaan` };
  const rowsOf = (texts: readonly string[]): RowItem[] =>
    texts.map((text) => ({ main: text, sub: means(text, i18n), src: src(text) }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Two tenses built from <b lang="et">olema</b> and the <b lang="et">-nud</b> form: the
          perfect for what has happened, and the pluperfect for what had happened before.
        </Trans>
      }
      facts={[
        <Trans key="m">22 minutes</Trans>,
        <Trans key="q">7 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["juba", "veel", "kunagi", "jõudma", "lugenud", "söönud", "olen", "olin"]}
      recap={[
        <Trans key="1">
          The <b lang="et">-nud</b> form comes from the <b lang="et">-da</b> infinitive:{" "}
          <b lang="et">lugeda, lugenud</b>. Irregular verbs are learned by heart:{" "}
          <b lang="et">olnud, läinud, teinud, söönud, näinud</b>.
        </Trans>,
        <Trans key="2">
          The perfect is <b lang="et">olema</b> in the present plus the <b lang="et">-nud</b> form,
          for what has happened with no finished time named: <b lang="et">Ma olen Tartus käinud.</b>
        </Trans>,
        <Trans key="3">
          When a finished past time is named, such as <b lang="et">eile</b>, use the simple past:{" "}
          <b lang="et">Eile käisin ma Tartus.</b>
        </Trans>,
        <Trans key="4">
          The pluperfect is <b lang="et">olema</b> in the past plus the <b lang="et">-nud</b> form,
          for what had happened before another past event:{" "}
          <b lang="et">Kui ma jaama jõudsin, oli rong juba läinud.</b>
        </Trans>,
        <Trans key="5">
          To say no, use <b lang="et">ei ole</b> or <b lang="et">ei olnud</b> for every person:{" "}
          <b lang="et">Ma ei ole veel söönud.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "nud",
          title: t`The -nud form`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {pastNo} used a verb form ending in <b lang="et">-nud</b> to say no in
                    the past: <b lang="et">ma ei lugenud</b>. The same form builds two more tenses
                    in this lesson.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    It comes from the <b lang="et">-da</b> infinitive of lesson {verbForms}: drop{" "}
                    <b lang="et">-da</b> or <b lang="et">-a</b> and add <b lang="et">-nud</b>.{" "}
                    <b lang="et">Lugeda</b> gives <Word w="lugenud" />. Some verbs are irregular:{" "}
                    <b lang="et">süüa</b> gives <Word w="söönud" />. Tap each form in the table to
                    hear it.
                  </Trans>
                </p>
              </Prose>
              <NudTable />
              <Prose>
                <p>
                  <Trans>
                    Each round gives a verb’s <b lang="et">-ma</b> and <b lang="et">-da</b>{" "}
                    infinitives. Type its <b lang="et">-nud</b> form.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-nud"
                title={<Trans>Type the -nud form</Trans>}
                items={content.forms}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, typed in full.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Tap the table for the ones you got wrong.</Trans>
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
          id: "perfect",
          title: t`Has done: the perfect`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The perfect is <b lang="et">olema</b> in the present plus the{" "}
                    <b lang="et">-nud</b> form: <Word w="Ma olen Tartus käinud." /> It says
                    something has happened, with no finished time named: ever, already, or not yet.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Only <Word w="olen" /> changes for the person. To say no, use{" "}
                    <b lang="et">ei ole</b> or <b lang="et">pole</b> for everyone:{" "}
                    <Word w="Ma ei ole veel söönud." />
                  </Trans>
                </p>
              </Prose>
              <PersonTable />
              <ListenRows items={rowsOf(PERFECT_USES.slice(0, 4))} />
              <Prose>
                <p>
                  <Trans>
                    Each round gives a sentence and a cue. Write the sentence in the perfect.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="into-perfect"
                title={<Trans>Into the perfect</Trans>}
                items={content.rewrites}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, each in the perfect.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Nearly. Check <b lang="et">olema</b> and the <b lang="et">-nud</b> form in the
                      ones you got wrong.
                    </Trans>
                  ) : (
                    <Trans>Tap the tables once more, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "which",
          title: t`Past, perfect or pluperfect`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {past}’s simple past tells what happened at a finished time you name:{" "}
                    <Word w="Eile käisin ma Tartus." /> The perfect reaches up to now, with no
                    finished time named.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The pluperfect is <b lang="et">olema</b> in the past plus the{" "}
                    <b lang="et">-nud</b> form, <Word w="olin" /> and the rest. It is a past before
                    another past: <Word w="Kui ma jaama jõudsin, oli rong juba läinud." /> Tap the
                    tenses on the line.
                  </Trans>
                </p>
              </Prose>
              <TenseLine />
              <Aside>
                <Trans>
                  <b lang="et">Läbi</b> and <b lang="et">ära</b> from lesson {object} work in every
                  tense: <b lang="et">Kati on raamatu läbi lugenud</b>, Kati has read the book to
                  the end.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence, then pick what it means. Listen for <b lang="et">on</b>,{" "}
                    <b lang="et">oli</b> or no <b lang="et">olema</b> at all.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="hear-tense"
                title={<Trans>Hear the tense</Trans>}
                items={content.heard}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six. You heard each tense.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you got wrong once more.</Trans>
                  ) : (
                    <Trans>Tap the tenses on the line once more, then try again.</Trans>
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
                    Write each sentence in Estonian. First ask: is a finished time named, and is it
                    before another past?
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-tense"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven, each in the tense its meaning needs.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Look at the tense in the ones you got wrong.</Trans>
                  ) : (
                    <Trans>Tap the tenses on the line once more, then try again.</Trans>
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
          title: t`Fix the form`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has one wrong word: a <b lang="et">-nud</b> form, or a form of{" "}
                    <b lang="et">olema</b>. Tap it, then type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-perfect"
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
          id: "talk",
          title: t`Tartu, lunch and your Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari asks you about Tartu, lunch and your Estonian. Pick what you say back. A
                    wrong reply says why, then you hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="been-to-tartu"
                title={<Trans>Talk: with Mari</Trans>}
                part={
                  <Trans>
                    You went to Tartu last month, you haven’t eaten yet, and you had learned a
                    little Estonian before the course.
                  </Trans>
                }
                them={t`Mari`}
                turns={content.talk}
              />
            </>
          ),
        },
        {
          id: "saaremaa",
          title: t`Kati’s trip to Saaremaa`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Kati tells Jaan about her summer trip to an island.</Trans>
                </p>
              </Prose>
              <Listening
                id="trip-saaremaa"
                title={<Trans>Listen: Kati and Jaan</Trans>}
                clip="c-saaremaa"
                turns={PERFECT_CONVERSATION.turns}
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
