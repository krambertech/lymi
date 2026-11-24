import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  CONJ_ANSWERS,
  CONJ_CAUSE,
  CONJ_COMMAS,
  CONJ_CONVERSATION,
  CONJ_FIX_ANSWERS,
  CONJ_FIXES,
  CONJ_GAPS,
  CONJ_NOTICE,
  CONJ_ORDER,
  CONJ_REPLY,
  CONJ_TABLE,
  CONJ_TRANSLATE,
  CONJ_WORDS,
  clipId,
  clipUrl,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Panel } from "../Explore";
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

const SLUG = "et-sest-kui";
const src = (text: string) => clipUrl(SLUG, clipId(text));
const gapSaid = (gap: { before: string; answer: string; after: string }) =>
  [gap.before, gap.answer, gap.after].filter(Boolean).join(" ");

const MEANS: Record<(typeof CONJ_WORDS)[number], MessageDescriptor> = {
  et: msg`that, so that`,
  sest: msg`because`,
  kui: msg`when, if`,
  kuna: msg`since, because`,
  "nii et": msg`so`,
};

const GLOSSARY: Glossary = {
  et: { en: msg`that, so that`, note: msg`Ma tean, et sa tuled.` },
  sest: { en: msg`because`, note: msg`Ma jään koju, sest ma olen haige.` },
  kui: { en: msg`when, if`, note: msg`Kui sul on aega, tule külla.` },
  kuna: { en: msg`since, because`, note: msg`Kuna sajab, jääme koju.` },
  "nii et": { en: msg`so`, note: msg`Sadas, nii et me jäime koju.` },
  prügi: { en: msg`rubbish` },
  prügihunnikust: { en: msg`from the rubbish pile` },
  komistas: { en: msg`tripped` },
  ehitajad: { en: msg`builders` },
  remont: { en: msg`repairs, renovation` },
  enamik: { en: msg`most` },
  kindad: { en: msg`gloves` },
  kuid: { en: msg`but` },
  meremuuseum: { en: msg`maritime museum` },
  ilmateade: { en: msg`weather forecast` },
  hommikuinimene: { en: msg`morning person` },
};

const GAP_MEANS: Record<(typeof CONJ_GAPS)[number]["id"], MessageDescriptor> = {
  know: msg`I know you’re tired.`,
  school: msg`I didn’t go to school because I was ill.`,
  rain: msg`It rained, so we stayed home.`,
  home: msg`Call me when you get home.`,
  wrote: msg`Mari wrote that she can’t come.`,
  time: msg`I didn’t come because I had no time.`,
  bus: msg`The bus was late, so I was late for work.`,
  visit: msg`Come and visit us if you have time.`,
  storm: msg`We’re staying home today because it’s raining outside.`,
  work: msg`I’m learning Estonian so that I can find work here.`,
};

const GAP_WHY: Record<(typeof CONJ_GAPS)[number]["id"], ReactNode> = {
  know: (
    <Trans>
      <b lang="et">Et</b> says what someone knows, thinks or says.
    </Trans>
  ),
  school: (
    <Trans>
      <b lang="et">Sest</b> gives the reason. <b lang="et">Kuna</b> fits here too.
    </Trans>
  ),
  rain: (
    <Trans>
      <b lang="et">Nii et</b> gives the result of what came before.
    </Trans>
  ),
  home: (
    <Trans>
      <b lang="et">Kui</b> gives the time: when you get home.
    </Trans>
  ),
  wrote: (
    <Trans>
      <b lang="et">Et</b> says what Mari wrote.
    </Trans>
  ),
  time: (
    <Trans>
      <b lang="et">Sest</b> gives the reason. <b lang="et">Kuna</b> fits here too.
    </Trans>
  ),
  bus: (
    <Trans>
      <b lang="et">Nii et</b> gives the result: the bus was late, so I was late.
    </Trans>
  ),
  visit: (
    <Trans>
      <b lang="et">Kui</b> gives the condition: if you have time.
    </Trans>
  ),
  storm: (
    <Trans>
      <b lang="et">Kuna</b> gives the reason. <b lang="et">Sest</b> fits here too.
    </Trans>
  ),
  work: (
    <Trans>
      <b lang="et">Et</b> with the <b lang="et">-da</b> infinitive gives a purpose.
    </Trans>
  ),
};

const CAUSE_WHY: Record<(typeof CONJ_CAUSE)[number]["id"], ReactNode> = {
  stay: (
    <Trans>
      <b lang="et">Sest</b> gives the reason, so the cause is the second part.
    </Trans>
  ),
  rain: (
    <Trans>
      <b lang="et">Nii et</b> gives the result, so the cause is the first part.
    </Trans>
  ),
  storm: (
    <Trans>
      <b lang="et">Kuna</b> gives the reason, and here it comes first.
    </Trans>
  ),
  phone: (
    <Trans>
      <b lang="et">Sest</b> gives the reason: the old phone broke.
    </Trans>
  ),
  tired: (
    <Trans>
      <b lang="et">Nii et</b> gives the result: she was tired, so she went to bed.
    </Trans>
  ),
  time: (
    <Trans>
      <b lang="et">Kuna</b> gives the reason, here after the main clause.
    </Trans>
  ),
};

const COMMA_WHY: Record<(typeof CONJ_COMMAS)[number]["id"], ReactNode> = {
  know: (
    <Trans>
      The comma comes before <b lang="et">et</b>.
    </Trans>
  ),
  rain: (
    <Trans>
      The comma comes before <b lang="et">sest</b>.
    </Trans>
  ),
  first: (
    <Trans>
      When the <b lang="et">kui</b> clause comes first, the comma comes after it.
    </Trans>
  ),
  so: (
    <Trans>
      The comma comes before <b lang="et">nii et</b> as a whole.
    </Trans>
  ),
  call: (
    <Trans>
      The comma comes before <b lang="et">kui</b>.
    </Trans>
  ),
};

const ORDER_MEANS: Record<(typeof CONJ_ORDER)[number]["id"], MessageDescriptor> = {
  know: msg`I know she’s coming tomorrow.`,
  cold: msg`We stayed home because it was cold outside.`,
  home: msg`When I get home, I’ll call you.`,
  rain: msg`It rained, so we stayed home.`,
  visit: msg`If you have time, come and visit us.`,
  ill: msg`Since she was ill, she didn’t come.`,
};

const subjectFirst = (
  <Trans>
    After the linking word, the subject usually comes next, then the verb. Other orders are
    possible.
  </Trans>
);

const ORDER_WHY: Record<(typeof CONJ_ORDER)[number]["id"], ReactNode> = {
  know: subjectFirst,
  cold: (
    <Trans>
      A place or time word can come first, and the verb usually follows it:{" "}
      <b lang="et">väljas oli külm</b>.
    </Trans>
  ),
  home: (
    <Trans>
      When the <b lang="et">kui</b> clause comes first, the main clause usually starts with its
      verb. The <b lang="et">kui</b> clause can also come second.
    </Trans>
  ),
  rain: (
    <Trans>
      The cause comes first, then <b lang="et">nii et</b> and the result.
    </Trans>
  ),
  visit: (
    <Trans>
      When the <b lang="et">kui</b> clause comes first, the main clause usually starts with its
      verb. The <b lang="et">kui</b> clause can also come second.
    </Trans>
  ),
  ill: (
    <Trans>
      When the <b lang="et">kuna</b> clause comes first, the main clause usually starts with its
      verb. It can also come second.
    </Trans>
  ),
};

const TRANSLATE_PROMPTS: Record<(typeof CONJ_TRANSLATE)[number], ReactNode> = {
  "Ma tean, et sa oled väsinud.": <Trans>I know that you’re tired.</Trans>,
  "Me jäime koju, sest sadas.": <Trans>We stayed home because it was raining.</Trans>,
  "Kui ma koju jõuan, helistan sulle.": <Trans>When I get home, I’ll call you.</Trans>,
  "Ta oli haige, nii et ta jäi koju.": (
    <Trans>
      She was ill, so she stayed home. Use <b lang="et">nii et</b>.
    </Trans>
  ),
  "Ta ütles, et ta ei tule.": <Trans>She said that she isn’t coming.</Trans>,
  "Kuna ma olen väsinud, lähen vara magama.": (
    <Trans>Because I’m tired, I’m going to bed early.</Trans>
  ),
  "Kui sul on aega, tule meile külla.": <Trans>If you have time, come and visit us.</Trans>,
  "Ma õpin eesti keelt, et siin tööd leida.": (
    <Trans>I’m learning Estonian so that I can find work here.</Trans>
  ),
};

const TRANSLATE_WHY: Partial<Record<(typeof CONJ_TRANSLATE)[number], ReactNode>> = {
  "Ma tean, et sa oled väsinud.": (
    <Trans>
      <b lang="et">Et</b> says what you know.
    </Trans>
  ),
  "Me jäime koju, sest sadas.": (
    <Trans>
      <b lang="et">Sest</b> and <b lang="et">kuna</b> both give the reason.
    </Trans>
  ),
  "Ta oli haige, nii et ta jäi koju.": (
    <Trans>
      <b lang="et">Nii et</b> gives the result, after the cause.
    </Trans>
  ),
  "Kui sul on aega, tule meile külla.": (
    <Trans>
      <b lang="et">Kui</b> gives the condition. <b lang="et">Siis</b> can follow the comma, and the
      sentence is still right.
    </Trans>
  ),
  "Ma õpin eesti keelt, et siin tööd leida.": (
    <Trans>
      <b lang="et">Et</b> gives a purpose, with the <b lang="et">-da</b> infinitive or with{" "}
      <b lang="et">saaksin</b>.
    </Trans>
  ),
};

const FIX_PROMPTS: Record<(typeof CONJ_FIXES)[number]["id"], MessageDescriptor> = {
  stay: msg`I stayed home because I was ill.`,
  think: msg`I think it’s a good idea.`,
  call: msg`Call me when you get home.`,
  said: msg`She said she is coming tomorrow.`,
  work: msg`I’m learning Estonian to find work here.`,
  time: msg`I didn’t come because I had no time.`,
};

const FIX_WHY: Record<(typeof CONJ_FIXES)[number]["id"], ReactNode> = {
  stay: (
    <Trans>
      A reason needs <b lang="et">sest</b> or <b lang="et">kuna</b>, not <b lang="et">et</b>.
    </Trans>
  ),
  think: (
    <Trans>
      What someone thinks follows <b lang="et">et</b>, not <b lang="et">sest</b>.
    </Trans>
  ),
  call: (
    <Trans>
      A time needs <b lang="et">kui</b>: when you get home.
    </Trans>
  ),
  said: (
    <Trans>
      What someone said follows <b lang="et">et</b>, not <b lang="et">kui</b>.
    </Trans>
  ),
  work: (
    <Trans>
      A purpose with the <b lang="et">-da</b> infinitive needs <b lang="et">et</b>, not{" "}
      <b lang="et">sest</b>.
    </Trans>
  ),
  time: (
    <Trans>
      A reason needs <b lang="et">sest</b> or <b lang="et">kuna</b>, not <b lang="et">kui</b>.
    </Trans>
  ),
};

function LinkTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = CONJ_TABLE.map((each) => ({
    id: each.word,
    label: i18n._(MEANS[each.word]),
    cells: [
      { form: each.word, src: src(each.word) },
      { form: each.phrase, src: src(each.said) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Paradigm
        label={t`Linking words and their meanings`}
        columns={[t`The word`, t`In a sentence`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a sentence`,
          tip: (
            <Trans>
              The part after the comma is the second clause. The linking word starts it.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

type GapItem = FormItem & {
  said: string;
  pool: readonly string[];
  pair: readonly [string, string];
};

const poolOf = (gap: (typeof CONJ_GAPS)[number]) => {
  const skip = new Set<string>([gap.answer, ...gap.fits]);
  return CONJ_WORDS.filter((word) => !skip.has(word));
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
    const pairs: MatchPair[] = (["et", "sest", "kui", "nii et"] as const).map((word) => ({
      id: clipId(word),
      left: word,
      right: i18n._(MEANS[word]),
      src: src(word),
    }));

    const gaps: GapItem[] = CONJ_GAPS.map((gap) => {
      const said = gapSaid(gap);
      const pool = poolOf(gap);
      return {
        said,
        base: "…",
        gloss: i18n._(GAP_MEANS[gap.id]),
        cue: [gap.before, "…", gap.after].join(" "),
        cueLang: "et",
        src: src(said),
        options: [gap.answer, ...pool.slice(0, 3)],
        pool,
        answers: [gap.answer, ...gap.fits],
        pair: [gap.id, gap.id] as const,
        explain: GAP_WHY[gap.id],
      };
    });

    const causeOptions = [
      {
        id: "first",
        label: (
          <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
            {t`The first part`}
          </span>
        ),
      },
      {
        id: "second",
        label: (
          <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
            {t`The second part`}
          </span>
        ),
      },
    ];
    const cause: (ChoiceItem & { said: string; pair: readonly [string, string] })[] =
      CONJ_CAUSE.map((each) => ({
        said: each.said,
        src: src(each.said),
        answer: each.cause,
        options: causeOptions,
        pair: [each.id, each.id] as const,
        explain: CAUSE_WHY[each.id],
      }));

    const commas: (ChoiceItem & { said: string; pair: readonly [string, string] })[] =
      CONJ_COMMAS.map((each) => ({
        said: each.said,
        src: src(each.said),
        answer: "right",
        options: [
          { id: "right", text: each.said },
          { id: "wrong-a", text: each.wrong[0] },
          { id: "wrong-b", text: each.wrong[1] },
        ].map(({ id, text }) => ({
          id,
          label: (
            <span lang="et" className="text-lg font-medium tracking-normal">
              {text}
            </span>
          ),
        })),
        pair: [each.id, each.id] as const,
        explain: COMMA_WHY[each.id],
      }));

    const built: (OrderItem & { id: string })[] = CONJ_ORDER.map(({ id, answers }) => ({
      id,
      answers,
      src: src(answers[0]),
      meaning: i18n._(ORDER_MEANS[id]),
      explain: ORDER_WHY[id],
    }));

    const translations: (SentenceItem & { pair: readonly [string, string] })[] = CONJ_TRANSLATE.map(
      (said) => ({
        kind: "translate",
        id: clipId(said),
        prompt: TRANSLATE_PROMPTS[said],
        src: src(said),
        answers: CONJ_ANSWERS[said] as readonly [string, ...string[]],
        pair: [clipId(said), clipId(said)] as const,
        explain: TRANSLATE_WHY[said],
      }),
    );

    const fixes: FixItem[] = CONJ_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${item.id}`,
      wrong: item.wrong,
      answers: CONJ_FIX_ANSWERS[item.right] as readonly string[],
      src: src(item.right),
      explain: FIX_WHY[item.id],
      prompt: i18n._(FIX_PROMPTS[item.id]),
    }));

    const notice: PassageQuestion[] = [
      {
        id: "why-write",
        ask: t`Why does Tiiu write?`,
        options: [
          { id: "noise", label: t`She is complaining about noisy children in the yard.` },
          { id: "help", label: t`She wants help with the rubbish left in the yard.` },
          { id: "sell", label: t`She is looking for a lost bicycle in the yard.` },
        ],
        answer: "help",
        line: 1,
      },
      {
        id: "boy",
        kind: "truefalse",
        ask: t`A boy tripped and fell yesterday.`,
        answer: true,
        line: 5,
      },
      {
        id: "firm",
        ask: t`Why can’t the building firm come this week?`,
        options: [
          { id: "work", label: t`They have a lot of other work.` },
          { id: "holiday", label: t`They are on holiday until next month.` },
          { id: "address", label: t`They don’t know where the building is.` },
        ],
        answer: "work",
        line: 7,
      },
      {
        id: "time",
        kind: "short",
        ask: t`How long will the work take if ten people come? Write the word from the text.`,
        answers: ["tunniga", "tunniga valmis"],
        line: 12,
      },
      {
        id: "bags",
        ask: t`Why will Tiiu bring gloves and bags?`,
        options: [
          { id: "sale", label: t`They were on sale.` },
          { id: "children", label: t`They are for the children.` },
          { id: "nobuy", label: t`So that nobody needs to buy anything.` },
        ],
        answer: "nobuy",
        line: 14,
      },
      {
        id: "hurt",
        kind: "truefalse",
        ask: t`The boy was badly hurt.`,
        answer: false,
        line: 6,
      },
      {
        id: "pile",
        ask: t`How does Tiiu get past the rubbish pile in the morning?`,
        options: [
          { id: "foot", label: t`On foot` },
          { id: "bicycle", label: t`By bicycle` },
          { id: "bus", label: t`By motorbike` },
        ],
        answer: "bicycle",
        line: 3,
      },
      {
        id: "write",
        kind: "truefalse",
        ask: t`A neighbour who can’t come should write to Tiiu.`,
        answer: true,
        line: 15,
      },
    ];

    const checks = [
      { id: "greet", label: <Trans>Greet Tiiu.</Trans> },
      { id: "thanks", label: <Trans>Say that you will come, and why.</Trans> },
      {
        id: "reason",
        label: (
          <Trans>
            Give a reason with <b lang="et">sest</b> or <b lang="et">kuna</b>.
          </Trans>
        ),
      },
      {
        id: "kui",
        label: (
          <Trans>
            Use <b lang="et">kui</b> once.
          </Trans>
        ),
      },
      { id: "sign", label: <Trans>Sign with your name.</Trans> },
    ];

    const exam: PassageQuestion[] = [
      {
        id: "move",
        ask: t`Why do they move the hike to Sunday?`,
        options: [
          { id: "work", label: t`Jaan has to work on Saturday.` },
          { id: "rain", label: t`Rain is forecast for Saturday.` },
          { id: "car", label: t`Mari’s car is being repaired.` },
        ],
        answer: "rain",
        line: 5,
      },
      {
        id: "birthday",
        kind: "truefalse",
        ask: t`Jaan’s sister has invited him to her birthday on Sunday evening.`,
        answer: true,
        line: 7,
      },
      {
        id: "early",
        ask: t`Why is eight o’clock early for Jaan?`,
        options: [
          { id: "morning", label: t`He is not a morning person.` },
          { id: "work", label: t`He works on Sunday.` },
          { id: "bus", label: t`He is busy at eight.` },
        ],
        answer: "morning",
        line: 10,
      },
      {
        id: "car",
        ask: t`Whose car do they take?`,
        options: [
          { id: "jaan", label: t`Jaan’s car` },
          { id: "rented", label: t`A rented car` },
          { id: "mari", label: t`Mari’s car` },
        ],
        answer: "mari",
        line: 13,
      },
      {
        id: "petrol",
        kind: "truefalse",
        ask: t`Mari says Jaan must pay for the petrol.`,
        answer: false,
        line: 14,
      },
      {
        id: "museum",
        kind: "short",
        ask: t`What does Mari want to see in Käsmu? Write it as Mari says it.`,
        answers: ["meremuuseum", "väike meremuuseum"],
        line: 37,
      },
      {
        id: "who",
        kind: "match",
        ask: t`Who did it?`,
        options: [
          { id: "mari", label: t`Mari` },
          { id: "jaan", label: t`Jaan` },
        ],
        statements: [
          { id: "forgot", label: t`Forgot the food last time.`, answer: "mari", line: 16 },
          { id: "summer", label: t`Was in Käsmu in the summer.`, answer: "jaan", line: 39 },
          {
            id: "forecast",
            label: t`Will check the forecast in the morning.`,
            answer: "mari",
            line: 47,
          },
        ],
      },
      {
        id: "rain-sunday",
        ask: t`What will they do if it rains on Sunday too?`,
        options: [
          { id: "anyway", label: t`Go anyway.` },
          { id: "town", label: t`Stay in town.` },
          { id: "monday", label: t`Move the hike to next Saturday.` },
        ],
        answer: "town",
        line: 40,
      },
    ];

    return { pairs, gaps, cause, commas, built, translations, fixes, notice, checks, exam };
  }, [t, i18n]);
}

export function EtSestKuiLesson() {
  const { t } = useLingui();
  const content = useContent();
  const comparing = lessonBySlug("vordlus")?.n;
  const names = { third: t`Mari`, fourth: t`Jaan` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <b lang="et">Ma tean, et sa oled väsinud</b> has two clauses and a word that joins them.
          Learn what each linking word does, where the comma goes and where the verb usually stands.
        </Trans>
      }
      facts={[
        <Trans key="m">24 minutes</Trans>,
        <Trans key="q">9 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["et", "sest", "kui", "kuna", "nii et"]}
      recap={[
        <Trans key="1">
          A linking word joins two clauses, and a comma usually comes before it:{" "}
          <b lang="et">Ma tean, et sa oled väsinud.</b> When the clause with <b lang="et">kui</b> or{" "}
          <b lang="et">kuna</b> comes first, the comma comes after it.
        </Trans>,
        <Trans key="2">
          <b lang="et">Et</b> says what someone knows, says or intends. <b lang="et">Sest</b> and{" "}
          <b lang="et">kuna</b> give a reason, <b lang="et">kui</b> gives a time or condition and{" "}
          <b lang="et">nii et</b> gives a result.
        </Trans>,
        <Trans key="3">
          The same two facts, in two orders: <b lang="et">Jäime koju, sest sadas.</b> and{" "}
          <b lang="et">Sadas, nii et jäime koju.</b> The cause usually comes after{" "}
          <b lang="et">sest</b> and before <b lang="et">nii et</b>.
        </Trans>,
        <Trans key="4">
          After a linking word, the subject usually comes next, then the verb. A time or place word
          can come first, and the verb usually follows it. After a first <b lang="et">kui</b> or{" "}
          <b lang="et">kuna</b> clause, the main clause usually starts with its verb.
        </Trans>,
      ]}
      sections={[
        {
          id: "link",
          title: t`Linking two clauses`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A clause has its own verb. A linking word joins two clauses:{" "}
                    <b lang="et">Ma tean, et sa oled väsinud.</b> The clauses are{" "}
                    <b lang="et">ma tean</b> and <b lang="et">sa oled väsinud</b>, and{" "}
                    <Word w="et" /> joins them.
                  </Trans>
                </p>
                <p>
                  <Trans>Five linking words do most of the work. Tap a sentence to hear it.</Trans>
                </p>
              </Prose>
              <LinkTable />
              <Aside>
                <Trans>
                  <Word w="Kui" /> means both when and if, and the sentence decides which.{" "}
                  <Word w="Et" /> also gives a purpose, as in <b lang="et">et siin tööd leida</b>.
                  In a comparison, <b lang="et">kui</b> means than, as in lesson {comparing}.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Match each linking word with what it means.</Trans>
                </p>
              </Prose>
              <Match
                id="link-meaning"
                title={<Trans>What does it mean?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="w">Word</Trans>, <Trans key="m">Meaning</Trans>]}
              />
            </>
          ),
        },
        {
          id: "pick",
          title: t`Pick the linking word`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Ask what the second clause does. It says what someone knows or says (
                    <Word w="et" />
                    ), gives a reason (<Word w="sest" /> or <Word w="kuna" />
                    ), gives a result (<Word w="nii et" />) or gives a time or condition (
                    <Word w="kui" />
                    ).
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Each gap needs one linking word. Where <b lang="et">sest</b> and{" "}
                    <b lang="et">kuna</b> both fit, the options show only one of them. Pick it, then
                    hear the sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="pick-link"
                title={<Trans>Which linking word?</Trans>}
                items={content.gaps}
                rounds={10}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All ten linking words right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Read the reason under each one you got wrong.</Trans>
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
          id: "cause",
          title: t`Reason or result`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Sest" /> gives a reason, and the reason is the second clause:{" "}
                    <b lang="et">Me jäime koju, sest sadas.</b> <Word w="Nii et" /> gives a result,
                    so the cause comes first: <b lang="et">Sadas, nii et me jäime koju.</b> The
                    facts are the same, in the other order.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Kuna" /> also gives a reason, and it can start the sentence:{" "}
                    <b lang="et">Kuna väljas sajab, jääme koju.</b> A reason clause with{" "}
                    <b lang="et">sest</b> usually comes after the clause it explains.
                  </Trans>
                </p>
                <p>
                  <Trans>Hear a sentence, then pick which part is the cause.</Trans>
                </p>
              </Prose>
              <Quiz
                id="which-cause"
                title={<Trans>Which part is the cause?</Trans>}
                items={content.cause}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six: you heard which word gave the reason.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you got wrong once more.</Trans>
                  ) : (
                    <Trans>Read the lines above once more, then try again.</Trans>
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
          id: "comma",
          title: t`The comma`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A comma usually separates the two clauses, and it comes before the linking word:{" "}
                    <b lang="et">Ma tean, et sa oled väsinud.</b>{" "}
                    <b lang="et">Me jäime koju, sest sadas.</b> Put it before{" "}
                    <b lang="et">nii et</b> as a whole, not between the two words.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    When the clause with <b lang="et">kui</b> or <b lang="et">kuna</b> comes first,
                    the comma comes after it: <b lang="et">Kui ma koju jõuan, helistan sulle.</b> A
                    short comparison takes no comma: <b lang="et">suurem kui Tartu</b>, as in lesson{" "}
                    {comparing}.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The typing exercises in this lesson don’t mark commas, so a missing comma is not
                    counted wrong there. In real writing, add it. Hear a sentence, then pick how it
                    is written.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="pick-comma"
                title={<Trans>Where does the comma go?</Trans>}
                items={content.commas}
                rounds={5}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All five commas in the right place.</Trans>
                  ) : (
                    <Trans>Read the reason under each one you missed, then try again.</Trans>
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
          id: "order",
          title: t`Where the verb goes`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    After <b lang="et">et</b>, <b lang="et">sest</b>, <b lang="et">kui</b> and{" "}
                    <b lang="et">kuna</b>, the clause usually runs subject, then verb:{" "}
                    <b lang="et">Ma tean, et ta tuleb homme.</b> If a time or place word comes
                    first, the verb usually follows it: <b lang="et">sest väljas oli külm</b>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    When the clause with <b lang="et">kui</b> or <b lang="et">kuna</b> comes first,
                    the main clause usually starts with its verb:{" "}
                    <b lang="et">Kui ma koju jõuan, helistan sulle.</b> With <b lang="et">siis</b>,
                    the subject can come first again:{" "}
                    <b lang="et">Kui ma koju jõuan, siis ma helistan sulle.</b>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Build each sentence from what it means. More than one order can be right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="build-clause"
                title={<Trans>Build the sentence</Trans>}
                items={content.built}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six built in an order a teacher would accept.</Trans>
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
          id: "write",
          title: t`Write it in Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write each sentence with a linking word. Where a reason fits both{" "}
                    <b lang="et">sest</b> and <b lang="et">kuna</b>, both count.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-clause"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, each with the right linking word.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the linking word in the ones you missed.</Trans>
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
                    Each sentence has one wrong linking word. Tap it, then type the right one. The
                    meaning shown with the sentence says what it should say.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-clause"
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
          id: "notice",
          title: t`A notice to the neighbours`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Tiiu pins a notice in the entrance of her building. Read it and answer the
                    questions, as in the reading part of the B1 exam.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="tiiu-notice"
                title={<Trans>What does Tiiu write?</Trans>}
                by={t`Tiiu writes`}
                sentences={CONJ_NOTICE}
                questions={content.notice}
              />
              <Prose>
                <p>
                  <Trans>
                    Now answer Tiiu in about 80 words, then compare your message with a model.
                  </Trans>
                </p>
              </Prose>
              <Writing
                id="reply-tiiu"
                title={<Trans>Write back to Tiiu</Trans>}
                prompt={
                  <p>
                    <Trans>
                      Write to Tiiu. Say that you will come on Saturday, give a reason, say what you
                      can bring and use <b lang="et">kui</b> once.
                    </Trans>
                  </p>
                }
                model={CONJ_REPLY}
                checks={content.checks}
              />
            </>
          ),
        },
        {
          id: "hike",
          title: t`Planning a hike`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari calls Jaan about a hike on Saturday. Listen to how they change their plan.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="hike-call"
                title={<Trans>Listen: Mari and Jaan</Trans>}
                clip="c-matk"
                turns={CONJ_CONVERSATION.turns}
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
