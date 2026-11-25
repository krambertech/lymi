import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { CornerDownRight } from "lucide-react";
import { useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  PERE_COUNTED,
  PERE_DIALOGUE,
  PERE_FAMILY,
  PERE_FIELDS,
  PERE_FIXES,
  PERE_HAVE,
  PERE_HEARD,
  PERE_READING,
  PERE_SORTED,
  PERE_TALK,
  PERE_TRANSLATED,
  PERE_WRITING,
  PERE_WRITTEN,
} from "../../../lib/learn/clips";
import { playSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { type KeyItem, Keys, ListenRows, Panel, type RowItem } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import { GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Sort, type SortBin, type SortItem } from "../Sort";
import { PlayMark } from "../Sound";
import { Word } from "../Word";
import { Writing } from "../Writing";

const SLUG = "pere-ja-ankeet";

const src = (text: string) => clipUrl(SLUG, clipId(text));

const FAMILY_MEANS: Record<(typeof PERE_FAMILY)[number]["word"], MessageDescriptor> = {
  ema: msg`mother`,
  isa: msg`father`,
  vend: msg`brother`,
  õde: msg`sister`,
  vanaema: msg`grandmother`,
  vanaisa: msg`grandfather`,
  abikaasa: msg`husband or wife`,
  laps: msg`child`,
  lapsed: msg`children`,
  pere: msg`family`,
};

const FIELD_MEANS: Record<(typeof PERE_FIELDS)[number]["word"], MessageDescriptor> = {
  eesnimi: msg`first name`,
  perekonnanimi: msg`surname`,
  aadress: msg`address`,
  telefoninumber: msg`phone number`,
  vanus: msg`age`,
  sünnipäev: msg`birthday`,
  riik: msg`country`,
  linn: msg`town, city`,
  elukoht: msg`place where you live`,
};

const SENTENCE_MEANS: Record<string, MessageDescriptor> = {
  "See on minu ema.": msg`This is my mother.`,
  "See on minu isa.": msg`This is my father.`,
  "See on minu vend.": msg`This is my brother.`,
  "See on minu õde.": msg`This is my sister.`,
  "See on minu vanaema.": msg`This is my grandmother.`,
  "See on minu vanaisa.": msg`This is my grandfather.`,
  "See on minu abikaasa.": msg`This is my husband or wife.`,
  "See on minu laps.": msg`This is my child.`,
  "Minu lapsed on koolis.": msg`My children are at school.`,
  "Minu pere elab Tartus.": msg`My family lives in Tartu.`,
  "Kas sul on vend?": msg`Do you have a brother?`,
  "Jah, mul on üks vend.": msg`Yes, I have one brother.`,
  "Mul on üks õde ja kaks venda.": msg`I have one sister and two brothers.`,
  "Mul on kolm last.": msg`I have three children.`,
  "Minu eesnimi on Mari.": msg`My first name is Mari.`,
  "Minu perekonnanimi on Tamm.": msg`My surname is Tamm.`,
  "Minu aadress on Kooli viis, Tartu.": msg`My address is Kooli 5, Tartu.`,
  "Minu telefoninumber on viis, kaks, kolm, neli, viis, kuus, seitse.": msg`My phone number is 5234567.`,
  "Minu vanus on kakskümmend kolm.": msg`I’m 23.`,
  "Minu sünnipäev on homme.": msg`My birthday is tomorrow.`,
  "Minu riik on Eesti.": msg`My country is Estonia.`,
  "Minu linn on Tartu.": msg`My town is Tartu.`,
  "Minu elukoht on Pärnu.": msg`I live in Pärnu.`,
};

const GLOSSARY: Glossary = {
  pere: { en: msg`family` },
  minu: { en: msg`my` },
  mul: { en: msg`I have`, note: msg`The short form of minul.` },
  "mul on": {
    en: msg`I have`,
    note: msg`Mul on kaks venda: I have two brothers.`,
    show: "Mul on",
  },
  ankeet: { en: msg`form, questionnaire` },
  ...Object.fromEntries(
    PERE_FAMILY.map(({ word }) => [word, { en: FAMILY_MEANS[word] }]).filter(
      ([word]) => word !== "pere",
    ),
  ),
  ...Object.fromEntries(PERE_FIELDS.map(({ word }) => [word, { en: FIELD_MEANS[word] }])),
  ...Object.fromEntries(
    Object.entries(SENTENCE_MEANS).map(([sentence, en]) => [
      sentence.toLowerCase(),
      { en, show: sentence },
    ]),
  ),
  venda: {
    en: msg`brother, after a number`,
    note: msg`Kaks venda: two brothers.`,
  },
  last: {
    en: msg`child, after a number`,
    note: msg`Kolm last: three children.`,
  },
  ei: { en: msg`no; not` },
  tere: { en: msg`hello` },
  ja: { en: msg`and` },
  täna: { en: msg`today` },
  homme: { en: msg`tomorrow` },
  esmaspäev: { en: msg`Monday` },
  ta: { en: msg`he or she` },
  töötab: { en: msg`works`, note: msg`From töötama, to work.` },
  koolis: { en: msg`at school, in a school` },
  üks: { en: msg`one` },
  kaks: { en: msg`two` },
  kuus: { en: msg`six` },
  kolm: { en: msg`three` },
  neli: { en: msg`four` },
  viis: { en: msg`five` },
  seitse: { en: msg`seven` },
  kaheksa: { en: msg`eight` },
  "kakskümmend kuus": { en: msg`twenty-six` },
  kooli: { en: msg`Kooli, a street name`, note: msg`Kooli kaheksa: Kooli 8.` },
  kohvikus: { en: msg`in a café` },
};

const HEARD_MEANS: Record<string, MessageDescriptor> = {
  "Minu ema töötab kohvikus.": msg`My mother works in a café.`,
  "Minu isa on tööl.": msg`My father is at work.`,
  "Minu vend õpib Tartus.": msg`My brother studies in Tartu.`,
  "Minu õde elab Pärnus.": msg`My sister lives in Pärnu.`,
  "Minu vanaema on kodus.": msg`My grandmother is at home.`,
  "Minu vanaisa elab Tallinnas.": msg`My grandfather lives in Tallinn.`,
};

const WITH_MEANS = (sentence: string) => SENTENCE_MEANS[sentence] as MessageDescriptor;

const TRANSLATED_MEANS: readonly MessageDescriptor[] = [
  msg`My mother lives in Tartu.`,
  msg`I have one sister and two brothers.`,
  msg`My first name is Mari.`,
  msg`My grandfather is at home.`,
  msg`My husband is at work.`,
  msg`I live in Tartu and my brother lives in Pärnu.`,
];

const FIX_MEANS: Record<string, MessageDescriptor> = {
  "Mul on kaks vend.": msg`I have two brothers.`,
  "Minu eesnimi olen Mari.": msg`My first name is Mari.`,
  "Minu ema elab Tartu.": msg`My mother lives in Tartu.`,
  "Mul on kolm laps.": msg`I have three children.`,
  "Mina vanus on kakskümmend viis.": msg`I’m twenty-five.`,
  "Minu vanaisa on kodu.": msg`My grandfather is at home.`,
};

type Family = (typeof PERE_FAMILY)[number]["word"];
type Field = (typeof PERE_FIELDS)[number]["word"];

const MATCH_FAMILY: readonly Family[] = ["ema", "isa", "vend", "õde", "vanaema", "abikaasa"];

const HEARD_WORDS: readonly Family[] = [
  "ema",
  "isa",
  "vend",
  "õde",
  "vanaema",
  "vanaisa",
  "laps",
  "abikaasa",
];

const overlaps = (a: string, b: string) => a.includes(b) || b.includes(a);

export function threeFamily(answer: Family): Family[] {
  const rest = HEARD_WORDS.filter((word) => word !== answer && !overlaps(word, answer));
  const picked: Family[] = [];
  for (const word of shuffle(rest)) {
    if (picked.length < 2 && !picked.some((each) => overlaps(each, word))) picked.push(word);
  }
  return shuffle([answer, ...picked]);
}

const familyOptions = (options: readonly Family[], i18n: I18n) =>
  options.map((option) => ({
    id: option,
    label: <span lang="et">{option}</span>,
    sub: <span lang={i18n.locale}>{i18n._(FAMILY_MEANS[option])}</span>,
  }));

type HeardItem = ChoiceItem & { pair: readonly [string, string] };

function Line({ sentence, reply }: { sentence: string; reply?: boolean }) {
  const { i18n } = useLingui();
  const clip = src(sentence);
  const playing = usePlaying(clip);
  return (
    <button
      type="button"
      onClick={() => void playSound(clip)}
      className={clsx(
        "grid w-full cursor-pointer items-center gap-x-3.5 py-2.5 pe-3 text-start transition-colors duration-150 hoverable:hover:bg-plate-hover",
        reply ? "grid-cols-[auto_minmax(0,1fr)_auto] ps-5" : "grid-cols-[minmax(0,1fr)_auto] ps-4",
      )}
    >
      {reply && (
        <CornerDownRight aria-hidden="true" className="size-4 text-ink-faint rtl:-scale-x-100" />
      )}
      <span
        lang="et"
        className={clsx(
          "min-w-0 tracking-tight max-sm:text-lg",
          reply ? "text-lg" : "text-xl font-medium",
        )}
      >
        {sentence}
        <span
          lang={i18n.locale}
          className="block text-sm font-normal tracking-normal text-ink-muted"
        >
          {i18n._(WITH_MEANS(sentence))}
        </span>
      </span>
      <PlayMark playing={playing} />
    </button>
  );
}

function Exchanges({ items }: { items: readonly { q: string; a: readonly string[] }[] }) {
  return (
    <ul className="m-0 list-none overflow-hidden rounded-lg bg-plate p-0 ring-1 ring-edge">
      {items.map((item) => (
        <li key={item.q} className="border-b border-edge pb-1 last:border-b-0">
          <Line sentence={item.q} />
          {item.a.map((answer) => (
            <Line key={answer} sentence={answer} reply />
          ))}
        </li>
      ))}
    </ul>
  );
}

const FAMILY_KEYS = PERE_FAMILY.map(({ word, said }) => ({ word, said }));

export function PereJaAnkeetLesson() {
  const { t, i18n } = useLingui();
  const plural = lessonBySlug("mitmus")?.n;
  const mulOn = lessonBySlug("mul-on")?.n;
  const partitive = lessonBySlug("osastav")?.n;
  const digits = lessonBySlug("numbrid")?.n;
  const places = lessonBySlug("kohad")?.n;

  const familyKeys: KeyItem[] = FAMILY_KEYS.map(({ word, said }) => ({
    label: word,
    sub: <span lang={i18n.locale}>{i18n._(FAMILY_MEANS[word as Family])}</span>,
    src: src(word),
    detail: {
      title: <span lang="et">{said}</span>,
      tip: i18n._(WITH_MEANS(said)),
    },
  }));

  const fieldRows: RowItem[] = PERE_FIELDS.map(({ word, said }) => ({
    main: said,
    sub: `${i18n._(FIELD_MEANS[word as Field])}: ${i18n._(WITH_MEANS(said))}`,
    src: src(said),
  }));

  const matchPairs: MatchPair[] = MATCH_FAMILY.map((word) => ({
    id: word,
    left: word,
    right: i18n._(FAMILY_MEANS[word]),
    src: src(word),
  }));

  const heardRun = (items: readonly HeardItem[], pinned?: HeardItem): HeardItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned
        ? item
        : { ...item, options: familyOptions(threeFamily(item.answer as Family), i18n) },
    );

  const heardItems = useMemo<HeardItem[]>(
    () =>
      PERE_HEARD.map(({ word, said }, i) => ({
        src: src(said),
        answer: word,
        pair: [word, word] as const,
        options: familyOptions(
          [
            ["ema", "laps", "vend"],
            ["isa", "abikaasa", "õde"],
            ["vanaisa", "vend", "vanaema"],
            ["laps", "õde", "ema"],
            ["isa", "vanaema", "abikaasa"],
            ["vanaisa", "ema", "laps"],
          ][i] as Family[],
          i18n,
        ),
        explain: (
          <>
            <span lang="et" className="font-medium text-ink">
              {said}
            </span>{" "}
            {i18n._(HEARD_MEANS[said] as MessageDescriptor)}
          </>
        ),
      })),
    [i18n],
  );

  const countItems = useMemo<(FormItem & { pair: readonly [string, string] })[]>(
    () =>
      PERE_COUNTED.map(({ base, number, form, said }) => ({
        base,
        gloss: i18n._(FAMILY_MEANS[base]),
        cue: `${number} …`,
        cueLang: "et",
        answers: [form],
        src: src(said),
        explain: <span lang="et">{said}</span>,
        pair: [number, base] as const,
      })),
    [i18n],
  );

  const bins: SortBin[] = [
    {
      id: "nimi",
      label: "Nimi",
      hint: t`name`,
      rule: (
        <Trans>
          <span lang="et">Eesnimi</span> and <span lang="et">perekonnanimi</span> are names.
        </Trans>
      ),
    },
    {
      id: "koht",
      label: "Koht",
      hint: t`place`,
      rule: (
        <Trans>
          <span lang="et">Linn</span>, <span lang="et">riik</span> and{" "}
          <span lang="et">aadress</span> say where.
        </Trans>
      ),
    },
    {
      id: "arv",
      label: "Arv",
      hint: t`number`,
      rule: (
        <Trans>
          <span lang="et">Vanus</span> and <span lang="et">telefoninumber</span> are numbers.
        </Trans>
      ),
    },
  ];
  const sorted: SortItem[] = PERE_SORTED.map(({ w, bin }) => ({
    w,
    bin,
    src: src(w),
    ...(w.includes("aadress")
      ? {
          why: (
            <Trans>
              <span lang="et">Aadress</span> is a place, though it has a number in it.
            </Trans>
          ),
        }
      : {}),
  }));

  const gaps = [
    { id: "eesnimi", before: "Tere! Minu", after: "on Jaan.", answer: "eesnimi" },
    { id: "perekonnanimi", before: "Minu", after: "on Tamm.", answer: "perekonnanimi" },
    { id: "vanus", before: "Minu", after: "on kolmkümmend neli.", answer: "vanus" },
    { id: "riik", before: "Minu", after: "on Eesti.", answer: "riik" },
    {
      id: "telefoninumber",
      before: "Minu",
      after: "on viis, kaks, kolm, neli, viis, kuus, seitse.",
      answer: "telefoninumber",
    },
    { id: "sunnipaev", before: "Minu", after: "on homme.", answer: "sünnipäev" },
  ];

  const writtenItems = useMemo<(SentenceItem & { pair: readonly [string, string] })[]>(
    () =>
      PERE_WRITTEN.map(({ kind, said }) => ({
        kind: "dictation" as const,
        id: `write-${clipId(said)}`,
        src: src(said),
        answers: [said],
        pair: [kind, said] as const,
      })),
    [],
  );

  const translatedItems = useMemo<(SentenceItem & { pair: readonly [string, string] })[]>(
    () =>
      PERE_TRANSLATED.map(({ kind, answers }, i) => ({
        kind: "translate" as const,
        id: `translate-${clipId(answers[0])}`,
        prompt: i18n._(TRANSLATED_MEANS[i] as MessageDescriptor),
        src: src(answers[0]),
        answers: [...answers],
        pair: [kind, answers[0]] as const,
      })),
    [i18n],
  );

  const fixItems = useMemo<(FixItem & { pair: readonly [string, string] })[]>(
    () =>
      PERE_FIXES.map(({ kind, wrong, said }) => ({
        kind: "fix" as const,
        id: `fix-${clipId(wrong)}`,
        wrong,
        prompt: i18n._(FIX_MEANS[wrong] as MessageDescriptor),
        answers: [said],
        src: src(said),
        pair: [kind, wrong] as const,
      })),
    [i18n],
  );

  const reading: PassageQuestion[] = [
    {
      id: "town",
      ask: t`Where does Liis live?`,
      options: [
        { id: "tallinn", label: t`In Tallinn` },
        { id: "tartu", label: t`In Tartu` },
        { id: "parnu", label: t`In Pärnu` },
      ],
      answer: "tartu",
      line: 2,
    },
    {
      id: "surname",
      kind: "short",
      ask: t`What is Liis’s surname? Type it.`,
      answers: ["Mägi"],
      line: 0,
    },
    { id: "sisters", kind: "truefalse", ask: t`Liis has two sisters.`, answer: false, line: 4 },
    {
      id: "mati",
      ask: t`Where does Mati work?`,
      options: [
        { id: "cafe", label: t`Café` },
        { id: "school", label: t`School` },
        { id: "market", label: t`Market` },
      ],
      answer: "school",
      line: 5,
    },
    {
      id: "age",
      kind: "short",
      ask: t`How old is Liis? Type the number in words.`,
      answers: ["kakskümmend kuus"],
      line: 1,
    },
    {
      id: "birthday",
      ask: t`When is Liis’s birthday?`,
      options: [
        { id: "today", label: t`Today` },
        { id: "monday", label: t`On Monday` },
        { id: "tomorrow", label: t`Tomorrow` },
      ],
      answer: "tomorrow",
      line: 7,
    },
  ];

  const desk: PassageQuestion[] = [
    {
      id: "surname",
      kind: "short",
      ask: t`What is Andres’s surname? Type it.`,
      answers: ["Kask"],
      line: 4,
    },
    {
      id: "age",
      ask: t`How old is Andres?`,
      options: [
        { id: "thirteen", label: t`Thirteen` },
        { id: "thirty", label: t`Thirty` },
        { id: "twenty", label: t`Twenty` },
      ],
      answer: "thirty",
      line: 6,
    },
    {
      id: "town",
      ask: t`Where does Andres live?`,
      options: [
        { id: "tartu", label: t`In Tartu` },
        { id: "parnu", label: t`In Pärnu` },
        { id: "tallinn", label: t`In Tallinn` },
      ],
      answer: "parnu",
      line: 8,
    },
    {
      id: "street",
      ask: t`What number does he give with his street?`,
      options: [
        { id: "five", label: t`Five` },
        { id: "two", label: t`Two` },
        { id: "four", label: t`Four` },
      ],
      answer: "four",
      line: 9,
    },
    {
      id: "phone",
      kind: "truefalse",
      ask: t`Andres gives his phone number.`,
      answer: true,
      line: 11,
    },
    {
      id: "brothers",
      ask: t`How many brothers does he have?`,
      options: [
        { id: "two", label: t`Two` },
        { id: "one", label: t`One` },
        { id: "three", label: t`Three` },
      ],
      answer: "two",
      line: 13,
    },
    {
      id: "sisters",
      kind: "truefalse",
      ask: t`Andres has two sisters.`,
      answer: false,
      line: 13,
    },
  ];

  const said = (clip: keyof typeof PERE_DIALOGUE) => {
    const line = PERE_DIALOGUE[clip];
    return typeof line === "string" ? line : line.text;
  };

  const talk: DialogueTurn[] = [
    { who: "them", clip: "d-clerk-1", line: said("d-clerk-1") },
    {
      who: "you",
      clip: "d-you-1",
      replies: [
        {
          line: "Minu perekonnanimi on Mägi.",
          why: t`That gives a surname. The clerk asked for your first name.`,
        },
        { line: said("d-you-1"), right: true },
        {
          line: "Minu perekonnanimi on Liis.",
          why: t`That gives a surname. The clerk asked for your first name.`,
        },
      ],
    },
    { who: "them", clip: "d-clerk-2", line: said("d-clerk-2") },
    {
      who: "you",
      clip: "d-you-2",
      replies: [
        { line: said("d-you-2"), right: true },
        {
          line: "Minu eesnimi on Liis.",
          why: t`That gives a first name. The clerk asked for your surname.`,
        },
        {
          line: "Minu eesnimi on Mägi.",
          why: t`That gives a first name. The clerk asked for your surname.`,
        },
      ],
    },
    { who: "them", clip: "d-clerk-3", line: said("d-clerk-3") },
    {
      who: "you",
      clip: "d-you-3",
      replies: [
        { line: "Ma elan Pärnus.", why: t`Liis lives in Tartu, not in Pärnu.` },
        {
          line: "Minu vanus on kakskümmend kuus.",
          why: t`That is your age. The clerk asked where.`,
        },
        { line: said("d-you-3"), right: true },
      ],
    },
    { who: "them", clip: "d-clerk-4", line: said("d-clerk-4") },
    {
      who: "you",
      clip: "d-you-4",
      replies: [
        { line: "Ma ei ela Tartus.", why: t`That says where you don’t live.` },
        { line: said("d-you-4"), right: true },
        { line: "Mul on kaks venda.", why: t`That says how many brothers you have.` },
      ],
    },
  ];

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          The words for your family, how to say how many brothers, sisters and children you have,
          and the words on a form: name, address, phone number, age.
        </Trans>
      }
      facts={[
        <Trans key="m">25 minutes</Trans>,
        <Trans key="q">11 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "ema",
        "isa",
        "vend",
        "õde",
        "laps",
        "lapsed",
        "abikaasa",
        "vanaema",
        "vanaisa",
        "pere",
        "eesnimi",
        "perekonnanimi",
        "aadress",
        "telefoninumber",
        "vanus",
        "sünnipäev",
        "riik",
        "linn",
        "elukoht",
      ]}
      recap={[
        <Trans key="1">
          Say who someone is with <b lang="et">minu</b> and the family word:{" "}
          <b lang="et">See on minu ema</b>, this is my mother. <b lang="et">Abikaasa</b> is a
          husband or a wife.
        </Trans>,
        <Trans key="2">
          <b lang="et">Mul on</b> means I have. After a number from two up, a family word usually
          changes: <b lang="et">kaks venda</b>, <b lang="et">kolm last</b>. A few stay as they are:{" "}
          <b lang="et">kaks õde</b>.
        </Trans>,
        <Trans key="3">
          A form asks with one word for each thing: <b lang="et">eesnimi</b>,{" "}
          <b lang="et">perekonnanimi</b>, <b lang="et">aadress</b>, <b lang="et">vanus</b>. Answer
          with <b lang="et">Minu … on …</b>.
        </Trans>,
        <Trans key="4">
          Say a phone number one digit at a time and an age as one number:{" "}
          <b lang="et">kakskümmend kolm</b>.
        </Trans>,
        <Trans key="5">
          Say where you live with a place that usually takes{" "}
          <b lang="et" className="whitespace-nowrap">
            -s
          </b>
          : <b lang="et">Ma elan Tartus</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "family",
          title: t`Family words`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Pere" /> is family. Each person has a word of their own:{" "}
                    <Word w="ema" />, mother; <Word w="isa" />, father; <Word w="vend" />, brother;{" "}
                    <Word w="õde" />, sister. Estonian puts <Word w="minu" />, my, in front:{" "}
                    <Word w="See on minu ema." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    More than one <Word w="laps" />, child, is <Word w="lapsed" />. Lesson {plural}{" "}
                    teaches the plural. Tap a word to hear it in a sentence.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`Family words`}
                  items={familyKeys}
                  columns={5}
                  phoneColumns={2}
                  empty={{
                    title: t`Tap a word`,
                    tip: t`You’ll hear it in a sentence.`,
                  }}
                />
              </Panel>
              <Aside>
                <Trans>
                  <Word w="Abikaasa" /> is one word for a husband or a wife. In <Word w="vanaema" />{" "}
                  and <Word w="vanaisa" /> you can hear <b lang="et">vana</b>, old, and{" "}
                  <b lang="et">ema</b> and <b lang="et">isa</b>.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "family-match",
          title: t`Who is it?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Match each family word with its meaning. A right pair plays.</Trans>
                </p>
              </Prose>
              <Match id="family-words" title={<Trans>Match the family</Trans>} pairs={matchPairs} />
            </>
          ),
        },
        {
          id: "hear-family",
          title: t`Hearing the family`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence and pick the family word in it. Each round offers three.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="hear-person"
                title={<Trans>Who is it?</Trans>}
                items={heardItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six family words picked.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the family words above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.answer, src: src(item.answer) })}
                order={heardRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "have",
          title: t`Saying how many you have`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To say how many brothers, sisters or children you have, start with{" "}
                    <Word w="Mul on" />, I have. Learn it as a phrase for now; lesson {mulOn} shows
                    how it works.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    After a number from two up, the family word usually changes:{" "}
                    <b lang="et">vend</b> becomes <Word w="venda" /> and <b lang="et">laps</b>{" "}
                    becomes <Word w="last" />. A few words stay as they are, such as{" "}
                    <b lang="et">õde</b>: <b lang="et">kaks õde</b>.
                  </Trans>
                </p>
              </Prose>
              <Exchanges items={PERE_HAVE.map(({ q, a }) => ({ q, a: [...a] }))} />
              <Aside>
                <Trans>
                  Lesson {partitive} explains why the word changes after a number. For now, learn
                  each family word with its number form: <b lang="et">vend, kaks venda</b>;{" "}
                  <b lang="et">laps, kaks last</b>.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "count",
          title: t`After a number`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round gives a family word and a number. Type the word as it follows the
                    number. Some words stay the same.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="after-number"
                title={<Trans>Type the word after the number</Trans>}
                items={countItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, each after its number.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Nearly. <span lang="et">Vend</span> and <span lang="et">laps</span> usually
                      change after a number; <span lang="et">õde</span> stays.
                    </Trans>
                  ) : (
                    <Trans>Read the three examples above once more, then try again.</Trans>
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
          id: "form",
          title: t`The words on a form`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A registration form, <Word w="ankeet" />, asks for the same few things in the
                    same words. <Word w="Eesnimi" /> is your first name and{" "}
                    <Word w="perekonnanimi" /> your surname; in the second you can hear{" "}
                    <Word w="pere" />, family.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Put <b lang="et">Minu</b> in front and <b lang="et">on</b> after it, and each
                    word becomes a sentence you can say: <Word w="Minu eesnimi on Mari." /> Tap a
                    line below to hear each one. Read a phone number one digit at a time, with the
                    numbers from lesson {digits}, and say an age as one number.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={fieldRows} />
              <Aside>
                <Trans>
                  <Word w="Elukoht" /> is the place where you live, and a town answers it. In a
                  sentence, the place usually takes{" "}
                  <b lang="et" className="whitespace-nowrap">
                    -s
                  </b>
                  , as lesson {places} shows: <b lang="et">Ma elan Tartus</b>.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "form-sort",
          title: t`What does the line fill in?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each line answers one part of a form. Hear it and put it under name, place or
                    number. An address counts as a place, even with a number in it.
                  </Trans>
                </p>
              </Prose>
              <Sort
                id="sort-form"
                title={<Trans>Name, place or number?</Trans>}
                bins={bins}
                items={sorted}
              />
            </>
          ),
        },
        {
          id: "read",
          title: t`Liis fills in a form`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Liis tells a language school about herself. Read it and answer the questions.
                    Once you’ve answered, tap a word to see what it means.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="liis-form"
                title={<Trans>What does Liis write?</Trans>}
                by={t`Liis writes`}
                clip="p-liis"
                sentences={PERE_READING}
                questions={reading}
              />
            </>
          ),
        },
        {
          id: "fill",
          title: t`Fill in the form`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Jaan’s form is written out as sentences, with six gaps. Drag each word into the
                    gap it names. Two of the words fit nowhere.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="jaan-form"
                title={<Trans>Fill the gaps</Trans>}
                gaps={gaps}
                mode="drag"
                spare={["aadress", "linn"]}
                clip="p-form"
              />
            </>
          ),
        },
        {
          id: "desk",
          title: t`Listening: signing up`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Andres signs up at a language school. The clerk asks for his details one at a
                    time. Listen for each answer.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="school-desk"
                title={<Trans>Listen: signing up</Trans>}
                clip="d-desk"
                turns={PERE_TALK.turns}
                names={{ second: t`Clerk`, main: t`Andres` }}
                questions={desk}
              />
            </>
          ),
        },
        {
          id: "write-heard",
          title: t`Write what you hear`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Six short lines about a family and a form. Write each one as you hear it,
                    numbers in words.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-heard"
                title={<Trans>Write the sentence</Trans>}
                items={writtenItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Nearly. Hear the ones you missed below, then try again with Slower.
                    </Trans>
                  ) : (
                    <Trans>Play the lines below once more, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                order={eachPairFirst}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "translate",
          title: t`Write it in Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write each sentence in Estonian. A family word usually takes the same form as in{" "}
                    <b lang="et">kaks venda</b> after a number from two up, and a place usually
                    takes{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>{" "}
                    to say where.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="translate-family"
                title={<Trans>Write it in Estonian</Trans>}
                items={translatedItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, every sentence right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Nearly. In the ones you missed, check <span lang="et">minu</span> and the
                      ending of the place.
                    </Trans>
                  ) : (
                    <Trans>Read the family sentences above once more, then try again.</Trans>
                  )
                }
                recall={sentenceRecall}
                order={eachPairFirst}
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
                    In each sentence one word is wrong: a family word after a number,{" "}
                    <span lang="et">mina</span> for <span lang="et">minu</span>, or a place without
                    its ending. Tap the wrong word, then type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-family"
                title={<Trans>Fix the sentence</Trans>}
                items={fixItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, each found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Nearly. Check the word after the number and the ending of the place.
                    </Trans>
                  ) : (
                    <Trans>Read the examples with a number above once more, then try again.</Trans>
                  )
                }
                recall={fixRecall}
                order={eachPairFirst}
                round={(props) => <FixRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "talk",
          title: t`At the desk`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Now you sign up. The clerk asks and you answer in Estonian. If you pick a wrong
                    reply, you see why, then hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="at-the-desk"
                title={<Trans>Talk: signing up</Trans>}
                part={
                  <Trans>
                    You are Liis Mägi. You live in Tartu and you have one sister. The clerk speaks
                    first; pick what you say back.
                  </Trans>
                }
                them={t`Clerk`}
                turns={talk}
              />
            </>
          ),
        },
        {
          id: "write",
          title: t`Write about yourself`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write a few sentences for a form, then compare them with a model and tick what
                    yours does. Nothing is marked for you here.
                  </Trans>
                </p>
              </Prose>
              <Writing
                id="write-about-you"
                title={<Trans>Fill in your details</Trans>}
                prompt={
                  <Trans>
                    Four or five sentences: your first name and surname, where you live, your age
                    and your family.
                  </Trans>
                }
                model={PERE_WRITING}
                src={clipUrl(SLUG, "p-writing")}
                checks={[
                  {
                    id: "names",
                    label: (
                      <Trans>
                        Gives a first name and a surname with <span lang="et">eesnimi</span> and{" "}
                        <span lang="et">perekonnanimi</span>.
                      </Trans>
                    ),
                  },
                  {
                    id: "where",
                    label: (
                      <Trans>
                        Says where you live, with <span lang="et">-s</span> on the place.
                      </Trans>
                    ),
                  },
                  {
                    id: "age",
                    label: (
                      <Trans>
                        Gives an age with <span lang="et">vanus</span>.
                      </Trans>
                    ),
                  },
                  {
                    id: "family",
                    label: (
                      <Trans>
                        Says who is in your family, with <span lang="et">mul on</span>.
                      </Trans>
                    ),
                  },
                ]}
              />
            </>
          ),
        },
      ]}
    />
  );
}
