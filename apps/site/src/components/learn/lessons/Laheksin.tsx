import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  CONDITIONAL_DIALOGUE,
  CONDITIONAL_GAPS,
  CONDITIONAL_OPTIONS,
  CONDITIONAL_USES,
  CONDITIONAL_VERBS,
  conditionalForms,
  objectGapSaid,
} from "../../../lib/learn/clips";
import { shuffle, shuffledRun } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Chips, Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { type GapItem, GapRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "laheksin";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Verb = keyof typeof CONDITIONAL_VERBS;

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const MEANS: Record<Verb, MessageDescriptor> = {
  olema: msg`to be`,
  minema: msg`to go`,
  tahtma: msg`to want`,
  saama: msg`to get, to be able to`,
};

const PERSONS: Record<string, MessageDescriptor> = {
  ma: msg`I`,
  sa: msg`you`,
  ta: msg`he or she`,
  me: msg`we`,
  te: msg`you, more than one`,
  nad: msg`they`,
};

const GLOSSARY: Glossary = {
  kui: { en: msg`if, when` },
  "hea meelega": { en: msg`gladly, with pleasure` },
  saiake: { en: msg`a bun, a pastry`, note: msg`Ühe saiakese: one bun, the genitive.` },
  sularahas: { en: msg`in cash` },
  "ma tahaksin kohvi.": { en: msg`I would like some coffee.` },
  "kas sa saaksid mind aidata?": { en: msg`Could you help me?` },
  "kui mul oleks aega, läheksin ma randa.": {
    en: msg`If I had time, I would go to the beach.`,
  },
  "ma ei läheks sinna.": { en: msg`I wouldn’t go there.` },
};

function VerbTable() {
  const { t, i18n } = useLingui();
  const [verb, setVerb] = useState<Verb>("olema");
  const verbs = (Object.keys(CONDITIONAL_VERBS) as Verb[]).map((value) => ({
    value,
    label: value,
    lang: "et",
  }));
  const rows: ParadigmRow[] = conditionalForms(verb).map((form) => ({
    id: form.pronoun,
    label: i18n._(PERSONS[form.pronoun] as MessageDescriptor),
    cells: [
      { form: form.now, src: src(form.now) },
      { form: form.would, src: src(form.would) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips label={t`Verb`} items={verbs} value={verb} onPick={setVerb} />
      <p className="m-0 text-sm">
        <Et>{verb}</Et>, {i18n._(MEANS[verb])}
      </p>
      <Paradigm
        key={verb}
        label={t`Present and conditional, person by person`}
        columns={[t`Does`, t`Would`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a form`,
          tip: (
            <Trans>
              Every would form has <Et>-ks</Et> in it, then the person ending.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

function SentenceList({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 grid list-none gap-1 p-0">
      {items.map((said) => (
        <li key={said}>
          <Word w={said} />
        </li>
      ))}
    </ul>
  );
}

type GapRun = GapItem & { id: string; said: string };

function useContent() {
  const { t } = useLingui();
  return useMemo(() => {
    const whys: Record<string, ReactNode> = {
      sa: (
        <Trans>
          With <Et>sa</Et>, the ending is <Et>-ksid</Et>.
        </Trans>
      ),
      me: (
        <Trans>
          With <Et>me</Et>, the ending is <Et>-ksime</Et>.
        </Trans>
      ),
      ta: (
        <Trans>
          With <Et>ta</Et>, just <Et>-ks</Et>.
        </Trans>
      ),
    };
    const gaps: GapRun[] = CONDITIONAL_GAPS.map((gap) => {
      const said = objectGapSaid(gap);
      return {
        id: gap.id,
        said,
        src: src(said),
        before: gap.before,
        after: gap.after,
        options: CONDITIONAL_OPTIONS[gap.verb],
        answer: gap.answer,
        explain: whys[gap.id.split("-").at(-1) as string],
      };
    });

    const said = (clip: keyof typeof CONDITIONAL_DIALOGUE) => {
      const line = CONDITIONAL_DIALOGUE[clip];
      return typeof line === "string" ? line : line.text;
    };
    const talk: DialogueTurn[] = [
      { who: "them", clip: "d-teenindaja-1", line: said("d-teenindaja-1") },
      {
        who: "you",
        clip: "d-sina-1",
        replies: [
          {
            line: "Ma tahtsin kohvi.",
            why: (
              <Trans>
                <Et>Tahtsin</Et> is the past, I wanted. To ask politely now: <Et>tahaksin</Et>.
              </Trans>
            ),
          },
          { line: said("d-sina-1"), right: true },
          {
            line: "Ma tahaksid ühe kohvi, palun.",
            why: (
              <Trans>
                <Et>-ksid</Et> is for <Et>sa</Et> or <Et>nad</Et>. With <Et>ma</Et>:{" "}
                <Et>tahaksin</Et>.
              </Trans>
            ),
          },
        ],
      },
      { who: "them", clip: "d-teenindaja-2", line: said("d-teenindaja-2") },
      {
        who: "you",
        clip: "d-sina-2",
        replies: [
          { line: said("d-sina-2"), right: true },
          {
            line: "Jah, ma võtsin.",
            why: (
              <Trans>
                <Et>Võtsin</Et> is the past, I took. To order: <Et>võtaksin</Et>.
              </Trans>
            ),
          },
          {
            line: "Jah, me võtaksin saiakese.",
            why: (
              <Trans>
                With <Et>me</Et>, the ending is <Et>-ksime</Et>. For yourself: <Et>ma võtaksin</Et>.
              </Trans>
            ),
          },
        ],
      },
      { who: "them", clip: "d-teenindaja-3", line: said("d-teenindaja-3") },
      {
        who: "you",
        clip: "d-sina-3",
        replies: [
          {
            line: "Kas ma saaksin sularahas maksma?",
            why: (
              <Trans>
                After <Et>saama</Et>, the <Et>-da</Et> form: <Et>maksta</Et>.
              </Trans>
            ),
          },
          {
            line: "Kas ma sain?",
            why: (
              <Trans>
                <Et>Sain</Et> is the past. To ask politely: <Et>kas ma saaksin</Et>.
              </Trans>
            ),
          },
          { line: said("d-sina-3"), right: true },
        ],
      },
    ];

    return { gaps, talk };
  }, [t]);
}

const gapRun = (items: readonly GapRun[], pinned?: GapRun): GapRun[] =>
  shuffledRun(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle([...item.options]) },
  );

export function LaheksinLesson() {
  const { t } = useLingui();
  const content = useContent();
  const modals = lessonBySlug("modaalverbid")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          The would form: <Et>ma läheksin</Et>, <Et>ma tahaksin kohvi</Et>,{" "}
          <Et>kui mul oleks aega</Et>. One sign, <Et>-ks</Et>, and the person endings.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">2 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["kui", "hea meelega", "saiake", "sularahas"]}
      recap={[
        <Trans key="1">
          Take the present <b lang="et">ma</b> form, swap <b lang="et">-n</b> for{" "}
          <b lang="et">-ksin</b>: <b lang="et">lähen, läheksin</b>.
        </Trans>,
        <Trans key="2">
          Endings: <b lang="et">-ksin, -ksid, -ks, -ksime, -ksite, -ksid</b>. With{" "}
          <b lang="et">ei</b>, just <b lang="et">-ks</b>: <b lang="et">ma ei läheks</b>.
        </Trans>,
        <Trans key="3">
          Polite: <b lang="et">Ma tahaksin kohvi.</b> If: <b lang="et">Kui mul oleks aega…</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "build",
          title: t`One sign: -ks`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    English puts would before the verb. Estonian puts <Et>-ks</Et> inside it. Take
                    the present form for <Et>ma</Et>, drop its <Et>-n</Et> and add <Et>-ksin</Et>:{" "}
                    <Et>lähen, läheksin</Et>; <Et>olen, oleksin</Et>; <Et>tahan, tahaksin</Et>. The
                    other persons change only the end: <Et>-ksid</Et>, <Et>-ks</Et>, <Et>-ksime</Et>
                    , <Et>-ksite</Et>, <Et>-ksid</Et>.
                  </Trans>
                </p>
              </Prose>
              <VerbTable />
              <Aside>
                <Trans>
                  To say no, use <Et>ei</Et> and the bare <Et>-ks</Et> form for everyone:{" "}
                  <Et>ma ei läheks</Et>, <Et>nad ei läheks</Et>. In speech you also hear{" "}
                  <Et>ma läheks</Et> for <Et>ma läheksin</Et>. In writing, use the full endings.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "uses",
          title: t`Polite and if`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    You use it in two places. To ask politely: <Et>ma tahaksin</Et>, I would like,
                    and <Et>kas sa saaksid</Et>, could you, from lesson {modals}. And for what isn’t
                    real, after <Word w="kui" />, if: both halves of the sentence take it.
                  </Trans>
                </p>
              </Prose>
              <SentenceList items={CONDITIONAL_USES} />
            </>
          ),
        },
        {
          id: "endings",
          title: t`Who would?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Pick the written form that fits the person before the gap, then hear the
                    sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="would-endings"
                title={<Trans>Which ending?</Trans>}
                items={content.gaps}
                rounds={9}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All nine. You match the ending to the person every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Look at the word just before each gap.</Trans>
                  ) : (
                    <Trans>Read the table once more, then try again.</Trans>
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
          id: "cafe",
          title: t`Ordering politely`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    You order at a café. Pick what you say back. If you pick a wrong reply, you see
                    why, then hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="cafe-would"
                title={<Trans>Talk: a coffee, please</Trans>}
                part={
                  <Trans>
                    You want a coffee and a <Word w="saiake" />, and you’d like to pay in cash.
                  </Trans>
                }
                them={t`Waiter`}
                turns={content.talk}
              />
            </>
          ),
        },
      ]}
    />
  );
}
