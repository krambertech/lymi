import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  WORK_ANSWERS,
  WORK_CONVERSATION,
  WORK_DIALOGUE,
  WORK_FIXES,
  WORK_GROUPS,
  WORK_MATCH,
  WORK_NOTE,
  WORK_TELL,
  WORK_TRANSLATE,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Chips, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "tookoht";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Group = keyof typeof WORK_GROUPS;

const WORD_MEANS: Record<string, MessageDescriptor> = {
  koosolek: msg`meeting`,
  kontor: msg`office`,
  kolleeg: msg`colleague`,
  ülemus: msg`manager, boss`,
  leping: msg`contract`,
  tähtaeg: msg`deadline`,
  palk: msg`salary`,
  puhkus: msg`holiday, leave`,
};

const GLOSSARY: Glossary = {
  koosolek: { en: msg`meeting`, note: msg`Koosolek algab kell kümme.` },
  kontor: { en: msg`office`, note: msg`Ma töötan kontoris.` },
  kolleeg: { en: msg`colleague`, note: msg`Ma kohtusin uue kolleegiga.` },
  ülemus: { en: msg`manager, boss`, note: msg`Ma rääkisin täna oma ülemusega.` },
  leping: { en: msg`contract`, note: msg`Me allkirjastame uue lepingu.` },
  tähtaeg: { en: msg`deadline`, note: msg`Aruande tähtaeg on reedel.` },
  palk: { en: msg`salary`, note: msg`Palk tuleb iga kuu viiendal päeval.` },
  puhkus: { en: msg`holiday, leave`, note: msg`Ma lähen juulis puhkusele.` },
};

const ROW_LABELS: Record<string, MessageDescriptor> = {
  meeting: msg`Meeting`,
  office: msg`Office`,
  colleague: msg`Colleague`,
  manager: msg`Manager`,
  contract: msg`Contract`,
  deadline: msg`Deadline`,
  salary: msg`Salary`,
  leave: msg`Holiday, leave`,
};

function WorkTable() {
  const { t, i18n } = useLingui();
  const [group, setGroup] = useState<Group>("office");
  const rows: ParadigmRow[] = WORK_GROUPS[group].map((row) => ({
    id: row.id,
    label: i18n._(ROW_LABELS[row.id] as MessageDescriptor),
    cells: [
      { form: row.form, src: src(row.form) },
      { form: row.said, src: src(row.said) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Group`}
        items={[
          { label: t`People and office`, value: "office" as Group },
          { label: t`Terms and schedule`, value: "terms" as Group },
        ]}
        value={group}
        onPick={setGroup}
      />
      <Paradigm
        key={group}
        label={t`Work vocabulary in Estonian`}
        columns={[t`Meaning`, t`Word`, t`In a sentence`]}
        rows={rows}
      />
    </Panel>
  );
}

const TELL_OPTIONS = {
  now: msg`Routine or fact`,
  plan: msg`Request, deadline or plan`,
} as const;

const TELL_MEANS: Record<(typeof WORK_TELL)[number]["id"], MessageDescriptor> = {
  "now-office": msg`I work in an office.`,
  "plan-friday": msg`Could you send this by Friday?`,
  "now-meeting": msg`The meeting starts at ten.`,
  "plan-leave": msg`I am going on holiday in July.`,
  "now-boss": msg`I spoke with my manager today.`,
  "plan-report": msg`I have to finish this report today.`,
  "now-salary": msg`Salary arrives on the fifth of each month.`,
  "plan-contract": msg`We are signing a new contract.`,
};

const TRANSLATE_PROMPTS: Record<(typeof WORK_TRANSLATE)[number], MessageDescriptor> = {
  "Ma töötan kontoris.": msg`I work in an office.`,
  "Koosolek algab kell kümme.": msg`The meeting starts at ten.`,
  "Kas te saaksite selle reedeks saata?": msg`Could you send this by Friday?`,
  "Ma lähen juulis puhkusele.": msg`I am going on holiday in July.`,
  "Ma pean selle aruande täna valmis saama.": msg`I have to finish this report today.`,
  "Ma rääkisin täna oma ülemusega.": msg`I spoke with my manager today.`,
};

const FIX_PROMPTS: Record<(typeof WORK_FIXES)[number]["id"], MessageDescriptor> = {
  kontoris: msg`I am in the office today.`,
  toole: msg`They are going to work tomorrow.`,
  reedeks: msg`The report must be ready by Friday.`,
  kolleegiga: msg`I met a new colleague yesterday.`,
  tooga: msg`Can you help me with this work?`,
  "kell-kuus": msg`I went home from work at six yesterday.`,
};

const FIX_WHY: Record<(typeof WORK_FIXES)[number]["id"], ReactNode> = {
  kontoris: (
    <Trans>
      Being in the office takes <b lang="et">-s</b>: <b lang="et">kontoris</b>, not{" "}
      <b lang="et">kontori</b>.
    </Trans>
  ),
  toole: (
    <Trans>
      Going to work takes <b lang="et">-le</b>: <b lang="et">tööle</b>, not <b lang="et">töö</b>.
    </Trans>
  ),
  reedeks: (
    <Trans>
      A deadline with “by” usually takes <b lang="et">-ks</b>: <b lang="et">reedeks</b>, not{" "}
      <b lang="et">reede</b>.
    </Trans>
  ),
  kolleegiga: (
    <Trans>
      The verb <b lang="et">kohtuma</b> usually takes <b lang="et">-ga</b>:{" "}
      <b lang="et">kolleegiga</b>, not <b lang="et">kolleegi</b>.
    </Trans>
  ),
  tooga: (
    <Trans>
      Saying with this work takes <b lang="et">-ga</b>: <b lang="et">tööga</b>, not{" "}
      <b lang="et">töö</b>.
    </Trans>
  ),
  "kell-kuus": (
    <Trans>
      Telling what time something happened uses <b lang="et">kell</b> plus the basic number:{" "}
      <b lang="et">kell kuus</b>.
    </Trans>
  ),
};

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const pairs: MatchPair[] = WORK_MATCH.map((word) => ({
      id: word,
      left: word,
      right: i18n._(WORD_MEANS[word] as MessageDescriptor),
      src: src(word),
    }));

    const tellOptions = (["now", "plan"] as const).map((id) => ({
      id,
      label: (
        <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
          {i18n._(TELL_OPTIONS[id])}
        </span>
      ),
    }));
    const tell: (ChoiceItem & { said: string; pair: readonly [string, string] })[] = WORK_TELL.map(
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

    const translations: (SentenceItem & { pair: readonly [string, string] })[] = WORK_TRANSLATE.map(
      (said) => ({
        kind: "translate",
        id: clipId(said),
        prompt: i18n._(TRANSLATE_PROMPTS[said]),
        src: src(said),
        answers: WORK_ANSWERS[said],
        pair: [clipId(said), clipId(said)] as const,
      }),
    );

    const fixes: FixItem[] = WORK_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${item.id}`,
      wrong: item.wrong,
      prompt: i18n._(FIX_PROMPTS[item.id]),
      answers: [item.right],
      src: src(item.right),
      explain: FIX_WHY[item.id],
    }));

    const turns: DialogueTurn[] = [
      { who: "them", clip: clipId(WORK_DIALOGUE[0].hear), line: WORK_DIALOGUE[0].hear },
      {
        who: "you",
        clip: clipId(WORK_DIALOGUE[0].right),
        replies: [
          { line: WORK_DIALOGUE[0].right, right: true },
          {
            line: WORK_DIALOGUE[0].wrong1,
            why: t`Anna is asking whether you have a moment, not selling train tickets.`,
          },
          {
            line: WORK_DIALOGUE[0].wrong2,
            why: t`That talks about back pain rather than answering your colleague.`,
          },
        ],
      },
      { who: "them", clip: clipId(WORK_DIALOGUE[1].hear), line: WORK_DIALOGUE[1].hear },
      {
        who: "you",
        clip: clipId(WORK_DIALOGUE[1].right),
        replies: [
          {
            line: WORK_DIALOGUE[1].wrong1,
            why: t`She asked about the report deadline, not about pets.`,
          },
          { line: WORK_DIALOGUE[1].right, right: true },
          {
            line: WORK_DIALOGUE[1].wrong2,
            why: t`That gives directions to a café instead of confirming the report.`,
          },
        ],
      },
      { who: "them", clip: clipId(WORK_DIALOGUE[2].hear), line: WORK_DIALOGUE[2].hear },
      {
        who: "you",
        clip: clipId(WORK_DIALOGUE[2].right),
        replies: [
          {
            line: WORK_DIALOGUE[2].wrong1,
            why: t`Anna asked whether you are coming to tomorrow’s meeting.`,
          },
          {
            line: WORK_DIALOGUE[2].wrong2,
            why: t`That mentions a bus departure instead of confirming attendance.`,
          },
          { line: WORK_DIALOGUE[2].right, right: true },
        ],
      },
      { who: "them", clip: clipId(WORK_DIALOGUE[3].hear), line: WORK_DIALOGUE[3].hear },
      {
        who: "you",
        clip: clipId(WORK_DIALOGUE[3].right),
        replies: [
          { line: WORK_DIALOGUE[3].right, right: true },
          {
            line: WORK_DIALOGUE[3].wrong1,
            why: t`You are finishing a chat at work, not paying in a shop.`,
          },
          {
            line: WORK_DIALOGUE[3].wrong2,
            why: t`Say goodbye until tomorrow instead of asking for a pharmacy.`,
          },
        ],
      },
    ];

    const note: PassageQuestion[] = [
      {
        id: "meeting-time",
        kind: "short",
        ask: t`What time does Monday’s meeting start? Write two words from the email.`,
        answers: ["kell kümme", "kümme"],
        line: 1,
      },
      {
        id: "deadline",
        ask: t`By which day must the monthly report be sent?`,
        options: [
          { id: "mon", label: t`Monday evening` },
          { id: "wed", label: t`By Wednesday` },
          { id: "fri", label: t`Friday afternoon` },
        ],
        answer: "wed",
        line: 2,
      },
      {
        id: "remote",
        kind: "truefalse",
        ask: t`Staff may work from home on Wednesday and Thursday.`,
        answer: true,
        line: 3,
      },
      {
        id: "intern",
        ask: t`What happens on Friday at two o’clock?`,
        options: [
          { id: "coffee", label: t`Coffee with the intern` },
          { id: "lunch", label: t`Lunch with a client team` },
          { id: "trip", label: t`A trip to the port` },
        ],
        answer: "coffee",
        line: 4,
      },
      {
        id: "leave-late",
        kind: "truefalse",
        ask: t`Anna says staff can wait until August to enter summer leave dates.`,
        answer: false,
        line: 5,
      },
      {
        id: "room",
        ask: t`Where is the weekly meeting held?`,
        options: [
          { id: "r1", label: t`In room one` },
          { id: "r2", label: t`In room two` },
          { id: "r3", label: t`In room three` },
        ],
        answer: "r3",
        line: 1,
      },
    ];

    const call: PassageQuestion[] = [
      {
        id: "hours",
        ask: t`What are the usual office hours?`,
        options: [
          { id: "eight", label: t`From eight to four` },
          { id: "nine", label: t`Nine to five` },
          { id: "ten", label: t`From ten to six` },
        ],
        answer: "nine",
        line: 4,
      },
      {
        id: "remote-days",
        kind: "short",
        ask: t`How many days a week can Mart work from home after the first month? Write the number word.`,
        answers: ["kaks"],
        line: 6,
      },
      {
        id: "team-meeting",
        ask: t`On which day is the team meeting held?`,
        options: [
          { id: "tue", label: t`Every Tuesday` },
          { id: "thu", label: t`Every Thursday` },
          { id: "fri", label: t`Every Friday` },
        ],
        answer: "tue",
        line: 8,
      },
      {
        id: "payday",
        kind: "truefalse",
        ask: t`If the fifth falls on a weekend, salary is paid on Friday.`,
        answer: true,
        line: 10,
      },
      {
        id: "leave-days",
        ask: t`How much annual leave does the company offer?`,
        options: [
          { id: "twenty", label: t`Twenty days` },
          { id: "twenty8", label: t`Twenty-eight days` },
          { id: "thirty5", label: t`Thirty-five days` },
        ],
        answer: "twenty8",
        line: 12,
      },
      {
        id: "notice",
        kind: "truefalse",
        ask: t`Anna says one day of notice is enough before taking leave.`,
        answer: false,
        line: 12,
      },
      {
        id: "month",
        kind: "short",
        ask: t`In which month does Mart want to take leave? Write one word as he says it.`,
        answers: ["augustis", "august"],
        line: 13,
      },
      {
        id: "weeks",
        ask: t`How long is Mart’s planned leave?`,
        options: [
          { id: "one", label: t`One single week` },
          { id: "two", label: t`Two weeks` },
          { id: "four", label: t`Four full weeks` },
        ],
        answer: "two",
        line: 13,
      },
    ];

    return { pairs, tell, translations, fixes, turns, note, call };
  }, [t, i18n]);
}

export function TookohtLesson() {
  const { t } = useLingui();
  const content = useContent();
  const cond = lessonBySlug("laheksin")?.n;
  const names = { third: t`Anna`, fourth: t`Mart` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Talk about office routines, meetings, deadlines and leave: <b lang="et">koosolek</b>,{" "}
          <b lang="et">reedeks</b>, <b lang="et">puhkusele</b> and polite workplace requests with{" "}
          <b lang="et">Kas te saaksite…</b>.
        </Trans>
      }
      facts={[
        <Trans key="m">20 minutes</Trans>,
        <Trans key="q">7 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["koosolek", "kontor", "kolleeg", "ülemus", "leping", "tähtaeg", "palk", "puhkus"]}
      recap={[
        <Trans key="1">
          Work places follow the endings you know: <b lang="et">tööl / tööle / töölt</b> and{" "}
          <b lang="et">kontoris / kontorisse / kontorist</b>.
        </Trans>,
        <Trans key="2">
          A deadline with “by” usually takes <b lang="et">-ks</b>: <b lang="et">reedeks</b>,{" "}
          <b lang="et">kolmapäevaks</b>.
        </Trans>,
        <Trans key="3">
          Polite workplace requests usually use the conditional from lesson {cond}:{" "}
          <b lang="et">Kas te saaksite selle reedeks saata?</b>
        </Trans>,
        <Trans key="4">
          Talking or meeting with a colleague takes <b lang="et">-ga</b>:{" "}
          <b lang="et">rääkisin ülemusega</b>, <b lang="et">kohtusin kolleegiga</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "words",
          title: t`At the office`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Everyday work conversations revolve around a few core nouns:{" "}
                    <Word w="koosolek" />, <Word w="kontor" />, <Word w="kolleeg" /> and{" "}
                    <Word w="ülemus" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Terms and plans bring up <Word w="leping" />, <Word w="tähtaeg" />,{" "}
                    <Word w="palk" /> and <Word w="puhkus" />.
                  </Trans>
                </p>
              </Prose>
              <WorkTable />
              <Aside>
                <Trans>
                  Going on holiday uses <b lang="et">-le</b> (<b lang="et">puhkusele</b>), and being
                  on holiday uses <b lang="et">-l</b> (<b lang="et">puhkusel</b>), just like{" "}
                  <b lang="et">tööle / tööl</b>.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Match each Estonian work word with its meaning.</Trans>
                </p>
              </Prose>
              <Match
                id="work-words"
                title={<Trans>What does each word mean?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="a">Estonian</Trans>, <Trans key="b">Meaning</Trans>]}
              />
            </>
          ),
        },
        {
          id: "tell",
          title: t`Routine or plan?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear each office sentence and decide whether it states a routine or fact, or a
                    request, deadline or plan.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="tell-work"
                title={<Trans>Routine or plan?</Trans>}
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
                  <Trans>Write each workplace sentence in Estonian.</Trans>
                </p>
              </Prose>
              <Quiz
                id="write-work"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the endings in the ones you missed.</Trans>
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
                    Each sentence has one wrong word. Tap the wrong word, then type the right one.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-work"
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
          id: "dialogue",
          title: t`Talk with a colleague`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Your manager Anna stops by your desk about a report and tomorrow’s meeting.
                    Listen and pick the right reply.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="work-call"
                title={<Trans>At the desk</Trans>}
                part={<Trans>Your manager Anna asks about a report and a meeting.</Trans>}
                them={t`Anna`}
                turns={content.turns}
              />
            </>
          ),
        },
        {
          id: "read",
          title: t`Team email`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Anna sends a weekly update to the team. Read and answer.</Trans>
                </p>
              </Prose>
              <Reading
                id="office-email"
                title={<Trans>Monday update</Trans>}
                clip="p-note"
                sentences={WORK_NOTE}
                questions={content.note}
              />
            </>
          ),
        },
        {
          id: "listen",
          title: t`Listen: first week at work`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Anna and Mart go through office hours, remote work, payday and leave. Listen and
                    answer. You can play the conversation twice.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="job-talk"
                title={<Trans>First week check-in</Trans>}
                clip="c-work"
                turns={WORK_CONVERSATION.turns}
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
