import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { type ReactNode, useMemo, useState } from "react";
import { LESSONS, lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  hasCat,
  likesCat,
  MEELDIMA_ASK,
  MEELDIMA_DIALOGUE,
  MEELDIMA_DOING,
  MEELDIMA_FEELINGS,
  MEELDIMA_MORE,
  MEELDIMA_NO,
  MEELDIMA_PERSONS,
  MEELDIMA_WHICH,
  MEELDIMA_WHO,
  type MeeldimaPerson,
} from "../../../lib/learn/clips";
import { playSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Chips, ListenRows, Panel } from "../Explore";
import { type GapItem, GapPassage } from "../GapPassage";
import { Aside, LessonView, Prose } from "../LessonView";
import type { Glossary } from "../lesson-context";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { Sort, type SortBin, type SortItem } from "../Sort";
import { Playing } from "../Sound";
import { Word } from "../Word";

const SLUG = "meeldima";
/** A clip by what it says. */
const src = (text: string) => clipUrl(SLUG, clipId(text));

/** What each sentence means, by what it says. */
const MEANS: Record<string, MessageDescriptor> = {
  "Mul on kass.": msg`I have a cat.`,
  "Sul on kass.": msg`You have a cat.`,
  "Tal on kass.": msg`He or she has a cat.`,
  "Meil on kass.": msg`We have a cat.`,
  "Teil on kass.": msg`You have a cat. To more than one, or polite.`,
  "Neil on kass.": msg`They have a cat.`,
  "Mulle meeldib kass.": msg`I like the cat.`,
  "Sulle meeldib kass.": msg`You like the cat.`,
  "Talle meeldib kass.": msg`He or she likes the cat.`,
  "Meile meeldib kass.": msg`We like the cat.`,
  "Teile meeldib kass.": msg`You like the cat. To more than one, or polite.`,
  "Neile meeldib kass.": msg`They like the cat.`,
  "Mulle meeldib Tartu.": msg`I like Tartu.`,
  "Kas sulle meeldib kohv?": msg`Do you like coffee?`,
  "Talle meeldib Tallinn.": msg`He or she likes Tallinn.`,
  "Meile meeldib eesti keel.": msg`We like Estonian.`,
  "Kas teile meeldib Pärnu?": msg`Do you like Pärnu? To more than one, or polite.`,
  "Neile meeldib kool.": msg`They like school.`,
  "Mulle meeldivad kassid.": msg`I like cats.`,
  "Talle meeldib koer.": msg`He or she likes the dog.`,
  "Talle meeldivad koerad.": msg`He or she likes dogs.`,
  "Meile meeldib raamat.": msg`We like the book.`,
  "Meile meeldivad raamatud.": msg`We like books.`,
  "Neile meeldib õun.": msg`They like the apple.`,
  "Neile meeldivad õunad.": msg`They like apples.`,
  "Mulle meeldib lugeda.": msg`I like reading.`,
  "Talle meeldib ujuda.": msg`He or she likes swimming.`,
  "Neile meeldib rääkida.": msg`They like talking.`,
  "Meile meeldib eesti keelt õppida.": msg`We like learning Estonian.`,
  "Mulle meeldib kohv.": msg`I like coffee.`,
  "Mulle ei meeldi kohv.": msg`I don’t like coffee.`,
  "Talle ei meeldi koerad.": msg`He or she doesn’t like dogs.`,
  "Neile meeldib ujuda.": msg`They like swimming.`,
  "Neile ei meeldi ujuda.": msg`They don’t like swimming.`,
  "Meile meeldivad kassid.": msg`We like cats.`,
  "Meile ei meeldi kassid.": msg`We don’t like cats.`,
  "Kas sulle meeldib Tallinn?": msg`Do you like Tallinn?`,
  "Jah, meeldib.": msg`Yes, I do.`,
  "Kas sulle meeldivad kassid?": msg`Do you like cats?`,
  "Ei meeldi.": msg`No, I don’t.`,
  "Kellele meeldib kohv?": msg`Who likes coffee?`,
  "Mulle!": msg`I do!`,
  "Mul on külm.": msg`I’m cold.`,
  "Mul on palav.": msg`I’m hot.`,
  "Mul on igav.": msg`I’m bored.`,
  "Mul on hea meel.": msg`I’m glad.`,
  "Mul on kahju.": msg`I’m sorry. It’s a pity.`,
  "Tal on igav.": msg`He or she is bored.`,
  "Kas sul on külm?": msg`Are you cold?`,
  "Mulle maitseb kohv.": msg`Coffee tastes good to me.`,
  "Kas sulle maitseb?": msg`Does it taste good to you?`,
};

/** A sentence without its last mark, as a glossary key and a `Word` inside a sentence. */
const bare = (said: string) => said.replace(/[.!?]$/, "");

/** An ending in running text, kept on one line and marked as Estonian: -le. */
const End = ({ children }: { children: string }) => (
  <span lang="et" className="whitespace-nowrap">
    {children}
  </span>
);

/** Who each person is, in the reader's language. */
const PERSON: Record<MeeldimaPerson["id"], MessageDescriptor> = {
  ma: msg`I`,
  sa: msg`You, to one person`,
  ta: msg`He or she`,
  me: msg`We`,
  te: msg`You, to more than one`,
  nad: msg`They`,
};

/** Short answers glossed with their word below, so each form has one entry. */
const ANSWERS = new Set(["Mulle!", "Ei meeldi."]);

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    Object.entries(MEANS)
      .filter(([said]) => !ANSWERS.has(said))
      .map(([said, en]) => [bare(said).toLowerCase(), { en, show: bare(said) }]),
  ),
  meeldima: {
    en: msg`to please`,
    note: msg`With the -le form of a person, it says what they like.`,
  },
  meeldib: {
    en: msg`pleases`,
    note: msg`Mulle meeldib kohv: I like coffee. For one thing, or a verb.`,
  },
  meeldivad: {
    en: msg`please`,
    note: msg`Mulle meeldivad kassid: I like cats. For more than one thing.`,
  },
  "ei meeldi": {
    en: msg`doesn’t please`,
    note: msg`Mulle ei meeldi: I don’t like it. On its own, it answers no.`,
  },
  mulle: { en: msg`to me`, note: msg`From mina, I. On its own, it answers who: me.` },
  sulle: { en: msg`to you, one person`, note: msg`From sina, you.` },
  talle: { en: msg`to him or her`, note: msg`From tema, he or she.` },
  meile: { en: msg`to us`, note: msg`From meie, we.` },
  teile: { en: msg`to you, more than one; polite`, note: msg`From teie, you.` },
  neile: { en: msg`to them`, note: msg`From nemad, they.` },
  kellele: { en: msg`to whom`, note: msg`From kes, who. Kellele meeldib? Who likes it?` },
  kes: { en: msg`who`, clip: false },
  "hea meelega": { en: msg`gladly`, note: msg`Jah, hea meelega! Yes, gladly.` },
  maitseb: { en: msg`tastes good`, note: msg`From maitsma, to taste.` },
  kassid: { en: msg`cats` },
};

/** A stretch of a line, lit in the stage's hue when it is what changed. */
type Piece = readonly [text: string, lit: boolean];

/** “Mulle meeldivad kassid.” with -vad and the plural -d lit. */
export function litMore(said: string): Piece[] {
  const [person, , noun = ""] = said.slice(0, -1).split(" ");
  return [
    [`${person} meeldi`, false],
    ["vad", true],
    [` ${noun.slice(0, -1)}`, false],
    ["d", true],
    [".", false],
  ];
}

/** “Mulle ei meeldi kohv.” with ei meeldi lit. */
export function litNo(said: string): Piece[] {
  const at = said.indexOf("ei meeldi");
  return [
    [said.slice(0, at), false],
    ["ei meeldi", true],
    [said.slice(at + "ei meeldi".length), false],
  ];
}

/** One line to tap. Its lit pieces swap in when the switch flips. */
function FlipLine({
  pieces,
  said,
  mode,
}: {
  pieces: readonly Piece[];
  said: string;
  mode: string;
}) {
  const clip = src(said);
  const playing = usePlaying(clip);
  return (
    <button
      type="button"
      data-playing={playing ? "" : undefined}
      onClick={() => void playSound(clip)}
      className="learn-key flex min-h-13 cursor-pointer items-center justify-between gap-3 rounded-tile bg-plate py-2 ps-4 pe-3 text-start hoverable:hover:bg-plate-hover"
    >
      <span
        key={mode}
        lang="et"
        className="learn-swap text-xl font-medium tracking-tight max-sm:text-lg"
      >
        <span className="inline-block">
          {pieces.map(([text, lit], i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a line’s pieces never reorder
            <span key={i} className={clsx(lit && "text-(--form)")}>
              {text}
            </span>
          ))}
        </span>
      </span>
      <span className="grid size-5 shrink-0 place-items-center text-(--form)">
        {playing && <Playing className="h-3" />}
      </span>
    </button>
  );
}

/** The line under a switch: what the switch changed. */
function FlipNote({ mode, title, tip }: { mode: string; title: ReactNode; tip: ReactNode }) {
  return (
    <div aria-live="polite" className="min-h-13">
      <p key={mode} className="learn-swap grid gap-0.5">
        <span className="text-xl font-medium">{title}</span>
        <span className="text-md text-ink-secondary">{tip}</span>
      </p>
    </div>
  );
}

/** A sentence and what it means, as a line under a table or after an answer. */
function Said({ said }: { said: string }) {
  const { i18n } = useLingui();
  return (
    <>
      <span lang="et" className="font-medium text-ink">
        {said}
      </span>{" "}
      {i18n._(MEANS[said] as MessageDescriptor)}
    </>
  );
}

/** Who has and who likes, person by person: the -l form beside the -le form. */
function HasLikes() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = MEELDIMA_PERSONS.map((person) => ({
    id: person.id,
    label: i18n._(PERSON[person.id]),
    et: person.long,
    cells: [
      {
        form: `${person.has.slice(0, -1)}|l`,
        src: src(hasCat(person)),
        note: <Said said={hasCat(person)} />,
      },
      {
        form: `${person.likes.slice(0, -2)}|le`,
        src: src(likesCat(person)),
        note: <Said said={likesCat(person)} />,
      },
    ],
  }));
  return (
    <Panel>
      <Paradigm
        label={t`Who has and who likes, for each person`}
        columns={[t`Has`, t({ message: "Likes", context: "meeldima" })]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: (
            <Trans>
              <span lang="et">Mul on</span> and <span lang="et">mulle meeldib</span>
            </Trans>
          ),
          tip: <Trans>Tap a form to hear it in a sentence.</Trans>,
        }}
      />
    </Panel>
  );
}

/** Four likes, switched together between one thing and more than one. */
function MoreFlip() {
  const { t } = useLingui();
  const [more, setMore] = useState(false);
  const mode = more ? "more" : "one";
  return (
    <Panel>
      <Chips
        label={t`One thing or more`}
        items={[
          { label: t`One thing`, value: "one" },
          { label: t({ message: "More than one", context: "thing" }), value: "more" },
        ]}
        value={mode}
        onPick={(value) => setMore(value === "more")}
      />
      <div className="grid gap-1.5 sm:grid-cols-2">
        {MEELDIMA_MORE.map((row) => {
          const said = more ? row.more : row.one;
          return (
            <FlipLine
              key={row.one}
              pieces={more ? litMore(said) : [[said, false]]}
              said={said}
              mode={mode}
            />
          );
        })}
      </div>
      {more ? (
        <FlipNote
          mode={mode}
          title={
            <Trans>
              <span lang="et">Meeldivad</span> for more than one
            </Trans>
          }
          tip={
            <Trans>
              The thing is plural, so the verb takes{" "}
              <span lang="et" className="whitespace-nowrap">
                -vad
              </span>
              .
            </Trans>
          }
        />
      ) : (
        <FlipNote
          mode={mode}
          title={
            <Trans>
              <span lang="et">Meeldib</span> for one thing
            </Trans>
          }
          tip={
            <Trans>
              Whoever likes it: <span lang="et">mulle</span>, <span lang="et">talle</span>,{" "}
              <span lang="et">meile</span> or <span lang="et">neile</span>.
            </Trans>
          }
        />
      )}
    </Panel>
  );
}

/** Four likes, switched together between yes and no. */
function NoFlip() {
  const { t } = useLingui();
  const [no, setNo] = useState(false);
  const mode = no ? "no" : "yes";
  return (
    <Panel>
      <Chips
        label={t`Likes or doesn’t like`}
        items={[
          { label: t({ message: "Likes", context: "meeldima" }), value: "yes" },
          { label: t({ message: "Doesn’t like", context: "meeldima" }), value: "no" },
        ]}
        value={mode}
        onPick={(value) => setNo(value === "no")}
      />
      <div className="grid gap-1.5 sm:grid-cols-2">
        {MEELDIMA_NO.map((row) => {
          const said = no ? row.no : row.yes;
          return (
            <FlipLine
              key={row.yes}
              pieces={no ? litNo(said) : [[said, false]]}
              said={said}
              mode={mode}
            />
          );
        })}
      </div>
      {no ? (
        <FlipNote
          mode={mode}
          title={
            <Trans>
              <span lang="et">Ei meeldi</span> for both
            </Trans>
          }
          tip={<Trans>One thing or more, the no is the same.</Trans>}
        />
      ) : (
        <FlipNote
          mode={mode}
          title={
            <Trans>
              <span lang="et">Meeldib</span> or <span lang="et">meeldivad</span>
            </Trans>
          }
          tip={<Trans>One thing or a verb, or more than one thing.</Trans>}
        />
      )}
    </Panel>
  );
}

type PersonId = MeeldimaPerson["id"];
const PERSON_IDS: readonly PersonId[] = MEELDIMA_PERSONS.map(({ id }) => id);

/** The answer and two other persons at random, in random order. */
export function threePersons(answer: PersonId): PersonId[] {
  const others = PERSON_IDS.filter((each) => each !== answer);
  return shuffle([answer, ...shuffle(others).slice(0, 2)]);
}

/** The first run's persons, fixed so the page renders the same on the server. */
export const firstPersons = (i: number): PersonId[] => {
  const three = [0, 2, 3].map((step) => PERSON_IDS[(i + step) % PERSON_IDS.length] as PersonId);
  const turn = i % 3;
  return [...three.slice(turn), ...three.slice(0, turn)];
};

type WhoItem = ChoiceItem & { said: string; answer: PersonId; pair: readonly [string, string] };

const personOptions = (ids: readonly PersonId[], i18n: I18n) =>
  ids.map((id) => ({ id, label: <span lang={i18n.locale}>{i18n._(PERSON[id])}</span> }));

/** The feelings and when someone would say each. */
const FEELING_WHEN: readonly {
  said: (typeof MEELDIMA_FEELINGS)[number];
  when: MessageDescriptor;
}[] = [
  { said: "Mul on külm.", when: msg`It’s −15 °C outside.` },
  { said: "Mul on palav.", when: msg`It’s 30 °C in the sun.` },
  { said: "Mul on igav.", when: msg`There’s nothing to do all evening.` },
  { said: "Mul on hea meel.", when: msg`A friend you miss is coming to visit.` },
  { said: "Mul on kahju.", when: msg`Your friend is ill and can’t come.` },
];

export function MeeldimaLesson() {
  const { t, i18n } = useLingui();
  const present = lessonBySlug("olevik")?.n;
  const negation = lessonBySlug("eitus")?.n;
  const questions = lessonBySlug("kusimused")?.n;
  const mulOn = LESSONS.find((lesson) => lesson.et === "Mul on")?.n;
  const plural = LESSONS.find((lesson) => lesson.et === "Kassid")?.n;
  const onto = LESSONS.find((lesson) => lesson.et === "Laual, lauale, laualt")?.n;
  const verbForms = LESSONS.find((lesson) => lesson.et === "Lugema, lugeda, loen")?.n;

  const whoItems = useMemo<WhoItem[]>(
    () =>
      MEELDIMA_PERSONS.map(({ id }, i) => {
        const said = MEELDIMA_WHO[id];
        return {
          said,
          src: src(said),
          answer: id,
          pair: [id, id] as const,
          options: personOptions(firstPersons(i), i18n),
          explain: <Said said={said} />,
        };
      }),
    [i18n],
  );

  // Every round but the first draws its other persons afresh, so no set of options names the answer.
  const whoRun = (items: readonly WhoItem[], pinned?: WhoItem): WhoItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned ? item : { ...item, options: personOptions(threePersons(item.answer), i18n) },
    );

  const bins: SortBin[] = [
    {
      id: "meeldib",
      label: "meeldib",
      hint: t`one thing, or a verb`,
      rule: (
        <Trans>
          One thing, or a verb in its <End>-da</End> form, takes <span lang="et">meeldib</span>:{" "}
          <span lang="et">Mulle meeldib kohv. Mulle meeldib lugeda.</span>
        </Trans>
      ),
    },
    {
      id: "meeldivad",
      label: "meeldivad",
      hint: t`more than one thing`,
      rule: (
        <Trans>
          More than one thing takes <span lang="et">meeldivad</span>:{" "}
          <span lang="et">Mulle meeldivad koerad.</span>
        </Trans>
      ),
    },
  ];
  const sorted: SortItem[] = MEELDIMA_WHICH.map(({ w, verb }) => ({ w, bin: verb, src: src(w) }));

  const pairs: MatchPair[] = FEELING_WHEN.map(({ said, when }) => ({
    id: clipId(said),
    left: said,
    right: i18n._(when),
    src: src(said),
  }));

  const messageGaps: GapItem[] = [
    {
      id: "mul-igav",
      before: "Tere, Jaan!",
      after: "on täna igav.",
      answer: "Mul",
      options: ["Mul", "Mulle"],
      why: (
        <Trans>
          A feeling takes the <End>-l</End> form: <span lang="et">mul on igav</span>.
        </Trans>
      ),
    },
    {
      id: "mulle-ei",
      before: "",
      after: "ei meeldi kodus olla.",
      answer: "Mulle",
      options: ["Mul", "Mulle"],
      why: (
        <Trans>
          Liking takes the <End>-le</End> form, and so does not liking:{" "}
          <span lang="et">mulle ei meeldi</span>.
        </Trans>
      ),
    },
    {
      id: "meeldib-ujuda",
      before: "Kas sulle",
      after: "ujuda?",
      answer: "meeldib",
      options: ["meeldib", "meeldivad"],
      why: (
        <Trans>
          <span lang="et">Ujuda</span> is a verb, and a verb takes <span lang="et">meeldib</span>.
        </Trans>
      ),
    },
    {
      id: "meeldivad-kassid",
      before: "Või tule kohvikusse. Kohvikus on kass. Mulle",
      after: "kassid.",
      answer: "meeldivad",
      options: ["meeldib", "meeldivad"],
      why: (
        <Trans>
          <span lang="et">Kassid</span> is more than one: <span lang="et">meeldivad</span>.
        </Trans>
      ),
    },
    {
      id: "kirjuta-mulle",
      before: "Kirjuta",
      after: "!",
      answer: "mulle",
      options: ["mul", "mulle"],
      why: (
        <Trans>
          Write to me: the <End>-le</End> form says to whom, as in{" "}
          <span lang="et">mulle meeldib</span>.
        </Trans>
      ),
    },
  ];

  const line = (id: keyof typeof MEELDIMA_DIALOGUE) => {
    const clip = MEELDIMA_DIALOGUE[id];
    return typeof clip === "string" ? clip : clip.text;
  };

  const dialogue: DialogueTurn[] = [
    { who: "them", clip: "d-liis-1", line: line("d-liis-1") },
    {
      who: "you",
      clip: "d-sina-1",
      replies: [
        { line: line("d-sina-1"), right: true },
        {
          line: "Ei, mulle on külm.",
          why: (
            <Trans>
              A feeling takes the <End>-l</End> form, as having does:{" "}
              <span lang="et">mul on külm</span>.
            </Trans>
          ),
        },
        { line: "Ei, mulle meeldib külm.", why: <Trans>That says you like the cold.</Trans> },
      ],
    },
    { who: "them", clip: "d-liis-2", line: line("d-liis-2") },
    {
      who: "you",
      clip: "d-sina-2",
      replies: [
        {
          line: "Jah, mul on kohv.",
          why: <Trans>That says you have coffee. Liis asked if you like it.</Trans>,
        },
        { line: line("d-sina-2"), right: true },
        {
          line: "Jah, meeldivad.",
          why: (
            <Trans>
              <span lang="et">Kohv</span> is one thing, so it’s <span lang="et">meeldib</span>.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "d-liis-3", line: line("d-liis-3") },
    {
      who: "you",
      clip: "d-sina-3",
      replies: [
        {
          line: "Jah, mul on kahju.",
          why: <Trans>That says you’re sorry. Liis asked you to come.</Trans>,
        },
        {
          line: "Ei meeldi.",
          why: <Trans>That says you don’t like it. Liis asked you to come.</Trans>,
        },
        { line: line("d-sina-3"), right: true },
      ],
    },
    { who: "them", clip: "d-liis-4", line: line("d-liis-4") },
    {
      who: "you",
      clip: "d-sina-4",
      replies: [
        {
          line: "Mulle meeldib kassid!",
          why: (
            <Trans>
              <span lang="et">Kassid</span> is more than one, so it’s{" "}
              <span lang="et">meeldivad</span>.
            </Trans>
          ),
        },
        { line: line("d-sina-4"), right: true },
        { line: "Mul on kassid!", why: <Trans>That says you have cats.</Trans> },
      ],
    },
  ];

  const rows = (list: readonly string[]) =>
    list.map((said) => ({
      main: said,
      sub: i18n._(MEANS[said] as MessageDescriptor),
      src: src(said),
    }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          To say you like something, put the person in the <End>-le</End> form before{" "}
          <span lang="et">meeldib</span>: <span lang="et">Mulle meeldib kohv</span> is I like
          coffee. A feeling takes the <End>-l</End> form instead: <span lang="et">Mul on külm</span>
          , I’m cold.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">3 quizzes, a message and a conversation</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "meeldima",
        "mulle",
        "sulle",
        "talle",
        "meile",
        "teile",
        "neile",
        "kellele",
        "ei meeldi",
        "mul on külm",
        "mul on palav",
        "mul on igav",
        "mul on hea meel",
        "mul on kahju",
        "hea meelega",
        "mulle maitseb kohv",
      ]}
      recap={[
        <Trans key="1">
          To say who likes something, put the person in the <End>-le</End> form:{" "}
          <b lang="et">Mulle meeldib kohv.</b>
        </Trans>,
        <Trans key="2">
          <b lang="et">Meeldib</b> goes with one thing or a verb, <b lang="et">meeldivad</b> with
          more than one thing: <b lang="et">Mulle meeldib lugeda. Mulle meeldivad kassid.</b>
        </Trans>,
        <Trans key="3">
          No is <b lang="et">ei meeldi</b> for both: <b lang="et">Mulle ei meeldi koerad.</b>
        </Trans>,
        <Trans key="4">
          Ask with <b lang="et">kas</b> or <b lang="et">kellele</b>:{" "}
          <b lang="et">Kas sulle meeldib Tallinn? Kellele meeldib kohv?</b>
        </Trans>,
        <Trans key="5">
          A feeling takes the <End>-l</End> form, as having does: <b lang="et">Mul on külm.</b>{" "}
          <b lang="et">Mul on hea meel.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "likes",
          title: t`Saying who likes something`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Estonian says I like coffee the other way round: <Word w="Mulle meeldib kohv" />
                    . Word for word, it’s “to me pleases coffee”. The coffee does the pleasing, so{" "}
                    <Word w="meeldib" /> ends in <End>-b</End>, as for he or she in lesson {present}
                    .
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Mulle" />, to me, is the <End>-le</End> form of{" "}
                    <span lang="et">mina</span>: <End>-le</End> says to whom, as in lesson {onto}.
                    It sits beside the <End>-l</End> form of lesson {mulOn}:{" "}
                    <Word w="Mul on kass" />, I have a cat. Tap a form to hear it in a sentence.
                  </Trans>
                </p>
              </Prose>
              <HasLikes />
            </>
          ),
        },
        {
          id: "who-likes",
          title: t`Hearing who likes it`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence and pick who likes the thing. Listen for the word that ends in{" "}
                    <End>-le</End>.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="who-likes"
                title={<Trans>Who likes it?</Trans>}
                items={whoItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All six. You knew each person by their <End>-le</End> form.
                    </Trans>
                  ) : share >= 0.6 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the Likes column above once more, then try again.</Trans>
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
          id: "more",
          title: t`One thing or more`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The verb goes with the thing you like, so it changes when there’s more than one.{" "}
                    <Word w="Mulle meeldib kass" /> is I like the cat, and{" "}
                    <Word w="Mulle meeldivad kassid" /> is I like cats.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Meeldivad" /> has the <End>-vad</End> of they from lesson {present},
                    and <Word w="kassid" /> is the plural of lesson {plural}. The person never
                    changes the verb: <Word w="Neile meeldib õun" /> is they like the apple. Switch
                    between One thing and More than one, and tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <MoreFlip />
              <Aside>
                <Trans>
                  For food and drink there’s also <Word w="maitseb" />, from maitsma, to taste. It
                  takes the <End>-le</End> form too: <Word w="Mulle maitseb kohv" />, coffee tastes
                  good to me. <Word w="Kas sulle maitseb" />? asks whether you like what you’re
                  eating.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "doing",
          title: t`Liking to do something`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To say you like doing something, put a verb’s <End>-da</End> form after{" "}
                    <span lang="et">meeldib</span>: <Word w="Mulle meeldib lugeda" />, I like
                    reading. Lesson {verbForms} shows each verb’s <End>-da</End> form.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    With a verb it’s always <span lang="et">meeldib</span>, whoever likes it:{" "}
                    <Word w="Neile meeldib rääkida" />, they like talking. Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(MEELDIMA_DOING)} />
            </>
          ),
        },
        {
          id: "which-verb",
          title: t`Choosing the verb`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Put each word under the verb it takes after <span lang="et">mulle</span>:{" "}
                    <span lang="et">meeldib</span> for one thing or a verb,{" "}
                    <span lang="et">meeldivad</span> for more than one thing.
                  </Trans>
                </p>
              </Prose>
              <Sort
                id="which-verb"
                title={
                  <Trans>
                    <span lang="et">Mulle meeldib</span> or <span lang="et">mulle meeldivad</span>?
                  </Trans>
                }
                bins={bins}
                items={sorted}
              />
            </>
          ),
        },
        {
          id: "no",
          title: t`Saying no and asking`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To say you don’t like something, put <span lang="et">ei</span> before the verb
                    and drop its ending, as in lesson {negation}: <Word w="Mulle ei meeldi kohv" />.
                    It’s <Word w="ei meeldi" /> for more than one thing too:{" "}
                    <Word w="Talle ei meeldi koerad" />.
                  </Trans>
                </p>
              </Prose>
              <NoFlip />
              <Prose>
                <p>
                  <Trans>
                    To ask, start with <span lang="et">kas</span>, as in lesson {questions}, and
                    answer with the verb alone: <Word w="Kas sulle meeldib Tallinn" />?{" "}
                    <Word w="Jah, meeldib" />. To ask who, use <Word w="kellele" />, the{" "}
                    <End>-le</End> form of <Word w="kes" />: <Word w="Kellele meeldib kohv" />?{" "}
                    <Word w="Mulle" />!
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(MEELDIMA_ASK)} />
            </>
          ),
        },
        {
          id: "feelings",
          title: t`Saying how you feel`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A feeling takes the <End>-l</End> form of lesson {mulOn}, as having does:{" "}
                    <Word w="Mul on külm" />, I’m cold. Word for word, it’s “at me is cold”, with{" "}
                    <span lang="et">mul</span>, not <span lang="et">mulle</span>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Other people work the same way: <Word w="Tal on igav" />, he or she is bored.{" "}
                    <Word w="Kas sul on külm" />? asks whether you’re cold. Tap a feeling to hear
                    it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(MEELDIMA_FEELINGS)} />
              <Prose>
                <p>
                  <Trans>
                    <Word w="Hea meelega" /> means gladly. <span lang="et">Jah, hea meelega!</span>{" "}
                    says yes to an invitation.
                  </Trans>
                </p>
              </Prose>
            </>
          ),
        },
        {
          id: "when",
          title: t`When you’d say it`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Match each feeling to when you’d say it.</Trans>
                </p>
              </Prose>
              <Match id="when" title={<Trans>When would you say it?</Trans>} pairs={pairs} />
            </>
          ),
        },
        {
          id: "message",
          title: t`Having, feeling and liking`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari writes to Jaan. Fill each gap: the <End>-l</End> form for having and
                    feeling, the <End>-le</End> form for liking, and <span lang="et">meeldib</span>{" "}
                    or <span lang="et">meeldivad</span> for what she likes.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="mari-message"
                title={<Trans>Fill the gaps: Mari’s message</Trans>}
                gaps={messageGaps}
                mode="pick"
                clip="p-message"
              />
            </>
          ),
        },
        {
          id: "plans",
          title: t`Making plans`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Liis asks what you’d like to do. Each reply says how you feel or what you like;
                    pick the one that fits.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="making-plans"
                title={<Trans>Talk: making plans with Liis</Trans>}
                part={
                  <Trans>
                    It’s a cold day, and you like coffee and cats. Liis speaks first; pick what you
                    say back.
                  </Trans>
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
