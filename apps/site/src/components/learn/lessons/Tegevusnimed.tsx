import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { LESSONS, lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  INFINITIVE_LEADS,
  INFINITIVE_ORDER,
  INFINITIVE_PAIRS,
  type InfinitiveLead,
  type Takes,
  wantOrMust,
} from "../../../lib/learn/clips";
import { formText } from "../../../lib/learn/forms";
import { shuffle } from "../../../lib/learn/quiz";
import { Keys, ListenRows, Panel } from "../Explore";
import { type GapItem, GapPassage } from "../GapPassage";
import { Aside, LessonView, Prose } from "../LessonView";
import type { Glossary } from "../lesson-context";
import { Lit, Paradigm, type ParadigmRow } from "../Paradigm";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "tegevusnimed";
/** A clip by what it says. */
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Lead = InfinitiveLead["lead"];
type Pair = (typeof INFINITIVE_PAIRS)[number];

/** What each sentence of the verb keys says. */
const SAID_MEANS: Record<InfinitiveLead["said"], MessageDescriptor> = {
  "Ma tahan süüa.": msg`I want to eat.`,
  "Ma võin sind oodata.": msg`I can wait for you.`,
  "Ma saan homme tulla.": msg`I can come tomorrow.`,
  "Ma oskan natuke eesti keelt rääkida.": msg`I can speak a little Estonian.`,
  "Ma tohin kodus töötada.": msg`I’m allowed to work from home.`,
  "Ma proovin eesti keelt õppida.": msg`I’m trying to learn Estonian.`,
  "Ma armastan lugeda.": msg`I love reading.`,
  "Mulle meeldib kohvi juua.": msg`I like drinking coffee.`,
  "Ma pean minema.": msg`I have to go.`,
  "Ma hakkan eesti keelt õppima.": msg`I’m starting to learn Estonian.`,
  "Ma lähen kohvi jooma.": msg`I’m going for a coffee.`,
  "Tule sööma!": msg`Come and eat.`,
  "Ma jään koju lugema.": msg`I’m staying home to read.`,
};

/** What each verb a second verb follows means, by the form the lesson shows it in. */
const LEAD_MEANS: Record<Lead, MessageDescriptor> = {
  tahan: msg`I want`,
  võin: msg`I may, I can`,
  saan: msg`I can, I get to`,
  oskan: msg`I can, I know how to`,
  tohin: msg`I’m allowed to`,
  proovin: msg`I try`,
  armastan: msg`I love`,
  "mulle meeldib": msg`I like`,
  pean: msg`I have to, I must`,
  hakkan: msg`I start`,
  lähen: msg`I go, I’m going`,
  tule: msg`come`,
  jään: msg`I stay`,
};

/** What each verb of the tahan-and-pean table means, by its -ma form. */
const PAIR_MEANS: Record<Pair["ma"], MessageDescriptor> = {
  "luge|ma": msg`to read`,
  "söö|ma": msg`to eat`,
  "mine|ma": msg`to go`,
  "tule|ma": msg`to come`,
  "õppi|ma": msg`to learn, to study`,
  "tööta|ma": msg`to work`,
};

const leadOf = (lead: Lead) =>
  INFINITIVE_LEADS.find((each) => each.lead === lead) as InfinitiveLead;

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    INFINITIVE_LEADS.flatMap(({ lead, said }) => [
      [lead, { en: LEAD_MEANS[lead] }],
      [said.toLowerCase(), { en: SAID_MEANS[said], show: said }],
    ]),
  ),
  tahan: { en: msg`I want`, note: msg`From tahtma, to want.` },
  pean: { en: msg`I have to, I must`, note: msg`From pidama, to have to.` },
  võin: { en: msg`I may, I can`, note: msg`From võima.` },
  saan: { en: msg`I can, I get to`, note: msg`From saama.` },
  oskan: { en: msg`I can, I know how to`, note: msg`From oskama.` },
  tohin: { en: msg`I’m allowed to`, note: msg`From tohtima.` },
  hakkan: { en: msg`I start`, note: msg`From hakkama, to start.` },
  lähen: { en: msg`I go, I’m going`, note: msg`From minema, to go.` },
  tule: { en: msg`come`, note: msg`The command of tulema, to come.` },
  jään: { en: msg`I stay`, note: msg`From jääma, to stay.` },
  "mulle meeldib": {
    en: msg`I like`,
    show: "Mulle meeldib",
    note: msg`Mulle is to me. Learn it as a phrase for now.`,
  },
  lugema: { en: msg`to read`, note: msg`The -ma form. Its -da form is lugeda.` },
  lugeda: { en: msg`to read`, note: msg`The -da form of lugema.` },
  "ma tahan lugeda.": { en: msg`I want to read.`, show: "Ma tahan lugeda." },
  "ma pean lugema.": { en: msg`I have to read.`, show: "Ma pean lugema." },
  "nad tahavad lugeda.": { en: msg`They want to read.`, show: "Nad tahavad lugeda." },
  "nad peavad lugema.": { en: msg`They have to read.`, show: "Nad peavad lugema." },
  õppima: { en: msg`to learn, to study`, note: msg`Its I form is õpin.` },
  "ma õpin lugema.": { en: msg`I’m learning to read.`, show: "Ma õpin lugema." },
  teha: { en: msg`to do, to make`, note: msg`The -da form of tegema.` },
  tegema: { en: msg`to do, to make`, note: msg`The -ma form. Its -da form is teha.` },
  "ma pean homme tööle minema.": {
    en: msg`I have to go to work tomorrow.`,
    show: "Ma pean homme tööle minema.",
  },
};

/** An Estonian ending in running text: read in Estonian, never split after its hyphen. */
function End({ children }: { children: ReactNode }) {
  return (
    <span lang="et" className="whitespace-nowrap">
      {children}
    </span>
  );
}

/** Which form follows, as the line under the tahan-and-pean table says it. */
function FollowsNote({ takes }: { takes: Takes }) {
  return takes === "da" ? (
    <Trans>
      After <span lang="et">tahan</span>, the <End>-da</End> form.
    </Trans>
  ) : (
    <Trans>
      After <span lang="et">pean</span>, the <End>-ma</End> form.
    </Trans>
  );
}

/** The same six verbs after tahan and after pean; a tap plays the whole sentence. */
function WantOrMust() {
  const { t, i18n } = useLingui();
  const rows: ParadigmRow[] = INFINITIVE_PAIRS.map((pair) => ({
    id: formText(pair.ma),
    label: i18n._(PAIR_MEANS[pair.ma]),
    et: formText(pair.ma),
    cells: (["da", "ma"] as const).map((takes) => ({
      form: `${takes === "da" ? "tahan" : "pean"} ${pair[takes]}`,
      src: src(wantOrMust(pair[takes], takes)),
      note: <FollowsNote takes={takes} />,
    })),
  }));
  return (
    <Panel>
      <Paradigm
        label={t`Six verbs after I want and I have to`}
        columns={[t`I want to …`, t`I have to …`]}
        rows={rows}
        empty={{ title: t`Tap a form`, tip: t`You’ll hear the whole sentence.` }}
      />
    </Panel>
  );
}

/** The line under a verb key: the verb it comes from. */
function LeadTip({ lead }: { lead: InfinitiveLead }) {
  const liking = LESSONS.find((lesson) => lesson.et === "Mulle meeldib")?.n;
  const future = LESSONS.find((lesson) => lesson.et === "Hakkan õppima")?.n;
  const commands = lessonBySlug("kaskiv")?.n;
  const verb = lead.verb;
  switch (lead.lead) {
    case "mulle meeldib":
      return (
        <Trans>
          <span lang="et">Mulle meeldib</span> is I like. Lesson {liking} explains how it works.
        </Trans>
      );
    case "tule":
      return (
        <Trans>
          The command of <span lang="et">tulema</span>, to come, from lesson {commands}.
        </Trans>
      );
    case "hakkan":
      return (
        <Trans>
          Its <End>-ma</End> form is <span lang="et">hakkama</span>. Lesson {future} uses it for the
          future.
        </Trans>
      );
    default:
      return (
        <Trans>
          Its <End>-ma</End> form is <span lang="et">{verb}</span>.
        </Trans>
      );
  }
}

/** Keys for the verbs of one side: each plays its sentence, the second verb's ending lit. */
function LeadKeys({ takes, label }: { takes: Takes; label: string }) {
  const { i18n } = useLingui();
  const leads = INFINITIVE_LEADS.filter((lead) => lead.takes === takes);
  return (
    <Panel>
      <Keys
        label={label}
        columns={4}
        phoneColumns={takes === "da" ? 2 : 3}
        empty={{
          title: <Trans>Tap a verb</Trans>,
          tip: <Trans>You’ll hear it in a sentence.</Trans>,
        }}
        items={leads.map((lead) => ({
          label: lead.lead.replace("mulle ", ""),
          sub: <Lit form={lead.form} />,
          src: src(lead.said),
          detail: {
            title: (
              <>
                <span lang="et">{lead.said}</span>{" "}
                <small className="ms-1 text-md font-normal text-ink-secondary">
                  {i18n._(SAID_MEANS[lead.said])}
                </small>
              </>
            ),
            tip: <LeadTip lead={lead} />,
          },
        }))}
      />
    </Panel>
  );
}

/**
 * The second verbs each verb can take in the quiz, as rows of the tahan-and-pean table, so every
 * sentence the quiz builds makes sense: “Tule lugema!” but not “Ma oskan minna.”
 */
export const SECONDS: Record<Lead, readonly Pair["ma"][]> = {
  tahan: ["luge|ma", "söö|ma", "mine|ma", "õppi|ma"],
  võin: ["luge|ma", "tule|ma", "tööta|ma"],
  saan: ["luge|ma", "tule|ma", "tööta|ma"],
  oskan: ["luge|ma"],
  tohin: ["luge|ma", "söö|ma", "tule|ma", "tööta|ma"],
  proovin: ["luge|ma", "õppi|ma", "tule|ma"],
  armastan: ["luge|ma", "õppi|ma", "söö|ma"],
  "mulle meeldib": ["luge|ma", "õppi|ma", "tööta|ma", "söö|ma"],
  pean: ["luge|ma", "tööta|ma", "tule|ma", "mine|ma", "õppi|ma"],
  hakkan: ["luge|ma", "õppi|ma", "tööta|ma", "söö|ma"],
  lähen: ["söö|ma", "õppi|ma", "tööta|ma"],
  tule: ["söö|ma", "luge|ma"],
  jään: ["luge|ma", "õppi|ma", "tööta|ma"],
};

const pairOf = (ma: Pair["ma"]) => INFINITIVE_PAIRS.find((pair) => pair.ma === ma) as Pair;

/** The sentence a lead and a second verb make: “Ma tahan lugeda.”, “Tule lugema!” */
export const sentenceOf = (lead: InfinitiveLead, pair: Pair) =>
  `${lead.frame} ${formText(pair[lead.takes])}${lead.lead === "tule" ? "!" : "."}`;

type FormItem = ChoiceItem & {
  lead: InfinitiveLead;
  pair: readonly [Takes, string];
};

/** The two forms of a second verb as options, in the order given. */
const formOptions = (pair: Pair, order: readonly Takes[]) =>
  order.map((takes) => ({
    id: takes,
    label: (
      <span lang="et">
        <Lit form={pair[takes]} />
      </span>
    ),
  }));

/** After an answer: the sentence, and which form the verb takes. */
function FormWhy({ lead, pair }: { lead: InfinitiveLead; pair: Pair }) {
  const name = lead.lead;
  return (
    <>
      <span lang="et" className="font-medium text-ink">
        {sentenceOf(lead, pair)}
      </span>{" "}
      {lead.takes === "da" ? (
        <Trans>
          After <span lang="et">{name}</span> comes the <End>-da</End> form.
        </Trans>
      ) : (
        <Trans>
          After <span lang="et">{name}</span> comes the <End>-ma</End> form.
        </Trans>
      )}
    </>
  );
}

/** A round of “Which form follows?” for a lead and a second verb, its options in the order given. */
const formRound = (lead: InfinitiveLead, pair: Pair, order: readonly Takes[]): FormItem => ({
  lead,
  pair: [lead.takes, lead.lead],
  src: src(lead.lead),
  answer: lead.takes,
  options: formOptions(pair, order),
  explain: <FormWhy lead={lead} pair={pair} />,
});

/** Rounds in a run: as many -da verbs as -ma verbs, so always picking one side scores half. */
export const FORM_ROUNDS = 8;

/**
 * The quiz's first round, fixed for the server: oskan, which no explorer above leads with, its
 * answer in the second place.
 */
const FIRST: Lead = "oskan";

/**
 * A run of “Which form follows?”: four -da verbs and four -ma verbs at random, the pinned first
 * round kept; every other round draws its second verb and the order of its two forms afresh.
 */
export function formRun(items: readonly FormItem[], pinned?: FormItem): FormItem[] {
  const side = (takes: Takes) =>
    shuffle(items.filter((item) => item.answer === takes && item !== pinned)).slice(
      0,
      FORM_ROUNDS / 2 - (pinned?.answer === takes ? 1 : 0),
    );
  const drawn = shuffle([...side("da"), ...side("ma")]).map((item) => {
    const pair = pairOf(shuffle(SECONDS[item.lead.lead])[0] as Pair["ma"]);
    return formRound(item.lead, pair, shuffle(["da", "ma"] as const));
  });
  return pinned ? [pinned, ...drawn] : drawn;
}

/** The first item first; every item's first second verb, its forms in a fixed order. */
export const FORM_ITEMS: FormItem[] = [
  leadOf(FIRST),
  ...INFINITIVE_LEADS.filter((lead) => lead.lead !== FIRST),
].map((lead, i) =>
  formRound(
    lead,
    pairOf(SECONDS[lead.lead][0] as Pair["ma"]),
    i % 2 === 0 ? ["ma", "da"] : ["da", "ma"],
  ),
);

/** Mari's message, gap by gap, each gap's words in its own order. */
export const MESSAGE_GAPS = [
  {
    id: "tootama",
    before: "Tere, Jaan! Ma pean täna kodus",
    after: ".",
    answer: "töötama",
    options: ["töötada", "töötama", "töötan"],
  },
  {
    id: "lahen",
    before: "Aga ma",
    after: "kell neli linna.",
    answer: "lähen",
    options: ["minema", "minna", "lähen"],
  },
  {
    id: "juua",
    before: "Kas sa tahad kohvi",
    after: "?",
    answer: "juua",
    options: ["juua", "jood", "jooma"],
  },
  {
    id: "ootan",
    before: "Ma",
    after: "sind kohvikus.",
    answer: "ootan",
    options: ["ootan", "ootama", "oodata"],
  },
  {
    id: "lugeda",
    before: "Mulle meeldib kohvikus",
    after: ".",
    answer: "lugeda",
    options: ["loen", "lugema", "lugeda"],
  },
  {
    id: "minema",
    before: "Ma pean kell kuus koju",
    after: ".",
    answer: "minema",
    options: ["lähen", "minema", "minna"],
  },
] as const satisfies readonly GapItem[];

/** Why each gap of the message takes its word. */
function MessageWhy({ id }: { id: (typeof MESSAGE_GAPS)[number]["id"] }) {
  switch (id) {
    case "tootama":
      return (
        <Trans>
          After <span lang="et">pean</span>, the <End>-ma</End> form.
        </Trans>
      );
    case "lahen":
      return (
        <Trans>
          No verb comes before it, so the present: <span lang="et">ma lähen</span>.
        </Trans>
      );
    case "juua":
      return (
        <Trans>
          After <span lang="et">tahad</span>, from <span lang="et">tahtma</span>, the <End>-da</End>{" "}
          form.
        </Trans>
      );
    case "ootan":
      return (
        <Trans>
          No verb comes before it, so the present: <span lang="et">ma ootan</span>.
        </Trans>
      );
    case "lugeda":
      return (
        <Trans>
          After <span lang="et">mulle meeldib</span>, the <End>-da</End> form.
        </Trans>
      );
    case "minema":
      return (
        <Trans>
          After <span lang="et">pean</span>, the <End>-ma</End> form, even with words between.
        </Trans>
      );
  }
}

const MESSAGE_ITEMS: GapItem[] = MESSAGE_GAPS.map((gap) => ({
  ...gap,
  why: <MessageWhy id={gap.id} />,
}));

/** What each line of the word-order rows means. */
const ORDER_MEANS: Record<(typeof INFINITIVE_ORDER)[number], MessageDescriptor> = {
  "Ma pean minema.": msg`I have to go.`,
  "Ma pean tööle minema.": msg`I have to go to work.`,
  "Ma pean homme tööle minema.": msg`I have to go to work tomorrow.`,
  "Ma tahan täna kodus lugeda.": msg`I want to read at home today.`,
};

const orderRows = (i18n: I18n) =>
  INFINITIVE_ORDER.map((said) => ({ main: said, sub: i18n._(ORDER_MEANS[said]), src: src(said) }));

export function TegevusnimedLesson() {
  const { t, i18n } = useLingui();
  const at = (et: string) => LESSONS.find((lesson) => lesson.et === et)?.n;
  const verbForms = at("Lugema, lugeda, loen");
  const canMay = at("Võin, saan, oskan");
  const going = at("Lähen ujuma, olen ujumas");
  const nounForms = at("Kolm põhivormi");
  const wordOrder = at("Täna lähen ma");
  const present = lessonBySlug("olevik")?.n;

  // The server renders the message's options as written; the browser shuffles them once.
  const [gaps, setGaps] = useState<GapItem[]>(MESSAGE_ITEMS);
  useEffect(() => {
    setGaps(MESSAGE_ITEMS.map((gap) => ({ ...gap, options: shuffle(gap.options ?? []) })));
  }, []);

  const rows = useMemo(() => orderRows(i18n), [i18n]);

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          When one verb follows another, the second takes its <End>-da</End> or its <End>-ma</End>{" "}
          form, and the first verb decides which: <span lang="et">Ma tahan lugeda</span>, I want to
          read, but <span lang="et">Ma pean lugema</span>, I have to read.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">A quiz and a message to fill in</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={INFINITIVE_LEADS.map(({ lead }) => lead)}
      recap={[
        <Trans key="1">
          When one verb follows another, the second takes its <End>-da</End> or <End>-ma</End> form:{" "}
          <b lang="et">Ma tahan lugeda. Ma pean lugema.</b>
        </Trans>,
        <Trans key="2">
          The <End>-da</End> form follows{" "}
          <b lang="et">tahan, võin, saan, oskan, tohin, proovin, armastan</b> and{" "}
          <b lang="et">mulle meeldib</b>.
        </Trans>,
        <Trans key="3">
          The <End>-ma</End> form follows <b lang="et">pean, hakkan, lähen, tule</b> and{" "}
          <b lang="et">jään</b>, and <b lang="et">õppima</b> for learning to do something.
        </Trans>,
        <Trans key="4">
          Only the first verb changes for the person: <b lang="et">nad tahavad lugeda</b>.
        </Trans>,
        <Trans key="5">
          The second verb usually goes last: <b lang="et">Ma pean homme tööle minema.</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "two-forms",
          title: t`One verb after another`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {verbForms}, <Word w="lugema" /> and <Word w="lugeda" /> both meant to
                    read. Which one you use depends on the verb before it.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    After <Word w="tahan" />, I want, comes the <End>-da</End> form:{" "}
                    <Word w="Ma tahan lugeda." /> After <Word w="pean" />, I have to, comes the{" "}
                    <End>-ma</End> form: <Word w="Ma pean lugema." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Only the first verb takes the person ending from lesson {present}; the second
                    stays as it is: <Word w="Nad tahavad lugeda." /> <Word w="Nad peavad lugema." />{" "}
                    Tap a form to hear the whole sentence.
                  </Trans>
                </p>
              </Prose>
              <WantOrMust />
            </>
          ),
        },
        {
          id: "da",
          title: t`Verbs of wanting and being able`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Eight verbs take the <End>-da</End> form after them, <Word w="tahan" /> among
                    them: <Word w="Ma tahan süüa." />{" "}
                    <Word w="Ma oskan natuke eesti keelt rääkida." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Võin" />, <Word w="saan" /> and <Word w="oskan" /> can all translate as
                    I can. Lesson {canMay} tells them apart; the form after them is the same.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Mulle meeldib" />, I like, works the same way:{" "}
                    <Word w="Mulle meeldib kohvi juua." /> Tap a verb to hear it in a sentence.
                  </Trans>
                </p>
              </Prose>
              <LeadKeys takes="da" label={t`Verbs of wanting and being able`} />
            </>
          ),
        },
        {
          id: "ma",
          title: t`Verbs of having to, starting and going`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Pean" /> takes the <End>-ma</End> form, and so do the verbs for
                    starting, going, coming and staying: <Word w="hakkan" />, <Word w="lähen" />,{" "}
                    <Word w="tule" /> and <Word w="jään" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Ma pean minema." /> <Word w="Ma lähen kohvi jooma." /> Lesson {going}{" "}
                    builds on this: the <End>-ma</End> form after a verb of going says what you’re
                    off to do. Tap a verb to hear it in a sentence.
                  </Trans>
                </p>
              </Prose>
              <LeadKeys takes="ma" label={t`Verbs of having to, starting and going`} />
              <Aside>
                <Trans>
                  <Word w="Õppima" />, to learn, takes the <End>-ma</End> form when you learn to do
                  something: <Word w="Ma õpin lugema." />
                </Trans>
              </Aside>
              <Aside>
                <Trans>
                  To check a verb that isn’t here, look it up in <span lang="et">Sõnaveeb</span>, as
                  lesson {nounForms} shows. Under <span lang="et">Rektsioon</span>,{" "}
                  <b lang="et">mida teha</b> means the verb takes the <End>-da</End> form, and{" "}
                  <b lang="et">mida tegema</b> the <End>-ma</End> form. <Word w="Teha" /> and{" "}
                  <Word w="tegema" /> are the <End>-da</End> and <End>-ma</End> forms of to do.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "which-form",
          title: t`Which form follows?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a verb and pick the form that follows it. Both choices are one verb, in its{" "}
                    <End>-da</End> form and its <End>-ma</End> form.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-form"
                title={<Trans>Which form follows?</Trans>}
                items={FORM_ITEMS}
                rounds={FORM_ROUNDS}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All eight. You picked the right form after every verb.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the verbs you missed once more.</Trans>
                  ) : (
                    <Trans>Tap the verbs above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.lead.lead, src: item.src })}
                order={formRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "last",
          title: t`The second verb goes last`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Words for when and where usually sit between the two verbs, and the second verb
                    stays at the end: <Word w="Ma pean homme tööle minema." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Tap a line to hear the sentence grow. Lesson {wordOrder} has more on where
                    Estonian puts its words.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows} />
            </>
          ),
        },
        {
          id: "message",
          title: t`Mari’s message`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari writes to her friend Jaan. In each gap, pick the <End>-ma</End> form, the{" "}
                    <End>-da</End> form or the present. The verb before the gap decides; with no
                    verb before it, the present fits.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="mari-message"
                title={<Trans>Fill the gaps</Trans>}
                gaps={gaps}
                mode="pick"
                clip="p-message"
              />
            </>
          ),
        },
      ]}
    />
  );
}
