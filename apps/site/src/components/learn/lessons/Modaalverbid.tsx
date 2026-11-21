import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  type DutyLead,
  dutySentence,
  type HeardKind,
  type HeardVerb,
  MODAL_DIALOGUE,
  MODAL_DUTIES,
  MODAL_HEARD_KINDS,
  MODAL_HEARD_VERBS,
  MODAL_NOT,
  MODAL_PERMISSION,
  MODAL_REASONS,
  MODAL_SKILLS,
  notSaid,
  type SkillLead,
  skillSentence,
} from "../../../lib/learn/clips";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Keys, Panel } from "../Explore";
import { Aside, LessonView, Prose } from "../LessonView";
import type { Glossary } from "../lesson-context";
import { Match, type MatchPair } from "../Match";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "modaalverbid";
/** A clip by what it says. */
const src = (text: string) => clipUrl(SLUG, clipId(text));

/** What each sentence the lesson plays means, by what it says. */
const MEANS: Record<string, MessageDescriptor> = {
  "Ma oskan ujuda.": msg`I can swim: I know how.`,
  "Ma saan ujuda.": msg`I can swim: nothing stops me.`,
  "Ma oskan lugeda.": msg`I can read: I know how.`,
  "Ma saan lugeda.": msg`I can read: nothing stops me.`,
  "Ma oskan eesti keelt.": msg`I know Estonian.`,
  "Ma saan homme tulla.": msg`I can come tomorrow.`,
  "Ma võin sind oodata.": msg`I can wait for you.`,
  "Sa võid siin istuda.": msg`You can sit here.`,
  "Kas ma tohin siin istuda?": msg`May I sit here?`,
  "Siin ei tohi süüa.": msg`No eating here.`,
  "Ta võib homme tulla.": msg`He or she may come tomorrow.`,
  "Ma pean minema.": msg`I have to go.`,
  "Ma pean ootama.": msg`I have to wait.`,
  "Ma pean töötama.": msg`I have to work.`,
  "Tuleb minna.": msg`One has to go.`,
  "Tuleb oodata.": msg`One has to wait.`,
  "Tuleb töötada.": msg`One has to work.`,
  "Mul tuleb oodata.": msg`I’ll have to wait.`,
  "Mul on vaja minna.": msg`I need to go.`,
  "Mul on vaja oodata.": msg`I need to wait.`,
  "Mul on vaja töötada.": msg`I need to work.`,
  "Ta ei oska ujuda.": msg`He or she can’t swim: never learned.`,
  "Ta ei saa täna ujuda.": msg`He or she can’t swim today: something is in the way.`,
  "Ta tuleb ujuma.": msg`He or she is coming to swim.`,
  "Tuleb ujuda.": msg`One has to swim.`,
  "Siin ei tohi ujuda.": msg`No swimming here.`,
  "Sa ei pea ujuma.": msg`You don’t have to swim.`,
  "Sul pole vaja ujuda.": msg`There’s no need for you to swim.`,
  "Sa ei pea tulema.": msg`You don’t have to come.`,
  "Sa ei tohi tulla.": msg`You mustn’t come.`,
};

/** What each verb of the oskan-and-saan table means. */
const SKILL_MEANS: Record<(typeof MODAL_SKILLS)[number]["ma"], MessageDescriptor> = {
  ujuma: msg`to swim`,
  lugema: msg`to read`,
};

/** What each verb of the have-to table means. */
const DUTY_MEANS: Record<(typeof MODAL_DUTIES)[number]["ma"], MessageDescriptor> = {
  "mine|ma": msg`to go`,
  "oota|ma": msg`to wait`,
  "tööta|ma": msg`to work`,
};

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    Object.entries(MEANS).map(([said, en]) => [said.toLowerCase(), { en, show: said }]),
  ),
  oskan: { en: msg`I can, I know how to`, note: msg`From oskama.` },
  saan: { en: msg`I can, I’m able to`, note: msg`From saama, which also means to get.` },
  võin: { en: msg`I may, I can`, note: msg`From võima.` },
  võib: { en: msg`may, might`, note: msg`The ta form of võima.` },
  tohin: { en: msg`I’m allowed to`, note: msg`From tohtima.` },
  pean: {
    en: msg({ message: "I have to, I must", context: "modal verbs lesson: pean" }),
    note: msg`From pidama.`,
  },
  tuleb: {
    en: msg`has to be done; comes`,
    note: msg`From tulema, to come. Before a -da form it means has to.`,
  },
  vaja: { en: msg`needed`, note: msg`Mul on vaja is I need.` },
  "mul on vaja": { en: msg`I need` },
  ujuma: { en: msg`to swim`, note: msg`Its -da form is ujuda.` },
  siin: { en: msg`here`, note: msg`Where something is. For where it goes, say siia.` },
  "ei tohi": { en: msg`mustn’t, not allowed to` },
  "ei pea": { en: msg`don’t have to` },
  "pole vaja": { en: msg`no need`, note: msg`Pole is ei ole.` },
};

/** An Estonian ending in running text: read in Estonian, never split after its hyphen. */
function End({ children }: { children: ReactNode }) {
  return (
    <span lang="et" className="whitespace-nowrap">
      {children}
    </span>
  );
}

/** A sentence and what it means, as a detail line or an explanation shows it. */
function Said({ said }: { said: string }) {
  const { i18n } = useLingui();
  return (
    <>
      <span lang="et">{said}</span>{" "}
      <small className="ms-1 text-md font-normal text-ink-secondary">
        {i18n._(MEANS[said] as MessageDescriptor)}
      </small>
    </>
  );
}

/** The line under the oskan-and-saan table, by its column. */
function SkillNote({ lead }: { lead: SkillLead }) {
  return lead === "oskan" ? (
    <Trans>
      <span lang="et">Oskan</span>: you learned how.
    </Trans>
  ) : (
    <Trans>
      <span lang="et">Saan</span>: nothing stops you, not time, place or health.
    </Trans>
  );
}

/** The same three skills after oskan and after saan; a tap plays the whole sentence. */
function KnowOrAble() {
  const { t, i18n } = useLingui();
  const leads = ["oskan", "saan"] as const;
  const rows: ParadigmRow[] = MODAL_SKILLS.map((skill) => ({
    id: skill.ma,
    label: i18n._(SKILL_MEANS[skill.ma]),
    et: skill.ma,
    cells: leads.map((lead) => ({
      form: `${lead} ${skill.da}`,
      src: src(skillSentence(lead, skill)),
      note: <SkillNote lead={lead} />,
    })),
  }));
  return (
    <Panel>
      <Paradigm
        label={t`Can: you know how, or nothing stops you`}
        columns={[t`I know how to …`, t`I’m able to …`]}
        rows={rows}
        empty={{ title: t`Tap a form`, tip: t`You’ll hear the whole sentence.` }}
      />
    </Panel>
  );
}

/** A key shows the verb; a negative's ei or pole sits under it, so the key stays short on a phone. */
const keyLabel = (lead: string) => lead.replace(/^(ei|pole) /, "");

/** The line under a may-or-allowed key. */
function PermissionTip({ lead }: { lead: (typeof MODAL_PERMISSION)[number]["lead"] }) {
  switch (lead) {
    case "võin":
      return <Trans>An offer: you’re happy to.</Trans>;
    case "võid":
      return (
        <Trans>
          The <span lang="et">sa</span> form of <span lang="et">võima</span>: you let someone.
        </Trans>
      );
    case "tohin":
      return <Trans>A question: you ask whether you’re allowed.</Trans>;
    case "ei tohi":
      return <Trans>A rule. With no person, it holds for everyone.</Trans>;
  }
}

/** Keys for may and allowed: each plays its sentence. */
function MayOrAllowed() {
  const { t } = useLingui();
  return (
    <Panel>
      <Keys
        label={t`May and allowed to`}
        columns={4}
        phoneColumns={2}
        empty={{
          title: <Trans>Tap one</Trans>,
          tip: <Trans>You’ll hear it in a sentence.</Trans>,
        }}
        items={MODAL_PERMISSION.map(({ lead, said }) => ({
          label: keyLabel(lead),
          sub: lead.includes(" ") ? lead : undefined,
          src: src(said),
          detail: { title: <Said said={said} />, tip: <PermissionTip lead={lead} /> },
        }))}
      />
    </Panel>
  );
}

/** The line under the have-to table, by its column. */
function DutyNote({ lead }: { lead: DutyLead }) {
  switch (lead) {
    case "pean":
      return <Trans>I have to: it’s on me.</Trans>;
    case "tuleb":
      return <Trans>It has to be done, and no one is named.</Trans>;
    case "vaja":
      return <Trans>I need to: there’s a need.</Trans>;
  }
}

/** The have-to rows: what each lead means, and the lead as Estonian says it. */
const DUTY_LEADS = [
  { lead: "pean", et: "pean", means: msg`I have to …` },
  { lead: "tuleb", et: "tuleb", means: msg`One has to …` },
  { lead: "vaja", et: "mul on vaja", means: msg`I need to …` },
] as const satisfies readonly { lead: DutyLead; et: string; means: MessageDescriptor }[];

/** Three verbs after pean, tuleb and mul on vaja, a row each; a tap plays the whole sentence. */
function HaveTo() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = DUTY_LEADS.map(({ lead, et, means }) => ({
    id: lead,
    label: i18n._(means),
    et,
    cells: MODAL_DUTIES.map((duty) => ({
      form: lead === "pean" ? duty.ma : duty.da,
      src: src(dutySentence(lead, duty)),
      note: <DutyNote lead={lead} />,
    })),
  }));
  return (
    <Panel>
      <Paradigm
        label={t`Three ways to say have to`}
        columns={MODAL_DUTIES.map((duty) => i18n._(DUTY_MEANS[duty.ma]))}
        rows={rows}
        empty={{ title: t`Tap a form`, tip: t`You’ll hear the whole sentence.` }}
      />
    </Panel>
  );
}

/** The line under a can’t-or-mustn’t key. */
function NotTip({ lead }: { lead: (typeof MODAL_NOT)[number]["lead"] }) {
  switch (lead) {
    case "ei oska":
      return <Trans>Never learned.</Trans>;
    case "ei saa":
      return <Trans>Something is in the way.</Trans>;
    case "ei tohi":
      return <Trans>It isn’t allowed.</Trans>;
    case "ei pea":
      return <Trans>It’s up to you.</Trans>;
    case "pole vaja":
      return (
        <Trans>
          Like <span lang="et">mul on vaja</span>: the person in the <End>-l</End> form, then the{" "}
          <End>-da</End> form. It means the same as <span lang="et">ei pea</span>.
        </Trans>
      );
  }
}

/** Keys for can’t, mustn’t and don’t have to, each said about swimming. */
function CantOrMustnt() {
  const { t } = useLingui();
  return (
    <Panel>
      <Keys
        label={t`Can’t, mustn’t, don’t have to`}
        columns={3}
        phoneColumns={2}
        empty={{
          title: <Trans>Tap one</Trans>,
          tip: <Trans>You’ll hear it said about swimming.</Trans>,
        }}
        items={MODAL_NOT.map(({ lead, said }) => ({
          label: keyLabel(lead),
          sub: lead.includes(" ") ? lead : undefined,
          src: src(said),
          detail: { title: <Said said={said} />, tip: <NotTip lead={lead} /> },
        }))}
      />
    </Panel>
  );
}

/** What each sentence of “What does it say?” means, by its way and its verb. */
const HEARD_MEANS: Record<HeardKind, Record<HeardVerb["da"], MessageDescriptor>> = {
  oska: { ujuda: msg`I never learned to swim.`, lugeda: msg`I never learned to read.` },
  saa: { ujuda: msg`Something stops me swimming.`, lugeda: msg`Something stops me reading.` },
  tohi: { ujuda: msg`I’m not allowed to swim.`, lugeda: msg`I’m not allowed to read.` },
  pea: { ujuda: msg`I don’t have to swim.`, lugeda: msg`I don’t have to read.` },
};

function HeardMeaning({ kind, verb }: { kind: HeardKind; verb: HeardVerb }) {
  const { i18n } = useLingui();
  return <span lang={i18n.locale}>{i18n._(HEARD_MEANS[kind][verb.da])}</span>;
}

/** The answer and two other ways at random, in random order. */
export function threeKinds(answer: HeardKind): HeardKind[] {
  const others = MODAL_HEARD_KINDS.filter((kind) => kind !== answer);
  return shuffle([answer, ...shuffle(others).slice(0, 2)]);
}

/** The first round’s options, fixed so the page renders the same on the server. */
export function firstKinds(answer: HeardKind, i: number): HeardKind[] {
  const others = MODAL_HEARD_KINDS.filter((kind) => kind !== answer);
  const two = [others[i % 3], others[(i + 1) % 3]] as HeardKind[];
  const at = i % 3;
  return [...two.slice(0, at), answer, ...two.slice(at)];
}

/** “What does it say?”: each way heard with both verbs, keyed by the way. */
export const HEARD = [
  { kind: "saa", verb: MODAL_HEARD_VERBS[1] },
  { kind: "oska", verb: MODAL_HEARD_VERBS[0] },
  { kind: "pea", verb: MODAL_HEARD_VERBS[1] },
  { kind: "tohi", verb: MODAL_HEARD_VERBS[0] },
  { kind: "oska", verb: MODAL_HEARD_VERBS[1] },
  { kind: "saa", verb: MODAL_HEARD_VERBS[0] },
  { kind: "tohi", verb: MODAL_HEARD_VERBS[1] },
  { kind: "pea", verb: MODAL_HEARD_VERBS[0] },
] as const satisfies readonly { kind: HeardKind; verb: HeardVerb }[];

type HeardItem = ChoiceItem & {
  said: string;
  verb: HeardVerb;
  pair: readonly [string, string];
};

const kindOptions = (verb: HeardVerb, kinds: readonly HeardKind[]) =>
  kinds.map((kind) => ({ id: kind, label: <HeardMeaning kind={kind} verb={verb} /> }));

/** After an answer: the sentence and what it means. */
function HeardExplain({ kind, verb }: { kind: HeardKind; verb: HeardVerb }) {
  return (
    <>
      <span lang="et" className="font-medium text-ink">
        {notSaid(kind, verb)}
      </span>{" "}
      <HeardMeaning kind={kind} verb={verb} />
    </>
  );
}

const HEARD_ITEMS: HeardItem[] = HEARD.map(({ kind, verb }, i) => {
  const said = notSaid(kind, verb);
  return {
    said,
    verb,
    pair: [kind, said] as const,
    src: src(said),
    answer: kind,
    options: kindOptions(verb, firstKinds(kind, i)),
    explain: <HeardExplain kind={kind} verb={verb} />,
  };
});

/** Every round but the first draws its wrong meanings afresh, so no set of options names the answer. */
export const heardRun = (items: readonly HeardItem[], pinned?: HeardItem): HeardItem[] =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned
      ? item
      : { ...item, options: kindOptions(item.verb, threeKinds(item.answer as HeardKind)) },
  );

/** Why each sentence of “Why this verb?” takes its verb. */
const REASONS: Record<(typeof MODAL_REASONS)[number], MessageDescriptor> = {
  "Ma oskan ujuda.": msg`I learned as a child.`,
  "Ma saan homme tulla.": msg`I’m free.`,
  "Sa võid siin istuda.": msg`It’s fine by me.`,
  "Kas ma tohin siin istuda?": msg`I’m asking first.`,
  "Tuleb oodata.": msg`That goes for everyone.`,
  "Mul on vaja minna.": msg`I’m late for work.`,
};

const dialogueLine = (id: keyof typeof MODAL_DIALOGUE) => {
  const clip = MODAL_DIALOGUE[id];
  return typeof clip === "string" ? clip : clip.text;
};

export function ModaalverbidLesson() {
  const { t, i18n } = useLingui();
  const infinitives = lessonBySlug("tegevusnimed")?.n;
  const having = lessonBySlug("mul-on")?.n;
  const negation = lessonBySlug("eitus")?.n;

  const reasons: MatchPair[] = MODAL_REASONS.map((said) => ({
    id: clipId(said),
    left: said,
    right: i18n._(REASONS[said]),
    rightLang: i18n.locale,
    src: src(said),
  }));

  const dialogue: DialogueTurn[] = [
    { who: "them", clip: "d-mari-1", line: dialogueLine("d-mari-1") },
    {
      who: "you",
      clip: "d-sina-1",
      replies: [
        {
          line: "Ei, ma ei oska.",
          why: (
            <Trans>
              <span lang="et">Ei oska</span> says you never learned. You learned as a child.
            </Trans>
          ),
        },
        { line: dialogueLine("d-sina-1"), right: true },
        {
          line: "Ei, ma ei saa.",
          why: (
            <Trans>
              <span lang="et">Ei saa</span> says something stops you. She asked whether you know
              how.
            </Trans>
          ),
        },
      ],
    },
    { who: "them", clip: "d-mari-2", line: dialogueLine("d-mari-2") },
    {
      who: "you",
      clip: "d-sina-2",
      replies: [
        {
          line: "Jah, ma pean tulema.",
          why: (
            <Trans>
              <span lang="et">Pean</span> says you have to come. Nobody makes you; you’re free.
            </Trans>
          ),
        },
        {
          line: "Ei, ma ei tohi ujuda.",
          why: (
            <Trans>
              <span lang="et">Ei tohi</span> says you’re not allowed to swim. Nothing stops you
              today.
            </Trans>
          ),
        },
        { line: dialogueLine("d-sina-2"), right: true },
      ],
    },
    { who: "them", clip: "d-mari-3", line: dialogueLine("d-mari-3") },
    {
      who: "you",
      clip: "d-sina-3",
      replies: [
        { line: dialogueLine("d-sina-3"), right: true },
        {
          line: "Ei, ma ei pea homme töötama.",
          why: (
            <Trans>
              <span lang="et">Ei pea</span> says you don’t have to work. You do work tomorrow.
            </Trans>
          ),
        },
        { line: "Jah, ma võin homme tulla.", why: t`You work tomorrow, so you can’t come.` },
      ],
    },
  ];

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Where English says can, Estonian picks the verb by the reason.{" "}
          <span lang="et">Oskan</span> is when you know how, <span lang="et">saan</span> when
          nothing stops you, and <span lang="et">võin</span> when it’s allowed or you offer. Must is{" "}
          <span lang="et">pean</span>, and mustn’t is <span lang="et">ei tohi</span>.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">A quiz, pairs to match and a conversation</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "oskan",
        "saan",
        "võin",
        "tohin",
        "pean",
        "tuleb",
        "vaja",
        "ei tohi",
        "ei pea",
        "pole vaja",
        "ujuma",
        "siin",
      ]}
      recap={[
        <Trans key="1">
          <b lang="et">Oskan</b> is for what you learned: <b lang="et">Ma oskan ujuda.</b>{" "}
          <b lang="et">Saan</b> says nothing stops you: <b lang="et">Ma saan homme tulla.</b>
        </Trans>,
        <Trans key="2">
          <b lang="et">Võin</b> and <b lang="et">tohin</b> both say it’s allowed;{" "}
          <b lang="et">võin</b> also offers: <b lang="et">Ma võin sind oodata.</b>{" "}
          <b lang="et">Tohin</b> is mostly heard with <b lang="et">ei</b>:{" "}
          <b lang="et">Siin ei tohi süüa.</b>
        </Trans>,
        <Trans key="3">
          <b lang="et">Pean</b> is I have to. <b lang="et">Tuleb</b> with the <End>-da</End> form
          says it has to be done, naming no one. <b lang="et">Mul on vaja</b> is I need to.
        </Trans>,
        <Trans key="4">
          <b lang="et">Ei pea</b> is don’t have to, and <b lang="et">ei tohi</b> is mustn’t:{" "}
          <b lang="et">Sa ei pea tulema. Sa ei tohi tulla.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "oskan-saan",
          title: t`Can: you know how, or nothing stops you`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Oskan" /> is for what you learned. To say you know how to swim:{" "}
                    <Word w="Ma oskan ujuda." /> <Word w="Saan" /> says nothing stops you:{" "}
                    <Word w="Ma saan homme tulla." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    English says I can for both. Both take the <End>-da</End> form, as lesson{" "}
                    {infinitives} showed. Tap a form to hear its sentence.
                  </Trans>
                </p>
              </Prose>
              <KnowOrAble />
              <Aside>
                <Trans>
                  With a language, <Word w="oskan" /> needs no second verb:{" "}
                  <Word w="Ma oskan eesti keelt." />
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "voin-tohin",
          title: t`May and allowed to`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Võin" /> says something is allowed, and you also offer with it:{" "}
                    <Word w="Ma võin sind oodata." /> To let someone do something:{" "}
                    <Word w="Sa võid siin istuda." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Tohin" /> is about being allowed. With <b lang="et">ei</b> it says
                    mustn’t: <Word w="Siin ei tohi süüa." /> In a question it asks whether you may,
                    as <Word w="võin" /> does too: <Word w="Kas ma tohin siin istuda?" /> Tap one to
                    hear its sentence.
                  </Trans>
                </p>
              </Prose>
              <MayOrAllowed />
              <Aside>
                <Trans>
                  <Word w="Võib" /> can also say that something might happen. This sentence can mean
                  he or she is allowed to come tomorrow, or might: <Word w="Ta võib homme tulla." />
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "pean",
          title: t`Have to and need to`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Pean" /> is I have to, and it takes the <End>-ma</End> form from lesson{" "}
                    {infinitives}: <Word w="Ma pean minema." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Tuleb" /> with the <End>-da</End> form says something has to be done,
                    without naming who: <Word w="Tuleb oodata." /> Put a person in the <End>-l</End>{" "}
                    form from lesson {having} to make it theirs: <Word w="Mul tuleb oodata." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Mul on vaja" />, I need, takes the <End>-da</End> form of a verb:{" "}
                    <Word w="Mul on vaja minna." /> Tap a form to hear its sentence.
                  </Trans>
                </p>
              </Prose>
              <HaveTo />
              <Aside>
                <Trans>
                  With the <End>-ma</End> form, <Word w="tuleb" /> still means comes:{" "}
                  <Word w="Ta tuleb ujuma." /> Only with the <End>-da</End> form does it mean has
                  to: <Word w="Tuleb ujuda." />
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "not",
          title: t`Can’t, mustn’t, don’t have to`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Put <b lang="et">ei</b> before the verb and drop its ending, as in lesson{" "}
                    {negation}: <b lang="et">oskan</b> becomes <b lang="et">ei oska</b>.{" "}
                    <b lang="et">Oskan</b> and <b lang="et">saan</b> stay different with{" "}
                    <b lang="et">ei</b> too. Never learned: <Word w="Ta ei oska ujuda." /> Something
                    is in the way today: <Word w="Ta ei saa täna ujuda." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Pean" /> is must, but <b lang="et">ei pea</b> is don’t have to:{" "}
                    <Word w="Sa ei pea tulema." /> For mustn’t, Estonian switches to{" "}
                    <b lang="et">ei tohi</b>: <Word w="Sa ei tohi tulla." /> <Word w="Pole vaja" />,
                    no need, also leaves it to you. Tap one to hear it said about swimming.
                  </Trans>
                </p>
              </Prose>
              <CantOrMustnt />
              <Prose>
                <p>
                  <Trans>Listen to each sentence and pick what it means.</Trans>
                </p>
              </Prose>
              <Quiz
                id="what-it-says"
                title={<Trans>What does it say?</Trans>}
                items={HEARD_ITEMS}
                rounds={MODAL_HEARD_KINDS.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All four. By ear, you told apart “don’t know how”, “can’t”, “mustn’t” and
                      “don’t have to”.
                    </Trans>
                  ) : (
                    <Trans>Play the ones you missed once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={heardRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "which",
          title: t`Which verb, and why`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    The reason behind a sentence picks its verb. Match each sentence with its
                    reason. A right pair plays the sentence.
                  </Trans>
                </p>
              </Prose>
              <Match
                id="why-this-verb"
                title={<Trans>Why this verb?</Trans>}
                pairs={reasons}
                columns={[<Trans key="s">Sentence</Trans>, <Trans key="r">Reason</Trans>]}
              />
            </>
          ),
        },
        {
          id: "plans",
          title: t`Plans with Mari`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari asks about swimming. Pick each reply by what it says about you.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="plans-with-mari"
                title={<Trans>Swimming plans</Trans>}
                part={
                  <Trans>
                    You learned to swim as a child. You’re free today and work tomorrow.
                  </Trans>
                }
                them={t`Mari`}
                turns={dialogue}
              />
            </>
          ),
        },
      ]}
    />
  );
}
