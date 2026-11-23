import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  COND_CONVERSATION,
  COND_DIALOGUE,
  COND_FIXES,
  COND_FIX_ANSWERS,
  COND_SHORT,
  COND_FORM_QUIZ,
  COND_HEARD,
  COND_IF,
  COND_PERSONS,
  COND_POLITE,
  COND_REWRITE,
  COND_SORT,
  COND_VERBS,
  COND_ANSWERS,
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
import { Sort, type SortItem } from "../Sort";
import { Word } from "../Word";

const SLUG = "laheksin";

const src = (text: string) => clipUrl(SLUG, clipId(text));

const VERBS: Record<string, MessageDescriptor> = {
  lugema: msg`to read`,
  minema: msg`to go`,
  olema: msg`to be`,
  tegema: msg`to do, to make`,
  tahtma: msg`to want`,
  saama: msg`can, to get`,
  võima: msg`may, can`,
  sööma: msg`to eat`,
  elama: msg`to live`,
};

const PERSONS: Record<string, MessageDescriptor> = {
  ma: msg`I`,
  sa: msg`you`,
  ta: msg`he or she`,
  me: msg`we`,
  te: msg`you, to more than one; polite you`,
  nad: msg`they`,
};

const FIX_PROMPTS: Record<string, MessageDescriptor> = {
  "Ma ei läheks kinno.": msg`I wouldn’t go to the cinema.`,
  "Kas sa saaksid mind aidata?": msg`Could you help me?`,
  "Kui mul oleks aega, läheksin ma kinno.": msg`If I had time, I’d go to the cinema.`,
  "Me läheksime homme kinno.": msg`We would go to the cinema tomorrow.`,
  "Ta läheks koju.": msg`He or she would go home.`,
  "Kui ma oleksin rikas, ostaksin maja.": msg`If I were rich, I’d buy a house.`,
  "Te loeksite seda raamatut.": msg`You would read this book.`,
};

const MEANS: Record<string, MessageDescriptor> = {
  "Ma tahaksin kohvi.": msg`I’d like a coffee.`,
  "Kas sa saaksid mind aidata?": msg`Could you help me?`,
  "Kas te võiksite seda korrata?": msg`Could you say that again, please?`,
  "Kui mul oleks aega, läheksin ma kinno.": msg`If I had time, I’d go to the cinema.`,
  "Kui ilm oleks ilus, sõidaksime mere äärde.": msg`If the weather were fine, we’d drive to the sea.`,
  "Kui ma oleksin rikas, ostaksin maja.": msg`If I were rich, I’d buy a house.`,
  "Ma ei läheks.": msg`I wouldn’t go.`,
};

const means = (text: string, i18n: I18n) => {
  const found = MEANS[text];
  return found ? i18n._(found) : "";
};

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    Object.entries(MEANS).map(([text, en]) => [text.toLowerCase(), { en, show: text }]),
  ),
  kui: { en: msg`if; when; as, than` },
  "hea meelega": { en: msg`gladly, I’d love to` },
  läheksin: { en: msg`I would go`, note: msg`Lähe-, from lähen, plus -ksin.` },
  tahaksin: { en: msg`I would like`, note: msg`Taha-, from tahan, plus -ksin.` },
  oleks: { en: msg`would be`, note: msg`Ole-, from olen, plus -ks: the form for ta.` },
};

type Mood = "now" | "would" | "past";
const MOODS: readonly Mood[] = ["now", "would", "past"];

const HEARD_MEANS: Record<(typeof COND_HEARD)[number]["id"], Record<Mood, MessageDescriptor>> = {
  tulema: {
    now: msg`I’m coming home.`,
    would: msg`I would come home.`,
    past: msg`I came home.`,
  },
  olema: {
    now: msg`I have time.`,
    would: msg`I would have time.`,
    past: msg`I had time.`,
  },
  ostma: {
    now: msg`He or she is buying the car.`,
    would: msg`He or she would buy the car.`,
    past: msg`He or she bought the car.`,
  },
  sooma: {
    now: msg`We’re eating cake.`,
    would: msg`We would eat cake.`,
    past: msg`We ate cake.`,
  },
};

export const heardOptions = (
  id: (typeof COND_HEARD)[number]["id"],
  moods: readonly Mood[],
  i18n: I18n,
) =>
  moods.map((mood) => ({
    id: mood,
    label: (
      <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
        {i18n._(HEARD_MEANS[id][mood])}
      </span>
    ),
  }));

export const heardRun = <T extends { pair: readonly [string, string] }>(
  items: readonly T[],
  pinned: T | undefined,
  reorder: (item: T) => T,
): T[] => eachPairFirst(items, pinned).map((item) => (item === pinned ? item : reorder(item)));

function VerbTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = COND_VERBS.map((verb) => ({
    id: verb.ma,
    label: i18n._(VERBS[verb.ma] as MessageDescriptor),
    et: verb.ma,
    cells: [
      { form: verb.n, src: src(verb.n) },
      { form: verb.cond.replace(/ksin$/, "|ksin"), src: src(verb.cond) },
    ],
  }));
  return (
    <Panel>
      <Paradigm
        label={t`I form and would form of nine verbs`}
        columns={[t`I do`, t`I would`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a form`,
          tip: (
            <Trans>
              Drop the <b lang="et">-n</b> of the present and add <b lang="et">-ksin</b>.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

function PersonTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = COND_PERSONS.map((row) => ({
    id: row.person,
    label: i18n._(PERSONS[row.person] as MessageDescriptor),
    et: row.person,
    cells: [
      {
        form: row.said.replace(/\.$/, "").replace(/(läheks)(\w*)$/, "lähe|ks$2"),
        src: src(row.said),
      },
      { form: row.no.replace(/\.$/, "").replace(/läheks$/, "lähe|ks"), src: src(row.no) },
    ],
  }));
  return (
    <Panel>
      <Paradigm
        label={t`The would form of minema`}
        columns={[t`Would go`, t`Wouldn’t go`]}
        rows={rows}
        empty={{
          title: t`Tap a form`,
          tip: (
            <Trans>
              <b lang="et">-ks</b> is in every person. The form for <b lang="et">ta</b> stops at it,
              and <b lang="et">nad</b> ends like <b lang="et">sa</b>. After <b lang="et">ei</b>,
              every person takes the form for <b lang="et">ta</b>.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const forms: FormItem[] = COND_FORM_QUIZ.map((item) => ({
      base: `${item.ma}, ${item.n}`,
      gloss: i18n._(VERBS[item.ma] as MessageDescriptor),
      cue: `${item.person} …`,
      cueLang: "et",
      answers: [
        item.answer,
        ...(COND_SHORT[item.answer] ? [COND_SHORT[item.answer] as string] : []),
      ],
      src: src(item.said),
      said: item.said,
      explain: (
        <Trans>
          Drop the <b lang="et">-n</b> of <b lang="et">{item.n}</b> and add <b lang="et">-ks</b>{" "}
          with the ending for <b lang="et">{item.person}</b>: <b lang="et">{item.answer}</b>.
        </Trans>
      ),
    }));

    const heard: (ChoiceItem & { said: string; pair: readonly [string, string] })[] =
      COND_HEARD.flatMap((group) =>
        MOODS.map((mood) => ({
          said: group[mood],
          src: src(group[mood]),
          answer: mood,
          options: heardOptions(group.id, MOODS, i18n),
          pair: [mood, group[mood]] as const,
          explain:
            mood === "would" ? (
              <Trans>
                <b lang="et">-ks</b> in the verb: would.
              </Trans>
            ) : mood === "past" ? (
              <Trans>
                The simple past: no <b lang="et">-ks</b>.
              </Trans>
            ) : (
              <Trans>
                The present: no <b lang="et">-ks</b>.
              </Trans>
            ),
        })),
      );

    const sort: SortItem[] = COND_SORT.map(({ w, would }) => ({
      w,
      bin: would ? "would" : "does",
      src: src(w),
    }));

    const cues: Record<(typeof COND_REWRITE)[number]["cue"], string> = {
      politely: t`politely`,
      would: t`would`,
    };
    const rewrites: SentenceItem[] = COND_REWRITE.map((item) => ({
      kind: "rewrite",
      id: clipId(item.to),
      from: item.from,
      cue: cues[item.cue],
      src: src(item.to),
      answers: COND_ANSWERS[item.to] ?? [item.to],
      explain:
        item.to === "Ma ei läheks." ? (
          <Trans>
            After <b lang="et">ei</b>, the form for <b lang="et">ta</b>: <b lang="et">läheks</b>.
          </Trans>
        ) : (
          <Trans>
            The verb takes <b lang="et">-ks</b> and usually its person’s ending.
          </Trans>
        ),
    }));

    const translations: (SentenceItem & { pair: readonly [string, string] })[] = [
      {
        kind: "translate",
        id: "like-coffee",
        prompt: t`I’d like a coffee, please.`,
        src: src("Ma tahaksin kohvi."),
        answers: COND_ANSWERS["Ma tahaksin kohvi."],
        pair: ["polite", "like-coffee"],
      },
      {
        kind: "translate",
        id: "could-help",
        prompt: t`Could you help me?`,
        src: src("Kas sa saaksid mind aidata?"),
        answers: COND_ANSWERS["Kas sa saaksid mind aidata?"],
        pair: ["polite", "could-help"],
      },
      {
        kind: "translate",
        id: "if-time",
        prompt: t`If I had time, I’d go to the cinema.`,
        src: src("Kui mul oleks aega, läheksin ma kinno."),
        answers: COND_ANSWERS["Kui mul oleks aega, läheksin ma kinno."],
        pair: ["if", "if-time"],
        explain: <Trans>An imagined if: both halves take the would form.</Trans>,
      },
      {
        kind: "translate",
        id: "would-not-go",
        prompt: t`I wouldn’t go.`,
        src: src("Ma ei läheks."),
        answers: COND_ANSWERS["Ma ei läheks."],
        pair: ["no", "would-not-go"],
      },
      {
        kind: "translate",
        id: "live-tartu",
        prompt: t`We would live in Tartu.`,
        src: src("Me elaksime Tartus."),
        answers: COND_ANSWERS["Me elaksime Tartus."],
        pair: ["would", "live-tartu"],
      },
      {
        kind: "translate",
        id: "read-book",
        prompt: t`Would you read this book?`,
        src: src("Kas sa loeksid seda raamatut?"),
        answers: COND_ANSWERS["Kas sa loeksid seda raamatut?"],
        pair: ["would", "read-book"],
      },
      {
        kind: "translate",
        id: "if-warm",
        prompt: t`If it were warm, we would swim in the sea.`,
        src: src("Kui oleks soe, ujuksime me meres."),
        answers: COND_ANSWERS["Kui oleks soe, ujuksime me meres."],
        pair: ["if", "if-warm"],
      },
    ];

    const fixWhy: Record<string, ReactNode> = {
      "Ma ei läheks kinno.": (
        <Trans>
          After <b lang="et">ei</b>, the would form has no person ending: <b lang="et">läheks</b>.
        </Trans>
      ),
      "Kas sa saaksid mind aidata?": (
        <Trans>
          For <b lang="et">sa</b>, the full ending is <b lang="et">-d</b>: <b lang="et">saaksid</b>.
        </Trans>
      ),
      "Kui mul oleks aega, läheksin ma kinno.": (
        <Trans>
          An imagined if takes the would form in both halves: <b lang="et">oleks</b>.
        </Trans>
      ),
      "Me läheksime homme kinno.": (
        <Trans>
          For <b lang="et">me</b>, the full ending is <b lang="et">-me</b>:{" "}
          <b lang="et">läheksime</b>.
        </Trans>
      ),
      "Ta läheks koju.": (
        <Trans>
          The form for <b lang="et">ta</b> has no ending: <b lang="et">läheks</b>.
        </Trans>
      ),
      "Kui ma oleksin rikas, ostaksin maja.": (
        <Trans>
          The other half takes the would form too: <b lang="et">ostaksin</b>.
        </Trans>
      ),
      "Te loeksite seda raamatut.": (
        <Trans>
          For <b lang="et">te</b>, the full ending is <b lang="et">-te</b>:{" "}
          <b lang="et">loeksite</b>.
        </Trans>
      ),
    };
    const fixes: FixItem[] = COND_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${clipId(item.right)}`,
      wrong: item.wrong,
      prompt: FIX_PROMPTS[item.right]
        ? i18n._(FIX_PROMPTS[item.right] as MessageDescriptor)
        : undefined,
      answers: COND_FIX_ANSWERS[item.right] ?? [item.right],
      src: src(item.right),
      explain: fixWhy[item.right],
    }));

    const line = (id: keyof typeof COND_DIALOGUE) => {
      const clip = COND_DIALOGUE[id];
      return typeof clip === "string" ? clip : clip.text;
    };
    const talk: DialogueTurn[] = [
      { who: "them", clip: "d-teenindaja-1", line: line("d-teenindaja-1") },
      {
        who: "you",
        clip: "d-sina-1",
        replies: [
          {
            line: "Ma tahan teed.",
            why: (
              <Trans>
                That sounds abrupt. Ask with the would form: <b lang="et">tahaksin</b>.
              </Trans>
            ),
          },
          { line: line("d-sina-1"), right: true },
          {
            line: "Ma tahaksin üht kohvi ja üht kooki.",
            why: <Trans>You want tea.</Trans>,
          },
        ],
      },
      { who: "them", clip: "d-teenindaja-2", line: line("d-teenindaja-2") },
      {
        who: "you",
        clip: "d-sina-2",
        replies: [
          {
            line: "Ei, aitäh, ma ei sooviks midagi süüa.",
            why: <Trans>You’d like a sandwich.</Trans>,
          },
          {
            line: "Ei, aitäh, ma sööksin hiljem kodus.",
            why: <Trans>You’d like a sandwich now.</Trans>,
          },
          { line: line("d-sina-2"), right: true },
        ],
      },
      { who: "them", clip: "d-teenindaja-3", line: line("d-teenindaja-3") },
      {
        who: "you",
        clip: "d-sina-3",
        replies: [
          { line: line("d-sina-3"), right: true },
          {
            line: "Ma istuksin akna all.",
            why: <Trans>You’d like to sit on the terrace.</Trans>,
          },
          {
            line: "Akna all, palun.",
            why: <Trans>You’d like to sit on the terrace.</Trans>,
          },
        ],
      },
      { who: "them", clip: "d-teenindaja-4", line: line("d-teenindaja-4") },
    ];

    const exam: PassageQuestion[] = [
      {
        id: "where",
        ask: t`Where would Jaan go?`,
        options: [
          { id: "japan", label: t`To Japan` },
          { id: "finland", label: t`To Finland` },
          { id: "lapland", label: t`To Lapland, in the far north` },
        ],
        answer: "japan",
        line: 2,
      },
      {
        id: "weeks",
        kind: "short",
        ask: t`How many weeks would Jaan stay there? Write the number as he says it.`,
        answers: ["kolm", "3"],
        line: 8,
      },
      {
        id: "as-well",
        kind: "truefalse",
        ask: t`Jaan thinks he would speak Japanese as well as Estonian.`,
        answer: false,
        line: 13,
      },
      {
        id: "grandmother",
        kind: "truefalse",
        ask: t`Mari would spend the month at her grandmother’s in the country.`,
        answer: true,
        line: 19,
      },
      {
        id: "bad-weather",
        ask: t`What would Mari do if the weather were bad?`,
        options: [
          { id: "read", label: t`Read in the forest` },
          { id: "bake", label: t`Bake cakes with her grandmother` },
          { id: "swim", label: t`Swim in the lake` },
        ],
        answer: "bake",
        line: 27,
      },
      {
        id: "grandparents",
        kind: "truefalse",
        ask: t`Jaan’s grandparents live in the country.`,
        answer: false,
        line: 30,
      },
      {
        id: "dig",
        kind: "short",
        ask: t`What could Jaan dig in the garden? Write it as Mari says it.`,
        answers: ["kartuleid"],
        line: 38,
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
          { id: "japanese", label: t`I’d learn a little Japanese.`, answer: "jaan", line: 6 },
          { id: "far", label: t`I wouldn’t go far.`, answer: "mari", line: 18 },
          { id: "gladly", label: t`I’d love to come.`, answer: "jaan", line: 34 },
          { id: "save", label: t`First we should save some money.`, answer: "mari", line: 46 },
          { id: "coffee", label: t`I wouldn’t buy coffee every day.`, answer: "jaan", line: 49 },
        ],
      },
    ];

    return { forms, heard, sort, rewrites, translations, fixes, talk, exam };
  }, [t, i18n]);
}

const pairRun = <T extends { pair: readonly [string, string] }>(items: readonly T[], pinned?: T) =>
  eachPairFirst(items, pinned);

export function LaheksinLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const present = lessonBySlug("olevik")?.n;
  const verbForms = lessonBySlug("verbi-pohivormid")?.n;
  const modal = lessonBySlug("modaalverbid")?.n;
  const names = { second: t`Mari`, main: t`Jaan` };
  const rowsOf = (texts: readonly string[]): RowItem[] =>
    texts.map((text) => ({ main: text, sub: means(text, i18n), src: src(text) }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          The conditional, or would form: <b lang="et">-ks</b> in the verb, for wishes, polite
          requests and what would happen if.
        </Trans>
      }
      facts={[
        <Trans key="m">22 minutes</Trans>,
        <Trans key="q">8 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["kui", "hea meelega", "läheksin", "tahaksin", "oleks"]}
      recap={[
        <Trans key="1">
          Take the present’s <b lang="et">ma</b> form without <b lang="et">-n</b> and add{" "}
          <b lang="et">-ks</b>, usually with the person’s ending:{" "}
          <b lang="et">lähen, läheksin, läheksid, läheks</b>.
        </Trans>,
        <Trans key="2">
          To say would not, put <b lang="et">ei</b> before the form for <b lang="et">ta</b>:{" "}
          <b lang="et">ma ei läheks</b>.
        </Trans>,
        <Trans key="3">
          Ask politely with it: <b lang="et">Ma tahaksin kohvi. Kas sa saaksid mind aidata?</b>
        </Trans>,
        <Trans key="4">
          In an imagined if sentence, both halves take it:{" "}
          <b lang="et">Kui mul oleks aega, läheksin ma kinno.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "build",
          title: t`The would form`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Läheksin" /> means I would go. Take the <b lang="et">ma</b> form of the
                    present from lesson {present}, <b lang="et">lähen</b>, drop its{" "}
                    <b lang="et">-n</b>, and add <b lang="et">-ksin</b>. Every verb works this way.
                    Tap each form in the table to hear it.
                  </Trans>
                </p>
              </Prose>
              <VerbTable />
              <Prose>
                <p>
                  <Trans>
                    For the other persons, <b lang="et">-ks</b> takes <b lang="et">-id</b> for{" "}
                    <b lang="et">sa</b> and <b lang="et">nad</b>, <b lang="et">-ime</b> for{" "}
                    <b lang="et">me</b> and <b lang="et">-ite</b> for <b lang="et">te</b>. The form
                    for <b lang="et">ta</b> stops at <b lang="et">-ks</b>: <Word w="oleks" />, would
                    be.
                  </Trans>
                </p>
              </Prose>
              <PersonTable />
              <Prose>
                <p>
                  <Trans>
                    To say would not, put <b lang="et">ei</b> before the form for{" "}
                    <b lang="et">ta</b>, for every person: <Word w="Ma ei läheks." />
                  </Trans>
                </p>
              </Prose>
              <Aside>
                <Trans>
                  Lesson {verbForms} gave each verb its present; that’s the one to start from.{" "}
                  <b lang="et">Õppima</b> gives <b lang="et">õpin</b>, so <b lang="et">õpiksin</b>,
                  not <b lang="et">õppiksin</b>.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>
                    Each round gives a verb, its present for <b lang="et">ma</b>, and a person. Type
                    the would form.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-would"
                title={<Trans>Type the would form</Trans>}
                items={content.forms}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, typed in full.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the person’s ending in the ones you got wrong.</Trans>
                  ) : (
                    <Trans>Tap each form in both tables once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "spot",
          title: t`Now or would`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Put each form in its bin. A would form always has <b lang="et">-ks</b>.
                  </Trans>
                </p>
              </Prose>
              <Sort
                id="does-or-would"
                title={<Trans>Now or would?</Trans>}
                bins={[
                  {
                    id: "does",
                    label: t`Now`,
                    lang: i18n.locale,
                    rule: (
                      <Trans>
                        The present: no <b lang="et">-ks</b>.
                      </Trans>
                    ),
                  },
                  {
                    id: "would",
                    label: t`Would`,
                    lang: i18n.locale,
                    rule: (
                      <Trans>
                        <b lang="et">-ks</b> in the verb: would.
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
          id: "hear",
          title: t`Now, would or past`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence, then pick what it means. Listen for <b lang="et">-ks</b>.
                    Without it, a changed stem or <b lang="et">-s</b> means the past:{" "}
                    <b lang="et">tulin, oli, ostis</b>.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="hear-mood"
                title={<Trans>What does it mean?</Trans>}
                items={content.heard}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six: right every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you got wrong once more.</Trans>
                  ) : (
                    <Trans>Play the sentences you missed once more, then try again.</Trans>
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
          id: "polite",
          title: t`Asking politely`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The would form makes a request polite, as could and would do in English.{" "}
                    <b lang="et">Saama</b> and <b lang="et">võima</b> from lesson {modal} give{" "}
                    <b lang="et">saaksid</b> and <b lang="et">võiksite</b>: could you.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rowsOf(COND_POLITE)} />
              <Aside>
                <Trans>
                  In speech you’ll often hear the form for <b lang="et">ta</b> with{" "}
                  <b lang="et">ma</b> too: <b lang="et">ma tahaks</b>, <b lang="et">ma läheks</b>.
                  In careful writing, <b lang="et">tahaksin</b> and <b lang="et">läheksin</b> are
                  more usual.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>
                    Each round gives a sentence and a cue. Write it with the would form.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-polite"
                title={<Trans>Say it with would</Trans>}
                items={content.rewrites}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, each with the would form.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the ending in the ones you got wrong.</Trans>
                  ) : (
                    <Trans>Listen to the requests above once more, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "if",
          title: t`If, and would`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Kui" /> means if. When the if is imagined, English says “if I had”,
                    then “I would”; Estonian puts both halves in the would form:{" "}
                    <Word w="Kui mul oleks aega, läheksin ma kinno." /> For a real if, both usually
                    stay in the present: <b lang="et">Kui mul on aega, lähen ma kinno.</b>
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rowsOf(COND_IF)} />
              <Prose>
                <p>
                  <Trans>Write each sentence in Estonian.</Trans>
                </p>
              </Prose>
              <Quiz
                id="write-would"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven, each with the would form where it belongs.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check both halves of the if sentences.</Trans>
                  ) : (
                    <Trans>Listen to the sentences above once more, then try again.</Trans>
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
          title: t`Fix the would form`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has one verb in the wrong form. Tap it, then type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-would"
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
          id: "cafe",
          title: t`Ordering politely`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    You order at a café. Pick what you say back. A wrong reply says why, then you
                    hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="polite-order"
                title={<Trans>Talk: at a café</Trans>}
                part={
                  <Trans>
                    You’d like a tea and a sandwich, and you’d like to sit on the terrace.
                  </Trans>
                }
                them={t`Server`}
                turns={content.talk}
              />
            </>
          ),
        },
        {
          id: "holiday",
          title: t`A month off`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Mari asks Jaan what he would do with a month off.</Trans>
                </p>
              </Prose>
              <Listening
                id="month-off"
                title={<Trans>Listen: Mari and Jaan</Trans>}
                clip="c-holiday"
                turns={COND_CONVERSATION.turns}
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
