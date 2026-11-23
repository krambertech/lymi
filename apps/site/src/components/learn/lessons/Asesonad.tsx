import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  PRONOUN_ABOUT,
  PRONOUN_CALL,
  PRONOUN_CASES,
  PRONOUN_FIX,
  PRONOUN_PARTITIVE,
  PRONOUN_SHORT,
  PRONOUN_TRANSLATE,
  PRONOUN_WAYS,
  PRONOUN_WHICH,
  PRONOUN_WITH,
  type PronounCase,
  type PronounId,
  type PronounWay,
  pronounSentence,
  pronounShort,
  pronounWith,
} from "../../../lib/learn/clips";
import type { PassageQuestion } from "../../../lib/learn/questions";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, ListenRows, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import { type GapItem, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "asesonad";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const MEANS: Record<string, MessageDescriptor> = {
  "Tule minuga!": msg`Come with me.`,
  "Ma räägin temaga.": msg`I’m talking with him or her.`,
  "Kas sa tuled meiega?": msg`Are you coming with us?`,
  "Ma ei tule sinuta.": msg`I’m not coming without you.`,
  "Kas sa lähed nendega?": msg`Are you going with them?`,
  "Helista mulle!": msg`Call me.`,
  "Mul on aega.": msg`I have time.`,
  "Ma küsin teilt.": msg`I’ll ask you. To more than one, or polite.`,
  "Jaan helistab mulle.": msg`Jaan is calling me.`,
  "Jaan helistab sulle.": msg`Jaan is calling you.`,
  "Jaan helistab talle.": msg`Jaan is calling him or her.`,
  "Jaan helistab meile.": msg`Jaan is calling us.`,
  "Jaan helistab teile.": msg`Jaan is calling you. To more than one, or polite.`,
  "Jaan helistab neile.": msg`Jaan is calling them.`,
  "Sul on aega.": msg`You have time.`,
  "Tal on aega.": msg`He or she has time.`,
  "Meil on aega.": msg`We have time.`,
  "Teil on aega.": msg`You have time. To more than one, or polite.`,
  "Neil on aega.": msg`They have time.`,
  "Jaan küsib mult.": msg`Jaan is asking me.`,
  "Jaan küsib sult.": msg`Jaan is asking you.`,
  "Jaan küsib talt.": msg`Jaan is asking him or her.`,
  "Jaan küsib meilt.": msg`Jaan is asking us.`,
  "Jaan küsib teilt.": msg`Jaan is asking you. To more than one, or polite.`,
  "Jaan küsib neilt.": msg`Jaan is asking them.`,
  "Ma armastan sind.": msg`I love you.`,
  "Oota mind!": msg`Wait for me.`,
  "Ma ootan teda.": msg`I’m waiting for him or her.`,
  "Me ootame teid.": msg`We’re waiting for you. To more than one, or polite.`,
  "Nad ootavad meid.": msg`They’re waiting for us.`,
  "Kas sa ootad neid?": msg`Are you waiting for them?`,
  "See on minu kass.": msg`This is my cat.`,
  "Jaan ootab mind.": msg`Jaan is waiting for me.`,
  "Kas sul on aega?": msg`Do you have time?`,
  "Tal on auto.": msg`He or she has a car.`,
  "Kus on tema raamat?": msg`Where is his or her book?`,
  "Meil on kass.": msg`We have a cat.`,
  "See on nende auto.": msg`This is their car.`,
  "Ma räägin sinust.": msg`I’m talking about you.`,
  "Nad räägivad meist.": msg`They’re talking about us.`,
};

const GLOSSARY: Glossary = {
  mina: { en: msg`I`, note: msg`The short form is ma.` },
  minu: { en: msg`my`, note: msg`The genitive of mina. Short: mu.` },
  minuga: { en: msg`with me` },
  minuta: { en: msg`without me` },
  sinuta: { en: msg`without you` },
  temaga: { en: msg`with him or her` },
  nende: { en: msg`their`, note: msg`The genitive of nemad.` },
  nendega: { en: msg`with them`, note: msg`-ga on nende, the genitive of nemad.` },
  mulle: { en: msg`to me, for me`, note: msg`The short form of minule.` },
  minule: { en: msg`to me, for me`, note: msg`The long form of mulle. It puts weight on me.` },
  mul: { en: msg`I have`, note: msg`With on: mul on aega, I have time. The short form of minul.` },
  minul: {
    en: msg`I have`,
    note: msg`With on: minul on aega, I have time. The long form of mul; it puts weight on me.`,
  },
  mult: { en: msg`from me`, note: msg`The short form of minult.` },
  minult: { en: msg`from me`, note: msg`The long form of mult. It puts weight on me.` },
  helistab: {
    en: msg`calls, is calling`,
    note: msg`From helistama, to call. The person takes -le.`,
  },
  küsib: { en: msg`asks, is asking`, note: msg`From küsima, to ask. The person asked takes -lt.` },
  ootan: { en: msg`I’m waiting`, note: msg`From ootama, to wait. The person takes the partitive.` },
  armastan: { en: msg`I love`, note: msg`From armastama, to love.` },
  "ma armastan sind": { en: msg`I love you.`, show: "Ma armastan sind" },
  mind: { en: msg`me`, note: msg`The partitive of mina.` },
  sind: {
    en: msg({ message: "you", context: "the partitive sind" }),
    note: msg`The partitive of sina.`,
  },
  teda: { en: msg`him or her`, note: msg`The partitive of tema.` },
  meid: { en: msg`us`, note: msg`The partitive of meie.` },
  teid: {
    en: msg({ message: "you, to more than one; polite you", context: "the partitive teid" }),
    note: msg`The partitive of teie.`,
  },
  neid: { en: msg`them`, note: msg`The partitive of nemad.` },
  "keda?": { en: msg`whom?`, show: "Keda?", note: msg`The partitive of kes, who.` },
  "kellega?": { en: msg`with whom?`, show: "Kellega?" },
  "kellele?": { en: msg`to whom?`, show: "Kellele?" },
  "kellel?": { en: msg`who has?`, show: "Kellel?" },
  "kellelt?": { en: msg`from whom?`, show: "Kellelt?" },
  "kellest?": { en: msg`about whom?`, show: "Kellest?" },
  "ma räägin sinust": { en: msg`I’m talking about you.`, show: "Ma räägin sinust" },
  "see on minu kass": { en: msg`This is my cat.`, show: "See on minu kass" },
  "mul on kass": { en: msg`I have a cat.`, show: "Mul on kass" },
  "jaan ootab mind": { en: msg`Jaan is waiting for me.`, show: "Jaan ootab mind" },
};

const PERSON_NAMES: Record<PronounId, MessageDescriptor> = {
  mina: msg`I`,
  sina: msg`you`,
  tema: msg`he or she`,
  meie: msg`we`,
  teie: msg`you, to more than one; polite you`,
  nemad: msg`they`,
};

const WITH_MEANS: Record<PronounId, { ga: MessageDescriptor; ta: MessageDescriptor }> = {
  mina: { ga: msg`with me`, ta: msg`without me` },
  sina: { ga: msg`with you`, ta: msg`without you` },
  tema: { ga: msg`with him or her`, ta: msg`without him or her` },
  meie: { ga: msg`with us`, ta: msg`without us` },
  teie: {
    ga: msg`with you, to more than one; polite`,
    ta: msg`without you, to more than one; polite`,
  },
  nemad: { ga: msg`with them`, ta: msg`without them` },
};

const PARTITIVE_MEANS: Record<PronounId, MessageDescriptor> = {
  mina: msg`me`,
  sina: msg`you, one person`,
  tema: msg`him or her`,
  meie: msg`us`,
  teie: msg({ message: "you, to more than one; polite you", context: "the partitive teid" }),
  nemad: msg`them`,
};

const TRANSLATE_PROMPTS: Record<(typeof PRONOUN_TRANSLATE)[number]["id"], MessageDescriptor> = {
  "tule-minuga": msg`Come with me.`,
  "ootan-sind": msg`I’m waiting for you. (To a friend.)`,
  "helista-mulle": msg`Call me. (To a friend.)`,
  "sul-on-aega": msg`Do you have time? (To a friend.)`,
  "raagime-sinust": msg`We’re talking about you. (To a friend.)`,
  "kusib-temalt": msg`Jaan is asking her.`,
};

const meaning = (said: string, i18n: I18n) => i18n._(MEANS[said] as MessageDescriptor);
const lit = (form: string, ending: string) =>
  `${form.slice(0, form.length - ending.length)}|${ending}`;
const personOf = (id: PronounId) => PRONOUN_CASES.find((each) => each.id === id) as PronounCase;

export const BUILD = PRONOUN_CASES.flatMap((person) =>
  (["ga", "ta"] as const).map((ending) => ({
    person,
    ending,
    form: pronounWith(person.genitive, ending),
    pair: [person.id, `${person.id}-${ending}`] as const,
  })),
);

export const HEARD = PRONOUN_CASES.flatMap((person) =>
  PRONOUN_WAYS.map((way) => ({
    way,
    said: pronounSentence(way, pronounShort(person, way)),
    pair: [way, `${person.id}-${way}`] as const,
  })),
);
export const shuffledWays = (): PronounWay[] => shuffle([...PRONOUN_WAYS]);

const WAY_NAMES: Record<PronounWay, MessageDescriptor> = {
  le: msg`To someone`,
  l: msg`Someone has`,
  lt: msg`From someone`,
};

const wayOptions = (ways: readonly PronounWay[], i18n: I18n) =>
  ways.map((way) => ({
    id: way,
    label: <span lang={i18n.locale}>{i18n._(WAY_NAMES[way])}</span>,
  }));

type HeardItem = ChoiceItem & { said: string; pair: readonly [string, string] };
type BuildItem = FormItem & { pair: readonly [string, string] };
type WhichItem = FormItem & {
  pair: readonly [string, string];
  options: readonly string[];
  answers: readonly [string];
};

export const whichForms = (person: PronounCase) =>
  [person.genitive, person.shortL, person.partitive] as const;

const formOf = (person: PronounCase, form: (typeof PRONOUN_WHICH)[number]["form"]) =>
  form === "genitive" ? person.genitive : form === "l" ? person.shortL : person.partitive;

export const whichRun = (items: readonly WhichItem[], pinned?: WhichItem): WhichItem[] =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle([...item.options]) },
  );

const MESSAGE_GAPS: readonly GapItem[] = [
  {
    id: "minuga",
    before: "Tere, Mari! Kas sa tuled täna",
    after: "kohvikusse?",
    answer: "minuga",
    options: ["minuga", "mind", "mulle"],
  },
  {
    id: "meiega",
    before: "Jaan tuleb ka",
    after: ".",
    answer: "meiega",
    options: ["meile", "meiega", "meid"],
  },
  {
    id: "sind",
    before: "Ma ootan",
    after: "kell viis.",
    answer: "sind",
    options: ["sulle", "sinuga", "sind"],
  },
  {
    id: "sulle",
    before: "Mul on",
    after: "raamat.",
    answer: "sulle",
    options: ["sulle", "sind", "sinuga"],
  },
  {
    id: "mulle",
    before: "Helista",
    after: "!",
    answer: "mulle",
    options: ["minuga", "mind", "mulle"],
  },
];

function useContent() {
  const { t, i18n } = useLingui();
  const why: Record<string, ReactNode> = {
    minuga: (
      <Trans>
        Coming with someone: <span lang="et">-ga</span> on <span lang="et">minu</span>.
      </Trans>
    ),
    meiega: (
      <Trans>
        With us: <span lang="et">-ga</span> on <span lang="et">meie</span>.
      </Trans>
    ),
    sind: (
      <Trans>
        After <span lang="et">ootan</span>, the partitive: <span lang="et">sind</span>.
      </Trans>
    ),
    sulle: (
      <Trans>
        For you, the one it goes to: <span lang="et">sulle</span>.
      </Trans>
    ),
    mulle: (
      <Trans>
        <span lang="et">Helista</span>, call, takes the person with <span lang="et">-le</span>:{" "}
        <span lang="et">mulle</span>, to me.
      </Trans>
    ),
  };
  const gaps = MESSAGE_GAPS.map((gap) => ({ ...gap, why: why[gap.id] }));

  const translate: SentenceItem[] = PRONOUN_TRANSLATE.map(({ id, answers }) => ({
    kind: "translate",
    id,
    prompt: i18n._(TRANSLATE_PROMPTS[id]),
    answers,
    src: src(answers[0]),
  }));
  const translateWhy: Record<string, ReactNode> = {
    "tule-minuga": (
      <Trans>
        With me: <span lang="et">-ga</span> on the genitive <span lang="et">minu</span>.
      </Trans>
    ),
    "ootan-sind": (
      <Trans>
        After <span lang="et">ootan</span>, the partitive <span lang="et">sind</span>.
      </Trans>
    ),
    "helista-mulle": (
      <Trans>
        You call to someone: <span lang="et">mulle</span>, the short form with{" "}
        <span lang="et">-le</span>.
      </Trans>
    ),
    "sul-on-aega": (
      <Trans>
        Having is <span lang="et">-l</span> with <span lang="et">on</span>:{" "}
        <span lang="et">sul on</span>.
      </Trans>
    ),
    "raagime-sinust": (
      <Trans>
        About someone is <span lang="et">-st</span>: <span lang="et">sinust</span>.
      </Trans>
    ),
    "kusib-temalt": (
      <Trans>
        You ask from someone: <span lang="et">-lt</span>, <span lang="et">temalt</span> or{" "}
        <span lang="et">talt</span>.
      </Trans>
    ),
  };
  const sentences = translate.map((item) => ({ ...item, explain: translateWhy[item.id] }));

  const fixWhy: Record<string, ReactNode> = {
    "fix-minuga": (
      <Trans>
        <span lang="et">-ga</span> goes on the genitive <span lang="et">minu</span>, not on{" "}
        <span lang="et">mina</span>.
      </Trans>
    ),
    "fix-sind": (
      <Trans>
        <span lang="et">Ootama</span> takes the partitive, <span lang="et">sind</span>.{" "}
        <span lang="et">Sinu</span> is your.
      </Trans>
    ),
    "fix-mul": (
      <Trans>
        Having is <span lang="et">mul on</span>. <span lang="et">Minu</span> is my.
      </Trans>
    ),
    "fix-minu-nimi": (
      <Trans>
        My name: the genitive <span lang="et">minu</span>, as in <span lang="et">minu raamat</span>.
      </Trans>
    ),
    "fix-mulle": (
      <Trans>
        <span lang="et">Helistama</span> takes the person with <span lang="et">-le</span>:{" "}
        <span lang="et">mulle</span>.
      </Trans>
    ),
  };
  const fix: FixItem[] = PRONOUN_FIX.map(({ id, wrong, answers }) => ({
    kind: "fix",
    id,
    wrong,
    answers,
    src: src(answers[0]),
    explain: fixWhy[id],
  }));

  const call: PassageQuestion[] = [
    { id: "free", kind: "truefalse", ask: t`Jaan has time today.`, answer: true, line: 2 },
    {
      id: "where",
      ask: t`Where are Mari and Kati going?`,
      options: [
        { id: "shop", label: t`To the shop` },
        { id: "cafe", label: t`To a café` },
        { id: "tartu", label: t`To Tartu` },
      ],
      answer: "cafe",
      line: 4,
    },
    {
      id: "peeter-comes",
      kind: "truefalse",
      ask: t`Peeter is going to the café as well.`,
      answer: false,
      line: 8,
    },
    {
      id: "calls",
      ask: t`Who is going to phone Jaan tomorrow?`,
      options: [
        { id: "peeter", label: t`Peeter` },
        { id: "kati", label: t`Kati` },
        { id: "mari", label: t`Mari` },
      ],
      answer: "peeter",
      line: 10,
    },
    {
      id: "book",
      kind: "short",
      ask: t`What has Jaan got for Peeter? Write it as Jaan says it.`,
      answers: ["raamat", "raamatu"],
      line: 12,
    },
    {
      id: "about",
      ask: t`What is the book about?`,
      options: [
        { id: "tartu", label: t`Tartu` },
        { id: "estonian", label: t`Estonian` },
        { id: "tallinn", label: t`Tallinn` },
      ],
      answer: "tallinn",
      line: 14,
    },
    {
      id: "talk",
      ask: t`Who wants to talk with Jaan?`,
      options: [
        { id: "mari", label: t`Mari` },
        { id: "peeter", label: t`Peeter` },
        { id: "kati", label: t`Kati` },
      ],
      answer: "kati",
      line: 19,
    },
    {
      id: "time",
      ask: t`When do they expect Jaan at the café?`,
      options: [
        { id: "seven", label: t`At seven` },
        { id: "five", label: t`At five` },
        { id: "six", label: t`At six` },
      ],
      answer: "seven",
      line: 27,
    },
    { id: "bus", kind: "truefalse", ask: t`Jaan is coming by bus.`, answer: false, line: 29 },
  ];
  return { gaps, sentences, fix, call };
}

function CaseTable() {
  const { t, i18n } = useLingui();
  const [id, setId] = useState<PronounId>("mina");
  const person = personOf(id);
  const cell = (form: string | null, ending: string) =>
    form ? { form: ending ? lit(form, ending) : form, src: src(form) } : null;
  const rows: ParadigmRow[] = [
    {
      id: "kes",
      label: t`who`,
      ask: "kes?",
      tip: t`The form a dictionary lists first.`,
      cells: [cell(person.id, ""), cell(person.short, "")],
    },
    {
      id: "kelle",
      label: t`whose`,
      ask: "kelle?",
      tip: t`The genitive. -ga and -ta go on it.`,
      cells: [cell(person.genitive, ""), cell(person.shortGenitive, "")],
    },
    {
      id: "keda",
      label: t`whom`,
      ask: "keda?",
      tip: (
        <Trans>
          The partitive, after a verb such as <span lang="et">ootama</span>: a short word of its
          own.
        </Trans>
      ),
      cells: [cell(person.partitive, ""), null],
    },
    {
      id: "kellega",
      label: t`with whom`,
      ask: "kellega?",
      tip: (
        <Trans>
          <span lang="et">-ga</span> on the genitive.
        </Trans>
      ),
      cells: [cell(pronounWith(person.genitive, "ga"), "ga"), null],
    },
    {
      id: "kelleta",
      label: t`without whom`,
      ask: "kelleta?",
      tip: (
        <Trans>
          <span lang="et">-ta</span> on the genitive.
        </Trans>
      ),
      cells: [cell(pronounWith(person.genitive, "ta"), "ta"), null],
    },
    {
      id: "kellele",
      label: t`to whom`,
      ask: "kellele?",
      tip: (
        <Trans>
          <span lang="et">-le</span>, to. Speech uses the short form.
        </Trans>
      ),
      cells: [cell(person.le, "le"), cell(person.shortLe, "le")],
    },
    {
      id: "kellel",
      label: t`who has`,
      ask: "kellel?",
      tip: (
        <Trans>
          <span lang="et">-l</span>, as in <span lang="et">mul on</span>. Speech uses the short
          form.
        </Trans>
      ),
      cells: [cell(person.l, "l"), cell(person.shortL, "l")],
    },
    {
      id: "kellelt",
      label: t`from whom`,
      ask: "kellelt?",
      tip: (
        <Trans>
          <span lang="et">-lt</span>, from. Speech uses the short form.
        </Trans>
      ),
      cells: [cell(person.lt, "lt"), cell(person.shortLt, "lt")],
    },
    {
      id: "kellest",
      label: t`about whom`,
      ask: "kellest?",
      tip: (
        <Trans>
          <span lang="et">-st</span>, out of, also says who you talk about.
        </Trans>
      ),
      cells: [cell(person.st, "st"), cell(person.shortSt, "st")],
    },
  ];
  return (
    <Panel>
      <Chips
        label={t`Pronoun`}
        items={PRONOUN_CASES.map((each) => ({ label: each.id, value: each.id, lang: "et" }))}
        value={id}
        onPick={setId}
      />
      <Paradigm
        key={id}
        label={t`Forms of ${person.id}`}
        columns={[t`Long`, t`Short`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{ title: i18n._(PERSON_NAMES[id]), tip: t`Tap a form to hear it.` }}
      />
    </Panel>
  );
}

export function AsesonadLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const genitive = lessonBySlug("omastav")?.n;
  const withLesson = lessonBySlug("sobraga-rahata")?.n;
  const have = lessonBySlug("mul-on")?.n;
  const onto = lessonBySlug("laual-lauale-laualt")?.n;
  const partitive = lessonBySlug("osastav")?.n;
  const into = lessonBySlug("majas-majja-majast")?.n;

  const heardItems = useMemo<HeardItem[]>(() => {
    const first = HEARD.find(({ said }) => said === "Jaan küsib mult.");
    const rest = HEARD.filter((each) => each !== first);
    return [...(first ? [first] : []), ...rest].map(({ said, way, pair }) => ({
      said,
      pair,
      src: src(said),
      answer: way,
      options: wayOptions(PRONOUN_WAYS, i18n),
      explain: (
        <>
          <span lang="et" className="font-medium text-ink">
            {said}
          </span>{" "}
          {meaning(said, i18n)}
        </>
      ),
    }));
  }, [i18n]);

  const heardRun = (items: readonly HeardItem[], pinned?: HeardItem): HeardItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned ? item : { ...item, options: wayOptions(shuffledWays(), i18n) },
    );

  const buildItems = useMemo<BuildItem[]>(
    () =>
      BUILD.map(({ person, ending, form, pair }) => ({
        base: person.id,
        gloss:
          person.id === "nemad" ? (
            <Trans>
              they; genitive <span lang="et">nende</span>
            </Trans>
          ) : (
            i18n._(PERSON_NAMES[person.id])
          ),
        cue: i18n._(WITH_MEANS[person.id][ending]),
        answers: [form],
        src: src(form),
        pair,
        explain: (
          <Trans>
            <span lang="et">-{ending}</span> on the genitive{" "}
            <span lang="et">{person.genitive}</span>.
          </Trans>
        ),
      })),
    [i18n],
  );

  const whichItems = useMemo<WhichItem[]>(() => {
    const explain = {
      genitive: <Trans>Whose: the genitive, the same form as my or your.</Trans>,
      l: (
        <Trans>
          Who has: <span lang="et">-l</span> with <span lang="et">on</span>.
        </Trans>
      ),
      partitive: (
        <Trans>
          Whom: after a verb such as <span lang="et">ootama</span>, the partitive.
        </Trans>
      ),
    };
    const items = PRONOUN_WHICH.map(({ id, person: who, form, said, cue }, i): WhichItem => {
      const person = personOf(who);
      const three = whichForms(person);
      const turn = i === 0 ? 2 : i % 3;
      return {
        base: person.id,
        gloss: i18n._(PERSON_NAMES[person.id]),
        cue,
        cueLang: "et",
        answers: [formOf(person, form)],
        options: [...three.slice(turn), ...three.slice(0, turn)],
        src: src(said),
        said: (
          <>
            <span lang="et">{said}</span> {meaning(said, i18n)}
          </>
        ),
        pair: [form, id] as const,
        explain: explain[form],
      };
    });
    return items;
  }, [i18n]);

  const matchPairs: MatchPair[] = PRONOUN_CASES.map((person) => ({
    id: person.partitive,
    left: person.partitive,
    right: i18n._(PARTITIVE_MEANS[person.id]),
    src: src(person.partitive),
  }));

  const rows = (list: readonly string[]) =>
    list.map((said) => ({
      main: <span lang="et">{said}</span>,
      sub: meaning(said, i18n),
      src: src(said),
    }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          A pronoun takes the case endings a noun does. Most go on its genitive, so{" "}
          <span lang="et">minuga</span> is with me. To, has and from have short forms such as{" "}
          <span lang="et">mulle</span>, and the partitive is its own word:{" "}
          <span lang="et">mind</span>, <span lang="et">sind</span>, <span lang="et">teda</span>.
        </Trans>
      }
      facts={[
        <Trans key="m">18 minutes</Trans>,
        <Trans key="q">8 exercises, 3 of them typed, and a phone call</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "minuga",
        "sinuta",
        "nendega",
        "mulle",
        "mul",
        "mult",
        "mind",
        "sind",
        "teda",
        "keda?",
        "kellega?",
        "kellele?",
        "ma räägin sinust",
      ]}
      recap={[
        <Trans key="1">
          <b lang="et">-ga</b> and <b lang="et">-ta</b> go on the genitive: <b lang="et">minuga</b>,
          with me; <b lang="et">sinuta</b>, without you; <b lang="et">nendega</b>, with them.
        </Trans>,
        <Trans key="2">
          For to, has and from, speech uses the short forms: <b lang="et">mulle, mul, mult</b>;{" "}
          <b lang="et">talle, tal, talt</b>; <b lang="et">meile, meil, meilt</b>. The long{" "}
          <b lang="et">minule, minul, minult</b> put weight on the person.
        </Trans>,
        <Trans key="3">
          The partitive is a word of its own: <b lang="et">mind, sind, teda, meid, teid, neid</b>.{" "}
          <b lang="et">Ma ootan sind</b> is I’m waiting for you.
        </Trans>,
        <Trans key="4">
          My is the genitive, having is <b lang="et">-l</b>, and whom is the partitive:{" "}
          <b lang="et">minu kass</b>, <b lang="et">mul on kass</b>, <b lang="et">Jaan ootab mind</b>
          .
        </Trans>,
        <Trans key="5">
          Each form answers the same form of <b lang="et">kes</b>: <b lang="et">kellega?</b>,{" "}
          <b lang="et">kellele?</b>, <b lang="et">keda?</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "with-me",
          title: t`With me, without you`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Minu" /> is my, the genitive from lesson {genitive}. Put an ending from
                    lesson {withLesson} on it, and you have with me and without me:{" "}
                    <Word w="minuga" />, <Word w="minuta" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Every pronoun works this way: <Word w="sinuta" />, without you;{" "}
                    <Word w="temaga" />, with him or her. For they, the genitive is{" "}
                    <Word w="nende" />, so with them is <Word w="nendega" />. Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(PRONOUN_WITH)} />
              <Panel>
                <Paradigm
                  label={t`Each pronoun’s genitive, with -ga and with -ta`}
                  columns={[
                    t`Whose`,
                    t({ message: "With", context: "with or without" }),
                    t({ message: "Without", context: "with or without" }),
                  ]}
                  rows={PRONOUN_CASES.map((person) => ({
                    id: person.id,
                    label: i18n._(PERSON_NAMES[person.id]),
                    et: person.id,
                    cells: [
                      { form: person.genitive, src: src(person.genitive) },
                      ...(["ga", "ta"] as const).map((ending) => {
                        const form = pronounWith(person.genitive, ending);
                        return {
                          form: lit(form, ending),
                          src: src(form),
                          note: i18n._(WITH_MEANS[person.id][ending]),
                        };
                      }),
                    ],
                  }))}
                  empty={{ title: t`Tap a form`, tip: t`You’ll hear it and see what it means.` }}
                />
              </Panel>
              <Prose>
                <p>
                  <Trans>
                    Now type the form: put <span lang="et">-ga</span> or <span lang="et">-ta</span>{" "}
                    on the pronoun’s genitive.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="build-with-me"
                title={<Trans>With or without</Trans>}
                items={buildItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them, each ending on its genitive.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Nearly. Find the genitive first, then add <span lang="et">-ga</span> or{" "}
                      <span lang="et">-ta</span>.
                    </Trans>
                  ) : (
                    <Trans>Tap the forms in the table once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={eachPairFirst}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "short-forms",
          title: t`Short forms for to, has and from`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    For to, has and from, speech uses a short form: <Word w="mulle" />, to me;{" "}
                    <Word w="mul" />, as in <span lang="et">mul on</span> from lesson {have};{" "}
                    <Word w="mult" />, from me. These are the endings <span lang="et">-le</span>,{" "}
                    <span lang="et">-l</span> and <span lang="et">-lt</span> from lesson {onto}, on
                    a short stem.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The long forms <Word w="minule" />, <Word w="minul" /> and <Word w="minult" />{" "}
                    mean the same and put weight on the person. For we and you, speech has only the
                    short <span lang="et">meile</span> and <span lang="et">teile</span>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Some verbs bring their ending. You call to someone, so <Word w="helistab" />{" "}
                    takes <span lang="et">-le</span>; you ask from someone, so <Word w="küsib" />{" "}
                    takes <span lang="et">-lt</span>. Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(PRONOUN_SHORT)} />
              <Panel>
                <Paradigm
                  label={t`Each pronoun’s short forms for to, has and from`}
                  columns={[t`To`, t`Has`, t`From`]}
                  rows={PRONOUN_CASES.map((person) => ({
                    id: person.id,
                    label: i18n._(PERSON_NAMES[person.id]),
                    et: person.id,
                    cells: PRONOUN_WAYS.map((way) => {
                      const form = pronounShort(person, way);
                      const said = pronounSentence(way, form);
                      return { form: lit(form, way), src: src(said), note: meaning(said, i18n) };
                    }),
                  }))}
                  empty={{
                    title: t`Tap a form`,
                    tip: t`You’ll hear a sentence with it and see what it means.`,
                  }}
                />
              </Panel>
              <Prose>
                <p>
                  <Trans>
                    Now hear a line and pick what the pronoun says. The ending tells you:{" "}
                    <span lang="et">-le</span>, <span lang="et">-l</span> or{" "}
                    <span lang="et">-lt</span>.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="to-has-or-from"
                title={<Trans>To, has or from?</Trans>}
                items={heardItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them. You heard each ending.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed and listen to the last sound.</Trans>
                  ) : (
                    <Trans>Tap the forms in the table once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={heardRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "partitive",
          title: t`The partitive: me, you, him or her`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    After a verb such as <Word w="ootan" />, I’m waiting, or <Word w="armastan" />,
                    I love, the person takes the partitive from lesson {partitive}.{" "}
                    <Word w="Ma armastan sind" /> is I love you. A pronoun’s partitive doesn’t grow
                    from the genitive, so learn the six as they are.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    They are <Word w="mind" />, <Word w="sind" />, <Word w="teda" />,{" "}
                    <Word w="meid" />, <Word w="teid" /> and <Word w="neid" />. To ask whom, say{" "}
                    <Word w="keda?" /> Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(PRONOUN_PARTITIVE)} />
              <Prose>
                <p>
                  <Trans>Match each form with the person it names.</Trans>
                </p>
              </Prose>
              <Match id="whom" title={<Trans>Who is it?</Trans>} pairs={matchPairs} />
            </>
          ),
        },
        {
          id: "which-form",
          title: t`My, has or me`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Three forms of one pronoun look alike and say different things.{" "}
                    <Word w="See on minu kass" /> is this is my cat. <Word w="Mul on kass" /> is I
                    have a cat. <Word w="Jaan ootab mind" /> is Jaan is waiting for me.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Ask what the sentence needs. Whose takes the genitive, who has takes{" "}
                    <span lang="et">-l</span> with <span lang="et">on</span>, and whom after a verb
                    takes the partitive.
                  </Trans>
                </p>
              </Prose>
              <Aside>
                <Trans>
                  <span lang="et">Minu on kass</span> is wrong. <span lang="et">Minu</span> is my,
                  and it stands before a noun; to say who has something, use{" "}
                  <span lang="et">mul on</span>.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Pick the form the sentence needs.</Trans>
                </p>
              </Prose>
              <Quiz
                id="minu-mul-mind"
                title={<Trans>My, has or me?</Trans>}
                items={whichItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them: whose, who has and whom, each in its form.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Ask whose, who has or whom before you pick.</Trans>
                  ) : (
                    <Trans>Read the three sentences above once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={whichRun}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "every-case",
          title: t`Every form of a pronoun`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The table shows one pronoun in each case of this lesson. Beside each form is the
                    question that asks for it, a form of <span lang="et">kes</span>, who:{" "}
                    <Word w="kellega?" />, with whom; <Word w="kellele?" />, to whom.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The ending <span lang="et">-st</span>, out of, from lesson {into}, also says who
                    you talk about: <Word w="Ma räägin sinust" /> is I’m talking about you. Pick a
                    pronoun, then tap a form to hear it.
                  </Trans>
                </p>
              </Prose>
              <CaseTable />
              <ListenRows items={rows(PRONOUN_ABOUT)} />
              <Prose>
                <p>
                  <Trans>
                    Now write each sentence in Estonian. Each one needs a different form, so ask
                    with whom, to whom, who has, from whom, about whom or whom first.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-it"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.sentences}
                rounds={content.sentences.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences, each pronoun in its form.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>
                      Most of them. Check the form the verb asks for in the ones you missed.
                    </Trans>
                  ) : (
                    <Trans>Pick a pronoun in the table and tap its forms, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "mistakes",
          title: t`Five mistakes to catch`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has one wrong pronoun, as learners often write it. Tap the wrong
                    word, then type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-the-pronoun"
                title={<Trans>Fix the sentence</Trans>}
                items={content.fix}
                rounds={content.fix.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All five found and fixed.</Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Most of them. Read why each one you missed is wrong.</Trans>
                  ) : (
                    <Trans>Go back to “My, has or me” above, then try again.</Trans>
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
          title: t`Kati’s message`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati invites Mari for a coffee. Pick the form for each gap: the words around it
                    say which case fits.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="kati-message"
                title={<Trans>Fill the gaps</Trans>}
                gaps={content.gaps}
                mode="pick"
                clip="p-message"
              />
            </>
          ),
        },
        {
          id: "call",
          title: t`Mari calls Jaan`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari phones Jaan about this evening. Read the questions, then listen. As in the
                    exam, the call plays twice and doesn’t stop.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="mari-calls"
                title={<Trans>Listen: Mari and Jaan</Trans>}
                clip="c-call"
                turns={PRONOUN_CALL.turns}
                names={{ main: t`Jaan`, second: t`Mari` }}
                questions={content.call}
                plays={2}
              />
            </>
          ),
        },
      ]}
    />
  );
}
