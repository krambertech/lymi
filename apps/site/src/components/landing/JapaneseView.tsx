import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight, Volume2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { deckPath } from "../../lib/deck-page";
import { openLymiUrl, productUrl } from "../../lib/origins";
import type { Locale } from "../../lib/routes";
import { buttonClass } from "../Button";
import { FeatureSection } from "./FeatureSection";
import { Furigana } from "./Furigana";
import { JAPANESE_QUESTIONS } from "./faq";
import { Hero } from "./Hero";
import { ImportDemo } from "./ImportDemo";
import { NotesSection } from "./LanguagesView";
import { JAPANESE, JAPANESE_HAND, type LanguageCard } from "./language-cards";
import { Pick } from "./MaterialToCards";
import { Questions } from "./Questions";
import { ReadingDemo } from "./ReadingDemo";
import { SignUpSection } from "./SignUpSection";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";

export const JAPANESE_TITLE = msg`Learn Japanese vocabulary with kana and JLPT decks · Lymi`;
export const JAPANESE_BLURB = msg`Start with hiragana and katakana, then the words for JLPT N5 and N4. Furigana sits over the kanji until you know a word, and a native Japanese voice reads every card.`;

/** The published kana deck, which Welcome also offers a Japanese beginner first. */
const KANA_DECK = "read-japanese-kana";

/** The beginner's way in, in order: the same decks Welcome offers first. */
const PATH: { slug: string; glyph: string; name: MessageDescriptor; detail: MessageDescriptor }[] =
  [
    {
      slug: KANA_DECK,
      glyph: "あア",
      name: msg`Hiragana and katakana`,
      detail: msg`Every sign with its sound, a few rows at a time.`,
    },
    {
      slug: "japanese-n5-vocabulary-practice",
      glyph: "食",
      name: msg`JLPT N5 words`,
      detail: msg`The everyday words of the first level.`,
    },
    {
      slug: "japanese-n4-vocabulary",
      glyph: "経",
      name: msg`JLPT N4 words`,
      detail: msg`The next level, once N5 feels easy.`,
    },
  ];

const HERO_IDS = JAPANESE_HAND.map((card) => card.id);

/**
 * The page of the learner's notebook the hand came from, written down the page as Japanese is,
 * with the top card's word lit where it was written.
 */
function NotebookPage({ mark }: { mark: (i: number, text: ReactNode) => ReactNode }) {
  return (
    <div className="rounded-2xl bg-plate p-5 pb-24 edge">
      <p lang="ja" className="text-xs text-muted">
        日本語 · 第3課
      </p>
      <div
        lang="ja"
        className="mt-4 h-[236px] overflow-hidden bg-[linear-gradient(to_left,var(--color-edge)_1px,transparent_1px)] bg-size-[2.75rem_100%] bg-right text-lg leading-[2.75rem] text-text [writing-mode:vertical-rl]"
      >
        <p>{mark(0, <Furigana term="お疲れ様です" reading="おつかれさまです" lang="ja" />)}。</p>
        <p>
          {mark(1, <Furigana term="箸" reading="はし" lang="ja" />)}と
          <Furigana term="橋" reading="はし" lang="ja" />
        </p>
        <p>{mark(2, <Furigana term="木漏れ日" reading="こもれび" lang="ja" />)}がきれい。</p>
        <p>{mark(3, "いただきます")}。</p>
        <p>{mark(4, <Furigana term="積ん読" reading="つんどく" lang="ja" />)}</p>
      </div>
    </div>
  );
}

/** The beginner's decks as numbered steps, each opening its page in Explore. */
function ScriptPath() {
  const { t, i18n } = useLingui();
  return (
    <ol aria-label={t`Decks to start with`} className="mx-auto grid w-full max-w-[440px] gap-2.5">
      {PATH.map((step) => (
        <li key={step.slug}>
          <a
            href={deckPath(step.slug, i18n.locale as Locale)}
            className="flex items-center gap-4 rounded-2xl bg-plate p-3.5 edge transition-colors duration-150 hoverable:hover:bg-hover"
          >
            <span
              lang="ja"
              aria-hidden="true"
              className="grid h-14 w-16 shrink-0 place-items-center rounded-xl bg-plate-2 text-xl font-medium text-text"
            >
              {step.glyph}
            </span>
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="text-md font-medium text-text">{i18n._(step.name)}</span>
              <span className="text-sm text-pretty text-muted">{i18n._(step.detail)}</span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="size-4 shrink-0 text-muted rtl:-scale-x-100"
            />
          </a>
        </li>
      ))}
    </ol>
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

function AnkiGuideLink() {
  return (
    <a
      href="/docs/import-from-anki"
      className="inline-flex items-center gap-1.5 rounded-xs text-sm font-medium text-text-2 hoverable:hover:text-text"
    >
      <Trans>How to import from Anki</Trans>
      <ArrowRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
    </a>
  );
}

/** For someone starting Japanese: kana first, then JLPT words, with readings and a native voice. */
export function JapaneseView() {
  const openAppUrl = openLymiUrl();

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <SiteNav openAppUrl={openAppUrl} current="japanese" />
        <Hero
          title={
            <Trans>
              From <span lang="ja">あ</span> to <span lang="ja">漢字</span>.
            </Trans>
          }
          lede={
            <Trans>
              Start with hiragana and katakana, then the words for JLPT N5 and N4. Furigana sits
              over the kanji until you know each word, and a native Japanese voice reads every card.
            </Trans>
          }
          cards={JAPANESE_HAND}
          behind={(front) => (
            <NotebookPage mark={(i, text) => <Pick on={front === HERO_IDS[i]}>{text}</Pick>} />
          )}
          action={
            <a href={productUrl(`/add/${KANA_DECK}`)} className={buttonClass("primary", "lg")}>
              <Trans>Start with kana</Trans>
            </a>
          }
        />
      </header>

      <main>
        <FeatureSection
          id="start"
          demoFirst
          title={<Trans>Three scripts, one at a time.</Trans>}
          body={
            <Trans>
              Japanese is written in hiragana, katakana and kanji. Learn the kana first, every sign
              with its sound. Then move on to the words of JLPT N5 and N4, kanji and all. Add a deck
              and its first cards are ready to review.
            </Trans>
          }
        >
          <ScriptPath />
        </FeatureSection>

        <FeatureSection
          title={<Trans>Furigana until you know the word.</Trans>}
          body={
            <Trans>
              One kanji can be read many ways: <span lang="ja">日</span> is{" "}
              <span lang="ja">に</span> in <span lang="ja">日本</span> and{" "}
              <span lang="ja">にち</span> in <span lang="ja">毎日</span>. So while a card is new,
              its reading sits over the kanji, as in your textbook. Once you know the word, the
              reading waits until you turn the card, and you read the kanji yourself.
            </Trans>
          }
        >
          <ReadingDemo />
        </FeatureSection>

        <FeatureSection
          demoFirst
          title={<Trans>A native Japanese voice.</Trans>}
          body={
            <Trans>
              Every card is read aloud in a native Japanese voice. It says the word from its kana
              reading, so <span lang="ja">今日</span> comes out <span lang="ja">きょう</span>, never
              a guess from the kanji.
            </Trans>
          }
        >
          <VoiceList />
        </FeatureSection>

        <FeatureSection
          title={<Trans>Bring your Anki decks with their recordings.</Trans>}
          body={
            <Trans>
              Many Japanese decks on Anki come with a native speaker’s recording of every word.
              Import yours and each card keeps its recording, reading, pitch accent and due date.
              Lymi plays the recording instead of a generated voice.
            </Trans>
          }
          after={<AnkiGuideLink />}
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

        <NotesSection notebooks={[JAPANESE]} />

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
