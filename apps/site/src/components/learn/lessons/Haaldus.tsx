import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useCallback, useMemo } from "react";
import { clipId, clipUrl } from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { Compare, Keys, ListenRows, Panel } from "../Explore";
import { Aside, LessonView, Prose } from "../LessonView";
import type { Glossary } from "../lesson-context";
import { type ChoiceItem, ChoiceRound, type GapItem, GapRound, Quiz } from "../Quiz";
import { Word } from "../Word";

const SLUG = "haaldus";
const src = (word: string) => clipUrl(SLUG, clipId(word));

const GLOSSARY: Glossary = {
  aken: { en: msg`window` },
  ema: { en: msg`mother` },
  isa: { en: msg`father` },
  onu: { en: msg`uncle` },
  uks: { en: msg`door` },
  õun: { en: msg`apple` },
  ämblik: { en: msg`spider` },
  öö: { en: msg`night` },
  üks: { en: msg`one` },
  õ: {
    en: msg`the letter õ`,
    note: msg`Say o, then spread your lips and keep your tongue where it was. Russian ы is close.`,
    clip: "o3un",
  },
  kõrv: { en: msg`ear` },
  korv: { en: msg`basket` },
  säng: { en: msg`bed` },
  sang: { en: msg`handle, as on a bucket` },
  tüli: { en: msg`a quarrel` },
  tuli: { en: msg`fire`, note: msg`Also “came”: ta tuli, he or she came.` },
  sada: { en: msg`a hundred` },
  saada: { en: msg`send!`, note: msg`Also “to get”, from saama.` },
  koli: { en: msg`junk, clutter` },
  kooli: { en: msg`to school`, note: msg`From kool, school.` },
  vana: { en: msg`old` },
  kana: { en: msg`a hen` },
  kanna: {
    en: msg`carry!`,
    note: msg`Said to one person, from kandma. Also “of the heel”, from kand.`,
  },
  lina: { en: msg`linen; a bedsheet` },
  linna: { en: msg`of the town; into town`, note: msg`From linn, town.` },
  tule: { en: msg`come!`, note: msg`Said to one person.` },
  tuule: { en: msg`of the wind`, note: msg`From tuul, wind.` },
  kool: { en: msg`school` },
  tee: { en: msg`road; tea`, note: msg`One word for both.` },
  te: { en: msg`you, to more than one; polite you` },
  kass: { en: msg`cat` },
  kas: {
    en: msg`turns a sentence into a yes-or-no question`,
    note: msg`Kas sa tuled? Are you coming?`,
  },
  maa: { en: msg`land, country; the ground` },
  ma: { en: msg`I`, note: msg`Short for mina.` },
  linn: { en: msg`town, city` },
  tallinn: { en: msg`Estonia’s capital`, show: "Tallinn" },
  raamatukogu: { en: msg`library`, note: msg`Raamat, book, and kogu, collection.` },
  tere: { en: msg`hello` },
  aitäh: { en: msg`thank you` },
  jah: { en: msg`yes` },
  eesti: { en: msg`Estonia; Estonian`, show: "Eesti" },
};

/** Words that differ in one vowel. */
const VOWEL_PAIRS = [
  ["kõrv", "korv"],
  ["üks", "uks"],
  ["säng", "sang"],
  ["tüli", "tuli"],
] as const;

/** Words that differ only in a doubled letter: the short one first. */
const LENGTH_PAIRS = [
  ["sada", "saada"],
  ["koli", "kooli"],
  ["kana", "kanna"],
  ["lina", "linna"],
  ["tule", "tuule"],
  ["ma", "maa"],
  ["te", "tee"],
] as const;

const firstDifference = (short: string, long: string) => {
  let i = 0;
  while (short[i] === long[i]) i++;
  return i;
};

/** The first syllable lit, the rest dimmed. */
function Syllables({ parts }: { parts: readonly string[] }) {
  return (
    <>
      {parts.map((part, i) => (
        <span key={part}>
          {i > 0 && <span className="text-ink-faint">·</span>}
          <span className={i === 0 ? "font-semibold text-(--form)" : "text-ink-muted"}>{part}</span>
        </span>
      ))}
    </>
  );
}

function Verdict({ share }: { share: number }) {
  if (share === 1) return <Trans>All of them. You can hear the difference.</Trans>;
  if (share >= 0.7) return <Trans>Most of them. Play the ones you missed once more.</Trans>;
  return <Trans>Tap õ, ä and ü above once more, then try again.</Trans>;
}

export function HaaldusLesson() {
  const { t, i18n } = useLingui();
  const meaning = useCallback(
    (word: string) => {
      const gloss = GLOSSARY[word];
      return gloss ? i18n._(gloss.en) : "";
    },
    [i18n],
  );

  const vowels = useMemo(
    () => [
      { v: "a", word: "aken", tip: t`Like the a in “father”, but short.` },
      { v: "e", word: "ema", tip: t`Like the e in “bed”.` },
      { v: "i", word: "isa", tip: t`Like the ee in “see”, but short, never like “ice”.` },
      { v: "o", word: "onu", tip: t`Like the o in “more”, but short.` },
      { v: "u", word: "uks", tip: t`Like the oo in “food”, but short.` },
      {
        v: "õ",
        word: "õun",
        accent: true,
        tip: t`No English sound is like it. Say o, then spread your lips and keep your tongue where it was. Russian ы is close.`,
      },
      { v: "ä", word: "ämblik", accent: true, tip: t`Like the a in “cat”.` },
      { v: "ö", word: "öö", accent: true, tip: t`Say e with rounded lips, as in German “schön”.` },
      {
        v: "ü",
        word: "üks",
        accent: true,
        tip: t`Say i with rounded lips, as in German “über” or French “tu”.`,
      },
    ],
    [t],
  );

  const pairItems = useMemo<(ChoiceItem & { pair: readonly [string, string] })[]>(
    () =>
      VOWEL_PAIRS.flatMap((pair) =>
        pair.map((word) => ({
          src: src(word),
          answer: word,
          pair,
          options: pair.map((option) => ({ id: option, label: option, sub: meaning(option) })),
        })),
      ),
    [meaning],
  );

  const gapItems = useMemo<(GapItem & { pair: readonly [string, string]; word: string })[]>(
    () =>
      LENGTH_PAIRS.flatMap(([short, long]) => {
        const i = firstDifference(short, long);
        const letter = long[i] as string;
        return [short, long].map((word, j) => {
          const other = j ? short : long;
          return {
            src: src(word),
            before: short.slice(0, i - 1),
            after: short.slice(i),
            options: [letter, letter + letter],
            answer: j ? letter + letter : letter,
            word,
            pair: [short, long] as const,
            explain: (
              <>
                <Word w={word} /> {meaning(word)} · <Word w={other} /> {meaning(other)}
              </>
            ),
          };
        });
      }),
    [meaning],
  );

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          How Estonian sounds: nine vowels, letters that always sound the same, and length that
          changes the word.
        </Trans>
      }
      facts={[
        <Trans key="m">10 minutes</Trans>,
        <Trans key="q">2 quizzes</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "tere",
        "aitäh",
        "jah",
        "ema",
        "isa",
        "uks",
        "õun",
        "öö",
        "üks",
        "kõrv",
        "säng",
        "kool",
        "kass",
        "maa",
        "linn",
        "tee",
        "vana",
        "raamatukogu",
      ]}
      recap={[
        <Trans key="1">Say every letter the way it’s written.</Trans>,
        <Trans key="2">Stress the first syllable.</Trans>,
        <Trans key="3">
          The letters <b lang="et">õ ä ö ü</b> are vowels of their own, and English has no sound
          like <b lang="et">õ</b>.
        </Trans>,
        <Trans key="4">A double letter is longer, and it makes a different word.</Trans>,
      ]}
      sections={[
        {
          id: "spelled",
          title: t`Read it as it’s written`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Estonian is spelled the way it sounds. You say every letter, and each one keeps
                    its sound wherever it stands. Once you know the letters, you can read a new word
                    aloud.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Stress falls on the <b>first syllable</b>. Tap a word to hear it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows
                items={(
                  [
                    ["tere", ["te", "re"]],
                    ["tallinn", ["Tal", "linn"]],
                    ["eesti", ["Ees", "ti"]],
                    ["raamatukogu", ["raa", "ma", "tu", "ko", "gu"]],
                  ] as const
                ).map(([word, parts]) => {
                  const spoken = parts.join("");
                  return {
                    main: <Syllables parts={parts} />,
                    sub: meaning(word),
                    src: src(word),
                    label: t`Play ${spoken}`,
                  };
                })}
              />
              <Aside>
                <Trans>
                  A few words break the rule: <Word w="aitäh" />, thank you, puts the stress on its
                  second half.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "vowels",
          title: t`Nine vowels`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Five look familiar. The four with marks are separate letters, not accents, and
                    swapping one changes the word. English has no sound like <Word w="õ" />.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`Vowels`}
                  columns={9}
                  phoneColumns={5}
                  empty={{
                    title: t`Tap a vowel`,
                    tip: t`You’ll hear it in a word, with a note on how to say it.`,
                  }}
                  items={vowels.map(({ v, word, tip, accent }) => {
                    const at = word.indexOf(v);
                    return {
                      label: v,
                      sub: word,
                      accent,
                      src: src(word),
                      label2: t`${v}, as in ${word}`,
                      detail: {
                        title: (
                          <>
                            <span lang="et">
                              {word.slice(0, at)}
                              <span className="text-(--form)">{v}</span>
                              {word.slice(at + 1)}
                            </span>{" "}
                            <small className="ms-1 text-md font-normal text-ink-secondary">
                              {meaning(word)}
                            </small>
                          </>
                        ),
                        tip,
                      },
                    };
                  })}
                />
              </Panel>
            </>
          ),
        },
        {
          id: "pairs",
          title: t`Õ or o, ä or a, ü or u`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mix these up and you say another word: <Word w="kõrv" /> is an ear and{" "}
                    <Word w="korv" /> a basket. <Word w="Üks" /> is one and <Word w="uks" /> a door.
                    Listen and pick the word you hear.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="vowel-pairs"
                title={<Trans>Which word did you hear?</Trans>}
                items={pairItems}
                rounds={6}
                verdict={(share) => <Verdict share={share} />}
                both={(item) => item.options.map((option) => src(option.id))}
                recall={(item) => ({ label: item.answer, src: item.src })}
                order={eachPairFirst}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "length",
          title: t`Short and long`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Sada" /> is a hundred; <Word w="saada" /> means send. A double letter
                    is a longer sound, and it makes a different word. Consonants work the same way:{" "}
                    <Word w="kana" /> is a hen, and <Word w="kanna" /> tells one person to carry
                    something.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Pick a pair. Both words are drawn on one time scale, so the longer one takes
                    more room.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Compare
                  pairs={LENGTH_PAIRS}
                  src={src}
                  meaning={meaning}
                  mark={(short, long) => {
                    const i = firstDifference(short, long);
                    return (
                      <>
                        {long.slice(0, i - 1)}
                        <span className="text-(--form)">{long.slice(i - 1, i + 1)}</span>
                        {long.slice(i + 1)}
                      </>
                    );
                  }}
                />
              </Panel>
              <Aside>
                <Trans>
                  Estonian also has a third, extra-long length, and the spelling doesn’t always show
                  it. <i lang="et">Linna</i> means both “of the town” and “into the town”, and the
                  second is held longer.
                </Trans>
              </Aside>
            </>
          ),
        },
        {
          id: "spell",
          title: t`Spell what you hear`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>One letter or two? Listen, then fill the gap.</Trans>
                </p>
              </Prose>
              <Quiz
                id="length-gap"
                title={<Trans>One letter or two?</Trans>}
                items={gapItems}
                rounds={8}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All of them. You can hear length.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>Pick each pair above again and hear which word is longer.</Trans>
                  )
                }
                both={(item) => item.pair.map(src)}
                recall={(item) => ({ label: item.word, src: item.src })}
                order={eachPairFirst}
                round={(props) => <GapRound {...props} />}
              />
            </>
          ),
        },
      ]}
    />
  );
}
