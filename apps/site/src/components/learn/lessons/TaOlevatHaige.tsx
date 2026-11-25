import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  REP_ASK,
  REP_ASK_ANSWERS,
  REP_ASK_TABLE,
  REP_CONVERSATION,
  REP_DIARY,
  REP_FIX_ANSWERS,
  REP_FIXES,
  REP_HEARD,
  REP_PAIRS,
  REP_SAY,
  REP_SAY_ANSWERS,
  REP_STAYS,
  REP_TABLE,
  REP_TYPED,
  REP_VERBS,
  REP_WRITE,
  REP_WRITE_ANSWERS,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
import { type FixItem, FixRound, fixRecall } from "../FixRound";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion, Reading } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Word } from "../Word";

const SLUG = "ta-olevat-haige";
const src = (text: string) => clipUrl(SLUG, clipId(text));

const MEANS: Record<string, MessageDescriptor> = {
  tulema: msg`to come`,
  lugema: msg`to read`,
  elama: msg`to live`,
  töötama: msg`to work`,
  rääkima: msg`to talk, to tell`,
  magama: msg`to sleep`,
  olema: msg`to be`,
  minema: msg`to go`,
  tegema: msg`to do, to make`,
  jooma: msg`to drink`,
  sööma: msg`to eat`,
};

const GLOSSARY: Glossary = {
  ütles: { en: msg`said`, note: msg`Ta ütles, et tal on kiire.` },
  rääkis: { en: msg`told, talked`, note: msg`Ta rääkis, et ta käis Tallinnas.` },
  küsis: { en: msg`asked`, note: msg`Ta küsis, kas ma tulen.` },
  tulevat: { en: msg`is said to come`, note: msg`Ta tulevat homme.` },
  olevat: { en: msg`is said to be`, note: msg`Ta olevat haige.` },
  lugevat: { en: msg`is said to read`, note: msg`Ta lugevat iga päev ajalehte.` },
  elavat: { en: msg`is said to live`, note: msg`Ta elavat nüüd Tartus.` },
  töötavat: { en: msg`is said to work`, note: msg`Ta töötavat koolis.` },
  rääkivat: { en: msg`is said to speak`, note: msg`Ta rääkivat hästi eesti keelt.` },
  magavat: { en: msg`is said to sleep`, note: msg`Ta magavat terve päeva.` },
  minevat: { en: msg`is said to go`, note: msg`Ta minevat homme koju.` },
  tegevat: { en: msg`is said to do`, note: msg`Ta tegevat palju tööd.` },
  joovat: { en: msg`is said to drink`, note: msg`Ta joovat iga päev kohvi.` },
  söövat: { en: msg`is said to eat`, note: msg`Ta söövat ainult kala.` },
};

const TABLE_LABELS: Record<(typeof REP_TABLE)[number]["id"], MessageDescriptor> = {
  ma: msg`I → he or she`,
  mul: msg`I have → he or she has`,
  sa: msg`you → I`,
  mu: msg`my → his or her`,
};

const TABLE_TIPS: Record<(typeof REP_TABLE)[number]["id"], ReactNode> = {
  ma: (
    <Trans>
      <b lang="et">Ma</b> becomes <b lang="et">ta</b>, and the verb takes the new person’s ending:{" "}
      <b lang="et">tulen</b> becomes <b lang="et">tuleb</b>. <b lang="et">Homme</b> stays.
    </Trans>
  ),
  mul: (
    <Trans>
      <b lang="et">Mul</b> becomes <b lang="et">tal</b> when the person is someone else.
    </Trans>
  ),
  sa: (
    <Trans>
      When the person was speaking to you, <b lang="et">sa</b> becomes <b lang="et">ma</b>, and the
      verb takes <b lang="et">ma</b>’s ending: <b lang="et">räägid</b> becomes{" "}
      <b lang="et">räägin</b>.
    </Trans>
  ),
  mu: (
    <Trans>
      <b lang="et">Mu</b>, my, becomes <b lang="et">tema</b>, his or her.
    </Trans>
  ),
};

const ASK_LABELS: Record<(typeof REP_ASK_TABLE)[number]["id"], MessageDescriptor> = {
  kas: msg`yes or no`,
  kus: msg`where`,
  mida: msg`what`,
};

const ASK_TIPS: Record<(typeof REP_ASK_TABLE)[number]["id"], ReactNode> = {
  kas: (
    <Trans>
      A yes-or-no question keeps <b lang="et">kas</b>. Only the person changes: <b lang="et">sul</b>{" "}
      becomes <b lang="et">mul</b>.
    </Trans>
  ),
  kus: (
    <Trans>
      A question word stays as it is: <b lang="et">kus</b>, where. There is no <b lang="et">kas</b>{" "}
      and no <b lang="et">et</b>.
    </Trans>
  ),
  mida: (
    <Trans>
      <b lang="et">Mida</b>, what, stays too. <b lang="et">Sa</b> becomes <b lang="et">ma</b>, and{" "}
      <b lang="et">teed</b> becomes <b lang="et">teen</b>.
    </Trans>
  ),
};

function SaidTable({ kind }: { kind: "say" | "ask" }) {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] =
    kind === "say"
      ? REP_TABLE.map((row) => ({
          id: row.id,
          label: i18n._(TABLE_LABELS[row.id]),
          tip: TABLE_TIPS[row.id],
          cells: [
            { form: row.direct, src: src(row.direct) },
            { form: row.said, src: src(row.said) },
          ],
        }))
      : REP_ASK_TABLE.map((row) => ({
          id: row.id,
          label: i18n._(ASK_LABELS[row.id]),
          tip: ASK_TIPS[row.id],
          cells: [
            { form: row.direct, src: src(row.direct) },
            { form: row.said, src: src(row.said) },
          ],
        }));
  return (
    <Panel className="gap-5">
      <Paradigm
        label={
          kind === "say"
            ? t`Things people said, and how you report them`
            : t`Questions, and how you report them`
        }
        columns={[t`What was said`, t`What you report`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a sentence`,
          tip:
            kind === "say" ? (
              <Trans>
                The reported sentence follows <b lang="et">et</b>. The person words change; the rest
                stays.
              </Trans>
            ) : (
              <Trans>
                A yes-or-no question follows <b lang="et">kas</b>, and a question word stays where
                it was.
              </Trans>
            ),
        }}
      />
    </Panel>
  );
}

type Entry = { inf: string; form: string; said: string };

function VatTable() {
  const { t, i18n } = useLingui();
  const keys = Object.keys(REP_VERBS) as (keyof typeof REP_VERBS)[];
  const [group, setGroup] = useState<string>(keys[0] as string);
  const labels: Record<string, string> = { most: t`Longer verbs`, short: t`Short verbs` };
  const tips: Record<string, ReactNode> = {
    most: (
      <Trans>
        Take the <b lang="et">-ma</b> form, drop <b lang="et">-ma</b> and add <b lang="et">-vat</b>:{" "}
        <b lang="et">tulema</b>, <b lang="et">tulevat</b>.
      </Trans>
    ),
    short: (
      <Trans>
        The same rule works for short verbs: <b lang="et">olema</b>, <b lang="et">olevat</b>;{" "}
        <b lang="et">sööma</b>, <b lang="et">söövat</b>.
      </Trans>
    ),
  };
  const list = (REP_VERBS as unknown as Record<string, readonly Entry[]>)[group] ?? [];
  const rows: ParadigmRow[] = list.map((each) => ({
    id: each.inf,
    label: i18n._(MEANS[each.inf] as MessageDescriptor),
    cells: [
      { form: each.inf, src: src(each.inf) },
      {
        form: `${each.inf.slice(0, -2)}|vat`,
        src: src(each.said),
        note: (
          <>
            <b lang="et">{each.said}</b>
          </>
        ),
      },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Verbs`}
        items={keys.map((each) => ({
          label: labels[each as string] as string,
          value: each as string,
        }))}
        value={group}
        onPick={setGroup}
      />
      <Paradigm
        key={group}
        label={t`Verbs and their -vat forms`}
        columns={[t`Infinitive`, t`The -vat form`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{ title: t`Tap a form`, tip: tips[group] }}
      />
    </Panel>
  );
}

function PairTable() {
  const { t } = useLingui();
  const labels: Record<(typeof REP_PAIRS)[number]["id"], string> = {
    ill: t`Mari is ill`,
    coming: t`Peeter is coming tomorrow`,
  };
  const rows: ParadigmRow[] = REP_PAIRS.map((row) => ({
    id: row.id,
    label: labels[row.id],
    cells: [
      { form: row.said, src: src(row.said) },
      { form: row.vat, src: src(row.vat) },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Paradigm
        label={t`The same news said by someone and passed on`}
        columns={[t`Says who said it`, t`Passes it on`]}
        rows={rows}
        empty={{
          title: t`Tap a sentence`,
          tip: (
            <Trans>
              <b lang="et">Ütles, et</b> names the person. <b lang="et">-vat</b> usually names no
              one: it passes the news on.
            </Trans>
          ),
        }}
      />
    </Panel>
  );
}

const STAYS_MEANS: Record<(typeof REP_STAYS)[number]["id"], MessageDescriptor> = {
  "ill-now": msg`Mari said she is ill.`,
  "ill-before": msg`Mari said she was ill yesterday.`,
  "come-later": msg`Peeter said he is coming tomorrow.`,
  "went-before": msg`Peeter said he went to Tallinn yesterday.`,
  "lives-now": msg`Mari said she lives in Tartu.`,
  "home-later": msg`Mari said she is going home tomorrow.`,
  "studies-now": msg`Peeter said he is studying Estonian.`,
  "drove-before": msg`Peeter said he drove to Tartu yesterday.`,
};

const STAYS_RULE: Record<"now" | "before" | "later", ReactNode> = {
  now: <Trans>The verb is in the present because the person spoke about the present.</Trans>,
  before: <Trans>The verb is in the past because the person spoke about something earlier.</Trans>,
  later: (
    <Trans>
      The present tense with <b lang="et">homme</b>, tomorrow, speaks about what comes next.
    </Trans>
  ),
};

const HEARD_MEANS: Record<(typeof REP_HEARD)[number]["id"], MessageDescriptor> = {
  "liisa-said": msg`Liisa said she is coming on Saturday.`,
  "liisa-vat": msg`Liisa is said to be coming on Saturday.`,
  "kalev-said": msg`Kalev said he now lives in Tartu.`,
  "kalev-vat": msg`Kalev is said to live in Tartu now.`,
  "rain-vat": msg`It is said it will rain tomorrow.`,
  "rain-said": msg`Peeter said it will rain tomorrow.`,
  "concert-vat": msg`The concert is said to begin at six.`,
  "concert-said": msg`Mari said the concert begins at six.`,
};

const stayOptions = (i18n: I18n) => [
  { id: "now", label: <span lang={i18n.locale}>{i18n._(msg`At that moment`)}</span> },
  { id: "before", label: <span lang={i18n.locale}>{i18n._(msg`Earlier`)}</span> },
  { id: "later", label: <span lang={i18n.locale}>{i18n._(msg`Later`)}</span> },
];

const heardOptions = (i18n: I18n) => [
  { id: "named", label: <span lang={i18n.locale}>{i18n._(msg`Someone named said it`)}</span> },
  { id: "reported", label: <span lang={i18n.locale}>{i18n._(msg`Only passed on`)}</span> },
];

const pairRun = <T extends { pair: readonly [string, string] }>(items: readonly T[], pinned?: T) =>
  eachPairFirst(items, pinned);

const cueOf = (cue: string) => <span lang="et">{cue}</span>;

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const said: (SentenceItem & { pair: readonly [string, string] })[] = REP_SAY.map((item) => ({
      kind: "rewrite",
      id: `say-${item.id}`,
      from: item.from,
      cue: cueOf(item.cue),
      answers: REP_SAY_ANSWERS[item.id],
      src: src(REP_SAY_ANSWERS[item.id][0]),
      pair: [item.id, item.id] as const,
    }));

    const asked: (SentenceItem & { pair: readonly [string, string] })[] = REP_ASK.map((item) => ({
      kind: "rewrite",
      id: `ask-${item.id}`,
      from: item.from,
      cue: cueOf(item.cue),
      answers: REP_ASK_ANSWERS[item.id],
      src: src(REP_ASK_ANSWERS[item.id][0]),
      pair: [item.id, item.id] as const,
    }));

    const stays: (ChoiceItem & { said: string; pair: readonly [string, string] })[] = REP_STAYS.map(
      (each) => ({
        said: each.said,
        src: src(each.said),
        answer: each.means,
        options: stayOptions(i18n),
        pair: [each.id, each.id] as const,
        explain: (
          <>
            <Trans>
              <b lang="et">{each.said}</b> {i18n._(STAYS_MEANS[each.id])}
            </Trans>{" "}
            {STAYS_RULE[each.means]}
          </>
        ),
      }),
    );

    const heard: (ChoiceItem & { said: string; pair: readonly [string, string] })[] = REP_HEARD.map(
      (each) => ({
        said: each.said,
        src: src(each.said),
        answer: each.means,
        options: heardOptions(i18n),
        pair: [each.id, each.id] as const,
        explain: (
          <>
            <Trans>
              <b lang="et">{each.said}</b> {i18n._(HEARD_MEANS[each.id])}
            </Trans>{" "}
            {each.means === "named" ? (
              <Trans>
                <b lang="et">Ütles, et</b> and <b lang="et">rääkis, et</b> name who said it.
              </Trans>
            ) : (
              <Trans>
                <b lang="et">-vat</b> usually passes the news on without saying who said it.
              </Trans>
            )}
          </>
        ),
      }),
    );

    const vatForms: (FormItem & { pair: readonly [string, string] })[] = REP_TYPED.map((inf) => {
      const each = [...REP_VERBS.most, ...REP_VERBS.short].find(
        (entry) => entry.inf === inf,
      ) as Entry;
      return {
        base: each.inf,
        gloss: i18n._(MEANS[each.inf] as MessageDescriptor),
        cue: (
          <Trans>
            the <b lang="et">-vat</b> form
          </Trans>
        ),
        answers: [each.form],
        src: src(each.said),
        said: <span lang="et">{each.said}</span>,
        explain: (
          <Trans>
            Drop <b lang="et">-ma</b> from <b lang="et">{each.inf}</b> and add <b lang="et">-vat</b>
            : <b lang="et">{each.form}</b>.
          </Trans>
        ),
        pair: [each.inf, each.inf] as const,
      };
    });

    const writePrompts: Record<string, MessageDescriptor> = {
      "Peeter ütles, et ta tuleb homme.": msg`Peeter said he is coming tomorrow.`,
      "Mari ütles, et ta ootab bussi.": msg`Mari said she is waiting for the bus.`,
      "Peeter küsis, kas ta on kodus.": msg`Peeter asked if she is at home.`,
      "Ma küsisin, kas sa räägid eesti keelt.": msg`I asked if you speak Estonian.`,
      "Ta olevat haige.": msg`Reportedly, she is ill. (use the -vat form)`,
      "Ta ei tulevat homme.": msg`Reportedly, she isn’t coming tomorrow. (use the -vat form)`,
    };
    const writeWhy: Partial<Record<string, ReactNode>> = {
      "Peeter ütles, et ta tuleb homme.": (
        <Trans>
          After <b lang="et">ütles</b> put a comma and <b lang="et">et</b>. Peeter’s{" "}
          <b lang="et">ma tulen</b> becomes <b lang="et">ta tuleb</b>.
        </Trans>
      ),
      "Peeter küsis, kas ta on kodus.": (
        <Trans>
          A yes-or-no question follows <b lang="et">küsis</b> with <b lang="et">kas</b>, not{" "}
          <b lang="et">et</b>.
        </Trans>
      ),
      "Ta olevat haige.": (
        <Trans>
          <b lang="et">olema</b> without <b lang="et">-ma</b>, plus <b lang="et">-vat</b>:{" "}
          <b lang="et">olevat</b>.
        </Trans>
      ),
      "Ta ei tulevat homme.": (
        <Trans>
          For no, put <b lang="et">ei</b> before the <b lang="et">-vat</b> form.
        </Trans>
      ),
    };
    const written: (SentenceItem & { pair: readonly [string, string] })[] = REP_WRITE.map(
      ({ said: sentence }) => ({
        kind: "translate",
        id: clipId(sentence),
        prompt: i18n._(writePrompts[sentence] as MessageDescriptor),
        src: src(sentence),
        answers: REP_WRITE_ANSWERS[sentence] as readonly [string, ...string[]],
        pair: [clipId(sentence), clipId(sentence)] as const,
        explain: writeWhy[sentence],
      }),
    );

    const fixPrompts: Record<(typeof REP_FIXES)[number]["right"], MessageDescriptor> = {
      "Mari ütles, et tal on kiire.": msg`Mari said she is busy.`,
      "Mari küsis, kas ma tulen.": msg`Mari asked if I am coming.`,
      "Peeter rääkis, et ta käis Tallinnas.": msg`Peeter said he went to Tallinn.`,
      "Ta tulevat homme.": msg`Reportedly, he is coming tomorrow.`,
      "Ta olevat haige.": msg`Reportedly, she is ill.`,
      "Peeter ütles, et ta tuleb homme.": msg`Peeter said he is coming tomorrow.`,
    };
    const fixWhy: Record<(typeof REP_FIXES)[number]["right"], ReactNode> = {
      "Mari ütles, et tal on kiire.": (
        <Trans>
          Mari’s <b lang="et">mul</b> becomes <b lang="et">tal</b> for you: it is about her.
        </Trans>
      ),
      "Mari küsis, kas ma tulen.": (
        <Trans>
          A yes-or-no question after <b lang="et">küsis</b> takes <b lang="et">kas</b>, not{" "}
          <b lang="et">et</b>.
        </Trans>
      ),
      "Peeter rääkis, et ta käis Tallinnas.": (
        <Trans>
          A statement after <b lang="et">rääkis</b> takes <b lang="et">et</b>. <b lang="et">Kas</b>{" "}
          is for yes-or-no questions.
        </Trans>
      ),
      "Ta tulevat homme.": (
        <Trans>
          Drop <b lang="et">-ma</b> from <b lang="et">tulema</b> and add <b lang="et">-vat</b>:{" "}
          <b lang="et">tulevat</b>.
        </Trans>
      ),
      "Ta olevat haige.": (
        <Trans>
          The form ends in <b lang="et">-vat</b>, whoever the person is: <b lang="et">olevat</b>.
        </Trans>
      ),
      "Peeter ütles, et ta tuleb homme.": (
        <Trans>
          The person changed to <b lang="et">ta</b>, so the verb changes too: <b lang="et">tuleb</b>
          , not <b lang="et">tulen</b>.
        </Trans>
      ),
    };
    const fixes: FixItem[] = REP_FIXES.map((item) => ({
      kind: "fix",
      id: `fix-${clipId(item.right)}`,
      wrong: item.wrong,
      answers: REP_FIX_ANSWERS[item.right] ?? [item.right],
      src: src(item.right),
      prompt: i18n._(fixPrompts[item.right]),
      explain: fixWhy[item.right],
    }));

    const library: PassageQuestion[] = [
      {
        id: "when-move",
        ask: t`Where is the new building?`,
        options: [
          { id: "river", label: t`By the river` },
          { id: "square", label: t`On the old town square` },
          { id: "station", label: t`Next to the railway station` },
        ],
        answer: "river",
        line: 1,
      },
      {
        id: "why-move",
        ask: t`Why does the library move?`,
        options: [
          { id: "sell", label: t`Its owner is selling it.` },
          { id: "small", label: t`The old building is too small to hold all the books.` },
          { id: "name", label: t`Readers wanted a new name.` },
        ],
        answer: "small",
        line: 4,
      },
      {
        id: "closed-long",
        kind: "truefalse",
        ask: t`The library will be closed for the whole time of the move.`,
        answer: false,
        line: 11,
      },
      {
        id: "days",
        kind: "short",
        ask: t`How many days will it be closed? Write the number word as the text does.`,
        answers: ["kolm"],
        line: 11,
      },
      {
        id: "shop",
        kind: "truefalse",
        ask: t`The city has already confirmed that a shop will open in the old building.`,
        answer: false,
        line: 16,
      },
      {
        id: "neighbour",
        kind: "truefalse",
        ask: t`A neighbour does not want a shop on the street because of the cars.`,
        answer: true,
        line: 17,
      },
      {
        id: "opening",
        kind: "short",
        ask: t`When is the opening planned? Write it as the text does.`,
        answers: ["esimesel oktoobril"],
        line: 19,
      },
      {
        id: "mayor",
        kind: "short",
        ask: t`Who is said to come to the opening? Write it as the text does.`,
        answers: ["linnapea"],
        line: 20,
      },
    ];

    const exam: PassageQuestion[] = [
      {
        id: "said-mari",
        ask: t`What did Mari say when she phoned Liisa?`,
        options: [
          { id: "busy", label: t`That she is busy and cannot come in today.` },
          { id: "ill", label: t`That she is ill and not coming to work.` },
          { id: "away", label: t`That she is going abroad.` },
        ],
        answer: "ill",
        line: 10,
      },
      {
        id: "decided",
        kind: "truefalse",
        ask: t`Mari has already decided to come to the concert.`,
        answer: false,
        line: 14,
      },
      {
        id: "back",
        ask: t`When does Mari say she will be back at work?`,
        options: [
          { id: "friday", label: t`On Friday, if she feels better by then` },
          { id: "monday", label: t`On Monday, if she is well` },
          { id: "tomorrow", label: t`Tomorrow, but only for a few hours` },
        ],
        answer: "monday",
        line: 20,
      },
      {
        id: "cinema",
        ask: t`How does Kalev know that Mari went to the cinema?`,
        options: [
          { id: "saw", label: t`He saw her there himself, by chance.` },
          { id: "told", label: t`Someone told him, but not who.` },
          { id: "mari", label: t`Mari told him about it herself on the phone.` },
        ],
        answer: "told",
        line: 21,
      },
      {
        id: "home",
        kind: "truefalse",
        ask: t`Mari says she spent yesterday at home.`,
        answer: true,
        line: 23,
      },
      {
        id: "rain",
        kind: "short",
        ask: t`According to the radio, what will fall on Saturday? Write it as Liisa says it.`,
        answers: ["vihma"],
        line: 27,
      },
      {
        id: "start",
        ask: t`When does the concert begin?`,
        options: [
          { id: "half", label: t`At half past eight` },
          { id: "six", label: t`At six, as on the ticket` },
          { id: "seven", label: t`At seven, when the doors open` },
        ],
        answer: "six",
        line: 31,
      },
      {
        id: "brother",
        kind: "truefalse",
        ask: t`Kalev’s brother wants a ticket too.`,
        answer: true,
        line: 40,
      },
      {
        id: "boss",
        ask: t`What did Kalev’s boss ask?`,
        options: [
          { id: "late", label: t`Whether anyone can work later on Friday.` },
          { id: "sick", label: t`Whether Mari is ill.` },
          { id: "concert", label: t`Whether anyone has a concert ticket.` },
        ],
        answer: "late",
        line: 47,
      },
      {
        id: "boss-new",
        kind: "truefalse",
        ask: t`Liisa is sure that a new boss is coming in the autumn.`,
        answer: false,
        line: 54,
      },
    ];

    return { said, asked, stays, heard, vatForms, written, fixes, library, exam };
  }, [t, i18n]);
}

export function TaOlevatHaigeLesson() {
  const { t } = useLingui();
  const content = useContent();
  const perfect = lessonBySlug("olen-lugenud")?.n;
  const names = { fourth: t`Kalev`, third: t`Liisa` };

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          <b lang="et">Ta ütles, et tal on kiire</b> reports what someone said.{" "}
          <b lang="et">Ta olevat haige</b> passes on what is said about someone. Learn to make the
          first and to recognise the second.
        </Trans>
      }
      facts={[
        <Trans key="m">24 minutes</Trans>,
        <Trans key="q">9 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "ütles",
        "rääkis",
        "küsis",
        "olevat",
        "tulevat",
        "lugevat",
        "elavat",
        "töötavat",
        "rääkivat",
        "magavat",
        "minevat",
        "tegevat",
        "joovat",
        "söövat",
      ]}
      recap={[
        <Trans key="1">
          To report what someone said, put a comma and <b lang="et">et</b> after{" "}
          <b lang="et">ütles</b> or <b lang="et">rääkis</b>. The person words change with the
          speaker: <b lang="et">ma</b> becomes <b lang="et">ta</b>, <b lang="et">mul</b> becomes{" "}
          <b lang="et">tal</b>, and the verb takes the new person’s ending.
        </Trans>,
        <Trans key="2">
          The verb usually keeps the tense it had when it was said:{" "}
          <b lang="et">Ta ütles, et ta on haige</b> for “I am ill”,{" "}
          <b lang="et">Ta ütles, et ta oli eile haige</b> for “I was ill yesterday”. English moves
          the verb back; Estonian usually does not.
        </Trans>,
        <Trans key="3">
          A yes-or-no question follows <b lang="et">küsis</b> with <b lang="et">kas</b>:{" "}
          <b lang="et">Mari küsis, kas ma tulen.</b> A question word stays and <b lang="et">kas</b>{" "}
          goes: <b lang="et">Peeter küsis, millal ma tulen.</b>
        </Trans>,
        <Trans key="4">
          The <b lang="et">-vat</b> form is the <b lang="et">-ma</b> form without{" "}
          <b lang="et">-ma</b>, plus <b lang="et">-vat</b>: <b lang="et">tulevat</b>,{" "}
          <b lang="et">olevat</b>. It has no person ending, and <b lang="et">ei</b> before it makes
          it no: <b lang="et">Ta ei tulevat.</b>
        </Trans>,
        <Trans key="5">
          <b lang="et">-vat</b> usually names no source and is mostly met in news and reports. In
          everyday talk people usually say who said it with <b lang="et">ütles, et</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "say",
          title: t`Telling what someone said`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To report what someone said, put a comma and <b lang="et">et</b> after{" "}
                    <Word w="ütles" /> or <Word w="rääkis" />, then the sentence itself:{" "}
                    <b lang="et">Mari ütles: „Ma olen väsinud.“</b> becomes{" "}
                    <b lang="et">Mari ütles, et ta on väsinud.</b> Mari said she is tired.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The person words change with the speaker. Mari’s <b lang="et">ma</b> becomes{" "}
                    <b lang="et">ta</b> and the verb follows: <b lang="et">olen</b> becomes{" "}
                    <b lang="et">on</b>. Tap a sentence to hear it.
                  </Trans>
                </p>
              </Prose>
              <SaidTable kind="say" />
              <Prose>
                <p>
                  <Trans>Report each sentence. Keep the tense, change the person.</Trans>
                </p>
              </Prose>
              <Quiz
                id="say-et"
                title={<Trans>Say what they said</Trans>}
                items={content.said}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight reported correctly.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the person words in the ones you missed.</Trans>
                  ) : (
                    <Trans>Tap the sentences above once more, then try again.</Trans>
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
          id: "stays",
          title: t`The verb usually keeps its tense`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    English usually moves the verb back in time: “She said she was ill.” Estonian
                    usually keeps the verb as it was said.{" "}
                    <b lang="et">Mari ütles: „Ma olen haige.“</b> becomes{" "}
                    <b lang="et">Mari ütles, et ta on haige</b>, with <b lang="et">on</b>, not{" "}
                    <b lang="et">oli</b>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    So the tense tells you when the thing was true for the speaker:{" "}
                    <b lang="et">ta oli eile haige</b> is about yesterday, and{" "}
                    <b lang="et">ta tuleb homme</b> is about tomorrow, because the present tense
                    also speaks about what comes next.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Listen, then pick when it was true for the person who spoke: at that moment,
                    earlier or later.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="verb-stays"
                title={<Trans>When was it true?</Trans>}
                items={content.stays}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight heard the right time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you got wrong once more.</Trans>
                  ) : (
                    <Trans>Read the explanation under each one you missed, then try again.</Trans>
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
          id: "kas",
          title: t`Telling what someone asked`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    A yes-or-no question follows <Word w="küsis" /> with <b lang="et">kas</b>, not{" "}
                    <b lang="et">et</b>: <b lang="et">Mari küsis: „Kas sa tuled?“</b> becomes{" "}
                    <b lang="et">Mari küsis, kas ma tulen.</b> The person changes as before.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    A question that starts with a question word keeps the word and drops{" "}
                    <b lang="et">kas</b>: <b lang="et">Peeter küsis, millal ma tulen.</b> Tap a
                    sentence to hear it.
                  </Trans>
                </p>
              </Prose>
              <SaidTable kind="ask" />
              <Prose>
                <p>
                  <Trans>Report each question.</Trans>
                </p>
              </Prose>
              <Quiz
                id="ask-kas"
                title={<Trans>Say what they asked</Trans>}
                items={content.asked}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six reported correctly.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the person words in the ones you missed.</Trans>
                  ) : (
                    <Trans>Tap the sentences above once more, then try again.</Trans>
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
          id: "vat",
          title: t`The -vat form`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The <b lang="et">-vat</b> form passes on what is said about someone, usually
                    without saying who said it: <Word w="olevat" /> in{" "}
                    <b lang="et">Ta olevat haige.</b> He is said to be ill; they say he is ill.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Take the <b lang="et">-ma</b> form, drop <b lang="et">-ma</b> and add{" "}
                    <b lang="et">-vat</b>: <b lang="et">tulema</b> gives <Word w="tulevat" />. The
                    form is the same for every person, so you never change it for{" "}
                    <b lang="et">ma</b> or <b lang="et">nad</b>.
                  </Trans>
                </p>
              </Prose>
              <VatTable />
              <Aside>
                <Trans>
                  For no, put <b lang="et">ei</b> before it: <b lang="et">Ta ei tulevat homme.</b>{" "}
                  For the past, add the <b lang="et">-nud</b> form from lesson {perfect}:{" "}
                  <b lang="et">Ta olevat eile Tallinnas käinud.</b> He is said to have been in
                  Tallinn yesterday.
                </Trans>
              </Aside>
              <Aside>
                <Trans>
                  Spoken, <b lang="et">-vat</b> sounds almost the same as the <b lang="et">-vad</b>{" "}
                  of <b lang="et">nad tulevad</b>, they are coming. The subject tells you which:{" "}
                  <b lang="et">ta tulevat</b> or <b lang="et">nad tulevad</b>.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>Type the form for each verb.</Trans>
                </p>
              </Prose>
              <Quiz
                id="vat-forms"
                title={<Trans>Make the -vat form</Trans>}
                items={content.vatForms}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight forms right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the ones you missed against the table.</Trans>
                  ) : (
                    <Trans>Go through the table once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={pairRun}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "apart",
          title: t`Said by someone, or passed on?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Both can carry the same news, but they work differently.{" "}
                    <b lang="et">Mari ütles, et ta on haige</b> names who said it.{" "}
                    <b lang="et">Mari olevat haige</b> names no one: it passes on what is said, and
                    the speaker is usually not vouching for it.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    You will meet <b lang="et">-vat</b> mainly in news and reports, such as{" "}
                    <b lang="et">Kontsert algavat kell kuus.</b> In everyday talk people usually say
                    who said it, with <b lang="et">ütles, et</b>. Tap the pairs, then listen and
                    pick.
                  </Trans>
                </p>
              </Prose>
              <PairTable />
              <Quiz
                id="hear-said-vat"
                title={<Trans>Said, or passed on?</Trans>}
                items={content.heard}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight, told apart by ear.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you got wrong once more.</Trans>
                  ) : (
                    <Trans>Tap the pairs above once more, then try again.</Trans>
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
                  <Trans>
                    Write each sentence. Where the English says <i>reportedly</i>, use the{" "}
                    <b lang="et">-vat</b> form; otherwise report with <b lang="et">et</b> or{" "}
                    <b lang="et">kas</b>.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-reported"
                title={<Trans>Write it in Estonian</Trans>}
                items={content.written}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six written correctly.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check the link word and the form in the ones you missed.</Trans>
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
          title: t`Fix the sentence`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each sentence has one wrong word: a person that did not change, the wrong link
                    word, or a -vat form that does not exist. Tap it, then type it right.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="fix-reported"
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
          id: "library",
          title: t`News from the library`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Read a short news item about a library, as in the reading part of the B1 exam.
                    Notice which news comes from a named person and which only passes on what is
                    said.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="library-news"
                title={<Trans>What is happening to the library?</Trans>}
                by={t`From a local news site`}
                sentences={REP_DIARY}
                questions={content.library}
              />
            </>
          ),
        },
        {
          id: "friends",
          title: t`Two friends talk about a concert`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kalev and Liisa talk the day before a concert. Listen to them twice and answer
                    the questions.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="liisa-kalev"
                title={<Trans>Listen: Kalev and Liisa</Trans>}
                clip="c-liisa"
                turns={REP_CONVERSATION.turns}
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
