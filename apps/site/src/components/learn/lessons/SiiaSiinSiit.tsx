import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  DIR_ANSWERS,
  DIR_CONVERSATION,
  DIR_FIXES,
  DIR_GAPS,
  DIR_MATCH,
  DIR_NOTE,
  DIR_TABLE,
  DIR_TELL,
  DIR_TRANSLATE,
  DIR_VERBS,
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
import { Word } from "../Word";

const SLUG = "siia-siin-siit";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const WORD_MEANS: Record<(typeof DIR_MATCH)[number], MessageDescriptor> = {
  siia: msg`to here`,
  siin: msg`here`,
  siit: msg`from here`,
  sinna: msg`to there`,
  seal: msg`there`,
  sealt: msg`from there`,
};

const GLOSSARY: Glossary = {
  siia: { en: msg`to here`, note: msg`Tule palun siia!` },
  siin: { en: msg`here`, note: msg`Ma elan siin.` },
  siit: { en: msg`from here`, note: msg`Buss sõidab siit Tartusse.` },
  sinna: { en: msg`to there`, note: msg`Me läheme homme sinna.` },
  seal: { en: msg`there`, note: msg`Ta töötab seal.` },
  sealt: { en: msg`from there`, note: msg`Ta tuli just sealt.` },
  minema: { en: msg`to go (one way)`, note: msg`Ma lähen praegu poodi.` },
  tulema: { en: msg`to come`, note: msg`Ta tuleb varsti siia.` },
  käima: { en: msg`to go and come back, to visit`, note: msg`Ma käisin eile poes.` },
};

const ROW_LABELS: Record<(typeof DIR_TABLE)[number]["id"], MessageDescriptor> = {
  to: msg`Where to?`,
  at: msg`Where?`,
  from: msg`Where from?`,
};

function PlaceWordsTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = DIR_TABLE.map((row) => ({
    id: row.id,
    label: i18n._(ROW_LABELS[row.id]),
    et: row.q,
    cells: [
      { form: row.here, src: src(row.here), note: <b lang="et">{row.hereSaid}</b> },
      { form: row.there, src: src(row.there), note: <b lang="et">{row.thereSaid}</b> },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Paradigm
        label={t`Here and there in three directions`}
        columns={[t`Here`, t`There`]}
        rows={rows}
        empty={{
          title: t`Tap a word`,
          tip: (
            <Trans>
              Just like place endings, here and there each have three forms: going to, being at, and
              coming from.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

const VERB_LABELS: Record<(typeof DIR_VERBS)[number]["id"], MessageDescriptor> = {
  go: msg`go there (one way)`,
  come: msg`come here / from there`,
  visit: msg`go and come back / visit`,
};

function VerbPlacesTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = DIR_VERBS.map((row) => ({
    id: row.id,
    label: i18n._(VERB_LABELS[row.id]),
    cells: [
      { form: row.verb, src: src(row.verb) },
      { form: row.said, src: src(row.said), note: <b lang="et">{row.place}</b> },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Paradigm
        label={t`Three movement verbs and their place forms`}
        columns={[t`Verb`, t`In a sentence`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a sentence`,
          tip: (
            <Trans>
              <b lang="et">Minema</b> takes the where-to form (<b lang="et">sinna, poodi</b>), while{" "}
              <b lang="et">käima</b> usually takes the where form (<b lang="et">seal, poes</b>).
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

const GAP_WHY: Record<(typeof DIR_GAPS)[number]["id"], ReactNode> = {
  "come-here": (
    <Trans>
      Coming to this place answers <b lang="et">kuhu?</b>: <b lang="et">siia</b>.
    </Trans>
  ),
  "live-here": (
    <Trans>
      Being in this place answers <b lang="et">kus?</b>: <b lang="et">siin</b>.
    </Trans>
  ),
  "bus-from": (
    <Trans>
      Starting from this place answers <b lang="et">kust?</b>: <b lang="et">siit</b>.
    </Trans>
  ),
  "go-there": (
    <Trans>
      Going to that place answers <b lang="et">kuhu?</b>: <b lang="et">sinna</b>.
    </Trans>
  ),
  "work-there": (
    <Trans>
      Working in that place answers <b lang="et">kus?</b>: <b lang="et">seal</b>.
    </Trans>
  ),
  "came-from": (
    <Trans>
      Coming from that place answers <b lang="et">kust?</b>: <b lang="et">sealt</b>.
    </Trans>
  ),
  "visited-there": (
    <Trans>
      <b lang="et">Käima</b> usually takes the where form (<b lang="et">kus?</b>):{" "}
      <b lang="et">seal</b>.
    </Trans>
  ),
  "put-here": (
    <Trans>
      Putting something onto a spot answers <b lang="et">kuhu?</b>: <b lang="et">siia</b>.
    </Trans>
  ),
};

const TELL_OPTIONS = {
  go: msg`Heading there (one way)`,
  visit: msg`Visiting / round trip`,
} as const;

const TELL_MEANS: Record<(typeof DIR_TELL)[number]["id"], MessageDescriptor> = {
  "go-shop": msg`I am going to the shop now.`,
  "visit-shop": msg`I went to the shop yesterday (and came back).`,
  "go-tartu": msg`We are going to Tartu tomorrow.`,
  "visit-tartu": msg`We visited Tartu in the summer.`,
  "go-there": msg`He or she is going there in the evening.`,
  "visit-there": msg`He or she often goes there.`,
  "go-cafe": msg`I am going to the café now.`,
  "visit-cafe": msg`I went to the café in the morning.`,
};

const TRANSLATE_PROMPTS: Record<(typeof DIR_TRANSLATE)[number], MessageDescriptor> = {
  "Tule palun siia!": msg`Please come here!`,
  "Ma elan siin.": msg`I live here.`,
  "Buss sõidab siit Tartusse.": msg`The bus goes from here to Tartu.`,
  "Me läheme homme sinna.": msg`We are going there tomorrow.`,
  "Ma käisin eile seal.": msg`I went there yesterday (and came back).`,
  "Ta tuli just sealt.": msg`He or she just came from there.`,
};

const FIX_PROMPTS: Record<(typeof DIR_FIXES)[number]["id"], MessageDescriptor> = {
  come: msg`Please come here!`,
  visited: msg`I went there yesterday (and came back).`,
  live: msg`He or she lives here.`,
  go: msg`We are going there tomorrow.`,
  shop: msg`I went to the shop yesterday (and came back).`,
  from: msg`He or she just came from there.`,
};

const FIX_WHY: Record<(typeof DIR_FIXES)[number]["id"], ReactNode> = {
  come: (
    <Trans>
      Movement toward here takes <b lang="et">siia</b>, not <b lang="et">siin</b>.
    </Trans>
  ),
  visited: (
    <Trans>
      <b lang="et">Käima</b> usually takes the where form: <b lang="et">seal</b>, not{" "}
      <b lang="et">sinna</b>.
    </Trans>
  ),
  live: (
    <Trans>
      Living somewhere answers <b lang="et">kus?</b>: <b lang="et">siin</b>, not{" "}
      <b lang="et">siia</b>.
    </Trans>
  ),
  go: (
    <Trans>
      <b lang="et">Minema</b> takes the where-to form: <b lang="et">sinna</b>, not{" "}
      <b lang="et">seal</b>.
    </Trans>
  ),
  shop: (
    <Trans>
      <b lang="et">Käima</b> usually takes <b lang="et">-s</b>: <b lang="et">poes</b>, not{" "}
      <b lang="et">poodi</b>.
    </Trans>
  ),
  from: (
    <Trans>
      Coming from a place takes <b lang="et">sealt</b>, not <b lang="et">seal</b>.
    </Trans>
  ),
};

const gapSaid = (item: { before: string; answer: string; after: string }) =>
  `${item.before} ${item.answer}${/^[.,!?]/.test(item.after) ? "" : " "}${item.after}`;

const gapRun = <
  T extends {
    pair: readonly [string, string];
    answers: readonly string[];
    pool: readonly string[];
  },
>(
  items: readonly T[],
  pinned?: T,
) =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned
      ? item
      : {
          ...item,
          options: shuffle([item.answers[0] as string, ...shuffle(item.pool).slice(0, 3)]),
        },
  );

const WRONG_FOR: Record<(typeof DIR_MATCH)[number], readonly string[]> = {
  siia: ["siin", "siit", "sinna"],
  siin: ["siia", "siit", "seal"],
  siit: ["siia", "siin", "sealt"],
  sinna: ["siia", "seal", "siin"],
  seal: ["sinna", "siin", "siit"],
  sealt: ["sinna", "siit", "siin"],
};

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const pairs: MatchPair[] = DIR_MATCH.map((word) => ({
      id: word,
      left: word,
      right: i18n._(WORD_MEANS[word]),
      src: src(word),
    }));

    const gaps: (FormItem & {
      pair: readonly [string, string];
      pool: readonly string[];
    })[] = DIR_GAPS.map((gap) => {
      const said = gapSaid(gap);
      const pool = WRONG_FOR[gap.answer];
      return {
        base: gap.answer.startsWith("sii") ? "siin" : "seal",
        gloss: i18n._(WORD_MEANS[gap.answer]),
        cue: `${gap.before} ___${/^[.,!?]/.test(gap.after) ? "" : " "}${gap.after}`,
        cueLang: "et",
        src: src(said),
        options: [gap.answer, ...pool],
        pool,
        answers: [gap.answer],
        pair: [gap.id, gap.id] as const,
        explain: GAP_WHY[gap.id],
      };
    });

    const tellOptions = (["go", "visit"] as const).map((id) => ({
      id,
      label: (
        <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
          {i18n._(TELL_OPTIONS[id])}
        </span>
      ),
    }));
    const tell: (ChoiceItem & { said: string; pair: readonly [string, string] })[] = DIR_TELL.map(
      (item) => ({
        said: item.said,
        src: src(item.said),
        answer: item.kind,
        options: tellOptions,
        pair: [item.id.split("-")[1] as string, item.id] as const,
        explain: (
          <Trans>
            <b lang="et">{item.said}</b> {i18n._(TELL_MEANS[item.id])}
          </Trans>
        ),
      }),
    );

    const translations: (SentenceItem & { pair: readonly [string, string] })[] = DIR_TRANSLATE.map(
      (said) => ({
        kind: "translate",
        id: clipId(said),
        prompt: i18n._(TRANSLATE_PROMPTS[said]),
        src: src(said),
        answers: DIR_ANSWERS[said],
        pair: [clipId(said), clipId(said)] as const,
      }),
    );

    const fixes: FixItem[] = DIR_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${item.id}`,
      wrong: item.wrong,
      prompt: i18n._(FIX_PROMPTS[item.id]),
      answers: [item.right],
      src: src(item.right),
      explain: FIX_WHY[item.id],
    }));

    const note: PassageQuestion[] = [
      {
        id: "ferry",
        ask: t`How did Triin and Jaan get to Saaremaa?`,
        options: [
          { id: "ferry", label: t`By ferry` },
          { id: "plane", label: t`On a small evening flight` },
          { id: "train", label: t`By night train straight from Tartu` },
        ],
        answer: "ferry",
        line: 2,
      },
      {
        id: "castle",
        kind: "truefalse",
        ask: t`They visited Kuressaare Castle in the afternoon.`,
        answer: true,
        line: 3,
      },
      {
        id: "cafe-full",
        kind: "truefalse",
        ask: t`They could not find a free table at the café.`,
        answer: false,
        line: 4,
      },
      {
        id: "tomorrow",
        ask: t`Where are they going tomorrow morning?`,
        options: [
          { id: "museum", label: t`To a history museum` },
          { id: "beach", label: t`To the beach, as the water is warm` },
          { id: "forest", label: t`On a long walk through the pine forest outside town` },
        ],
        answer: "beach",
        line: 5,
      },
      {
        id: "buy",
        kind: "short",
        ask: t`What local food does Jaan want to buy at the small shop? Write one word from the letter.`,
        answers: ["leiba"],
        line: 6,
      },
      {
        id: "return",
        ask: t`When do they leave Saaremaa?`,
        options: [
          { id: "sat", label: t`Saturday morning` },
          { id: "mon", label: t`Monday afternoon right after lunch` },
          { id: "sun", label: t`On Sunday evening, reaching home at nine` },
        ],
        answer: "sun",
        line: 7,
      },
    ];

    const call: PassageQuestion[] = [
      {
        id: "mart-how",
        ask: t`How did Mart get to the station?`,
        options: [
          { id: "bus", label: t`By bus` },
          { id: "walk", label: t`On foot from the old town` },
          { id: "car", label: t`In a friend’s car from outside the city` },
        ],
        answer: "bus",
        line: 4,
      },
      {
        id: "kati-wait",
        kind: "truefalse",
        ask: t`Kati will arrive at the station in five minutes.`,
        answer: true,
        line: 6,
      },
      {
        id: "cafe-tried",
        kind: "truefalse",
        ask: t`Kati has never been to the new café by the park before.`,
        answer: false,
        line: 8,
      },
      {
        id: "view",
        ask: t`What does Kati like about the new café besides the cake?`,
        options: [
          { id: "cheap", label: t`Very cheap coffee` },
          { id: "view", label: t`A good view of the park` },
          { id: "music", label: t`Live piano music played every single afternoon` },
        ],
        answer: "view",
        line: 9,
      },
      {
        id: "walk-time",
        kind: "short",
        ask: t`How many minutes is the café from the station on foot? Write the number word as Kati says it.`,
        answers: ["kümme"],
        line: 11,
      },
      {
        id: "route",
        kind: "truefalse",
        ask: t`They plan to walk there through the old town.`,
        answer: true,
        line: 12,
      },
      {
        id: "bookshop",
        ask: t`Where did Kati just come from?`,
        options: [
          { id: "library", label: t`The city library` },
          { id: "market", label: t`The morning food market` },
          { id: "bookshop", label: t`The bookshop, where she bought an Estonian book` },
        ],
        answer: "bookshop",
        line: 14,
      },
      {
        id: "meet-spot",
        kind: "short",
        ask: t`Under what does Mart wait at the station? Write two words as he says them.`,
        answers: ["suure kella", "kella"],
        line: 17,
      },
    ];

    return { pairs, gaps, tell, translations, fixes, note, call };
  }, [t, i18n]);
}

export function SiiaSiinSiitLesson() {
  const { t } = useLingui();
  const content = useContent();
  const inner = lessonBySlug("majas-majja-majast")?.n;
  const going = lessonBySlug("ujuma-ujumas-ujumast")?.n;
  const names = { third: t`Kati`, fourth: t`Mart` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Here and there each have three forms in Estonian (<b lang="et">siia, siin, siit</b> and{" "}
          <b lang="et">sinna, seal, sealt</b>), and <b lang="et">käima</b> usually pairs with the
          where form, not the where-to form.
        </Trans>
      }
      facts={[
        <Trans key="m">20 minutes</Trans>,
        <Trans key="q">7 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["siia", "siin", "siit", "sinna", "seal", "sealt", "minema", "tulema", "käima"]}
      recap={[
        <Trans key="1">
          Here has three forms: <b lang="et">siia</b> (to here), <b lang="et">siin</b> (here) and{" "}
          <b lang="et">siit</b> (from here).
        </Trans>,
        <Trans key="2">
          There has three forms: <b lang="et">sinna</b> (to there), <b lang="et">seal</b> (there)
          and <b lang="et">sealt</b> (from there).
        </Trans>,
        <Trans key="3">
          <b lang="et">Minema</b> (going one way) usually takes the where-to form (
          <b lang="et">sinna, poodi</b>); <b lang="et">tulema</b> takes where-to or where-from (
          <b lang="et">siia, sealt</b>).
        </Trans>,
        <Trans key="4">
          <b lang="et">Käima</b> (going and coming back, visiting) usually takes the where form (
          <b lang="et">seal, poes, Tartus</b>), not <b lang="et">sinna</b> or <b lang="et">poodi</b>
          .
        </Trans>,
      ]}
      sections={[
        {
          id: "words",
          title: t`Here and there in three directions`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {inner} you saw that Estonian places have three forms: into, in, and
                    out of (<b lang="et">majja, majas, majast</b>). Here and there work the same
                    way: <Word w="siia" />, <Word w="siin" />, <Word w="siit" /> and{" "}
                    <Word w="sinna" />, <Word w="seal" />, <Word w="sealt" />.
                  </Trans>
                </p>
              </Prose>
              <PlaceWordsTable />
              <Prose>
                <p>
                  <Trans>Match each word with its direction.</Trans>
                </p>
              </Prose>
              <Match
                id="place-word-meaning"
                title={<Trans>Which direction?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="a">Word</Trans>, <Trans key="b">Meaning</Trans>]}
              />
            </>
          ),
        },
        {
          id: "pick",
          title: t`Pick the direction word`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Choose <b lang="et">siia, siin, siit</b> or <b lang="et">sinna, seal, sealt</b>{" "}
                    to complete each sentence, then hear the whole line.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="pick-direction"
                title={<Trans>Which word fits?</Trans>}
                items={content.gaps}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight directions right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Read the reason under each one you missed.</Trans>
                  ) : (
                    <Trans>Go through the table once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={gapRun}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "verbs",
          title: t`Go, come and visit`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {going} met <Word w="minema" />, <Word w="tulema" /> and{" "}
                    <Word w="käima" />. Watch which place form each verb usually takes:{" "}
                    <b lang="et">Ma lähen poodi</b> (heading to the shop, one way), but{" "}
                    <b lang="et">Ma käisin poes</b> (went to the shop and came back).
                  </Trans>
                </p>
              </Prose>
              <VerbPlacesTable />
              <Aside>
                <Trans>
                  Because <b lang="et">käima</b> means visiting or going and returning, it usually
                  pairs with <b lang="et">kus?</b> words: <b lang="et">käisin seal</b>,{" "}
                  <b lang="et">käin tööl</b>, <b lang="et">käisime Tartus</b>.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>
                    Hear each sentence and pick whether someone is heading there one way or
                    visiting.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="go-or-visit"
                title={<Trans>Heading there or visiting?</Trans>}
                items={content.tell}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight: you told one-way trips and visits apart.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Check the verb table above, then try again.</Trans>
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
          id: "write",
          title: t`Write it in Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Write each sentence in Estonian using the right place word.</Trans>
                </p>
              </Prose>
              <Quiz
                id="write-direction"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the direction word in the ones you missed.</Trans>
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
                    Each sentence uses the wrong direction or place form for its verb. Tap the wrong
                    word, then type the right one.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-direction"
                title={<Trans>Fix the sentence</Trans>}
                items={content.fixes}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six found and fixed.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Read the reason under each one you missed.</Trans>
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
          id: "note",
          title: t`A message from Saaremaa`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Triin writes to her mother from a trip to Saaremaa. Read and answer.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="saaremaa-note"
                title={<Trans>What does Triin write?</Trans>}
                by={t`Triin writes`}
                sentences={DIR_NOTE}
                questions={content.note}
              />
            </>
          ),
        },
        {
          id: "call",
          title: t`Meeting at the station`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mart has just arrived at the station and calls Kati. Listen and answer. You can
                    play the conversation twice.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="station-call"
                title={<Trans>Listen: Kati and Mart</Trans>}
                clip="c-jaam"
                turns={DIR_CONVERSATION.turns}
                names={names}
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
