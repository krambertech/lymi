import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { LESSONS, lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  daForm,
  PRESENT_VERBS,
  threeForms,
  VERB_FORMS,
  type VerbForms,
  VORMID_COMMANDS,
} from "../../../lib/learn/clips";
import { playSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, Keys, Panel } from "../Explore";
import { type GapItem, GapPassage } from "../GapPassage";
import { Aside, LessonView, Prose } from "../LessonView";
import type { Glossary } from "../lesson-context";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { PlayButton, Playing } from "../Sound";
import { Word } from "../Word";

const SLUG = "verbi-pohivormid";
/** A clip by what it says. */
const src = (text: string) => clipUrl(SLUG, clipId(text));

type Verb = VerbForms["ma"];

const verbOf = (ma: Verb) => VERB_FORMS.find((each) => each.ma === ma) as VerbForms;

/** What each verb means. */
const MEANS: Record<Verb, MessageDescriptor> = {
  elama: msg`to live`,
  lugema: msg`to read`,
  rääkima: msg`to speak, to talk`,
  õppima: msg`to learn, to study`,
  istuma: msg`to sit, to sit down`,
  töötama: msg`to work`,
  armastama: msg`to love`,
  ootama: msg`to wait`,
  kuulama: msg`to listen`,
  vaatama: msg`to look, to watch`,
  olema: msg`to be`,
  tulema: msg`to come`,
  minema: msg`to go`,
  tegema: msg`to do, to make`,
  nägema: msg`to see`,
  sööma: msg`to eat`,
  jooma: msg`to drink`,
};

/** What each verb's I form means. */
const I_MEANS: Record<Verb, MessageDescriptor> = {
  elama: msg`I live`,
  lugema: msg`I read`,
  rääkima: msg`I speak`,
  õppima: msg`I learn, I study`,
  istuma: msg`I sit`,
  töötama: msg`I work`,
  armastama: msg`I love`,
  ootama: msg`I wait`,
  kuulama: msg`I listen`,
  vaatama: msg`I look, I watch`,
  olema: msg`I am`,
  tulema: msg`I come`,
  minema: msg`I go`,
  tegema: msg`I do, I make`,
  nägema: msg`I see`,
  sööma: msg`I eat`,
  jooma: msg`I drink`,
};

/** What each command to more than one says. */
const COMMAND_MEANS: Partial<Record<Verb, MessageDescriptor>> = {
  lugema: msg`Read. To more than one, or polite.`,
  rääkima: msg`Speak. To more than one, or polite.`,
  istuma: msg`Sit down. To more than one, or polite.`,
  ootama: msg`Wait. To more than one, or polite.`,
  olema: msg`Be. To more than one, or polite.`,
  tulema: msg`Come. To more than one, or polite.`,
  tegema: msg`Do it. To more than one, or polite.`,
};

/** The line under each key of the -la, -na and -a forms: how the -da form is made. */
function How({ ma }: { ma: Verb }) {
  switch (ma) {
    case "olema":
      return (
        <Trans>
          I form <span lang="et">olen</span>. Drop <span lang="et">-⁠ema</span> and add{" "}
          <span lang="et">-⁠la</span>.
        </Trans>
      );
    case "tulema":
      return (
        <Trans>
          I form <span lang="et">tulen</span>. Drop <span lang="et">-⁠ema</span> and add{" "}
          <span lang="et">-⁠la</span>.
        </Trans>
      );
    case "minema":
      return (
        <Trans>
          I form <span lang="et">lähen</span>, a stem of its own. Drop <span lang="et">-⁠ema</span>{" "}
          and add <span lang="et">-⁠na</span>.
        </Trans>
      );
    case "tegema":
      return (
        <Trans>
          I form <span lang="et">teen</span>. Drop <span lang="et">-⁠ema</span>, turn g into h and
          add <span lang="et">-⁠a</span>.
        </Trans>
      );
    case "nägema":
      return (
        <Trans>
          I form <span lang="et">näen</span>. Drop <span lang="et">-⁠ema</span>, turn g into h and
          add <span lang="et">-⁠a</span>.
        </Trans>
      );
    case "sööma":
      return (
        <Trans>
          I form <span lang="et">söön</span>. Drop <span lang="et">-⁠ma</span>, turn{" "}
          <span lang="et">öö</span> into <span lang="et">üü</span> and add <span lang="et">-⁠a</span>
          .
        </Trans>
      );
    case "jooma":
      return (
        <Trans>
          I form <span lang="et">joon</span>. Drop <span lang="et">-⁠ma</span>, turn{" "}
          <span lang="et">oo</span> into <span lang="et">uu</span> and add <span lang="et">-⁠a</span>
          .
        </Trans>
      );
    default:
      return null;
  }
}

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    VERB_FORMS.flatMap((verb) => {
      const da = daForm(verb);
      const { ma, n } = verb;
      const command = COMMAND_MEANS[ma];
      return [
        [ma, { en: MEANS[ma], note: msg`Its -⁠da form is ${da}, its I form ${n}.` }],
        [da, { en: MEANS[ma], note: msg`The -⁠da form of ${ma}.` }],
        [n, { en: I_MEANS[ma], note: msg`The I form of ${ma}.` }],
        [threeForms(verb), { en: MEANS[ma] }],
        ...(command ? [[verb.ge.toLowerCase(), { en: command, show: verb.ge }]] : []),
      ];
    }),
  ),
  "ma tahan lugeda": {
    en: msg`I want to read.`,
    show: "Ma tahan lugeda.",
    note: msg`Tahan, I want, is followed by the -⁠da form.`,
  },
};

/** A form with its ending in the stage's hue: “luge” + “da”. */
function Lit({ stem, ending }: { stem: string; ending: string }) {
  return (
    <>
      {stem}
      <span className="text-(--form)">{ending}</span>
    </>
  );
}

const maParts = (verb: VerbForms) => [verb.ma.slice(0, -2), "ma"] as const;
const nParts = (verb: VerbForms) => [verb.n.slice(0, -1), "n"] as const;

/** One of a verb's three forms: what it is, and the form with its ending lit; a tap plays it. */
function FormTile({
  label,
  parts,
  isNew,
}: {
  label: ReactNode;
  parts: readonly [string, string];
  isNew?: boolean;
}) {
  const said = parts.join("");
  const clip = src(said);
  const playing = usePlaying(clip);
  return (
    <button
      type="button"
      data-playing={playing ? "" : undefined}
      onClick={() => void playSound(clip)}
      className={clsx(
        "learn-key relative flex cursor-pointer items-baseline justify-between gap-3 rounded-tile bg-plate px-4 py-2.5 text-start hoverable:hover:bg-plate-hover sm:grid sm:content-start sm:justify-start sm:gap-1 sm:px-3.5 sm:pb-3",
        isNew && "outline-2 -outline-offset-2 outline-(--form)",
      )}
    >
      <span className="text-sm text-ink-secondary">{label}</span>
      <b
        lang="et"
        className="min-w-0 text-2xl/tight font-semibold tracking-tight whitespace-nowrap max-sm:pe-5 max-sm:text-xl/tight"
      >
        <Lit stem={parts[0]} ending={parts[1]} />
      </b>
      {playing && <Playing className="absolute end-3 top-3 h-3 text-(--form)" />}
    </button>
  );
}

/** Pick a verb from the present-tense lesson and see, and hear, its three forms. */
function VerbCard() {
  const { t, i18n } = useLingui();
  const [ma, setMa] = useState<Verb>("lugema");
  const verb = verbOf(ma);
  return (
    <Panel className="gap-5">
      <Chips
        label={t`Verbs`}
        items={PRESENT_VERBS.map((each) => ({ label: each.verb, value: each.verb, lang: "et" }))}
        value={ma}
        onPick={(value) => {
          setMa(value);
          void playSound(src(threeForms(verbOf(value))));
        }}
      />
      <div key={ma} className="learn-swap flex items-center justify-between gap-3">
        <p className="grid gap-0.5">
          <span lang="et" className="text-2xl font-semibold tracking-tight max-sm:text-xl">
            {threeForms(verb)}
          </span>
          <span className="text-md text-ink-secondary">{i18n._(MEANS[ma])}</span>
        </p>
        <PlayButton src={src(threeForms(verb))} label={t`Play all three`} />
      </div>
      <div className="grid gap-1.5 sm:grid-cols-3 sm:gap-2">
        <FormTile label={<Trans>-⁠ma form</Trans>} parts={maParts(verb)} />
        <FormTile label={<Trans>-⁠da form</Trans>} parts={verb.da} isNew />
        <FormTile label={<Trans>I form</Trans>} parts={nParts(verb)} />
      </div>
    </Panel>
  );
}

type Kind = "ma" | "da" | "n";

const partsOf = (verb: VerbForms, kind: Kind): readonly [string, string] =>
  kind === "ma" ? maParts(verb) : kind === "da" ? verb.da : nParts(verb);

/** The verbs that take -da on the -ma form's stem. */
const DA_VERBS = VERB_FORMS.filter((verb) => verb.pattern === "da");

/** One line of the switch: a form with its ending lit; a tap plays it. */
function FlipLine({ parts, mode }: { parts: readonly [string, string]; mode: string }) {
  const said = parts.join("");
  const clip = src(said);
  const playing = usePlaying(clip);
  return (
    <button
      type="button"
      data-playing={playing ? "" : undefined}
      onClick={() => void playSound(clip)}
      className="learn-key flex min-h-13 cursor-pointer items-center justify-between gap-3 rounded-tile bg-plate py-2 ps-4 pe-3 text-start hoverable:hover:bg-plate-hover"
    >
      <span
        key={mode}
        lang="et"
        className="learn-swap text-xl font-medium tracking-tight max-sm:text-lg"
      >
        <Lit stem={parts[0]} ending={parts[1]} />
      </span>
      <span className="grid size-5 shrink-0 place-items-center text-(--form)">
        {playing && <Playing className="h-3" />}
      </span>
    </button>
  );
}

/** The -da verbs, switched together between their three forms. */
function FormFlip() {
  const { t } = useLingui();
  const [kind, setKind] = useState<Kind>("da");
  const notes: Record<Kind, { title: ReactNode; tip: ReactNode }> = {
    ma: {
      title: (
        <Trans>
          The <span lang="et">-⁠ma</span> form
        </Trans>
      ),
      tip: (
        <Trans>
          The form a dictionary lists first. Take off -⁠ma and you have its stem,{" "}
          <span lang="et">luge-</span>.
        </Trans>
      ),
    },
    da: {
      title: <Trans>The same stem with -⁠da</Trans>,
      tip: (
        <Trans>
          Only the ending changes: <span lang="et">luge-ma</span>, <span lang="et">luge-da</span>.
        </Trans>
      ),
    },
    n: {
      title: <Trans>The I form</Trans>,
      tip: (
        <Trans>
          It can have a stem of its own: <span lang="et">loe-n</span>,{" "}
          <span lang="et">räägi-n</span>, <span lang="et">õpi-n</span>. The -⁠da form keeps the -⁠ma
          form’s stem.
        </Trans>
      ),
    },
  };
  return (
    <Panel>
      <Chips
        label={t`Which form`}
        items={[
          { label: t`-⁠ma form`, value: "ma" },
          { label: t`-⁠da form`, value: "da" },
          { label: t`I form`, value: "n" },
        ]}
        value={kind}
        onPick={(value) => setKind(value)}
      />
      <div className="grid gap-1.5 sm:grid-cols-2">
        {DA_VERBS.map((verb) => (
          <FlipLine key={verb.ma} parts={partsOf(verb, kind)} mode={kind} />
        ))}
      </div>
      <div aria-live="polite" className="min-h-13">
        <p key={kind} className="learn-swap grid gap-0.5">
          <span className="text-xl font-medium">{notes[kind].title}</span>
          <span className="text-md text-ink-secondary">{notes[kind].tip}</span>
        </p>
      </div>
    </Panel>
  );
}

/** Keys for verbs whose -da form is made another way: the -da form, the -ma form under it. */
function FormKeys({ verbs, label }: { verbs: readonly Verb[]; label: string }) {
  const { t, i18n } = useLingui();
  return (
    <Panel>
      <Keys
        label={label}
        columns={verbs.length}
        phoneColumns={verbs.length === 4 ? 2 : 3}
        empty={{ title: t`Tap a form`, tip: t`You’ll hear it and see how it’s made.` }}
        items={verbs.map((ma) => {
          const verb = verbOf(ma);
          const da = daForm(verb);
          return {
            label: da,
            sub: ma,
            src: src(da),
            label2: `${da}, ${ma}`,
            detail: {
              title: (
                <>
                  <span lang="et">
                    {ma} → <Lit stem={verb.da[0]} ending={verb.da[1]} />
                  </span>{" "}
                  <small className="ms-1 text-md font-normal text-ink-secondary">
                    {i18n._(MEANS[ma])}
                  </small>
                </>
              ),
              tip: <How ma={ma} />,
            },
          };
        })}
      />
    </Panel>
  );
}

/** A -da form and the command to more than one built on it; each side plays. */
function CommandPair({ verb }: { verb: VerbForms }) {
  const { i18n } = useLingui();
  const ge = verb.ge.slice(0, -1);
  const ending = ge.slice(-2);
  return (
    <div className="grid gap-1 rounded-tile bg-plate px-2 pt-1.5 pb-2.5 shadow-[0_0_0_1px_var(--edge)]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
        <PairWord said={daForm(verb)}>
          <Lit stem={verb.da[0]} ending={verb.da[1]} />
        </PairWord>
        <ArrowRight aria-hidden="true" className="size-4 text-ink-muted rtl:-scale-x-100" />
        <PairWord said={verb.ge}>
          <Lit stem={ge.slice(0, -2)} ending={ending} />!
        </PairWord>
      </div>
      <p className="ps-2 text-sm text-ink-muted">
        <span lang="et">{verb.ma}</span>, {i18n._(MEANS[verb.ma])}
      </p>
    </div>
  );
}

function PairWord({ said, children }: { said: string; children: ReactNode }) {
  const clip = src(said);
  const playing = usePlaying(clip);
  return (
    <button
      type="button"
      onClick={() => void playSound(clip)}
      className={clsx(
        "flex cursor-pointer items-center gap-2 rounded-xs px-2 py-1 text-start text-xl font-semibold tracking-tight transition-colors duration-150 hoverable:hover:bg-plate-hover max-sm:text-lg",
        playing && "bg-plate-hover",
      )}
    >
      <span lang="et" className="whitespace-nowrap">
        {children}
      </span>
      {playing && <Playing className="h-3 text-(--form)" />}
    </button>
  );
}

/** “Which form did you hear?”: each verb of the -da and -ta kinds, said as each of its forms. */
export const HEARD = VERB_FORMS.filter((verb) => verb.pattern === "da" || verb.pattern === "ta")
  .flatMap((verb) => (["ma", "da", "n"] as const).map((kind) => ({ verb, kind })))
  .map(({ verb, kind }) => ({
    verb,
    kind,
    said: partsOf(verb, kind).join(""),
    pair: [kind, `${verb.ma}-${kind}`] as const,
  }));

/** “Which verb is it?”: -da forms that look least like their -ma form. */
export const ASKED = [
  "olema",
  "tulema",
  "minema",
  "tegema",
  "nägema",
  "sööma",
  "jooma",
  "ootama",
  "vaatama",
] as const satisfies readonly Verb[];

type Asked = (typeof ASKED)[number];

/** The verb each one is likeliest to be taken for. */
const NEAR: Record<Asked, Asked> = {
  olema: "tulema",
  tulema: "olema",
  minema: "tulema",
  tegema: "nägema",
  nägema: "tegema",
  sööma: "jooma",
  jooma: "sööma",
  ootama: "vaatama",
  vaatama: "ootama",
};

/** The answer, the verb it's likeliest taken for, and one more at random, in random order. */
export function threeVerbs(answer: Asked): Verb[] {
  const near = NEAR[answer];
  const other = shuffle(ASKED.filter((each) => each !== answer && each !== near))[0] as Asked;
  return shuffle([answer, near, other]);
}

/** The first round's options, fixed so the page renders the same on the server. */
const firstVerbs = (i: number): Verb[] => {
  const answer = ASKED[i] as Asked;
  const other = ASKED[(i + 4) % ASKED.length] as Asked;
  const three = [answer, NEAR[answer], other];
  const turn = i % 3;
  return [...three.slice(turn), ...three.slice(0, turn)];
};

type HeardItem = ChoiceItem & { said: string; pair: readonly [string, string] };
type AskedItem = ChoiceItem & { said: string; pair: readonly [string, string] };

const verbOptions = (verbs: readonly Verb[]) =>
  verbs.map((ma) => ({ id: ma, label: <span lang="et">{ma}</span> }));

/** The passage of the class, gap by gap, each gap's words in its own order. */
export const CLASS_GAPS = [
  {
    id: "istuge",
    before: "Tere!",
    after: ", palun.",
    answer: "Istuge",
    options: ["Istute", "Istuge"],
  },
  {
    id: "loeme",
    before: "Täna me",
    after: "raamatut.",
    answer: "loeme",
    options: ["loeme", "lugeme"],
  },
  {
    id: "lugege",
    before: "",
    after: ", palun.",
    answer: "Lugege",
    options: ["Loege", "Loete", "Lugege"],
  },
  {
    id: "loete",
    before: "Te",
    after: "väga hästi.",
    answer: "loete",
    options: ["lugete", "loete", "lugege"],
  },
  {
    id: "raagite",
    before: "Kas te",
    after: "kodus eesti keelt?",
    answer: "räägite",
    options: ["räägite", "rääkige", "rääkite"],
  },
  {
    id: "raakige",
    before: "",
    after: "kodus eesti keelt!",
    answer: "Rääkige",
    options: ["Räägite", "Räägige", "Rääkige"],
  },
] as const satisfies readonly GapItem[];

/** Why each gap takes its word. */
function ClassWhy({ id }: { id: (typeof CLASS_GAPS)[number]["id"] }) {
  switch (id) {
    case "istuge":
      return (
        <Trans>
          A command to the class, built on the -⁠da form: <span lang="et">istuda, istuge</span>.
        </Trans>
      );
    case "loeme":
      return (
        <Trans>
          What we do today, so the present, built on the I form: <span lang="et">loen, loeme</span>.
        </Trans>
      );
    case "lugege":
      return (
        <Trans>
          A command, built on the -⁠da form: <span lang="et">lugeda, lugege</span>.
        </Trans>
      );
    case "loete":
      return (
        <Trans>
          What the class does, so the present: <span lang="et">loen, loete</span>.
        </Trans>
      );
    case "raagite":
      return (
        <Trans>
          A question about what the class does, so the present:{" "}
          <span lang="et">räägin, räägite</span>.
        </Trans>
      );
    case "raakige":
      return (
        <Trans>
          A command again, built on the -⁠da form: <span lang="et">rääkida, rääkige</span>.
        </Trans>
      );
  }
}

const CLASS_ITEMS: GapItem[] = CLASS_GAPS.map((gap) => ({ ...gap, why: <ClassWhy id={gap.id} /> }));

/** Which of the three forms a heard form was, and of which verb. */
function WhichForm({ verb, kind, said }: { verb: VerbForms; kind: Kind; said: string }) {
  const { i18n } = useLingui();
  const ma = verb.ma;
  const means = i18n._(MEANS[ma]);
  return kind === "ma" ? (
    <Trans>
      <b lang="et" className="font-medium text-ink">
        {said}
      </b>{" "}
      is the -⁠ma form itself, {means}.
    </Trans>
  ) : kind === "da" ? (
    <Trans>
      <b lang="et" className="font-medium text-ink">
        {said}
      </b>{" "}
      is the -⁠da form of <span lang="et">{ma}</span>, {means}.
    </Trans>
  ) : (
    <Trans>
      <b lang="et" className="font-medium text-ink">
        {said}
      </b>{" "}
      is the I form of <span lang="et">{ma}</span>, {means}.
    </Trans>
  );
}

export function VerbiPohivormidLesson() {
  const { t } = useLingui();
  const present = lessonBySlug("olevik")?.n;
  const pronouns = lessonBySlug("mina-sina-tema")?.n;
  const commands = lessonBySlug("kaskiv")?.n;
  const at = (et: string) => LESSONS.find((lesson) => lesson.et === et)?.n;
  const infinitives = at("Pean minema, tahan lugeda");
  const gradation = at("Jalg, jala");

  const heardItems = useMemo<HeardItem[]>(
    () =>
      HEARD.map(({ verb, kind, said, pair }) => ({
        said,
        pair,
        src: src(said),
        answer: kind,
        options: (["ma", "da", "n"] as const).map((each) => ({
          id: each,
          label: (
            <span lang="et">
              <Lit stem={partsOf(verb, each)[0]} ending={partsOf(verb, each)[1]} />
            </span>
          ),
        })),
        explain: <WhichForm verb={verb} kind={kind} said={said} />,
      })),
    [],
  );

  const askedItems = useMemo<AskedItem[]>(
    () =>
      ASKED.map((ma, i) => {
        const verb = verbOf(ma);
        const da = daForm(verb);
        return {
          said: da,
          pair: [ma, ma] as const,
          src: src(da),
          answer: ma,
          options: verbOptions(firstVerbs(i)),
          explain: <WhichForm verb={verb} kind="da" said={da} />,
        };
      }),
    [],
  );

  // Every round but the first draws its wrong verbs afresh, so no set of options names the answer.
  const askedRun = (items: readonly AskedItem[], pinned?: AskedItem): AskedItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned ? item : { ...item, options: verbOptions(threeVerbs(item.answer as Asked)) },
    );

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Learn every Estonian verb as three forms: <span lang="et">lugema, lugeda, loen</span>.
          Most verbs make the middle one by swapping -⁠ma for -⁠da; some take -⁠ta, and a few take -⁠la,
          -⁠na or a bare -⁠a.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">2 quizzes and a passage</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={VERB_FORMS.map(threeForms)}
      recap={[
        <Trans key="1">
          Learn a verb as three forms, the -⁠ma form, the -⁠da form and the I form:{" "}
          <b lang="et">lugema, lugeda, loen</b>.
        </Trans>,
        <Trans key="2">
          Most verbs swap -⁠ma for -⁠da on the same stem: <b lang="et">elama, elada</b>. The -⁠da form
          keeps that stem when the I form changes it: <b lang="et">lugeda, loen</b>.
        </Trans>,
        <Trans key="3">
          Some take -⁠ta: <b lang="et">oodata</b>. <span lang="et">Olema</span>,{" "}
          <span lang="et">tulema</span> and <span lang="et">minema</span> take -⁠la or -⁠na:{" "}
          <b lang="et">olla, tulla, minna</b>.
        </Trans>,
        <Trans key="4">
          <b lang="et">Teha, näha, süüa</b> and <b lang="et">juua</b> end in a bare -⁠a and change
          their stem. Learn these four whole.
        </Trans>,
        <Trans key="5">
          The present builds on the I form; for most verbs, the command to more than one builds on
          the -⁠da form: <b lang="et">te loete, lugege!</b>
        </Trans>,
      ]}
      sections={[
        {
          id: "three",
          title: t`Three forms`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {present} you learned a verb as two forms: <Word w="lugema" />, to
                    read, and its I form, <Word w="loen" />. A dictionary gives a third between
                    them, the -⁠da form: <Word w="lugema, lugeda, loen" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Lugema" /> and <Word w="lugeda" /> both translate as to read. Estonian
                    uses each after different words: after <span lang="et">tahan</span>, I want,
                    comes the -⁠da form, <Word w="Ma tahan lugeda" />. Lesson {infinitives} shows
                    which words take which.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Here are the ten verbs of lesson {present} with their three forms. The -⁠da form
                    is outlined. Tap a form to hear it.
                  </Trans>
                </p>
              </Prose>
              <VerbCard />
            </>
          ),
        },
        {
          id: "da",
          title: t`Most verbs: -⁠da`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Most verbs make the -⁠da form by swapping -⁠ma for -⁠da: <Word w="elama" />,{" "}
                    <Word w="elada" />. Whatever sits before -⁠ma usually stays as it is.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    That holds even when the I form changes the stem: <Word w="lugema" /> gives{" "}
                    <Word w="lugeda" />, though I read is <Word w="loen" />. The same goes for{" "}
                    <Word w="rääkima" /> and <Word w="õppima" />. Switch between the forms and tap a
                    line to hear it.
                  </Trans>
                </p>
              </Prose>
              <FormFlip />
              <Aside>
                <Trans>
                  Some verbs take -⁠ta: <Word w="ootama" />, <Word w="oodata" />;{" "}
                  <Word w="kuulama" />, <Word w="kuulata" />; <Word w="vaatama" />,{" "}
                  <Word w="vaadata" />. <span lang="et">Ootama</span> and{" "}
                  <span lang="et">vaatama</span> also turn the t of their stem into d:{" "}
                  <span lang="et">oota-</span>, <span lang="et">ooda-</span>. Lesson {gradation}{" "}
                  explains that change; for now, learn these three whole.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "hear-form",
          title: t`Which form did you hear?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear one form of a verb and pick which of the three it was. Listen to how it
                    ends.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-form"
                title={<Trans>Which form did you hear?</Trans>}
                items={heardItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six. You told the three forms apart every time.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Play the forms above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={eachPairFirst}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "la-na",
          title: t`Olla, tulla and minna`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Olema" />, <Word w="tulema" /> and <Word w="minema" /> drop -⁠ema and
                    add -⁠la or -⁠na, repeating the l or n: <Word w="olla" />, <Word w="tulla" />,{" "}
                    <Word w="minna" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    You know their I forms: <Word w="olen" /> from lesson {pronouns},{" "}
                    <Word w="tulen" /> and <Word w="lähen" /> from lesson {commands}. Tap a form to
                    hear it and see how it’s made.
                  </Trans>
                </p>
              </Prose>
              <FormKeys verbs={["olema", "tulema", "minema"]} label={t`Forms in -⁠la and -⁠na`} />
            </>
          ),
        },
        {
          id: "short",
          title: t`Teha, näha, süüa and juua`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    These four short verbs end their -⁠da form in a bare -⁠a, and the stem changes
                    too. <Word w="Tegema" />, to do, and <Word w="nägema" />, to see, turn g into h:{" "}
                    <Word w="teha" />, <Word w="näha" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Sööma" /> and <Word w="jooma" /> change their long vowel:{" "}
                    <Word w="süüa" />, <Word w="juua" />. Learn these four whole.
                  </Trans>
                </p>
              </Prose>
              <FormKeys verbs={["tegema", "nägema", "sööma", "jooma"]} label={t`Forms in -⁠a`} />
            </>
          ),
        },
        {
          id: "which-verb",
          title: t`Which verb is it?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a -⁠da form and pick the verb it belongs to. These are the ones that look
                    least like their -⁠ma form.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-verb"
                title={<Trans>Which verb is it?</Trans>}
                items={askedItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six. You matched each -⁠da form to its verb.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>
                      Play the -⁠ta, -⁠la, -⁠na and -⁠a forms above once more, then try again.
                    </Trans>
                  )
                }
                recall={(item) => ({ label: item.said, src: item.src })}
                order={askedRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "commands",
          title: t`Commands built on the -⁠da form`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {commands} you learned <Word w="Lugege!" /> as a whole word. It comes
                    from the -⁠da form, with -⁠ge in place of its ending: <Word w="lugeda" /> gives{" "}
                    <Word w="Lugege!" />, and <Word w="tulla" /> gives <Word w="Tulge!" />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Where the -⁠da form ends in -⁠ta, or in -⁠a after h, the command takes -⁠ke:{" "}
                    <Word w="oodata" />, <Word w="Oodake!" />; <Word w="teha" />,{" "}
                    <Word w="Tehke!" /> Tap either side of a pair to hear it.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {VORMID_COMMANDS.map((ma) => (
                    <CommandPair key={ma} verb={verbOf(ma as Verb)} />
                  ))}
                </div>
              </Panel>
              <Aside>
                <Trans>
                  <span lang="et">Sööma</span> and <span lang="et">jooma</span> break the pattern.
                  Their commands build on the I form: <span lang="et">söön, sööge</span>;{" "}
                  <span lang="et">joon, jooge</span>.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "class",
          title: t`In class`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari teaches a class. When she tells them what to do, the verb builds on the -⁠da
                    form; when she says what the class does, on the I form. Fill each gap.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="in-class"
                title={<Trans>Fill the gaps</Trans>}
                gaps={CLASS_ITEMS}
                mode="pick"
                clip="p-class"
              />
            </>
          ),
        },
      ]}
    />
  );
}
