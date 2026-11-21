import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { CornerDownRight } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { LESSONS, lessonBySlug } from "../../../lib/learn/catalogue";
import {
  clipId,
  clipUrl,
  counted,
  OSASTAV_AMOUNTS,
  OSASTAV_COUNT,
  OSASTAV_COUNTED,
  OSASTAV_EXCHANGES,
  OSASTAV_NO,
  OSASTAV_PASSAGES,
  OSASTAV_SOME,
  PARTITIVE_NOUNS,
  type PartitiveNoun,
} from "../../../lib/learn/clips";
import { playSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, type KeyItem, Keys, Panel } from "../Explore";
import { type GapItem as PassageGap, GapPassage } from "../GapPassage";
import { Aside, LessonView, Prose } from "../LessonView";
import type { Glossary } from "../lesson-context";
import { Listening, type PassageQuestion } from "../Passage";
import { type GapItem, GapRound, Quiz } from "../Quiz";
import { PlayMark } from "../Sound";
import { Word } from "../Word";

const SLUG = "osastav";
/** A clip of this lesson by what it says. */
const src = (text: string) => clipUrl(SLUG, clipId(text));

const NOUN_MEANS: Record<PartitiveNoun, MessageDescriptor> = {
  kass: msg`cat`,
  raamat: msg`book`,
  laps: msg`child`,
  auto: msg`car`,
  maja: msg`house`,
  euro: msg`euro`,
  kool: msg`school`,
  mees: msg`man`,
  kohv: msg`coffee`,
  vesi: msg`water`,
  juust: msg`cheese`,
  leib: msg`bread`,
  piim: msg`milk`,
  raha: msg`money`,
  aeg: msg`time`,
  kohvik: msg`café`,
};

/** What each phrase and sentence means, by what it says. */
const MEANS: Record<string, MessageDescriptor> = {
  "üks kass": msg`one cat`,
  "kaks kassi": msg`two cats`,
  "kolm kassi": msg`three cats`,
  "viis kassi": msg`five cats`,
  "üks raamat": msg`one book`,
  "kaks raamatut": msg`two books`,
  "viis raamatut": msg`five books`,
  "üks laps": msg`one child`,
  "kaks last": msg`two children`,
  "kolm last": msg`three children`,
  "viis last": msg`five children`,
  "üks auto": msg`one car`,
  "kaks autot": msg`two cars`,
  "viis autot": msg`five cars`,
  "üks maja": msg`one house`,
  "kaks maja": msg`two houses`,
  "viis maja": msg`five houses`,
  "üks euro": msg`one euro`,
  "kaks eurot": msg`two euros`,
  "viis eurot": msg`five euros`,
  "kümme eurot": msg`ten euros`,
  "üks kool": msg`one school`,
  "neli kooli": msg`four schools`,
  "üks mees": msg`one man`,
  "viis meest": msg`five men`,
  "Mitu last sul on?": msg`How many children do you have?`,
  "Mul on kaks last.": msg`I have two children.`,
  "Mitu kassi teil on?": msg`How many cats do you have?`,
  "Meil on üks kass.": msg`We have one cat.`,
  "Kui palju see maksab?": msg`How much does it cost?`,
  "Viis eurot.": msg`Five euros.`,
  "tass kohvi": msg`a cup of coffee`,
  "klaas vett": msg`a glass of water`,
  "kilo juustu": msg`a kilo of cheese`,
  "natuke piima": msg`a little milk`,
  "palju raha": msg`a lot of money`,
  "vähe aega": msg`not much time`,
  "Mul on kass.": msg`I have a cat.`,
  "Mul pole kassi.": msg`I don’t have a cat.`,
  "Sul on auto.": msg`You have a car.`,
  "Sul pole autot.": msg`You don’t have a car.`,
  "Tal on laps.": msg`He or she has a child.`,
  "Tal pole last.": msg`He or she doesn’t have a child.`,
  "Neil on maja.": msg`They have a house.`,
  "Neil pole maja.": msg`They don’t have a house.`,
  "Laual on leib.": msg`There’s bread on the table.`,
  "Laual pole leiba.": msg`There’s no bread on the table.`,
  "Linnas on kohvik.": msg`There’s a café in town.`,
  "Linnas pole kohvikut.": msg`There’s no café in town.`,
  "Ma joon kohvi.": msg`I drink coffee.`,
  "Ta joob vett.": msg`He or she drinks water.`,
  "Me sööme leiba.": msg`We eat bread.`,
  "Nad söövad juustu.": msg`They eat cheese.`,
  "Ma tahan piima.": msg`I want some milk.`,
  "Kohvi, palun.": msg`Coffee, please.`,
  "Mul ei ole kassi.": msg`I don’t have a cat.`,
  "Üks kohv, palun.": msg`One coffee, please.`,
  "Ma loen raamatut.": msg`I’m reading a book.`,
};

const means = (text: string, i18n: I18n) => {
  const found = MEANS[text];
  return found ? i18n._(found) : "";
};

/** A word or sentence the prose says, keyed as `Word` looks it up, playing its own clip. */
const said = (text: string): Glossary => {
  const en = MEANS[text];
  if (!en) throw new Error(`No meaning for ${text}`);
  const key = text.toLowerCase();
  // A sentence keeps its capital wherever it appears; a phrase shows as the prose writes it.
  return { [key]: key === text ? { en } : { en, show: text } };
};

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    (Object.keys(MEANS) as string[]).flatMap((text) => Object.entries(said(text))),
  ),
  kass: { en: msg`cat`, note: msg`Kass, kassi, kassi.` },
  kassi: { en: msg`cat`, note: msg`The third form of kass, the partitive.` },
  raamat: { en: msg`book`, note: msg`Raamat, raamatu, raamatut.` },
  laps: { en: msg`child`, note: msg`Laps, lapse, last.` },
  last: { en: msg`child`, note: msg`The third form of laps.` },
  maja: { en: msg`house`, note: msg`Maja, maja, maja: all three forms look alike.` },
  kohv: { en: msg`coffee`, note: msg`Kohv, kohvi, kohvi.` },
  kohvi: { en: msg`coffee`, note: msg`The third form of kohv.` },
  vesi: { en: msg`water`, note: msg`Vesi, vee, vett.` },
  vett: { en: msg`water`, note: msg`The third form of vesi.` },
  juust: { en: msg`cheese`, note: msg`Juust, juustu, juustu.` },
  juustu: { en: msg`cheese`, note: msg`The third form of juust.` },
  leib: { en: msg`bread`, note: msg`Leib, leiva, leiba.` },
  leiba: { en: msg`bread`, note: msg`The third form of leib.` },
  piim: { en: msg`milk`, note: msg`Piim, piima, piima.` },
  piima: { en: msg`milk`, note: msg`The third form of piim.` },
  aeg: { en: msg`time`, note: msg`Aeg, aja, aega.` },
  aega: { en: msg`time`, note: msg`The third form of aeg.` },
  mitu: { en: msg`how many` },
  tass: { en: msg`cup` },
  klaas: { en: msg`glass` },
  kilo: { en: msg`kilo` },
  palju: { en: msg`a lot, much, many` },
  natuke: { en: msg`a little` },
  vähe: { en: msg`little, not much` },
  pole: { en: msg`isn’t, aren’t`, note: msg`The short form of ei ole.` },
  tahan: { en: msg`I want`, note: msg`From tahtma, to want.` },
};

/** A form with what it adds to the first form lit: kass → kass·i, laps → la·st. */
function Lit({ base, form }: { base: string; form: string }) {
  let same = 0;
  while (same < base.length && same < form.length && base[same] === form[same]) same++;
  if (same === form.length && base.length === form.length) return <>{form}</>;
  return (
    <>
      {form.slice(0, same)}
      <span className="text-(--form)">{form.slice(same)}</span>
    </>
  );
}

/** A tile or row that plays its words, with what they mean under them. */
function SayButton(props: { text: string; shown: ReactNode; means: string; big?: boolean }) {
  const clip = src(props.text);
  const playing = usePlaying(clip);
  // No aria-label: the words and their meaning are the button's name.
  return (
    <button
      type="button"
      onClick={() => void playSound(clip)}
      className="grid h-full w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-3 ps-4 pe-3 text-start transition-colors duration-150 hoverable:hover:bg-plate-hover"
    >
      <span className="grid min-w-0">
        <span
          key={props.text}
          lang="et"
          className={clsx(
            "learn-swap font-semibold tracking-tight",
            props.big ? "text-xl" : "text-lg max-sm:text-md",
          )}
        >
          {props.shown}
        </span>
        <span className="text-sm text-ink-muted">{props.means}</span>
      </span>
      <PlayMark playing={playing} />
    </button>
  );
}

/** A sentence that plays when tapped, with its meaning under it. */
function Line({ text, reply }: { text: string; reply?: boolean }) {
  const { i18n } = useLingui();
  const clip = src(text);
  const playing = usePlaying(clip);
  return (
    <button
      type="button"
      onClick={() => void playSound(clip)}
      className={clsx(
        "grid w-full cursor-pointer items-center gap-x-3.5 py-2.5 pe-3 text-start transition-colors duration-150 hoverable:hover:bg-plate-hover",
        reply ? "grid-cols-[auto_minmax(0,1fr)_auto] ps-5" : "grid-cols-[minmax(0,1fr)_auto] ps-4",
      )}
    >
      {reply && (
        <CornerDownRight aria-hidden="true" className="size-4 text-ink-faint rtl:-scale-x-100" />
      )}
      <span
        lang="et"
        className={clsx(
          "min-w-0 tracking-tight max-sm:text-lg",
          reply ? "text-lg" : "text-xl font-medium",
        )}
      >
        {text}
        <span
          lang={i18n.locale}
          className="block text-sm font-normal tracking-normal text-ink-muted"
        >
          {means(text, i18n)}
        </span>
      </span>
      <PlayMark playing={playing} />
    </button>
  );
}

/** One, two or five, over six nouns: each tile shows the noun in the form the number asks for. */
function CountSwitch() {
  const { t, i18n } = useLingui();
  const [number, setNumber] = useState<string>("üks");
  return (
    <Panel>
      <Chips
        label={t`How many`}
        items={OSASTAV_COUNT.numbers.map((each) => ({ label: each, value: each, lang: "et" }))}
        value={number}
        onPick={setNumber}
      />
      <ul className="m-0 grid list-none grid-cols-2 overflow-hidden rounded-lg bg-plate p-0 ring-1 ring-edge sm:grid-cols-3">
        {OSASTAV_COUNT.nouns.map((noun) => {
          const text = counted(number, noun);
          const form = number === "üks" ? noun : PARTITIVE_NOUNS[noun];
          return (
            <li key={noun} className="border-b border-edge">
              <SayButton
                text={text}
                big
                shown={
                  <>
                    <span className="font-normal text-ink-secondary">{number}</span>{" "}
                    <Lit base={noun} form={form} />
                  </>
                }
                means={means(text, i18n)}
              />
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="text-md text-ink-secondary">
        {number === "üks" ? (
          <Trans>
            After <b lang="et">üks</b>, each noun keeps its first form. Pick{" "}
            <b lang="et">kaks</b> and watch the endings.
          </Trans>
        ) : (
          <Trans>
            From two up, each noun takes its third form. <b lang="et">Maja</b> looks the same,
            since its third form is <b lang="et">maja</b> too.
          </Trans>
        )}
      </p>
    </Panel>
  );
}

/** Yes or no over six sentences: what isn't there takes its third form. */
function NoSwitch() {
  const { t, i18n } = useLingui();
  const [no, setNo] = useState(false);
  return (
    <Panel>
      <Chips
        label={t`Yes or no`}
        items={[
          { label: "on", value: "on", lang: "et" },
          { label: "pole", value: "pole", lang: "et" },
        ]}
        value={no ? "pole" : "on"}
        onPick={(value) => setNo(value === "pole")}
      />
      <ul className="m-0 grid list-none overflow-hidden rounded-lg bg-plate p-0 ring-1 ring-edge sm:grid-cols-2">
        {OSASTAV_NO.map((row) => {
          const text = no ? row.no : row.yes;
          const form = no ? PARTITIVE_NOUNS[row.noun] : row.noun;
          const at = text.lastIndexOf(form);
          return (
            <li key={row.noun} className="border-b border-edge">
              <SayButton
                text={text}
                shown={
                  <>
                    {text.slice(0, at)}
                    <Lit base={row.noun} form={form} />
                    {text.slice(at + form.length)}
                  </>
                }
                means={means(text, i18n)}
              />
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="text-md text-ink-secondary">
        {no ? (
          <Trans>
            What isn’t there takes its third form: <b lang="et">kassi, autot, last</b>.{" "}
            <b lang="et">Maja</b> stays <b lang="et">maja</b>.
          </Trans>
        ) : (
          <Trans>
            What someone has, or what is there, keeps its first form. Pick{" "}
            <b lang="et">pole</b> to say it isn’t there.
          </Trans>
        )}
      </p>
    </Panel>
  );
}

type CountItem = GapItem & { text: string; pair: readonly [string, string] };

/** A count's two forms in a random order, so neither sits in one place. */
const twoForms = (noun: PartitiveNoun) => shuffle([noun, PARTITIVE_NOUNS[noun]]);

/** The first run as the server draws it: the answer first, second, first… */
export const COUNT_ITEMS: readonly {
  noun: PartitiveNoun;
  number: string;
  options: readonly string[];
}[] = OSASTAV_COUNTED.flatMap(({ noun, number }, i) => {
  const forms = [noun, PARTITIVE_NOUNS[noun]] as const;
  return [
    { noun, number, options: i % 2 ? [forms[1], forms[0]] : forms },
    { noun, number: "üks", options: i % 2 ? forms : [forms[1], forms[0]] },
  ];
});

/** Keyed by the noun, so a run meets six nouns, each with üks or a bigger number. */
export function countRun(items: readonly CountItem[], pinned?: CountItem): CountItem[] {
  return eachPairFirst(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: twoForms(item.pair[0] as PartitiveNoun) },
  );
}

function useContent() {
  const { t } = useLingui();
  const gaps: PassageGap[] = [
    {
      id: "juustu",
      before: "Täna on laupäev ja Mari on turul. Ta tahab kilo",
      after: "",
      answer: "juustu",
      options: ["juust", "juustu"],
      why: (
        <Trans>
          After an amount, the third form: <b lang="et">kilo juustu</b>.
        </Trans>
      ),
    },
    {
      id: "piima",
      before: "ja natuke",
      after: ".",
      answer: "piima",
      options: ["piima", "piim"],
      why: (
        <Trans>
          <b lang="et">Natuke</b> is an amount too: <b lang="et">natuke piima</b>.
        </Trans>
      ),
    },
    {
      id: "eurot",
      before: "Juust maksab seitse",
      after: ".",
      answer: "eurot",
      options: ["euro", "eurot"],
      why: (
        <Trans>
          After a number from two up, the third form: <b lang="et">seitse eurot</b>.
        </Trans>
      ),
    },
    {
      id: "leiba",
      before: "Turul pole täna",
      after: ".",
      answer: "leiba",
      options: ["leiba", "leib"],
      why: (
        <Trans>
          After <b lang="et">pole</b>, what isn’t there takes the third form:{" "}
          <b lang="et">pole leiba</b>.
        </Trans>
      ),
    },
    {
      id: "kohvi",
      before: "Mari joob kohvikus",
      after: ".",
      answer: "kohvi",
      options: ["kohv", "kohvi"],
      why: (
        <Trans>
          She drinks coffee without counting it: <b lang="et">joob kohvi</b>.
        </Trans>
      ),
    },
    {
      id: "kass",
      before: "Kohvikus on üks",
      after: ".",
      answer: "kass",
      options: ["kass", "kassi"],
      why: (
        <Trans>
          After <b lang="et">üks</b>, the first form: <b lang="et">üks kass</b>.
        </Trans>
      ),
    },
    {
      id: "kassi",
      before: "Maril on kodus kaks",
      after: ".",
      answer: "kassi",
      options: ["kass", "kassi"],
      why: (
        <Trans>
          After <b lang="et">kaks</b>, the third form: <b lang="et">kaks kassi</b>.
        </Trans>
      ),
    },
  ];
  // Answers keep a fixed order, so each right answer sits in its own place.
  const voice: PassageQuestion[] = [
    {
      id: "cheese",
      ask: t`How much is a kilo of cheese?`,
      options: [
        { id: "eighteen", label: t`€18` },
        { id: "eight", label: t`€8` },
        { id: "seven", label: t`€7` },
      ],
      answer: "eight",
      line: 2,
    },
    {
      id: "milk",
      ask: t`How much is the milk?`,
      options: [
        { id: "one", label: t`€1` },
        { id: "two", label: t`€2` },
        { id: "ten", label: t`€10` },
      ],
      answer: "one",
      line: 3,
    },
    {
      id: "none",
      ask: t`What is there none of today?`,
      options: [
        { id: "cheese", label: t`Cheese` },
        { id: "milk", label: t`Milk` },
        { id: "bread", label: t`Bread` },
      ],
      answer: "bread",
      line: 4,
    },
    {
      id: "ask",
      ask: t`What does Jaan ask you?`,
      options: [
        { id: "where", label: t`Where you are` },
        { id: "coffee", label: t`If you want coffee` },
        { id: "money", label: t`If you have money` },
      ],
      answer: "coffee",
      line: 5,
    },
  ];
  return { gaps, voice };
}

export function OsastavLesson() {
  const { t, i18n } = useLingui();
  const content = useContent();
  const numbers = lessonBySlug("numbrid")?.n;
  const negation = lessonBySlug("eitus")?.n;
  const questions = lessonBySlug("kusimused")?.n;
  const present = lessonBySlug("olevik")?.n;
  const forms = LESSONS.find((lesson) => lesson.et === "Kolm põhivormi")?.n;
  const have = LESSONS.find((lesson) => lesson.et === "Mul on")?.n;
  const object = LESSONS.find((lesson) => lesson.et === "Raamatut või raamatu")?.n;

  const countItems = useMemo<CountItem[]>(
    () =>
      COUNT_ITEMS.map(({ noun, number, options }) => {
        const text = counted(number, noun);
        return {
          text,
          src: src(text),
          before: `${number} `,
          after: "",
          answer: number === "üks" ? noun : PARTITIVE_NOUNS[noun],
          options,
          pair: [noun, text] as const,
          explain: (
            <>
              <span lang="et" className="font-medium text-ink">
                {text}
              </span>{" "}
              {means(text, i18n)}
            </>
          ),
        };
      }),
    [i18n],
  );

  const amountKeys: KeyItem[] = OSASTAV_AMOUNTS.map(({ phrase, noun }) => ({
    label: phrase,
    sub: noun,
    src: src(phrase),
    detail: {
      title: (
        <span lang="et">
          {noun} → {PARTITIVE_NOUNS[noun]}
        </span>
      ),
      tip: `${means(phrase, i18n)} · ${i18n._(NOUN_MEANS[noun])}`,
    },
  }));

  const someKeys: KeyItem[] = OSASTAV_SOME.map((sentence) => ({
    label: sentence,
    src: src(sentence),
    detail: { title: <span lang="et">{sentence}</span>, tip: means(sentence, i18n) },
  }));

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          When Estonian uses a noun’s third form, the partitive: after a number from two up, after
          an amount, in a no sentence, and with food and drink you don’t count.
        </Trans>
      }
      facts={[
        <Trans key="m">12 minutes</Trans>,
        <Trans key="q">3 exercises</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "kaks kassi",
        "mitu",
        "tass kohvi",
        "kilo juustu",
        "natuke piima",
        "palju raha",
        "vähe aega",
        "mul pole kassi.",
        "ma joon kohvi.",
        "kohvi, palun.",
        "vesi",
        "leib",
        "juust",
        "piim",
        "pole",
      ]}
      recap={[
        <Trans key="1">
          After a number from two up, a noun takes its third form and stays singular:{" "}
          <b lang="et">kaks kassi, viis eurot</b>. After <b lang="et">üks</b> it keeps its first:{" "}
          <b lang="et">üks kass</b>.
        </Trans>,
        <Trans key="2">
          Ask how many with <b lang="et">mitu</b> and the third form:{" "}
          <b lang="et">Mitu last sul on?</b>
        </Trans>,
        <Trans key="3">
          After an amount, what it measures takes the third form:{" "}
          <b lang="et">tass kohvi, palju raha</b>.
        </Trans>,
        <Trans key="4">
          In a no sentence, what isn’t there takes the third form:{" "}
          <b lang="et">Mul pole kassi</b>.
        </Trans>,
        <Trans key="5">
          Food and drink you don’t count take it too: <b lang="et">Ma joon kohvi</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "numbers",
          title: t`After a number from two up`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Üks kass" /> is one cat; <Word w="kaks kassi" /> is two cats. After a
                    number from two up, a noun takes its third form, the partitive, and stays
                    singular: <Word w="kassi" /> has no plural ending.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The third form is the last of the three a dictionary gives, as lesson {forms}{" "}
                    shows: <b lang="et">kass, kassi, kassi</b>. You’ve heard it in prices since
                    lesson {numbers}: <Word w="viis eurot" />. Pick a number and watch the nouns.
                  </Trans>
                </p>
              </Prose>
              <CountSwitch />
              <Aside>
                <Trans>
                  Some third forms change more than an ending: <Word w="laps" /> becomes{" "}
                  <Word w="last" />, and <Word w="vesi" /> becomes <Word w="vett" />. So learn each
                  noun with its third form, as the dictionary lists it.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "mitu",
          title: t`Asking how many`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Mitu" /> asks how many, and the noun after it takes its third form
                    too. For a price, ask with <b lang="et">kui palju</b>, how much, from lesson{" "}
                    {questions}.
                  </Trans>
                </p>
              </Prose>
              <ul className="m-0 list-none overflow-hidden rounded-lg bg-plate p-0 ring-1 ring-edge">
                {OSASTAV_EXCHANGES.map(({ q, a }) => (
                  <li key={q} className="border-b border-edge pb-1 last:border-b-0">
                    <Line text={q} />
                    <Line text={a} reply />
                  </li>
                ))}
              </ul>
              <Prose>
                <p>
                  <Trans>
                    An answer with <b lang="et">üks</b> keeps the first form:{" "}
                    <Word w="Meil on üks kass." />
                  </Trans>
                </p>
              </Prose>
            </>
          ),
        },
        {
          id: "one-or-more",
          title: t`One or more?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round shows a number. Pick the form of the noun that follows it, then hear
                    the two together.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="one-or-more"
                title={<Trans>Which form follows the number?</Trans>}
                items={countItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six. You picked the right form after every number.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Switch the numbers above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.text, src: item.src })}
                order={countRun}
                round={(props) => <GapRound {...props} listen="after" />}
              />
            </>
          ),
        },
        {
          id: "amounts",
          title: t`After an amount`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Tass kohvi" /> is a cup of coffee. The amount comes first, in its first
                    form, and what it measures follows in its third: <Word w="kohv" /> becomes{" "}
                    <Word w="kohvi" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    <Word w="Palju" />, a lot, <Word w="natuke" />, a little, and <Word w="vähe" />,
                    not much, work the same way. You asked <b lang="et">Kui palju kohvi sa jood?</b>{" "}
                    in lesson {questions}: that’s this rule too.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`Amounts`}
                  items={amountKeys}
                  columns={3}
                  phoneColumns={2}
                  empty={{
                    title: t`Tap an amount`,
                    tip: t`Under each one is the word as a dictionary gives it.`,
                  }}
                />
              </Panel>
            </>
          ),
        },
        {
          id: "no",
          title: t`In a no sentence`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Mul on kass." /> I have a cat. To say you don’t, use <Word w="pole" />{" "}
                    from lesson {negation}, and the cat takes its third form:{" "}
                    <Word w="Mul pole kassi." />
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The same happens whenever something isn’t there: <Word w="Laual pole leiba." />{" "}
                    Switch between <b lang="et">on</b> and <b lang="et">pole</b>.
                  </Trans>
                </p>
              </Prose>
              <NoSwitch />
              <Aside>
                <Trans>
                  <Word w="Mul ei ole kassi." /> means the same, since <b lang="et">pole</b> is the
                  short form of <b lang="et">ei ole</b>. Lesson {have} taught <b lang="et">mul on</b>
                  .
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "food",
          title: t`Food and drink`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    You’ve said <Word w="Ma joon kohvi." /> since lesson {present}. You drink some
                    coffee, an amount nobody counts, so <b lang="et">kohvi</b> is in its third
                    form. Anything you eat, drink or want some of works the same way.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`Food and drink`}
                  items={someKeys}
                  columns={3}
                  phoneColumns={1}
                  empty={{
                    title: t`Tap a sentence`,
                    tip: t`Listen for the third form at the end.`,
                  }}
                />
              </Panel>
              <Aside>
                <Trans>
                  In a café you’ll also hear <Word w="Üks kohv, palun." /> That’s one coffee,
                  counted, so it keeps its first form. <Word w="Ma loen raamatut." /> uses the
                  third form for another reason, which lesson {object} explains.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "market",
          title: t`At the market`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari spends Saturday at the market. Pick the form for each gap: the first form,
                    or the third after a number from two up, an amount or <b lang="et">pole</b>,
                    and for food and drink.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="market-day"
                title={<Trans>Mari’s Saturday</Trans>}
                gaps={content.gaps}
                mode="pick"
                clip="p-market"
              />
            </>
          ),
        },
        {
          id: "voice",
          title: t`A voice message from the market`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Jaan calls you from the market. Listen for the prices and for what there isn’t.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="jaan-market"
                title={<Trans>Listen: Jaan at the market</Trans>}
                clip="p-jaan"
                sentences={OSASTAV_PASSAGES.jaan}
                questions={content.voice}
              />
            </>
          ),
        },
      ]}
    />
  );
}

