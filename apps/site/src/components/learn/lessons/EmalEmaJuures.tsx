import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  EMAL_ANSWERS,
  EMAL_CONVERSATION,
  EMAL_FIXES,
  EMAL_FORMS,
  EMAL_GROUPS,
  EMAL_MATCH,
  EMAL_NOTE,
  EMAL_TELL,
  EMAL_TRANSLATE,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
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

const SLUG = "emal-ema-juures";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Group = keyof typeof EMAL_GROUPS;

const PHRASE_MEANS: Record<string, MessageDescriptor> = {
  "ema juures": msg`at mother’s place`,
  "ema juurde": msg`to mother’s place`,
  "ema juurest": msg`from mother’s place`,
  emal: msg`mother has`,
  emale: msg`to mother (giving, calling)`,
  emalt: msg`from mother (getting, asking)`,
  "minu juures": msg`at my place`,
  "arsti juurde": msg`to the doctor`,
  "sõbra juures": msg`at a friend’s place`,
  "sõbra juurde": msg`to a friend’s place`,
  "sõbra juurest": msg`from a friend’s place`,
  "arsti juures": msg`at the doctor’s`,
  "arsti juurest": msg`from the doctor’s`,
  sõbral: msg`a friend has`,
  sõbrale: msg`to a friend`,
  sõbralt: msg`from a friend`,
};

const GLOSSARY: Glossary = {
  emal: { en: msg`mother has`, note: msg`Emal on väike aed.` },
  emale: { en: msg`to mother`, note: msg`Ma helistan emale.` },
  emalt: { en: msg`from mother`, note: msg`Ma sain emalt kirja.` },
  juures: { en: msg`at someone’s place, by`, note: msg`Ma olen täna ema juures.` },
  juurde: { en: msg`to someone’s place`, note: msg`Ma lähen homme arsti juurde.` },
  juurest: { en: msg`from someone’s place`, note: msg`Ta tuli just sõbra juurest.` },
  minu: { en: msg`my`, note: msg`Tule õhtul minu juurde!` },
  sõbra: { en: msg`friend’s (genitive)`, note: msg`Ta elab sel nädalal sõbra juures.` },
};

const ROW_LABELS: Record<string, MessageDescriptor> = {
  have: msg`Has / with`,
  to: msg`To (giving, calling)`,
  from: msg`From (receiving, asking)`,
  at: msg`At their place`,
  toward: msg`To their place`,
  away: msg`From their place`,
};

function PersonPlacesTable() {
  const { t, i18n } = useLingui();
  const [group, setGroup] = useState<Group>("place");
  const rows: ParadigmRow[] = EMAL_GROUPS[group].map((row) => ({
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
        label={t`Meaning`}
        items={[
          { label: t`At someone’s place`, value: "place" as Group },
          { label: t`Having or giving`, value: "have" as Group },
        ]}
        value={group}
        onPick={setGroup}
      />
      <Paradigm
        key={group}
        label={t`Person endings and place words`}
        columns={[t`Form`, t`In a sentence`]}
        rows={rows}
        highlight={{ column: 0 }}
        empty={{
          title: t`Tap a form`,
          tip:
            group === "place" ? (
              <Trans>
                Being at, going to or coming from a person’s place usually uses the genitive plus{" "}
                <b lang="et">juures</b>, <b lang="et">juurde</b> or <b lang="et">juurest</b>.
              </Trans>
            ) : (
              <Trans>
                <b lang="et">-l</b>, <b lang="et">-le</b> and <b lang="et">-lt</b> on a person
                usually express having, giving, calling or receiving.
              </Trans>
            ),
        }}
      />
    </Panel>
  );
}

const FORM_GLOSS: Record<(typeof EMAL_FORMS)[number]["id"], MessageDescriptor> = {
  "ema-place": msg`at mother’s place`,
  "arst-to": msg`to the doctor`,
  "sober-from": msg`from a friend’s place`,
  "mina-to": msg`to my place`,
  "ema-have": msg`mother has`,
  "sober-to": msg`to a friend (calling)`,
  "ode-from": msg`from sister (getting)`,
  "vend-have": msg`brother has`,
};

const FORM_WHY: Record<(typeof EMAL_FORMS)[number]["id"], ReactNode> = {
  "ema-place": (
    <Trans>
      Staying at a person’s place usually takes the genitive plus <b lang="et">juures</b>:{" "}
      <b lang="et">ema juures</b>.
    </Trans>
  ),
  "arst-to": (
    <Trans>
      Going to a person takes the genitive plus <b lang="et">juurde</b>:{" "}
      <b lang="et">arsti juurde</b>.
    </Trans>
  ),
  "sober-from": (
    <Trans>
      Coming from a person’s place takes the genitive plus <b lang="et">juurest</b>:{" "}
      <b lang="et">sõbra juurest</b>.
    </Trans>
  ),
  "mina-to": (
    <Trans>
      Before <b lang="et">juurde</b>, pronouns take the genitive <b lang="et">minu</b>:{" "}
      <b lang="et">minu juurde</b>.
    </Trans>
  ),
  "ema-have": (
    <Trans>
      Saying someone has something uses <b lang="et">-l</b>: <b lang="et">Emal on</b>.
    </Trans>
  ),
  "sober-to": (
    <Trans>
      Calling someone uses <b lang="et">-le</b> on the genitive <b lang="et">sõbra</b>:{" "}
      <b lang="et">sõbrale</b>.
    </Trans>
  ),
  "ode-from": (
    <Trans>
      Getting something from someone uses <b lang="et">-lt</b> on the genitive <b lang="et">õe</b>:{" "}
      <b lang="et">õelt</b>.
    </Trans>
  ),
  "vend-have": (
    <Trans>
      Saying someone has a free day uses <b lang="et">-l</b> on <b lang="et">venna</b>:{" "}
      <b lang="et">Vennal on</b>.
    </Trans>
  ),
};

const TELL_OPTIONS = {
  have: msg`Having, giving or getting`,
  place: msg`At, to or from their place`,
} as const;

const TELL_MEANS: Record<(typeof EMAL_TELL)[number]["id"], MessageDescriptor> = {
  "ema-have": msg`Mother has a small garden.`,
  "ema-place": msg`I am at my mother’s place today.`,
  "sober-give": msg`I am calling a friend.`,
  "sober-place": msg`I am going to a friend’s place in the evening.`,
  "arst-get": msg`I got a prescription from the doctor.`,
  "arst-place": msg`I am coming from the doctor’s.`,
  "vend-give": msg`I gave the key to my brother.`,
  "vend-place": msg`I went to my brother’s place yesterday.`,
};

const TRANSLATE_PROMPTS: Record<(typeof EMAL_TRANSLATE)[number], MessageDescriptor> = {
  "Ma olen täna ema juures.": msg`I am at my mother’s place today.`,
  "Ma lähen homme arsti juurde.": msg`I am going to the doctor tomorrow.`,
  "Ta tuli just sõbra juurest.": msg`He or she just came from a friend’s place.`,
  "Emal on väike aed.": msg`Mother has a small garden.`,
  "Ma sain õelt kirja.": msg`I got a letter from my sister.`,
  "Tule õhtul minu juurde!": msg`Come to my place in the evening!`,
};

const FIX_PROMPTS: Record<(typeof EMAL_FIXES)[number]["id"], MessageDescriptor> = {
  at: msg`I am at my mother’s place today.`,
  to: msg`I am going to the doctor tomorrow.`,
  from: msg`He or she just came from a friend’s place.`,
  genEma: msg`I am going to my mother’s place tomorrow.`,
  genSober: msg`He or she is at a friend’s place today.`,
  genMina: msg`Come to my place in the evening!`,
};

const FIX_WHY: Record<(typeof EMAL_FIXES)[number]["id"], ReactNode> = {
  at: (
    <Trans>
      Being at someone’s place takes <b lang="et">juures</b>, not <b lang="et">juurde</b>.
    </Trans>
  ),
  to: (
    <Trans>
      Going to someone takes <b lang="et">juurde</b>, not <b lang="et">juures</b>.
    </Trans>
  ),
  from: (
    <Trans>
      Coming from someone’s place takes <b lang="et">juurest</b>, not <b lang="et">juures</b>.
    </Trans>
  ),
  genEma: (
    <Trans>
      Before <b lang="et">juurde</b>, the noun takes the genitive <b lang="et">ema</b>, not{" "}
      <b lang="et">emale</b>.
    </Trans>
  ),
  genSober: (
    <Trans>
      Before <b lang="et">juures</b>, the noun takes the genitive <b lang="et">sõbra</b>, not{" "}
      <b lang="et">sõbrale</b>.
    </Trans>
  ),
  genMina: (
    <Trans>
      Before <b lang="et">juurde</b>, use the genitive <b lang="et">minu</b>, not{" "}
      <b lang="et">mul</b>.
    </Trans>
  ),
};

const formSaid = (item: { before: string; answer: string; after: string }) =>
  `${item.before ? `${item.before} ` : ""}${item.answer}${/^[.,!?]/.test(item.after) ? "" : " "}${item.after}`;

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const pairs: MatchPair[] = EMAL_MATCH.map((phrase) => ({
      id: clipId(phrase),
      left: phrase,
      right: i18n._(PHRASE_MEANS[phrase] as MessageDescriptor),
      src: src(phrase),
    }));

    const tellOptions = (["have", "place"] as const).map((id) => ({
      id,
      label: (
        <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
          {i18n._(TELL_OPTIONS[id])}
        </span>
      ),
    }));
    const tell: (ChoiceItem & { said: string; pair: readonly [string, string] })[] = EMAL_TELL.map(
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

    const forms: (FormItem & { pair: readonly [string, string] })[] = EMAL_FORMS.map((item) => {
      const said = formSaid(item);
      const cue = `${item.before ? `${item.before} ` : ""}___${/^[.,!?]/.test(item.after) ? "" : " "}${item.after}`;
      return {
        base: item.base,
        gloss: i18n._(FORM_GLOSS[item.id]),
        cue,
        cueLang: "et",
        answers: item.answers,
        src: src(said),
        said: <span lang="et">{said}</span>,
        explain: FORM_WHY[item.id],
        pair: [item.id, item.id] as const,
      };
    });

    const translations: (SentenceItem & { pair: readonly [string, string] })[] = EMAL_TRANSLATE.map(
      (said) => ({
        kind: "translate",
        id: clipId(said),
        prompt: i18n._(TRANSLATE_PROMPTS[said]),
        src: src(said),
        answers: EMAL_ANSWERS[said],
        pair: [clipId(said), clipId(said)] as const,
      }),
    );

    const fixes: FixItem[] = EMAL_FIXES.map((item) => ({
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
        id: "stay",
        ask: t`Where is Kati staying this weekend?`,
        options: [
          { id: "grandma", label: t`At her grandmother’s` },
          { id: "friend", label: t`With an old friend in Pärnu` },
          { id: "hotel", label: t`Inside a small wooden inn beside the harbour` },
        ],
        answer: "grandma",
        line: 1,
      },
      {
        id: "garden",
        kind: "truefalse",
        ask: t`Kati’s grandmother has a small apple orchard behind her house.`,
        answer: true,
        line: 2,
      },
      {
        id: "photos",
        ask: t`Who gave Kati old family photos?`,
        options: [
          { id: "uncle", label: t`Her uncle` },
          { id: "grandma", label: t`Her grandmother` },
          { id: "sister", label: t`Her younger sister from university` },
        ],
        answer: "grandma",
        line: 3,
      },
      {
        id: "bake",
        kind: "short",
        ask: t`What did Kati and her grandmother bake together? Write one word from the message.`,
        answers: ["õunakooki", "õunakook"],
        line: 4,
      },
      {
        id: "monday",
        kind: "truefalse",
        ask: t`Kati plans to stay at her grandmother’s until Monday afternoon.`,
        answer: false,
        line: 5,
      },
      {
        id: "sunday",
        ask: t`Why is Kati going to Mart’s place on Sunday evening?`,
        options: [
          { id: "soup", label: t`To eat dinner` },
          { id: "coat", label: t`To borrow a warm jacket` },
          { id: "book", label: t`To return the novel she borrowed last week` },
        ],
        answer: "book",
        line: 6,
      },
    ];

    const call: PassageQuestion[] = [
      {
        id: "now",
        ask: t`Where is Mart right now?`,
        options: [
          { id: "office", label: t`At work` },
          { id: "parents", label: t`At his parents’ house` },
          { id: "station", label: t`Waiting outside the main railway station` },
        ],
        answer: "parents",
        line: 2,
      },
      {
        id: "morning-doc",
        kind: "truefalse",
        ask: t`Mart went to the doctor this morning.`,
        answer: true,
        line: 4,
      },
      {
        id: "why-doc",
        ask: t`Why did Mart see the doctor?`,
        options: [
          { id: "throat", label: t`Sore throat` },
          { id: "eyes", label: t`Annual eye test` },
          { id: "knee", label: t`For a quick check on his injured knee` },
        ],
        answer: "knee",
        line: 5,
      },
      {
        id: "prescription",
        kind: "short",
        ask: t`What did Mart get from the doctor? Write one word as he says it.`,
        answers: ["retsepti", "retsept"],
        line: 6,
      },
      {
        id: "running",
        kind: "truefalse",
        ask: t`The doctor told Mart to go running again tomorrow.`,
        answer: false,
        line: 7,
      },
      {
        id: "sister-soup",
        kind: "truefalse",
        ask: t`Mart’s sister brought him fresh bread from the bakery.`,
        answer: true,
        line: 9,
      },
      {
        id: "when-visit",
        ask: t`When is Kati coming to Mart’s place?`,
        options: [
          { id: "sat", label: t`On Saturday` },
          { id: "tomorrow", label: t`Tomorrow afternoon around four` },
          { id: "wed", label: t`Late next Wednesday night after her train arrives` },
        ],
        answer: "sat",
        line: 12,
      },
      {
        id: "bring",
        kind: "short",
        ask: t`What will Kati bring with her? Write one word as she says it.`,
        answers: ["kooki", "kook"],
        line: 13,
      },
    ];

    return { pairs, tell, forms, translations, fixes, note, call };
  }, [t, i18n]);
}

export function EmalEmaJuuresLesson() {
  const { t } = useLingui();
  const content = useContent();
  const having = lessonBySlug("mul-on")?.n;
  const genitive = lessonBySlug("omastav")?.n;
  const names = { third: t`Kati`, fourth: t`Mart` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Use <b lang="et">-l</b>, <b lang="et">-le</b> and <b lang="et">-lt</b> on a person for
          having, giving and getting (<b lang="et">Emal on auto</b>), and the genitive plus{" "}
          <b lang="et">juures</b>, <b lang="et">juurde</b> and <b lang="et">juurest</b> for being
          at, going to or coming from someone’s place (<b lang="et">Olen ema juures</b>).
        </Trans>
      }
      facts={[
        <Trans key="m">20 minutes</Trans>,
        <Trans key="q">7 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={["emal", "emale", "emalt", "juures", "juurde", "juurest", "minu", "sõbra"]}
      recap={[
        <Trans key="1">
          <b lang="et">-l</b>, <b lang="et">-le</b> and <b lang="et">-lt</b> on a person usually
          mean having, giving or receiving: <b lang="et">Emal on aed</b>,{" "}
          <b lang="et">helistan emale</b>, <b lang="et">sain emalt kirja</b>.
        </Trans>,
        <Trans key="2">
          Being at, going to or coming from someone’s place usually uses the genitive plus{" "}
          <b lang="et">juures</b> (at), <b lang="et">juurde</b> (to) or <b lang="et">juurest</b>{" "}
          (from): <b lang="et">ema juures</b>, <b lang="et">arsti juurde</b>,{" "}
          <b lang="et">sõbra juurest</b>.
        </Trans>,
        <Trans key="3">
          With pronouns, use the genitive before <b lang="et">juures</b>:{" "}
          <b lang="et">minu juures</b> (at my place), not <b lang="et">mul juures</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "contrast",
          title: t`Having versus being at someone’s place`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {having} you saw <Word w="emal" /> for what mother has:{" "}
                    <b lang="et">Emal on auto</b>. In the same way, <Word w="emale" /> means to
                    mother (giving or calling) and <Word w="emalt" /> means from mother (receiving
                    or asking).
                  </Trans>
                </p>
                <p>
                  <Trans>
                    To say you are physically at, going to or coming from someone’s place, Estonian
                    usually uses the genitive from lesson {genitive} plus <Word w="juures" /> (
                    <b lang="et">kus?</b>), <Word w="juurde" /> (<b lang="et">kuhu?</b>) or{" "}
                    <Word w="juurest" /> (<b lang="et">kust?</b>): <b lang="et">Olen ema juures</b>,{" "}
                    <b lang="et">Lähen arsti juurde</b>, <b lang="et">Tulen sõbra juurest</b>.
                  </Trans>
                </p>
              </Prose>
              <PersonPlacesTable />
              <Aside>
                <Trans>
                  Pronouns work the same way: <b lang="et">Mul on aega</b> (I have time), but{" "}
                  <b lang="et">Tule minu juurde</b> (Come to my place). With <b lang="et">arst</b>,
                  you will also hear <b lang="et">käisin arstil</b> in everyday speech, though{" "}
                  <b lang="et">arsti juures</b> always works.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Match each Estonian phrase with what it means.</Trans>
                </p>
              </Prose>
              <Match
                id="person-phrases"
                title={<Trans>What does each phrase mean?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="a">Estonian</Trans>, <Trans key="b">Meaning</Trans>]}
              />
            </>
          ),
        },
        {
          id: "tell",
          title: t`Having or staying?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear each sentence and decide whether it is about having, giving or getting, or
                    about being at, going to or coming from someone’s place.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="tell-meaning"
                title={<Trans>Having or at their place?</Trans>}
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
          id: "forms",
          title: t`Make the form`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Type either the <b lang="et">-l / -le / -lt</b> form or the genitive plus{" "}
                    <b lang="et">juures / juurde / juurest</b> to finish each sentence.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="make-person"
                title={<Trans>Complete the sentence</Trans>}
                items={content.forms}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight forms right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check whether the sentence is about having or a place.</Trans>
                  ) : (
                    <Trans>Go through the table once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={eachPairFirst}
                round={(props) => <FormRound {...props} />}
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
                  <Trans>
                    Write each sentence in Estonian, choosing <b lang="et">-l / -le / -lt</b> or{" "}
                    <b lang="et">juures / juurde / juurest</b>.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-person"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.translations}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six sentences right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the genitive and place word in the ones you missed.</Trans>
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
                    Each sentence has one wrong word: either the wrong direction or the wrong case
                    before <b lang="et">juures</b> or <b lang="et">juurde</b>. Tap the wrong word,
                    then type the right one.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-person"
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
          title: t`Weekend at grandmother’s`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati sends Mart a message from her grandmother’s house. Read and answer.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="grandma-note"
                title={t`Kati writes`}
                sentences={EMAL_NOTE}
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
                    Kati calls Mart to see how he is doing after his doctor’s visit. Listen and
                    answer. You can play the conversation twice.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="doctor-call"
                title={t`Calling after the doctor’s visit`}
                clip="c-kula"
                turns={EMAL_CONVERSATION.turns}
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
