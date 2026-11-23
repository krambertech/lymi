import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { LESSONS, lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  INFINITIVE_FIX,
  INFINITIVE_LEADS,
  INFINITIVE_ORDER,
  INFINITIVE_ORDERS,
  INFINITIVE_PAIRS,
  INFINITIVE_SAY,
  INFINITIVE_TALK,
  type InfinitiveLead,
  type Takes,
  wantOrMust,
} from "../../../lib/learn/clips";
import { formText } from "../../../lib/learn/forms";
import { Keys, ListenRows, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { type OrderItem, OrderRound } from "../OrderRound";
import { Lit, Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Sort, type SortBin, type SortItem } from "../Sort";
import { Word } from "../Word";

const SLUG = "tegevusnimed";
/** A clip by what it says. */
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Lead = InfinitiveLead["lead"];
type Pair = (typeof INFINITIVE_PAIRS)[number];

/** What each sentence of the verb keys says. */
const SAID_MEANS: Record<InfinitiveLead["said"], MessageDescriptor> = {
  "Ma tahan süüa.": msg`I want to eat.`,
  "Ma võin sind oodata.": msg`I can wait for you.`,
  "Ma saan homme tulla.": msg`I can come tomorrow.`,
  "Ma oskan natuke eesti keelt rääkida.": msg`I can speak a little Estonian.`,
  "Ma tohin kodus töötada.": msg`I’m allowed to work from home.`,
  "Ma proovin eesti keelt õppida.": msg`I’m trying to learn Estonian.`,
  "Ma armastan lugeda.": msg`I love reading.`,
  "Mulle meeldib kohvi juua.": msg`I like drinking coffee.`,
  "Ma pean minema.": msg`I have to go.`,
  "Ma hakkan eesti keelt õppima.": msg`I’m starting to learn Estonian.`,
  "Ma lähen kohvi jooma.": msg`I’m going for a coffee.`,
  "Tule sööma!": msg`Come and eat.`,
  "Ma jään koju lugema.": msg`I’m staying home to read.`,
};

/** What each verb a second verb follows means, by the form the lesson shows it in. */
const LEAD_MEANS: Record<Lead, MessageDescriptor> = {
  tahan: msg`I want`,
  võin: msg`I may, I can`,
  saan: msg`I can, I get to`,
  oskan: msg`I can, I know how to`,
  tohin: msg`I’m allowed to`,
  proovin: msg`I try`,
  armastan: msg`I love`,
  "mulle meeldib": msg`I like`,
  pean: msg`I have to, I must`,
  hakkan: msg`I start`,
  lähen: msg`I go, I’m going`,
  tule: msg({ message: "come", context: "command" }),
  jään: msg`I stay`,
};

/** What each verb of the tahan-and-pean table means, by its -ma infinitive. */
const PAIR_MEANS: Record<Pair["ma"], MessageDescriptor> = {
  "luge|ma": msg`to read`,
  "söö|ma": msg`to eat`,
  "mine|ma": msg`to go`,
  "tule|ma": msg`to come`,
  "õppi|ma": msg`to learn, to study`,
  "tööta|ma": msg`to work`,
};

const leadOf = (lead: Lead) =>
  INFINITIVE_LEADS.find((each) => each.lead === lead) as InfinitiveLead;

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    INFINITIVE_LEADS.flatMap(({ lead, said }) => [
      [lead, { en: LEAD_MEANS[lead] }],
      [said.toLowerCase(), { en: SAID_MEANS[said], show: said }],
    ]),
  ),
  tahan: { en: msg`I want`, note: msg`From tahtma, to want.` },
  pean: { en: msg`I have to, I must`, note: msg`From pidama, to have to.` },
  võin: { en: msg`I may, I can`, note: msg`From võima.` },
  saan: { en: msg`I can, I get to`, note: msg`From saama.` },
  oskan: { en: msg`I can, I know how to`, note: msg`From oskama.` },
  tohin: { en: msg`I’m allowed to`, note: msg`From tohtima.` },
  hakkan: { en: msg`I start`, note: msg`From hakkama, to start.` },
  lähen: { en: msg`I go, I’m going`, note: msg`From minema, to go.` },
  tule: {
    en: msg({ message: "come", context: "command" }),
    note: msg`The command of tulema, to come.`,
  },
  jään: { en: msg`I stay`, note: msg`From jääma, to stay.` },
  "mulle meeldib": {
    en: msg`I like`,
    show: "Mulle meeldib",
    note: msg`Mulle is to me. Learn it as a phrase for now.`,
  },
  lugema: { en: msg`to read`, note: msg`The -ma infinitive. Its -da infinitive is lugeda.` },
  lugeda: { en: msg`to read`, note: msg`The -da infinitive of lugema.` },
  "ma tahan lugeda.": { en: msg`I want to read.`, show: "Ma tahan lugeda." },
  "ma pean lugema.": { en: msg`I have to read.`, show: "Ma pean lugema." },
  "nad tahavad lugeda.": { en: msg`They want to read.`, show: "Nad tahavad lugeda." },
  "nad peavad lugema.": { en: msg`They have to read.`, show: "Nad peavad lugema." },
  õppima: { en: msg`to learn, to study`, note: msg`Its present is õpin.` },
  "ma õpin lugema.": { en: msg`I’m learning to read.`, show: "Ma õpin lugema." },
  teha: { en: msg`to do, to make`, note: msg`The -da infinitive of tegema.` },
  tegema: { en: msg`to do, to make`, note: msg`The -ma infinitive. Its -da infinitive is teha.` },
  "ma pean homme tööle minema.": {
    en: msg`I have to go to work tomorrow.`,
    show: "Ma pean homme tööle minema.",
  },
};

/** An Estonian ending in running text: read in Estonian, never split after its hyphen. */
function End({ children }: { children: ReactNode }) {
  return (
    <span lang="et" className="whitespace-nowrap">
      {children}
    </span>
  );
}

/** Which form follows, as the line under the tahan-and-pean table says it. */
function FollowsNote({ takes }: { takes: Takes }) {
  return takes === "da" ? (
    <Trans>
      After <span lang="et">tahan</span>, the <End>-da</End> infinitive.
    </Trans>
  ) : (
    <Trans>
      After <span lang="et">pean</span>, the <End>-ma</End> infinitive.
    </Trans>
  );
}

/** The same six verbs after tahan and after pean; a tap plays the whole sentence. */
function WantOrMust() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = INFINITIVE_PAIRS.map((pair) => ({
    id: formText(pair.ma),
    label: i18n._(PAIR_MEANS[pair.ma]),
    et: formText(pair.ma),
    cells: (["da", "ma"] as const).map((takes) => ({
      form: `${takes === "da" ? "tahan" : "pean"} ${pair[takes]}`,
      src: src(wantOrMust(pair[takes], takes)),
      note: <FollowsNote takes={takes} />,
    })),
  }));
  return (
    <Panel>
      <Paradigm
        label={t`Six verbs after I want and I have to`}
        columns={[t`I want to …`, t`I have to …`]}
        rows={rows}
        empty={{ title: t`Tap a form`, tip: t`You’ll hear the whole sentence.` }}
      />
    </Panel>
  );
}

/** The line under a verb key: the verb it comes from. */
function LeadTip({ lead }: { lead: InfinitiveLead }) {
  const liking = lessonBySlug("meeldima")?.n;
  const future = lessonBySlug("tulevik")?.n;
  const commands = lessonBySlug("kaskiv")?.n;
  const verb = lead.verb;
  switch (lead.lead) {
    case "mulle meeldib":
      return (
        <Trans>
          <span lang="et">Mulle meeldib</span> is I like. Lesson {liking} explains how it works.
        </Trans>
      );
    case "tule":
      return (
        <Trans>
          The command of <span lang="et">tulema</span>, to come, from lesson {commands}.
        </Trans>
      );
    case "hakkan":
      return (
        <Trans>
          Its <End>-ma</End> infinitive is <span lang="et">hakkama</span>. Lesson {future} uses it
          for the future.
        </Trans>
      );
    default:
      return (
        <Trans>
          Its <End>-ma</End> infinitive is <span lang="et">{verb}</span>.
        </Trans>
      );
  }
}

/** Keys for the verbs of one side: each plays its sentence, the second verb's ending lit. */
function LeadKeys({ takes, label }: { takes: Takes; label: string }) {
  const { i18n } = useLingui();
  const leads = INFINITIVE_LEADS.filter((lead) => lead.takes === takes);
  return (
    <Panel>
      <Keys
        label={label}
        columns={4}
        phoneColumns={takes === "da" ? 2 : 3}
        empty={{
          title: <Trans>Tap a verb</Trans>,
          tip: <Trans>You’ll hear it in a sentence.</Trans>,
        }}
        items={leads.map((lead) => ({
          label: lead.lead.replace("mulle ", ""),
          sub: <Lit form={lead.form} />,
          src: src(lead.said),
          detail: {
            title: (
              <>
                <span lang="et">{lead.said}</span>{" "}
                <small className="ms-1 text-md font-normal text-ink-secondary">
                  {i18n._(SAID_MEANS[lead.said])}
                </small>
              </>
            ),
            tip: <LeadTip lead={lead} />,
          },
        }))}
      />
    </Panel>
  );
}

/** The verbs of “Sort the verbs”: five of each kind, the rest met in the keys and the message. */
export const SORTED: readonly Lead[] = [
  "tahan",
  "võin",
  "oskan",
  "tohin",
  "armastan",
  "pean",
  "hakkan",
  "lähen",
  "tule",
  "jään",
];

/** The sentences to build: each with its other right order and the wrong form as a spare tile. */
export const BUILT = [
  {
    answers: INFINITIVE_ORDERS.linna,
    spare: ["minema"],
    lead: "tahan",
  },
  {
    answers: INFINITIVE_ORDERS.oppima,
    spare: ["õppida"],
    lead: "hakkan",
  },
  {
    answers: INFINITIVE_ORDERS.lugema,
    spare: ["lugeda"],
    lead: "jään",
  },
] as const satisfies readonly {
  answers: readonly string[];
  spare: readonly string[];
  lead: Lead;
}[];

/** After a sentence is built: which form its first verb takes, and that it usually goes last. */
function BuiltWhy({ lead }: { lead: Lead }) {
  return leadOf(lead).takes === "da" ? (
    <Trans>
      After <span lang="et">{lead}</span>, the <End>-da</End> infinitive, and it usually goes last.
    </Trans>
  ) : (
    <Trans>
      After <span lang="et">{lead}</span>, the <End>-ma</End> infinitive, and it usually goes last.
    </Trans>
  );
}

/** Mari's message, gap by gap, each gap's words in its own order. */
export const MESSAGE_GAPS = [
  {
    id: "tootama",
    before: "Tere, Jaan! Ma pean täna kodus",
    after: ".",
    answer: "töötama",
    options: ["töötada", "töötama", "töötan"],
  },
  {
    id: "lahen",
    before: "Aga ma",
    after: "kell neli linna.",
    answer: "lähen",
    options: ["minema", "minna", "lähen"],
  },
  {
    id: "juua",
    before: "Kas sa tahad kohvi",
    after: "?",
    answer: "juua",
    options: ["juua", "jood", "jooma"],
  },
  {
    id: "ootan",
    before: "Ma",
    after: "sind kohvikus.",
    answer: "ootan",
    options: ["ootan", "ootama", "oodata"],
  },
  {
    id: "lugeda",
    before: "Mulle meeldib kohvikus",
    after: ".",
    answer: "lugeda",
    options: ["loen", "lugema", "lugeda"],
  },
  {
    id: "minema",
    before: "Ma pean kell kuus koju",
    after: ".",
    answer: "minema",
    options: ["lähen", "minema", "minna"],
  },
] as const satisfies readonly GapItem[];

/** Why each gap of the message takes its word. */
function MessageWhy({ id }: { id: (typeof MESSAGE_GAPS)[number]["id"] }) {
  switch (id) {
    case "tootama":
      return (
        <Trans>
          After <span lang="et">pean</span>, the <End>-ma</End> infinitive.
        </Trans>
      );
    case "lahen":
      return (
        <Trans>
          No verb comes before it, so the present: <span lang="et">ma lähen</span>.
        </Trans>
      );
    case "juua":
      return (
        <Trans>
          After <span lang="et">tahad</span>, from <span lang="et">tahtma</span>, the <End>-da</End>{" "}
          infinitive.
        </Trans>
      );
    case "ootan":
      return (
        <Trans>
          No verb comes before it, so the present: <span lang="et">ma ootan</span>.
        </Trans>
      );
    case "lugeda":
      return (
        <Trans>
          After <span lang="et">mulle meeldib</span>, the <End>-da</End> infinitive.
        </Trans>
      );
    case "minema":
      return (
        <Trans>
          After <span lang="et">pean</span>, the <End>-ma</End> infinitive, even with words between.
        </Trans>
      );
  }
}

const MESSAGE_ITEMS: GapItem[] = MESSAGE_GAPS.map((gap) => ({
  ...gap,
  why: <MessageWhy id={gap.id} />,
}));

/** What each line of the word-order rows means. */
const ORDER_MEANS: Record<(typeof INFINITIVE_ORDER)[number], MessageDescriptor> = {
  "Ma pean minema.": msg`I have to go.`,
  "Ma pean tööle minema.": msg`I have to go to work.`,
  "Ma pean homme tööle minema.": msg`I have to go to work tomorrow.`,
  "Ma tahan täna kodus lugeda.": msg`I want to read at home today.`,
};

/** What each sentence to build means. */
const BUILT_MEANS: Record<string, MessageDescriptor> = {
  ...SAID_MEANS,
  "Ma tahan homme linna minna.": msg`I want to go to town tomorrow.`,
  "Ma hakkan täna kodus õppima.": msg`I’m starting to study at home today.`,
};

const orderRows = (i18n: I18n) =>
  INFINITIVE_ORDER.map((said) => ({ main: said, sub: i18n._(ORDER_MEANS[said]), src: src(said) }));

const SAY_MEANS: Record<(typeof INFINITIVE_SAY)[number]["id"], MessageDescriptor> = {
  juua: msg`I want to drink coffee.`,
  minema: msg`I have to go home.`,
  oppima: msg`I’m starting to learn Estonian.`,
  tulla: msg`I can come tomorrow.`,
  lugeda: msg`I like reading.`,
  sooma: msg`Come and eat! To one person.`,
};

export function sayItems(i18n: I18n): SentenceItem[] {
  return INFINITIVE_SAY.map(({ id, said, also }) => ({
    kind: "translate",
    id: `say-${id}`,
    prompt: i18n._(SAY_MEANS[id]),
    src: src(said),
    answers: [said, ...also],
  }));
}

const FIX_MEANS: Record<(typeof INFINITIVE_FIX)[number]["id"], MessageDescriptor> = {
  minna: msg`I want to go to town.`,
  tulema: msg`I have to come tomorrow.`,
  jooma: msg`I’m going for a coffee.`,
  raakida: msg`I can speak Estonian.`,
  oppima: msg`I’m starting to study tomorrow.`,
  lugeda: msg`I like reading.`,
};

const FIX_LEAD: Record<
  (typeof INFINITIVE_FIX)[number]["id"],
  { lead: string; form: string; takes: Takes }
> = {
  minna: { lead: "tahan", form: "minna", takes: "da" },
  tulema: { lead: "pean", form: "tulema", takes: "ma" },
  jooma: { lead: "lähen", form: "jooma", takes: "ma" },
  raakida: { lead: "oskan", form: "rääkida", takes: "da" },
  oppima: { lead: "hakkan", form: "õppima", takes: "ma" },
  lugeda: { lead: "mulle meeldib", form: "lugeda", takes: "da" },
};

function FixWhy({ id }: { id: (typeof INFINITIVE_FIX)[number]["id"] }) {
  const { lead, form, takes } = FIX_LEAD[id];
  return takes === "da" ? (
    <Trans>
      After <b lang="et">{lead}</b>, the <End>-da</End> infinitive: <b lang="et">{form}</b>.
    </Trans>
  ) : (
    <Trans>
      After <b lang="et">{lead}</b>, the <End>-ma</End> infinitive: <b lang="et">{form}</b>.
    </Trans>
  );
}

export function fixItems(i18n: I18n): FixItem[] {
  return INFINITIVE_FIX.map(({ id, wrong, right }) => ({
    kind: "fix",
    id: `fix-${id}`,
    wrong,
    prompt: i18n._(FIX_MEANS[id]),
    answers: [right],
    src: src(right),
    explain: <FixWhy id={id} />,
  }));
}

function useTalkQuestions(): PassageQuestion[] {
  const { t } = useLingui();
  return [
    {
      kind: "truefalse",
      id: "work",
      ask: t`Jaan is free all day today.`,
      answer: false,
      line: 2,
    },
    {
      kind: "short",
      id: "home",
      ask: t`When is Jaan coming home? Write the time in Estonian.`,
      answers: [
        "kell viis",
        "viis",
        "kell 5",
        "5",
        "kell 17",
        "17",

        "17.00",
        "17:00",
        "kell seitseteist",
      ],
      line: 3,
    },
    {
      id: "cafe",
      ask: t`What does Jaan want at the café?`,
      options: [
        { id: "coffee", label: t`Coffee` },
        { id: "read", label: t`Something to read` },
        { id: "lunch", label: t`A big lunch` },
      ],
      answer: "coffee",
      line: 5,
    },
    {
      kind: "short",
      id: "seven",
      ask: t`When does Jaan have to be at home? Write the time in Estonian.`,
      answers: [
        "kell seitse",
        "seitse",
        "kell 7",
        "7",
        "kell 19",
        "19",

        "19.00",
        "19:00",
        "kell üheksateist",
      ],
      line: 6,
    },
    {
      kind: "truefalse",
      id: "reading",
      ask: t`Mari likes reading in a café.`,
      answer: true,
      line: 8,
    },
    {
      kind: "short",
      id: "wait",
      ask: t`Where can Mari wait for Jaan? Write the place in Estonian, with its ending.`,
      answers: ["kohvikus"],
      line: 9,
    },
    {
      id: "kati",
      ask: t`Why can’t Kati come today?`,
      options: [
        { id: "work", label: t`Work` },
        { id: "ill", label: t`Illness` },
        { id: "learn", label: t`Studying Estonian` },
      ],
      answer: "learn",
      line: 11,
    },
    {
      kind: "truefalse",
      id: "cook",
      ask: t`Mari can cook a little.`,
      answer: true,
      line: 13,
    },
    {
      id: "tomorrow",
      ask: t`What will Jaan do tomorrow?`,
      options: [
        { id: "work", label: t`Work all evening` },
        { id: "learn", label: t`Study Estonian` },
        { id: "eat", label: t`Come for dinner` },
      ],
      answer: "eat",
      line: 16,
    },
    {
      kind: "short",
      id: "six",
      ask: t`When does Jaan have to come tomorrow? Write the time in Estonian.`,
      answers: [
        "kell kuus",
        "kuus",
        "kell 6",
        "6",
        "kell 18",
        "18",

        "18.00",
        "18:00",
        "kell kaheksateist",
      ],
      line: 18,
    },
  ];
}

export function TegevusnimedLesson() {
  const { t, i18n } = useLingui();
  const at = (et: string) => LESSONS.find((lesson) => lesson.et === et)?.n;
  const verbForms = lessonBySlug("verbi-pohivormid")?.n;
  const canMay = lessonBySlug("modaalverbid")?.n;
  const going = at("Lähen ujuma, olen ujumas");
  const nounForms = lessonBySlug("pohivormid")?.n;
  const wordOrder = at("Täna lähen ma");
  const present = lessonBySlug("olevik")?.n;

  const rows = useMemo(() => orderRows(i18n), [i18n]);
  const talkQuestions = useTalkQuestions();

  const bins: SortBin[] = [
    {
      id: "da",
      label: "-da",
      rule: (
        <Trans>
          <span lang="et">Tahan, võin, saan, oskan, tohin, proovin, armastan</span> and{" "}
          <span lang="et">mulle meeldib</span> take the <End>-da</End> infinitive.
        </Trans>
      ),
    },
    {
      id: "ma",
      label: "-ma",
      rule: (
        <Trans>
          <span lang="et">Pean, hakkan, lähen, tule</span> and <span lang="et">jään</span> take the{" "}
          <End>-ma</End> infinitive.
        </Trans>
      ),
    },
  ];
  const sorted: SortItem[] = SORTED.map((lead) => ({
    w: lead,
    bin: leadOf(lead).takes,
    src: src(lead),
  }));
  const built: OrderItem[] = BUILT.map(({ answers, spare, lead }) => ({
    answers,
    spare,
    src: src(answers[0]),
    meaning: i18n._(BUILT_MEANS[answers[0]] as MessageDescriptor),
    explain: <BuiltWhy lead={lead} />,
  }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <span lang="et">Ma tahan lugeda</span> is I want to read, and{" "}
          <span lang="et">Ma pean lugema</span> is I have to read. The first verb usually decides
          whether the second takes its <End>-da</End> or its <End>-ma</End> infinitive.
        </Trans>
      }
      facts={[
        <Trans key="m">20 minutes</Trans>,
        <Trans key="q">5 exercises and a recording you can play twice</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={INFINITIVE_LEADS.map(({ lead }) => lead)}
      recap={[
        <Trans key="1">
          After <b lang="et">tahan</b>, <b lang="et">pean</b> and the other verbs in this lesson,
          the second verb takes its <End>-da</End> or <End>-ma</End> infinitive:{" "}
          <b lang="et">Ma tahan lugeda. Ma pean lugema.</b>
        </Trans>,
        <Trans key="2">
          The <End>-da</End> infinitive follows{" "}
          <b lang="et">tahan, võin, saan, oskan, tohin, proovin, armastan</b> and{" "}
          <b lang="et">mulle meeldib</b>.
        </Trans>,
        <Trans key="3">
          The <End>-ma</End> infinitive follows <b lang="et">pean, hakkan, lähen, tule</b> and{" "}
          <b lang="et">jään</b>. <b lang="et">Õpin</b> takes it too when you learn to do something:{" "}
          <b lang="et">Ma õpin lugema.</b>
        </Trans>,
        <Trans key="4">
          Only the first verb changes for the person: <b lang="et">nad tahavad lugeda</b>.
        </Trans>,
        <Trans key="5">
          The second verb usually goes last: <b lang="et">Ma pean homme tööle minema.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "two-forms",
          title: t`One verb after another`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {verbForms}, <Word w="lugema" /> and <Word w="lugeda" /> both meant to
                    read. Which one you use usually depends on the verb before it.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    After <Word w="tahan" />, I want, comes the <End>-da</End> infinitive:{" "}
                    <Word w="Ma tahan lugeda." /> After <Word w="pean" />, I have to, comes the{" "}
                    <End>-ma</End> infinitive: <Word w="Ma pean lugema." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Only the first verb takes the person ending from lesson {present}; the second
                    stays as it is: <Word w="Nad tahavad lugeda." /> <Word w="Nad peavad lugema." />{" "}
                    Tap a form to hear the whole sentence.
                  </Trans>
                </p>
              </Prose>
              <WantOrMust />
            </>
          ),
        },
        {
          id: "da",
          title: t`Eight verbs of wanting, being able, trying and liking`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The eight verbs below take the <End>-da</End> infinitive, <Word w="tahan" />{" "}
                    among them: <Word w="Ma tahan süüa." />{" "}
                    <Word w="Ma oskan natuke eesti keelt rääkida." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Võin" />, <Word w="saan" /> and <Word w="oskan" /> can all translate as
                    I can. Lesson {canMay} tells them apart; the form after them is the same.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Mulle meeldib" />, I like, takes it too:{" "}
                    <Word w="Mulle meeldib kohvi juua." /> Tap a verb to hear it in a sentence.
                  </Trans>
                </p>
              </Prose>
              <LeadKeys
                takes="da"
                label={t`Eight verbs of wanting, being able, trying and liking`}
              />
            </>
          ),
        },
        {
          id: "ma",
          title: t`Five verbs of having to, starting, moving and staying`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Pean" /> takes the <End>-ma</End> infinitive:{" "}
                    <Word w="Ma pean minema." /> So do <Word w="hakkan" />, <Word w="lähen" />,{" "}
                    <Word w="tule" /> and <Word w="jään" />: <Word w="Ma lähen kohvi jooma." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Lesson {going} explains what the <End>-ma</End> infinitive means after{" "}
                    <span lang="et">lähen</span>. Tap a verb to hear it in a sentence.
                  </Trans>
                </p>
              </Prose>
              <LeadKeys
                takes="ma"
                label={t`Five verbs of having to, starting, moving and staying`}
              />
              <Aside>
                <Trans>
                  <Word w="Õppima" />, to learn, takes the <End>-ma</End> infinitive when you learn
                  to do something: <Word w="Ma õpin lugema." />
                </Trans>
              </Aside>
              <Aside>
                <Trans>
                  To check a verb that isn’t here, look it up in <span lang="et">Sõnaveeb</span>, as
                  lesson {nounForms} shows. <Word w="Teha" /> and <Word w="tegema" /> both mean to
                  do: the <End>-da</End> and the <End>-ma</End> infinitive. Under{" "}
                  <span lang="et">Rektsioon</span>, <span lang="et">Sõnaveeb</span> uses them to
                  show which form a verb takes: <b lang="et">mida teha</b> means the <End>-da</End>{" "}
                  infinitive, <b lang="et">mida tegema</b> the <End>-ma</End> infinitive.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "sort",
          title: t`Sort the verbs`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Put each verb with the form that follows it. Tap a verb to hear it, then tap its
                    group.
                  </Trans>
                </p>
              </Prose>
              <Sort
                id="sort-verbs"
                title={<Trans>Which form follows?</Trans>}
                bins={bins}
                items={sorted}
              />
            </>
          ),
        },
        {
          id: "last",
          title: t`Where the second verb goes`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Words for when and where usually sit between the two verbs, and the second verb
                    usually goes last: <Word w="Ma pean homme tööle minema." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Tap a line to hear the sentence grow. Lesson {wordOrder} has more on where
                    Estonian puts its words.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows} />
              <Prose>
                <p>
                  <Trans>
                    Build each sentence from what it means. One tile is the wrong form of the second
                    verb and stays out.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="build-sentence"
                title={<Trans>Build the sentence</Trans>}
                items={built}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All three. Each second verb took the right form.</Trans>
                  ) : (
                    <Trans>
                      Check which form each second verb takes and where it goes, then try again.
                    </Trans>
                  )
                }
                recall={(item) => ({ label: item.answers[0] ?? "", src: item.src })}
                round={(props) => <OrderRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "say-it",
          title: t`Write it in Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write each sentence in Estonian. The first verb usually decides the second
                    verb’s form, and the second verb usually goes last.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="say-infinitives"
                title={<Trans>Write it in Estonian</Trans>}
                items={sayItems(i18n)}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six written right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Read the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Go through the sections above once more, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
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
                    In each sentence the second verb has the wrong infinitive. Tap it, then write
                    the right one.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-infinitives"
                title={<Trans>Find and fix the mistake</Trans>}
                items={fixItems(i18n)}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Look again at the ones you missed.</Trans>
                  ) : (
                    <Trans>Go through the sections above once more, then try again.</Trans>
                  )
                }
                recall={fixRecall}
                round={(props) => <FixRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "message",
          title: t`Mari’s message`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari writes to her friend Jaan. In each gap, pick the <End>-ma</End> infinitive,
                    the <End>-da</End> infinitive or the present. The verb before the gap decides;
                    with no verb before it, the present fits.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="mari-message"
                title={<Trans>Fill the gaps</Trans>}
                gaps={MESSAGE_ITEMS}
                mode="pick"
                clip="p-message"
              />
            </>
          ),
        },
        {
          id: "listen",
          title: t`Listen: plans for the day`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari calls Jaan to ask about his day. Listen for what each of them has to do,
                    wants to do and can do.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="plans-talk"
                title={<Trans>Listen: Mari calls Jaan</Trans>}
                clip="c-plans"
                turns={INFINITIVE_TALK.turns}
                names={{ third: "Mari", fourth: "Jaan" }}
                questions={talkQuestions}
                plays={2}
              />
            </>
          ),
        },
      ]}
    />
  );
}
