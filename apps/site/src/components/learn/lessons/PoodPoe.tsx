import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ReactNode, useMemo, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import { clipId, clipUrl, STEM_PASSAGE, STEM_WORDS, type StemKind } from "../../../lib/learn/clips";
import { playSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, Panel } from "../Explore";
import { FormRound, type FormItem as KitFormItem } from "../FormRound";
import { GapPassage, type GapItem as PassageGap } from "../GapPassage";
import type { Glossary } from "../lesson-context";
import { Aside, LessonView, Prose } from "../LessonView";
import { Morph } from "../Morph";
import { type ChoiceItem, ChoiceRound, Quiz } from "../Quiz";
import { PlayMark } from "../Sound";
import { Word } from "../Word";

const SLUG = "pood-poe";
type Noun = (typeof STEM_WORDS)[number];
type Dictionary = Noun["word"];

/** A clip by what it says. */
const src = (text: string) => clipUrl(SLUG, clipId(text));
const nounOf = (word: Dictionary) => STEM_WORDS.find((each) => each.word === word) as Noun;
const ofKind = (kind: StemKind) => STEM_WORDS.filter((each) => each.kind === kind);

/** What each word means as a dictionary lists it. */
const WORD_MEANS: Record<Dictionary, MessageDescriptor> = {
  pood: msg`shop`,
  tuba: msg`room`,
  jõgi: msg`river`,
  laud: msg`table`,
  turg: msg`market`,
  aken: msg`window`,
  kool: msg`school`,
  raamat: msg`book`,
  uks: msg`door`,
  Tallinn: msg`Tallinn, the capital`,
  sein: msg`wall`,
  kohvik: msg`café`,
  kodu: msg`home`,
  haigla: msg`hospital`,
  Tartu: msg`Tartu, a university town`,
  töö: msg`work`,
  Pärnu: msg`Pärnu, a town by the sea`,
  Soome: msg`Finland`,
};

/** What each word means with its -s or -l: the cue “Which form?” asks for. */
const WHERE_MEANS: Record<Noun["where"], MessageDescriptor> = {
  poes: msg`in the shop`,
  toas: msg`in the room`,
  jões: msg`in the river`,
  laual: msg`on the table`,
  turul: msg`at the market`,
  aknal: msg`on the windowsill`,
  koolis: msg`at school, in a school`,
  raamatus: msg`in the book`,
  uksel: msg`at the door`,
  Tallinnas: msg`in Tallinn`,
  seinal: msg`on the wall`,
  kohvikus: msg`in a café`,
  kodus: msg`at home`,
  haiglas: msg`in a hospital`,
  Tartus: msg`in Tartu`,
  tööl: msg`at work`,
  Pärnus: msg`in Pärnu`,
  Soomes: msg`in Finland`,
};

/** What each sentence means. */
const SAID_MEANS: Record<Noun["said"], MessageDescriptor> = {
  "Ema on poes.": msg`Mum is at the shop.`,
  "Ta on toas.": msg`He or she is in the room.`,
  "Me ujume jões.": msg`We swim in the river.`,
  "Raamat on laual.": msg`The book is on the table.`,
  "Nad on turul.": msg`They’re at the market.`,
  "Kohv on aknal.": msg`The coffee is on the windowsill.`,
  "Ta õpib koolis.": msg`He or she studies at school.`,
  "Pilt on raamatus.": msg`The picture is in the book.`,
  "Jaan on uksel.": msg`Jaan is at the door.`,
  "Ma elan Tallinnas.": msg`I live in Tallinn.`,
  "Pilt on seinal.": msg`The picture is on the wall.`,
  "Me oleme kohvikus.": msg`We’re in a café.`,
  "Ta töötab kodus.": msg`He or she works at home.`,
  "Mari töötab haiglas.": msg`Mari works in a hospital.`,
  "Nad õpivad Tartus.": msg`They study in Tartu.`,
  "Ma olen tööl.": msg`I’m at work.`,
  "Jaan elab Pärnus.": msg`Jaan lives in Pärnu.`,
  "Ma elan Soomes.": msg`I live in Finland.`,
};

const stemNote = (noun: Noun) => msg`The stem of ${noun.word}: -s and -l go on it.`;

const GLOSSARY: Glossary = {
  ...Object.fromEntries(
    STEM_WORDS.flatMap((noun) => [
      [noun.word.toLowerCase(), { en: WORD_MEANS[noun.word], show: noun.word }],
      ...(noun.stem === noun.word
        ? []
        : [
            [
              noun.stem.toLowerCase(),
              { en: WORD_MEANS[noun.word], note: stemNote(noun), show: noun.stem },
            ],
          ]),
      [noun.where.toLowerCase(), { en: WHERE_MEANS[noun.where], show: noun.where }],
      [noun.said.toLowerCase(), { en: SAID_MEANS[noun.said], show: noun.said }],
    ]),
  ),
  ujume: { en: msg`we swim`, note: msg`From ujuma, to swim.` },
};

/** A pair's three parts: the letters both share at the start, what changed, and the rest. */
export function changed(word: string, stem: string): [string, string, string] {
  let start = 0;
  while (start < Math.min(word.length, stem.length) && word[start] === stem[start]) start++;
  let end = 0;
  while (
    end < Math.min(word.length, stem.length) - start &&
    word[word.length - 1 - end] === stem[stem.length - 1 - end]
  )
    end++;
  return [
    stem.slice(0, start),
    stem.slice(start, stem.length - end),
    stem.slice(stem.length - end),
  ];
}

/** The ending a form adds to its stem: -s or -l. */
export const endingOf = (noun: Noun) => noun.where.slice(noun.stem.length);

type Show = "word" | "stem" | "where";

/** A noun as the switch shows it, with what is new at that step lit. */
function Shown({ noun, show }: { noun: Noun; show: Show }) {
  if (show === "word") return <>{noun.word}</>;
  if (show === "where")
    return (
      <>
        {noun.stem}
        <span className="text-(--form)">{endingOf(noun)}</span>
      </>
    );
  const [start, lit, rest] = changed(noun.word, noun.stem);
  return (
    <>
      {start}
      <span className="text-(--form)">{lit}</span>
      {rest}
    </>
  );
}

function NounButton({ noun, show }: { noun: Noun; show: Show }) {
  const { i18n } = useLingui();
  const said = show === "word" ? noun.word : show === "stem" ? noun.stem : noun.where;
  const clip = src(said);
  const playing = usePlaying(clip);
  return (
    <button
      type="button"
      onClick={() => void playSound(clip)}
      className="grid h-full w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-3 ps-4 pe-3 text-start transition-colors duration-150 hoverable:hover:bg-plate-hover"
    >
      <span className="grid min-w-0">
        <span key={show} lang="et" className="learn-swap text-xl font-semibold tracking-tight">
          <Shown noun={noun} show={show} />
        </span>
        <span className="text-sm text-ink-muted">
          {i18n._(show === "where" ? WHERE_MEANS[noun.where] : WORD_MEANS[noun.word])}
        </span>
      </span>
      <PlayMark playing={playing} />
    </button>
  );
}

/** The line under a switch: what the last step changed. */
function SwitchNote({ show, notes }: { show: Show; notes: Record<Show, ReactNode> }) {
  return (
    <p aria-live="polite" className="min-h-12 text-md text-ink-secondary">
      <span key={show} className="learn-swap block">
        {notes[show]}
      </span>
    </p>
  );
}

/** Six nouns of one kind, switched together from the word to its stem to the stem with an ending. */
function StemSwitch({ kind, notes }: { kind: StemKind; notes: Record<Show, ReactNode> }) {
  const { t } = useLingui();
  const [show, setShow] = useState<Show>("word");
  return (
    <Panel>
      <Chips
        label={t`The word, its stem or the stem with an ending`}
        items={[
          { label: t`The word`, value: "word" },
          { label: t`The stem`, value: "stem" },
          { label: t`With an ending`, value: "where" },
        ]}
        value={show}
        onPick={setShow}
      />
      <ul className="m-0 grid list-none grid-cols-2 overflow-hidden rounded-lg bg-plate p-0 ring-1 ring-edge sm:grid-cols-3">
        {ofKind(kind).map((noun) => (
          <li key={noun.word} className="border-b border-edge">
            <NounButton noun={noun} show={show} />
          </li>
        ))}
      </ul>
      <SwitchNote show={show} notes={notes} />
    </Panel>
  );
}

/** Pood turning into its stem and the stem with -s, each form to press, and the sentence it ends in. */
function PoodSteps() {
  const { t, i18n } = useLingui();
  const pood = nounOf("pood");
  const said = src(pood.said);
  const playing = usePlaying(said);
  return (
    <Panel>
      <Morph
        label={t`Words`}
        chains={[
          {
            id: "pood",
            steps: [
              { word: "pood", label: t`the word`, src: src("pood") },
              { word: "poe", label: t`the stem`, src: src("poe") },
              { word: "poes", label: i18n._(WHERE_MEANS.poes), src: src("poes") },
            ],
          },
        ]}
      />
      <button
        type="button"
        onClick={() => void playSound(said)}
        className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg bg-plate py-2.5 ps-4 pe-3 text-start ring-1 ring-edge transition-colors duration-150 hoverable:hover:bg-plate-hover"
      >
        <span lang="et" className="text-xl font-medium tracking-tight max-sm:text-lg">
          {pood.said}
          <span
            lang={i18n.locale}
            className="block text-sm font-normal tracking-normal text-ink-muted"
          >
            {i18n._(SAID_MEANS[pood.said])}
          </span>
        </span>
        <PlayMark playing={playing} />
      </button>
    </Panel>
  );
}

/** “Which word?”: the nouns whose stem changes inside, each heard in its sentence; tuba first. */
export const HEARD = [...ofKind("inside").slice(1), ...ofKind("inside").slice(0, 1)];

/**
 * The headword, its stem and one other headword of the same kind, in random order. The stem is the
 * likeliest slip: a learner who strips the -s from toas looks up toa.
 */
export function threeWords(noun: Noun): string[] {
  const others = HEARD.map((each) => each.word).filter((each) => each !== noun.word);
  return shuffle([noun.word, noun.stem, ...shuffle(others).slice(0, 1)]);
}

/** The first round's options, fixed so the page renders the same on the server, turned by one. */
export const firstWords = (i: number): string[] => {
  const noun = HEARD[i] as Noun;
  const three = [noun.word, noun.stem, (HEARD[(i + 2) % HEARD.length] as Noun).word];
  const turn = (i + 1) % 3;
  return [...three.slice(turn), ...three.slice(0, turn)];
};

/** “Which form?”: every noun, keyed by its kind so a run meets each kind early. */
export const ASKED = [...STEM_WORDS.slice(6), ...STEM_WORDS.slice(0, 6)].map((noun) => ({
  noun,
  pair: [noun.kind, noun.word] as const,
}));

/** A noun's form and its two wrong forms, turned so the answer isn't always first. */
export const formsInOrder = (noun: Noun, turn: number): string[] => {
  const three = [noun.where, noun.slips[0], noun.slips[1]];
  const at = turn % 3;
  return [...three.slice(at), ...three.slice(0, at)];
};

/**
 * The wrong forms a round can offer: three made-up forms with the ending, each from a wrong stem.
 * The bare word and stem stay out, since the answer is one of them plus a letter. Each round after
 * the first draws two, so no set of options names its noun.
 */
export const wrongForms = (noun: Noun): string[] => [...noun.slips];

/** The answer and two wrong forms at random, in random order. */
export const threeForms = (noun: Noun): string[] =>
  shuffle([noun.where, ...shuffle(wrongForms(noun)).slice(0, 2)]);

type HeardItem = ChoiceItem & { noun: Noun; pair: readonly [string, string] };

type FormItem = KitFormItem & { noun: Noun; pair: readonly [string, string] };

/** A headword or a stem as an option, each with the meaning of its headword. */
const wordOptions = (words: readonly string[], i18n: I18n) =>
  words.map((word) => ({
    id: word,
    label: <span lang="et">{word}</span>,
    sub: i18n._(
      WORD_MEANS[
        (STEM_WORDS.find((noun) => noun.word === word || noun.stem === word) as Noun).word
      ],
    ),
  }));

/** The pair a dictionary gives, and the sentence with its meaning, after an answer. */
function Explain({ noun }: { noun: Noun }) {
  const { i18n } = useLingui();
  return (
    <>
      <span lang="et" className="font-medium text-ink">
        {noun.word}, {noun.stem} → {noun.where}
      </span>
      <span className="block">
        <span lang="et" className="font-medium text-ink">
          {noun.said}
        </span>{" "}
        {i18n._(SAID_MEANS[noun.said])}
      </span>
    </>
  );
}

/** The pair a dictionary gives and where the ending goes, after an answer. */
function StemRule({ noun }: { noun: Noun }) {
  return (
    <Trans>
      <span lang="et">
        {noun.word}, {noun.stem}
      </span>
      : the ending goes on <span lang="et">{noun.stem}</span>.
    </Trans>
  );
}

/** Saturday, who is where: one gap per place, each offered with the form a learner might make. */
const SATURDAY_GAPS = (why: (noun: Noun) => ReactNode): PassageGap[] => {
  const gap = (id: string, before: string, word: Dictionary, wrong: string, after: string) => {
    const noun = nounOf(word);
    return { id, before, after, answer: noun.where, options: [noun.where, wrong], why: why(noun) };
  };
  return [
    gap("turul", `${STEM_PASSAGE[0]} Ema on`, "turg", "turgul", "ja Jaan on"),
    {
      ...gap("poes", "", "pood", "poodis", "."),
      options: ["poodis", "poes"],
    },
    gap("kohvikus", "Kati on", "kohvik", "kohvikis", "."),
    { ...gap("kodus", "Mari on", "kodu", "kodes", ". Ta istub"), options: ["kodes", "kodus"] },
    gap("toas", "", "tuba", "tubas", "ja loeb."),
    { ...gap("laual", "Kohv on", "laud", "laudel", "."), options: ["laudel", "laual"] },
  ];
};

export function PoodPoeLesson() {
  const { t, i18n } = useLingui();
  const places = lessonBySlug("kohad")?.n;
  const present = lessonBySlug("olevik")?.n;
  const forms = lessonBySlug("pohivormid")?.n;
  const gradation = lessonBySlug("jalg-jala")?.n;

  const heardItems = useMemo<HeardItem[]>(
    () =>
      HEARD.map((noun, i) => ({
        noun,
        src: src(noun.said),
        answer: noun.word,
        pair: [noun.word, noun.word] as const,
        options: wordOptions(firstWords(i), i18n),
        explain: <Explain noun={noun} />,
      })),
    [i18n],
  );

  // Every round but the first draws its wrong words afresh, so no set of options names the answer.
  const heardRun = (items: readonly HeardItem[], pinned?: HeardItem): HeardItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned ? item : { ...item, options: wordOptions(threeWords(item.noun), i18n) },
    );

  const formItems = useMemo<FormItem[]>(
    () =>
      ASKED.map(({ noun, pair }, i) => ({
        noun,
        pair,
        base: noun.word,
        gloss: (
          <Trans>
            {i18n._(WORD_MEANS[noun.word])}, stem <span lang="et">{noun.stem}</span>
          </Trans>
        ),
        cue: i18n._(WHERE_MEANS[noun.where]),
        answers: [noun.where],
        options: formsInOrder(noun, i + 1),
        src: src(noun.said),
        said: (
          <>
            {noun.said}{" "}
            <span lang={i18n.locale} className="text-md">
              {i18n._(SAID_MEANS[noun.said])}
            </span>
          </>
        ),
        explain: <StemRule noun={noun} />,
      })),
    [i18n],
  );

  // The first round keeps its server order; every later one shuffles its three forms.
  const formRun = (items: readonly FormItem[], pinned?: FormItem): FormItem[] =>
    eachPairFirst(items, pinned).map((item) =>
      item === pinned ? item : { ...item, options: threeForms(item.noun) },
    );

  const gaps = SATURDAY_GAPS((noun) => <StemRule noun={noun} />);

  const kindNotes = {
    inside: {
      word: <Trans>Switch to “The stem” and watch which letters change.</Trans>,
      stem: (
        <Trans>
          A letter drops or changes inside: <span lang="et">pood, poe</span>;{" "}
          <span lang="et">tuba, toa</span>.
        </Trans>
      ),
      where: (
        <Trans>
          The ending goes on the stem: <span lang="et">poes</span>, not{" "}
          <span lang="et">poodis</span>.
        </Trans>
      ),
    },
    vowel: {
      word: <Trans>Switch to “The stem” and watch the end of each word.</Trans>,
      stem: (
        <Trans>
          Each word gains a vowel at the end: <span lang="et">kooli, ukse, raamatu</span>.
        </Trans>
      ),
      where: (
        <Trans>
          The ending comes after the vowel: <span lang="et">koolis, uksel</span>.
        </Trans>
      ),
    },
    same: {
      word: <Trans>Switch to “The stem”: no letter changes.</Trans>,
      stem: <Trans>The stem is the word itself.</Trans>,
      where: (
        <Trans>
          The ending goes straight on: <span lang="et">kodus, tööl</span>.
        </Trans>
      ),
    },
  } satisfies Record<StemKind, Record<Show, ReactNode>>;

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          A shop is <span lang="et">pood</span>, but in the shop is <span lang="et">poes</span>.{" "}
          <b lang="et" className="whitespace-nowrap">
            -s
          </b>{" "}
          and{" "}
          <b lang="et" className="whitespace-nowrap">
            -l
          </b>{" "}
          go on the noun’s stem, and the stem can differ from the word.
        </Trans>
      }
      facts={[
        <Trans key="m">10 minutes</Trans>,
        <Trans key="q">2 quizzes and a passage</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "pood",
        "poes",
        "tuba",
        "toas",
        "jõgi",
        "jões",
        "aken",
        "aknal",
        "uks",
        "uksel",
        "raamat",
        "raamatus",
      ]}
      recap={[
        <Trans key="1">
          <b lang="et" className="whitespace-nowrap">
            -s
          </b>{" "}
          and{" "}
          <b lang="et" className="whitespace-nowrap">
            -l
          </b>{" "}
          go on the noun’s stem: <b lang="et">pood</b>, stem <b lang="et">poe</b>,{" "}
          <b lang="et">poes</b>.
        </Trans>,
        <Trans key="2">
          In some nouns a letter inside drops or changes: <b lang="et">tuba, toa, toas</b>.
        </Trans>,
        <Trans key="3">
          Some gain a vowel at the end, and the vowel can’t be guessed:{" "}
          <b lang="et">kool, kooli, koolis</b>.
        </Trans>,
        <Trans key="4">
          Some stay as they are: <b lang="et">kodu, kodus</b>.
        </Trans>,
        <Trans key="5">
          A dictionary gives the stem second. Learn each noun as that pair:{" "}
          <b lang="et">pood, poe</b>.
        </Trans>,
      ]}
      sections={[
        {
          id: "stem",
          title: t`-s and -l go on the stem`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In lesson {places} you put{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>{" "}
                    on a place to say in: <Word w="Tartus" />, <Word w="koolis" />. A shop is{" "}
                    <Word w="pood" />, but in the shop is <Word w="poes" />, not{" "}
                    <span lang="et">poodis</span>.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The ending goes on the noun’s stem, as a verb’s endings go on its stem in lesson{" "}
                    {present}. The stem of <span lang="et">pood</span> is <Word w="poe" />, and{" "}
                    <span lang="et">poe</span> with{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>{" "}
                    is <span lang="et">poes</span>. Tap each step to hear it.
                  </Trans>
                </p>
              </Prose>
              <PoodSteps />
              <Prose>
                <p>
                  <Trans>
                    A dictionary gives the stem second: <span lang="et">pood, poe</span>. Learn a
                    noun as that pair and you can put{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -s
                    </b>{" "}
                    or{" "}
                    <b lang="et" className="whitespace-nowrap">
                      -l
                    </b>{" "}
                    on it. A stem changes a letter inside, gains a vowel at the end, or stays the
                    same as the word. The next sections take one each.
                  </Trans>
                </p>
              </Prose>
              <Aside>
                <Trans>
                  A dictionary lists a third form too, the partitive:{" "}
                  <span lang="et">pood, poe, poodi</span>. Lesson {forms} teaches all three.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "inside",
          title: t`A letter inside drops or changes`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    In <span lang="et">pood, poe</span> the <span lang="et">d</span> drops, the long{" "}
                    <span lang="et">oo</span> turns short, and an <span lang="et">e</span> ends the
                    stem. In <Word w="tuba" />, room, the <span lang="et">b</span> drops and the{" "}
                    <span lang="et">u</span> turns into <span lang="et">o</span>: the stem is{" "}
                    <Word w="toa" />, and in the room is <Word w="toas" />.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    You have met two of these already: <Word w="laual" />, on the table, is from{" "}
                    <Word w="laud" />, and <Word w="turul" />, at the market, is from{" "}
                    <Word w="turg" />. Switch through the three steps for six nouns.
                  </Trans>
                </p>
              </Prose>
              <StemSwitch kind="inside" notes={kindNotes.inside} />
              <Aside>
                <Trans>
                  Which letters change follows rules of its own, and lesson {gradation} teaches
                  them. For now, take the stem from the dictionary.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "which-word",
          title: t`Hearing the word behind the form`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a sentence and pick the word as a dictionary lists it. You hear{" "}
                    <span lang="et">toas</span>, and you look up <span lang="et">tuba</span>.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-word"
                title={<Trans>Which word?</Trans>}
                items={heardItems}
                rounds={HEARD.length}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them. You found the word behind every form.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Switch through the six nouns above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.noun.where, src: src(item.noun.where) })}
                order={heardRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "vowel",
          title: t`A vowel at the end`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Other nouns keep every letter and gain a vowel at the end. <Word w="Kool" />,
                    school, has the stem <Word w="kooli" />, so at school is <Word w="koolis" />.
                    That’s also where the <span lang="et">a</span> in <Word w="Tallinnas" />, from
                    lesson {places}, comes from.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The word doesn’t show which vowel it gains: <Word w="raamat" />,{" "}
                    <Word w="raamatu" />; <Word w="uks" />, <Word w="ukse" />. The dictionary’s
                    genitive does.
                  </Trans>
                </p>
              </Prose>
              <StemSwitch kind="vowel" notes={kindNotes.vowel} />
            </>
          ),
        },
        {
          id: "same",
          title: t`Nouns that stay the same`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Many nouns that end in a vowel are their own stem. <Word w="Kodu" /> is home,
                    and at home is <Word w="kodus" />. The ending goes straight on.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    A final vowel is no guarantee: <span lang="et">tuba</span> ends in one too, and
                    its stem is <span lang="et">toa</span>. The dictionary pair settles it:{" "}
                    <span lang="et">kodu, kodu</span> but <span lang="et">tuba, toa</span>.
                  </Trans>
                </p>
              </Prose>
              <StemSwitch kind="same" notes={kindNotes.same} />
            </>
          ),
        },
        {
          id: "which-form",
          title: t`Making the form`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round shows a noun as a dictionary gives it, with its stem, and a meaning
                    such as “in the shop”. Pick the form that says it, then hear it in a sentence.
                    The nouns come from all three sections.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-form"
                title={<Trans>Which form?</Trans>}
                items={formItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them. You put every ending on the stem.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Switch through the three sets above once more, then try again.</Trans>
                  )
                }
                recall={(item) => ({ label: item.noun.where, src: src(item.noun.where) })}
                order={formRun}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "saturday",
          title: t`Who is where on Saturday`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    It’s Saturday, and the passage says where everyone is. Pick the right form for
                    each gap. When every gap is filled, hear the whole passage.
                  </Trans>
                </p>
              </Prose>
              <GapPassage
                id="saturday"
                title={<Trans>Fill the gaps</Trans>}
                gaps={gaps}
                mode="pick"
                clip="p-saturday"
              />
            </>
          ),
        },
      ]}
    />
  );
}
