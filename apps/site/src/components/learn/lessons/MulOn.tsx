import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMemo, useState } from "react";
import { LESSONS, lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  MUL_ON_AM_HAVE,
  MUL_ON_DIALOGUE,
  MUL_ON_HEARD,
  MUL_ON_LINES,
  MUL_ON_NAMES,
  MUL_ON_OWNERS,
  MUL_ON_SWITCH,
  type MulOnOwner,
} from "../../../lib/learn/clips";
import { playSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Chips, ListenRows, Panel } from "../Explore";
import { type GapItem, GapPassage } from "../GapPassage";
import { Aside, LessonView, Prose } from "../LessonView";
import type { Glossary } from "../lesson-context";
import { Morph, type MorphChain } from "../Morph";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { Playing } from "../Sound";
import { Word } from "../Word";

const SLUG = "mul-on";
type LineId = keyof typeof MUL_ON_LINES;
type DialogueId = keyof typeof MUL_ON_DIALOGUE;
/** A clip by what it says. */
const src = (text: string) => clipUrl(SLUG, clipId(text));
const lineSrc = (id: LineId) => clipUrl(SLUG, id);

/** What each sentence means, by what it says. */
const MEANS: Record<string, MessageDescriptor> = {
  "Mul on kass.": msg`I have a cat.`,
  "Sul on auto.": msg`You have a car.`,
  "Tal on koer.": msg`He or she has a dog.`,
  "Meil on maja.": msg`We have a house.`,
  "Kas teil on küsimus?": msg`Do you have a question? To more than one, or polite.`,
  "Neil on laps.": msg`They have a child.`,
  "Mul on küsimus.": msg`I have a question.`,
  "Kas sul on raamat?": msg`Do you have a book?`,
  "Tal on hea õpetaja.": msg`He or she has a good teacher.`,
  "Meil on kodu Tartus.": msg`We have a home in Tartu.`,
  "Kas teil on auto?": msg`Do you have a car? To more than one, or polite.`,
  "Neil on maja Pärnus.": msg`They have a house in Pärnu.`,
  "Ma olen kass.": msg`I am a cat.`,
  "Sa oled õpetaja.": msg`You are a teacher.`,
  "Sul on õpetaja.": msg`You have a teacher.`,
  "Ta on hea sõber.": msg`He or she is a good friend.`,
  "Tal on hea sõber.": msg`He or she has a good friend.`,
  "Te olete hea õpetaja.": msg`You’re a good teacher. Polite, to one person.`,
  "Teil on hea õpetaja.": msg`You have a good teacher. To more than one, or polite.`,
  "Ta on hea õpetaja.": msg`He or she is a good teacher.`,
  "Ma olen õpetaja.": msg`I’m a teacher.`,
  "Mul on õpetaja.": msg`I have a teacher.`,
  "Sa oled hea sõber.": msg`You’re a good friend.`,
  "Sul on hea sõber.": msg`You have a good friend.`,
  "Ta on laps.": msg`He or she is a child.`,
  "Tal on laps.": msg`He or she has a child.`,
  "Maril on kass.": msg`Mari has a cat.`,
  "Jaanil on auto.": msg`Jaan has a car.`,
  "Emal on küsimus.": msg`Mum has a question.`,
  "Isal on koer.": msg`Dad has a dog.`,
  "Minu sõbral on maja.": msg`My friend has a house.`,
  "Õpetajal on raamat.": msg`The teacher has a book.`,
};

/** What each question and answer means, by its clip id. */
const LINE_MEANS: Record<LineId, MessageDescriptor> = {
  "q-kellel-auto": msg`Who has a car?`,
  "a-jaanil": msg`Jaan does.`,
  "q-kellel-kusimus": msg`Who has a question?`,
  "a-minul": msg`I do.`,
  "q-sul-auto": msg`Do you have a car?`,
  "a-jah-on": msg`Yes, I do.`,
  "a-ei-ole": msg`No, I don’t.`,
  "a-pole": msg`No, I don’t.`,
  "q-sul-aega": msg`Do you have time?`,
  "a-pole-aega": msg`I don’t have time.`,
  "v-raha": msg`I need money.`,
  "v-abi": msg`I need help.`,
  "v-sul-abi": msg`Do you need help?`,
};

/** Who each -l form names, under its option in the quiz. */
const OWNER_MEANS: Record<MulOnOwner, MessageDescriptor> = {
  mul: msg`I`,
  sul: msg`you`,
  tal: msg`he or she`,
  meil: msg`we`,
  teil: msg`you, to more than one; polite`,
  neil: msg`they`,
};

/** The long forms' notes in the table. */
const LONG_NOTES: Record<string, MessageDescriptor> = {
  minul: msg`The long form of mul.`,
  sinul: msg`The long form of sul.`,
  temal: msg`The long form of tal.`,
  nendel: msg`The long form of neil.`,
};

/** Each name and noun, and its -l form, as the steps of its change. */
const NAME_MEANS: Record<string, MessageDescriptor> = {
  Mari: msg`a woman’s name`,
  Maril: msg`at Mari`,
  Jaan: msg`a man’s name`,
  Jaanil: msg`at Jaan`,
  ema: msg`mum`,
  emal: msg`at Mum`,
  isa: msg`dad`,
  isal: msg`at Dad`,
  sõber: msg`friend`,
  sõbral: msg`at a friend`,
  õpetaja: msg`teacher`,
  õpetajal: msg`at the teacher`,
};

const OWNERS = MUL_ON_OWNERS.map(({ owner }) => owner);

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    Object.entries(MEANS).map(([said, en]) => [said.toLowerCase(), { en, show: said }]),
  ),
  ...Object.fromEntries(
    (Object.keys(MUL_ON_LINES) as LineId[]).map((id) => [
      MUL_ON_LINES[id].toLowerCase(),
      { en: LINE_MEANS[id], show: MUL_ON_LINES[id], clip: id },
    ]),
  ),
  "jah, on.": {
    en: msg`Yes, I do.`,
    note: msg`Word for word: “yes, is”.`,
    show: "Jah, on.",
    clip: "a-jah-on",
  },
  mul: { en: msg`at me`, note: msg`Mul on: I have.` },
  sul: { en: msg`at you, to one person`, note: msg`Sul on: you have.` },
  tal: { en: msg`at him or her`, note: msg`Tal on: he or she has.` },
  meil: { en: msg`at us`, note: msg`Meil on: we have.` },
  teil: { en: msg`at you, to more than one; polite`, note: msg`Teil on: you have.` },
  neil: { en: msg`at them`, note: msg`Neil on: they have.` },
  minul: { en: msg`at me, for emphasis`, note: msg`The long form of mul.` },
  sinul: { en: msg`at you, for emphasis`, note: msg`The long form of sul.` },
  temal: { en: msg`at him or her, for emphasis`, note: msg`The long form of tal.` },
  nendel: { en: msg`at them, for emphasis`, note: msg`The long form of neil.` },
  maril: { en: msg`at Mari`, note: msg`Maril on: Mari has.`, show: "Maril" },
  jaanil: { en: msg`at Jaan`, note: msg`Jaanil on: Jaan has.`, show: "Jaanil" },
  emal: { en: msg`at Mum`, note: msg`Emal on: Mum has.` },
  isal: { en: msg`at Dad`, note: msg`Isal on: Dad has.` },
  sõbral: { en: msg`at a friend`, note: msg`Sõbral on: a friend has.` },
  õpetajal: { en: msg`at the teacher`, note: msg`Õpetajal on: the teacher has.` },
  kellel: { en: msg`who has; at whom`, note: msg`The -⁠l form of kes, who.` },
  kes: { en: msg`who`, clip: false },
  vaja: { en: msg`needed`, note: msg`Mul on vaja: I need.` },
  koer: { en: msg`dog` },
  küsimus: { en: msg`question` },
  raha: { en: msg`money` },
  abi: { en: msg`help` },
  kass: { en: msg`cat`, clip: false },
  auto: { en: msg`car`, clip: false },
  maja: { en: msg`house`, clip: false },
  ma: { en: msg`I`, clip: false },
  kas: { en: msg`makes a yes-or-no question`, clip: false },
  laual: { en: msg`on the table`, clip: false },
  jaan: { en: msg`a man’s name`, show: "Jaan", clip: false },
  jaani: { en: msg`Jaan’s`, note: msg`The genitive of Jaan.`, show: "Jaani", clip: false },
  aeg: { en: msg`time`, clip: false },
  aega: {
    en: msg`time`,
    note: msg`In Kas sul on aega? and Mul pole aega, time takes this form.`,
    clip: false,
  },
  "hästi, aitäh. aga sul?": {
    en: msg`Fine, thanks. And you?`,
    note: msg`Word for word: “well, thanks. But at you?”`,
    show: "Hästi, aitäh. Aga sul?",
  },
};

/** A stretch of a line, lit in the stage’s hue when it is what changed. */
type Piece = readonly [text: string, lit: boolean];

/** The owner and the verb lit: “Mul on” in “Mul on kass.” */
function litStart(said: string): Piece[] {
  const words = said.split(" ");
  return [
    [words.slice(0, 2).join(" "), true],
    [` ${words.slice(2).join(" ")}`, false],
  ];
}

/** One line to tap. Its lit pieces swap in when the switch flips. */
function FlipLine({ said, mode }: { said: string; mode: string }) {
  const { i18n } = useLingui();
  const clip = src(said);
  const playing = usePlaying(clip);
  return (
    <button
      type="button"
      data-playing={playing ? "" : undefined}
      onClick={() => void playSound(clip)}
      className="learn-key flex min-h-13 cursor-pointer items-center justify-between gap-3 rounded-tile bg-plate py-2 ps-4 pe-3 text-start hoverable:hover:bg-plate-hover"
    >
      <span key={mode} className="learn-swap grid min-w-0">
        <span lang="et" className="text-xl font-medium tracking-tight max-sm:text-lg">
          {litStart(said).map(([text, lit], i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a line’s pieces never reorder
            <span key={i} className={lit ? "text-(--form)" : undefined}>
              {text}
            </span>
          ))}
        </span>
        <span className="text-sm text-ink-muted">{i18n._(MEANS[said] as MessageDescriptor)}</span>
      </span>
      <span className="grid size-5 shrink-0 place-items-center text-(--form)">
        {playing && <Playing className="h-3" />}
      </span>
    </button>
  );
}

/** Four sentences, switched together between I am and I have. */
function AmHaveSwitch() {
  const { t } = useLingui();
  const [have, setHave] = useState(false);
  const mode = have ? "have" : "am";
  return (
    <Panel>
      <Chips
        label={t`I am or I have`}
        items={[
          { label: t({ message: "I am", context: "being or having" }), value: "am" },
          { label: t({ message: "I have", context: "being or having" }), value: "have" },
        ]}
        value={mode}
        onPick={(value) => setHave(value === "have")}
      />
      <div className="grid gap-1.5 sm:grid-cols-2">
        {MUL_ON_SWITCH.map((pair) => (
          <FlipLine key={pair.am} said={have ? pair.have : pair.am} mode={mode} />
        ))}
      </div>
      <p aria-live="polite" className="text-md text-ink-secondary">
        {have
          ? t`Each pronoun took -⁠l, and every verb is on.`
          : t`Switch to I have and watch the start of each line.`}
      </p>
    </Panel>
  );
}

const ownerOptions = (owners: readonly MulOnOwner[], i18n: I18n) =>
  owners.map((owner) => ({
    id: owner,
    label: <span lang="et">{owner}</span>,
    sub: i18n._(OWNER_MEANS[owner]),
  }));

/** The answer and two of the other five forms at random, in random order. */
export function threeOwners(answer: MulOnOwner): MulOnOwner[] {
  const rest = OWNERS.filter((each) => each !== answer);
  return shuffle([answer, ...shuffle(rest).slice(0, 2)]);
}

/** “Who has it?”: each sentence with its first round's options, fixed so the server renders the same. */
export const WHO_HAS = MUL_ON_HEARD.map(({ owner, said }, i) => ({
  owner,
  said,
  options: (
    [
      [owner, OWNERS[(OWNERS.indexOf(owner) + 3) % 6], OWNERS[(OWNERS.indexOf(owner) + 2) % 6]],
      [OWNERS[(OWNERS.indexOf(owner) + 1) % 6], owner, OWNERS[(OWNERS.indexOf(owner) + 4) % 6]],
      [OWNERS[(OWNERS.indexOf(owner) + 5) % 6], OWNERS[(OWNERS.indexOf(owner) + 3) % 6], owner],
    ] as const
  )[i % 3] as readonly MulOnOwner[],
}));

/** “Am or have?”: each sentence of the pairs, keyed on its pair so a run hears one of each. */
export const AM_HAVE = MUL_ON_AM_HAVE.flatMap(({ am, have }, i) => [
  { said: am, kind: "am" as const, am, have, haveFirst: i % 2 === 0 },
  { said: have, kind: "have" as const, am, have, haveFirst: i % 2 === 1 },
]);

type WhoItem = ChoiceItem & { said: string; pair: readonly [string, string] };
type AmHaveItem = ChoiceItem & {
  said: string;
  am: string;
  have: string;
  pair: readonly [string, string];
};

/**
 * Mari's note: a gap at each owner and each verb. In four of them the plain pronoun, name or olen
 * is right, so a learner who always picks the -l form and on scores about half.
 */
function useGaps(): GapItem[] {
  const { t } = useLingui();
  return [
    {
      id: "olen",
      before: "Mina",
      answer: "olen",
      after: "Mari.",
      options: ["on", "olen"],
      why: t`Mina olen Mari: I am Mari. Mina takes olen; on goes with mul.`,
    },
    {
      id: "mul",
      before: "",
      answer: "Mul",
      after: "on kass.",
      options: ["Mul", "Ma"],
      why: t`Mul on kass: I have a cat. Ma would need olen and say I am a cat.`,
    },
    {
      id: "ema",
      before: "Minu",
      answer: "ema",
      after: "on õpetaja.",
      options: ["ema", "emal"],
      why: t`Minu ema on õpetaja: my mum is a teacher. Minu emal on õpetaja would say she has one.`,
    },
    {
      id: "emal",
      before: "",
      answer: "Emal",
      after: "on auto.",
      options: ["Emal", "Ema"],
      why: t`Emal on auto: Mum has a car. Ema on auto would say Mum is a car.`,
    },
    {
      id: "jaan",
      before: "",
      answer: "Jaan",
      after: "on minu sõber.",
      options: ["Jaanil", "Jaan"],
      why: t`Jaan on minu sõber: Jaan is my friend. Jaanil on minu sõber would say Jaan has my friend.`,
    },
    {
      id: "jaanil",
      before: "",
      answer: "Jaanil",
      after: "on koer.",
      options: ["Jaan", "Jaanil"],
      why: t`Jaanil on koer: Jaan has a dog. Jaan on koer would say Jaan is a dog.`,
    },
    {
      id: "me",
      before: "",
      answer: "Me",
      after: "elame Tartus.",
      options: ["Me", "Meil"],
      why: t`Me elame Tartus: we live in Tartu. The -⁠l form goes with on, not with other verbs.`,
    },
    {
      id: "meil-on",
      before: "Meil",
      answer: "on",
      after: "hea kodu.",
      options: ["oleme", "on"],
      why: t`After meil the verb is on, as after every -⁠l form.`,
    },
    {
      id: "sul-on",
      before: "Kas sul",
      answer: "on",
      after: "kass?",
      options: ["on", "oled"],
      why: t`Kas sul on? Do you have? The verb stays on for sul too.`,
    },
  ];
}

/** A sentence and what it means, after a quiz answer. */
const explain = (said: string, i18n: I18n) => (
  <>
    <span lang="et" className="font-medium text-ink">
      {said}
    </span>{" "}
    {i18n._(MEANS[said] as MessageDescriptor)}
  </>
);

/** The two meanings of an am-or-have pair, in the order given. */
function amHaveOptions(am: string, have: string, haveFirst: boolean, i18n: I18n) {
  const options = [
    // The answers are meanings in the reader's language, not Estonian.
    { id: "am", label: <span lang={i18n.locale}>{i18n._(MEANS[am] as MessageDescriptor)}</span> },
    {
      id: "have",
      label: <span lang={i18n.locale}>{i18n._(MEANS[have] as MessageDescriptor)}</span>,
    },
  ];
  return haveFirst ? options.reverse() : options;
}

const line = (id: DialogueId): string => {
  const clip = MUL_ON_DIALOGUE[id];
  return typeof clip === "string" ? clip : clip.text;
};

export function MulOnLesson() {
  const { t, i18n } = useLingui();
  const pronouns = lessonBySlug("mina-sina-tema")?.n;
  const places = lessonBySlug("kohad")?.n;
  const negation = lessonBySlug("eitus")?.n;
  const forms = LESSONS.find((lesson) => lesson.et === "Kolm põhivormi")?.n;
  const genitive = LESSONS.find((lesson) => lesson.et === "Minu raamat")?.n;
  const partitive = LESSONS.find((lesson) => lesson.et === "Kaks kassi")?.n;
  const gaps = useGaps();

  // The -l form plays in a sentence; the long form plays on its own.
  const ownerRows: ParadigmRow[] = MUL_ON_OWNERS.map(({ pronoun, owner, long, said }) => ({
    id: pronoun,
    label: i18n._(OWNER_MEANS[owner]),
    et: pronoun,
    cells: [
      {
        form: `${owner.slice(0, -1)}|l`,
        src: src(said),
        note: (
          <>
            <span lang="et">{said}</span> {i18n._(MEANS[said] as MessageDescriptor)}
          </>
        ),
      },
      long === owner
        ? null
        : { form: `${long.slice(0, -1)}|l`, src: src(long), note: i18n._(LONG_NOTES[long]) },
    ],
  }));

  // Each name or noun on its way to -l, through its genitive when that differs.
  const nameChains: MorphChain[] = MUL_ON_NAMES.map(({ word, genitive: of, owner, said }) => ({
    id: word,
    steps: [
      { word, label: i18n._(NAME_MEANS[word]), src: src(word) },
      ...(of === word
        ? []
        : [
            {
              word: of,
              label: t`genitive`,
              note: t`The genitive, the form for whose.`,
              src: src(of),
            },
          ]),
      {
        word: owner,
        label: i18n._(NAME_MEANS[owner]),
        src: src(owner),
        note: (
          <>
            <span lang="et">{said}</span> {i18n._(MEANS[said] as MessageDescriptor)}
          </>
        ),
      },
    ],
  }));

  // Every round but the first draws its options afresh, so no set of options names the answer.
  const whoRun = (items: readonly WhoItem[], pinned?: WhoItem): WhoItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned
        ? item
        : { ...item, options: ownerOptions(threeOwners(item.answer as MulOnOwner), i18n) },
    );

  const whoItems = useMemo<WhoItem[]>(
    () =>
      WHO_HAS.map(({ owner, said, options }) => ({
        said,
        src: src(said),
        answer: owner,
        pair: [owner, said] as const,
        options: ownerOptions(options, i18n),
        explain: explain(said, i18n),
      })),
    [i18n],
  );

  // Later rounds put the two meanings in a random order.
  const amHaveRun = (items: readonly AmHaveItem[], pinned?: AmHaveItem): AmHaveItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned
        ? item
        : { ...item, options: amHaveOptions(item.am, item.have, Math.random() < 0.5, i18n) },
    );

  const amHaveItems = useMemo<AmHaveItem[]>(
    () =>
      AM_HAVE.map(({ said, kind, am, have, haveFirst }) => ({
        said,
        am,
        have,
        src: src(said),
        answer: kind,
        pair: [am, said] as const,
        options: amHaveOptions(am, have, haveFirst, i18n),
        explain: explain(said, i18n),
      })),
    [i18n],
  );

  const dialogue: DialogueTurn[] = [
    { who: "them", clip: "d-liis-1", line: line("d-liis-1") },
    {
      who: "you",
      clip: "d-sina-1",
      replies: [
        {
          line: "Jah, olen.",
          why: t`Jah, olen answers Kas sa oled? The answer to Kas sul on? is Jah, on.`,
        },
        { line: line("d-sina-1"), right: true },
        { line: "Jah, mul on kass.", why: t`She asked whether you have time, not what you have.` },
      ],
    },
    { who: "them", clip: "d-liis-2", line: line("d-liis-2") },
    {
      who: "you",
      clip: "d-sina-2",
      replies: [
        {
          line: "Ei ole. Aga Jaan on auto.",
          why: t`Jaan on auto says Jaan is a car. For Jaan has a car, say Jaanil on auto.`,
        },
        {
          line: "Jah, sul on auto.",
          why: t`Sul on auto says that Liis has a car. You don’t have one, so answer Ei ole.`,
        },
        { line: line("d-sina-2"), right: true },
      ],
    },
    { who: "them", clip: "d-liis-3", line: line("d-liis-3") },
    {
      who: "you",
      clip: "d-sina-3",
      replies: [
        { line: line("d-sina-3"), right: true },
        { line: "Ma olen.", why: t`Ma olen says I am. To say you have it, use mul on.` },
        { line: "Sinul.", why: t`Sinul says that Liis has it.` },
      ],
    },
    { who: "them", clip: "d-liis-4", line: line("d-liis-4") },
    {
      who: "you",
      clip: "d-sina-4",
      replies: [
        {
          line: "Jah, ma pole homme aega.",
          why: t`Jah says yes, and ma pole says I am not. For no time, say Ei, mul pole.`,
        },
        { line: line("d-sina-4"), right: true },
        {
          line: "Ei, ma pole homme aega.",
          why: t`Ma pole says I am not. For having, it’s mul pole.`,
        },
      ],
    },
  ];

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          How to say I have in Estonian: <b lang="et">mul on</b>, word for word “at me is”, with the
          owner in the{" "}
          <b lang="et" className="whitespace-nowrap">
            -l
          </b>{" "}
          form and the verb <b lang="et">on</b> whoever has it.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">2 quizzes, a note to fill in and a conversation</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "mul",
        "sul",
        "tal",
        "meil",
        "teil",
        "neil",
        "kellel",
        "vaja",
        "koer",
        "küsimus",
        "raha",
        "abi",
        "mul on kass.",
        "kas sul on auto?",
        "jah, on.",
        "kellel on auto?",
        "mul on vaja abi.",
        "mul pole aega.",
      ]}
      recap={[
        <Trans key="1">
          Estonian says I have as “at me is”: <b lang="et">Mul on kass.</b>
        </Trans>,
        <Trans key="2">
          The owner takes{" "}
          <b lang="et" className="whitespace-nowrap">
            -l
          </b>
          : <b lang="et">mul, sul, tal, meil, teil, neil</b>. A name or noun adds it to its
          genitive: <b lang="et">Maril, Jaanil, emal</b>.
        </Trans>,
        <Trans key="3">
          The verb is <b lang="et">on</b> whoever has the thing, and in a yes sentence one thing you
          can count stays in its first form: <b lang="et">Meil on maja.</b>
        </Trans>,
        <Trans key="4">
          Ask with <b lang="et">kas</b> or <b lang="et">kellel</b>, and answer with{" "}
          <b lang="et">Jah, on</b> or <b lang="et">Ei ole</b>.
        </Trans>,
        <Trans key="5">
          <b lang="et">Mul on vaja</b> is I need: <b lang="et">Mul on vaja abi.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "mul-on",
          title: t`Who has it: the -⁠l form`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Estonian has no everyday verb for have. To say I have a cat, it says{" "}
                    <Word w="Mul on kass." /> Word for word, that’s “at me is a cat”.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Mul" /> is the{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>{" "}
                    form of <Word w="ma" />. That ending says on or at in lesson {places}, as in{" "}
                    <Word w="laual" />. You have met one already:{" "}
                    <Word w="Hästi, aitäh. Aga sul?" /> In it, <Word w="sul" /> is “at you”.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Each pronoun has its{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>{" "}
                    form. Tap one to hear it in a sentence.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Paradigm
                  label={t`Who has it`}
                  columns={[t`-⁠l form`, t`For emphasis`]}
                  rows={ownerRows}
                  empty={{
                    title: t`Tap a form`,
                    tip: t`An -⁠l form plays in a sentence; a long form plays on its own.`,
                  }}
                />
              </Panel>
              <Aside>
                <Trans>
                  To stress who has it, use the long forms: <Word w="minul" />, <Word w="sinul" />,{" "}
                  <Word w="temal" /> and <Word w="nendel" />. They work like the long pronouns
                  lesson {pronouns} teaches, such as <b lang="et">mina</b> for <b lang="et">ma</b>.{" "}
                  <Word w="Meil" /> and <Word w="teil" /> have no long form.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "who-has",
          title: t`Hearing who has it`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence and pick who has the thing. Listen to the first word, or to the
                    word after <Word w="kas" /> in a question. <b lang="et">Mul</b> and{" "}
                    <b lang="et">meil</b>, <b lang="et">sul</b> and <b lang="et">teil</b>,{" "}
                    <b lang="et">tal</b> and <b lang="et">neil</b> differ by a sound or two.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="who-has"
                title={<Trans>Who has it?</Trans>}
                items={whoItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them. You heard who has it in every sentence.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the six forms above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={whoRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "am-or-have",
          title: t`I am or I have`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    I am a cat is <Word w="Ma olen kass." /> I have a cat is{" "}
                    <Word w="Mul on kass." /> In the second, the cat is what “is”, so the verb is{" "}
                    <b lang="et">on</b> whoever has it: <b lang="et">mul on, sul on, meil on</b>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    In a yes sentence, one thing you can count stays in its first form, the one
                    lesson {forms} lists first: <Word w="kass" />, <Word w="auto" />,{" "}
                    <Word w="maja" />. Time is an amount, not one thing, and takes another form:{" "}
                    <Word w="Kas sul on aega?" /> Lesson {partitive} teaches that form.
                  </Trans>
                </p>
              </Prose>
              <AmHaveSwitch />
            </>
          ),
        },
        {
          id: "am-or-have-quiz",
          title: t`Am or have?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence and pick what it means: being something, or having it. Between{" "}
                    <b lang="et">ta on</b> and <b lang="et">tal on</b>, only the{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>{" "}
                    differs.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="am-or-have"
                title={<Trans>Am or have?</Trans>}
                items={amHaveItems}
                rounds={4}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them. You told am from have every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Flip the switch above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={amHaveRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "names",
          title: t`Names and nouns with -⁠l`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A name or a noun takes the same{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>
                    . <Word w="Maril on kass." /> Mari has a cat. <Word w="Emal on küsimus." /> Mum
                    has a question.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>{" "}
                    goes on the genitive, the form lesson {genitive} uses for whose.{" "}
                    <Word w="Jaan" /> becomes <Word w="Jaani" />, so Jaan has a car is{" "}
                    <Word w="Jaanil on auto." /> Pick a word and tap each step.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Morph label={t`Names and nouns`} chains={nameChains} />
              </Panel>
              <Prose>
                <p>
                  <Trans>
                    To ask who has something, use <Word w="kellel" />, the{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>{" "}
                    form of <Word w="kes" />, who. Answer with the owner alone, and for yourself
                    with the long form <Word w="minul" />.
                  </Trans>
                </p>
              </Prose>
              <ListenRows
                items={(["q-kellel-auto", "a-jaanil", "q-kellel-kusimus", "a-minul"] as const).map(
                  (id) => ({
                    main: MUL_ON_LINES[id],
                    sub: i18n._(LINE_MEANS[id]),
                    src: lineSrc(id),
                  }),
                )}
              />
            </>
          ),
        },
        {
          id: "yes-no",
          title: t`Asking and answering`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Put <Word w="kas" /> in front to ask: <Word w="Kas sul on auto?" /> Answer yes
                    with <Word w="Jah, on." /> It’s <b lang="et">on</b>, not <b lang="et">olen</b>,
                    because the car is what “is”.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Answer no with the forms lesson {negation} uses for not: <Word w="Ei ole." /> or{" "}
                    <Word w="Pole." />
                  </Trans>
                </p>
              </Prose>
              <ListenRows
                items={(["q-sul-auto", "a-jah-on", "a-ei-ole", "a-pole"] as const).map((id) => ({
                  main: MUL_ON_LINES[id],
                  sub: i18n._(LINE_MEANS[id]),
                  src: lineSrc(id),
                }))}
              />
              <Aside>
                <Trans>
                  After <b lang="et">pole</b> or <b lang="et">ei ole</b>, a thing changes form too,
                  and lesson {partitive} teaches that form. For now, answer no with{" "}
                  <b lang="et">Ei ole</b> or <b lang="et">Pole</b> alone. Learn one phrase whole:{" "}
                  <Word w="Mul pole aega." /> It means I don’t have time.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "vaja",
          title: t`Saying what you need`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Vaja" /> means needed. I need help is <Word w="Mul on vaja abi." />{" "}
                    Word for word, that’s “at me is needed help”. Ask with <b lang="et">kas</b>, as
                    before.
                  </Trans>
                </p>
              </Prose>
              <ListenRows
                items={(["v-raha", "v-abi", "v-sul-abi"] as const).map((id) => ({
                  main: MUL_ON_LINES[id],
                  sub: i18n._(LINE_MEANS[id]),
                  src: lineSrc(id),
                }))}
              />
            </>
          ),
        },
        {
          id: "maris-note",
          title: t`Mari’s note`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari wrote about who has what. Pick the word for each gap, then hear the whole
                    note.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="maris-note"
                title={<Trans>Fill the gaps</Trans>}
                gaps={gaps}
                mode="pick"
                clip="p-mari"
              />
            </>
          ),
        },
        {
          id: "flatmate",
          title: t`Talk: at home`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Liis shares a flat with you and needs a hand. She speaks first; pick what you
                    say back.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="flatmate"
                title={<Trans>Talk: at home</Trans>}
                part={
                  <Trans>You share a flat with Liis. You don’t have a car, but Jaan does.</Trans>
                }
                them={t`Liis`}
                turns={dialogue}
              />
            </>
          ),
        },
      ]}
    />
  );
}
