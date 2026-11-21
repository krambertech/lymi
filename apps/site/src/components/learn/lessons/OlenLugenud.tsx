import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  PERFECT_CONTRASTS,
  PERFECT_DIALOGUE,
  PERFECT_VERBS,
  PERFECT_WHEN,
  perfectForms,
} from "../../../lib/learn/clips";
import { shuffledRun } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Chips, Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { ChoiceRound, type ChoiceItem, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "olen-lugenud";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Verb = keyof typeof PERFECT_VERBS;

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const MEANS: Record<Verb, MessageDescriptor> = {
  lugema: msg`to read`,
  käima: msg`to go, to visit`,
  sööma: msg`to eat`,
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
  juba: { en: msg`already` },
  veel: { en: msg`yet, still`, note: msg`With ei: not yet. Ma ei ole veel söönud.` },
  kunagi: { en: msg`ever`, note: msg`With ei: never. Ma ei ole kunagi Pariisis käinud.` },
  kama: { en: msg`kama, an Estonian mix of roasted grain flours` },
  "ma olen tartus käinud.": { en: msg`I have been to Tartu.` },
  "eile ma käisin tartus.": { en: msg`Yesterday I went to Tartu.` },
  "ma olen juba söönud.": { en: msg`I have already eaten.` },
  "ma sõin kell kaheksa.": { en: msg`I ate at eight.` },
  "kui kati tuli, olin ma juba söönud.": { en: msg`When Kati came, I had already eaten.` },
};

function VerbTable() {
  const { t, i18n } = useLingui();
  const [verb, setVerb] = useState<Verb>("lugema");
  const verbs = (Object.keys(PERFECT_VERBS) as Verb[]).map((value) => ({
    value,
    label: value,
    lang: "et",
  }));
  const rows: ParadigmRow[] = perfectForms(PERFECT_VERBS[verb]).map((form) => ({
    id: form.pronoun,
    label: i18n._(PERSONS[form.pronoun] as MessageDescriptor),
    cells: [
      { form: form.now, src: src(form.now) },
      { form: form.past, src: src(form.past) },
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
        label={t`Perfect and pluperfect, person by person`}
        columns={[t`Has done`, t`Had done`]}
        rows={rows}
        empty={{
          title: t`Tap a form`,
          tip: (
            <Trans>
              Only <Et>olema</Et> changes. The <Et>-nud</Et> form stays the same for everyone.
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

type WhenRun = ChoiceItem & { id: string; said: string };

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const kinds = [
      {
        id: "now",
        label: <span lang={i18n.locale}>{t`It has happened, and it matters now`}</span>,
      },
      { id: "past", label: <span lang={i18n.locale}>{t`It happened at a set time`}</span> },
      {
        id: "before",
        label: <span lang={i18n.locale}>{t`It had happened before something else`}</span>,
      },
    ];
    const whys: Record<string, ReactNode> = {
      now: (
        <Trans>
          No time is named: the perfect, a present form of <Et>olema</Et> with <Et>-nud</Et>.
        </Trans>
      ),
      past: <Trans>A set time in the past: the simple past.</Trans>,
      before: (
        <Trans>
          Before another past moment: the pluperfect, <Et>olin</Et> with <Et>-nud</Et>.
        </Trans>
      ),
    };
    const when: WhenRun[] = PERFECT_WHEN.map((item) => ({
      id: clipId(item.said),
      said: item.said,
      src: src(item.said),
      answer: item.kind,
      options: kinds,
      explain: (
        <>
          <Et>{item.said}</Et> {whys[item.kind]}
        </>
      ),
    }));

    const said = (clip: keyof typeof PERFECT_DIALOGUE) => {
      const line = PERFECT_DIALOGUE[clip];
      return typeof line === "string" ? line : line.text;
    };
    const talk: DialogueTurn[] = [
      { who: "them", clip: "d-kati-1", line: said("d-kati-1") },
      {
        who: "you",
        clip: "d-sina-1",
        replies: [
          {
            line: "Jah, ma olen seal käisin.",
            why: (
              <Trans>
                After <Et>olen</Et> comes the <Et>-nud</Et> form: <Et>käinud</Et>.
              </Trans>
            ),
          },
          { line: said("d-sina-1"), right: true },
          {
            line: "Jah, ma olin seal varem käinud.",
            why: (
              <Trans>
                <Et>Olin</Et> is for before another past moment. Kati asks about your life up to
                now: <Et>olen</Et>.
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
            line: "Ma olen eelmisel suvel seal käinud.",
            why: (
              <Trans>
                Kati asks when, with <Et>käisid</Et>, so answer in the simple past: <Et>käisin</Et>.
              </Trans>
            ),
          },
          {
            line: "Eelmisel suvel käin ma seal.",
            why: (
              <Trans>
                <Et>Käin</Et> is the present, and last summer is past: <Et>käisin</Et>.
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
          { line: said("d-sina-3"), right: true },
          {
            line: "Ei, ma ei olnud veel.",
            why: (
              <Trans>
                <Et>Ei olnud</Et> is for before another past moment. Up to now: <Et>ei ole</Et>.
              </Trans>
            ),
          },
          {
            line: "Ei, ei ole sõin.",
            why: (
              <Trans>
                After <Et>ei ole</Et> comes the <Et>-nud</Et> form: <Et>söönud</Et>.
              </Trans>
            ),
          },
        ],
      },
    ];

    return { when, talk };
  }, [t, i18n]);
}

const whenRun = (items: readonly WhenRun[], pinned?: WhenRun): WhenRun[] =>
  shuffledRun(items, pinned);

export function OlenLugenudLesson() {
  const { t } = useLingui();
  const content = useContent();
  const negativePast = lessonBySlug("ma-ei-lainud")?.n;
  const past = lessonBySlug("lihtminevik")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <Et>Ma olen Tartus käinud</Et> and <Et>ma olin juba söönud</Et>: how to build them, and
          when Estonian uses them instead of the simple past.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">2 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["juba", "veel", "kunagi", "kama"]}
      recap={[
        <Trans key="1">
          Perfect: a present form of <b lang="et">olema</b> with <b lang="et">-nud</b>.{" "}
          <b lang="et">Ma olen lugenud.</b>
        </Trans>,
        <Trans key="2">
          Pluperfect: a past form of <b lang="et">olema</b> with <b lang="et">-nud</b>.{" "}
          <b lang="et">Ma olin lugenud.</b>
        </Trans>,
        <Trans key="3">
          A set time in the past usually takes the simple past:{" "}
          <b lang="et">Eile ma käisin Tartus.</b>
        </Trans>,
        <Trans key="4">
          No time, or a result now, takes the perfect: <b lang="et">Ma olen juba söönud.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "build",
          title: t`Have done, had done`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    You know the <Et>-nud</Et> form from lesson {negativePast}:{" "}
                    <Et>ma ei lugenud</Et>, I didn’t read. Put a form of <Et>olema</Et> before it
                    and you get two more tenses. With <Et>olen</Et>, the perfect:{" "}
                    <Et>ma olen lugenud</Et>, I have read. With <Et>olin</Et>, the pluperfect:{" "}
                    <Et>ma olin lugenud</Et>, I had read.
                  </Trans>
                </p>
              </Prose>
              <VerbTable />
              <Aside>
                <Trans>
                  To say no, put <Et>ei</Et> before <Et>ole</Et> or <Et>olnud</Et>, the same for
                  every person: <Et>ma ei ole lugenud</Et>, <Et>nad ei olnud lugenud</Et>.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "when",
          title: t`When to use them`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The simple past from lesson {past} tells what happened at a set time:{" "}
                    <Et>eile</Et>, <Et>laupäeval</Et>, <Et>kell kaheksa</Et>. The perfect tells what
                    has happened with no time named, such as something you have done in your life,
                    or a result that matters now. English mostly splits them the same way: I went
                    yesterday, but I have been there.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The pluperfect goes one step further back: it had happened before another past
                    moment. Words such as <Word w="juba" />, <Word w="veel" /> and{" "}
                    <Word w="kunagi" /> often come with these tenses.
                  </Trans>
                </p>
              </Prose>
              <SentenceList items={PERFECT_CONTRASTS} />
            </>
          ),
        },
        {
          id: "hear",
          title: t`Hear the tense`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Listen to each sentence and pick what it says about time. Listen for a form of{" "}
                    <Et>olema</Et>, such as <Et>olen</Et> or <Et>olin</Et>, and for a time word.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-tense"
                title={<Trans>Which tense?</Trans>}
                items={content.when}
                rounds={9}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All nine. You hear the tense and know what it says.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Most of them. Listen for <Et>olema</Et> and the time words.
                    </Trans>
                  ) : (
                    <Trans>Read the sentences above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={whenRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "talk",
          title: t`Have you been to Tartu?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati asks about your trips and what you have tried. Pick what you say back. If
                    you pick a wrong reply, you see why, then hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="been-to-tartu"
                title={<Trans>Talk: have you been there?</Trans>}
                part={
                  <Trans>
                    You went to Tartu last summer, and you haven’t tried <Word w="kama" /> yet.
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
