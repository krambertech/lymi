import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  daForm,
  NUD_BUILT,
  NUD_SHOWN,
  NUD_WHOLE,
  nudForm,
  PAST_NO_DIALOGUE,
  PAST_NO_FIX,
  PAST_NO_PERSONS,
  PAST_NO_REWRITE,
  PAST_NO_SORT,
  PAST_NO_TABLE,
  PAST_NO_TALK,
  PAST_NO_TIMELINE,
  PAST_NO_WHEN,
  pastNoSaid,
  pastYesSaid,
  type VerbForms,
} from "../../../lib/learn/clips";
import { usesTaughtBy } from "../../../lib/learn/form-map";
import { playSound } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Chips, Keys, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { FormMap } from "../FormMap";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Morph, type MorphChain } from "../Morph";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Sort, type SortBin, type SortItem } from "../Sort";
import { Timeline, type TimelinePoint } from "../Timeline";
import { Word } from "../Word";

const SLUG = "mineviku-eitus";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Pronoun = (typeof PAST_NO_PERSONS)[number];
type TableVerb = (typeof PAST_NO_TABLE)[number];
type WholeVerb = (typeof NUD_WHOLE)[number];
type Built = VerbForms & { pattern: "da" | "ta" | "la" };

function End({ children }: { children: ReactNode }) {
  return (
    <span lang="et" className="whitespace-nowrap">
      -{children}
    </span>
  );
}

function Nowrap({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>;
}

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const MEANS: Record<string, MessageDescriptor> = {
  elama: msg`to live`,
  lugema: msg`to read`,
  töötama: msg`to work`,
  ootama: msg`to wait`,
  olema: msg`to be`,
  rääkima: msg`to speak, to talk`,
  õppima: msg`to learn, to study`,
  istuma: msg`to sit`,
  armastama: msg`to love`,
  kuulama: msg`to listen`,
  vaatama: msg`to look, to watch`,
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

const GLOSSARY: Glossary = {
  ei: { en: msg`not; no`, note: msg`The same for every person, now and in the past.` },
  eile: { en: msg`yesterday` },
  täna: { en: msg`today` },
  "täna ma ei tööta": { en: msg`Today I’m not working.`, show: "Täna ma ei tööta" },
  "eile ma ei töötanud": { en: msg`Yesterday I didn’t work.`, show: "Eile ma ei töötanud" },
  töötasin: { en: msg`I worked`, note: msg`The past of töötama, with yes.` },
  "ma ei töötanud": { en: msg`I didn’t work` },
  lugesin: { en: msg`I read, I was reading`, note: msg`The past of lugema, with yes.` },
  "ma ei lugenud": { en: msg`I didn’t read` },
  "nad ei lugenud": { en: msg`they didn’t read` },
  "ei olnud": { en: msg`wasn’t, weren’t`, note: msg`Olema with no, in the past.` },
  polnud: { en: msg`wasn’t, weren’t`, note: msg`Ei olnud in one word.` },
  "ma polnud kodus": { en: msg`I wasn’t at home.`, show: "Ma polnud kodus" },
  elada: { en: msg`to live`, note: msg`The -da infinitive of elama.` },
  elanud: { en: msg`with ei: didn’t live`, note: msg`The -nud form of elama.` },
  lugeda: { en: msg`to read`, note: msg`The -da infinitive of lugema.` },
  lugenud: { en: msg`with ei: didn’t read`, note: msg`The -nud form of lugema.` },
  oodata: { en: msg`to wait`, note: msg`The -da infinitive of ootama.` },
  oodanud: { en: msg`with ei: didn’t wait`, note: msg`The -nud form of ootama.` },
  olla: { en: msg`to be`, note: msg`The -da infinitive of olema.` },
  olnud: { en: msg`with ei: wasn’t, weren’t`, note: msg`The -nud form of olema.` },
  minema: { en: msg`to go` },
  läinud: { en: msg`with ei: didn’t go`, note: msg`The -nud form of minema.` },
  teinud: { en: msg`with ei: didn’t do, didn’t make`, note: msg`The -nud form of tegema.` },
  näinud: { en: msg`with ei: didn’t see`, note: msg`The -nud form of nägema.` },
  söönud: { en: msg`with ei: didn’t eat`, note: msg`The -nud form of sööma.` },
  joonud: { en: msg`with ei: didn’t drink`, note: msg`The -nud form of jooma.` },
  tahtma: { en: msg`to want`, note: msg`Its present is tahan.` },
  tahta: { en: msg`to want`, note: msg`The -da infinitive of tahtma.` },
  tahtnud: { en: msg`with ei: didn’t want`, note: msg`The -nud form of tahtma.` },
  "ma ei tahtnud": { en: msg`I didn’t want to.`, show: "Ma ei tahtnud" },
  "kas sa käisid poes?": { en: msg`Did you go to the shop?`, show: "Kas sa käisid poes?" },
  "ei käinud": {
    en: msg`didn’t go, didn’t visit`,
    note: msg`From käima, käia: to go somewhere and come back.`,
  },
  "ei lugenud": { en: msg`didn’t read` },
  "ei läinud": { en: msg`didn’t go` },
  "ei teinud": { en: msg`didn’t do, didn’t make` },
  "ei näinud": { en: msg`didn’t see` },
  "ei söönud": { en: msg`didn’t eat` },
  "ei joonud": { en: msg`didn’t drink` },
  "ei tahtnud": { en: msg`didn’t want` },
  "mul polnud aega": { en: msg`I had no time`, note: msg`Mul pole aega, in the past.` },
};

const TIME_LABELS: Record<(typeof PAST_NO_TIMELINE)[number]["id"], MessageDescriptor> = {
  "last-week": msg`Last week`,
  yesterday: msg`Yesterday`,
  today: msg`Today`,
};
const TIME_MEANS: Record<(typeof PAST_NO_TIMELINE)[number]["id"], MessageDescriptor> = {
  "last-week": msg`Last week I wasn’t in Tallinn.`,
  yesterday: msg`Yesterday I didn’t work.`,
  today: msg`Today I’m not working.`,
};

function NudFrom({ verb }: { verb: Built }) {
  const da = daForm(verb);
  const nud = nudForm(verb);
  const ending = verb.da[1];
  return (
    <Trans>
      <b lang="et">{da}</b> drops <End>{ending}</End> and takes <End>nud</End>:{" "}
      <b lang="et">{nud}</b>.
    </Trans>
  );
}

function PersonTable() {
  const { t, i18n } = useLingui();
  const [name, setName] = useState<TableVerb["verb"]>("lugema");
  const verb = PAST_NO_TABLE.find((each) => each.verb === name) as TableVerb;
  const rows: ParadigmRow[] = PAST_NO_PERSONS.map((pronoun, i) => {
    const ending = verb.yes[i] ?? "";
    return {
      id: pronoun,
      label: i18n._(PERSON_LABELS[pronoun]),
      et: pronoun,
      cells: [
        {
          form: ending ? `${verb.stem}|${ending}` : verb.stem,
          src: src(pastYesSaid(pronoun, verb.stem, ending)),
          note: <Trans>With yes, the ending changes with the person.</Trans>,
        },
        {
          form: `ei ${verb.nud}`,
          src: src(pastNoSaid(pronoun, verb.nud)),
          note: (
            <Trans>
              With no, <Et>ei</Et> and the <End>nud</End> form, the same for every person.
            </Trans>
          ),
        },
      ],
    };
  });
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Verbs`}
        items={PAST_NO_TABLE.map((each) => ({ label: each.verb, value: each.verb, lang: "et" }))}
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
        {i18n._(MEANS[name] as MessageDescriptor)}
      </p>
      <Paradigm
        key={name}
        label={t`Yes and no in the past`}
        columns={[t`Yes, in the past`, t`No, in the past`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a form`,
          tip: t`You’ll hear it with its pronoun.`,
        }}
      />
    </Panel>
  );
}

const WHOLE_MEANS: Record<WholeVerb["verb"], MessageDescriptor> = {
  minema: msg`I didn’t go to work.`,
  tegema: msg`I didn’t do any work.`,
  nägema: msg`I didn’t see the cat.`,
  sööma: msg`I didn’t eat at home.`,
  jooma: msg`I didn’t drink coffee.`,
};

const WHOLE_TIPS: Record<WholeVerb["verb"], ReactNode> = {
  minema: (
    <Trans>
      From <Et>minema</Et>. Neither <Et>minna</Et> nor <Et>läksin</Et> gives it: learn{" "}
      <Et>läinud</Et> as it is.
    </Trans>
  ),
  tegema: (
    <Trans>
      From <Et>tegema</Et>: the g becomes i, <Et>tei-</Et>, then <End>nud</End>. <Et>Näinud</Et>{" "}
      goes the same way.
    </Trans>
  ),
  nägema: (
    <Trans>
      From <Et>nägema</Et>: the g becomes i, <Et>näi-</Et>, then <End>nud</End>, as in{" "}
      <Et>teinud</Et>.
    </Trans>
  ),
  sööma: (
    <Trans>
      From <Et>sööma</Et>: the stem <Et>söö-</Et>, then <End>nud</End>.
    </Trans>
  ),
  jooma: (
    <Trans>
      From <Et>jooma</Et>: the stem <Et>joo-</Et>, then <End>nud</End>, as in <Et>söönud</Et>.
    </Trans>
  ),
};

type Kind = "now" | "past";
type WhenItem = ChoiceItem & { said: string; pair: readonly [string, string] };

const KIND_LABELS: Record<Kind, MessageDescriptor> = { now: msg`Now`, past: msg`In the past` };

const kindOptions = (kinds: readonly Kind[], i18n: I18n) =>
  kinds.map((kind) => ({
    id: kind,
    label: <span lang={i18n.locale}>{i18n._(KIND_LABELS[kind])}</span>,
  }));

const WHEN_MEANS: Record<string, MessageDescriptor> = {
  "Ta pole kodus.": msg`He or she isn’t at home.`,
  "Ta polnud kodus.": msg`He or she wasn’t at home.`,
  "Mari ei tule koju.": msg`Mari isn’t coming home.`,
  "Mari ei tulnud koju.": msg`Mari didn’t come home.`,
  "Ta ei lähe tööle.": msg`He or she isn’t going to work.`,
  "Ta ei läinud tööle.": msg`He or she didn’t go to work.`,
  "Me ei söö leiba.": msg`We don’t eat bread.`,
  "Me ei söönud leiba.": msg`We didn’t eat any bread.`,
  "Sa ei joo vett.": msg`You don’t drink water.`,
  "Sa ei joonud vett.": msg`You didn’t drink any water.`,
  "Te ei loe raamatut.": msg`You aren’t reading the book.`,
  "Te ei lugenud raamatut.": msg`You didn’t read the book.`,
  "Nad ei ela Tartus.": msg`They don’t live in Tartu.`,
  "Nad ei elanud Tartus.": msg`They didn’t live in Tartu.`,
};

export function whenItems(i18n: I18n): WhenItem[] {
  return PAST_NO_WHEN.flatMap((each, i) =>
    (["past", "now"] as const).map((kind, k) => {
      const said = each[kind];
      return {
        src: src(said),
        answer: kind,
        said,
        pair: [each.verb, `${each.verb}-${kind}`] as const,
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

type MadeItem = FormItem & { pair: readonly [string, string] };

const FIRST_MADE = "tulema";

export function madeItems(i18n: I18n): MadeItem[] {
  const asked = (NUD_BUILT as readonly Built[]).filter(
    (verb) => !(NUD_SHOWN as readonly string[]).includes(verb.ma),
  );
  const first = asked.filter((verb) => verb.ma === FIRST_MADE);
  return [...first, ...asked.filter((verb) => verb.ma !== FIRST_MADE)].map((verb) => {
    const nud = nudForm(verb);
    return {
      pair: [verb.pattern, verb.ma] as const,
      base: daForm(verb),
      gloss: i18n._(MEANS[verb.ma] as MessageDescriptor),
      cue: (
        <Trans>
          its <End>nud</End> form
        </Trans>
      ),
      answers: [nud, `ei ${nud}`],
      src: src(nud),
      explain: <NudFrom verb={verb} />,
    };
  });
}

const LONG: Record<string, string> = {
  Ma: "Mina",
  Sa: "Sina",
  Ta: "Tema",
  Me: "Meie",
  Te: "Teie",
  Nad: "Nemad",
};

export function noAnswers(said: string): [string, ...string[]] {
  const [first, ...rest] = said.split(" ");
  const long = first && LONG[first] ? [[LONG[first], ...rest].join(" ")] : [];
  const both = [said, ...long];
  const polnud = both.flatMap((each) =>
    each.includes(" ei olnud ") ? [each.replace(" ei olnud ", " polnud ")] : [],
  );
  return [said, ...long, ...polnud];
}

export function rewriteItems(i18n: I18n): SentenceItem[] {
  return PAST_NO_REWRITE.map(({ id, from, to }) => ({
    kind: "rewrite",
    id: `no-${id}`,
    from,
    cue: i18n._(msg`say no`),
    src: src(to),
    answers: id === "tool" ? [...noAnswers(to), "Eile ma ei läinud tööle."] : noAnswers(to),
  }));
}

const FIX_WHY: Record<(typeof PAST_NO_FIX)[number]["id"], ReactNode> = {
  laksin: (
    <Trans>
      After <Et>ei</Et>, the <End>nud</End> form, not the past with its ending: <Et>ei läinud</Et>.
    </Trans>
  ),
  oli: (
    <Trans>
      After <Et>ei</Et>, <Et>olnud</Et>: <Et>ta ei olnud</Et>, or in one word, <Et>ta polnud</Et>.
    </Trans>
  ),
  kaisime: (
    <Trans>
      After <Et>ei</Et>, <Et>me</Et> takes the same form as every other person:{" "}
      <Et>me ei käinud</Et>.
    </Trans>
  ),
  tootanud: (
    <Trans>
      <Et>Eile</Et> puts it in the past, so the <End>nud</End> form: <Et>ei töötanud</Et>.
    </Trans>
  ),
  soonud: (
    <Trans>
      <Et>Eile</Et> puts it in the past, so the <End>nud</End> form: <Et>ei söönud</Et>.
    </Trans>
  ),
  lugesite: (
    <Trans>
      After <Et>ei</Et>, the <End>nud</End> form for every person: <Et>te ei lugenud</Et>.
    </Trans>
  ),
};

export function fixItems(): FixItem[] {
  return PAST_NO_FIX.map(({ id, wrong, right }) => ({
    kind: "fix",
    id: `fix-${id}`,
    wrong,
    answers: [right],
    src: src(right),
    explain: FIX_WHY[id],
  }));
}

function weekendQuestions(i18n: I18n): PassageQuestion[] {
  const label = (text: MessageDescriptor) => i18n._(text);
  return [
    {
      kind: "truefalse",
      id: "jaan-work",
      ask: label(msg`Jaan went to work on Saturday.`),
      answer: false,
      line: 2,
    },
    {
      id: "why-shop",
      ask: label(msg`Why didn’t Jaan go to the shop?`),
      options: [
        { id: "closed", label: label(msg`The shop was closed.`) },
        { id: "time", label: label(msg`He had no time.`) },
        { id: "ill", label: label(msg`He was ill.`) },
      ],
      answer: "time",
      line: 4,
    },
    {
      kind: "short",
      id: "who-came",
      ask: label(msg`Who came from Tartu? Write one or two words in Estonian.`),
      answers: ["ema", "minu ema", "tema ema", "ta ema", "Jaani ema"],
      line: 5,
    },
    {
      kind: "truefalse",
      id: "ate-home",
      ask: label(msg`Jaan and his mother ate at home.`),
      answer: true,
      line: 8,
    },
    {
      id: "kati-where",
      ask: label(msg`Where was Kati on Saturday?`),
      options: [
        { id: "home", label: label(msg`At home`) },
        { id: "tallinn", label: label(msg`In Tallinn`) },
        { id: "tartu", label: label(msg`In Tartu`) },
      ],
      answer: "tallinn",
      line: 11,
    },
    {
      id: "kati-sunday",
      ask: label(msg`What did Kati do on Sunday?`),
      options: [
        { id: "town", label: label(msg`She went into town.`) },
        { id: "work", label: label(msg`She worked all day.`) },
        { id: "read", label: label(msg`She read at home.`) },
      ],
      answer: "read",
      line: 13,
    },
    {
      kind: "truefalse",
      id: "kati-town",
      ask: label(msg`On Sunday Kati wanted to go to town.`),
      answer: false,
      line: 14,
    },
    {
      kind: "truefalse",
      id: "kati-shop",
      ask: label(msg`Kati went to the shop at the weekend.`),
      answer: false,
      line: 16,
    },
    {
      id: "meet",
      ask: label(msg`When will Kati and Jaan meet at the shop?`),
      options: [
        { id: "five", label: label(msg`At five`) },
        { id: "seven", label: label(msg`At seven`) },
        { id: "six", label: label(msg`At six`) },
      ],
      answer: "six",
      line: 22,
    },
  ];
}

function useContent() {
  const { t, i18n } = useLingui();
  const verbForms = lessonBySlug("verbi-pohivormid")?.n;
  return useMemo(() => {
    const points: TimelinePoint[] = PAST_NO_TIMELINE.map((point) => ({
      id: point.id,
      label: i18n._(TIME_LABELS[point.id]),
      et: point.et,
      at: point.at,
      examples: [
        {
          sentence: point.sentence,
          meaning: i18n._(TIME_MEANS[point.id]),
          src: src(point.sentence),
          build: [
            { form: "ei", note: t`no, for every person` },
            {
              form: point.build,
              note: point.at < 0 ? t`the -nud form` : t`the present, without its ending`,
            },
          ],
        },
      ],
    }));

    const chains: MorphChain[] = (NUD_BUILT as readonly Built[])
      .filter((verb) => (NUD_SHOWN as readonly string[]).includes(verb.ma))
      .map((verb) => ({
        id: verb.ma,
        steps: [
          { word: verb.ma, label: i18n._(MEANS[verb.ma] as MessageDescriptor), src: src(verb.ma) },
          {
            word: daForm(verb),
            label: t`the infinitive`,
            src: src(daForm(verb)),
            note: (
              <Trans>
                The <End>da</End> infinitive from lesson {verbForms}.
              </Trans>
            ),
          },
          {
            word: nudForm(verb),
            label: t`with no, in the past`,
            src: src(nudForm(verb)),
            note: <NudFrom verb={verb} />,
          },
        ],
      }));

    const whole = NUD_WHOLE.map((verb) => ({
      label: verb.nud,
      sub: verb.verb,
      src: src(verb.said),
      detail: {
        title: (
          <>
            <span lang="et">{verb.said}</span>{" "}
            <small className="ms-1 text-md font-normal text-ink-secondary">
              {i18n._(WHOLE_MEANS[verb.verb])}
            </small>
          </>
        ),
        tip: WHOLE_TIPS[verb.verb],
      },
    }));
    const whenRun = (items: readonly WhenItem[], pinned?: WhenItem): WhenItem[] =>
      eachPairFirst(items, pinned).map((item) =>
        item === pinned ? item : { ...item, options: kindOptions(shuffle(["now", "past"]), i18n) },
      );

    const said = (clip: keyof typeof PAST_NO_DIALOGUE) => {
      const line = PAST_NO_DIALOGUE[clip];
      return typeof line === "string" ? line : line.text;
    };
    const talk: DialogueTurn[] = [
      { who: "them", clip: "d-mari-1", line: said("d-mari-1") },
      {
        who: "you",
        clip: "d-sina-1",
        replies: [
          { line: said("d-sina-1"), right: true },
          {
            line: "Ei, ma ei käi.",
            why: (
              <Trans>
                <Et>Ei käi</Et> is no, now. Mari asked about yesterday.
              </Trans>
            ),
          },
          {
            line: "Jah, ma käin poes.",
            why: (
              <Trans>
                You didn’t go to the shop, and <Et>käin</Et> is the present.
              </Trans>
            ),
          },
        ],
      },
      { who: "them", clip: "d-mari-2", line: said("d-mari-2") },
      {
        who: "you",
        clip: "d-sina-2",
        replies: [
          {
            line: "Jah, mul on palju aega.",
            why: (
              <Trans>
                <Et>Mul on palju aega</Et> means “I have a lot of time”, and it’s about now. Mari
                asked why you didn’t go, and you had no time.
              </Trans>
            ),
          },
          {
            line: "Mul pole aega.",
            why: (
              <Trans>
                <Et>Pole</Et> is no, now. In the past it is <Et>polnud</Et>.
              </Trans>
            ),
          },
          { line: said("d-sina-2"), right: true },
        ],
      },
      { who: "them", clip: "d-mari-3", line: said("d-mari-3") },
      {
        who: "you",
        clip: "d-sina-3",
        replies: [
          {
            line: "Ma ei töötanud kodus.",
            why: (
              <Trans>
                That says you didn’t work at home, but you did. Answer with yes in the past.
              </Trans>
            ),
          },
          { line: said("d-sina-3"), right: true },
          {
            line: "Ei, ma ei tööta kodus.",
            why: (
              <Trans>
                <Et>Ei tööta</Et> is no, now. You worked at home yesterday.
              </Trans>
            ),
          },
        ],
      },
      { who: "them", clip: "d-mari-4", line: said("d-mari-4") },
      {
        who: "you",
        clip: "d-sina-4",
        replies: [
          { line: said("d-sina-4"), right: true },
          {
            line: "Ei, ta ei oli.",
            why: (
              <Trans>
                After <Et>ei</Et>, the <End>nud</End> form: <Et>ei olnud</Et>, never <Et>ei oli</Et>
                .
              </Trans>
            ),
          },
          {
            line: "Jah, ta oli.",
            why: <Trans>Jaan wasn’t at home, so the answer is no.</Trans>,
          },
        ],
      },
    ];

    return {
      points,
      chains,
      whole,
      made: madeItems(i18n),
      when: whenItems(i18n),
      whenRun,
      talk,
      rewrite: rewriteItems(i18n),
      fix: fixItems(),
      weekend: weekendQuestions(i18n),
    };
  }, [t, i18n, verbForms]);
}

export function MinevikuEitusLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const negation = lessonBySlug("eitus")?.n;
  const verbForms = lessonBySlug("verbi-pohivormid")?.n;
  const infinitives = lessonBySlug("tegevusnimed")?.n;
  const past = lessonBySlug("lihtminevik")?.n;
  const haveRead = lessonBySlug("olen-lugenud")?.n;

  const bins: SortBin[] = [
    {
      id: "now",
      label: t`No, now`,
      lang: i18n.locale,
      hint: (
        <Trans>
          as in <Et>ei tööta</Et>
        </Trans>
      ),
      rule: (
        <Trans>
          <Et>Ei</Et> and the present without its ending: <Et>ei tööta</Et>. <Et>Pole</Et> is{" "}
          <Et>ei ole</Et>.
        </Trans>
      ),
    },
    {
      id: "yes",
      label: t`Yes, in the past`,
      lang: i18n.locale,
      hint: (
        <Trans>
          as in <Et>töötasin</Et>
        </Trans>
      ),
      rule: (
        <Trans>
          The past from lesson {past}: without <Et>ei</Et>, and with an ending that says who, as in{" "}
          <Et>töötasin</Et>.
        </Trans>
      ),
    },
    {
      id: "no",
      label: t`No, in the past`,
      lang: i18n.locale,
      hint: (
        <Trans>
          as in <Et>ei töötanud</Et>
        </Trans>
      ),
      rule: (
        <Trans>
          <Et>Ei</Et> and the <End>nud</End> form: <Et>ei töötanud</Et>. <Et>Polnud</Et> is{" "}
          <Et>ei olnud</Et>.
        </Trans>
      ),
    },
  ];
  const sort: SortItem[] = PAST_NO_SORT.map((each) => ({
    w: each.w,
    bin: each.bin,
    src: src(each.w),
  }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Put <Et>ei</Et> before the verb’s <End>nud</End> form: <Et>ma ei läinud</Et>, I didn’t go.
          As in the present, it stays the same for every person.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">5 quizzes, a conversation and a recording you can play twice</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "ei lugenud",
        "ei olnud",
        "polnud",
        "ei läinud",
        "ei teinud",
        "ei näinud",
        "ei söönud",
        "ei joonud",
        "ei käinud",
        "ei tahtnud",
        "mul polnud aega",
      ]}
      recap={[
        <Trans key="1">
          To say no in the past, put <b lang="et">ei</b> before the <End>nud</End> form:{" "}
          <b lang="et">ma ei läinud</b>, I didn’t go.
        </Trans>,
        <Trans key="2">
          It is the same for every person: <b lang="et">ma ei lugenud, nad ei lugenud</b>.{" "}
          <b lang="et">Ei olnud</b> has a one-word form, <b lang="et">polnud</b>.
        </Trans>,
        <Trans key="3">
          For the verbs of lesson {verbForms} whose <End>da</End> infinitive ends in <End>da</End>,{" "}
          <End>ta</End> or <End>la</End>, swap that ending for <End>nud</End>:{" "}
          <b lang="et">elada, elanud; oodata, oodanud; olla, olnud</b>.
        </Trans>,
        <Trans key="4">
          Learn five by heart: <b lang="et">läinud, teinud, näinud, söönud, joonud</b>.{" "}
          <b lang="et">Tahtma</b> keeps its t: <b lang="et">tahtnud</b>.
        </Trans>,
        <Trans key="5">
          To answer a question about the past with no, say <b lang="et">ei</b> and the{" "}
          <End>nud</End> form: <b lang="et">Kas sa käisid poes? Ei käinud.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "yesterday",
          title: t`No, in the past`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {negation}, <Word w="ei" /> went before the verb and the verb lost its
                    ending:{" "}
                    <Nowrap>
                      <Word w="Täna ma ei tööta" />.
                    </Nowrap>{" "}
                    In the past, <Et>ei</Et> stays and the verb takes its <End>nud</End> form:{" "}
                    <Nowrap>
                      <Word w="Eile ma ei töötanud" />.
                    </Nowrap>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Lesson {past} taught the past with yes, where each person has its own ending:{" "}
                    <Word w="töötasin" />, I worked. With no, there is no person ending:{" "}
                    <Word w="ma ei töötanud" />, I didn’t work. Tap a time on the line to hear its
                    sentence.
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
            </>
          ),
        },
        {
          id: "persons",
          title: t`The same for every person`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    With yes, the ending changes with the person: <b lang="et">lugesin</b>,{" "}
                    <b lang="et">lugesid</b>, <b lang="et">luges</b>. With no, all six share one
                    form:{" "}
                    <Nowrap>
                      <Word w="ma ei lugenud" />,
                    </Nowrap>{" "}
                    <Nowrap>
                      <Word w="nad ei lugenud" />.
                    </Nowrap>{" "}
                    The pronoun says who, as in the present.
                  </Trans>
                </p>
                <p>
                  <Trans>Pick a verb and tap a form.</Trans>
                </p>
              </Prose>
              <PersonTable />
              <Aside>
                <Trans>
                  <Word w="Ei olnud" /> has a one-word form, <Word w="polnud" />, as{" "}
                  <b lang="et">ei ole</b> has <b lang="et">pole</b>:{" "}
                  <Nowrap>
                    <Word w="Ma polnud kodus" />.
                  </Nowrap>{" "}
                  Both mean the same.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "from-da",
          title: t`The -nud form`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Most verbs build the <End>nud</End> form on the <End>da</End> infinitive from
                    lesson {verbForms}. Take off <End>da</End> and add <End>nud</End>:{" "}
                    <Nowrap>
                      <Word w="elada" />,
                    </Nowrap>{" "}
                    <Nowrap>
                      <Word w="elanud" />;
                    </Nowrap>{" "}
                    <Nowrap>
                      <Word w="lugeda" />,
                    </Nowrap>{" "}
                    <Nowrap>
                      <Word w="lugenud" />.
                    </Nowrap>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The same goes for <End>ta</End> and <End>la</End>: <Word w="oodata" />,{" "}
                    <Word w="oodanud" />; <Word w="olla" />,{" "}
                    <Nowrap>
                      <Word w="olnud" />.
                    </Nowrap>{" "}
                    All twelve verbs in lesson {verbForms} whose <End>da</End> infinitive ends in{" "}
                    <End>da</End>, <End>ta</End> or <End>la</End> work like this. Pick a verb and
                    tap its forms.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Morph label={t`Verbs`} chains={content.chains} />
              </Panel>
              <Prose>
                <p>
                  <Trans>
                    Grammars call it the <End>nud</End> participle, <Et>nud-kesksõna</Et>. The map
                    below shows it among the forms built on the <End>da</End> infinitive, beside the
                    ones you already know.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <FormMap
                  kind="verb"
                  start={{ word: "tegema", use: "didnt" }}
                  known={usesTaughtBy(SLUG)}
                />
              </Panel>
            </>
          ),
        },
        {
          id: "make",
          title: t`Make the -nud form`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    See a verb’s <End>da</End> infinitive and type its <End>nud</End> form, then
                    hear it. The keys under the field type õ, ä, ö, ü, š and ž.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-nud"
                title={
                  <Trans>
                    Make the <End>nud</End> form
                  </Trans>
                }
                items={content.made}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All six. You swapped <End>da</End>, <End>ta</End> and <End>la</End> for{" "}
                      <End>nud</End> every time.
                    </Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Go back to the verbs above, then try again.</Trans>
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
          id: "whole",
          title: t`Five to learn by heart`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Minema" /> and the four verbs in lesson {verbForms} whose <End>da</End>{" "}
                    infinitive ends in a bare <End>a</End> don’t follow that rule. Learn their{" "}
                    <End>nud</End> forms as they are:{" "}
                    <Nowrap>
                      <Word w="läinud" />,
                    </Nowrap>{" "}
                    <Nowrap>
                      <Word w="teinud" />,
                    </Nowrap>{" "}
                    <Nowrap>
                      <Word w="näinud" />,
                    </Nowrap>{" "}
                    <Nowrap>
                      <Word w="söönud" />,
                    </Nowrap>{" "}
                    <Nowrap>
                      <Word w="joonud" />.
                    </Nowrap>
                  </Trans>
                </p>
                <p>
                  <Trans>Tap a form to hear it in a sentence.</Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`Five -nud forms to learn by heart`}
                  columns={5}
                  phoneColumns={3}
                  empty={{
                    title: <Trans>Tap a form</Trans>,
                    tip: <Trans>You’ll hear the form in a sentence.</Trans>,
                  }}
                  items={content.whole}
                />
              </Panel>
              <Aside>
                <Trans>
                  <Word w="Tahtma" />, to want, from lesson {infinitives}, keeps its t:{" "}
                  <Word w="tahta" /> drops only its a before <End>nud</End>, so the form is{" "}
                  <Nowrap>
                    <Word w="tahtnud" />.
                  </Nowrap>{" "}
                  <Nowrap>
                    <Word w="Ma ei tahtnud" />.
                  </Nowrap>
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "when",
          title: t`Now or in the past`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence with no and pick whether it’s about now or the past. Listen to
                    the verb: <b lang="et">ei tööta</b> is now, <b lang="et">ei töötanud</b> is the
                    past.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="now-or-past-no"
                title={<Trans>Now or in the past?</Trans>}
                items={content.when}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven. You told now from the past every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the times on the line above once more, then try again.</Trans>
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
          id: "sort",
          title: t`No, now; yes and no, in the past`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Put each form in its group, then check. Tap a form to hear it.</Trans>
                </p>
              </Prose>
              <Sort
                id="yes-or-no-then"
                title={<Trans>Which group?</Trans>}
                bins={bins}
                items={sort}
              />
            </>
          ),
        },
        {
          id: "say-no",
          title: t`Say it with no`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence says what someone did. Write it with no: <Et>ei</Et> before the
                    verb, and the verb in its <End>nud</End> form. The rest of the sentence stays as
                    it is.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="say-no-past"
                title={<Trans>Write it with no</Trans>}
                items={content.rewrite}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All six, every one with <Et>ei</Et> and the <End>nud</End> form.
                    </Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Most of them. Check the -nud forms you missed in the sections above.
                    </Trans>
                  ) : (
                    <Trans>
                      Go back to the table under “The same for every person” and the five forms,
                      then try again.
                    </Trans>
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
                    Each sentence has one wrong word: a past ending kept after <Et>ei</Et>, or the
                    present where the past belongs. Tap it, then write it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-past-no"
                title={<Trans>Find and fix the mistake</Trans>}
                items={content.fix}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Look again at the ones you missed.</Trans>
                  ) : (
                    <Trans>
                      In the past, <Et>ei</Et> takes the <End>nud</End> form: <Et>ei läinud</Et>,
                      never <Et>ei läksin</Et> or <Et>ei lähe</Et>. Try again.
                    </Trans>
                  )
                }
                recall={fixRecall}
                round={(props) => <FixRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "answer",
          title: t`Answering no`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To answer a question about the past with no, say <Et>ei</Et> and the{" "}
                    <End>nud</End> form:{" "}
                    <Nowrap>
                      <Word w="Kas sa käisid poes?" />
                    </Nowrap>{" "}
                    <Nowrap>
                      <Word w="Ei käinud" />.
                    </Nowrap>{" "}
                    Lesson {negation} showed the same short answer in the present:{" "}
                    <b lang="et">Ei loe</b>, I don’t read.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Your friend Mari asks about yesterday. A wrong reply shows why it’s wrong, then
                    you hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="yesterday-no"
                title={<Trans>Talk: Mari asks about yesterday</Trans>}
                part={
                  <Trans>
                    Yesterday you worked at home all day and had no time to go to the shop. Your
                    flatmate Jaan wasn’t at home. Mari speaks first; pick what you say back.
                  </Trans>
                }
                them={t`Mari`}
                turns={content.talk}
              />
            </>
          ),
        },
        {
          id: "weekend",
          title: t`Listen: the weekend`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    On Monday morning Kati and Jaan talk about the weekend: what they did, and what
                    they didn’t. Read the questions first. You can play the recording twice, as in
                    the A2 exam.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="weekend"
                title={<Trans>Listen: Kati and Jaan’s weekend</Trans>}
                clip="c-weekend"
                turns={PAST_NO_TALK.turns}
                names={{ third: "Kati", main: "Jaan" }}
                questions={content.weekend}
                plays={2}
              />
              <Aside>
                <Trans>
                  The <End>nud</End> form comes back in lesson {haveRead}, where{" "}
                  <b lang="et">olen lugenud</b> means I have read.
                </Trans>
              </Aside>
            </>
          ),
        },
      ]}
    />
  );
}
