import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { clsx } from "clsx";
import { ArrowRight, Volume2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { deckPath } from "../../lib/deck-page";
import { shelfPath } from "../../lib/explore";
import { openLymiUrl } from "../../lib/origins";
import { type Locale, localizedPath } from "../../lib/routes";
import { buttonClass } from "../Button";
import { addUrl } from "../deck/DeckView";
import { DeckShowcase } from "../exams/DeckShowcase";
import { Added, AssistantChat, Attachment } from "./AssistantChat";
import { AssistantMarksWithMore } from "./AssistantMarks";
import type { SampleCard } from "./cards";
import { FeatureSection, SectionTitle } from "./FeatureSection";
import { Furigana } from "./Furigana";
import { JAPANESE_QUESTIONS } from "./faq";
import { Hero } from "./Hero";
import { ImportDemo } from "./ImportDemo";
import { JAPANESE, JAPANESE_HAND, type LanguageCard } from "./language-cards";
import { Questions } from "./Questions";
import { ReadingStages } from "./ReadingStages";
import { SharedDeckDemo } from "./SharedDeckDemo";
import { SignUpSection } from "./SignUpSection";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";

export const JAPANESE_TITLE = msg`Learn Japanese vocabulary with kana and JLPT decks · Lymi`;
export const JAPANESE_BLURB = msg`Start with hiragana and katakana, then N5- and N4-level words. Furigana sits over the kanji until you know a word, and a native Japanese voice reads every card.`;

/** The published kana deck, which Welcome also offers a Japanese beginner first. */
const KANA_DECK = "read-japanese-kana";

/** The gojūon's first rows, written down the page as a chart is: the ground the hand is dealt on. */
const KANA_ROWS = [
  "あいうえお",
  "かきくけこ",
  "さしすせそ",
  "たちつてと",
  "なにぬねの",
  "はひふへほ",
  "まみむめも",
];

/** A faint kana chart in vertical writing, the ground the hero's hand is dealt on. */
function KanaGround() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden select-none"
    >
      <div
        dir="ltr"
        className="font-mincho text-[2.75rem] leading-[1.45] tracking-[0.3em] text-muted/25 [writing-mode:vertical-rl] @2xl:text-[3.5rem]"
      >
        {KANA_ROWS.map((row) => (
          <p key={row}>{row}</p>
        ))}
      </div>
    </div>
  );
}

/** A section as wide as the page, its words above what proves them. */
function WideSection({
  id,
  title,
  body,
  after,
  children,
}: {
  id: string;
  title: ReactNode;
  body: ReactNode;
  after?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="border-t border-edge px-5 py-20 @2xl:px-10 @4xl:py-28"
    >
      <div className="mx-auto max-w-[1040px]">
        <div id={`${id}-title`} className="max-w-[640px]">
          <SectionTitle>{title}</SectionTitle>
        </div>
        <p className="mt-5 max-w-[56ch] text-md text-pretty text-text-2">{body}</p>
        {after && <div className="mt-5">{after}</div>}
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

/** The way in, in the order to take it: each step is one of the decks Welcome offers first. */
const STEPS: { slug: string; glyph: string; name: MessageDescriptor; detail: MessageDescriptor }[] =
  [
    {
      slug: KANA_DECK,
      glyph: "あア",
      name: msg`The kana`,
      detail: msg`Hiragana, then katakana, a few rows at a time, each sign with its sound.`,
    },
    {
      slug: "japanese-n5-vocabulary-practice",
      glyph: "食",
      name: msg`N5-level words`,
      detail: msg`Everyday words, from family and food to your first verbs.`,
    },
    {
      slug: "japanese-n4-vocabulary",
      glyph: "経",
      name: msg`N4-level words`,
      detail: msg`The next level, once N5 feels easy.`,
    },
  ];

type Step = (typeof STEPS)[number];

/** The steps whose deck is published now, side by side and numbered, each opening its deck. */
function PathSteps({ steps }: { steps: Step[] }) {
  const { t, i18n } = useLingui();
  if (steps.length === 0) return null;
  return (
    <ol aria-label={t`The way in`} className="grid gap-3 @3xl:grid-cols-3 @3xl:gap-5">
      {steps.map((step, index) => (
        <li key={step.slug}>
          <a
            href={deckPath(step.slug, i18n.locale as Locale)}
            className="group flex h-full gap-4 rounded-2xl bg-plate p-4 edge transition-colors duration-150 hoverable:hover:bg-hover @3xl:flex-col @3xl:p-5"
          >
            <span className="flex shrink-0 items-start gap-3 @3xl:items-center">
              <span
                lang="ja"
                aria-hidden="true"
                className="grid h-14 w-16 place-items-center rounded-xl bg-plate-2 font-mincho text-2xl text-text"
              >
                {step.glyph}
              </span>
              <span className="hidden text-sm font-medium text-muted @3xl:inline">
                {t`Step ${i18n.number(index + 1)}`}
              </span>
            </span>
            <span className="grid min-w-0 gap-1">
              <span className="text-sm font-medium text-muted @3xl:hidden">
                {t`Step ${i18n.number(index + 1)}`}
              </span>
              <span className="text-lg font-medium text-text">{i18n._(step.name)}</span>
              <span className="text-sm text-pretty text-text-2">{i18n._(step.detail)}</span>
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
}

/** Every published Japanese deck at full size, each step's deck marked with its step. */
function JapaneseDecks({ decks, steps }: { decks: PublicDeckSummary[]; steps: Step[] }) {
  const { t, i18n } = useLingui();
  const locale = i18n.locale as Locale;
  const step = (slug: string) => {
    const at = steps.findIndex((each) => each.slug === slug);
    return at === -1 ? undefined : t`Step ${i18n.number(at + 1)}`;
  };
  const [first, ...rest] = decks;
  if (!first) return null;
  return (
    <div className="grid gap-5">
      <DeckShowcase deck={first} locale={locale} eyebrow={step(first.slug)} />
      <div className="grid gap-5 @4xl:grid-cols-2">
        {rest.map((deck) => (
          <DeckShowcase
            key={deck.slug}
            deck={deck}
            locale={locale}
            layout="tall"
            eyebrow={step(deck.slug)}
          />
        ))}
      </div>
    </div>
  );
}

/** Words to hear, each from its own clip, as review plays a card. */
const VOICE_IDS = ["otsukaresama", "itadakimasu", "komorebi", "hashi"];
const VOICE = VOICE_IDS.map((id) => JAPANESE_HAND.find((card) => card.id === id) as LanguageCard);

function VoiceList() {
  const { t, i18n } = useLingui();
  const [playing, setPlaying] = useState<string | null>(null);
  const clip = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => clip.current?.pause(), []);

  const play = (card: LanguageCard) => {
    clip.current?.pause();
    const audio = new Audio(`/audio/hand/${card.id}.mp3`);
    clip.current = audio;
    setPlaying(card.id);
    const done = () => setPlaying((now) => (now === card.id ? null : now));
    audio.addEventListener("ended", done);
    audio.play().catch(done);
  };

  return (
    <ul className="mx-auto grid w-full max-w-[440px] rounded-2xl bg-plate edge">
      {VOICE.map((card) => {
        const meaning = typeof card.meaning === "string" ? card.meaning : i18n._(card.meaning);
        const term = card.term;
        return (
          <li
            key={card.id}
            className="flex items-center gap-4 px-4 py-3.5 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-edge"
          >
            <div className="min-w-0 flex-1">
              <p lang="ja" className="text-2xl leading-[1.5] font-medium text-text">
                {card.furigana ? <Furigana term={term} reading={card.furigana} lang="ja" /> : term}
              </p>
              <p className="text-sm text-pretty text-muted">{meaning}</p>
            </div>
            <button
              type="button"
              aria-label={t`Play ${term}`}
              onClick={() => play(card)}
              className={clsx(
                "relative inline-flex size-10 shrink-0 items-center justify-center rounded-full edge transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.97] before:absolute before:-inset-1 before:content-[''] [&_svg]:size-[18px]",
                playing === card.id
                  ? "bg-text text-canvas"
                  : "bg-plate-2 text-text-2 hoverable:hover:bg-hover hoverable:hover:text-text",
              )}
            >
              <Volume2 aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function JapaneseShelfLink() {
  const { i18n } = useLingui();
  return (
    <MoreLink href={shelfPath({ kind: "languages", name: "japanese" }, i18n.locale)}>
      <Trans>Every Japanese deck</Trans>
    </MoreLink>
  );
}

function TeachersLink() {
  const { i18n } = useLingui();
  return (
    <MoreLink href={localizedPath("teachers", i18n.locale)}>
      <Trans>Lymi for teachers</Trans>
    </MoreLink>
  );
}

/** A link under a section's text, to the page that goes further. */
function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-xs text-sm font-medium text-text-2 hoverable:hover:text-text"
    >
      {children}
      <ArrowRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
    </a>
  );
}

const STATION: SampleCard = {
  label: msg`日本語 · noun`,
  term: "駅",
  language: "ja",
  meaning: msg`Station`,
};

/** The class deck's cards: the phrase added after class and two words from the notes. */
const CLASS_CARDS = [
  JAPANESE.classDeck.added,
  ...JAPANESE.notes.lines.flatMap((line) => {
    const meaning = line.gloss ?? line.meaning;
    return meaning && !line.duplicate && !line.term.includes("(")
      ? [{ term: line.term, meaning }]
      : [];
  }),
];

/** For someone starting Japanese: kana first, then JLPT words, with readings and a native voice. */
export function JapaneseView({ decks }: { decks: PublicDeckSummary[] }) {
  const { i18n } = useLingui();
  const openAppUrl = openLymiUrl();
  const steps = STEPS.filter((step) => decks.some((deck) => deck.slug === step.slug));
  const kana = decks.find((deck) => deck.slug === KANA_DECK);

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <SiteNav openAppUrl={openAppUrl} current="japanese" />
        <Hero
          title={
            <Trans>
              From{" "}
              <span lang="ja" className="font-mincho font-normal">
                あ
              </span>
              <br />
              to{" "}
              <span lang="ja" className="font-mincho font-normal">
                漢字
              </span>
              .
            </Trans>
          }
          lede={i18n._(JAPANESE_BLURB)}
          badge={false}
          cards={JAPANESE_HAND}
          ground={<KanaGround />}
          action={
            kana && (
              <a
                href={addUrl(kana.slug, kana.meaningLanguage)}
                className={buttonClass("primary", "lg")}
              >
                <Trans>Start with kana</Trans>
              </a>
            )
          }
        />
      </header>

      <main>
        <WideSection
          id="furigana"
          title={<Trans>Furigana until you know the word.</Trans>}
          body={
            <Trans>
              One kanji can be read many ways: <span lang="ja">日</span> is{" "}
              <span lang="ja">に</span> in <span lang="ja">日本</span> and{" "}
              <span lang="ja">にち</span> in <span lang="ja">毎日</span>. So Lymi shows the reading
              while you learn a word, as your textbook does, and takes it away once you know it.
            </Trans>
          }
        >
          <ReadingStages />
        </WideSection>

        <WideSection
          id="decks"
          title={<Trans>One step at a time, from kana to N4.</Trans>}
          body={
            <Trans>
              Japanese is written in three scripts, so you learn it in order. First the kana: the
              sounds of hiragana and katakana. Then everyday N5-level words, kanji and all, and
              N4-level words after them. Each step is a ready-made deck, so you don’t start from
              scratch.
            </Trans>
          }
        >
          <PathSteps steps={steps} />
          <div className="mt-14">
            <JapaneseDecks decks={decks} steps={steps} />
          </div>
          <div className="mt-8">
            <JapaneseShelfLink />
          </div>
        </WideSection>

        <FeatureSection
          demoFirst
          title={<Trans>Hear every word.</Trans>}
          body={
            <Trans>
              In Lymi a native Japanese voice reads every card from its kana reading, so{" "}
              <span lang="ja">今日</span> comes out <span lang="ja">きょう</span>, never a guess
              from the kanji. The words here are generated samples.
            </Trans>
          }
        >
          <VoiceList />
        </FeatureSection>
        <FeatureSection
          title={<Trans>Bring your AI along.</Trans>}
          body={
            <Trans>
              Connect Claude, ChatGPT, Gemini or Grok to Lymi once. Send a photo of your textbook
              page and your assistant adds the new words, readings included. Ask what’s waiting
              tonight, or tidy a deck in plain language. Building something of your own? It all
              works through the public API too.
            </Trans>
          }
          after={<AssistantMarksWithMore />}
        >
          <AssistantChat
            conversation={[
              {
                from: "you",
                body: (
                  <>
                    <Attachment name="IMG_2041.jpg" kind={<Trans>Photo</Trans>} photo />
                    <Trans>Today’s textbook page. Add the new words to my Japanese deck.</Trans>
                  </>
                ),
              },
              {
                from: "them",
                body: (
                  <Added card={STATION}>
                    <Trans>
                      Added 7 cards to Japanese, readings included. I skipped{" "}
                      <span lang="ja">食べる</span>, which you already have.
                    </Trans>
                  </Added>
                ),
              },
              { from: "you", body: <Trans>How many are waiting for me tonight?</Trans> },
              {
                from: "them",
                body: <Trans>Eighteen. Today’s new words will come up a few at a time.</Trans>,
              },
            ]}
          />
        </FeatureSection>

        <FeatureSection
          demoFirst
          title={<Trans>Learn together.</Trans>}
          body={
            <Trans>
              Studying with friends or a class? Make one deck and share its join link. Every card
              you add reaches everyone who joined, and each person keeps their own schedule.
            </Trans>
          }
          after={<TeachersLink />}
        >
          <SharedDeckDemo name={JAPANESE.classDeck.name} language="ja" cards={CLASS_CARDS} />
        </FeatureSection>

        <FeatureSection
          title={<Trans>Bring your Anki decks with their recordings.</Trans>}
          body={
            <Trans>
              Many Japanese decks on Anki come with a native speaker’s recording of every word.
              Import yours and each card keeps its recording, reading and due date, and pitch accent
              written as text comes along in its notes. Lymi plays the recording instead of a
              generated voice.
            </Trans>
          }
          after={
            <MoreLink href="/docs/import-from-anki">
              <Trans>How to import from Anki</Trans>
            </MoreLink>
          }
        >
          <ImportDemo
            collection={{
              app: "Anki",
              fileName: "Japanese.apkg",
              megabytes: 96,
              cards: 1500,
              reviews: 8240,
              decks: 1,
              recordings: 1500,
            }}
          />
        </FeatureSection>

        <Questions title={<Trans>Questions before you start.</Trans>} items={JAPANESE_QUESTIONS} />

        <SignUpSection
          title={
            <Trans>
              Start with <span lang="ja">あ</span>.
            </Trans>
          }
        />
      </main>

      <SiteFooter openAppUrl={openAppUrl} page="japanese" />
    </div>
  );
}
