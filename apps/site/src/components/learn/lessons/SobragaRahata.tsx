import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { LESSONS, lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  SOBRAGA_AS,
  SOBRAGA_CHAINS,
  SOBRAGA_FORMS,
  SOBRAGA_MATCH,
  SOBRAGA_PASSAGES,
  SOBRAGA_UNTIL,
  SOBRAGA_WITH,
  SOBRAGA_WITHOUT,
} from "../../../lib/learn/clips";
import { playSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, ListenRows, Panel } from "../Explore";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import { type GapItem, GapPassage } from "../GapPassage";
import { Aside, LessonView, Prose } from "../LessonView";
import type { Glossary } from "../lesson-context";
import { Match, type MatchPair } from "../Match";
import { Morph, type MorphChain } from "../Morph";
import { type PassageQuestion, Reading } from "../Passage";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { Playing } from "../Sound";
import { Word } from "../Word";

const SLUG = "sobraga-rahata";
/** A clip by what it says. */
const src = (text: string) => clipUrl(SLUG, clipId(text));

/** What each sentence means, by what it says. */
const MEANS: Record<string, MessageDescriptor> = {
  "Mari tuleb sõbraga.": msg`Mari is coming with a friend.`,
  "Ma räägin emaga.": msg`I’m talking with Mum.`,
  "Ma lähen bussiga tööle.": msg`I go to work by bus.`,
  "Jaan tuleb rongiga.": msg`Jaan is coming by train.`,
  "Kellega sa räägid?": msg`Who are you talking with?`,
  "Kohv piimaga, palun.": msg`A coffee with milk, please.`,
  "Kohv piimata, palun.": msg`A coffee without milk, please.`,
  "Tee suhkruga, palun.": msg`A tea with sugar, please.`,
  "Tee suhkruta, palun.": msg`A tea without sugar, please.`,
  "Tee sidruniga, palun.": msg`A tea with lemon, please.`,
  "Tee sidrunita, palun.": msg`A tea without lemon, please.`,
  "Ma olen täna autoga.": msg`I have my car today.`,
  "Ma olen täna autota.": msg`I don’t have my car today.`,
  "Ma töötan kella viieni.": msg`I work until five.`,
  "Buss läheb Tartuni.": msg`The bus goes as far as Tartu.`,
  "Homseni!": msg`See you tomorrow.`,
  "Nägemiseni!": msg`Goodbye.`,
  "Kati on arst.": msg`Kati is a doctor.`,
  "Kati töötab arstina.": msg`Kati works as a doctor.`,
  "Mari on õpetaja.": msg`Mari is a teacher.`,
  "Mari töötab õpetajana.": msg`Mari works as a teacher.`,
  "Jaan on kokk.": msg`Jaan is a cook.`,
  "Jaan töötab kokana.": msg`Jaan works as a cook.`,
  "Lapsena elas Mari Tartus.": msg`As a child, Mari lived in Tartu.`,
};

const GLOSSARY: Glossary = {
  sõbraga: { en: msg`with a friend` },
  sõber: { en: msg`friend` },
  sõbra: { en: msg`friend’s, of a friend`, note: msg`The genitive of sõber.` },
  emaga: { en: msg`with Mum` },
  bussiga: { en: msg`by bus` },
  rongiga: { en: msg`by train`, note: msg`From rong, train.` },
  kelle: { en: msg`whose`, note: msg`The genitive of kes, who.` },
  "kellega?": { en: msg`with whom?`, show: "Kellega?" },
  piimaga: { en: msg`with milk`, note: msg`From piim, milk.` },
  piimata: { en: msg`without milk` },
  suhkur: { en: msg`sugar` },
  suhkru: { en: msg`of sugar`, note: msg`The genitive of suhkur: the u moves.` },
  suhkruta: { en: msg`without sugar` },
  rahata: { en: msg`without money`, note: msg`From raha, money.` },
  ilma: { en: msg`without`, note: msg`Before a -ta form, to stress the without.` },
  "ilma suhkruta": { en: msg`without sugar` },
  tartuni: { en: msg`as far as Tartu`, show: "Tartuni" },
  "kella viieni": { en: msg`until five o’clock` },
  "homseni!": { en: msg`see you tomorrow`, note: msg`Word for word, “until tomorrow”.` },
  "nägemiseni!": { en: msg`goodbye`, note: msg`Word for word, “until seeing”.` },
  "kati töötab arstina": { en: msg`Kati works as a doctor`, show: "Kati töötab arstina" },
  arst: { en: msg`doctor` },
  arsti: { en: msg`doctor’s, of a doctor`, note: msg`The genitive of arst.` },
  arstina: { en: msg`as a doctor` },
  lapsena: { en: msg`as a child`, note: msg`From laps, child; its genitive is lapse.` },
  "lapsena elas mari tartus": {
    en: msg`As a child, Mari lived in Tartu.`,
    show: "Lapsena elas Mari Tartus",
  },
  pood: { en: msg`shop` },
  poe: { en: msg`shop’s, of a shop`, note: msg`The genitive of pood.` },
  poeni: { en: msg`as far as the shop` },
  poodi: { en: msg`into the shop`, note: msg`The short form for into, from pood.` },
  kooli: { en: msg`into school, to school`, note: msg`Also the genitive of kool.` },
  kohvikus: { en: msg`in a café` },
  mulle: { en: msg`for me, to me`, note: msg`In an order: mulle üks kohv, a coffee for me.` },
  kohv: { en: msg`coffee` },
  kohvi: { en: msg`coffee`, note: msg`The partitive of kohv, after a verb such as joob or tahab.` },
  palun: { en: msg`please` },
  joob: { en: msg`drinks`, note: msg`From jooma, to drink.` },
  teed: { en: msg`tea`, note: msg`The partitive of tee, after joob.` },
  sidruniga: { en: msg`with lemon`, note: msg`From sidrun, lemon.` },
  aga: { en: msg`but` },
  tahab: { en: msg`wants`, note: msg`From tahtma, to want.` },
  tuleme: { en: msg`we’re coming`, note: msg`From tulema, to come.` },
  mul: { en: msg`mul on: I have`, note: msg`Mul on aega: I have time.` },
  aega: { en: msg`time`, note: msg`The partitive of aeg, time.` },
  kolmeni: { en: msg`until three`, note: msg`From kolm, three; its genitive is kolme.` },
};

/** Every form in the lesson that carries one of the four endings, to light its ending. */
const CASE_FORMS = new Set([
  "sõbraga",
  "emaga",
  "bussiga",
  "rongiga",
  "kellega",
  "piimaga",
  "piimata",
  "suhkruga",
  "suhkruta",
  "sidruniga",
  "sidrunita",
  "autoga",
  "autota",
  "viieni",
  "tartuni",
  "homseni",
  "nägemiseni",
  "arstina",
  "õpetajana",
  "kokana",
]);

/** A sentence with the ending of its -ga, -ta, -ni or -na word lit. */
function Lit({ text }: { text: string }) {
  return text.split(/(\s+)/).map((part, i) => {
    const word = part.replace(/[!?.,]/g, "");
    if (!CASE_FORMS.has(word.toLowerCase())) return part;
    const cut = word.length - 2;
    return (
      // biome-ignore lint/suspicious/noArrayIndexKey: a sentence's words never reorder
      <span key={i}>
        {word.slice(0, cut)}
        <span className="text-(--form)">{word.slice(cut)}</span>
        {part.slice(word.length)}
      </span>
    );
  });
}

const meaning = (said: string, i18n: I18n) => i18n._(MEANS[said] as MessageDescriptor);

/** One line to tap. Its words swap in when the switch flips. */
function FlipLine({ said, mode }: { said: string; mode: string }) {
  const { i18n } = useLingui();
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
        <Lit text={said} />
        <span
          lang={i18n.locale}
          className="block text-sm font-normal tracking-normal text-ink-muted"
        >
          {meaning(said, i18n)}
        </span>
      </span>
      <span className="grid size-5 shrink-0 place-items-center text-(--form)">
        {playing && <Playing className="h-3" />}
      </span>
    </button>
  );
}

/** The line under a switch: what the switch changed. */
function FlipNote({ mode, title, tip }: { mode: string; title: ReactNode; tip: ReactNode }) {
  return (
    <div aria-live="polite" className="min-h-13">
      <p key={mode} className="learn-swap grid gap-0.5">
        <span className="text-xl font-medium">{title}</span>
        <span className="text-md text-ink-secondary">{tip}</span>
      </p>
    </div>
  );
}

/** Four orders, switched together between -ga and -ta. */
function WithoutFlip() {
  const { t } = useLingui();
  const [without, setWithout] = useState(false);
  const mode = without ? "without" : "with";
  return (
    <Panel>
      <Chips
        label={t`With or without`}
        items={[
          { label: t({ message: "With", context: "with or without" }), value: "with" },
          { label: t({ message: "Without", context: "with or without" }), value: "without" },
        ]}
        value={mode}
        onPick={(value) => setWithout(value === "without")}
      />
      <div className="grid gap-1.5 sm:grid-cols-2">
        {SOBRAGA_WITHOUT.map((line) => (
          <FlipLine key={line.id} said={without ? line.without : line.with} mode={mode} />
        ))}
      </div>
      {without ? (
        <FlipNote
          mode={mode}
          title={
            <Trans>
              <span lang="et">-ta</span> is without
            </Trans>
          }
          tip={
            <Trans>
              On the same genitive: <span lang="et">suhkru</span>, <span lang="et">suhkruta</span>.
            </Trans>
          }
        />
      ) : (
        <FlipNote
          mode={mode}
          title={
            <Trans>
              <span lang="et">-ga</span> is with
            </Trans>
          }
          tip={
            <Trans>
              On the genitive: <span lang="et">suhkru</span>, <span lang="et">suhkruga</span>.
            </Trans>
          }
        />
      )}
    </Panel>
  );
}

/** Three people, switched together between what they are and what they work as. */
function AsFlip() {
  const { t } = useLingui();
  const [as, setAs] = useState(false);
  const mode = as ? "as" : "is";
  return (
    <Panel>
      <Chips
        label={t`Is or works as`}
        items={[
          { label: t({ message: "Is", context: "is a doctor" }), value: "is" },
          { label: t({ message: "Works as", context: "works as a doctor" }), value: "as" },
        ]}
        value={mode}
        onPick={(value) => setAs(value === "as")}
      />
      <div className="grid gap-1.5">
        {SOBRAGA_AS.map((line) => (
          <FlipLine key={line.id} said={as ? line.as : line.is} mode={mode} />
        ))}
      </div>
      {as ? (
        <FlipNote
          mode={mode}
          title={
            <Trans>
              <span lang="et">-na</span> on the genitive
            </Trans>
          }
          tip={
            <Trans>
              <span lang="et">Kokk</span> has the genitive <span lang="et">koka</span>, so as a cook
              is <span lang="et">kokana</span>.
            </Trans>
          }
        />
      ) : (
        <FlipNote
          mode={mode}
          title={<Trans>The job alone</Trans>}
          tip={
            <Trans>
              After <span lang="et">on</span>, is, the job keeps the form a dictionary lists first:{" "}
              <span lang="et">Jaan on kokk</span>.
            </Trans>
          }
        />
      )}
    </Panel>
  );
}

/** “With or without?”: each order heard with -ga and with -ta, keyed by which. */
export const HEARD = SOBRAGA_WITHOUT.flatMap((line) =>
  (["with", "without"] as const).map((kind) => ({
    line: line.id,
    said: kind === "with" ? line.with : line.without,
    twin: kind === "with" ? line.without : line.with,
    pair: [kind, `${line.id}-${kind}`] as const,
  })),
);

/** Every sentence the quiz can say, to draw a third option from. */
const HEARD_SAID = HEARD.map(({ said }) => said);

/** The answer, its twin with the other ending, and one more from another line, in random order. */
export function threeOrders(said: string, twin: string): string[] {
  const others = HEARD_SAID.filter((each) => each !== said && each !== twin);
  return shuffle([said, twin, ...shuffle(others).slice(0, 1)]);
}

type HeardItem = ChoiceItem & { said: string; twin: string; pair: readonly [string, string] };

const orderOptions = (options: readonly string[], i18n: I18n) =>
  options.map((option) => ({
    id: option,
    label: <span lang={i18n.locale}>{meaning(option, i18n)}</span>,
  }));

/** The sentence and its meaning, after an answer. */
function Explain({ said }: { said: string }) {
  const { i18n } = useLingui();
  return (
    <>
      <span lang="et" className="font-medium text-ink">
        {said}
      </span>{" "}
      {meaning(said, i18n)}
    </>
  );
}

/** What each form to match means. */
const MATCH_MEANS: Record<(typeof SOBRAGA_MATCH)[number], MessageDescriptor> = {
  lapsena: msg`as a child`,
  lapsega: msg`with a child`,
  piimata: msg`without milk`,
  piimaga: msg`with milk`,
  bussini: msg`as far as the bus`,
  bussiga: msg`by bus`,
};

/** What each word to build a form of means, and what the form says. */
const FORM_MEANS: Record<
  (typeof SOBRAGA_FORMS)[number]["id"],
  { word: MessageDescriptor; cue: MessageDescriptor }
> = {
  buss: { word: msg`bus`, cue: msg`by bus` },
  raamat: { word: msg`book`, cue: msg`with a book` },
  piim: { word: msg`milk`, cue: msg`without milk` },
  sidrun: { word: msg`lemon`, cue: msg`without lemon` },
  kool: { word: msg`school`, cue: msg`as far as the school` },
  jogi: { word: msg`river`, cue: msg`as far as the river` },
  arst: { word: msg`doctor`, cue: msg`as a doctor` },
  kokk: { word: msg`cook`, cue: msg`as a cook` },
};

type FormQuizItem = FormItem & { pair: readonly [string, string] };

/** Words whose genitive changes inside, so the quiz shows it: jõgi, jõe; kokk, koka. */
const CHANGES_INSIDE = new Set<string>(["jogi", "kokk"]);

/** Kati’s message with a gap for each form, cut from `SOBRAGA_PASSAGES.kati`. */
const KATI_GAPS: readonly GapItem[] = [
  {
    id: "arstina",
    before: "Tere, Mari! Ma töötan haiglas",
    after: ".",
    answer: "arstina",
    options: ["arstini", "arstina", "arstita"],
  },
  {
    id: "rongiga",
    before: "Ma lähen tööle",
    after: ".",
    answer: "rongiga",
    options: ["rongiga", "rongina", "rongini"],
  },
  {
    id: "neljani",
    before: "Ma töötan kella",
    after: ".",
    answer: "neljani",
    options: ["neljaga", "neljana", "neljani"],
  },
  {
    id: "piimata",
    before: "Ma ei joo piima. Ma joon kohvi",
    after: ".",
    answer: "piimata",
    options: ["piimaga", "piimata", "piimani"],
  },
  {
    id: "homseni",
    before: "",
    after: "!",
    answer: "Homseni",
    options: ["Homseni", "Homsega", "Homseta"],
  },
];

function useContent() {
  const { t } = useLingui();
  const why: Record<string, ReactNode> = {
    arstina: (
      <Trans>
        Her job: <span lang="et">-na</span>, as a doctor.
      </Trans>
    ),
    rongiga: (
      <Trans>
        How she gets to work: <span lang="et">-ga</span>, by train.
      </Trans>
    ),
    neljani: (
      <Trans>
        Until when: <span lang="et">-ni</span>, until four.
      </Trans>
    ),
    piimata: (
      <Trans>
        She doesn’t drink milk, so <span lang="et">-ta</span>: without milk.
      </Trans>
    ),
    homseni: (
      <Trans>
        A goodbye with <span lang="et">-ni</span>: see you tomorrow.
      </Trans>
    ),
  };
  const gaps = KATI_GAPS.map((gap) => ({ ...gap, why: why[gap.id] }));
  // Each right answer sits in its own place: first, second, third, then first again. In the first
  // three, a wrong option shares a half with each of the others, so picking the middle one fails.
  const cafe: PassageQuestion[] = [
    {
      id: "coffee",
      ask: t`How does Mari want her coffee?`,
      options: [
        { id: "milk", label: t`With milk` },
        { id: "no-milk", label: t`Without milk` },
        { id: "no-sugar", label: t`Without sugar` },
      ],
      answer: "milk",
      line: 1,
    },
    {
      id: "peeter",
      ask: t`What does Peeter drink?`,
      options: [
        { id: "sugar", label: t`Tea with sugar and no lemon` },
        { id: "lemon", label: t`Tea with lemon and no sugar` },
        { id: "coffee", label: t`Coffee with sugar and no lemon` },
      ],
      answer: "lemon",
      line: 2,
    },
    {
      id: "jaan",
      ask: t`What does Jaan want?`,
      options: [
        { id: "milk", label: t`Coffee with milk` },
        { id: "tea", label: t`Tea with milk` },
        { id: "no-milk", label: t`Coffee without milk` },
      ],
      answer: "no-milk",
      line: 3,
    },
    {
      id: "time",
      ask: t`How long can Mari stay?`,
      options: [
        { id: "until", label: t`Until three` },
        { id: "from", label: t`From three on` },
        { id: "hours", label: t`For three hours` },
      ],
      answer: "until",
      line: 5,
    },
  ];
  return { gaps, cafe };
}

export function SobragaRahataLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const clock = lessonBySlug("kell")?.n;
  const threeForms = LESSONS.find((lesson) => lesson.et === "Kolm põhivormi")?.n;
  const genitive = LESSONS.find((lesson) => lesson.et === "Minu raamat")?.n;
  const past = LESSONS.find((lesson) => lesson.et === "Lihtminevik")?.n;
  const times = LESSONS.find((lesson) => lesson.et === "Esmaspäeval, aasta pärast")?.n;
  const into = LESSONS.find((lesson) => lesson.et === "Majas, majja, majast")?.n;

  const heardItems = useMemo<HeardItem[]>(() => {
    // The page opens on a -ta order, its answer second.
    const first = HEARD.find(({ said }) => said === "Tee suhkruta, palun.");
    const rest = HEARD.filter((each) => each !== first);
    return [...(first ? [first] : []), ...rest].map(({ said, twin, pair }, i) => {
      const other = HEARD_SAID.find((each) => each !== said && each !== twin) as string;
      const turn = (i + 2) % 3;
      const three = [said, twin, other];
      return {
        said,
        twin,
        pair,
        src: src(said),
        answer: said,
        options: orderOptions([...three.slice(turn), ...three.slice(0, turn)], i18n),
        explain: <Explain said={said} />,
      };
    });
  }, [i18n]);

  // Every round but the first draws its third order afresh and shuffles, so no place or set
  // gives the answer away.
  const heardRun = (items: readonly HeardItem[], pinned?: HeardItem): HeardItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned
        ? item
        : { ...item, options: orderOptions(threeOrders(item.said, item.twin), i18n) },
    );

  const chainSteps: Record<string, { label: string; note: ReactNode }[]> = {
    sober: [
      { label: t`friend`, note: null },
      {
        label: t`genitive`,
        note: (
          <Trans>
            The genitive: the <span lang="et">e</span> drops, and an <span lang="et">a</span> goes
            on the end.
          </Trans>
        ),
      },
      {
        label: t`with a friend`,
        note: (
          <Trans>
            <span lang="et">-ga</span> on the genitive.
          </Trans>
        ),
      },
    ],
    laps: [
      { label: t`child`, note: null },
      {
        label: t`genitive`,
        note: (
          <Trans>
            The genitive: an <span lang="et">e</span> goes on the end.
          </Trans>
        ),
      },
      {
        label: t`as a child`,
        note: (
          <Trans>
            <span lang="et">-na</span> on the genitive.
          </Trans>
        ),
      },
    ],
    suhkur: [
      { label: t`sugar`, note: null },
      {
        label: t`genitive`,
        note: (
          <Trans>
            The genitive: the <span lang="et">u</span> moves to the end.
          </Trans>
        ),
      },
      {
        label: t`without sugar`,
        note: (
          <Trans>
            <span lang="et">-ta</span> on the genitive.
          </Trans>
        ),
      },
    ],
    pood: [
      { label: t`shop`, note: null },
      {
        label: t`genitive`,
        note: (
          <Trans>
            The genitive: <span lang="et">od</span> becomes <span lang="et">e</span>.
          </Trans>
        ),
      },
      {
        label: t`as far as the shop`,
        note: (
          <Trans>
            <span lang="et">-ni</span> on the genitive.
          </Trans>
        ),
      },
    ],
  };
  const chains: MorphChain[] = SOBRAGA_CHAINS.map((chain) => ({
    id: chain.id,
    steps: chain.steps.map((word, i) => ({
      word,
      label: chainSteps[chain.id]?.[i]?.label ?? "",
      note: chainSteps[chain.id]?.[i]?.note ?? undefined,
      src: src(word),
    })),
  }));

  const matchPairs: MatchPair[] = SOBRAGA_MATCH.map((form) => ({
    id: clipId(form),
    left: form,
    right: i18n._(MATCH_MEANS[form]),
    src: src(form),
  }));

  // Typed, so no option gives the form away. The genitive is shown only where it changes inside.
  const formItems = useMemo<FormQuizItem[]>(
    () =>
      SOBRAGA_FORMS.map(({ id, base, genitive, ending }) => {
        const form = `${genitive}${ending}`;
        const means = FORM_MEANS[id];
        return {
          base,
          gloss: CHANGES_INSIDE.has(id) ? (
            <Trans>
              {i18n._(means.word)}; genitive <span lang="et">{genitive}</span>
            </Trans>
          ) : (
            i18n._(means.word)
          ),
          cue: i18n._(means.cue),
          answers: [form],
          src: src(form),
          pair: [ending, id] as const,
          explain: (
            <Trans>
              <span lang="et">-{ending}</span> on the genitive <span lang="et">{genitive}</span>.
            </Trans>
          ),
        };
      }),
    [i18n],
  );

  // The gaps’ words are shuffled after the page loads, so no place holds the answer.
  const [gaps, setGaps] = useState<readonly GapItem[]>(content.gaps);
  // biome-ignore lint/correctness/useExhaustiveDependencies: shuffled once, as the page loads
  useEffect(() => {
    setGaps(content.gaps.map((gap) => ({ ...gap, options: shuffle(gap.options ?? []) })));
  }, []);

  const rows = (list: readonly string[]) =>
    list.map((said) => ({ main: <Lit text={said} />, sub: meaning(said, i18n), src: src(said) }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          For with, without, until and as in a role, Estonian adds an ending:{" "}
          <span lang="et">-ga</span>, <span lang="et">-ta</span>, <span lang="et">-ni</span> or{" "}
          <span lang="et">-na</span>. Each goes on the genitive: <span lang="et">sõbraga</span> is
          with a friend, and <span lang="et">rahata</span> is without money.
        </Trans>
      }
      facts={[
        <Trans key="m">14 minutes</Trans>,
        <Trans key="q">3 quizzes, a message to read and one to fill in</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "sõbraga",
        "bussiga",
        "kellega?",
        "piimata",
        "rahata",
        "ilma",
        "kella viieni",
        "tartuni",
        "homseni!",
        "nägemiseni!",
        "arstina",
        "lapsena",
      ]}
      recap={[
        <Trans key="1">
          <b lang="et">-ga</b> is with, and by for how you travel: <b lang="et">sõbraga</b>, with a
          friend; <b lang="et">bussiga</b>, by bus. <b lang="et">Kellega?</b> asks with whom.
        </Trans>,
        <Trans key="2">
          <b lang="et">-ta</b> is without: <b lang="et">kohv piimata</b>, coffee without milk.{" "}
          <b lang="et">Ilma</b> before it stresses it.
        </Trans>,
        <Trans key="3">
          <b lang="et">-ni</b> is until or as far as: <b lang="et">kella viieni</b>, until five;{" "}
          <b lang="et">Tartuni</b>, as far as Tartu; <b lang="et">Homseni!</b>, see you tomorrow.
        </Trans>,
        <Trans key="4">
          <b lang="et">-na</b> is as, in a role: <b lang="et">Kati töötab arstina</b>, Kati works as
          a doctor; <b lang="et">lapsena</b>, as a child.
        </Trans>,
        <Trans key="5">
          All four go on the genitive, so its changes stay: <b lang="et">sõber, sõbra, sõbraga</b>;{" "}
          <b lang="et">pood, poe, poeni</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "with",
          title: t`With someone or something`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Sõbraga" /> is with a friend. To say with, Estonian adds{" "}
                    <span lang="et">-ga</span> to the genitive from lesson {genitive}:{" "}
                    <Word w="sõber" />, <Word w="sõbra" />, <span lang="et">sõbraga</span>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The same ending says how you travel, so by bus is <Word w="bussiga" />. To ask
                    with whom, put it on <Word w="kelle" />, whose: <Word w="Kellega?" /> Tap a line
                    to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(SOBRAGA_WITH)} />
            </>
          ),
        },
        {
          id: "without",
          title: t`Without`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <span lang="et">-ta</span> is the opposite of <span lang="et">-ga</span>.{" "}
                    <Word w="Piimaga" /> is with milk, and <Word w="piimata" /> is without milk. It
                    goes on the same genitive: <Word w="suhkur" />, <Word w="suhkru" />,{" "}
                    <Word w="suhkruta" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Switch between With and Without, and tap a line to hear it. Only the ending
                    changes.
                  </Trans>
                </p>
              </Prose>
              <WithoutFlip />
              <Aside>
                <Trans>
                  You’ll also hear <Word w="ilma" /> before the word: <Word w="ilma suhkruta" />,
                  without sugar. <span lang="et">Ilma</span> stresses the without, and the ending
                  stays.
                </Trans>
              </Aside>
              <Prose>
                <p>
                  <Trans>
                    Now hear a line and pick what it means. Listen to how the word ends.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="with-or-without"
                title={<Trans>With or without?</Trans>}
                items={heardItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>
                      All of them. You told <span lang="et">-ga</span> from{" "}
                      <span lang="et">-ta</span> every time.
                    </Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed and listen to the ending.</Trans>
                  ) : (
                    <Trans>Switch between With and Without above once more, then try again.</Trans>
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
          id: "until",
          title: t`Until and as far as`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <span lang="et">-ni</span> says how far, in place or in time:{" "}
                    <Word w="Tartuni" /> is as far as Tartu. It marks where the way stops. Going
                    into a place is still <Word w="poodi" /> or <Word w="kooli" /> from lesson{" "}
                    {into}.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    With the clock from lesson {clock} it means until: <Word w="kella viieni" />,
                    until five. Learn it as a phrase for now: lesson {times} does from and until
                    with the clock.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Two goodbyes end in <span lang="et">-ni</span> too. <Word w="Homseni!" /> is see
                    you tomorrow, and <Word w="Nägemiseni!" /> is goodbye. Tap a line to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows items={rows(SOBRAGA_UNTIL)} />
            </>
          ),
        },
        {
          id: "as",
          title: t`As a doctor, as a child`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <span lang="et">-na</span> says in what role: <Word w="Kati töötab arstina" />{" "}
                    is Kati works as a doctor. The job takes the genitive first: <Word w="arst" />,{" "}
                    <Word w="arsti" />, <Word w="arstina" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    It also says what someone was at a time: <Word w="lapsena" />, as a child. In{" "}
                    <Word w="Lapsena elas Mari Tartus" />, <span lang="et">elas</span> is the past
                    tense from lesson {past}.
                  </Trans>
                </p>
                <p>
                  <Trans>Switch between Is and Works as, and tap a line to hear it.</Trans>
                </p>
              </Prose>
              <AsFlip />
            </>
          ),
        },
        {
          id: "which-ending",
          title: t`Four endings, four meanings`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Match each form with what it means. Two words come twice, so read the ending.
                  </Trans>
                </p>
              </Prose>
              <Match
                id="which-ending"
                title={<Trans>What does it mean?</Trans>}
                pairs={matchPairs}
              />
            </>
          ),
        },
        {
          id: "genitive",
          title: t`Built on the genitive`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    All four endings go on the genitive, the second form a dictionary gives (lesson{" "}
                    {threeForms}). When the genitive changes inside, the new form keeps the change:{" "}
                    <Word w="pood" />, <Word w="poe" />, <Word w="poeni" />, as far as the shop.
                  </Trans>
                </p>
                <p>
                  <Trans>Pick a word, then tap its forms to watch it change.</Trans>
                </p>
              </Prose>
              <Panel>
                <Morph label={t`Words`} chains={chains} />
              </Panel>
              <Prose>
                <p>
                  <Trans>
                    Now build the forms: put the ending the cue asks for on the genitive. Where the
                    genitive changes inside, the word shows it.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="build-the-form"
                title={<Trans>Build the form</Trans>}
                items={formItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them, each ending on its genitive.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Nearly. Check which ending the cue asks for, then put it on the genitive.
                    </Trans>
                  ) : (
                    <Trans>Tap the words above once more, then try again.</Trans>
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
          id: "cafe",
          title: t`Ordering at a café`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari is on her way to meet Kati at a café, and texts her the order. Read it and
                    answer. Once you’ve answered, tap a word to see what it means.
                  </Trans>
                </p>
              </Prose>
              <Reading
                id="cafe-order"
                title={<Trans>What does everyone want?</Trans>}
                by={t`Mari writes`}
                clip="p-cafe"
                sentences={SOBRAGA_PASSAGES.cafe}
                questions={content.cafe}
              />
            </>
          ),
        },
        {
          id: "message",
          title: t`Kati’s message`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Kati tells Mari about her job in a message. Pick the word for each gap: the
                    sentence around it says which ending fits.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="kati-message"
                title={<Trans>Fill the gaps</Trans>}
                gaps={gaps}
                mode="pick"
                clip="p-kati"
              />
            </>
          ),
        },
      ]}
    />
  );
}
