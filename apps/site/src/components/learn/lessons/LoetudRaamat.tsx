import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  PART_CASES,
  PART_CONVERSATION,
  PART_FIX_ANSWERS,
  PART_FIXES,
  PART_GAPS,
  PART_HEARD,
  PART_LETTER,
  PART_NUD,
  PART_TRANSLATE,
  PART_TUD,
  PART_V,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "loetud-raamat";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Kind = "tud" | "nud" | "v";
type Meaning = "now" | "did" | "done";

const GLOSSARY: Glossary = {
  "loetud raamat": { en: msg`a book that has been read`, note: msg`Loetakse, loetud.` },
  "suletud uks": { en: msg`a closed door`, note: msg`Suletakse, suletud.` },
  "tehtud töö": { en: msg`work that has been done`, note: msg`Tehakse, tehtud.` },
  "avatud aken": { en: msg`an open window, one that someone opened` },
  "väsinud mees": { en: msg`a tired man`, note: msg`Väsima, väsinud.` },
  "kukkunud leht": { en: msg`a fallen leaf`, note: msg`Kukkuma, kukkunud.` },
  "kuivanud lill": { en: msg`a dried-out flower` },
  "kadunud kass": { en: msg`a lost cat` },
  "jooksev vesi": { en: msg`running water`, note: msg`Jookseb, jooksev.` },
  "magav laps": { en: msg`a sleeping child`, note: msg`Magab, magav.` },
  "sulav jää": { en: msg`melting ice` },
  "tulev nädal": { en: msg`next week, the coming week` },
};

const TUD_MEANS: Record<(typeof PART_TUD)[number]["verb"], MessageDescriptor> = {
  lugema: msg`to read`,
  sulgema: msg`to close`,
  tegema: msg`to do, to make`,
  avama: msg`to open`,
  kirjutama: msg`to write`,
  pesema: msg`to wash`,
  müüma: msg`to sell`,
  tooma: msg`to bring`,
};

const NUD_MEANS: Record<(typeof PART_NUD)[number]["verb"], MessageDescriptor> = {
  väsima: msg`to get tired`,
  kukkuma: msg`to fall`,
  kuivama: msg`to dry out`,
  külmuma: msg`to freeze`,
  sulama: msg`to melt`,
  kaduma: msg`to go missing`,
  tulema: msg`to come`,
};

const V_MEANS: Record<(typeof PART_V)[number]["noun"], MessageDescriptor> = {
  "jooksev vesi": msg`to run`,
  "magav laps": msg`to sleep`,
  "kasvav puu": msg`to grow`,
  "töötav masin": msg`to work`,
  "lendav lind": msg`to fly`,
  "sulav jää": msg`to melt`,
  "tulev nädal": msg`to come`,
  "lugev laps": msg`to read`,
};

const KIND_NAMES: Record<Kind, MessageDescriptor> = {
  tud: msg`The -tud form`,
  nud: msg`The -nud form`,
  v: msg`The -v form`,
};

function ParticipleTable({ kind }: { kind: Kind }) {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] =
    kind === "tud"
      ? PART_TUD.map((each) => ({
          id: each.verb,
          label: i18n._(TUD_MEANS[each.verb]),
          cells: [
            { form: each.verb, src: src(each.verb) },
            { form: each.impersonal, src: src(each.impersonal) },
            { form: each.noun, src: src(each.noun) },
          ],
        }))
      : kind === "nud"
        ? PART_NUD.map((each) => ({
            id: each.verb,
            label: i18n._(NUD_MEANS[each.verb]),
            cells: [
              { form: each.verb, src: src(each.verb) },
              { form: each.noun, src: src(each.noun) },
            ],
          }))
        : PART_V.map((each) => ({
            id: each.noun,
            label: i18n._(V_MEANS[each.noun]),
            cells: [
              { form: each.verb, src: src(each.verb) },
              { form: each.ta, src: src(each.ta) },
              { form: each.noun, src: src(each.noun) },
            ],
          }));
  const columns =
    kind === "tud"
      ? [t`The verb`, t`Is done`, t`With a noun`]
      : kind === "nud"
        ? [t`The verb`, t`With a noun`]
        : [t`The verb`, t`He, she does`, t`With a noun`];
  const tip =
    kind === "tud" ? (
      <Trans>
        The -akse ending usually becomes -ud: <b lang="et">loetakse</b> gives{" "}
        <b lang="et">loetud</b>. A few verbs change their stem: <b lang="et">tehtud</b>,{" "}
        <b lang="et">müüdud</b>, <b lang="et">toodud</b>.
      </Trans>
    ) : kind === "nud" ? (
      <Trans>
        The <b lang="et">-ma</b> of the verb usually becomes -nud: <b lang="et">väsima</b> gives{" "}
        <b lang="et">väsinud</b>. Some verbs shorten or change: <b lang="et">tulema</b> gives{" "}
        <b lang="et">tulnud</b>.
      </Trans>
    ) : (
      <Trans>
        The -b of the he, she form usually becomes -v: <b lang="et">magab</b> gives{" "}
        <b lang="et">magav</b>. <b lang="et">Lugema</b> uses <b lang="et">lugev</b>.
      </Trans>
    );
  return (
    <Paradigm
      label={i18n._(KIND_NAMES[kind])}
      columns={columns}
      rows={rows}
      highlight={{ column: columns.length - 1 }}
      empty={{ title: t`Tap a form`, tip }}
    />
  );
}

const KIND_OPTIONS: Record<Meaning, MessageDescriptor> = {
  now: msg`It is doing it now`,
  did: msg`It has done it, or it has changed`,
  done: msg`Someone has done it to it`,
};

const MEANINGS: readonly Meaning[] = ["now", "did", "done"];

const CASE_ROWS = [
  { id: "nom", et: "nimetav", label: msg`Nominative` },
  { id: "gen", et: "omastav", label: msg`Genitive` },
  { id: "par", et: "osastav", label: msg`Partitive` },
  { id: "ine", et: "seesütlev", label: msg`In the …` },
] as const;

function CaseTable() {
  const { t, i18n } = useLingui();
  const [kind, setKind] = useState<"v" | "tud">("v");
  const tips: Record<"v" | "tud", ReactNode> = {
    v: (
      <Trans>
        The -v form is an adjective: it changes with its noun, <b lang="et">jooksva vee</b>,{" "}
        <b lang="et">jooksvat vett</b>.
      </Trans>
    ),
    tud: (
      <Trans>The -tud form usually stays the same in every case, and only the noun changes.</Trans>
    ),
  };
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Participle`}
        items={[
          { label: t`-v`, value: "v" as const },
          { label: t`-tud`, value: "tud" as const },
        ]}
        value={kind}
        onPick={setKind}
      />
      <Paradigm
        key={kind}
        label={t`One noun in four cases`}
        columns={[t`The phrase`]}
        rows={CASE_ROWS.map((row, i) => ({
          id: row.id,
          label: i18n._(row.label),
          et: row.et,
          cells: [{ form: PART_CASES[kind][i] as string, src: src(PART_CASES[kind][i] as string) }],
        }))}
        highlight={{ column: 0 }}
        empty={{ title: t`Tap a form`, tip: tips[kind] }}
      />
    </Panel>
  );
}

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const tud: MatchPair[] = PART_TUD.slice(0, 6).map((each) => ({
      id: `tud-${each.verb}`,
      left: each.impersonal,
      right: each.form,
      rightLang: "et",
      src: src(each.noun),
    }));
    const nud: MatchPair[] = PART_NUD.slice(0, 6).map((each) => ({
      id: `nud-${each.verb}`,
      left: each.verb,
      right: each.form,
      rightLang: "et",
      src: src(each.noun),
    }));
    const present: MatchPair[] = PART_V.slice(0, 6).map((each) => ({
      id: `v-${each.verb}`,
      left: each.ta,
      right: each.form,
      rightLang: "et",
      src: src(each.noun),
    }));

    const heardWhy: Record<Meaning, ReactNode> = {
      now: (
        <Trans>
          The -v form usually means the noun is doing it now: <b lang="et">magav</b> is sleeping.
        </Trans>
      ),
      did: (
        <Trans>
          The -nud form usually means the noun has done it or changed: <b lang="et">väsinud</b> has
          got tired.
        </Trans>
      ),
      done: (
        <Trans>
          The -tud form usually means someone has done it to the noun: <b lang="et">suletud</b> was
          closed.
        </Trans>
      ),
    };
    const heard: (ChoiceItem & { said: string; pair: readonly [string, string] })[] =
      PART_HEARD.map((item) => ({
        said: item.said,
        src: src(item.said),
        answer: item.kind,
        options: MEANINGS.map((id) => ({
          id,
          label: (
            <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
              {i18n._(KIND_OPTIONS[id])}
            </span>
          ),
        })),
        pair: [item.kind, item.id] as const,
        explain: heardWhy[item.kind],
      }));

    const gapGloss: Record<(typeof PART_GAPS)[number]["id"], MessageDescriptor> = {
      closed: msg`closed`,
      book: msg`read`,
      tired: msg`tired`,
      water: msg`running`,
      child: msg`sleeping`,
      flower: msg`dried out`,
      work: msg`done`,
      letter: msg`written`,
      week: msg`coming`,
      cat: msg`lost`,
    };
    const gapWhy: Record<(typeof PART_GAPS)[number]["id"], ReactNode> = {
      closed: (
        <Trans>
          Someone closed it: <b lang="et">suletud</b>.
        </Trans>
      ),
      book: (
        <Trans>
          Someone read it: <b lang="et">loetud</b>.
        </Trans>
      ),
      tired: (
        <Trans>
          He got tired himself: <b lang="et">väsinud</b>.
        </Trans>
      ),
      water: (
        <Trans>
          The water is running now, and the form follows <b lang="et">vett</b>:{" "}
          <b lang="et">jooksvat</b>.
        </Trans>
      ),
      child: (
        <Trans>
          The child is asleep now, and the form follows <b lang="et">last</b>:{" "}
          <b lang="et">magavat</b>.
        </Trans>
      ),
      flower: (
        <Trans>
          It dried out by itself: <b lang="et">kuivanud</b>.
        </Trans>
      ),
      work: (
        <Trans>
          Someone did the work: <b lang="et">tehtud</b>.
        </Trans>
      ),
      letter: (
        <Trans>
          Someone wrote it: <b lang="et">kirjutatud</b>.
        </Trans>
      ),
      week: (
        <Trans>
          The week is coming, and the form follows <b lang="et">nädalavahetust</b>:{" "}
          <b lang="et">tulevat</b>.
        </Trans>
      ),
      cat: (
        <Trans>
          The cat went missing: <b lang="et">kadunud</b>.
        </Trans>
      ),
    };
    const gaps: (FormItem & { pair: readonly [string, string] })[] = PART_GAPS.map((gap) => {
      const said = [gap.before, gap.answers[0], gap.after].filter(Boolean).join(" ");
      const starts = gap.before === "";
      return {
        base: gap.base,
        gloss: i18n._(gapGloss[gap.id]),
        cue: starts ? `… ${gap.after}` : `${gap.before} … ${gap.after}`,
        cueLang: "et",
        answers: starts ? [gap.answers[0], gap.answers[0].toLowerCase()] : gap.answers,
        src: src(said),
        said,
        explain: gapWhy[gap.id],
        pair: [gap.id, gap.id] as const,
      };
    });

    const prompts: Record<(typeof PART_TRANSLATE)[number]["id"], MessageDescriptor> = {
      car: msg`I bought a used car.`,
      leaf: msg`The fallen leaf is on the ground.`,
      water: msg`I can hear running water.`,
      man: msg`The tired man sat down on the bench.`,
      door: msg`She opened the closed door.`,
      cat: msg`We are looking for the lost cat.`,
      weekend: msg`I am looking forward to the coming weekend.`,
      work: msg`The finished work is on the table.`,
    };
    const translateWhy: Partial<Record<(typeof PART_TRANSLATE)[number]["id"], ReactNode>> = {
      water: (
        <Trans>
          The -v form changes with its noun: <b lang="et">jooksvat vett</b>.
        </Trans>
      ),
      weekend: (
        <Trans>
          The -v form changes with its noun: <b lang="et">tulevat nädalavahetust</b>.
        </Trans>
      ),
      cat: (
        <Trans>
          The noun changes and the -nud form usually stays: <b lang="et">kadunud kassi</b>.
        </Trans>
      ),
      door: (
        <Trans>
          The noun changes and the -tud form usually stays: <b lang="et">suletud ukse</b>.
        </Trans>
      ),
    };
    const translations: (SentenceItem & { pair: readonly [string, string] })[] = PART_TRANSLATE.map(
      (item) => ({
        kind: "translate",
        id: item.id,
        prompt: i18n._(prompts[item.id]),
        src: src(item.said),
        answers: item.answers,
        pair: [item.id, item.id] as const,
        explain: translateWhy[item.id],
      }),
    );

    const fixWhy: Record<(typeof PART_FIXES)[number]["right"], ReactNode> = {
      "Ta ostis kasutatud auto.": (
        <Trans>
          Someone used the car before, so it takes -tud: <b lang="et">kasutatud</b>.
        </Trans>
      ),
      "Kukkunud leht on maas.": (
        <Trans>
          The leaf has fallen: <b lang="et">kukkunud</b>. <b lang="et">Kukkuv</b> would be a leaf
          that is falling now.
        </Trans>
      ),
      "Ma nägin voodis magavat last.": (
        <Trans>
          The -v form changes with its noun: <b lang="et">magavat last</b>.
        </Trans>
      ),
      "Ma ootan tulevat nädalavahetust.": (
        <Trans>
          The -v form changes with its noun: <b lang="et">tulevat nädalavahetust</b>.
        </Trans>
      ),
      "Me otsime kadunud kassi.": (
        <Trans>
          The noun is the object, so it changes: <b lang="et">kassi</b>. <b lang="et">Kadunud</b>{" "}
          usually stays the same.
        </Trans>
      ),
      "Ma kuulen jooksvat vett.": (
        <Trans>
          The -v form changes with its noun: <b lang="et">jooksvat vett</b>.
        </Trans>
      ),
    };
    const fixes: FixItem[] = PART_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${clipId(item.right)}`,
      wrong: item.wrong,
      answers: PART_FIX_ANSWERS[item.right] ?? [item.right],
      src: src(item.right),
      explain: fixWhy[item.right],
    }));

    const letter: PassageQuestion[] = [
      {
        id: "garden",
        ask: t`What did the writer see in the garden?`,
        options: [
          { id: "cellar", label: t`Water in the cellar` },
          { id: "tree", label: t`A tree that had fallen` },
          { id: "fence", label: t`A broken fence` },
        ],
        answer: "tree",
        line: 2,
      },
      {
        id: "stream",
        kind: "truefalse",
        ask: t`The stream had more water than usual.`,
        answer: true,
        line: 4,
      },
      {
        id: "helper",
        ask: t`Who came to help?`,
        options: [
          { id: "brother", label: t`Her brother from town` },
          { id: "friend", label: t`A friend of her mother` },
          { id: "neighbour", label: t`A neighbour` },
        ],
        answer: "neighbour",
        line: 6,
      },
      {
        id: "rested",
        kind: "truefalse",
        ask: t`Tõnu looked fresh and rested.`,
        answer: false,
        line: 7,
      },
      {
        id: "bread",
        kind: "short",
        ask: t`What did Tõnu bring to eat? Write it as the text says.`,
        answers: ["küpsetatud saia", "saia"],
        line: 11,
      },
      {
        id: "sunny",
        kind: "truefalse",
        ask: t`Tõnu thinks next week will be sunny.`,
        answer: true,
        line: 13,
      },
      {
        id: "evening",
        ask: t`How did the writer feel in the evening?`,
        options: [
          { id: "pleased", label: t`Pleased, but very tired` },
          { id: "worried", label: t`Worried about another storm` },
          { id: "cold", label: t`Cold and unhappy` },
        ],
        answer: "pleased",
        line: 19,
      },
    ];

    const exam: PassageQuestion[] = [
      {
        id: "who",
        ask: t`Who left the farmhouse to Tiit?`,
        options: [
          { id: "father", label: t`His father` },
          { id: "uncle", label: t`His uncle in the village` },
          { id: "friend", label: t`A friend of the family` },
        ],
        answer: "uncle",
        line: 1,
      },
      {
        id: "lived",
        kind: "truefalse",
        ask: t`Someone has lived in the house recently.`,
        answer: false,
        line: 4,
      },
      {
        id: "garden",
        ask: t`What is lying in the garden?`,
        options: [
          { id: "fence", label: t`A broken fence` },
          { id: "car", label: t`A rusty old car in the grass` },
          { id: "apple", label: t`A fallen apple tree` },
        ],
        answer: "apple",
        line: 6,
      },
      {
        id: "water",
        kind: "truefalse",
        ask: t`The house has running water.`,
        answer: false,
        line: 13,
      },
      {
        id: "table",
        ask: t`What is on the kitchen table?`,
        options: [
          { id: "papers", label: t`The uncle’s newspapers` },
          { id: "letters", label: t`Letters from the old neighbour` },
          { id: "books", label: t`A few old school books and pens` },
        ],
        answer: "papers",
        line: 18,
      },
      {
        id: "read",
        kind: "truefalse",
        ask: t`Tiit’s uncle read a lot.`,
        answer: true,
        line: 20,
      },
      {
        id: "cat",
        ask: t`Whose cat might the sleeping cat be?`,
        options: [
          { id: "liis", label: t`Hers, Liis’s` },
          { id: "mari", label: t`The neighbour Mari’s` },
          { id: "uncle", label: t`The uncle’s old cat from the farm` },
        ],
        answer: "mari",
        line: 24,
      },
      {
        id: "brought",
        kind: "short",
        ask: t`What did Liis bring to eat or drink? Write one thing as she says it.`,
        answers: ["kuuma kohvi", "kohvi", "küpsetatud saia", "saia"],
        line: 35,
      },
      {
        id: "tired",
        kind: "truefalse",
        ask: t`Tiit feels well rested.`,
        answer: false,
        line: 37,
      },
      {
        id: "floor",
        ask: t`Why is the floor upstairs wet?`,
        options: [
          { id: "roof", label: t`Rain came in through a leaking roof.` },
          { id: "pipe", label: t`A water pipe burst in the cold.` },
          { id: "snow", label: t`Melting snow came in.` },
        ],
        answer: "snow",
        line: 43,
      },
      {
        id: "first",
        kind: "truefalse",
        ask: t`They decide to dry the floor first.`,
        answer: true,
        line: 45,
      },
    ];

    return { tud, nud, present, heard, gaps, translations, fixes, letter, exam };
  }, [t, i18n]);
}

export function LoetudRaamatLesson() {
  const { t } = useLingui();
  const content = useContent();
  const impersonal = lessonBySlug("raagitakse")?.n;
  const names = { fourth: t`Tiit`, third: t`Liis` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <b lang="et">Loetud raamat</b> is a book that has been read, and{" "}
          <b lang="et">väsinud mees</b> is a tired man: a verb can turn into an adjective, and its
          ending says who did what.
        </Trans>
      }
      facts={[
        <Trans key="m">26 minutes</Trans>,
        <Trans key="q">9 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "loetud raamat",
        "suletud uks",
        "tehtud töö",
        "avatud aken",
        "väsinud mees",
        "kukkunud leht",
        "kuivanud lill",
        "kadunud kass",
        "jooksev vesi",
        "magav laps",
        "sulav jää",
        "tulev nädal",
      ]}
      recap={[
        <Trans key="1">
          The -tud form usually says what was done to the noun: <b lang="et">loetud raamat</b>, a
          book that has been read. The -akse of the impersonal usually becomes -ud:{" "}
          <b lang="et">loetakse</b>, <b lang="et">loetud</b>. A few verbs change their stem:{" "}
          <b lang="et">tehtud</b>, <b lang="et">müüdud</b>, <b lang="et">toodud</b>.
        </Trans>,
        <Trans key="2">
          The -nud form usually says what the noun itself did or became: <b lang="et">väsinud</b>{" "}
          <b lang="et">mees</b>, <b lang="et">kukkunud leht</b>. The <b lang="et">-ma</b> of the
          verb usually becomes -nud; <b lang="et">tulema</b> gives <b lang="et">tulnud</b>.
        </Trans>,
        <Trans key="3">
          The -v form usually says what the noun is doing now: <b lang="et">jooksev vesi</b>,{" "}
          <b lang="et">magav laps</b>. The -b of the he, she form usually becomes -v.
        </Trans>,
        <Trans key="4">
          Usually only the -v form changes with its noun: <b lang="et">jooksva vee</b>,{" "}
          <b lang="et">jooksvat vett</b>. The -tud and -nud forms usually stay the same:{" "}
          <b lang="et">loetud raamatut</b>, <b lang="et">kadunud kassi</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "tud",
          title: t`Done to it: -tud`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {impersonal} showed the impersonal, such as <b lang="et">loetakse</b>, it
                    is read. Change -akse to -ud and you usually get an adjective for what was done
                    to the noun: <Word w="loetud raamat" /> is a book that has been read, and{" "}
                    <Word w="suletud uks" /> is a door that someone closed.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    A few verbs change their stem: <b lang="et">tehakse</b> gives{" "}
                    <b lang="et">tehtud</b>, so <Word w="tehtud töö" /> is work that has been done.
                    Tap the forms.
                  </Trans>
                </p>
              </Prose>
              <Panel className="gap-5">
                <ParticipleTable kind="tud" />
              </Panel>
              <Aside>
                <Trans>
                  Dictionaries call it the past passive participle. The noun is what received the
                  action, so it usually fits verbs that take an object.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Match each impersonal with its -tud form.</Trans>
                </p>
              </Prose>
              <Match
                id="tud-forms"
                title={<Trans>Which -tud form?</Trans>}
                pairs={content.tud}
                columns={[<Trans key="a">Is done</Trans>, <Trans key="b">-tud form</Trans>]}
              />
            </>
          ),
        },
        {
          id: "nud",
          title: t`It did it: -nud`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The -nud form usually says what the noun itself did or became. Usually you take
                    the verb and change <b lang="et">-ma</b> to -nud: <b lang="et">väsima</b> gives{" "}
                    <b lang="et">väsinud</b>, so <Word w="väsinud mees" /> is a man who has got
                    tired. Nobody tired him; it happened to him.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The same goes for <Word w="kukkunud leht" /> and <Word w="kadunud kass" />.{" "}
                    <b lang="et">Tulema</b> is one of the verbs that change: <b lang="et">tulnud</b>
                    . Tap the forms.
                  </Trans>
                </p>
              </Prose>
              <Panel className="gap-5">
                <ParticipleTable kind="nud" />
              </Panel>
              <Aside>
                <Trans>
                  With a verb that takes an object, -nud can name someone who has done it:{" "}
                  <b lang="et">palju lugenud inimene</b> is a person who has read a lot.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Match each verb with its -nud form.</Trans>
                </p>
              </Prose>
              <Match
                id="nud-forms"
                title={<Trans>Which -nud form?</Trans>}
                pairs={content.nud}
                columns={[<Trans key="a">The verb</Trans>, <Trans key="b">-nud form</Trans>]}
              />
            </>
          ),
        },
        {
          id: "v",
          title: t`Happening now: -v`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The -v form usually says what the noun is doing now. Usually you take the he,
                    she form of the verb and change -b to -v: <b lang="et">magab</b> gives{" "}
                    <b lang="et">magav</b>, so <Word w="magav laps" /> is a child who is asleep, and{" "}
                    <Word w="jooksev vesi" /> is water that is running.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    A few verbs use another stem, such as <b lang="et">lugema</b>, which gives{" "}
                    <b lang="et">lugev</b>. Tap the forms.
                  </Trans>
                </p>
              </Prose>
              <Panel className="gap-5">
                <ParticipleTable kind="v" />
              </Panel>
              <Prose>
                <p>
                  <Trans>Match each he, she form with its -v form.</Trans>
                </p>
              </Prose>
              <Match
                id="v-forms"
                title={<Trans>Which -v form?</Trans>}
                pairs={content.present}
                columns={[<Trans key="a">He, she does</Trans>, <Trans key="b">-v form</Trans>]}
              />
            </>
          ),
        },
        {
          id: "tell",
          title: t`Which of the three?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Ask who does the verb. If the noun is doing it now, usually use -v:{" "}
                    <Word w="sulav jää" />, melting ice. If the noun has done it or changed, usually
                    use -nud: <b lang="et">sulanud lumi</b>, melted snow. If someone else did it to
                    the noun, usually use -tud: <Word w="avatud aken" />, a window someone opened.
                  </Trans>
                </p>
                <p>
                  <Trans>Hear the sentence, then pick what the noun’s participle says.</Trans>
                </p>
              </Prose>
              <Quiz
                id="tell-apart"
                title={<Trans>What does it say?</Trans>}
                items={content.heard}
                rounds={9}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All nine: you heard who did the verb every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you got wrong once more.</Trans>
                  ) : (
                    <Trans>Go back to the three tables, then try again.</Trans>
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
          id: "make",
          title: t`Make the participle`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has a gap for the participle. The small word beside the verb says
                    what it should mean, so it tells you whether it is -v, -nud or -tud. Type it.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-participle"
                title={<Trans>Type the participle</Trans>}
                items={content.gaps}
                rounds={10}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All ten participles right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Read the reason under each one you got wrong.</Trans>
                  ) : (
                    <Trans>Go through the three tables once more, then try again.</Trans>
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
          id: "cases",
          title: t`The noun changes, the form usually doesn’t`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A noun changes with its job in the sentence. The -v form changes with it, like
                    an adjective: <b lang="et">jooksev vesi</b>, <b lang="et">jooksva vee</b>,{" "}
                    <b lang="et">jooksvat vett</b>. The -tud and -nud forms usually stay the same
                    before the noun, and only the noun changes: <b lang="et">loetud raamat</b>,{" "}
                    <b lang="et">loetud raamatut</b>.
                  </Trans>
                </p>
                <p>
                  <Trans>Pick a participle and tap the four cases.</Trans>
                </p>
              </Prose>
              <CaseTable />
              <Prose>
                <p>
                  <Trans>Write each sentence in Estonian.</Trans>
                </p>
              </Prose>
              <Quiz
                id="write-participle"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, each participle in the right form.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the participle and the noun in the ones you missed.</Trans>
                  ) : (
                    <Trans>Read What to remember below, then try again.</Trans>
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
                    Each sentence has one wrong word: the wrong participle, or a form that didn’t
                    change when it should have. Tap it, then type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-participle"
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
          id: "storm",
          title: t`A morning after the storm`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A villager writes about the morning after a storm. Read the text and answer the
                    questions, as in the reading part of the B1 exam.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="storm-morning"
                title={<Trans>What happened after the storm?</Trans>}
                by={t`A villager writes`}
                sentences={PART_LETTER}
                questions={content.letter}
              />
            </>
          ),
        },
        {
          id: "farm",
          title: t`A talk at the farmhouse`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Tiit has inherited an old farmhouse. His friend Liis comes to see it, and they
                    decide where to start.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="farmhouse"
                title={<Trans>Listen: Tiit and Liis</Trans>}
                clip="c-liis"
                turns={PART_CONVERSATION.turns}
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
