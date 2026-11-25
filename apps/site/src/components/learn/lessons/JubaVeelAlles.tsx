import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  JUBA_ANSWERS,
  JUBA_CONVERSATION,
  JUBA_FIXES,
  JUBA_GAPS,
  JUBA_GROUPS,
  JUBA_MATCH,
  JUBA_NOTE,
  JUBA_TELL,
  JUBA_TRANSLATE,
} from "../../../lib/learn/clips";
import { playSound } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { Answer, type ChoiceItem, ChoiceRound, Feedback, Quiz, type RoundProps } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Listen } from "../Sound";
import { Word } from "../Word";

const SLUG = "juba-veel-alles";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Group = keyof typeof JUBA_GROUPS;

const WORD_MEANS: Record<string, MessageDescriptor> = {
  juba: msg`already`,
  veel: msg`still, more`,
  alles: msg`only, not until, just`,
  enam: msg`no longer (negative)`,
  "veel mitte": msg`not yet`,
  "mitte enam": msg`no longer, not anymore`,
};

const GLOSSARY: Glossary = {
  juba: { en: msg`already`, note: msg`Kell on juba kümme.` },
  veel: { en: msg`still, more`, note: msg`Ma olen veel tööl.` },
  alles: { en: msg`only, not until, just`, note: msg`Kell on alles seitse.` },
  enam: { en: msg`no longer (negative)`, note: msg`Ma ei ela enam seal.` },
};

const ROW_LABELS: Record<string, MessageDescriptor> = {
  already: msg`Already`,
  still: msg`Still`,
  only: msg`Only / not until`,
  notYet: msg`Not yet`,
  noLonger: msg`No longer`,
};

function TimeWordsTable() {
  const { t, i18n } = useLingui();
  const [group, setGroup] = useState<Group>("yes");
  const rows: ParadigmRow[] = JUBA_GROUPS[group].map((row) => ({
    id: row.id,
    label: i18n._(ROW_LABELS[row.id] as MessageDescriptor),
    cells: [
      { form: row.word, src: src(row.word) },
      { form: row.said, src: src(row.said) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Sentence type`}
        items={[
          { label: t`Positive`, value: "yes" as Group },
          { label: t`Negative`, value: "no" as Group },
        ]}
        value={group}
        onPick={setGroup}
      />
      <Paradigm
        key={group}
        label={t`Time adverbs in Estonian`}
        columns={[t`Word`, t`In a sentence`]}
        rows={rows}
        highlight={{ column: 0 }}
        empty={{
          title: t`Tap a word`,
          tip:
            group === "yes" ? (
              <Trans>
                <b lang="et">Juba</b> marks something sooner than expected; <b lang="et">alles</b>{" "}
                marks something less, later or just recent; <b lang="et">veel</b> means still or
                more.
              </Trans>
            ) : (
              <Trans>
                With <b lang="et">ei</b>, <b lang="et">veel</b> usually means not yet and{" "}
                <b lang="et">enam</b> usually means no longer.
              </Trans>
            ),
        }}
      />
    </Panel>
  );
}

const GAP_OPTIONS = ["juba", "veel", "enam", "alles"] as const;

const GAP_PROMPTS: Record<(typeof JUBA_GAPS)[number]["id"], MessageDescriptor> = {
  "already-ten": msg`It is already ten o’clock.`,
  "only-seven": msg`It is only seven o’clock.`,
  "still-work": msg`I am still at work.`,
  "not-yet-home": msg`He or she is not home yet.`,
  "no-longer-live": msg`I no longer live there.`,
  "only-yesterday": msg`He or she came only yesterday.`,
  "no-longer-rain": msg`It is no longer raining.`,
  "not-yet-bus": msg`The bus has not arrived yet.`,
};

const GAP_WHY: Record<(typeof JUBA_GAPS)[number]["id"], ReactNode> = {
  "already-ten": (
    <Trans>
      Sooner than expected — already ten — uses <b lang="et">juba</b>.
    </Trans>
  ),
  "only-seven": (
    <Trans>
      Earlier or less than expected — only seven — uses <b lang="et">alles</b>.
    </Trans>
  ),
  "still-work": (
    <Trans>
      Something continuing in a positive sentence uses <b lang="et">veel</b>.
    </Trans>
  ),
  "not-yet-home": (
    <Trans>
      Not yet uses <b lang="et">ei … veel</b>.
    </Trans>
  ),
  "no-longer-live": (
    <Trans>
      No longer uses <b lang="et">ei … enam</b>.
    </Trans>
  ),
  "only-yesterday": (
    <Trans>
      Only yesterday (very recently) uses <b lang="et">alles</b>.
    </Trans>
  ),
  "no-longer-rain": (
    <Trans>
      Stopped happening uses <b lang="et">ei … enam</b>.
    </Trans>
  ),
  "not-yet-bus": (
    <Trans>
      Has not happened yet uses <b lang="et">ei … veel</b>.
    </Trans>
  ),
};

const TELL_OPTIONS = {
  juba: msg`Already (sooner than expected)`,
  alles: msg`Only / not until (less or later)`,
} as const;

const TELL_MEANS: Record<(typeof JUBA_TELL)[number]["id"], MessageDescriptor> = {
  "eight-juba": msg`It is already eight o’clock.`,
  "eight-alles": msg`It is only eight o’clock.`,
  "arrived-juba": msg`He or she has already arrived.`,
  "arrived-alles": msg`He or she has only just arrived.`,
  "yesterday-juba": msg`He or she came already yesterday.`,
  "yesterday-alles": msg`He or she came only yesterday.`,
  "open-juba": msg`The shop is already open.`,
  "open-alles": msg`The shop opens only at ten.`,
};

const TRANSLATE_PROMPTS: Record<(typeof JUBA_TRANSLATE)[number], MessageDescriptor> = {
  "Kell on juba kümme.": msg`It is already ten o’clock.`,
  "Kell on alles seitse.": msg`It is only seven o’clock.`,
  "Ta ei ole veel kodus.": msg`He or she is not home yet.`,
  "Ma ei ela enam seal.": msg`I no longer live there.`,
  "Kas sa oled veel tööl?": msg`Are you still at work?`,
  "Ta tuli alles eile.": msg`He or she came only yesterday.`,
};

const FIX_PROMPTS: Record<(typeof JUBA_FIXES)[number]["id"], MessageDescriptor> = {
  eaten: msg`I have not eaten yet.`,
  live: msg`He or she no longer lives here.`,
  bus: msg`The bus has not come yet.`,
  work: msg`I am still at work.`,
  seven: msg`It is only seven o’clock.`,
  rain: msg`It is no longer raining.`,
};

const FIX_WHY: Record<(typeof JUBA_FIXES)[number]["id"], ReactNode> = {
  eaten: (
    <Trans>
      In a negative sentence, not yet uses <b lang="et">veel</b>, not <b lang="et">juba</b>.
    </Trans>
  ),
  live: (
    <Trans>
      No longer uses <b lang="et">ei … enam</b>, not <b lang="et">ei … juba</b>.
    </Trans>
  ),
  bus: (
    <Trans>
      Not yet uses <b lang="et">ei … veel</b>, not <b lang="et">ei … juba</b>.
    </Trans>
  ),
  work: (
    <Trans>
      <b lang="et">Enam</b> usually appears only in negative sentences; positive still is{" "}
      <b lang="et">veel</b>.
    </Trans>
  ),
  seven: (
    <Trans>
      Only seven o’clock uses <b lang="et">alles</b>, not <b lang="et">enam</b>.
    </Trans>
  ),
  rain: (
    <Trans>
      Stopped raining uses <b lang="et">ei … enam</b>, not <b lang="et">ei … juba</b>.
    </Trans>
  ),
};

const gapSaid = (item: { before: string; answer: string; after: string }) =>
  `${item.before} ${item.answer}${/^[.,!?]/.test(item.after) ? "" : " "}${item.after}`;

const gapRun = <
  T extends {
    pair: readonly [string, string];
    options: readonly { id: string; label: ReactNode }[];
  },
>(
  items: readonly T[],
  pinned?: T,
) =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle([...item.options]) },
  );

type GapPick = ChoiceItem & { said: string; prompt: ReactNode; pair: readonly [string, string] };

function PickRound({ item, state, heard, answer }: RoundProps<GapPick>) {
  const { t } = useLingui();
  const done = state.status === "answered";
  const picked = done ? state.picked : null;
  return (
    <>
      <p className="text-lg leading-snug">{item.prompt}</p>
      {done && <Listen src={item.src} onPlay={heard} />}
      <fieldset className="m-0 flex w-full min-w-0 flex-wrap gap-2 border-0 p-0">
        <legend className="sr-only">{t`Answers`}</legend>
        {item.options.map((option) => (
          <Answer
            key={option.id}
            className="grow basis-36"
            label={option.label}
            mark={
              !done
                ? undefined
                : option.id === item.answer
                  ? "right"
                  : option.id === picked
                    ? "wrong"
                    : "out"
            }
            onPick={() => {
              if (done) return;
              heard();
              answer(option.id, option.id === item.answer);
              void playSound(item.src);
            }}
          />
        ))}
      </fieldset>
      {done && <Feedback right={state.right}>{item.explain}</Feedback>}
    </>
  );
}

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const pairs: MatchPair[] = JUBA_MATCH.map((word) => ({
      id: clipId(word),
      left: word,
      right: i18n._(WORD_MEANS[word] as MessageDescriptor),
      src: src(word),
    }));

    const tellOptions = (["juba", "alles"] as const).map((id) => ({
      id,
      label: (
        <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
          {i18n._(TELL_OPTIONS[id])}
        </span>
      ),
    }));
    const tell: (ChoiceItem & { said: string; pair: readonly [string, string] })[] = JUBA_TELL.map(
      (item) => ({
        said: item.said,
        src: src(item.said),
        answer: item.kind,
        options: tellOptions,
        pair: [item.id.split("-")[0] as string, item.id] as const,
        explain: (
          <Trans>
            <b lang="et">{item.said}</b> {i18n._(TELL_MEANS[item.id])}
          </Trans>
        ),
      }),
    );

    const gapOpts = GAP_OPTIONS.map((w) => ({
      id: w,
      label: <span lang="et">{w}</span>,
    }));
    const gaps: GapPick[] = JUBA_GAPS.map((item) => {
      const said = gapSaid(item);
      return {
        said,
        src: src(said),
        prompt: (
          <>
            <span lang="et" className="font-semibold text-ink">
              {`${item.before} ___${/^[.,!?]/.test(item.after) ? "" : " "}${item.after}`}
            </span>{" "}
            <span className="text-ink-secondary">{i18n._(GAP_PROMPTS[item.id])}</span>
          </>
        ),
        answer: item.answer,
        options: gapOpts,
        pair: [item.id, item.id] as const,
        explain: GAP_WHY[item.id],
      };
    });

    const translations: (SentenceItem & { pair: readonly [string, string] })[] = JUBA_TRANSLATE.map(
      (said) => ({
        kind: "translate",
        id: clipId(said),
        prompt: i18n._(TRANSLATE_PROMPTS[said]),
        src: src(said),
        answers: JUBA_ANSWERS[said],
        pair: [clipId(said), clipId(said)] as const,
      }),
    );

    const fixes: FixItem[] = JUBA_FIXES.map((item) => ({
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
        id: "team",
        kind: "truefalse",
        ask: t`Most of the team is already working in the new office.`,
        answer: true,
        line: 1,
      },
      {
        id: "coffee",
        ask: t`What is still missing in the new kitchen?`,
        options: [
          { id: "machine", label: t`A coffee machine` },
          { id: "chairs", label: t`Chairs around the long table` },
          { id: "fridge", label: t`A large refrigerator for the whole floor` },
        ],
        answer: "machine",
        line: 3,
      },
      {
        id: "old-keys",
        kind: "truefalse",
        ask: t`Staff still need the old office keys every morning.`,
        answer: false,
        line: 4,
      },
      {
        id: "reception",
        ask: t`When does the downstairs café open?`,
        options: [
          { id: "seven", label: t`At seven` },
          { id: "ten", label: t`Not until ten o’clock` },
          { id: "noon", label: t`Only after midday once lunch starts` },
        ],
        answer: "ten",
        line: 5,
      },
      {
        id: "it",
        kind: "short",
        ask: t`Which day did the internet start working? Write one word from the note.`,
        answers: ["eile"],
        line: 2,
      },
      {
        id: "meeting",
        ask: t`What will happen on Friday afternoon?`,
        options: [
          { id: "clean", label: t`Quiet packing` },
          { id: "lunch", label: t`A quick team lunch` },
          { id: "party", label: t`Everyone will celebrate moving in with cake` },
        ],
        answer: "party",
        line: 7,
      },
    ];

    const call: PassageQuestion[] = [
      {
        id: "flat-ready",
        kind: "truefalse",
        ask: t`Mart has already finished unpacking every box in the new flat.`,
        answer: false,
        line: 2,
      },
      {
        id: "moved-when",
        ask: t`When did Mart get the keys to the new flat?`,
        options: [
          { id: "month", label: t`Last month` },
          { id: "monday", label: t`Only on Monday` },
          { id: "spring", label: t`Back in early spring before Easter` },
        ],
        answer: "monday",
        line: 3,
      },
      {
        id: "old-flat",
        kind: "truefalse",
        ask: t`Mart still lives part-time in his old flat.`,
        answer: false,
        line: 5,
      },
      {
        id: "missing",
        ask: t`What furniture has not arrived yet?`,
        options: [
          { id: "desk", label: t`A small desk` },
          { id: "bed", label: t`A wooden dining table` },
          { id: "sofa", label: t`The new sofa ordered from the shop` },
        ],
        answer: "sofa",
        line: 7,
      },
      {
        id: "sofa-day",
        kind: "short",
        ask: t`Which day will the sofa arrive? Write one word as Mart says it.`,
        answers: ["reedel"],
        line: 8,
      },
      {
        id: "rain",
        kind: "truefalse",
        ask: t`The sun has already come out from behind the clouds.`,
        answer: true,
        line: 10,
      },
      {
        id: "visit",
        ask: t`When does Kati suggest dropping by?`,
        options: [
          { id: "sat", label: t`On Saturday` },
          { id: "tonight", label: t`Tonight right after dinner` },
          { id: "tue", label: t`Late next Tuesday evening after work` },
        ],
        answer: "sat",
        line: 12,
      },
      {
        id: "drink",
        kind: "short",
        ask: t`What warm drink will Mart make when Kati visits? Write one word as he says it.`,
        answers: ["kohvi", "kohv"],
        line: 13,
      },
    ];

    return { pairs, tell, gaps, translations, fixes, note, call };
  }, [t, i18n]);
}

export function JubaVeelAllesLesson() {
  const { t } = useLingui();
  const content = useContent();
  const perfect = lessonBySlug("olen-lugenud")?.n;
  const names = { third: t`Kati`, fourth: t`Mart` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Tell five everyday time words apart: <b lang="et">juba</b> (already),{" "}
          <b lang="et">veel</b> (still), <b lang="et">ei … veel</b> (not yet),{" "}
          <b lang="et">ei … enam</b> (no longer) and <b lang="et">alles</b> (only, not until, just).
        </Trans>
      }
      facts={[
        <Trans key="m">20 minutes</Trans>,
        <Trans key="q">7 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["juba", "veel", "alles", "enam"]}
      recap={[
        <Trans key="1">
          <b lang="et">Juba</b> means already (sooner than expected):{" "}
          <b lang="et">Kell on juba kümme.</b>
        </Trans>,
        <Trans key="2">
          <b lang="et">Alles</b> means only, just recently, or not until:{" "}
          <b lang="et">Kell on alles seitse.</b> <b lang="et">Ta tuli alles eile.</b>
        </Trans>,
        <Trans key="3">
          In positive sentences, <b lang="et">veel</b> usually means still or more (
          <b lang="et">Ma olen veel tööl</b>); with <b lang="et">ei</b>, it means not yet (
          <b lang="et">Ta ei ole veel kodus</b>).
        </Trans>,
        <Trans key="4">
          <b lang="et">Ei … enam</b> means no longer (<b lang="et">Ma ei ela enam seal</b>);{" "}
          <b lang="et">enam</b> usually appears only in negative sentences.
        </Trans>,
      ]}
      sections={[
        {
          id: "words",
          title: t`Five time words`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {perfect} you saw <Word w="juba" /> with the perfect tense. Estonian
                    uses four short words to show whether something happened early, late, is still
                    going on, or has stopped: <Word w="juba" />, <Word w="veel" />,{" "}
                    <Word w="alles" /> and <Word w="enam" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Watch what happens with <b lang="et">ei</b>: Estonian usually does not say{" "}
                    <b lang="et">ei … juba</b>. Instead, not yet is <b lang="et">ei … veel</b>, and
                    no longer is <b lang="et">ei … enam</b>.
                  </Trans>
                </p>
              </Prose>
              <TimeWordsTable />
              <Aside>
                <Trans>
                  <b lang="et">Veel</b> also means “more” in offers and requests:{" "}
                  <b lang="et">Kas sa tahad veel kohvi?</b> (Would you like more coffee?).
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Match each Estonian word or phrase with its meaning.</Trans>
                </p>
              </Prose>
              <Match
                id="time-adverbs"
                title={<Trans>What does each word mean?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="a">Estonian</Trans>, <Trans key="b">Meaning</Trans>]}
              />
            </>
          ),
        },
        {
          id: "tell",
          title: t`Already or only?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear each sentence and decide whether it means already (<b lang="et">juba</b>)
                    or only / not until (<b lang="et">alles</b>).
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="tell-time-word"
                title={<Trans>Already or only?</Trans>}
                items={content.tell}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Check the table above, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={eachPairFirst}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "pick",
          title: t`Pick the word`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Pick <b lang="et">juba</b>, <b lang="et">veel</b>, <b lang="et">enam</b> or{" "}
                    <b lang="et">alles</b> to complete each sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="pick-time-word"
                title={<Trans>Which word fits?</Trans>}
                items={content.gaps}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check whether the sentence is positive or negative.</Trans>
                  ) : (
                    <Trans>Go through the table once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={gapRun}
                round={(props) => <PickRound {...props} />}
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
                  <Trans>Write each sentence in Estonian using the right time word.</Trans>
                </p>
              </Prose>
              <Quiz
                id="write-time-word"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the time word in the ones you missed.</Trans>
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
                    Each sentence uses the wrong time word for a positive or negative statement. Tap
                    the wrong word, then type the right one.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-time-word"
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
          id: "reading",
          title: t`Moving to a new office`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A short update is posted on the team board after an office move. Read and
                    answer.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="office-note"
                title={t`Team update`}
                sentences={JUBA_NOTE}
                questions={content.note}
              />
            </>
          ),
        },
        {
          id: "listening",
          title: t`Listen: Kati and Mart`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati calls Mart to ask how settling into his new flat is going. Listen and
                    answer. You can play the conversation twice.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="new-flat-call"
                title={t`Settling into the new flat`}
                clip="c-kolimine"
                turns={JUBA_CONVERSATION.turns}
                names={names}
                plays={2}
                questions={content.call}
              />
            </>
          ),
        },
      ]}
    />
  );
}
