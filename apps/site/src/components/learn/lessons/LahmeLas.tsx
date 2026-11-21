import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  LAS_USES,
  LETS_DIALOGUE,
  LETS_GAPS,
  LETS_OPTIONS,
  LETS_PAIRS,
  objectGapSaid,
} from "../../../lib/learn/clips";
import { shuffle, shuffledRun } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { type GapItem, GapRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "lahme-las";
const src = (text: string) => clipUrl(SLUG, clipId(text));

function Et({ children }: { children: ReactNode }) {
  return <span lang="et">{children}</span>;
}

const GLOSSARY: Glossary = {
  las: { en: msg`let`, note: msg`With the present form: las ta tuleb, let him or her come.` },
  koos: { en: msg`together` },
  rahus: { en: msg`in peace` },
  õues: { en: msg`outside` },
  "me teeme": { en: msg`we do, we make` },
  "teeme!": { en: msg`Let’s do it!` },
  "me vaatame": { en: msg`we watch` },
  "vaatame!": { en: msg`Let’s watch!` },
  "me sööme": { en: msg`we eat` },
  "sööme!": { en: msg`Let’s eat!` },
  "me läheme": { en: msg`we go` },
  "lähme!": { en: msg`Let’s go!` },
  "las ta tuleb.": { en: msg`Let him come.` },
  "las nad mängivad.": { en: msg`Let them play.` },
  "las ma aitan sind.": { en: msg`Let me help you.` },
  "las ta magab.": { en: msg`Let her sleep.` },
};

function LetsList() {
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {LETS_PAIRS.map((pair) => (
        <li key={pair.verb} className="flex flex-wrap items-baseline gap-x-3">
          <Word w={pair.we} />
          <span aria-hidden="true">→</span>
          <Word w={pair.lets} />
        </li>
      ))}
    </ul>
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

function content() {
  const whys: Record<string, ReactNode> = {
    ta: (
      <Trans>
        <Et>Las ta</Et>: the present form for <Et>ta</Et>.
      </Trans>
    ),
    nad: (
      <Trans>
        <Et>Las nad</Et>, or <Et>las lapsed</Et>: the present form for <Et>nad</Et>.
      </Trans>
    ),
    lets: (
      <Trans>
        You speak to someone and suggest doing it together: the <Et>me</Et> form without <Et>me</Et>
        .
      </Trans>
    ),
  };
  const gaps: GapRun[] = LETS_GAPS.map((gap) => {
    const said = objectGapSaid(gap);
    return {
      id: gap.id,
      said,
      src: src(said),
      before: gap.before,
      after: gap.after,
      options: LETS_OPTIONS[gap.verb],
      answer: gap.answer,
      explain: whys[gap.id.split("-").at(-1) as string],
    };
  });

  const said = (clip: keyof typeof LETS_DIALOGUE) => {
    const line = LETS_DIALOGUE[clip];
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
          line: "Mine kinno!",
          why: (
            <Trans>
              <Et>Mine</Et> tells one person to go. To go together: <Et>lähme</Et>.
            </Trans>
          ),
        },
        {
          line: "Minema kinno!",
          why: (
            <Trans>
              The dictionary form doesn’t suggest anything. For let’s: <Et>lähme</Et>.
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
          line: "Tule ka!",
          why: (
            <Trans>
              That speaks to Jaan, but he isn’t here. About him: <Et>las ta tuleb</Et>.
            </Trans>
          ),
        },
        {
          line: "Las ta tulla!",
          why: (
            <Trans>
              After <Et>las</Et>, the present form: <Et>tuleb</Et>.
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
          line: "Söö pitsat!",
          why: (
            <Trans>
              <Et>Söö</Et> tells one person to eat. To eat together: <Et>sööme</Et>.
            </Trans>
          ),
        },
        { line: said("d-sina-3"), right: true },
        {
          line: "Sööma pitsat!",
          why: (
            <Trans>
              The dictionary form doesn’t suggest anything. For let’s: <Et>sööme</Et>.
            </Trans>
          ),
        },
      ],
    },
  ];

  return { gaps, talk };
}

const gapRun = (items: readonly GapRun[], pinned?: GapRun): GapRun[] =>
  shuffledRun(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle([...item.options]) },
  );

export function LahmeLasLesson() {
  const { t } = useLingui();
  const lesson = content();
  const commands = lessonBySlug("kaskiv")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <Et>Lähme!</Et>, let’s go, and <Et>las ta tuleb</Et>, let him come. Two short ways to
          suggest and allow.
        </Trans>
      }
      facts={[
        <Trans key="m">10 minutes</Trans>,
        <Trans key="q">2 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["las", "koos", "rahus", "õues"]}
      recap={[
        <Trans key="1">
          Let’s: the <b lang="et">me</b> form without <b lang="et">me</b>.{" "}
          <b lang="et">Teeme! Vaatame!</b> Only <b lang="et">minema</b> is shorter:{" "}
          <b lang="et">Lähme!</b>
        </Trans>,
        <Trans key="2">
          Let him, let them: <b lang="et">las</b> with the present.{" "}
          <b lang="et">Las ta tuleb. Las nad mängivad.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "lets",
          title: t`Let’s`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {commands} gave orders to one person: <Et>istu!</Et> To suggest doing
                    something together, take the <Et>me</Et> form of the present and drop{" "}
                    <Et>me</Et>. Only <Et>minema</Et> also gets shorter: <Et>me läheme</Et>, but{" "}
                    <Et>lähme!</Et>
                  </Trans>
                </p>
              </Prose>
              <LetsList />
              <Aside>
                <Trans>
                  Books also have a form in <Et>-gem</Et> or <Et>-kem</Et>: <Et>tehkem</Et>,{" "}
                  <Et>mingem</Et>. You will read it in slogans and old texts. People say{" "}
                  <Et>teeme</Et> and <Et>lähme</Et>.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "las",
          title: t`Let him, let them`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To let someone do something, or to say you don’t mind, put <Word w="las" />{" "}
                    before the person and the plain present form: <Et>las ta tuleb</Et>, let him
                    come. With <Et>ma</Et> it offers help: <Et>las ma aitan</Et>, let me help.
                  </Trans>
                </p>
              </Prose>
              <SentenceList items={LAS_USES} />
            </>
          ),
        },
        {
          id: "quiz",
          title: t`Let’s, let him, let them`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Pick the form that fits the words before the gap, then hear the sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="lets-or-las"
                title={<Trans>Which form?</Trans>}
                items={lesson.gaps}
                rounds={9}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All nine. You can suggest and allow.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Look at who comes before the gap.</Trans>
                  ) : (
                    <Trans>Read the two sections above once more, then try again.</Trans>
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
          id: "plans",
          title: t`Making plans`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    You and Kati plan Saturday. Pick what you say back. If you pick a wrong reply,
                    you see why, then hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="saturday-plans"
                title={<Trans>Talk: what shall we do?</Trans>}
                part={
                  <Trans>
                    You want to go to the cinema, you’re happy for Jaan to come, and then you want
                    pizza.
                  </Trans>
                }
                them={t`Kati`}
                turns={lesson.talk}
              />
            </>
          ),
        },
      ]}
    />
  );
}
