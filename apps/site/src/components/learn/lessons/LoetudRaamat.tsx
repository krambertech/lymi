import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  BIKE_AD_PASSAGE,
  clipId,
  clipUrl,
  objectGapSaid,
  PARTICIPLE_GAPS,
  PARTICIPLE_VERBS,
} from "../../../lib/learn/clips";
import { shuffle, shuffledRun } from "../../../lib/learn/quiz";
import { Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { type PassageQuestion, Reading } from "../Passage";
import { type GapItem, GapRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "loetud-raamat";
const src = (text: string) => clipUrl(SLUG, clipId(text));

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const MEANS: Record<string, MessageDescriptor> = {
  lugema: msg`to read`,
  tegema: msg`to do, to make`,
  kirjutama: msg`to write`,
  laulma: msg`to sing`,
  kasutama: msg`to use`,
  sööma: msg`to eat`,
};

const GLOSSARY: Glossary = {
  kuulutus: { en: msg`an ad, a notice` },
  hoidma: { en: msg`to keep, to look after`, note: msg`Hästi hoitud, well kept.` },
  kokkuleppel: { en: msg`by agreement, to be agreed` },
};

function ParticipleTable() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = PARTICIPLE_VERBS.map((verb) => ({
    id: verb.ma,
    label: i18n._(MEANS[verb.ma] as MessageDescriptor),
    tip: (
      <Trans>
        <Et>{verb.v}</Et> is doing it, <Et>{verb.nud}</Et> has done it, and something{" "}
        <Et>{verb.tud}</Et> has had it done to it.
      </Trans>
    ),
    cells: [
      { form: verb.ma, src: src(verb.ma) },
      { form: verb.v, src: src(verb.v) },
      { form: verb.nud, src: src(verb.nud) },
      { form: verb.tud, src: src(verb.tud) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Paradigm
        label={t`Verbs and the adjectives made from them`}
        columns={[t`Verb`, t`Doing it`, t`Has done it`, t`Done to it`]}
        rows={rows}
        highlight={{ column: 3 }}
        empty={{
          title: t`Tap a form`,
          tip: <Trans>One verb gives three words that describe a noun.</Trans>,
        }}
      />
    </Panel>
  );
}

const FORM_POOL = [...new Set(PARTICIPLE_GAPS.flatMap((gap) => gap.options))];

const isDone = (word: string) => word.endsWith("tud") || word.endsWith("dud");

const oppositeOf = (answer: string, pair: readonly string[]) =>
  FORM_POOL.filter((word) => !pair.includes(word) && isDone(word) !== isDone(answer));

function firstOptions(pair: readonly string[], answer: string, index: number): string[] {
  const other = pair.find((word) => word !== answer) as string;
  const third = oppositeOf(answer, pair).at(index % 4) as string;
  const order = [answer, other, third];
  const turn = (index % 3) + 1;
  return [...order.slice(turn), ...order.slice(0, turn)];
}

type GapRun = GapItem & { id: string; said: string; pair: readonly string[] };

function content(t: (descriptor: MessageDescriptor) => string) {
  const why = (kind: string, answer: string): ReactNode =>
    kind === "v" ? (
      <Trans>
        The noun is doing it itself, so it takes <Et>-v</Et>: <Et>{answer}</Et>.
      </Trans>
    ) : (
      <Trans>
        Someone did it to the noun, so it takes <Et>-tud</Et>: <Et>{answer}</Et>.
      </Trans>
    );
  const gaps: GapRun[] = PARTICIPLE_GAPS.map((gap, index) => {
    const said = objectGapSaid(gap);
    return {
      id: gap.id,
      said,
      src: src(said),
      before: gap.before,
      after: gap.after,
      pair: gap.options,
      options: firstOptions(gap.options, gap.answer, index),
      answer: gap.answer,
      explain: why(gap.id.split("-")[0] as string, gap.answer),
    };
  });

  const ad: PassageQuestion[] = [
    {
      id: "what",
      ask: t(msg`What is for sale?`),
      options: [
        { id: "used", label: t(msg`A used bicycle`) },
        { id: "new", label: t(msg`A new bicycle`) },
        { id: "seat", label: t(msg`A child’s car seat`) },
      ],
      answer: "used",
      line: 0,
    },
    {
      id: "done",
      ask: t(msg`What was done to it last month?`),
      options: [
        { id: "sold", label: t(msg`It was sold`) },
        { id: "fixed", label: t(msg`It was repaired`) },
        { id: "painted", label: t(msg`It was painted`) },
      ],
      answer: "fixed",
      line: 1,
    },
    {
      id: "who",
      ask: t(msg`Who is it right for?`),
      options: [
        { id: "adult", label: t(msg`A grown-up who rides to work`) },
        { id: "small", label: t(msg`A small child learning to ride`) },
        { id: "child", label: t(msg`A growing child`) },
      ],
      answer: "child",
      line: 2,
    },
  ];

  return { gaps, ad };
}

const withThird = (item: GapRun): GapRun => {
  const third = shuffle(oppositeOf(item.answer, item.pair))[0] as string;
  return { ...item, options: shuffle([...item.pair, third]) };
};

const gapRun = (items: readonly GapRun[], pinned?: GapRun): GapRun[] =>
  shuffledRun(items, pinned).map((item) => (item === pinned ? item : withThird(item)));

export function LoetudRaamatLesson() {
  const { t, i18n } = useLingui();
  const lesson = content((descriptor) => i18n._(descriptor));
  const perfect = lessonBySlug("olen-lugenud")?.n;
  const impersonal = lessonBySlug("raagitakse")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <Et>Loetud raamat</Et>, a book that has been read. <Et>Magav laps</Et>, a sleeping child.
          A verb can describe a noun, just like an adjective.
        </Trans>
      }
      facts={[
        <Trans key="m">10 minutes</Trans>,
        <Trans key="q">2 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["kuulutus", "hoidma", "kokkuleppel"]}
      recap={[
        <Trans key="1">
          <b lang="et">-v</b> for what the noun is doing: <b lang="et">magav laps</b>, a sleeping
          child. Take the <b lang="et">-ma</b> form and swap <b lang="et">-ma</b> for{" "}
          <b lang="et">-v</b>, or <b lang="et">-ev</b> after a consonant: <b lang="et">laulev</b>.
        </Trans>,
        <Trans key="2">
          <b lang="et">-nud</b> for what the noun has done: <b lang="et">väsinud mees</b>, a man who
          is tired.
        </Trans>,
        <Trans key="3">
          <b lang="et">-tud</b> or <b lang="et">-dud</b> for what was done to the noun:{" "}
          <b lang="et">loetud raamat</b>, <b lang="et">suletud uks</b>.
        </Trans>,
        <Trans key="4">
          <b lang="et">-nud</b> and <b lang="et">-tud</b> never change before a noun:{" "}
          <b lang="et">ma ostsin kasutatud auto</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "forms",
          title: t`Three verb adjectives`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    You already know two of these forms. The <Et>-nud</Et> form from lesson{" "}
                    {perfect} says what someone has done, and the <Et>-tud</Et> form from lesson{" "}
                    {impersonal} says what was done. Put either one before a noun and it works like
                    an adjective. The new one is <Et>-v</Et>, for what the noun is doing right now,
                    like English “sleeping” in “a sleeping child”.
                  </Trans>
                </p>
              </Prose>
              <ParticipleTable />
              <Aside>
                <Trans>
                  <Et>-nud</Et> and <Et>-tud</Et> stay the same whatever the noun does:{" "}
                  <Et>kasutatud auto</Et>, <Et>kasutatud autot</Et>, <Et>kasutatud autos</Et>.{" "}
                  <Et>-v</Et> changes like any adjective: <Et>magav laps</Et>, but{" "}
                  <Et>ma nägin magavat last</Et>. You meet them every day on signs: <Et>avatud</Et>,
                  open, and <Et>suletud</Et>, closed.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "quiz",
          title: t`Doing it, or done to it?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Is the noun doing it, or did someone do it to the noun? Pick the form, then hear
                    the sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="v-or-tud"
                title={
                  <Trans>
                    <Et>-v</Et> or <Et>-tud</Et>?
                  </Trans>
                }
                items={lesson.gaps}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight. You can turn any verb into an adjective.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Ask: does the noun do it, or is it done to it?</Trans>
                  ) : (
                    <Trans>Look through the table once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={gapRun}
                round={(props) => <GapRound {...props} listen="after" />}
              />
            </>
          ),
        },
        {
          id: "ad",
          title: t`A bike for sale`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Someone is selling a bike. Read the <Word w="kuulutus" /> and look for the{" "}
                    <Et>-tud</Et> and <Et>-v</Et> words. <Et>Müüa</Et> at the start of an ad means
                    for sale.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="bike-ad"
                title={<Trans>What does the ad say?</Trans>}
                by={t`An ad`}
                clip="p-ad"
                sentences={BIKE_AD_PASSAGE}
                questions={lesson.ad}
              />
            </>
          ),
        },
      ]}
    />
  );
}
