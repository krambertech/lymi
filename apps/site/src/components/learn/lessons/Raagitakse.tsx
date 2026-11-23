import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  IMPERSONAL_CONVERSATION,
  IMPERSONAL_FIXES,
  IMPERSONAL_FIX_ANSWERS,
  IMPERSONAL_FORM_QUIZ,
  IMPERSONAL_GAPS,
  IMPERSONAL_HEARD,
  IMPERSONAL_KINDS,
  IMPERSONAL_NO,
  IMPERSONAL_OPTIONS,
  IMPERSONAL_USES,
  IMPERSONAL_ANSWERS,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, ListenRows, Panel, type RowItem } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "raagitakse";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const VERBS: Record<string, MessageDescriptor> = {
  rääkima: msg`to speak`,
  lugema: msg`to read`,
  elama: msg`to live`,
  ootama: msg`to wait`,
  ehitama: msg`to build`,
  kuulma: msg`to hear`,
  laulma: msg`to sing`,
  saama: msg`to get`,
  tegema: msg`to do, to make`,
  nägema: msg`to see`,
  sööma: msg`to eat`,
  jooma: msg`to drink`,
  minema: msg`to go`,
  tulema: msg`to come`,
  panema: msg`to put`,
  müüma: msg`to sell`,
  avama: msg`to open`,
};

const FIX_PROMPTS: Record<string, MessageDescriptor> = {
  "Eestis räägitakse eesti keelt.": msg`Estonian is spoken in Estonia.`,
  "Eile räägiti sellest.": msg`People talked about it yesterday.`,
  "Jaanipäeval tehakse lõke.": msg`At Midsummer, people make a bonfire.`,
  "Talvel minnakse sauna.": msg`In winter, people go to the sauna.`,
  "Uus kool ehitatakse järgmisel aastal.": msg`A new school will be built next year.`,
};

const MEANS: Record<string, MessageDescriptor> = {
  "Eestis räägitakse eesti keelt.": msg`Estonian is spoken in Estonia.`,
  "Poes müüakse leiba.": msg`Bread is sold in the shop.`,
  "Pood avatakse kell üheksa.": msg`The shop opens at nine.`,
  "See maja ehitati 1920. aastal.": msg`This house was built in 1920.`,
};

const means = (text: string, i18n: I18n) => {
  const found = MEANS[text];
  return found ? i18n._(found) : "";
};

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    Object.entries(MEANS).map(([text, en]) => [text.toLowerCase(), { en, show: text }]),
  ),
  vanasti: { en: msg`in the old days` },
  jaanipäev: { en: msg`Midsummer Day, 24 June` },
  lõke: { en: msg`bonfire` },
  püha: { en: msg`holiday, feast` },
  komme: { en: msg`custom, tradition` },
  räägitakse: { en: msg`is spoken, people speak`, note: msg`Räägitud, with -takse for -tud.` },
};

type Kind = keyof typeof IMPERSONAL_KINDS;
const KINDS: readonly Kind[] = ["regular", "heart"];

function FormTable() {
  const { t, i18n } = useLingui();
  const [kind, setKind] = useState<Kind>("regular");
  const labels: Record<Kind, string> = { regular: t`Regular`, heart: t`Learn by heart` };
  const tips: Record<Kind, ReactNode> = {
    regular: (
      <Trans>
        For “people do”, <b lang="et">-tud</b> becomes <b lang="et">-takse</b> and{" "}
        <b lang="et">-dud</b> becomes <b lang="et">-dakse</b>. For “people did”, they become{" "}
        <b lang="et">-ti</b> and <b lang="et">-di</b>.
      </Trans>
    ),
    heart: (
      <Trans>
        These don’t follow the rule for “people do”: the ending is <b lang="et">-akse</b>, and the
        stem often changes too: <b lang="et">söödud, süüakse</b>. “People did” still follows the
        rule: <b lang="et">tehtud, tehti</b>.
      </Trans>
    ),
  };
  const rows: ParadigmRow[] = IMPERSONAL_KINDS[kind].map((verb) => ({
    id: verb.ma,
    label: i18n._(VERBS[verb.ma] as MessageDescriptor),
    et: verb.ma,
    cells: [
      { form: verb.done.replace(/(tud|dud)$/, "|$1"), src: src(verb.done) },
      { form: verb.now.replace(/(takse|dakse|akse)$/, "|$1"), src: src(verb.now) },
      { form: verb.past.replace(/(ti|di)$/, "|$1"), src: src(verb.past) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Kinds of verb`}
        items={KINDS.map((each) => ({ label: labels[each], value: each }))}
        value={kind}
        onPick={setKind}
      />
      <Paradigm
        key={kind}
        label={t`Three impersonal forms of eight verbs`}
        columns={[t`Done`, t`People do`, t`People did`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{ title: t`Tap a form`, tip: tips[kind] }}
      />
    </Panel>
  );
}

type When = "now" | "past" | "no";
const WHENS: readonly When[] = ["now", "past", "no"];

const HEARD_MEANS: Record<
  (typeof IMPERSONAL_HEARD)[number]["id"],
  Record<When, MessageDescriptor>
> = {
  smoke: {
    now: msg`People smoke here.`,
    past: msg`People smoked here.`,
    no: msg`No smoking here.`,
  },
  speak: {
    now: msg`Estonian is spoken here.`,
    past: msg`Estonian was spoken here.`,
    no: msg`Estonian isn’t spoken here.`,
  },
  repair: {
    now: msg`Repairs are being done here.`,
    past: msg`Repairs were done here.`,
    no: msg`No repairs are done here.`,
  },
  fish: {
    now: msg`People eat fish here.`,
    past: msg`People ate fish here.`,
    no: msg`People don’t eat fish here.`,
  },
};

export const heardOptions = (id: (typeof IMPERSONAL_HEARD)[number]["id"], i18n: I18n) =>
  WHENS.map((when) => ({
    id: when,
    label: (
      <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
        {i18n._(HEARD_MEANS[id][when])}
      </span>
    ),
  }));

type GapRun = FormItem & {
  said: string;
  options: readonly string[];
  pair: readonly [string, string];
};

export const gapRun = <T extends { pair: readonly [string, string]; options: readonly string[] }>(
  items: readonly T[],
  pinned?: T,
): T[] =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle(item.options) },
  );

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const whenCue: Record<"now" | "past", string> = {
      now: t`people do it`,
      past: t`people did it`,
    };
    const forms: FormItem[] = IMPERSONAL_FORM_QUIZ.map((item) => ({
      base: `${item.ma}, ${item.done}`,
      gloss: i18n._(VERBS[item.ma] as MessageDescriptor),
      cue: whenCue[item.when],
      answers: [item.answer],
      src: src(item.answer),
      explain:
        item.when === "now" ? (
          <Trans>
            <b lang="et">{item.done}</b>: <b lang="et">-tud</b> becomes <b lang="et">-takse</b>,{" "}
            <b lang="et">-dud</b> becomes <b lang="et">-dakse</b>.
          </Trans>
        ) : (
          <Trans>
            <b lang="et">{item.done}</b>: <b lang="et">-tud</b> becomes <b lang="et">-ti</b>,{" "}
            <b lang="et">-dud</b> becomes <b lang="et">-di</b>.
          </Trans>
        ),
    }));

    const whys: Record<string, ReactNode> = {
      person: <Trans>A person is named, so the verb takes that person’s form.</Trans>,
      now: <Trans>No person is named, and it isn’t past: people do.</Trans>,
      past: <Trans>No person is named, and it happened in the past: people did.</Trans>,
    };
    const gaps: GapRun[] = IMPERSONAL_GAPS.map((gap) => {
      const said = `${gap.before} ${gap.answer} ${gap.after}`;
      const kind = gap.id.split("-").at(-1) as string;
      return {
        said,
        base: gap.verb,
        gloss: i18n._(VERBS[gap.verb] as MessageDescriptor),
        cue: `${gap.before} … ${gap.after}`,
        cueLang: "et",
        src: src(said),
        options: IMPERSONAL_OPTIONS[gap.verb],
        answers: [gap.answer],
        pair: [kind, gap.id] as const,
        explain: whys[kind],
      };
    });

    const heard: (ChoiceItem & { said: string; pair: readonly [string, string] })[] =
      IMPERSONAL_HEARD.flatMap((group) =>
        WHENS.map((when) => ({
          said: group[when],
          src: src(group[when]),
          answer: when,
          options: heardOptions(group.id, i18n),
          pair: [when, group[when]] as const,
          explain:
            when === "now" ? (
              <Trans>
                <b lang="et">-takse</b> or <b lang="et">-akse</b>: people do it now.
              </Trans>
            ) : when === "past" ? (
              <Trans>
                <b lang="et">-ti</b> or <b lang="et">-di</b>: people did it.
              </Trans>
            ) : (
              <Trans>
                <b lang="et">Ei</b> and a form in <b lang="et">-ta</b> or <b lang="et">-da</b>:
                people don’t.
              </Trans>
            ),
        })),
      );

    const noes: SentenceItem[] = IMPERSONAL_NO.map((item) => ({
      kind: "rewrite",
      id: clipId(item.to),
      from: item.from,
      cue: t`say no`,
      src: src(item.to),
      answers: IMPERSONAL_ANSWERS[item.to] ?? [item.to],
      explain: item.to.includes("tud") ? (
        <Trans>
          In the past, <b lang="et">ei</b> and the <b lang="et">-tud</b> form.
        </Trans>
      ) : (
        <Trans>
          Now, <b lang="et">ei</b> and the <b lang="et">-tud</b> form with <b lang="et">-ta</b>, or{" "}
          <b lang="et">-dud</b> with <b lang="et">-da</b>.
        </Trans>
      ),
    }));

    const translations: (SentenceItem & { pair: readonly [string, string] })[] = [
      {
        kind: "translate",
        id: "spoken",
        prompt: t`Estonian is spoken in Estonia.`,
        src: src("Eestis räägitakse eesti keelt."),
        answers: IMPERSONAL_ANSWERS["Eestis räägitakse eesti keelt."],
        pair: ["now", "spoken"],
      },
      {
        kind: "translate",
        id: "opens",
        prompt: t`The shop opens at nine.`,
        src: src("Pood avatakse kell üheksa."),
        answers: IMPERSONAL_ANSWERS["Pood avatakse kell üheksa."],
        pair: ["now", "opens"],
        explain: (
          <Trans>
            Someone opens it, but nobody is named: <b lang="et">avatakse</b>.
          </Trans>
        ),
      },
      {
        kind: "translate",
        id: "built",
        prompt: t`This house was built in 1920.`,
        src: src("See maja ehitati 1920. aastal."),
        answers: IMPERSONAL_ANSWERS["See maja ehitati 1920. aastal."],
        pair: ["past", "built"],
      },
      {
        kind: "translate",
        id: "no-smoking",
        prompt: t`No smoking here.`,
        src: src("Siin ei suitsetata."),
        answers: IMPERSONAL_ANSWERS["Siin ei suitsetata."],
        pair: ["no", "no-smoking"],
      },
      {
        kind: "translate",
        id: "bread",
        prompt: t`Bread is sold here.`,
        src: src("Siin müüakse leiba."),
        answers: IMPERSONAL_ANSWERS["Siin müüakse leiba."],
        pair: ["now", "bread"],
      },
      {
        kind: "translate",
        id: "bonfire",
        prompt: t`At Midsummer, people make a bonfire.`,
        src: src("Jaanipäeval tehakse lõke."),
        answers: IMPERSONAL_ANSWERS["Jaanipäeval tehakse lõke."],
        pair: ["now", "bonfire"],
      },
      {
        kind: "translate",
        id: "sunday",
        prompt: t`People don’t work on Sundays.`,
        src: src("Pühapäeval ei töötata."),
        answers: IMPERSONAL_ANSWERS["Pühapäeval ei töötata."],
        pair: ["no", "sunday"],
      },
    ];

    const fixWhy: Record<string, ReactNode> = {
      "Eestis räägitakse eesti keelt.": (
        <Trans>
          No person is named: <b lang="et">räägitakse</b>.
        </Trans>
      ),
      "Siin ei suitsetata.": (
        <Trans>
          After <b lang="et">ei</b>, the <b lang="et">-tud</b> form with <b lang="et">-ta</b>:{" "}
          <b lang="et">suitsetatud, ei suitsetata</b>.
        </Trans>
      ),
      "Eile räägiti sellest.": (
        <Trans>
          <b lang="et">Eile</b> is the past: <b lang="et">räägiti</b>.
        </Trans>
      ),
      "Uus kool ehitatakse järgmisel aastal.": (
        <Trans>
          The school doesn’t build anything; people build it: <b lang="et">ehitatakse</b>.
        </Trans>
      ),
      "Jaanipäeval tehakse lõke.": (
        <Trans>
          <b lang="et">Tegema</b> is one to learn by heart: <b lang="et">tehakse</b>.
        </Trans>
      ),
      "Talvel minnakse sauna.": (
        <Trans>
          <b lang="et">Minema</b> is one to learn by heart: <b lang="et">minnakse</b>.
        </Trans>
      ),
      "Siin ei räägitud saksa keelt.": (
        <Trans>
          In the past, <b lang="et">ei</b> takes the <b lang="et">-tud</b> form:{" "}
          <b lang="et">räägitud</b>.
        </Trans>
      ),
    };
    const fixes: FixItem[] = IMPERSONAL_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${clipId(item.right)}`,
      wrong: item.wrong,
      prompt: FIX_PROMPTS[item.right]
        ? i18n._(FIX_PROMPTS[item.right] as MessageDescriptor)
        : undefined,
      answers: IMPERSONAL_FIX_ANSWERS[item.right] ?? [item.right],
      src: src(item.right),
      explain: fixWhy[item.right],
    }));

    const exam: PassageQuestion[] = [
      {
        id: "eve",
        ask: t`Where do people go on Midsummer Eve?`,
        options: [
          { id: "country", label: t`To the country` },
          { id: "town", label: t`Nowhere: they stay in town` },
          { id: "sea", label: t`To the sea, to swim all night` },
        ],
        answer: "country",
        line: 2,
      },
      {
        id: "towns",
        kind: "truefalse",
        ask: t`Towns are full of people on Midsummer Eve.`,
        answer: false,
        line: 3,
      },
      {
        id: "luck",
        kind: "short",
        ask: t`What does jumping over the fire bring? Write it as Jaan says it.`,
        answers: ["õnne"],
        line: 6,
      },
      {
        id: "drink",
        ask: t`What do people drink?`,
        options: [
          { id: "beer", label: t`Beer and kvass` },
          { id: "wine", label: t`Wine` },
          { id: "juice", label: t`Juice` },
        ],
        answer: "beer",
        line: 12,
      },
      {
        id: "kvass",
        kind: "truefalse",
        ask: t`In the country, people make kvass at home.`,
        answer: true,
        line: 14,
      },
      {
        id: "sleep",
        kind: "truefalse",
        ask: t`On Midsummer night, people go to bed early.`,
        answer: false,
        line: 17,
      },
      {
        id: "flower",
        kind: "short",
        ask: t`What did people look for in the forest in the old days? Write it as Jaan says it.`,
        answers: ["sõnajalaõit", "sõnajalaõis"],
        line: 18,
      },
      {
        id: "last-year",
        ask: t`Where was Jaan last Midsummer?`,
        options: [
          { id: "tallinn", label: t`In Tallinn` },
          { id: "saaremaa", label: t`At his grandmother’s on Saaremaa` },
          { id: "tartu", label: t`In Tartu, at a friend’s summer house` },
        ],
        answer: "saaremaa",
        line: 30,
      },
      {
        id: "who",
        kind: "match",
        ask: t`Who says it?`,
        options: [
          { id: "anna", label: t`Anna` },
          { id: "jaan", label: t`Jaan` },
        ],
        statements: [
          { id: "kvass", label: t`Is kvass made at home?`, answer: "anna", line: 13 },
          { id: "work", label: t`People don’t work then.`, answer: "jaan", line: 25 },
          { id: "invited", label: t`Will I be invited too?`, answer: "anna", line: 39 },
          {
            id: "party",
            label: t`This year the party is at my summer house.`,
            answer: "jaan",
            line: 41,
          },
          { id: "come", label: t`I’d love to come.`, answer: "anna", line: 48 },
        ],
      },
    ];

    return { forms, gaps, heard, noes, translations, fixes, exam };
  }, [t, i18n]);
}

const pairRun = <T extends { pair: readonly [string, string] }>(items: readonly T[], pinned?: T) =>
  eachPairFirst(items, pinned);

export function RaagitakseLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const perfect = lessonBySlug("olen-lugenud")?.n;
  const names = { second: t`Anna`, main: t`Jaan` };
  const rowsOf = (texts: readonly string[]): RowItem[] =>
    texts.map((text) => ({ main: text, sub: means(text, i18n), src: src(text) }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          The impersonal: what people do, or what is done, with no person named.{" "}
          <b lang="et">Eestis räägitakse eesti keelt.</b>
        </Trans>
      }
      facts={[
        <Trans key="m">22 minutes</Trans>,
        <Trans key="q">7 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["vanasti", "jaanipäev", "lõke", "püha", "komme"]}
      recap={[
        <Trans key="1">
          The impersonal names no person: <b lang="et">Eestis räägitakse eesti keelt.</b> English
          often says it with “is done” or “people do”.
        </Trans>,
        <Trans key="2">
          Build it from the <b lang="et">-tud</b> form, usually like this:{" "}
          <b lang="et">-tud, -takse, -ti</b> and <b lang="et">-dud, -dakse, -di</b>.{" "}
          <b lang="et">Räägitud, räägitakse, räägiti.</b>
        </Trans>,
        <Trans key="3">
          A few take <b lang="et">-akse</b> for “people do”, often with a new stem:{" "}
          <b lang="et">tehakse, süüakse, minnakse</b>. Their past still follows the rule:{" "}
          <b lang="et">tehti, söödi, mindi</b>.
        </Trans>,
        <Trans key="4">
          To say no now: <b lang="et">ei</b> and the <b lang="et">-tud</b> form with{" "}
          <b lang="et">-ta</b> or <b lang="et">-da</b>: <b lang="et">ei räägita, ei tehta</b>. In
          the past: <b lang="et">ei</b> and the <b lang="et">-tud</b> form:{" "}
          <b lang="et">ei räägitud</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "nobody",
          title: t`No person named`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Sometimes it doesn’t matter who does something. <Word w="räägitakse" /> means
                    people speak, or is spoken: no person is named. Estonian uses this form far more
                    than English uses “is done”.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rowsOf(IMPERSONAL_USES)} />
            </>
          ),
        },
        {
          id: "build",
          title: t`Built from the -tud form`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each verb has a form in <b lang="et">-tud</b> or <b lang="et">-dud</b>: done.{" "}
                    <b lang="et">Räägitud</b> is spoken, as in <b lang="et">sellest on räägitud</b>,
                    people have talked about it. Swap its ending, and you usually have “people do”
                    and “people did”. Tap each form in the table to hear it.
                  </Trans>
                </p>
              </Prose>
              <FormTable />
              <Aside>
                <Trans>
                  Lesson {perfect} built the perfect with <b lang="et">-nud</b>, for a named person:{" "}
                  <b lang="et">ma olen lugenud</b>. The <b lang="et">-tud</b> form does the same
                  with nobody named: <b lang="et">raamat on loetud</b>, the book has been read.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>
                    Each round gives a verb and its <b lang="et">-tud</b> form. Type “people do” or
                    “people did”, as the cue asks.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-impersonal"
                title={<Trans>Type the impersonal form</Trans>}
                items={content.forms}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, typed in full.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the ending in the ones you got wrong.</Trans>
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
          id: "who",
          title: t`A person, or people in general`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    When a person is named, the verb takes that person’s form:{" "}
                    <b lang="et">Mari räägib</b>. When nobody is, usually the impersonal:{" "}
                    <b lang="et">siin räägitakse</b>. Read the whole sentence: is a person named,
                    and is it past?
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="person-or-people"
                title={<Trans>Which form?</Trans>}
                items={content.gaps}
                rounds={9}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All nine: you can tell a person from people in general.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Look for a person before the gap, and for the time.</Trans>
                  ) : (
                    <Trans>Read the sections above once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={gapRun}
                round={(props) => <FormRound {...props} />}
              />
              <Aside>
                <Trans>
                  A whole thing that will get done takes the nominative:{" "}
                  <b lang="et">uus kool ehitatakse</b>, a new school will be built. While it is
                  going on, for some of something, or after <b lang="et">ei</b>, it’s partitive:{" "}
                  <b lang="et">uut kooli ehitatakse</b>, <b lang="et">poes müüakse leiba</b>,{" "}
                  <b lang="et">poes ei müüda leiba</b>.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "no",
          title: t`Saying no`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Now, put <b lang="et">ei</b> before the <b lang="et">-tud</b> form and change{" "}
                    <b lang="et">-tud</b> to <b lang="et">-ta</b>, <b lang="et">-dud</b> to{" "}
                    <b lang="et">-da</b>: <b lang="et">räägitud, ei räägita</b>;{" "}
                    <b lang="et">tehtud, ei tehta</b>; <b lang="et">söödud, ei sööda</b>. In the
                    past, <b lang="et">ei</b> takes the <b lang="et">-tud</b> form:{" "}
                    <b lang="et">ei räägitud</b>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Hear a sentence, then pick what it means. Listen for <b lang="et">ei</b>, and
                    for the ending.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="hear-impersonal"
                title={<Trans>What does it mean?</Trans>}
                items={content.heard}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six: you heard now, past and no each time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you got wrong once more.</Trans>
                  ) : (
                    <Trans>Play the sentences you missed once more, then try again.</Trans>
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
              <Prose>
                <p>
                  <Trans>Each round gives a sentence. Write it as a no.</Trans>
                </p>
              </Prose>
              <Quiz
                id="say-no"
                title={<Trans>Say it with no</Trans>}
                items={content.noes}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, each with the right no.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check whether each one is now or past.</Trans>
                  ) : (
                    <Trans>Read the start of this section once more, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "sentences",
          title: t`Write it in Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write each sentence in Estonian. English says “is done” or “people do”; Estonian
                    often uses one form for both.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-impersonal"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven, each with the impersonal.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the verb in the ones you got wrong.</Trans>
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
          title: t`Fix the verb`,
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
                id="fix-impersonal"
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
          id: "midsummer",
          title: t`Midsummer in Estonia`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Anna is new in Estonia. She asks Jaan what people do at Midsummer.</Trans>
                </p>
              </Prose>
              <Listening
                id="midsummer-customs"
                title={<Trans>Listen: Anna and Jaan</Trans>}
                clip="c-midsummer"
                turns={IMPERSONAL_CONVERSATION.turns}
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
