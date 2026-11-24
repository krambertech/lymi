import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  ROUTE_ANSWERS,
  ROUTE_CONVERSATION,
  ROUTE_FIX_ANSWERS,
  ROUTE_FIXES,
  ROUTE_FORMS,
  ROUTE_HEARD,
  ROUTE_MODEL,
  ROUTE_PAIRS,
  ROUTE_SORT,
  ROUTE_TABLE,
  ROUTE_TRAIL,
  ROUTE_TRANSLATE,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Sort, type SortItem } from "../Sort";
import { Word } from "../Word";
import { Writing } from "../Writing";

const SLUG = "labi-metsa";
const src = (text: string) => clipUrl(SLUG, clipId(text));
const plain = (form: string) => form.replace("|", "");

const MEANS: Record<(typeof ROUTE_TABLE)[number]["word"], MessageDescriptor> = {
  läbi: msg`through`,
  üle: msg`across, over`,
  mööda: msg`along`,
  ümber: msg`around`,
  kaudu: msg`via`,
};

const NOUNS: Record<string, MessageDescriptor> = {
  tee: msg`road, way`,
  jõgi: msg`river`,
  sild: msg`bridge`,
  tänav: msg`street`,
  meri: msg`sea`,
  aed: msg`garden, fence`,
  laud: msg`table`,
  sõber: msg`friend`,
  linn: msg`town`,
};

const GLOSSARY: Glossary = {
  läbi: { en: msg`through`, note: msg`With the genitive: läbi metsa.` },
  üle: { en: msg`across, over`, note: msg`With the genitive: üle tee.` },
  mööda: { en: msg`along`, note: msg`With the partitive: mööda teed.` },
  ümber: { en: msg`around`, note: msg`Usually after the genitive: järve ümber.` },
  kaudu: { en: msg`via, by way of`, note: msg`After the genitive: Riia kaudu.` },
  raba: { en: msg`bog` },
  laudtee: { en: msg`boardwalk` },
  vaatetorn: { en: msg`viewing tower` },
  matkarada: { en: msg`hiking trail` },
};

function WordTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = ROUTE_TABLE.map((each) => ({
    id: each.word,
    label: i18n._(MEANS[each.word]),
    cells: [
      { form: each.phrase, src: src(plain(each.phrase)) },
      { form: each.said.replace(/\.$/, ""), src: src(each.said) },
    ],
  }));
  return (
    <Panel>
      <Paradigm
        label={t`Five words for a way`}
        columns={[t`With a noun`, t`In a sentence`]}
        rows={rows}
        highlight={{ column: 0 }}
        empty={{
          title: t`Tap a form`,
          tip: (
            <Trans>
              The noun takes a case: <b lang="et">metsa</b> and <b lang="et">tee</b> are genitives,{" "}
              <b lang="et">teed</b> is a partitive.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

function PairTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = ROUTE_PAIRS.map((each) => ({
    id: each.noun,
    label: i18n._(NOUNS[each.noun] as MessageDescriptor),
    et: each.noun,
    cells: [
      {
        form: each.across,
        src: src(plain(each.across)),
        note: (
          <Trans>
            The genitive: <b lang="et">{plain(each.across)}</b>.
          </Trans>
        ),
      },
      {
        form: each.along,
        src: src(plain(each.along)),
        note: (
          <Trans>
            The partitive: <b lang="et">{plain(each.along)}</b>.
          </Trans>
        ),
      },
    ],
  }));
  return (
    <Panel>
      <Paradigm
        label={t`Across or along`}
        columns={[t`Across`, t`Along`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a form`,
          tip: (
            <Trans>
              One noun, two cases: the genitive after <b lang="et">üle</b>, the partitive after{" "}
              <b lang="et">mööda</b>.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

type Means = (typeof ROUTE_HEARD)[number]["means"];
const HEARD_LABELS: Record<Means, MessageDescriptor> = {
  through: msg`through`,
  across: msg`across`,
  along: msg`along`,
  around: msg`around`,
};

const pairRun = <T extends { pair: readonly [string, string] }>(items: readonly T[], pinned?: T) =>
  eachPairFirst(items, pinned);

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const pairs: MatchPair[] = ROUTE_TABLE.map((each) => ({
      id: each.word,
      left: each.word,
      right: i18n._(MEANS[each.word]),
      src: src(each.word),
    }));

    const options = (Object.keys(HEARD_LABELS) as Means[]).map((means) => ({
      id: means,
      label: (
        <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
          {i18n._(HEARD_LABELS[means])}
        </span>
      ),
    }));
    const heardWhy: Record<Means, ReactNode> = {
      through: (
        <Trans>
          <b lang="et">Läbi</b>: through.
        </Trans>
      ),
      across: (
        <Trans>
          <b lang="et">Üle</b>: across, over.
        </Trans>
      ),
      along: (
        <Trans>
          <b lang="et">Mööda</b>: along.
        </Trans>
      ),
      around: (
        <Trans>
          <b lang="et">Ümber</b>: around, before or after the noun.
        </Trans>
      ),
    };
    const heard: (ChoiceItem & { said: string; pair: readonly [string, string] })[] =
      ROUTE_HEARD.map((each) => ({
        said: each.said,
        src: src(each.said),
        answer: each.means,
        options,
        pair: [each.means, each.said] as const,
        explain: heardWhy[each.means],
      }));

    const sort: SortItem[] = ROUTE_SORT.map((each) => ({
      w: each.form,
      bin: each.bin,
      src: src(`${each.after} ${each.form}`),
    }));

    const forms: FormItem[] = ROUTE_FORMS.map((item) => ({
      base: item.noun,
      gloss: i18n._(NOUNS[item.noun] as MessageDescriptor),
      cue: item.cue,
      cueLang: "et",
      answers: [item.answer],
      src: src(item.said),
      said: item.said,
      explain: item.cue.includes("mööda") ? (
        <Trans>
          <b lang="et">Mööda</b> takes the partitive: <b lang="et">{item.answer}</b>.
        </Trans>
      ) : (
        <Trans>
          This word takes the genitive: <b lang="et">{item.answer}</b>.
        </Trans>
      ),
    }));

    const prompts: Record<(typeof ROUTE_TRANSLATE)[number], MessageDescriptor> = {
      "Me kõndisime läbi metsa.": msg`We walked through the forest.`,
      "Lapsed jooksid üle tee.": msg`The children ran across the road.`,
      "Ma kõnnin igal hommikul mööda randa.": msg`I walk along the beach every morning.`,
      "Me istusime laua ümber.": msg`We sat around the table.`,
      "Me lendasime Riia kaudu.": msg`We flew via Riga.`,
      "Kass hüppas läbi akna sisse.": msg`The cat jumped in through the window.`,
      "Me sõitsime üle silla.": msg`We drove across the bridge.`,
    };
    const translateWhy: Partial<Record<(typeof ROUTE_TRANSLATE)[number], ReactNode>> = {
      "Ma kõnnin igal hommikul mööda randa.": (
        <Trans>
          <b lang="et">Mööda</b> takes the partitive: <b lang="et">randa</b>.
        </Trans>
      ),
      "Me lendasime Riia kaudu.": (
        <Trans>
          <b lang="et">Kaudu</b> goes after the genitive: <b lang="et">Riia kaudu</b>.
        </Trans>
      ),
      "Kass hüppas läbi akna sisse.": (
        <Trans>
          <b lang="et">Läbi</b> takes the genitive: <b lang="et">akna</b>, from{" "}
          <b lang="et">aken</b>.
        </Trans>
      ),
    };
    const translations: (SentenceItem & { pair: readonly [string, string] })[] =
      ROUTE_TRANSLATE.map((said) => ({
        kind: "translate",
        id: clipId(said),
        prompt: i18n._(prompts[said]),
        src: src(said),
        answers: ROUTE_ANSWERS[said] as readonly [string, ...string[]],
        pair: [clipId(said), clipId(said)] as const,
        explain: translateWhy[said],
      }));

    const fixWhy: Record<(typeof ROUTE_FIXES)[number]["right"], ReactNode> = {
      "Me kõndisime mööda teed.": (
        <Trans>
          <b lang="et">Mööda</b> takes the partitive: <b lang="et">teed</b>.
        </Trans>
      ),
      "Lapsed jooksid üle tee.": (
        <Trans>
          <b lang="et">Üle</b> takes the genitive: <b lang="et">tee</b>.
        </Trans>
      ),
      "Me sõitsime läbi linna.": (
        <Trans>
          <b lang="et">Läbi</b> takes the genitive, not <b lang="et">-s</b>: <b lang="et">linna</b>.
        </Trans>
      ),
      "Nad istusid laua ümber.": (
        <Trans>
          <b lang="et">Ümber</b> takes the genitive: <b lang="et">laua</b>.
        </Trans>
      ),
      "Ma ujusin üle jõe.": (
        <Trans>
          <b lang="et">Üle</b> takes the genitive: <b lang="et">jõe</b>.
        </Trans>
      ),
      "Me jalutasime mööda jõge.": (
        <Trans>
          <b lang="et">Mööda</b> takes the partitive: <b lang="et">jõge</b>.
        </Trans>
      ),
      "Me lendasime Riia kaudu.": (
        <Trans>
          <b lang="et">Kaudu</b> takes the genitive: <b lang="et">Riia</b>.
        </Trans>
      ),
    };
    const fixes: FixItem[] = ROUTE_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${clipId(item.right)}`,
      wrong: item.wrong,
      answers: ROUTE_FIX_ANSWERS[item.right] ?? [item.right],
      src: src(item.right),
      explain: fixWhy[item.right],
    }));

    const trail: PassageQuestion[] = [
      {
        id: "families",
        kind: "truefalse",
        ask: t`The trail is too hard for families with children.`,
        answer: false,
        line: 0,
      },
      {
        id: "river",
        ask: t`How do you cross the river?`,
        options: [
          { id: "bridge", label: t`On a narrow wooden bridge` },
          { id: "boat", label: t`By boat` },
          { id: "stones", label: t`On stones, when the water is low enough` },
        ],
        answer: "bridge",
        line: 4,
      },
      {
        id: "boardwalk",
        ask: t`Why is there a boardwalk in the bog?`,
        options: [
          { id: "lost", label: t`So nobody gets lost` },
          { id: "wet", label: t`The ground there is wet and soft.` },
          { id: "bikes", label: t`For bikes` },
        ],
        answer: "wet",
        line: 6,
      },
      {
        id: "swim",
        kind: "truefalse",
        ask: t`You can swim in the lake in summer.`,
        answer: true,
        line: 9,
      },
      {
        id: "winter",
        kind: "truefalse",
        ask: t`The trail is closed in winter.`,
        answer: false,
        line: 13,
      },
      {
        id: "spring",
        ask: t`What should you wear in spring?`,
        options: [
          { id: "boots", label: t`Rubber boots` },
          { id: "warm", label: t`Warm clothes` },
          { id: "coat", label: t`A raincoat and a hat, in case of rain` },
        ],
        answer: "boots",
        line: 14,
      },
      {
        id: "bus",
        kind: "short",
        ask: t`Which place does the bus from Tallinn go through? Write it as the text does.`,
        answers: ["Aegviidu"],
        line: 15,
      },
    ];

    const checks = [
      { id: "where", label: <Trans>Say where you start.</Trans> },
      { id: "three", label: <Trans>Use at least three of the five words.</Trans> },
      { id: "case", label: <Trans>Use the partitive after mööda.</Trans> },
      { id: "time", label: <Trans>Say how long the way takes.</Trans> },
    ];

    const exam: PassageQuestion[] = [
      {
        id: "far",
        ask: t`How far is Elva from Tartu, as Mari says?`,
        options: [
          { id: "15", label: t`15 kilometres` },
          { id: "30", label: t`About 30 kilometres` },
          { id: "50", label: t`Over 50, too far for one day` },
        ],
        answer: "30",
        line: 2,
      },
      {
        id: "main-road",
        kind: "truefalse",
        ask: t`They’ll ride along the main road.`,
        answer: false,
        line: 4,
      },
      {
        id: "cross",
        ask: t`What do they cross outside the town?`,
        options: [
          { id: "railway", label: t`The railway line` },
          { id: "road", label: t`The main road, where the cars are` },
          { id: "bridge", label: t`A bridge` },
        ],
        answer: "bridge",
        line: 9,
      },
      {
        id: "gravel",
        kind: "truefalse",
        ask: t`Jaan thinks gravel is hard to ride on after rain.`,
        answer: true,
        line: 10,
      },
      {
        id: "lake",
        kind: "short",
        ask: t`What does Mari want to walk around in Elva? Write it as Mari says it.`,
        answers: ["ühe järve", "järve"],
        line: 15,
      },
      {
        id: "stop",
        ask: t`Why will they stop in the forest?`,
        options: [
          { id: "view", label: t`There’s a beautiful view over the river.` },
          { id: "eat", label: t`To eat` },
          { id: "rest", label: t`Jaan gets tired` },
        ],
        answer: "view",
        line: 19,
      },
      {
        id: "tickets",
        kind: "truefalse",
        ask: t`They have to buy the train tickets in advance.`,
        answer: false,
        line: 28,
      },
      {
        id: "meet",
        kind: "short",
        ask: t`Where will they meet? Write it as Mari says it.`,
        answers: ["maja ees"],
        line: 35,
      },
      {
        id: "who",
        kind: "match",
        ask: t`Who says it?`,
        options: [
          { id: "mari", label: t`Mari` },
          { id: "jaan", label: t`Jaan` },
        ],
        statements: [
          { id: "cold", label: t`The water is too cold by now.`, answer: "mari", line: 22 },
          { id: "peeter", label: t`Peeter might come on Sunday.`, answer: "mari", line: 32 },
          { id: "market", label: t`There’s a market in the square.`, answer: "jaan", line: 37 },
          { id: "tyre", label: t`What if I get a flat tyre?`, answer: "jaan", line: 44 },
        ],
      },
    ];

    return { pairs, heard, sort, forms, translations, fixes, trail, checks, exam };
  }, [t, i18n]);
}

export function LabiMetsaLesson() {
  const { t } = useLingui();
  const content = useContent();
  const places = lessonBySlug("peal-all-taga")?.n;
  const partitive = lessonBySlug("osastav")?.n;
  const names = { main: t`Jaan`, second: t`Mari` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <b lang="et">Läbi metsa</b>, through the forest; <b lang="et">üle tee</b>, across the
          road; <b lang="et">mööda teed</b>, along the road: five words for a way, and the case each
          one takes.
        </Trans>
      }
      facts={[
        <Trans key="m">24 minutes</Trans>,
        <Trans key="q">8 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["läbi", "üle", "mööda", "ümber", "kaudu"]}
      recap={[
        <Trans key="1">
          <b lang="et">Läbi</b> through, <b lang="et">üle</b> across, <b lang="et">mööda</b> along,{" "}
          <b lang="et">ümber</b> around, <b lang="et">kaudu</b> via.
        </Trans>,
        <Trans key="2">
          <b lang="et">Läbi, üle, ümber</b> and <b lang="et">kaudu</b> take the genitive:{" "}
          <b lang="et">läbi metsa, üle jõe, laua ümber, Riia kaudu</b>.
        </Trans>,
        <Trans key="3">
          <b lang="et">Mööda</b> takes the partitive: <b lang="et">mööda teed, mööda jõge</b>.
        </Trans>,
        <Trans key="4">
          <b lang="et">Läbi, üle</b> and <b lang="et">mööda</b> usually go before the noun;{" "}
          <b lang="et">ümber</b> usually goes after it, and <b lang="et">kaudu</b> always does.
        </Trans>,
      ]}
      sections={[
        {
          id: "words",
          title: t`Five words for a way`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {places} put words such as <b lang="et">peal</b> and <b lang="et">all</b>{" "}
                    after a noun in the genitive: <b lang="et">laua peal</b>. These five say which
                    way something goes: <Word w="läbi" />, <Word w="üle" />, <Word w="mööda" />,{" "}
                    <Word w="ümber" /> and <Word w="kaudu" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <b lang="et">Läbi, üle</b> and <b lang="et">mööda</b> usually go before the
                    noun. <b lang="et">Ümber</b> usually goes after it, and <b lang="et">kaudu</b>{" "}
                    always does. Tap the forms to hear them.
                  </Trans>
                </p>
              </Prose>
              <WordTable />
              <Prose>
                <p>
                  <Trans>Match each word with its meaning.</Trans>
                </p>
              </Prose>
              <Match
                id="way-meaning"
                title={<Trans>What does it mean?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="w">Word</Trans>, <Trans key="m">Meaning</Trans>]}
              />
            </>
          ),
        },
        {
          id: "hear",
          title: t`Through, across, along or around`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Hear a sentence, then pick which way it goes.</Trans>
                </p>
              </Prose>
              <Quiz
                id="hear-way"
                title={<Trans>Which way?</Trans>}
                items={content.heard}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight ways heard right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you got wrong once more.</Trans>
                  ) : (
                    <Trans>Tap the sentences in the first table once more, then try again.</Trans>
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
          id: "case",
          title: t`Genitive or partitive`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <b lang="et">Läbi, üle, ümber</b> and <b lang="et">kaudu</b> take the genitive:{" "}
                    <b lang="et">üle tee</b>. <b lang="et">Mööda</b> takes the partitive, from
                    lesson {partitive}: <b lang="et">mööda teed</b>. With many nouns the two look
                    different, so the word before tells you which to use.
                  </Trans>
                </p>
              </Prose>
              <PairTable />
              <Prose>
                <p>
                  <Trans>Put each form under the word it can follow.</Trans>
                </p>
              </Prose>
              <Sort
                id="which-case"
                title={<Trans>After which word?</Trans>}
                bins={[
                  {
                    id: "gen",
                    label: "üle, läbi",
                    lang: "et",
                    rule: (
                      <Trans>
                        The genitive: <b lang="et">jõe, mäe, silla, mere</b>.
                      </Trans>
                    ),
                  },
                  {
                    id: "part",
                    label: "mööda",
                    lang: "et",
                    rule: (
                      <Trans>
                        The partitive: <b lang="et">jõge, mäge, silda, merd</b>.
                      </Trans>
                    ),
                  },
                ]}
                items={content.sort}
              />
            </>
          ),
        },
        {
          id: "make",
          title: t`Type the form`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round gives a noun and a sentence with a gap. Type the form the word before
                    or after the gap needs.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-form"
                title={<Trans>Type the form</Trans>}
                items={content.forms}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, typed in full.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Was it after mööda? Then it’s the partitive.</Trans>
                  ) : (
                    <Trans>Tap the forms in the second table once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                round={(props) => <FormRound {...props} />}
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
                    Write each sentence in Estonian. Pick the word for the way first, then its case.
                  </Trans>
                </p>
              </Prose>
              <Aside>
                <Trans>
                  Estonian often says the same with a case and an adverb:{" "}
                  <b lang="et">metsast läbi</b>, <b lang="et">teest üle</b>,{" "}
                  <b lang="et">aknast sisse</b>. Both ways count here.
                </Trans>
              </Aside>
              <Quiz
                id="write-way"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven, each with its case.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the case in the ones you missed.</Trans>
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
          title: t`Fix the case`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has one word in the wrong case. Tap it, then type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-way"
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
          id: "trail",
          title: t`A hiking trail`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Read the sign at the start of a hiking trail and answer the questions, as in the
                    reading part of the B1 exam.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="trail-sign"
                title={<Trans>The Kõrvemaa trail</Trans>}
                sentences={ROUTE_TRAIL}
                questions={content.trail}
              />
              <Prose>
                <p>
                  <Trans>
                    Now describe your own way to work or school in about 80 words, then compare it
                    with a model.
                  </Trans>
                </p>
              </Prose>
              <Writing
                id="my-way"
                title={<Trans>Write: my way to work</Trans>}
                prompt={
                  <p>
                    <Trans>
                      Say where you start, which way you go and how long it takes. Use at least
                      three of the five words.
                    </Trans>
                  </p>
                }
                model={ROUTE_MODEL}
                checks={content.checks}
              />
            </>
          ),
        },
        {
          id: "elva",
          title: t`A bike trip to Elva`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Mari and Jaan plan a Saturday bike trip from Tartu to Elva.</Trans>
                </p>
              </Prose>
              <Listening
                id="elva-trip"
                title={<Trans>Listen: Mari and Jaan</Trans>}
                clip="c-elva"
                turns={ROUTE_CONVERSATION.turns}
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
