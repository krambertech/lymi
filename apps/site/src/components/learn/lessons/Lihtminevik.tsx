import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  PAST_DIALOGUE,
  PAST_I_VERBS,
  PAST_NOW_OR_THEN,
  PAST_SATURDAY,
  PAST_SI_ENDINGS,
  PAST_SI_VERBS,
  PAST_SORT,
  PAST_TIMELINE,
  PRESENT_ENDINGS,
  presentWithPronoun,
} from "../../../lib/learn/clips";
import { playSound } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Chips, Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Morph, type MorphChain } from "../Morph";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { type ChoiceItem, ChoiceRound, type GapItem, GapRound, Quiz } from "../Quiz";
import { Sort, type SortBin, type SortItem } from "../Sort";
import { Timeline, type TimelinePoint } from "../Timeline";
import { Word } from "../Word";

const SLUG = "lihtminevik";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type SiVerb = (typeof PAST_SI_VERBS)[number];
type IVerb = (typeof PAST_I_VERBS)[number];
type Person = (typeof PAST_SI_ENDINGS)[number];
type Pronoun = Person["pronoun"];
type Ending = Person["ending"];

/** A -si- verb in the past with its pronoun, as recorded: “Ma lugesin”. */
const pastSaid = (person: Person, verb: SiVerb) =>
  presentWithPronoun(person.pronoun, verb.past, person.ending);

/** The present with its pronoun, from the present-tense lesson's recordings: “Ma loen”. */
function nowSaid(pronoun: Pronoun, verb: SiVerb) {
  const ending = PRESENT_ENDINGS.find((each) => each.pronoun === pronoun)?.ending ?? "";
  return {
    form: `${verb.now}|${ending}`,
    src: clipUrl("olevik", clipId(presentWithPronoun(pronoun, verb.now, ending))),
  };
}

/** An ending in running text: marked as Estonian, and never broken after its hyphen. */
function End({ children }: { children: ReactNode }) {
  return (
    <span lang="et" className="whitespace-nowrap">
      -{children}
    </span>
  );
}

/** Keeps a Word and the full stop after it on one line, so the stop never starts a line. */
function Nowrap({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>;
}

/** An Estonian word in running text that needs no card, such as a pronoun. */
function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const MEANS: Record<SiVerb["verb"] | IVerb["verb"], MessageDescriptor> = {
  elama: msg`to live`,
  lugema: msg`to read`,
  õppima: msg`to learn, to study`,
  rääkima: msg`to speak, to talk`,
  töötama: msg`to work`,
  ootama: msg`to wait`,
  olema: msg`to be`,
  tulema: msg`to come`,
  minema: msg`to go`,
  tegema: msg`to do, to make`,
  nägema: msg`to see`,
  sööma: msg`to eat`,
  jooma: msg`to drink`,
};

const PERSON_LABELS: Record<Pronoun, MessageDescriptor> = {
  ma: msg`I`,
  sa: msg`you`,
  ta: msg`he or she`,
  me: msg`we`,
  te: msg`you, to more than one; polite you`,
  nad: msg`they`,
};

/** What changes from now to the past for each person: under the table, and after a quiz round. */
const PERSON_TIPS: Record<Pronoun, ReactNode> = {
  ma: (
    <Trans>
      <End>n</End> now, <End>sin</End> in the past.
    </Trans>
  ),
  sa: (
    <Trans>
      <End>d</End> now, <End>sid</End> in the past.
    </Trans>
  ),
  ta: (
    <Trans>
      <End>b</End> now, only <End>s</End> in the past.
    </Trans>
  ),
  me: (
    <Trans>
      <End>me</End> now, <End>sime</End> in the past.
    </Trans>
  ),
  te: (
    <Trans>
      <End>te</End> now, <End>site</End> in the past.
    </Trans>
  ),
  nad: (
    <Trans>
      <End>vad</End> now, <End>sid</End> in the past, as for <Et>sa</Et>.
    </Trans>
  ),
};

/** Pick a -si- verb and see it now and in the past, person by person. */
function SiTable() {
  const { t, i18n } = useLingui();
  const [name, setName] = useState<SiVerb["verb"]>("lugema");
  const verb = PAST_SI_VERBS.find((each) => each.verb === name) as SiVerb;
  const rows: ParadigmRow[] = PAST_SI_ENDINGS.map((person) => {
    const now = nowSaid(person.pronoun, verb);
    return {
      id: person.pronoun,
      label: i18n._(PERSON_LABELS[person.pronoun]),
      et: person.pronoun,
      tip: PERSON_TIPS[person.pronoun],
      cells: [
        { form: now.form, src: now.src },
        { form: `${verb.past}|${person.ending}`, src: src(pastSaid(person, verb)) },
      ],
    };
  });
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Verbs`}
        items={PAST_SI_VERBS.map((each) => ({ label: each.verb, value: each.verb, lang: "et" }))}
        value={name}
        onPick={(value) => {
          setName(value);
          void playSound(src(value));
        }}
      />
      <p className="-mt-2 text-md text-ink-secondary">
        <span lang="et" className="font-medium text-ink">
          {verb.verb}
        </span>{" "}
        {i18n._(MEANS[name])}
      </p>
      <Paradigm
        key={name}
        label={t`Forms now and in the past`}
        columns={[t`Now`, t`In the past`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a form`,
          tip: t`You’ll hear it with its pronoun and read what its ending does.`,
        }}
      />
    </Panel>
  );
}

const ENDINGS: readonly Ending[] = ["sin", "sid", "s", "sime", "site"];

/** The answer and two other endings at random, in random order. */
export function threeEndings(answer: Ending): Ending[] {
  return shuffle([answer, ...shuffle(ENDINGS.filter((each) => each !== answer)).slice(0, 2)]);
}

/** The answer and the two endings after it, turned by `turn`: the same on the server and in the browser. */
function fixedEndings(answer: Ending, turn: number): Ending[] {
  const at = ENDINGS.indexOf(answer);
  const three = [0, 1, 2].map((step) => ENDINGS[(at + step) % ENDINGS.length] as Ending);
  return [...three.slice(turn % 3), ...three.slice(0, turn % 3)];
}

type EndingItem = GapItem & { said: string; pair: readonly [string, string] };

/** Each person once before any comes back; every round but the first draws its endings afresh. */
export const endingRun = (items: readonly EndingItem[], pinned?: EndingItem): EndingItem[] =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: threeEndings(item.answer as Ending) },
  );

/** Longer than this, a gap's sentence no longer fits a phone at the gap's size. */
const GAP_FITS = 12;

/** The quiz opens on te and ootama, not the lesson's first example, with the answer second. */
const FIRST_ENDING = { pronoun: "te", verb: "ootama", turn: 2 } as const;

/** Every -si- verb with every person whose sentence fits the gap, the first round first. */
export function endingItems(): EndingItem[] {
  const items = PAST_SI_VERBS.flatMap((verb) => PAST_SI_ENDINGS.map((person) => ({ verb, person })))
    .filter(
      ({ verb, person }) =>
        person.pronoun.length + 1 + verb.past.length + person.ending.length <= GAP_FITS,
    )
    .map(({ verb, person }, i) => {
      const said = pastSaid(person, verb);
      const first = person.pronoun === FIRST_ENDING.pronoun && verb.verb === FIRST_ENDING.verb;
      return {
        src: src(said),
        before: presentWithPronoun(person.pronoun, verb.past, ""),
        after: "",
        options: fixedEndings(person.ending, first ? FIRST_ENDING.turn : i),
        answer: person.ending,
        said,
        pair: [person.pronoun, verb.verb] as const,
        first,
        explain: (
          <>
            <span lang="et" className="font-medium text-ink">
              {said}.
            </span>{" "}
            {PERSON_TIPS[person.pronoun]}
          </>
        ),
      };
    });
  return [...items.filter((item) => item.first), ...items.filter((item) => !item.first)].map(
    ({ first: _, ...item }) => item,
  );
}

type Kind = "now" | "past";
type WhenItem = ChoiceItem & { said: string; pair: readonly [string, string] };

const KIND_LABELS: Record<Kind, MessageDescriptor> = { now: msg`Now`, past: msg`In the past` };

const kindOptions = (kinds: readonly Kind[], i18n: I18n) =>
  kinds.map((kind) => ({
    id: kind,
    label: <span lang={i18n.locale}>{i18n._(KIND_LABELS[kind])}</span>,
  }));

/** What each sentence of “Now or in the past?” means. */
const WHEN_MEANS: Record<string, MessageDescriptor> = {
  "Ta on kodus.": msg`He or she is at home.`,
  "Ta oli kodus.": msg`He or she was at home.`,
  "Ta tuleb koju.": msg`He or she is coming home.`,
  "Ta tuli koju.": msg`He or she came home.`,
  "Ta läheb tööle.": msg`He or she is going to work.`,
  "Ta läks tööle.": msg`He or she went to work.`,
  "Mida ta teeb?": msg`What is he or she doing?`,
  "Mida ta tegi?": msg`What did he or she do?`,
  "Ta sööb kodus.": msg`He or she eats at home.`,
  "Ta sõi kodus.": msg`He or she ate at home.`,
  "Ta joob kohvi.": msg`He or she is drinking coffee.`,
  "Ta jõi kohvi.": msg`He or she drank coffee.`,
  "Ta loeb raamatut.": msg`He or she is reading a book.`,
  "Ta luges raamatut.": msg`He or she was reading a book.`,
};

/** Each sentence of “Now or in the past?”, keyed by its verb: a run hears every verb once, now or in the past at random. */
export function whenItems(i18n: I18n): WhenItem[] {
  return PAST_NOW_OR_THEN.flatMap((each, i) =>
    (["past", "now"] as const).map((kind, k) => {
      const said = each[kind];
      return {
        src: src(said),
        answer: kind,
        said,
        pair: [each.verb, `${each.verb}-${kind}`] as const,
        // Fixed for the server's first round; the order function shuffles every round after it.
        options: kindOptions((i + k) % 2 === 0 ? ["now", "past"] : ["past", "now"], i18n),
        explain: (
          <>
            <span lang="et" className="font-medium text-ink">
              {said}
            </span>{" "}
            {i18n._(WHEN_MEANS[said] as MessageDescriptor)}
          </>
        ),
      };
    }),
  );
}

/** What each -i- verb's forms mean, under their keys. */
const I_FORMS: Record<IVerb["verb"], { ma: MessageDescriptor; ta: MessageDescriptor }> = {
  olema: { ma: msg`I was`, ta: msg`he or she was` },
  tulema: { ma: msg`I came`, ta: msg`he or she came` },
  minema: { ma: msg`I went`, ta: msg`he or she went` },
  tegema: { ma: msg`I did, I made`, ta: msg`he or she did, made` },
  nägema: { ma: msg`I saw`, ta: msg`he or she saw` },
  sööma: { ma: msg`I ate`, ta: msg`he or she ate` },
  jooma: { ma: msg`I drank`, ta: msg`he or she drank` },
};

/** What changes on the way from the -ma infinitive to the I form of each -i- verb. */
const I_CHANGES: Record<IVerb["verb"], ReactNode> = {
  olema: (
    <Trans>
      <End>in</End> goes on <b lang="et">ol-</b>.
    </Trans>
  ),
  tulema: (
    <Trans>
      <End>in</End> goes on <b lang="et">tul-</b>.
    </Trans>
  ),
  minema: (
    <Trans>
      A new stem, <b lang="et">läks-</b>, then <End>in</End>. Now it’s <b lang="et">lähen</b>.
    </Trans>
  ),
  tegema: (
    <Trans>
      Now it’s <b lang="et">teen</b>; the g comes back in the past.
    </Trans>
  ),
  nägema: (
    <Trans>
      Now it’s <b lang="et">näen</b>; the g comes back in the past.
    </Trans>
  ),
  sööma: (
    <Trans>
      <b lang="et">Öö</b> turns into <b lang="et">õ</b>, then <End>in</End>.
    </Trans>
  ),
  jooma: (
    <Trans>
      <b lang="et">Oo</b> turns into <b lang="et">õ</b>, then <End>in</End>.
    </Trans>
  ),
};

const GLOSSARY: Glossary = {
  lihtminevik: { en: msg`the simple past`, note: msg`Word for word: simple past.` },
  eile: { en: msg`yesterday` },
  täna: { en: msg`today` },
  "eelmisel nädalal": {
    en: msg`last week`,
    note: msg`Eelmine nädal, last week, with the -l that says when, as in esmaspäeval.`,
  },
  "eile õppisin eesti keelt": {
    en: msg`I studied Estonian yesterday.`,
    show: "Eile õppisin eesti keelt.",
    clip: clipId("Eile õppisin eesti keelt."),
  },
  "täna õpin eesti keelt": {
    en: msg`Today I’m studying Estonian.`,
    show: "Täna õpin eesti keelt.",
    clip: clipId("Täna õpin eesti keelt."),
  },
  elama: { en: msg`to live` },
  elasin: { en: msg`I lived`, note: msg`Ela- from elama, then -sin.` },
  "ta elas": { en: msg`he or she lived` },
  "nad elasid": { en: msg`they lived` },
  lugema: { en: msg`to read` },
  loen: {
    en: msg({ message: "I read, I’m reading", context: "gloss" }),
    note: msg`The present: the stem changes to loe-.`,
  },
  lugesin: { en: msg`I read, I was reading`, note: msg`The past: luge- from lugema, then -sin.` },
  räägin: { en: msg`I speak, I’m speaking`, note: msg`From rääkima, to speak.` },
  rääkisin: { en: msg`I spoke, I was speaking`, note: msg`Rääki- from rääkima, then -sin.` },
  ostma: { en: msg`to buy` },
  ostsin: { en: msg`I bought` },
  ostis: { en: msg`he or she bought` },
  käisin: {
    en: msg`I went and came back; I visited`,
    note: msg`From käima: käisin poes, I went to the shop.`,
  },
  olin: { en: msg`I was` },
  tulin: { en: msg`I came` },
  minema: { en: msg`to go` },
  läksin: { en: msg`I went` },
  läks: { en: msg`he or she went` },
  tegin: { en: msg`I did, I made` },
  nägin: { en: msg`I saw` },
  sööma: { en: msg`to eat` },
  sõin: { en: msg`I ate` },
  sõi: { en: msg`he or she ate` },
  jõin: { en: msg`I drank` },
};

const TIME_LABELS: Record<(typeof PAST_TIMELINE)[number]["id"], MessageDescriptor> = {
  "last-week": msg`Last week`,
  yesterday: msg`Yesterday`,
  today: msg`Today`,
};
const TIME_MEANS: Record<(typeof PAST_TIMELINE)[number]["id"], MessageDescriptor> = {
  "last-week": msg`Last week I read a lot.`,
  yesterday: msg`Yesterday I studied Estonian.`,
  today: msg`Today I’m studying Estonian.`,
};
const TIME_BUILDS: Record<(typeof PAST_TIMELINE)[number]["id"], MessageDescriptor> = {
  "last-week": msg`the past, for I`,
  yesterday: msg`the past, for I`,
  today: msg`the present, for I`,
};

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const points: TimelinePoint[] = PAST_TIMELINE.map((point) => ({
      id: point.id,
      label: i18n._(TIME_LABELS[point.id]),
      et: point.et,
      at: point.at,
      examples: [
        {
          sentence: point.sentence,
          meaning: i18n._(TIME_MEANS[point.id]),
          src: src(point.sentence),
          build: [{ form: point.build, note: i18n._(TIME_BUILDS[point.id]) }],
        },
      ],
    }));

    const chains: MorphChain[] = PAST_I_VERBS.map((verb) => ({
      id: verb.verb,
      steps: [
        { word: verb.verb, label: i18n._(MEANS[verb.verb]), src: src(verb.verb) },
        {
          word: verb.ma,
          label: i18n._(I_FORMS[verb.verb].ma),
          src: src(verb.ma),
          note: I_CHANGES[verb.verb],
        },
        {
          word: verb.ta,
          label: i18n._(I_FORMS[verb.verb].ta),
          src: src(verb.ta),
          note:
            verb.verb === "minema" ? (
              <Trans>
                <Et>Ta</Et> drops the i: <b lang="et">läks</b>.
              </Trans>
            ) : (
              <Trans>
                <Et>Ta</Et> adds nothing after the i.
              </Trans>
            ),
        },
      ],
    }));

    // Each right answer sits in its own place: second, first, third, first. The answer is the
    // longest option only once and never the shortest, so length alone doesn't find it.
    const saturday: PassageQuestion[] = [
      {
        id: "ten",
        ask: t`Where did Mari go at ten?`,
        options: [
          { id: "work", label: t({ message: "To work", context: "where to" }) },
          { id: "market", label: t`To the market` },
          { id: "cinema", label: t`To the cinema` },
        ],
        answer: "market",
        line: 1,
      },
      {
        id: "bought",
        ask: t`What did she buy?`,
        options: [
          { id: "bread", label: t`Bread and cheese` },
          { id: "coffee", label: t`Cheese and coffee` },
          { id: "book", label: t({ message: "A book", context: "what was bought" }) },
        ],
        answer: "bread",
        line: 2,
      },
      {
        id: "home",
        ask: t`What did Mari and Jaan do at home?`,
        options: [
          { id: "read", label: t`They read and had tea` },
          { id: "worked", label: t`They worked` },
          { id: "ate", label: t`They ate and had coffee` },
        ],
        answer: "ate",
        line: 4,
      },
      {
        id: "left",
        ask: t`When did Jaan go home?`,
        options: [
          { id: "nine", label: t`At nine` },
          { id: "two", label: t`At two` },
          { id: "eleven", label: t`At eleven` },
        ],
        answer: "nine",
        line: 6,
      },
    ];

    const said = (clip: keyof typeof PAST_DIALOGUE) => {
      const line = PAST_DIALOGUE[clip];
      return typeof line === "string" ? line : line.text;
    };
    // The right reply moves between first, third and second place. In each turn one wrong reply
    // misses on one count and the other on both, so no reply wins by sharing the most with the rest.
    const talk: DialogueTurn[] = [
      { who: "them", clip: "d-kati-1", line: said("d-kati-1") },
      {
        who: "you",
        clip: "d-sina-1",
        replies: [
          { line: said("d-sina-1"), right: true },
          {
            line: "Ma olen kodus ja loen raamatut.",
            why: t`That’s what you’re doing now. Kati asked about yesterday.`,
          },
          {
            line: "Nad on kodus ja loevad raamatut.",
            why: (
              <Trans>
                <Et>Nad on</Et> is they are, now. Kati asked what you did yesterday.
              </Trans>
            ),
          },
        ],
      },
      { who: "them", clip: "d-kati-2", line: said("d-kati-2") },
      {
        who: "you",
        clip: "d-sina-2",
        replies: [
          {
            line: "Jah, nad käivad poes.",
            why: (
              <Trans>
                <Et>Nad käivad</Et> is they go, now. Kati asked about you, yesterday.
              </Trans>
            ),
          },
          {
            line: "Jah, ma käin poes.",
            why: (
              <Trans>
                <Et>Käin</Et> is the present. Kati asked about yesterday.
              </Trans>
            ),
          },
          { line: said("d-sina-2"), right: true },
        ],
      },
      { who: "them", clip: "d-kati-3", line: said("d-kati-3") },
      {
        who: "you",
        clip: "d-sina-3",
        replies: [
          {
            line: "Ma ostsid leiba ja piima.",
            why: (
              <Trans>
                <Et>Ostsid</Et> is for <Et>sa</Et> or <Et>nad</Et>. With <Et>ma</Et>, it’s{" "}
                <Et>ostsin</Et>.
              </Trans>
            ),
          },
          { line: said("d-sina-3"), right: true },
          {
            line: "Nad ostavad leiba ja piima.",
            why: (
              <Trans>
                <Et>Nad ostavad</Et> is they buy, now. Kati asked what you bought.
              </Trans>
            ),
          },
        ],
      },
    ];

    // Every round but the first draws its order afresh, so the answer's place says nothing.
    const whenRun = (items: readonly WhenItem[], pinned?: WhenItem): WhenItem[] =>
      eachPairFirst(items, pinned).map((item) =>
        item === pinned ? item : { ...item, options: kindOptions(shuffle(["now", "past"]), i18n) },
      );

    // The hints name verbs that aren't in the sort, so neither gives an answer away.
    const bins: SortBin[] = [
      {
        id: "si",
        label: "-si-",
        hint: (
          <Trans>
            as in <Et>töötasin</Et>
          </Trans>
        ),
        rule: (
          <Trans>
            Most verbs: <End>si-</End> on the stem of the <End>-ma</End> infinitive.
          </Trans>
        ),
      },
      {
        id: "i",
        label: "-i-",
        hint: (
          <Trans>
            as in <Et>nägin</Et>
          </Trans>
        ),
        rule: (
          <Trans>
            One of the seven <End>i-</End> verbs:{" "}
            <Et>olema, tulema, minema, tegema, nägema, sööma, jooma</Et>.
          </Trans>
        ),
      },
    ];
    const sort: SortItem[] = PAST_SORT.map((each) => ({
      w: each.verb,
      bin: each.bin,
      src: src(each.verb),
      why:
        each.bin === "si" ? (
          <Trans>
            Its past is <Et>{each.past}</Et>.
          </Trans>
        ) : (
          <Trans>
            One of the seven <End>i-</End> verbs: its past is <Et>{each.past}</Et>.
          </Trans>
        ),
    }));

    return {
      points,
      chains,
      bins,
      sort,
      endings: endingItems(),
      when: whenItems(i18n),
      whenRun,
      saturday,
      talk,
    };
  }, [t, i18n]);
}

export function LihtminevikLesson() {
  const { t } = useLingui();
  const content = useContent();
  const present = lessonBySlug("olevik")?.n;
  const days = lessonBySlug("paevad")?.n;
  const verbForms = lessonBySlug("verbi-pohivormid")?.n;
  const pastNo = lessonBySlug("mineviku-eitus")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Most verbs put <End>si-</End> on the stem of the <End>-ma</End> infinitive; a few everyday
          verbs take <End>i-</End>. An ending for each person says who did it.
        </Trans>
      }
      facts={[
        <Trans key="m">14 minutes</Trans>,
        <Trans key="q">5 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "eile",
        "eelmisel nädalal",
        "elasin",
        "lugesin",
        "rääkisin",
        "käisin",
        "ostsin",
        "olin",
        "tulin",
        "läksin",
        "tegin",
        "nägin",
        "sõin",
        "jõin",
      ]}
      recap={[
        <Trans key="1">
          Most verbs put <End>si-</End> on the stem of the <End>-ma</End> infinitive:{" "}
          <b lang="et">elama, elasin</b>; <b lang="et">lugema, lugesin</b>.
        </Trans>,
        <Trans key="2">
          After <End>si-</End> come <b lang="et">-n, -d, -me, -te</b>, as in the present.{" "}
          <Et>Ta</Et> has only <End>s</End>, and <Et>nad</Et> has <End>sid</End>, as <Et>sa</Et>{" "}
          does: <b lang="et">ta elas, nad elasid</b>.
        </Trans>,
        <Trans key="3">
          A few everyday verbs take <End>i-</End> on the stem of the <End>-ma</End> infinitive:{" "}
          <b lang="et">olin, tulin, tegin, nägin</b>. Three change the stem:{" "}
          <b lang="et">läksin, sõin, jõin</b>. <Et>Ta</Et> ends in <End>i</End>, as in{" "}
          <b lang="et">ta oli</b>, except <b lang="et">ta läks</b>.
        </Trans>,
        <Trans key="4">
          <b lang="et">Lugesin</b> is I read, I was reading and I did read: one simple past for all
          three. Time words such as <b lang="et">eile</b> and <b lang="et">eelmisel nädalal</b> say
          when.
        </Trans>,
      ]}
      sections={[
        {
          id: "yesterday",
          title: t`Yesterday`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {days} you met <Word w="eile" />, yesterday. It goes with the past:{" "}
                    <Nowrap>
                      <Word w="Eile õppisin eesti keelt" />.
                    </Nowrap>{" "}
                    With <Word w="täna" />, today, the verb is in the present:{" "}
                    <Nowrap>
                      <Word w="Täna õpin eesti keelt" />.
                    </Nowrap>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The simple past is called <Word w="lihtminevik" />. Like the present in lesson{" "}
                    {present}, one form covers more than one English form: <b lang="et">õppisin</b>{" "}
                    is I studied, I was studying and I did study. Tap a time on the line to hear a
                    sentence and see how its verb is built.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Timeline
                  label={t`Last week, yesterday and today`}
                  points={content.points}
                  empty={{
                    title: t`Tap a time`,
                    tip: t`You’ll hear a sentence and see how its verb is built.`,
                  }}
                />
              </Panel>
              <Aside>
                <Trans>
                  This lesson says what happened. Saying that something didn’t happen takes another
                  form, which lesson {pastNo} teaches.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "with-si",
          title: t`The past with -si-`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Most verbs build the past on the <End>-ma</End> infinitive. Take off{" "}
                    <End>ma</End> and add <End>sin</End> for I: <Word w="elama" />,{" "}
                    <Word w="elasin" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The past keeps the stem of the <End>-ma</End> infinitive where the present
                    changes it. You say <Word w="loen" /> now but <Word w="lugesin" /> in the past,
                    because the past comes from <Word w="lugema" />. In the same way,{" "}
                    <Word w="räägin" /> is now and <Word w="rääkisin" /> the past. Lesson{" "}
                    {verbForms} puts the <End>-ma</End> infinitive beside the present.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The other persons take the present’s endings after <End>si-</End>, with two
                    changes. <Et>Ta</Et> has only <End>s</End>: <Word w="ta elas" />. <Et>Nad</Et>{" "}
                    has <End>sid</End>, the same as <Et>sa</Et>: <Word w="nad elasid" />. Pick a
                    verb and tap a form.
                  </Trans>
                </p>
              </Prose>
              <SiTable />
              <Aside>
                <Trans>
                  In <Word w="ostma" />, to buy, <Et>ta</Et> takes <End>is</End>:{" "}
                  <Word w="ostsin" />, I bought, but <Word w="ostis" />, he or she bought.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "endings",
          title: t`Endings in the past`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Pick the ending that goes with the pronoun, then hear the sentence.</Trans>
                </p>
              </Prose>
              <Quiz
                id="past-endings"
                title={<Trans>Which ending?</Trans>}
                items={content.endings}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six. You matched every pronoun with its past ending.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Tap the past forms in the table once more.</Trans>
                  ) : (
                    <Trans>Go back to the table above, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={endingRun}
                round={(props) => <GapRound {...props} listen="after" />}
              />
            </>
          ),
        },
        {
          id: "with-i",
          title: t`The past with -i-`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A few everyday verbs take <End>i-</End> instead, and several change their stem
                    too: <Word w="sööma" />, <Word w="sõin" />, I ate; <Word w="minema" />,{" "}
                    <Word w="läksin" />, I went. Learn them one by one, as you learned{" "}
                    <b lang="et">lugema</b> with <b lang="et">loen</b>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The endings are the ones that follow <End>si-</End>:{" "}
                    <b lang="et">sõin, sõid, sõi, sõime, sõite, sõid</b>. <Et>Ta</Et> ends in{" "}
                    <End>i</End>, as in <Word w="sõi" />; of these seven, only <Et>minema</Et> drops
                    it:{" "}
                    <Nowrap>
                      <Word w="läks" />.
                    </Nowrap>{" "}
                    Pick a verb and tap its forms to see what changes.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Morph label={t`Verbs`} chains={content.chains} />
              </Panel>
            </>
          ),
        },
        {
          id: "sort",
          title: t`-si- or -i-`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Put each verb in the group its past belongs to, then check. Tap a verb to hear
                    it.
                  </Trans>
                </p>
              </Prose>
              <Sort
                id="si-or-i"
                title={<Trans>Which past?</Trans>}
                bins={content.bins}
                items={content.sort}
              />
            </>
          ),
        },
        {
          id: "when",
          title: t`Present or past`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence about someone and pick whether it happens now or happened in the
                    past. Listen to the verb: <b lang="et">elab</b> is now, <b lang="et">elas</b> is
                    the past.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="now-or-past"
                title={<Trans>Now or in the past?</Trans>}
                items={content.when}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven. You told the past from the present every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the verbs above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={content.whenRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "saturday",
          title: t`Mari’s Saturday`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Yesterday was Saturday. Listen to what your friend Mari did, then answer.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="mari-saturday"
                title={<Trans>Listen: what did Mari do?</Trans>}
                clip="p-saturday"
                sentences={PAST_SATURDAY}
                questions={content.saturday}
              />
            </>
          ),
        },
        {
          id: "talk",
          title: t`Talking about yesterday`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Your friend Kati asks what you did yesterday. Answer her in Estonian. If you
                    pick a wrong reply, you see why, then hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="yesterday-talk"
                title={<Trans>Talk: yesterday with Kati</Trans>}
                part={
                  <Trans>
                    Yesterday you stayed at home on your own, read a book and went to the shop. Kati
                    speaks first; pick what you say back.
                  </Trans>
                }
                them={t`Kati`}
                turns={content.talk}
              />
            </>
          ),
        },
      ]}
    />
  );
}
