import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  DES_ANSWERS,
  DES_CONVERSATION,
  DES_DIARY,
  DES_FIX_ANSWERS,
  DES_FIXES,
  DES_HEARD,
  DES_ORDER,
  DES_TRANSLATE,
  DES_TYPED,
  DES_VERBS,
  MATA_TYPED,
  MATA_VERBS,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { type OrderItem, OrderRound } from "../OrderRound";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "lugedes-lugemata";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const MEANS: Record<string, MessageDescriptor> = {
  lugeda: msg`to read`,
  õppida: msg`to study`,
  rääkida: msg`to talk`,
  oodata: msg`to wait for`,
  sõita: msg`to drive, to ride`,
  kuulata: msg`to listen to`,
  süüa: msg`to eat`,
  juua: msg`to drink`,
  teha: msg`to do, to make`,
  minna: msg`to go`,
  tulla: msg`to come`,
  olla: msg`to be`,
  lugema: msg`to read`,
  ütlema: msg`to say`,
  küsima: msg`to ask`,
  helistama: msg`to phone`,
  maksma: msg`to pay`,
  sööma: msg`to eat`,
  jooma: msg`to drink`,
  minema: msg`to go`,
  tulema: msg`to come`,
  magama: msg`to sleep`,
};

const GLOSSARY: Glossary = {
  lugeda: { en: msg`to read`, note: msg`Ma tahan lugeda.` },
  lugema: { en: msg`to read`, note: msg`Ma lähen lugema.` },
  minema: { en: msg`to go`, note: msg`Ma pean minema.` },
  sööma: { en: msg`to eat`, note: msg`Ma lähen sööma.` },
  lugedes: { en: msg`while reading`, note: msg`Ta joob kohvi ajalehte lugedes.` },
  süües: { en: msg`while eating`, note: msg`Ära räägi süües.` },
  juues: { en: msg`while drinking`, note: msg`Ta vaatas filmi teed juues.` },
  tehes: { en: msg`while doing, while making`, note: msg`Ta laulab süüa tehes.` },
  minnes: { en: msg`while going, on the way`, note: msg`Ma ostan leiba koju minnes.` },
  tulles: { en: msg`while coming, on the way`, note: msg`Ma kuulan raadiot tööle tulles.` },
  olles: { en: msg`while being, when you are`, note: msg`Ma õpin eesti keelt kodus olles.` },
  koputades: { en: msg`while knocking`, note: msg`Ta tuli sisse koputades.` },
  lugemata: { en: msg`without reading`, note: msg`Ta kirjutas lepingule alla seda lugemata.` },
  ütlemata: { en: msg`without saying`, note: msg`Ta lahkus midagi ütlemata.` },
  küsimata: { en: msg`without asking`, note: msg`Ta võttis mu raamatu küsimata.` },
  helistamata: { en: msg`without phoning`, note: msg`Ära tule külla helistamata.` },
  söömata: { en: msg`without eating`, note: msg`Ma läksin tööle hommikusööki söömata.` },
  minemata: { en: msg`without going`, note: msg`Ta jäi koosolekule minemata.` },
  koputamata: { en: msg`without knocking`, note: msg`Ta tuli sisse koputamata.` },
};

const lit = (said: string, form: string, ending: string) => {
  const body = said.replace(/[.!?]$/, "");
  const at = body.lastIndexOf(form);
  return `${body.slice(0, at + form.length - ending.length)}|${ending}`;
};

type Entry = { inf: string; form: string; said: string };
type Kind = "des" | "mata";

function FormTable({ kind }: { kind: Kind }) {
  const { t, i18n } = useLingui();
  const groups = kind === "des" ? DES_VERBS : MATA_VERBS;
  const keys = Object.keys(groups) as (keyof typeof groups)[];
  const [group, setGroup] = useState<string>(keys[0] as string);
  const ending = kind === "des" ? "es" : "mata";
  const labels: Record<string, string> =
    kind === "des"
      ? { most: t`Most verbs`, short: t`Short verbs`, double: t`Verbs ending in -nna, -lla` }
      : { most: t`Most verbs`, odd: t`Short and irregular verbs` };
  const tips: Record<string, ReactNode> =
    kind === "des"
      ? {
          most: (
            <Trans>
              Take the <b lang="et">-da</b> form and change the last <b lang="et">-a</b> to{" "}
              <b lang="et">-es</b>: <b lang="et">lugeda</b>, <b lang="et">lugedes</b>.
            </Trans>
          ),
          short: (
            <Trans>
              A short <b lang="et">-da</b> form works the same way: <b lang="et">süüa</b>,{" "}
              <b lang="et">süües</b>.
            </Trans>
          ),
          double: (
            <Trans>
              Keep the double letter: <b lang="et">minna</b>, <b lang="et">minnes</b>.
            </Trans>
          ),
        }
      : {
          most: (
            <Trans>
              Take the <b lang="et">-ma</b> form and change <b lang="et">-ma</b> to{" "}
              <b lang="et">-mata</b>: <b lang="et">lugema</b>, <b lang="et">lugemata</b>.
            </Trans>
          ),
          odd: (
            <Trans>
              The same rule works for every verb: <b lang="et">minema</b>, <b lang="et">minemata</b>
              .
            </Trans>
          ),
        };
  const list = (groups as Record<string, readonly Entry[]>)[group] ?? [];
  const rows: ParadigmRow[] = list.map((each) => ({
    id: each.inf,
    label: i18n._(MEANS[each.inf] as MessageDescriptor),
    cells: [
      { form: each.inf, src: src(each.inf) },
      { form: lit(each.said, each.form, ending), src: src(each.said) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Verbs`}
        items={keys.map((each) => ({
          label: labels[each as string] as string,
          value: each as string,
        }))}
        value={group}
        onPick={setGroup}
      />
      <Paradigm
        key={`${kind}-${group}`}
        label={kind === "des" ? t`Verbs and their -des forms` : t`Verbs and their -mata forms`}
        columns={[t`Infinitive`, t`In a sentence`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{ title: t`Tap a sentence`, tip: tips[group] }}
      />
    </Panel>
  );
}

const PAIR_ROWS = [
  {
    id: "knock",
    des: "knock-des",
    mata: "knock-mata",
    desForm: "koputades",
    mataForm: "koputamata",
  },
  {
    id: "smile",
    des: "smile-des",
    mata: "smile-mata",
    desForm: "naeratades",
    mataForm: "naeratamata",
  },
  { id: "bye", des: "bye-des", mata: "bye-mata", desForm: "jättes", mataForm: "jätmata" },
] as const;

function PairTable() {
  const { t } = useLingui();
  const labels: Record<(typeof PAIR_ROWS)[number]["id"], string> = {
    knock: t`to knock`,
    smile: t`to smile`,
    bye: t`to say goodbye`,
  };
  const said = (id: string) => (DES_HEARD.find((each) => each.id === id) as { said: string }).said;
  const rows: ParadigmRow[] = PAIR_ROWS.map((row) => ({
    id: row.id,
    label: labels[row.id],
    cells: [
      { form: lit(said(row.des), row.desForm, "es"), src: src(said(row.des)) },
      { form: lit(said(row.mata), row.mataForm, "mata"), src: src(said(row.mata)) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Paradigm
        label={t`The same verb with -des and with -mata`}
        columns={[t`-des: while`, t`-mata: without`]}
        rows={rows}
        empty={{
          title: t`Tap a sentence`,
          tip: (
            <Trans>
              The sentences differ in one ending: <b lang="et">-des</b> usually means at the same
              time, <b lang="et">-mata</b> means without it.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

const HEARD_MEANS: Record<(typeof DES_HEARD)[number]["id"], MessageDescriptor> = {
  "knock-des": msg`He came in knocking.`,
  "knock-mata": msg`He came in without knocking.`,
  "smile-des": msg`He left smiling.`,
  "smile-mata": msg`He left without smiling.`,
  "bye-des": msg`He left saying goodbye.`,
  "bye-mata": msg`He left without saying goodbye.`,
  "read-des": msg`I ate breakfast while reading the paper.`,
  "eat-mata": msg`I went to work without eating breakfast.`,
  "tea-des": msg`He watched a film while drinking tea.`,
  "ask-mata": msg`He took my book without asking.`,
  "home-des": msg`I’ll buy bread on my way home.`,
  "go-mata": msg`He didn’t go to the meeting.`,
};

type FormQuizItem = FormItem & { pair: readonly [string, string] };

const pairRun = <T extends { pair: readonly [string, string] }>(items: readonly T[], pinned?: T) =>
  eachPairFirst(items, pinned);

const heardOptions = (i18n: I18n) => [
  {
    id: "des",
    label: (
      <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
        {i18n._(msg`While doing it`)}
      </span>
    ),
  },
  {
    id: "mata",
    label: (
      <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
        {i18n._(msg`Without doing it`)}
      </span>
    ),
  },
];

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const entries = (groups: Record<string, readonly Entry[]>) => Object.values(groups).flat();
    const desAll = entries(DES_VERBS as unknown as Record<string, readonly Entry[]>);
    const mataAll = entries(MATA_VERBS as unknown as Record<string, readonly Entry[]>);
    const byInf = (list: readonly Entry[], inf: string) =>
      list.find((each) => each.inf === inf) as Entry;

    const desForms: FormQuizItem[] = DES_TYPED.map((inf) => {
      const each = byInf(desAll, inf);
      return {
        base: each.inf,
        gloss: i18n._(MEANS[each.inf] as MessageDescriptor),
        cue: (
          <Trans>
            the <b lang="et">-des</b> form
          </Trans>
        ),
        answers: [each.form],
        src: src(each.said),
        said: <span lang="et">{each.said}</span>,
        explain: (
          <Trans>
            Change the last <b lang="et">-a</b> of <b lang="et">{each.inf}</b> to{" "}
            <b lang="et">-es</b>: <b lang="et">{each.form}</b>.
          </Trans>
        ),
        pair: [each.inf, each.inf] as const,
      };
    });

    const mataForms: FormQuizItem[] = MATA_TYPED.map((inf) => {
      const each = byInf(mataAll, inf);
      return {
        base: each.inf,
        gloss: i18n._(MEANS[each.inf] as MessageDescriptor),
        cue: (
          <Trans>
            the <b lang="et">-mata</b> form
          </Trans>
        ),
        answers: [each.form],
        src: src(each.said),
        said: <span lang="et">{each.said}</span>,
        explain: (
          <Trans>
            Change <b lang="et">-ma</b> of <b lang="et">{each.inf}</b> to <b lang="et">-mata</b>:{" "}
            <b lang="et">{each.form}</b>.
          </Trans>
        ),
        pair: [each.inf, each.inf] as const,
      };
    });

    const rule = {
      des: (
        <Trans>
          <b lang="et">-des</b> usually means at the same time.
        </Trans>
      ),
      mata: (
        <Trans>
          <b lang="et">-mata</b> means without doing it.
        </Trans>
      ),
    };
    const heard: (ChoiceItem & { said: string; pair: readonly [string, string] })[] = DES_HEARD.map(
      (each) => ({
        said: each.said,
        src: src(each.said),
        answer: each.means,
        options: heardOptions(i18n),
        pair: [each.key, each.id] as const,
        explain: (
          <>
            <Trans>
              <b lang="et">{each.said}</b> {i18n._(HEARD_MEANS[each.id])}
            </Trans>{" "}
            {rule[each.means]}
          </>
        ),
      }),
    );

    const orderMeans: Record<(typeof DES_ORDER)[number]["id"], MessageDescriptor> = {
      leave: msg`He left without saying anything.`,
      music: msg`I listen to music while studying.`,
      phone: msg`Don’t use the phone while driving.`,
      visit: msg`Don’t come to visit without calling.`,
      book: msg`He took my book without asking.`,
      homework: msg`I do my homework while listening to the radio.`,
    };
    const orderWhy = (
      <Trans>
        The phrase with <b lang="et">-des</b> or <b lang="et">-mata</b> usually goes with the thing
        it describes and often comes last. It can also start the sentence. The verb then usually
        comes next, but the subject can also come first: <b lang="et">Koju minnes ostan ma leiba</b>{" "}
        or <b lang="et">Koju minnes ma ostan leiba</b>.
      </Trans>
    );
    const built: (OrderItem & { id: string })[] = DES_ORDER.map(({ id, answers }) => ({
      id,
      answers,
      src: src(answers[0]),
      meaning: i18n._(orderMeans[id]),
      explain: orderWhy,
    }));

    const translatePrompts: Record<(typeof DES_TRANSLATE)[number], MessageDescriptor> = {
      "Ta lahkus midagi ütlemata.": msg`She left without saying anything.`,
      "Ma kuulan muusikat õppides.": msg`I listen to music while studying.`,
      "Ära kasuta telefoni sõites.": msg`Don’t use the phone while driving.`,
      "Ma ostan leiba koju minnes.": msg`I’ll buy bread on my way home.`,
      "Ära tule külla helistamata.": msg`Don’t come to visit without calling.`,
      "Ta võttis mu raamatu küsimata.": msg`He took my book without asking.`,
      "Ta laulab süüa tehes.": msg`She sings while cooking.`,
    };
    const translateWhy: Partial<Record<(typeof DES_TRANSLATE)[number], ReactNode>> = {
      "Ta lahkus midagi ütlemata.": (
        <Trans>
          Without saying is <b lang="et">ütlemata</b>; the object is usually partitive:{" "}
          <b lang="et">midagi</b>.
        </Trans>
      ),
      "Ma ostan leiba koju minnes.": (
        <Trans>
          <b lang="et">Minna</b> becomes <b lang="et">minnes</b>, with the double letter kept.
        </Trans>
      ),
      "Ta laulab süüa tehes.": (
        <Trans>
          <b lang="et">Teha</b> becomes <b lang="et">tehes</b>.
        </Trans>
      ),
    };
    const translations: (SentenceItem & { pair: readonly [string, string] })[] = DES_TRANSLATE.map(
      (said) => ({
        kind: "translate",
        id: clipId(said),
        prompt: i18n._(translatePrompts[said]),
        src: src(said),
        answers: DES_ANSWERS[said] as readonly [string, ...string[]],
        pair: [clipId(said), clipId(said)] as const,
        explain: translateWhy[said],
      }),
    );

    const fixPrompts: Record<(typeof DES_FIXES)[number]["right"], MessageDescriptor> = {
      "Ta lahkus sõnagi ütlemata.": msg`She left without saying a word.`,
      "Ta luges kirja süües.": msg`She read the letter while eating.`,
      "Ma ei tule kunagi helistamata.": msg`I never come without calling.`,
      "Ma kuulan muusikat õppides.": msg`I listen to music while studying.`,
      "Ta jäi koosolekule minemata.": msg`He didn’t go to the meeting.`,
      "Ma ostan leiba koju minnes.": msg`I’ll buy bread on my way home.`,
      "Ta kirjutas lepingule alla seda lugemata.": msg`She signed the contract without reading it.`,
    };
    const fixWhy: Record<(typeof DES_FIXES)[number]["right"], ReactNode> = {
      "Ta lahkus sõnagi ütlemata.": (
        <Trans>
          Without saying is <b lang="et">ütlemata</b>, not <b lang="et">öeldes</b>.
        </Trans>
      ),
      "Ta luges kirja süües.": (
        <Trans>
          At the same time as eating is <b lang="et">süües</b>. <b lang="et">Söömata</b> is without
          eating.
        </Trans>
      ),
      "Ma ei tule kunagi helistamata.": (
        <Trans>
          Without calling is <b lang="et">helistamata</b>. <b lang="et">Helistades</b> is while
          calling.
        </Trans>
      ),
      "Ma kuulan muusikat õppides.": (
        <Trans>
          While studying is <b lang="et">õppides</b>. <b lang="et">Õppimata</b> is without studying.
        </Trans>
      ),
      "Ta jäi koosolekule minemata.": (
        <Trans>
          <b lang="et">-mata</b> goes on the <b lang="et">-ma</b> form, which is{" "}
          <b lang="et">minema</b>, so <b lang="et">minemata</b>.
        </Trans>
      ),
      "Ma ostan leiba koju minnes.": (
        <Trans>
          <b lang="et">-des</b> goes on the <b lang="et">-da</b> form, which is{" "}
          <b lang="et">minna</b>, so <b lang="et">minnes</b>.
        </Trans>
      ),
      "Ta kirjutas lepingule alla seda lugemata.": (
        <Trans>
          After <b lang="et">-mata</b>, the object usually takes the partitive:{" "}
          <b lang="et">seda</b>.
        </Trans>
      ),
    };
    const fixes: FixItem[] = DES_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${clipId(item.right)}`,
      wrong: item.wrong,
      answers: DES_FIX_ANSWERS[item.right] ?? [item.right],
      src: src(item.right),
      prompt: i18n._(fixPrompts[item.right]),
      explain: fixWhy[item.right],
    }));

    const diary: PassageQuestion[] = [
      {
        id: "why-not-drive",
        ask: t`Why didn’t Mari drive?`,
        options: [
          { id: "licence", label: t`She didn’t have a licence.` },
          { id: "broken", label: t`She didn’t have a car.` },
          { id: "sleep", label: t`She hadn’t slept at all the night before.` },
        ],
        answer: "sleep",
        line: 1,
      },
      {
        id: "peeter-talks",
        kind: "truefalse",
        ask: t`Peeter usually talks a lot when he drives.`,
        answer: true,
        line: 5,
      },
      {
        id: "breakfast",
        kind: "short",
        ask: t`What did Peeter have for breakfast? Write it as Mari does.`,
        answers: ["kohvi"],
        line: 6,
      },
      {
        id: "paid",
        kind: "truefalse",
        ask: t`Peeter paid for his coffee at the café.`,
        answer: false,
        line: 8,
      },
      {
        id: "listened",
        kind: "truefalse",
        ask: t`Mari listened to her grandmother without hurrying.`,
        answer: true,
        line: 16,
      },
      {
        id: "mushrooms",
        ask: t`What did the grandmother say about the mushrooms?`,
        options: [
          { id: "poison", label: t`They were poisonous.` },
          { id: "tasty", label: t`They were very tasty and fresh.` },
          { id: "small", label: t`They were too old to cook.` },
        ],
        answer: "poison",
        line: 18,
      },
      {
        id: "sang",
        ask: t`What did Peeter do on the way back?`,
        options: [
          { id: "slept", label: t`He stayed quiet the whole way.` },
          { id: "sang", label: t`He sang loudly while driving.` },
          { id: "phoned", label: t`He stopped at the café again.` },
        ],
        answer: "sang",
        line: 19,
      },
      {
        id: "phoned",
        kind: "short",
        ask: t`Who did Mari phone when she got home? Write it as Mari does.`,
        answers: ["emale"],
        line: 20,
      },
    ];

    const exam: PassageQuestion[] = [
      {
        id: "morning",
        ask: t`What does the flatmate do in the morning?`,
        options: [
          { id: "news", label: t`Reads the news over breakfast.` },
          { id: "phone", label: t`Looks at the phone while drinking coffee.` },
          { id: "cooks", label: t`Cooks breakfast and sings.` },
        ],
        answer: "phone",
        line: 8,
      },
      {
        id: "knock",
        kind: "truefalse",
        ask: t`The flatmate knocked before coming into Liisa’s room.`,
        answer: false,
        line: 12,
      },
      {
        id: "took",
        ask: t`What did the flatmate take without asking?`,
        options: [
          { id: "book", label: t`Her book` },
          { id: "cup", label: t`Her coffee cup` },
          { id: "charger", label: t`Her charger` },
        ],
        answer: "charger",
        line: 13,
      },
      {
        id: "cleans",
        kind: "short",
        ask: t`When does the flatmate clean? Write it as Liisa says it.`,
        answers: ["pühapäeviti"],
        line: 26,
      },
      {
        id: "awake",
        kind: "truefalse",
        ask: t`Telephone calls sometimes keep Liisa awake at night.`,
        answer: true,
        line: 27,
      },
      {
        id: "old-flatmate",
        ask: t`What did Kalev’s old flatmate not do?`,
        options: [
          { id: "rent", label: t`Pay the rent` },
          { id: "clean", label: t`Clean the kitchen` },
          { id: "cook", label: t`Cook dinner for him` },
        ],
        answer: "rent",
        line: 29,
      },
      {
        id: "wait",
        kind: "truefalse",
        ask: t`Kalev tells Liisa to talk to the flatmate again at once.`,
        answer: false,
        line: 37,
      },
      {
        id: "bus",
        ask: t`What happened to Kalev yesterday?`,
        options: [
          { id: "lost", label: t`He lost his phone at work.` },
          { id: "missed", label: t`He missed a bus.` },
          { id: "late", label: t`He felt ill at work.` },
        ],
        answer: "missed",
        line: 44,
      },
      {
        id: "cake",
        kind: "short",
        ask: t`What will Kalev bring on Saturday? Write it as Kalev says it.`,
        answers: ["kooki"],
        line: 56,
      },
      {
        id: "soup",
        ask: t`What will Liisa cook on Saturday?`,
        options: [
          { id: "fish", label: t`Fish soup` },
          { id: "meat", label: t`Meat soup` },
          { id: "veg", label: t`Vegetable soup` },
        ],
        answer: "veg",
        line: 62,
      },
    ];

    return { desForms, mataForms, heard, built, translations, fixes, diary, exam };
  }, [t, i18n]);
}

export function LugedesLugemataLesson() {
  const { t } = useLingui();
  const content = useContent();
  const infinitives = lessonBySlug("tegevusnimed")?.n;
  const object = lessonBySlug("raamatut-voi-raamatu")?.n;
  const names = { fourth: t`Kalev`, third: t`Liisa` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <b lang="et">Lugedes</b> is while reading and <b lang="et">lugemata</b> is without
          reading: two endings that look alike and usually mean opposite things.
        </Trans>
      }
      facts={[
        <Trans key="m">24 minutes</Trans>,
        <Trans key="q">8 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "lugedes",
        "süües",
        "juues",
        "tehes",
        "minnes",
        "tulles",
        "olles",
        "koputades",
        "lugemata",
        "ütlemata",
        "küsimata",
        "helistamata",
        "söömata",
        "minemata",
        "koputamata",
      ]}
      recap={[
        <Trans key="1">
          <b lang="et">-des</b> usually means at the same time. Change the last <b lang="et">-a</b>{" "}
          of the <b lang="et">-da</b> form to <b lang="et">-es</b>: <b lang="et">lugeda</b>,{" "}
          <b lang="et">lugedes</b>; <b lang="et">süüa</b>, <b lang="et">süües</b>.
        </Trans>,
        <Trans key="2">
          <b lang="et">-mata</b> means without doing it. Change <b lang="et">-ma</b> to{" "}
          <b lang="et">-mata</b>: <b lang="et">lugema</b>, <b lang="et">lugemata</b>;{" "}
          <b lang="et">sööma</b>, <b lang="et">söömata</b>.
        </Trans>,
        <Trans key="3">
          Check which form the ending goes on: <b lang="et">-des</b> on the <b lang="et">-da</b>{" "}
          form, <b lang="et">-mata</b> on the <b lang="et">-ma</b> form. The verb{" "}
          <b lang="et">minema</b> gives <b lang="et">minnes</b> and <b lang="et">minemata</b>.
        </Trans>,
        <Trans key="4">
          After <b lang="et">-mata</b>, the object usually takes the partitive, as after{" "}
          <b lang="et">ei</b>: <b lang="et">seda lugemata</b>.
        </Trans>,
        <Trans key="5">
          The phrase usually goes with the thing it describes and often comes last. It can also
          start the sentence. The verb then usually comes next, but the subject can also come first:{" "}
          <b lang="et">Õppides kuulan ma muusikat</b> or <b lang="et">Õppides ma kuulan muusikat</b>
          .
        </Trans>,
      ]}
      sections={[
        {
          id: "des",
          title: t`While doing something: -des`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To say someone does two things at once, put <b lang="et">-des</b> on the second
                    one: <b lang="et">Ta joob kohvi ajalehte lugedes.</b> He drinks coffee while
                    reading the paper. Usually the same person does both.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Start from the <b lang="et">-da</b> form, which lesson {infinitives} taught, and
                    change its last <b lang="et">-a</b> to <b lang="et">-es</b>: <Word w="lugeda" />{" "}
                    becomes <Word w="lugedes" />. Pick a group of verbs and tap the sentences.
                  </Trans>
                </p>
              </Prose>
              <FormTable kind="des" />
              <Aside>
                <Trans>
                  <b lang="et">-des</b> can also mean when, on doing something, or by doing it:{" "}
                  <b lang="et">Koju jõudes helistasin emale.</b> When I got home, I phoned my
                  mother. <b lang="et">Ma õpin raamatuid lugedes.</b> I learn by reading books.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Type the form for each verb.</Trans>
                </p>
              </Prose>
              <Quiz
                id="des-forms"
                title={<Trans>Make the -des form</Trans>}
                items={content.desForms}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight forms right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the ones you missed against the table.</Trans>
                  ) : (
                    <Trans>Go through the table once more, then try again.</Trans>
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
          id: "mata",
          title: t`Without doing something: -mata`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To say someone does something without doing another thing, put{" "}
                    <b lang="et">-mata</b> on the second one:{" "}
                    <b lang="et">Ta lahkus midagi ütlemata.</b> She left without saying anything.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Start from the <b lang="et">-ma</b> form and change <b lang="et">-ma</b> to{" "}
                    <b lang="et">-mata</b>: <Word w="lugema" /> becomes <Word w="lugemata" />. Every
                    verb works this way, even <Word w="minema" /> and <Word w="sööma" />.
                  </Trans>
                </p>
              </Prose>
              <FormTable kind="mata" />
              <Aside>
                <Trans>
                  After <b lang="et">-mata</b>, the object usually takes the partitive, as after{" "}
                  <b lang="et">ei</b> in lesson {object}: <b lang="et">seda lugemata</b>,{" "}
                  <b lang="et">midagi ütlemata</b>. It can also describe what isn’t done yet:{" "}
                  <b lang="et">Raamat on lugemata.</b> The book is unread.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Type the form for each verb.</Trans>
                </p>
              </Prose>
              <Quiz
                id="mata-forms"
                title={<Trans>Make the -mata form</Trans>}
                items={content.mataForms}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight forms right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the ones you missed against the table.</Trans>
                  ) : (
                    <Trans>Go through the table once more, then try again.</Trans>
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
          id: "apart",
          title: t`While or without?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The two endings sit in the same place in a sentence and usually mean opposites:{" "}
                    <Word w="koputades" /> is while knocking and <Word w="koputamata" /> is without
                    knocking. The last letters decide, so listen for them.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Tap a pair of sentences. Then hear a sentence and pick what the ending says.
                  </Trans>
                </p>
              </Prose>
              <PairTable />
              <Quiz
                id="hear-des-mata"
                title={<Trans>While or without?</Trans>}
                items={content.heard}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, with the ending heard each time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you got wrong once more.</Trans>
                  ) : (
                    <Trans>Tap the pairs above once more, then try again.</Trans>
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
          title: t`Where the phrase goes`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A phrase with <b lang="et">-des</b> or <b lang="et">-mata</b> usually goes with
                    the thing it describes and often comes last:{" "}
                    <b lang="et">Ära kasuta telefoni sõites.</b>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    It can also start the sentence. The verb then usually comes next, as it does
                    after any first phrase: <b lang="et">Sõites ära kasuta telefoni.</b> The subject
                    can also come before the verb: <b lang="et">Koju minnes ma ostan leiba.</b>
                  </Trans>
                </p>
                <p>
                  <Trans>Build each sentence from what it means.</Trans>
                </p>
              </Prose>
              <Quiz
                id="des-order"
                title={<Trans>Build the sentence</Trans>}
                items={content.built}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six built.</Trans>
                  ) : (
                    <Trans>Read the note under each one you missed, then try again.</Trans>
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
                    Each sentence has a moment of two things at once or of something left out.
                    Choose <b lang="et">-des</b> or <b lang="et">-mata</b>, then write the whole
                    sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-des-mata"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven, each with the right ending.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the ending in the ones you missed.</Trans>
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
                    Each sentence has one wrong word: the wrong ending, a form that doesn’t exist,
                    or the wrong case. Tap it, then type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-des-mata"
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
          id: "diary",
          title: t`A weekend at grandmother’s`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari writes about a weekend with friends in the countryside. Read her text and
                    answer the questions, as in the reading part of the B1 exam.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="mari-weekend"
                title={<Trans>What happened at the weekend?</Trans>}
                by={t`Mari writes`}
                sentences={DES_DIARY}
                questions={content.diary}
              />
            </>
          ),
        },
        {
          id: "flatmate",
          title: t`Two friends talk about flatmates`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kalev phones Liisa, who has just moved into a new flat. Listen to them twice and
                    answer the questions.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="liisa-flat"
                title={<Trans>Listen: Kalev and Liisa</Trans>}
                clip="c-liisa"
                turns={DES_CONVERSATION.turns}
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
