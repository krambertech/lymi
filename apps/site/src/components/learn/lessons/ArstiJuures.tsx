import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  DOCTOR_ANSWERS,
  DOCTOR_CONVERSATION,
  DOCTOR_DIALOGUE,
  DOCTOR_FIXES,
  DOCTOR_GROUPS,
  DOCTOR_MATCH,
  DOCTOR_NOTE,
  DOCTOR_TELL,
  DOCTOR_TRANSLATE,
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

const SLUG = "arsti-juures";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Group = keyof typeof DOCTOR_GROUPS;

const WORD_MEANS: Record<string, MessageDescriptor> = {
  pea: msg`head`,
  kurk: msg`throat`,
  kõht: msg`stomach`,
  selg: msg`back`,
  palavik: msg`fever`,
  köha: msg`cough`,
  nohu: msg`runny nose`,
  retsept: msg`prescription`,
};

const GLOSSARY: Glossary = {
  pea: { en: msg`head`, note: msg`Mul valutab pea.` },
  kurk: { en: msg`throat`, note: msg`Mul valutab kurk.` },
  kõht: { en: msg`stomach`, note: msg`Mul valutab kõht.` },
  selg: { en: msg`back`, note: msg`Mul valutab selg.` },
  palavik: { en: msg`fever`, note: msg`Mul on kõrge palavik.` },
  köha: { en: msg`cough`, note: msg`Mul on tugev köha.` },
  nohu: { en: msg`runny nose`, note: msg`Mul on nohu.` },
  retsept: { en: msg`prescription`, note: msg`Arst kirjutab mulle retsepti.` },
};

const ROW_LABELS: Record<string, MessageDescriptor> = {
  head: msg`Head`,
  throat: msg`Throat`,
  stomach: msg`Stomach`,
  back: msg`Back`,
  fever: msg`Fever`,
  cough: msg`Cough`,
  cold: msg`Runny nose`,
  rx: msg`Prescription`,
};

function HealthTable() {
  const { t, i18n } = useLingui();
  const [group, setGroup] = useState<Group>("pain");
  const rows: ParadigmRow[] = DOCTOR_GROUPS[group].map((row) => ({
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
          { label: t`What hurts`, value: "pain" as Group },
          { label: t`Symptoms and medicine`, value: "symptoms" as Group },
        ]}
        value={group}
        onPick={setGroup}
      />
      <Paradigm
        key={group}
        label={t`Doctor vocabulary in Estonian`}
        columns={[t`Meaning`, t`Word`, t`In a sentence`]}
        rows={rows}
      />
    </Panel>
  );
}

const TELL_OPTIONS = {
  pain: msg`What hurts`,
  symptom: msg`Symptom or medicine`,
} as const;

const TELL_MEANS: Record<(typeof DOCTOR_TELL)[number]["id"], MessageDescriptor> = {
  "pain-head": msg`My head hurts.`,
  "sym-fever": msg`I have a high fever.`,
  "pain-throat": msg`My throat hurts.`,
  "sym-cough": msg`I have a strong cough.`,
  "pain-stomach": msg`My stomach hurts.`,
  "sym-cold": msg`I have a runny nose.`,
  "pain-back": msg`My back hurts.`,
  "sym-rx": msg`The doctor writes me a prescription.`,
};

const TRANSLATE_PROMPTS: Record<(typeof DOCTOR_TRANSLATE)[number], MessageDescriptor> = {
  "Mul valutab pea.": msg`My head hurts.`,
  "Mul on palavik ja köha.": msg`I have a fever and a cough.`,
  "Ma tahan arsti juurde tulla.": msg`I want to come to the doctor.`,
  "Mul valutab kurk juba kolm päeva.": msg`My throat has hurt for three days already.`,
  "Võtke seda rohtu kaks korda päevas.": msg`Take this medicine twice a day.`,
  "Ma pean kaks päeva kodus puhkama.": msg`I have to rest at home for two days.`,
};

const FIX_PROMPTS: Record<(typeof DOCTOR_FIXES)[number]["id"], MessageDescriptor> = {
  "mul-valutab": msg`My head hurts.`,
  "valutab-sg": msg`My throat hurts.`,
  "arsti-juures": msg`They are at the doctor’s today.`,
  apteegis: msg`I went to the pharmacy yesterday.`,
  veega: msg`Take this medicine with water.`,
  "kolm-paeva": msg`Rest at home for three days.`,
};

const FIX_WHY: Record<(typeof DOCTOR_FIXES)[number]["id"], ReactNode> = {
  "mul-valutab": (
    <Trans>
      Saying what hurts usually takes <b lang="et">mul</b>, not <b lang="et">ma</b>:{" "}
      <b lang="et">Mul valutab pea</b>.
    </Trans>
  ),
  "valutab-sg": (
    <Trans>
      One aching part takes the singular verb <b lang="et">valutab</b>, not{" "}
      <b lang="et">valutavad</b>.
    </Trans>
  ),
  "arsti-juures": (
    <Trans>
      Being at the doctor’s uses <b lang="et">juures</b>, not <b lang="et">juurde</b>.
    </Trans>
  ),
  apteegis: (
    <Trans>
      Saying you visited a place takes the <b lang="et">-s</b> form: <b lang="et">apteegis</b>, not{" "}
      <b lang="et">apteeki</b>.
    </Trans>
  ),
  veega: (
    <Trans>
      Saying with water takes <b lang="et">-ga</b> on the genitive: <b lang="et">veega</b>, not{" "}
      <b lang="et">vee</b>.
    </Trans>
  ),
  "kolm-paeva": (
    <Trans>
      After numbers from two up, the noun usually takes the partitive singular:{" "}
      <b lang="et">kolm päeva</b>.
    </Trans>
  ),
};

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const pairs: MatchPair[] = DOCTOR_MATCH.map((word) => ({
      id: word,
      left: word,
      right: i18n._(WORD_MEANS[word] as MessageDescriptor),
      src: src(word),
    }));

    const tellOptions = (["pain", "symptom"] as const).map((id) => ({
      id,
      label: (
        <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
          {i18n._(TELL_OPTIONS[id])}
        </span>
      ),
    }));
    const tell: (ChoiceItem & { said: string; pair: readonly [string, string] })[] =
      DOCTOR_TELL.map((item) => ({
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
      }));

    const translations: (SentenceItem & { pair: readonly [string, string] })[] =
      DOCTOR_TRANSLATE.map((said) => ({
        kind: "translate",
        id: clipId(said),
        prompt: i18n._(TRANSLATE_PROMPTS[said]),
        src: src(said),
        answers: DOCTOR_ANSWERS[said],
        pair: [clipId(said), clipId(said)] as const,
      }));

    const fixes: FixItem[] = DOCTOR_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${item.id}`,
      wrong: item.wrong,
      prompt: i18n._(FIX_PROMPTS[item.id]),
      answers: [item.right],
      src: src(item.right),
      explain: FIX_WHY[item.id],
    }));

    const turns: DialogueTurn[] = [
      { who: "them", clip: clipId(DOCTOR_DIALOGUE[0].hear), line: DOCTOR_DIALOGUE[0].hear },
      {
        who: "you",
        clip: clipId(DOCTOR_DIALOGUE[0].right),
        replies: [
          { line: DOCTOR_DIALOGUE[0].right, right: true },
          {
            line: DOCTOR_DIALOGUE[0].wrong1,
            why: t`That orders coffee instead of asking for an appointment.`,
          },
          {
            line: DOCTOR_DIALOGUE[0].wrong2,
            why: t`That says where you live rather than why you are calling.`,
          },
        ],
      },
      { who: "them", clip: clipId(DOCTOR_DIALOGUE[1].hear), line: DOCTOR_DIALOGUE[1].hear },
      {
        who: "you",
        clip: clipId(DOCTOR_DIALOGUE[1].right),
        replies: [
          {
            line: DOCTOR_DIALOGUE[1].wrong1,
            why: t`The nurse is asking about your symptoms, not your pets.`,
          },
          { line: DOCTOR_DIALOGUE[1].right, right: true },
          {
            line: DOCTOR_DIALOGUE[1].wrong2,
            why: t`That talks about the weather instead of how you feel.`,
          },
        ],
      },
      { who: "them", clip: clipId(DOCTOR_DIALOGUE[2].hear), line: DOCTOR_DIALOGUE[2].hear },
      {
        who: "you",
        clip: clipId(DOCTOR_DIALOGUE[2].right),
        replies: [
          {
            line: DOCTOR_DIALOGUE[2].wrong1,
            why: t`The nurse asked whether tomorrow at ten suits you.`,
          },
          {
            line: DOCTOR_DIALOGUE[2].wrong2,
            why: t`That talks about shopping instead of confirming the time.`,
          },
          { line: DOCTOR_DIALOGUE[2].right, right: true },
        ],
      },
      { who: "them", clip: clipId(DOCTOR_DIALOGUE[3].hear), line: DOCTOR_DIALOGUE[3].hear },
      {
        who: "you",
        clip: clipId(DOCTOR_DIALOGUE[3].right),
        replies: [
          { line: DOCTOR_DIALOGUE[3].right, right: true },
          {
            line: DOCTOR_DIALOGUE[3].wrong1,
            why: t`You are ending a call with the clinic, not asking about a train.`,
          },
          {
            line: DOCTOR_DIALOGUE[3].wrong2,
            why: t`The appointment is booked — thank the nurse and say goodbye.`,
          },
        ],
      },
    ];

    const note: PassageQuestion[] = [
      {
        id: "time",
        kind: "short",
        ask: t`What time is Mart’s appointment tomorrow? Write two words from the message.`,
        answers: ["kell kümme", "kümme"],
        line: 1,
      },
      {
        id: "floor",
        ask: t`Which floor is the clinic on?`,
        options: [
          { id: "first", label: t`On the first floor` },
          { id: "second", label: t`On the second floor` },
          { id: "third", label: t`On the third floor` },
        ],
        answer: "third",
        line: 2,
      },
      {
        id: "id-card",
        kind: "truefalse",
        ask: t`Mart should arrive ten minutes early and bring his ID.`,
        answer: true,
        line: 3,
      },
      {
        id: "eat",
        kind: "truefalse",
        ask: t`The nurse tells Mart to eat a big meal right before the visit.`,
        answer: false,
        line: 5,
      },
      {
        id: "mask",
        ask: t`When does the clinic ask you to wear a mask?`,
        options: [
          { id: "fever", label: t`With a high fever` },
          { id: "rain", label: t`On rainy mornings` },
          { id: "late", label: t`After five o’clock` },
        ],
        answer: "fever",
        line: 4,
      },
      {
        id: "cancel",
        ask: t`When should Mart call if he cannot make it?`,
        options: [
          { id: "morning", label: t`Tomorrow at nine` },
          { id: "today5", label: t`Today before five` },
          { id: "monday", label: t`Next Monday noon` },
        ],
        answer: "today5",
        line: 6,
      },
    ];

    const call: PassageQuestion[] = [
      {
        id: "day",
        kind: "short",
        ask: t`On which day did Mart’s symptoms start? Write one word as he says it.`,
        answers: ["teisipäeval", "teisipäev"],
        line: 3,
      },
      {
        id: "hurts",
        ask: t`Which parts of Mart’s body feel fine?`,
        options: [
          { id: "stomach-back", label: t`Stomach and back` },
          { id: "throat-head", label: t`Throat and head` },
          { id: "hands-feet", label: t`Hands and feet` },
        ],
        answer: "stomach-back",
        line: 5,
      },
      {
        id: "lungs",
        kind: "truefalse",
        ask: t`The doctor says Mart’s lungs sound clear.`,
        answer: true,
        line: 8,
      },
      {
        id: "dose",
        ask: t`How should Mart take the medicine?`,
        options: [
          { id: "once", label: t`Once before sleep` },
          { id: "twice", label: t`Twice with water` },
          { id: "three", label: t`Three times dry` },
        ],
        answer: "twice",
        line: 10,
      },
      {
        id: "days",
        kind: "short",
        ask: t`For how many days must Mart take the medicine? Write the number word.`,
        answers: ["viis"],
        line: 12,
      },
      {
        id: "pharmacy",
        ask: t`Where is the pharmacy located?`,
        options: [
          { id: "first", label: t`On the first floor` },
          { id: "third", label: t`On the third floor` },
          { id: "square", label: t`Across the square` },
        ],
        answer: "first",
        line: 12,
      },
      {
        id: "work",
        kind: "truefalse",
        ask: t`The doctor tells Mart he can go to work tomorrow.`,
        answer: false,
        line: 14,
      },
      {
        id: "return",
        ask: t`When should Mart call back if the fever stays?`,
        options: [
          { id: "friday", label: t`On Friday night` },
          { id: "saturday", label: t`On Saturday noon` },
          { id: "monday", label: t`On Monday again` },
        ],
        answer: "monday",
        line: 16,
      },
    ];

    return { pairs, tell, translations, fixes, turns, note, call };
  }, [t, i18n]);
}

export function ArstiJuuresLesson() {
  const { t } = useLingui();
  const content = useContent();
  const have = lessonBySlug("mul-on")?.n;
  const names = { third: t`Doctor`, fourth: t`Mart` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Describe pain and symptoms, book a visit and follow medical advice:{" "}
          <b lang="et">Mul valutab pea</b>, <b lang="et">Mul on palavik</b>,{" "}
          <b lang="et">arsti juurde</b> and polite instructions like{" "}
          <b lang="et">Võtke seda rohtu</b>.
        </Trans>
      }
      facts={[
        <Trans key="m">20 minutes</Trans>,
        <Trans key="q">7 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["pea", "kurk", "kõht", "selg", "palavik", "köha", "nohu", "retsept"]}
      recap={[
        <Trans key="1">
          Pain usually uses <b lang="et">mul / sul / tal valutab</b> plus the aching part:{" "}
          <b lang="et">Mul valutab pea</b>, <b lang="et">Mul valutab kurk</b>.
        </Trans>,
        <Trans key="2">
          Symptoms use <b lang="et">mul on</b>: <b lang="et">Mul on palavik</b>,{" "}
          <b lang="et">Mul on köha</b>, <b lang="et">Mul on nohu</b>.
        </Trans>,
        <Trans key="3">
          Going to the doctor is <b lang="et">arsti juurde</b>; being there is{" "}
          <b lang="et">arsti juures</b>.
        </Trans>,
        <Trans key="4">
          Polite instructions from a doctor usually take <b lang="et">-ge / -ke</b>:{" "}
          <b lang="et">Võtke seda rohtu veega</b>, <b lang="et">Puhake kodus</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "words",
          title: t`Pain and symptoms`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In Estonian, you usually name pain with <b lang="et">mul</b> (from lesson {have}
                    ) and <b lang="et">valutab</b>: <Word w="pea" />, <Word w="kurk" />,{" "}
                    <Word w="kõht" /> and <Word w="selg" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Symptoms use <b lang="et">mul on</b>: <Word w="palavik" />, <Word w="köha" />{" "}
                    and <Word w="nohu" />. A prescription is <Word w="retsept" />.
                  </Trans>
                </p>
              </Prose>
              <HealthTable />
              <Aside>
                <Trans>
                  For one aching part, the verb is singular (<b lang="et">Mul valutab pea</b>). For
                  more than one, it usually becomes plural (<b lang="et">Mul valutavad jalad</b>).
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Match each Estonian health word with its meaning.</Trans>
                </p>
              </Prose>
              <Match
                id="health-words"
                title={<Trans>What does each word mean?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="a">Estonian</Trans>, <Trans key="b">Meaning</Trans>]}
              />
            </>
          ),
        },
        {
          id: "tell",
          title: t`Pain or symptom?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear each sentence and decide whether it says what hurts (
                    <b lang="et">valutab</b>) or names a symptom or medicine.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="tell-symptom"
                title={<Trans>Pain or symptom?</Trans>}
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
                  <Trans>Write each sentence for a doctor’s visit in Estonian.</Trans>
                </p>
              </Prose>
              <Quiz
                id="write-doctor"
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
                id="fix-doctor"
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
          title: t`Book an appointment`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    You are calling the family doctor’s office to book a visit. Listen and pick the
                    right reply.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="book-visit"
                title={<Trans>Calling the clinic</Trans>}
                part={<Trans>You are calling the family doctor’s office.</Trans>}
                them={t`Nurse`}
                turns={content.turns}
              />
            </>
          ),
        },
        {
          id: "read",
          title: t`Clinic message`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Nurse Kati sends confirmation details before Mart’s visit. Read and answer.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="clinic-note"
                title={<Trans>Before your visit</Trans>}
                clip="p-note"
                sentences={DOCTOR_NOTE}
                questions={content.note}
              />
            </>
          ),
        },
        {
          id: "listen",
          title: t`Listen: at the doctor’s`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mart sees his family doctor about a sore throat and cough. Listen and answer.
                    You can play the conversation twice.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="doctor-visit"
                title={<Trans>At the family doctor’s</Trans>}
                clip="c-doctor"
                turns={DOCTOR_CONVERSATION.turns}
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
