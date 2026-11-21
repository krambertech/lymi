import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  daForm,
  NO_NOW_OR_THEN,
  NO_PAST_DIALOGUE,
  NO_PAST_SUNDAY,
  NUD_BY_HEART,
  NUD_CHAINS,
  NUD_MATCH,
  nudForm,
  PAST_SI_ENDINGS,
  PAST_SI_VERBS,
  pastNo,
  presentWithPronoun,
  verbForms,
} from "../../../lib/learn/clips";
import { playSound } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Dialogue, type DialogueTurn } from "../Dialogue";
import { Chips, Panel } from "../Explore";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Match, type MatchPair } from "../Match";
import { Morph, type MorphChain } from "../Morph";
import { Paradigm, type ParadigmRow } from "../Paradigm";
import { Listening, type PassageQuestion } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "ma-ei-lainud";
const src = (text: string) => clipUrl(SLUG, clipId(text));

type SiVerb = (typeof PAST_SI_VERBS)[number];
type Pronoun = (typeof PAST_SI_ENDINGS)[number]["pronoun"];

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

const MEANS: Record<string, MessageDescriptor> = {
  elama: msg`to live`,
  lugema: msg`to read`,
  õppima: msg`to learn, to study`,
  rääkima: msg`to speak, to talk`,
  töötama: msg`to work`,
  ootama: msg`to wait`,
  olema: msg`to be`,
  tulema: msg`to come`,
  minema: msg`to go`,
  tegema: msg`to do, to make`,
  nägema: msg`to see`,
  sööma: msg`to eat`,
  jooma: msg`to drink`,
};

const PERSON_LABELS: Record<Pronoun, MessageDescriptor> = {
  ma: msg`I`,
  sa: msg`you`,
  ta: msg`he or she`,
  me: msg`we`,
  te: msg`you, to more than one; polite you`,
  nad: msg`they`,
};

const pastSaid = (pronoun: Pronoun, verb: SiVerb, ending: string) =>
  presentWithPronoun(pronoun, verb.past, ending);

function DidTable() {
  const { t, i18n } = useLingui();
  const [name, setName] = useState<SiVerb["verb"]>("lugema");
  const verb = PAST_SI_VERBS.find((each) => each.verb === name) as SiVerb;
  const nud = nudForm(verbForms(verb.verb));
  const rows: ParadigmRow[] = PAST_SI_ENDINGS.map((person) => ({
    id: person.pronoun,
    label: i18n._(PERSON_LABELS[person.pronoun]),
    et: person.pronoun,
    tip:
      person.pronoun === "ma" ? (
        <Trans>
          <End>sin</End> when it happened; no ending after <Et>ei</Et>.
        </Trans>
      ) : (
        <Trans>
          After <Et>ei</Et>, the same form as for every other person.
        </Trans>
      ),
    cells: [
      {
        form: `${verb.past}|${person.ending}`,
        src: clipUrl("lihtminevik", clipId(pastSaid(person.pronoun, verb, person.ending))),
      },
      {
        form: `ei ${nud.slice(0, -3)}|nud`,
        src: src(pastNo(person.pronoun, nud)),
      },
    ],
  }));
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Verbs`}
        items={PAST_SI_VERBS.map((each) => ({ label: each.verb, value: each.verb, lang: "et" }))}
        value={name}
        onPick={(value) => {
          setName(value);
          void playSound(clipUrl("lihtminevik", clipId(value)));
        }}
      />
      <p className="-mt-2 text-md text-ink-secondary">
        <span lang="et" className="font-medium text-ink">
          {verb.verb}
        </span>{" "}
        {i18n._(MEANS[name] as MessageDescriptor)}
      </p>
      <Paradigm
        key={name}
        label={t`Did and didn’t`}
        columns={[t`Did`, t`Didn’t`]}
        rows={rows}
        highlight={{ column: 1 }}
        empty={{
          title: t`Tap a form`,
          tip: t`You’ll hear it with its pronoun and see what changes.`,
        }}
      />
    </Panel>
  );
}

type Kind = "now" | "past";
type WhenItem = ChoiceItem & { said: string; pair: readonly [string, string] };

const KIND_LABELS: Record<Kind, MessageDescriptor> = { now: msg`Now`, past: msg`In the past` };

const kindOptions = (kinds: readonly Kind[], i18n: I18n) =>
  kinds.map((kind) => ({
    id: kind,
    label: <span lang={i18n.locale}>{i18n._(KIND_LABELS[kind])}</span>,
  }));

const WHEN_MEANS: Record<string, MessageDescriptor> = {
  "Ma ei loe.": msg`I don’t read; I’m not reading.`,
  "Ma ei lugenud.": msg`I didn’t read.`,
  "Sa ei räägi.": msg`You don’t speak; you aren’t speaking.`,
  "Sa ei rääkinud.": msg`You didn’t speak.`,
  "Ta ei tööta.": msg`He or she doesn’t work.`,
  "Ta ei töötanud.": msg`He or she didn’t work.`,
  "Me ei söö.": msg`We don’t eat; we aren’t eating.`,
  "Me ei söönud.": msg`We didn’t eat.`,
  "Ma ei tee.": msg`I don’t do it; I’m not doing it.`,
  "Ma ei teinud.": msg`I didn’t do it.`,
  "Ma ei joo.": msg`I don’t drink; I’m not drinking.`,
  "Ma ei joonud.": msg`I didn’t drink.`,
  "Ma ei oota.": msg`I don’t wait; I’m not waiting.`,
  "Ma ei oodanud.": msg`I didn’t wait.`,
};

export function whenItems(i18n: I18n): WhenItem[] {
  return NO_NOW_OR_THEN.flatMap((each, i) =>
    (["past", "now"] as const).map((kind, k) => {
      const said = each[kind];
      return {
        src: kind === "now" ? clipUrl("eitus", clipId(said)) : src(said),
        answer: kind,
        said,
        pair: [each.verb, `${each.verb}-${kind}`] as const,
        options: kindOptions((i + k) % 2 === 0 ? ["now", "past"] : ["past", "now"], i18n),
        explain: (
          <>
            <span lang="et" className="font-medium text-ink">
              {said}
            </span>{" "}
            {i18n._(WHEN_MEANS[said] as MessageDescriptor)}
          </>
        ),
      };
    }),
  );
}

const DA_NOTES: Record<string, ReactNode> = {
  lugema: (
    <Trans>
      <End>da</End> gives way to <End>nud</End>.
    </Trans>
  ),
  rääkima: (
    <Trans>
      <End>da</End> gives way to <End>nud</End>.
    </Trans>
  ),
  ootama: (
    <Trans>
      <End>ta</End> gives way to <End>nud</End>, and the d stays: <b lang="et">oodanud</b>.
    </Trans>
  ),
  olema: (
    <Trans>
      <End>la</End> gives way to <End>nud</End>.
    </Trans>
  ),
  tulema: (
    <Trans>
      <End>la</End> gives way to <End>nud</End>.
    </Trans>
  ),
};

const BY_HEART_NOTES: Record<string, ReactNode> = {
  minema: (
    <Trans>
      Not <Et>minnud</Et>: a different stem, as <b lang="et">läksin</b> has.
    </Trans>
  ),
  tegema: (
    <Trans>
      Not <Et>tehnud</Et>: the h becomes i.
    </Trans>
  ),
  nägema: (
    <Trans>
      Not <Et>nähnud</Et>: the h becomes i.
    </Trans>
  ),
  sööma: (
    <Trans>
      Not <Et>süünud</Et>: back to the <Et>öö</Et> of <b lang="et">sööma</b>.
    </Trans>
  ),
  jooma: (
    <Trans>
      Not <Et>juunud</Et>: back to the <Et>oo</Et> of <b lang="et">jooma</b>.
    </Trans>
  ),
};

const GLOSSARY: Glossary = {
  ei: { en: msg`not; no` },
  lugenud: {
    en: msg`(didn’t) read`,
    note: msg`Luge- from lugeda, then -nud: ma ei lugenud, I didn’t read.`,
  },
  "ma ei loe": {
    en: msg`I don’t read; I’m not reading.`,
    show: "Ma ei loe.",
    clip: clipId("Ma ei loe."),
  },
  "ma ei läinud": { en: msg`I didn’t go.`, show: "Ma ei läinud.", clip: clipId("Ma ei läinud.") },
  "nad ei läinud": {
    en: msg`They didn’t go.`,
    show: "Nad ei läinud.",
    clip: clipId("Nad ei läinud."),
  },
  lugema: { en: msg`to read` },
  lugeda: { en: msg`to read, the -da form`, note: msg`As in ma tahan lugeda, I want to read.` },
  oodata: { en: msg`to wait, the -da form`, note: msg`From ootama.` },
  olla: { en: msg`to be, the -da form`, note: msg`From olema.` },
  oodanud: { en: msg`(didn’t) wait` },
  olnud: { en: msg`(not) been`, note: msg`Ma ei olnud, I wasn’t.` },
  tulnud: { en: msg`(didn’t) come` },
  läinud: { en: msg`(didn’t) go`, note: msg`From minema: ma ei läinud, I didn’t go.` },
  teinud: { en: msg`(didn’t) do, make` },
  näinud: { en: msg`(didn’t) see` },
  söönud: { en: msg`(didn’t) eat` },
  joonud: { en: msg`(didn’t) drink` },
  käima: { en: msg`to go and come back; to visit` },
  käinud: {
    en: msg`(didn’t) go, visit`,
    note: msg`From käima, käia: ma ei käinud poes, I didn’t go to the shop.`,
  },
  polnud: { en: msg`wasn’t, weren’t`, note: msg`Short for ei olnud, as pole is short for ei ole.` },
  "ma ei olnud kodus": {
    en: msg`I wasn’t at home.`,
    show: "Ma ei olnud kodus.",
    clip: clipId("Ma ei olnud kodus."),
  },
  "ma polnud kodus": {
    en: msg`I wasn’t at home.`,
    show: "Ma polnud kodus.",
    clip: clipId("Ma polnud kodus."),
  },
  "mul ei olnud aega": {
    en: msg`I didn’t have time.`,
    show: "Mul ei olnud aega.",
    clip: clipId("Mul ei olnud aega."),
  },
  aega: { en: msg`time, after no: mul ei olnud aega`, note: msg`The partitive of aeg, time.` },
  miks: { en: msg`why` },
};

function useContent() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const chain = (ma: string, notes: Record<string, ReactNode>, nudNote?: ReactNode) => {
      const verb = verbForms(ma);
      const nud = nudForm(verb);
      return {
        id: ma,
        steps: [
          { word: ma, label: i18n._(MEANS[ma] as MessageDescriptor), src: src(ma) },
          {
            word: daForm(verb),
            label: (
              <Trans>
                the <End>da</End> form
              </Trans>
            ),
            src: src(daForm(verb)),
          },
          {
            word: nud,
            label: (
              <Trans>
                after <Et>ei</Et>
              </Trans>
            ),
            src: src(nud),
            note: nudNote ?? notes[ma],
          },
        ],
      } satisfies MorphChain;
    };
    const built: MorphChain[] = NUD_CHAINS.map((ma) => chain(ma, DA_NOTES));
    const byHeart: MorphChain[] = Object.keys(NUD_BY_HEART).map((ma) => chain(ma, BY_HEART_NOTES));

    const pairs: MatchPair[] = NUD_MATCH.map((ma) => {
      const nud = nudForm(verbForms(ma));
      return { id: ma, left: ma, right: nud, rightLang: "et", src: src(nud) };
    });

    const whenRun = (items: readonly WhenItem[], pinned?: WhenItem): WhenItem[] =>
      eachPairFirst(items, pinned).map((item) =>
        item === pinned ? item : { ...item, options: kindOptions(shuffle(["now", "past"]), i18n) },
      );

    const sunday: PassageQuestion[] = [
      {
        id: "work",
        ask: t`Did Mari go to work?`,
        options: [
          { id: "yes", label: t`Yes, in the morning` },
          { id: "no", label: t`No, she didn’t` },
          { id: "later", label: t`Yes, but late` },
        ],
        answer: "no",
        line: 1,
      },
      {
        id: "home",
        ask: t`What did she do at home?`,
        options: [
          { id: "read", label: t`She read a book` },
          { id: "worked", label: t`She worked` },
          { id: "cooked", label: t`She cooked for Jaan` },
        ],
        answer: "read",
        line: 2,
      },
      {
        id: "jaan",
        ask: t`Why didn’t Jaan come?`,
        options: [
          { id: "shop", label: t`He was at the shop` },
          { id: "tartu", label: t`He was in Tartu` },
          { id: "work", label: t`He was working` },
        ],
        answer: "work",
        line: 3,
      },
      {
        id: "ate",
        ask: t`Where did Mari eat?`,
        options: [
          { id: "home", label: t`At home` },
          { id: "cafe", label: t`At a café` },
          { id: "jaan", label: t`At Jaan’s` },
        ],
        answer: "cafe",
        line: 5,
      },
    ];

    const said = (clip: keyof typeof NO_PAST_DIALOGUE) => {
      const line = NO_PAST_DIALOGUE[clip];
      return typeof line === "string" ? line : line.text;
    };
    const talk: DialogueTurn[] = [
      { who: "them", clip: "d-kati-1", line: said("d-kati-1") },
      {
        who: "you",
        clip: "d-sina-1",
        replies: [
          {
            line: "Ei, ma ei käisin.",
            why: (
              <Trans>
                After <Et>ei</Et> the past has no <End>sin</End>: <Et>ma ei käinud</Et>.
              </Trans>
            ),
          },
          { line: said("d-sina-1"), right: true },
          {
            line: "Ei, ma ei käi.",
            why: (
              <Trans>
                <Et>Ma ei käi</Et> is now. Kati asked about yesterday.
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
          { line: said("d-sina-2"), right: true },
          {
            line: "Mul ei ole aega.",
            why: (
              <Trans>
                <Et>Ei ole</Et> is now. For yesterday, say <Et>ei olnud</Et>.
              </Trans>
            ),
          },
          {
            line: "Ma ei ole aega.",
            why: (
              <Trans>
                Having takes <Et>mul</Et>, and yesterday takes <Et>ei olnud</Et>:{" "}
                <Et>Mul ei olnud aega</Et>.
              </Trans>
            ),
          },
        ],
      },
      { who: "them", clip: "d-kati-3", line: said("d-kati-3") },
      {
        who: "you",
        clip: "d-sina-3",
        replies: [
          {
            line: "Jah, ma nägin Marit.",
            why: t`You didn’t see Mari yesterday, so the answer is no.`,
          },
          {
            line: "Ei, ma ei nägin Marit.",
            why: (
              <Trans>
                After <Et>ei</Et> the past has no <End>in</End>: <Et>ma ei näinud</Et>.
              </Trans>
            ),
          },
          { line: said("d-sina-3"), right: true },
        ],
      },
    ];

    return {
      built,
      byHeart,
      pairs,
      when: whenItems(i18n),
      whenRun,
      sunday,
      talk,
    };
  }, [t, i18n]);
}

export function MaEiLainudLesson() {
  const { t } = useLingui();
  const content = useContent();
  const negation = lessonBySlug("eitus")?.n;
  const forms = lessonBySlug("verbi-pohivormid")?.n;
  const past = lessonBySlug("lihtminevik")?.n;
  const mulOn = lessonBySlug("mul-on")?.n;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Say <Et>ei</Et> and the verb’s <End>nud</End> form, the same for every person:{" "}
          <Et>ma ei läinud, nad ei läinud</Et>.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">4 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "ei",
        "lugenud",
        "olnud",
        "tulnud",
        "oodanud",
        "läinud",
        "teinud",
        "näinud",
        "söönud",
        "joonud",
        "käinud",
        "polnud",
        "mul ei olnud aega",
      ]}
      recap={[
        <Trans key="1">
          To say something didn’t happen, use <Et>ei</Et> and the <End>nud</End> form:{" "}
          <b lang="et">ma ei lugenud</b>, I didn’t read.
        </Trans>,
        <Trans key="2">
          The <End>nud</End> form is the same for every person:{" "}
          <b lang="et">ma ei läinud, nad ei läinud</b>. The past’s endings, such as <End>sin</End>,
          never follow <Et>ei</Et>.
        </Trans>,
        <Trans key="3">
          Build it from the <End>da</End> form: its ending gives way to <End>nud</End>.{" "}
          <b lang="et">lugeda, lugenud</b>; <b lang="et">oodata, oodanud</b>;{" "}
          <b lang="et">olla, olnud</b>.
        </Trans>,
        <Trans key="4">
          Learn five by heart: <b lang="et">läinud, teinud, näinud, söönud, joonud</b>.
        </Trans>,
        <Trans key="5">
          <b lang="et">Ei loe</b> is now, <b lang="et">ei lugenud</b> the past.{" "}
          <b lang="et">Ei olnud</b>, or <b lang="et">polnud</b>, is wasn’t.
        </Trans>,
      ]}
      sections={[
        {
          id: "didnt",
          title: t`Didn’t, for every person`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {negation} you said no in the present with <Word w="ei" /> and the
                    verb without its ending:{" "}
                    <Nowrap>
                      <Word w="Ma ei loe" />.
                    </Nowrap>{" "}
                    In lesson {past} you said what happened: <b lang="et">ma lugesin</b>, I read.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    To say it didn’t happen, keep <Et>ei</Et> and change the verb to its{" "}
                    <End>nud</End> form:{" "}
                    <Nowrap>
                      <Word w="lugenud" />.
                    </Nowrap>{" "}
                    The <End>nud</End> form never changes for the person: <Word w="Ma ei läinud" />,{" "}
                    <Word w="Nad ei läinud" />. English does the same with didn’t: I didn’t go, they
                    didn’t go.
                  </Trans>
                </p>
                <p>
                  <Trans>Pick a verb and tap a form in each column.</Trans>
                </p>
              </Prose>
              <DidTable />
              <Aside>
                <Trans>
                  The past’s endings, such as <End>sin</End> and <End>sid</End>, never come after{" "}
                  <Et>ei</Et>. <Et>Ma ei lugesin</Et> is a common slip.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "when",
          title: t`Now or in the past`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence with <Et>ei</Et> and pick whether it’s about now or the past.
                    Listen to the end of the verb: <b lang="et">ei loe</b> is now,{" "}
                    <b lang="et">ei lugenud</b> the past.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="no-now-or-past"
                title={<Trans>Now or in the past?</Trans>}
                items={content.when}
                rounds={7}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All seven. You heard -nud every time it was there.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the forms in the table once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={content.whenRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "build",
          title: t`Building the -nud form`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Lesson {forms} gave each verb a <End>da</End> form, as in <Word w="lugeda" />.
                    The <End>nud</End> form comes from it: take off the <End>da</End> and put{" "}
                    <End>nud</End> in its place. <Et>Lugeda</Et> gives <Et>lugenud</Et>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The same works when the <End>da</End> form ends in <End>ta</End> or{" "}
                    <End>la</End>: <Word w="oodata" />, <Word w="oodanud" />; <Word w="olla" />,{" "}
                    <Nowrap>
                      <Word w="olnud" />.
                    </Nowrap>{" "}
                    Pick a verb and tap its three forms in turn.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Morph label={t`Verbs`} chains={content.built} />
              </Panel>
            </>
          ),
        },
        {
          id: "by-heart",
          title: t`Five to learn by heart`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Five everyday verbs break the rule. They are among the verbs whose past forms
                    you learned one at a time: <Word w="läinud" />, <Word w="teinud" />,{" "}
                    <Word w="näinud" />, <Word w="söönud" />,{" "}
                    <Nowrap>
                      <Word w="joonud" />.
                    </Nowrap>{" "}
                    Tap each form to hear it and see what the rule would have given.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Morph label={t`Verbs`} chains={content.byHeart} />
              </Panel>
              <Prose>
                <p>
                  <Trans>Match each verb to its -nud form. Some follow the rule, some don’t.</Trans>
                </p>
              </Prose>
              <Match
                id="nud-forms"
                title={<Trans>Which -nud form?</Trans>}
                pairs={content.pairs}
                columns={[<Trans key="v">Verb</Trans>, <Trans key="n">Didn’t</Trans>]}
              />
            </>
          ),
        },
        {
          id: "sunday",
          title: t`Mari’s Sunday`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    With <Et>ei</Et>, <Word w="olnud" /> says what wasn’t:{" "}
                    <Nowrap>
                      <Word w="Ma ei olnud kodus" />.
                    </Nowrap>{" "}
                    People often shorten <Et>ei olnud</Et> to <Word w="polnud" />, as they shorten{" "}
                    <Et>ei ole</Et> to <Et>pole</Et>. With the <Et>mul on</Et> of lesson {mulOn}, it
                    says what you didn’t have:{" "}
                    <Nowrap>
                      <Word w="Mul ei olnud aega" />.
                    </Nowrap>
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Yesterday was Sunday. Listen to what Mari did and didn’t do, then answer.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="mari-sunday"
                title={<Trans>Listen: Mari’s Sunday</Trans>}
                clip="p-sunday"
                sentences={NO_PAST_SUNDAY}
                questions={content.sunday}
              />
            </>
          ),
        },
        {
          id: "talk",
          title: t`Saying what you didn’t do`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati asks about yesterday, and the answer is no each time. Pick what you say
                    back. If you pick a wrong reply, you see why, then hear the right one.
                  </Trans>
                </p>
              </Prose>
              <Dialogue
                id="didnt-talk"
                title={<Trans>Talk: what you didn’t do</Trans>}
                part={
                  <Trans>
                    Yesterday you were busy: you didn’t go to the shop and didn’t see Mari. Kati
                    speaks first.
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
