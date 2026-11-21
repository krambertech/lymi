import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  FUTURE_DIALOGUE,
  FUTURE_GAPS,
  FUTURE_SATURDAY,
  FUTURE_TIMELINE,
  HAKKAMA_ENDINGS,
  HAKKAMA_VERBS,
  hakkamaSentence,
  PRESENT_ENDINGS,
  PRESENT_VERBS,
  presentWithPronoun,
} from "../../../lib/learn/clips";
import { playSound } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Chips, Panel } from "../Explore";
import { type GapItem as PassageGap, GapPassage } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { type GapItem, GapRound, Quiz } from "../Quiz";
import { Timeline, type TimelinePoint } from "../Timeline";
import { Word } from "../Word";

const SLUG = "tulevik";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type HakkamaVerb = (typeof HAKKAMA_VERBS)[number];
type Pronoun = (typeof HAKKAMA_ENDINGS)[number]["pronoun"];
type GapVerb = (typeof FUTURE_GAPS)[number];

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

const MEANS: Record<HakkamaVerb, MessageDescriptor> = {
  õppima: msg`to learn, to study`,
  töötama: msg`to work`,
  elama: msg`to live`,
  lugema: msg`to read`,
};

const PERSON_LABELS: Record<Pronoun, MessageDescriptor> = {
  ma: msg`I`,
  sa: msg`you`,
  ta: msg`he or she`,
  me: msg`we`,
  te: msg`you, to more than one; polite you`,
  nad: msg`they`,
};

function presentSaid(pronoun: Pronoun, verb: HakkamaVerb) {
  const stem = PRESENT_VERBS.find((each) => each.verb === verb)?.stem ?? "";
  const ending = PRESENT_ENDINGS.find((each) => each.pronoun === pronoun)?.ending ?? "";
  return {
    form: `${stem}|${ending}`,
    src: clipUrl("olevik", clipId(presentWithPronoun(pronoun, stem, ending))),
  };
}

function HakkamaTable() {
  const { t, i18n } = useLingui();
  const [verb, setVerb] = useState<HakkamaVerb>("õppima");
  const stem = verb.slice(0, -2);
  const rows: ParadigmRow[] = HAKKAMA_ENDINGS.map((person) => {
    const now = presentSaid(person.pronoun, verb);
    return {
      id: person.pronoun,
      label: i18n._(PERSON_LABELS[person.pronoun]),
      et: person.pronoun,
      tip: (
        <Trans>
          <Et>Hakkama</Et> takes the person’s ending; the verb after it stays in its <End>ma</End>{" "}
          form.
        </Trans>
      ),
      cells: [
        { form: now.form, src: now.src },
        {
          form: `hakka${person.ending} ${stem}|ma`,
          src: src(hakkamaSentence(person.pronoun, person.ending, verb)),
        },
      ],
    };
  });
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Verbs`}
        items={HAKKAMA_VERBS.map((each) => ({ label: each, value: each, lang: "et" }))}
        value={verb}
        onPick={(value) => {
          setVerb(value);
          void playSound(src(value));
        }}
      />
      <p className="-mt-2 text-md text-ink-secondary">
        <span lang="et" className="font-medium text-ink">
          {verb}
        </span>{" "}
        {i18n._(MEANS[verb])}
      </p>
      <Paradigm
        key={verb}
        label={t`Now and from now on`}
        columns={[t`Now`, t`From now on`]}
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

type When = "homme" | "eile";
type FormItem = GapItem & { said: string; pair: readonly [string, string] };

const GAP_MEANS: Record<string, MessageDescriptor> = {
  "Homme ma olen kodus.": msg`Tomorrow I’ll be at home.`,
  "Eile ma olin kodus.": msg`Yesterday I was at home.`,
  "Homme ma töötan.": msg`Tomorrow I’m working.`,
  "Eile ma töötasin.": msg`Yesterday I worked.`,
  "Homme ma loen raamatut.": msg`Tomorrow I’ll read a book.`,
  "Eile ma lugesin raamatut.": msg`Yesterday I read a book.`,
  "Homme ma lähen tööle.": msg`Tomorrow I’m going to work.`,
  "Eile ma läksin tööle.": msg`Yesterday I went to work.`,
  "Homme ma tulen koju.": msg`Tomorrow I’m coming home.`,
  "Eile ma tulin koju.": msg`Yesterday I came home.`,
};

const gapOptions = (verb: GapVerb, turn: number) => {
  const three = [verb.now, verb.past, verb.verb];
  return [...three.slice(turn % 3), ...three.slice(0, turn % 3)];
};

export function formItems(): FormItem[] {
  return FUTURE_GAPS.flatMap((verb, i) =>
    (["homme", "eile"] as const).map((when: When, k) => {
      const said = verb[when];
      const answer = when === "homme" ? verb.now : verb.past;
      const [before, after] = said.split(` ${answer}`) as [string, string];
      return {
        src: src(said),
        before,
        after: after.trim(),
        options: gapOptions(verb, i + k),
        answer,
        said,
        pair: [verb.verb, `${verb.verb}-${when}`] as const,
        explain: (
          <>
            <span lang="et" className="font-medium text-ink">
              {said}
            </span>{" "}
            {when === "homme" ? (
              <Trans>
                With <Et>homme</Et>, the present says what’s coming.
              </Trans>
            ) : (
              <Trans>
                With <Et>eile</Et>, the past.
              </Trans>
            )}
          </>
        ),
      };
    }),
  );
}

const formRun = (items: readonly FormItem[], pinned?: FormItem): FormItem[] =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle([...item.options]) },
  );

const TIME_LABELS: Record<(typeof FUTURE_TIMELINE)[number]["id"], MessageDescriptor> = {
  yesterday: msg`Yesterday`,
  today: msg`Today`,
  tomorrow: msg`Tomorrow`,
  "next-week": msg`Next week`,
};
const TIME_MEANS: Record<(typeof FUTURE_TIMELINE)[number]["id"], MessageDescriptor> = {
  yesterday: msg`Yesterday I worked at home.`,
  today: msg`Today I’m working at home.`,
  tomorrow: msg`Tomorrow I’m working at the office.`,
  "next-week": msg`Next week I’ll be in Tartu.`,
};
const TIME_BUILDS: Record<(typeof FUTURE_TIMELINE)[number]["id"], MessageDescriptor> = {
  yesterday: msg`the past, for I`,
  today: msg`the present, for I`,
  tomorrow: msg`the present, for I`,
  "next-week": msg`the present, for I`,
};

const GLOSSARY: Glossary = {
  tulevik: { en: msg`the future` },
  homme: { en: msg`tomorrow` },
  ülehomme: { en: msg`the day after tomorrow` },
  "järgmisel nädalal": {
    en: msg`next week`,
    note: msg`Järgmine nädal, next week, with the -l that says when, as in eelmisel nädalal.`,
  },
  "homme ma lähen tööle": {
    en: msg`Tomorrow I’m going to work.`,
    show: "Homme ma lähen tööle.",
    clip: clipId("Homme ma lähen tööle."),
  },
  "täna ma töötan": {
    en: msg`Today I’m working.`,
    show: "Täna ma töötan.",
    clip: clipId("Täna ma töötan."),
  },
  "homme ma töötan": {
    en: msg`Tomorrow I’m working.`,
    show: "Homme ma töötan.",
    clip: clipId("Homme ma töötan."),
  },
  hakkama: { en: msg`to start; with another verb, to be going to` },
  hakkan: { en: msg`I start; I’m going to`, note: msg`From hakkama: hakkan õppima.` },
  "ma hakkan õppima": {
    en: msg`I’m going to study; I’ll start studying.`,
    show: "Ma hakkan õppima.",
    clip: clipId("Ma hakkan õppima."),
  },
  "ma hakkan tartus elama": {
    en: msg`I’m going to live in Tartu.`,
    show: "Ma hakkan Tartus elama.",
    clip: clipId("Ma hakkan Tartus elama."),
  },
  millal: { en: msg`when` },
};

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const points: TimelinePoint[] = FUTURE_TIMELINE.map((point) => ({
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

    const message: PassageGap[] = [
      {
        id: "lahen",
        before: "Järgmisel nädalal ma",
        after: "Tartusse.",
        answer: "lähen",
        options: ["läksin", "lähen"],
        why: (
          <Trans>
            Next week is still to come, so the present: <Et>lähen</Et>.
          </Trans>
        ),
      },
      {
        id: "hakkan",
        before: "Ma",
        after: "Tartus elama.",
        answer: "hakkan",
        options: ["hakkan", "hakkad"],
        why: (
          <Trans>
            Mari writes about herself, so <Et>ma hakkan</Et>.
          </Trans>
        ),
      },
      {
        id: "oppima",
        before: "Ma hakkan eesti keelt",
        after: ".",
        answer: "õppima",
        options: ["õppida", "õppima"],
        why: (
          <Trans>
            After <Et>hakkan</Et>, the <End>ma</End> form: <Et>hakkan õppima</Et>.
          </Trans>
        ),
      },
      {
        id: "olen",
        before: "Homme ma",
        after: "Tallinnas.",
        answer: "olen",
        options: ["olen", "olin"],
        why: (
          <Trans>
            <Et>Homme</Et> is tomorrow, so the present: <Et>olen</Et>.
          </Trans>
        ),
      },
      {
        id: "tuled",
        before: "Kas sa",
        after: "ka?",
        answer: "tuled",
        options: ["tulid", "tuled"],
        why: (
          <Trans>
            Mari asks about next week, so the present: <Et>tuled</Et>.
          </Trans>
        ),
      },
    ];

    const saturday: PassageQuestion[] = [
      {
        id: "tomorrow",
        ask: t`What is Jaan doing tomorrow?`,
        options: [
          { id: "work", label: t`Working in Tartu` },
          { id: "market", label: t`Going to the market` },
          { id: "home", label: t`Staying at home` },
        ],
        answer: "market",
        line: 1,
      },
      {
        id: "after",
        ask: t`Where will he be the day after tomorrow?`,
        options: [
          { id: "home", label: t`At home` },
          { id: "tartu", label: t`In Tartu` },
          { id: "market", label: t`At the market` },
        ],
        answer: "home",
        line: 2,
      },
      {
        id: "next",
        ask: t`What is he going to do next week?`,
        options: [
          { id: "study", label: t`Study in Tallinn` },
          { id: "live", label: t`Live at home` },
          { id: "work", label: t`Work in Tartu` },
        ],
        answer: "work",
        line: 3,
      },
    ];

    const said = (clip: keyof typeof FUTURE_DIALOGUE) => {
      const line = FUTURE_DIALOGUE[clip];
      return typeof line === "string" ? line : line.text;
    };
    const talk: DialogueTurn[] = [
      { who: "them", clip: "d-kati-1", line: said("d-kati-1") },
      {
        who: "you",
        clip: "d-sina-1",
        replies: [
          { line: said("d-sina-1"), right: true },
          {
            line: "Homme ma töötasin kodus.",
            why: (
              <Trans>
                <Et>Töötasin</Et> is the past. For tomorrow, the present: <Et>töötan</Et>.
              </Trans>
            ),
          },
          {
            line: "Eile ma töötasin kodus.",
            why: t`That’s about yesterday. Kati asked about tomorrow.`,
          },
        ],
      },
      { who: "them", clip: "d-kati-2", line: said("d-kati-2") },
      {
        who: "you",
        clip: "d-sina-2",
        replies: [
          {
            line: "Jah, ma hakkan õppida.",
            why: (
              <Trans>
                After <Et>hakkan</Et> comes the <End>ma</End> form: <Et>õppima</Et>.
              </Trans>
            ),
          },
          {
            line: "Jah, ma hakkad õppida.",
            why: (
              <Trans>
                <Et>Hakkad</Et> is for <Et>sa</Et>, and after it comes the <End>ma</End> form:{" "}
                <Et>ma hakkan õppima</Et>.
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
            line: "Eelmisel nädalal.",
            why: t`That’s last week. You haven’t gone yet.`,
          },
          { line: said("d-sina-3"), right: true },
          {
            line: "Järgmisel nädalal läksin.",
            why: (
              <Trans>
                <Et>Läksin</Et> is the past. Next week is still to come: <Et>lähen</Et>.
              </Trans>
            ),
          },
        ],
      },
    ];

    return { points, message, saturday, talk, forms: formItems() };
  }, [t, i18n]);
}

export function TulevikLesson() {
  const { t } = useLingui();
  const content = useContent();
  const present = lessonBySlug("olevik")?.n;
  const past = lessonBySlug("lihtminevik")?.n;
  const infinitives = lessonBySlug("tegevusnimed")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Estonian has no future tense. The present with a time word says what’s coming, and{" "}
          <Et>hakkama</Et> with a <End>ma</End> form says what you’re going to do.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">4 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "tulevik",
        "homme",
        "ülehomme",
        "järgmisel nädalal",
        "hakkama",
        "ma hakkan õppima",
        "millal",
      ]}
      recap={[
        <Trans key="1">
          Estonian has no separate future tense. The present says what’s coming:{" "}
          <b lang="et">Homme ma töötan</b>, tomorrow I’m working.
        </Trans>,
        <Trans key="2">
          A time word says when: <b lang="et">homme, ülehomme, järgmisel nädalal</b>.
        </Trans>,
        <Trans key="3">
          <b lang="et">Hakkama</b> and a <End>ma</End> form say what you’re going to do or start
          doing: <b lang="et">Ma hakkan eesti keelt õppima</b>.
        </Trans>,
        <Trans key="4">
          <Et>Hakkama</Et> takes the person’s ending, and the verb after it stays the same:{" "}
          <b lang="et">ma hakkan, nad hakkavad õppima</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "no-future",
          title: t`The present says what’s coming`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Estonian has no separate future tense. You say what’s coming with the present of
                    lesson {present} and a word for when:{" "}
                    <Nowrap>
                      <Word w="Homme ma lähen tööle" />.
                    </Nowrap>{" "}
                    English does this too: tomorrow I’m going to work.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    So <Word w="Täna ma töötan" /> and <Word w="Homme ma töötan" /> have the same
                    verb. Only the time word changes. With <b lang="et">eile</b> you use the past of
                    lesson {past}. Tap a time on the line to hear its sentence.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Timeline
                  label={t`Yesterday, today, tomorrow and next week`}
                  points={content.points}
                  empty={{
                    title: t`Tap a time`,
                    tip: t`You’ll hear a sentence and see how its verb is built.`,
                  }}
                />
              </Panel>
              <Aside>
                <Trans>
                  <Word w="Järgmisel nädalal" />, next week, mirrors the <b lang="et">eelmisel</b>{" "}
                  <b lang="et">nädalal</b> of lesson {past}. <Word w="Ülehomme" /> is the day after
                  tomorrow.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "which-form",
          title: t`Tomorrow or yesterday`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Pick the verb that fits the time word, then hear the sentence.{" "}
                    <b lang="et">Homme</b> takes the present, <b lang="et">eile</b> the past.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="tomorrow-or-yesterday"
                title={<Trans>Which form?</Trans>}
                items={content.forms}
                rounds={5}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All five. You matched every time word with its form.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Tap the times on the line once more.</Trans>
                  ) : (
                    <Trans>Go back to the line above, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={formRun}
                round={(props) => <GapRound {...props} listen="after" />}
              />
            </>
          ),
        },
        {
          id: "hakkama",
          title: t`Going to: hakkama`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {infinitives} you met <Word w="hakkan" />, I start, with a{" "}
                    <End>ma</End> form after it. It also says what you’re going to do, often
                    something that will go on for a while:{" "}
                    <Nowrap>
                      <Word w="Ma hakkan Tartus elama" />.
                    </Nowrap>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Hakkama" /> takes the person’s ending, and the verb after it stays in
                    its <End>ma</End> form: <Word w="Ma hakkan õppima" />,{" "}
                    <b lang="et">nad hakkavad õppima</b>. Pick a verb and compare now with from now
                    on.
                  </Trans>
                </p>
              </Prose>
              <HakkamaTable />
              <Aside>
                <Trans>
                  For one event, such as a trip tomorrow, the present is the usual choice:{" "}
                  <b lang="et">Homme ma lähen Tartusse</b>.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "message",
          title: t`Mari’s plans`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari is moving to Tartu. Pick the word that fits each gap in her message.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="mari-plans"
                title={<Trans>Fill the gaps: Mari’s plans</Trans>}
                gaps={content.message}
                mode="pick"
                clip="p-message"
              />
            </>
          ),
        },
        {
          id: "saturday",
          title: t`Jaan’s week`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Listen to what Jaan is going to do, then answer.</Trans>
                </p>
              </Prose>
              <Listening
                id="jaan-week"
                title={<Trans>Listen: Jaan’s week</Trans>}
                clip="p-saturday"
                sentences={FUTURE_SATURDAY}
                questions={content.saturday}
              />
            </>
          ),
        },
        {
          id: "talk",
          title: t`Talking about plans`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati asks about your plans. Pick what you say back. If you pick a wrong reply,
                    you see why, then hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="plans-talk"
                title={<Trans>Talk: plans with Kati</Trans>}
                part={
                  <Trans>
                    Tomorrow you’re working at home. You’re going to study Estonian, and next week
                    you’re going to Tartu. Kati speaks first.
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
