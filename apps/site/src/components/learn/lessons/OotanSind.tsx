import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  GOVERNMENT_CONVERSATION,
  GOVERNMENT_DIALOGUE,
  GOVERNMENT_FIXES,
  GOVERNMENT_FORM_QUIZ,
  GOVERNMENT_GAPS,
  GOVERNMENT_HEARD,
  GOVERNMENT_KINDS,
  GOVERNMENT_OPTIONS,
  GOVERNMENT_ANSWERS,
  GOVERNMENT_FIX_ANSWERS,
  GOVERNMENT_FORM_ALSO,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Chips, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "ootan-sind";
const src = (text: string) => clipUrl(SLUG, clipId(text));
const gapSaid = (gap: { before: string; answer: string; after: string }) =>
  `${gap.before} ${gap.answer}${/^[.!?]$/.test(gap.after) ? "" : " "}${gap.after}`;

type Kind = keyof typeof GOVERNMENT_KINDS;
const KINDS: readonly Kind[] = ["part", "from", "to", "with", "off"];
const QUESTION: Record<Kind, string> = {
  part: "keda",
  from: "kellest",
  to: "kellele",
  with: "kellega",
  off: "kellelt",
};

const VERBS: Record<string, MessageDescriptor> = {
  ootama: msg`to wait for`,
  aitama: msg`to help`,
  armastama: msg`to love`,
  tänama: msg`to thank`,
  rääkima: msg`to talk, to tell`,
  hoolima: msg`to care about`,
  unistama: msg`to dream of`,
  "aru saama": msg`to understand`,
  helistama: msg`to phone`,
  kirjutama: msg`to write`,
  vastama: msg`to answer`,
  ütlema: msg`to tell, to say`,
  kohtuma: msg`to meet`,
  abielluma: msg`to marry`,
  küsima: msg`to ask`,
  laenama: msg`to borrow, to lend`,
  saama: msg`to get`,
};

const NOUNS: Record<string, MessageDescriptor> = {
  Mari: msg`a name`,
  sõber: msg`friend`,
  ema: msg`mother`,
  Jaan: msg`a name`,
  õde: msg`sister`,
  vend: msg`brother`,
  õpetaja: msg`teacher`,
  puhkus: msg`holiday`,
};

const GLOSSARY: Glossary = {
  keda: { en: msg`whom`, note: msg`The partitive of kes: Keda sa ootad?` },
  kellest: { en: msg`about whom, from whom` },
  kellele: { en: msg`to whom` },
  kellega: { en: msg`with whom` },
  kellelt: { en: msg`from whom`, note: msg`The -lt case: küsin sinult, I ask you.` },
};

function KindTable() {
  const { t, i18n } = useLingui();
  const [kind, setKind] = useState<Kind>("part");
  const labels: Record<Kind, string> = {
    part: t`Whom`,
    from: t`About whom`,
    to: t`To whom`,
    with: t`With whom`,
    off: t`From whom`,
  };
  const tips: Record<Kind, ReactNode> = {
    part: (
      <Trans>
        Usually the partitive: <b lang="et">ma ootan sind</b>. Question: <b lang="et">keda?</b>
      </Trans>
    ),
    from: (
      <Trans>
        The <b lang="et">-st</b> case, about or from: <b lang="et">ma räägin sinust</b>. Question:{" "}
        <b lang="et">kellest?</b>
      </Trans>
    ),
    to: (
      <Trans>
        The <b lang="et">-le</b> case, to: <b lang="et">ma helistan sulle</b>. Question:{" "}
        <b lang="et">kellele?</b>
      </Trans>
    ),
    with: (
      <Trans>
        The <b lang="et">-ga</b> case, with: <b lang="et">ma kohtun sinuga</b>. Question:{" "}
        <b lang="et">kellega?</b>
      </Trans>
    ),
    off: (
      <Trans>
        The <b lang="et">-lt</b> case, off or from someone: <b lang="et">ma küsin sinult</b>.
        Question: <b lang="et">kellelt?</b>
      </Trans>
    ),
  };
  const rows: ParadigmRow[] = GOVERNMENT_KINDS[kind].map((verb) => ({
    id: `${verb.verb}-${kind}`,
    label: i18n._(VERBS[verb.verb] as MessageDescriptor),
    et: verb.verb,
    cells: [
      { form: QUESTION[kind], src: src(QUESTION[kind]) },
      {
        form: verb.said.replace(/\.$/, "").replace(/ (sind|sinust|sulle|sinuga|sinult)/, " |$1"),
        src: src(verb.said),
      },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Kinds of verb`}
        items={KINDS.map((each) => ({ label: labels[each], value: each }))}
        value={kind}
        onPick={setKind}
      />
      <Paradigm
        key={kind}
        label={t`Verbs and the case they take`}
        columns={[t`Question`, t`With “you”`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{ title: t`Tap a form`, tip: tips[kind] }}
      />
    </Panel>
  );
}

type Means = "from" | "to" | "with";
const MEANINGS: readonly Means[] = ["from", "to", "with"];
const HEARD_MEANS: Record<
  (typeof GOVERNMENT_HEARD)[number]["id"],
  Record<Means, MessageDescriptor>
> = {
  sina: {
    from: msg`I’m talking about you.`,
    to: msg`I’m telling you.`,
    with: msg`I’m talking with you.`,
  },
  ema: {
    from: msg`Mari is talking about her mother.`,
    to: msg`Mari is telling her mother.`,
    with: msg`Mari is talking with her mother.`,
  },
  peeter: {
    from: msg`Jaan is talking about Peeter.`,
    to: msg`Jaan is telling Peeter.`,
    with: msg`Jaan is talking with Peeter.`,
  },
};

export const heardOptions = (id: (typeof GOVERNMENT_HEARD)[number]["id"], i18n: I18n) =>
  MEANINGS.map((means) => ({
    id: means,
    label: (
      <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
        {i18n._(HEARD_MEANS[id][means])}
      </span>
    ),
  }));

type GapRun = FormItem & {
  said: string;
  options: readonly string[];
  pair: readonly [string, string];
};

export const gapRun = <T extends { pair: readonly [string, string]; options: readonly string[] }>(
  items: readonly T[],
  pinned?: T,
): T[] =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle(item.options) },
  );

const pairRun = <T extends { pair: readonly [string, string] }>(items: readonly T[], pinned?: T) =>
  eachPairFirst(items, pinned);

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const forms: FormItem[] = GOVERNMENT_FORM_QUIZ.map((item) => ({
      base: item.noun,
      gloss: i18n._(NOUNS[item.noun] as MessageDescriptor),
      cue: item.cue,
      cueLang: "et",
      answers: [item.answer, ...(GOVERNMENT_FORM_ALSO[item.answer] ?? [])],
      src: src(item.said),
      said: item.said,
      explain: (
        <Trans>
          The verb decides the case: <b lang="et">{item.said.replace(/\.$/, "")}</b>.
        </Trans>
      ),
    }));

    const whys: Record<string, ReactNode> = {
      part: (
        <Trans>
          <b lang="et">Ootama</b> and <b lang="et">aitama</b> usually take the partitive.
        </Trans>
      ),
      from: (
        <Trans>
          <b lang="et">Hoolima</b> and <b lang="et">aru saama</b> take <b lang="et">-st</b>.
        </Trans>
      ),
      to: (
        <Trans>
          <b lang="et">Helistama</b> and <b lang="et">vastama</b> go to someone:{" "}
          <b lang="et">-le</b>.
        </Trans>
      ),
      with: (
        <Trans>
          <b lang="et">Kohtuma</b> and <b lang="et">abielluma</b> take <b lang="et">-ga</b>, with.
        </Trans>
      ),
      off: (
        <Trans>
          From someone is usually <b lang="et">-lt</b>: <b lang="et">küsin sinult</b>,{" "}
          <b lang="et">sain sinult</b>.
        </Trans>
      ),
    };
    const gaps: GapRun[] = GOVERNMENT_GAPS.map((gap) => {
      const said = gapSaid(gap);
      const kind = gap.id.split("-").at(-1) as string;
      return {
        said,
        base: gap.answer === "minuga" ? "mina" : "sina",
        gloss: gap.answer === "minuga" ? t`I, me` : t`you`,
        cue: `${gap.before} …${/^[.!?]$/.test(gap.after) ? gap.after : ` ${gap.after}`}`,
        cueLang: "et",
        src: src(said),
        options: GOVERNMENT_OPTIONS[gap.answer].filter(
          (form) => !("fits" in gap && (gap.fits as readonly string[]).includes(form)),
        ),
        answers: [gap.answer],
        pair: [kind, gap.id] as const,
        explain: whys[kind],
      };
    });

    const heard: (ChoiceItem & { said: string; pair: readonly [string, string] })[] =
      GOVERNMENT_HEARD.flatMap((group) =>
        MEANINGS.map((means) => ({
          said: group[means],
          src: src(group[means]),
          answer: means,
          options: heardOptions(group.id, i18n),
          pair: [means, group[means]] as const,
          explain:
            means === "from" ? (
              <Trans>
                <b lang="et">-st</b>: about someone.
              </Trans>
            ) : means === "to" ? (
              <Trans>
                <b lang="et">-le</b>: to someone, telling them.
              </Trans>
            ) : (
              <Trans>
                <b lang="et">-ga</b>: with someone.
              </Trans>
            ),
        })),
      );

    const pairs: MatchPair[] = [
      { id: "ootama", left: "ootama", right: "keda?", rightLang: "et", src: src("keda") },
      { id: "hoolima", left: "hoolima", right: "kellest?", rightLang: "et", src: src("kellest") },
      {
        id: "helistama",
        left: "helistama",
        right: "kellele?",
        rightLang: "et",
        src: src("kellele"),
      },
      { id: "kohtuma", left: "kohtuma", right: "kellega?", rightLang: "et", src: src("kellega") },
      { id: "küsima", left: "küsima", right: "kellelt?", rightLang: "et", src: src("kellelt") },
    ];

    const translations: (SentenceItem & { pair: readonly [string, string] })[] = [
      {
        kind: "translate",
        id: "wait",
        prompt: t`I’m waiting for you.`,
        src: src("Ma ootan sind."),
        answers: GOVERNMENT_ANSWERS["Ma ootan sind."],
        pair: ["part", "wait"],
      },
      {
        kind: "translate",
        id: "phone",
        prompt: t`I’ll phone you tomorrow.`,
        src: src("Ma helistan sulle homme."),
        answers: GOVERNMENT_ANSWERS["Ma helistan sulle homme."],
        pair: ["to", "phone"],
      },
      {
        kind: "translate",
        id: "met",
        prompt: t`We met Jaan.`,
        src: src("Me kohtusime Jaaniga."),
        answers: GOVERNMENT_ANSWERS["Me kohtusime Jaaniga."],
        pair: ["with", "met"],
        explain: (
          <Trans>
            English meets someone; <b lang="et">kohtuma</b> meets with someone:{" "}
            <b lang="et">Jaaniga</b>.
          </Trans>
        ),
      },
      {
        kind: "translate",
        id: "cares",
        prompt: t`Mari cares about her brother.`,
        src: src("Mari hoolib oma vennast."),
        answers: GOVERNMENT_ANSWERS["Mari hoolib oma vennast."],
        pair: ["from", "cares"],
      },
      {
        kind: "translate",
        id: "ask",
        prompt: t`Can I ask you something?`,
        src: src("Kas ma võin sinult midagi küsida?"),
        answers: GOVERNMENT_ANSWERS["Kas ma võin sinult midagi küsida?"],
        pair: ["off", "ask"],
        explain: (
          <Trans>
            You ask from someone: <b lang="et">sinult</b>.
          </Trans>
        ),
      },
      {
        kind: "translate",
        id: "thank",
        prompt: t`I thank you for the help.`,
        src: src("Ma tänan sind abi eest."),
        answers: GOVERNMENT_ANSWERS["Ma tänan sind abi eest."],
        pair: ["part", "thank"],
      },
      {
        kind: "translate",
        id: "understand",
        prompt: t`I don’t understand you.`,
        src: src("Ma ei saa sinust aru."),
        answers: GOVERNMENT_ANSWERS["Ma ei saa sinust aru."],
        pair: ["from", "understand"],
      },
    ];

    const fixWhy: Record<string, ReactNode> = {
      "Ma aitan sind.": (
        <Trans>
          <b lang="et">Aitama</b> usually takes the partitive: <b lang="et">sind</b>.
        </Trans>
      ),
      "Ma helistan sulle homme.": (
        <Trans>
          You phone to someone: <b lang="et">sulle</b>.
        </Trans>
      ),
      "Ma kohtun sinuga kohvikus.": (
        <Trans>
          You meet with someone: <b lang="et">sinuga</b>.
        </Trans>
      ),
      "Ma tänan sind.": (
        <Trans>
          <b lang="et">Tänama</b> takes the partitive: <b lang="et">sind</b>.
        </Trans>
      ),
      "Ma küsin sinult midagi.": (
        <Trans>
          You ask from someone: <b lang="et">sinult</b>.
        </Trans>
      ),
      "Ma vastan sulle kohe.": (
        <Trans>
          You answer to someone: <b lang="et">sulle</b>.
        </Trans>
      ),
      "Ma hoolin sinust.": (
        <Trans>
          <b lang="et">Hoolima</b> takes <b lang="et">-st</b>: <b lang="et">sinust</b>.
        </Trans>
      ),
    };
    const fixes: FixItem[] = GOVERNMENT_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${clipId(item.right)}`,
      wrong: item.wrong,
      answers: GOVERNMENT_FIX_ANSWERS[item.right] ?? [item.right],
      src: src(item.right),
      explain: fixWhy[item.right],
    }));

    const line = (id: keyof typeof GOVERNMENT_DIALOGUE) => {
      const clip = GOVERNMENT_DIALOGUE[id];
      return typeof clip === "string" ? clip : clip.text;
    };
    const talk: DialogueTurn[] = [
      { who: "them", clip: "d-kadri-1", line: line("d-kadri-1") },
      {
        who: "you",
        clip: "d-sina-1",
        replies: [
          {
            line: "Jah, aitäh! Ma vastan sind õhtul.",
            why: (
              <Trans>
                You answer to someone: <b lang="et">sulle</b>.
              </Trans>
            ),
          },
          { line: line("d-sina-1"), right: true },
          {
            line: "Jah, aitäh! Ma vastan sinust õhtul.",
            why: (
              <Trans>
                <b lang="et">Sinust</b> is about you. You answer to someone: <b lang="et">sulle</b>.
              </Trans>
            ),
          },
        ],
      },
      { who: "them", clip: "d-kadri-2", line: line("d-kadri-2") },
      {
        who: "you",
        clip: "d-sina-2",
        replies: [
          { line: line("d-sina-2"), right: true },
          {
            line: "Jah, ma kohtun sind hea meelega.",
            why: (
              <Trans>
                You meet with someone: <b lang="et">sinuga</b>.
              </Trans>
            ),
          },
          {
            line: "Jah, ma kohtun sulle hea meelega.",
            why: (
              <Trans>
                <b lang="et">Kohtuma</b> takes <b lang="et">-ga</b>, not <b lang="et">-le</b>:{" "}
                <b lang="et">sinuga</b>.
              </Trans>
            ),
          },
        ],
      },
      { who: "them", clip: "d-kadri-3", line: line("d-kadri-3") },
      {
        who: "you",
        clip: "d-sina-3",
        replies: [
          {
            line: "Ma ootan selle väga!",
            why: (
              <Trans>
                <b lang="et">Ootama</b> usually takes the partitive: <b lang="et">seda</b>.
              </Trans>
            ),
          },
          {
            line: "Ma ootan sellest väga!",
            why: (
              <Trans>
                <b lang="et">Sellest</b> is about it. <b lang="et">Ootama</b> usually takes the
                partitive: <b lang="et">seda</b>.
              </Trans>
            ),
          },
          { line: line("d-sina-3"), right: true },
        ],
      },
    ];

    const exam: PassageQuestion[] = [
      {
        id: "bride",
        ask: t`Who is Peeter marrying?`,
        options: [
          { id: "liisa", label: t`Liisa` },
          { id: "kati", label: t`Kati, Mari’s friend` },
          { id: "colleague", label: t`A colleague from work` },
        ],
        answer: "liisa",
        line: 3,
      },
      {
        id: "remember",
        kind: "truefalse",
        ask: t`Jaan remembers Liisa.`,
        answer: true,
        line: 4,
      },
      {
        id: "called",
        ask: t`Who phoned Mari yesterday?`,
        options: [
          { id: "mother", label: t`Her mother, about the party` },
          { id: "peeter", label: t`Peeter` },
          { id: "liisa", label: t`Liisa` },
        ],
        answer: "peeter",
        line: 8,
      },
      {
        id: "never",
        kind: "truefalse",
        ask: t`Mari has never met Liisa.`,
        answer: false,
        line: 12,
      },
      {
        id: "music",
        kind: "short",
        ask: t`What did Mari and Liisa talk about all evening? Write it as Mari says it.`,
        answers: ["muusikast"],
        line: 12,
      },
      {
        id: "ask",
        ask: t`Who will Mari ask about the present?`,
        options: [
          { id: "liisa", label: t`Liisa` },
          { id: "jaan", label: t`Jaan` },
          { id: "peeter", label: t`Peeter, her brother` },
        ],
        answer: "peeter",
        line: 18,
      },
      {
        id: "where",
        kind: "short",
        ask: t`Where will Mari and Jaan meet? Write it as Mari says it.`,
        answers: ["kaubanduskeskuse ees"],
        line: 23,
      },
      {
        id: "tallinn",
        kind: "truefalse",
        ask: t`The wedding is in Tallinn.`,
        answer: false,
        line: 37,
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
          { id: "piano", label: t`I’ve always dreamt of the piano.`, answer: "jaan", line: 14 },
          { id: "help", label: t`I can help you in the shop.`, answer: "jaan", line: 20 },
          { id: "phone", label: t`I’ll phone you on Friday.`, answer: "mari", line: 21 },
          { id: "write", label: t`I’ll write to him today.`, answer: "jaan", line: 30 },
          { id: "secret", label: t`Don’t tell Peeter!`, answer: "mari", line: 38 },
        ],
      },
    ];

    return { forms, gaps, heard, pairs, translations, fixes, talk, exam };
  }, [t, i18n]);
}

export function OotanSindLesson() {
  const { t } = useLingui();
  const content = useContent();
  const object = lessonBySlug("raamatut-voi-raamatu")?.n;
  const pronouns = lessonBySlug("asesonad")?.n;
  const names = { second: t`Mari`, main: t`Jaan` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <b lang="et">Ootan sind</b>, <b lang="et">räägin sinust</b>,{" "}
          <b lang="et">helistan sulle</b>: many verbs ask for a set case, and a dictionary tells you
          which.
        </Trans>
      }
      facts={[
        <Trans key="m">22 minutes</Trans>,
        <Trans key="q">8 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["keda", "kellest", "kellele", "kellega", "kellelt"]}
      recap={[
        <Trans key="1">
          Learn a verb with its question: <b lang="et">ootama keda?</b>,{" "}
          <b lang="et">rääkima kellest?</b>, <b lang="et">helistama kellele?</b>,{" "}
          <b lang="et">kohtuma kellega?</b>, <b lang="et">küsima kellelt?</b>
        </Trans>,
        <Trans key="2">
          <b lang="et">Ootama, aitama, armastama</b> and <b lang="et">tänama</b> usually take the
          partitive: <b lang="et">ma tänan sind</b>.
        </Trans>,
        <Trans key="3">
          English and Estonian often disagree: you meet with someone, <b lang="et">kohtun sinuga</b>
          , phone to someone, <b lang="et">helistan sulle</b>, and ask from someone,{" "}
          <b lang="et">küsin sinult</b>.
        </Trans>,
        <Trans key="4">
          One verb can change its meaning with the case: <b lang="et">räägin sinust</b>, about you;{" "}
          <b lang="et">räägin sulle</b>, I tell you; <b lang="et">räägin sinuga</b>, with you. So
          can <b lang="et">laenama</b>: <b lang="et">laenan sinult</b>, I borrow from you;{" "}
          <b lang="et">laenan sulle</b>, I lend you.
        </Trans>,
      ]}
      sections={[
        {
          id: "question",
          title: t`Verbs that ask for a case`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    English puts most objects straight after the verb: I phone you, I meet you, I
                    ask you. In Estonian, many verbs ask for a set case, and the question the verb
                    answers names it: <Word w="keda" />, <Word w="kellest" />, <Word w="kellele" />,{" "}
                    <Word w="kellega" />, <Word w="kellelt" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Pick a question and tap the sentences. The pronoun forms come from lesson{" "}
                    {pronouns}.
                  </Trans>
                </p>
              </Prose>
              <KindTable />
              <Aside>
                <Trans>
                  Lesson {object} showed that on their own, <b lang="et">ootama</b>,{" "}
                  <b lang="et">aitama</b> and <b lang="et">armastama</b> take the partitive. With{" "}
                  <b lang="et">ära</b>, <b lang="et">ootama</b> can take the genitive:{" "}
                  <b lang="et">ootan su ära</b>. A dictionary gives each verb’s question, so learn
                  the two together.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Match each verb with the question it answers.</Trans>
                </p>
              </Prose>
              <Match
                id="verb-question"
                title={<Trans>Which question?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="v">Verb</Trans>, <Trans key="q">Question</Trans>]}
              />
            </>
          ),
        },
        {
          id: "pick",
          title: t`Pick the case`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has a gap for you or me. The verb decides its form. Pick it, then
                    hear the sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-case"
                title={<Trans>Which form of the pronoun?</Trans>}
                items={content.gaps}
                rounds={10}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All ten: the verb told you every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Look at the verb in the ones you got wrong.</Trans>
                  ) : (
                    <Trans>Tap the sentences in the table once more, then try again.</Trans>
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
          id: "type",
          title: t`Type the form`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Now with names and nouns. Each round gives a word and a sentence with a gap.
                    Type the form the verb needs.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-case"
                title={<Trans>Type the form</Trans>}
                items={content.forms}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, typed in full.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the ending in the ones you got wrong.</Trans>
                  ) : (
                    <Trans>Tap the sentences in the table once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "talk-about",
          title: t`About, to or with`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    With a person, <b lang="et">rääkima</b> takes three cases, each with its own
                    meaning: about someone, telling someone, or talking with someone. Hear a
                    sentence, then pick what it means.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="hear-case"
                title={<Trans>What does it mean?</Trans>}
                items={content.heard}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six: you heard the ending every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you got wrong once more.</Trans>
                  ) : (
                    <Trans>Play the sentences you missed once more, then try again.</Trans>
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
          id: "sentences",
          title: t`Write it in Estonian`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Write each sentence in Estonian. Ask the verb’s question first, then choose the
                    form.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-case"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven, each with the case its verb needs.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Ask each verb’s question again.</Trans>
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
                id="fix-case"
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
          id: "talk",
          title: t`Plans with Kadri`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kadri calls you about meeting. Pick what you say back. A wrong reply says why,
                    then you hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="meeting-jaan"
                title={<Trans>Talk: meeting tomorrow</Trans>}
                part={
                  <Trans>
                    You got Kadri’s letter, you’d gladly meet her, and you can’t wait to hear about
                    her job.
                  </Trans>
                }
                them={t`Kadri`}
                turns={content.talk}
              />
            </>
          ),
        },
        {
          id: "wedding",
          title: t`A wedding in July`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Mari tells Jaan that her brother is getting married.</Trans>
                </p>
              </Prose>
              <Listening
                id="peeter-wedding"
                title={<Trans>Listen: Mari and Jaan</Trans>}
                clip="c-wedding"
                turns={GOVERNMENT_CONVERSATION.turns}
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
