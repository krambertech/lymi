import type { MessageDescriptor } from "@lingui/core";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ComponentProps, type ReactNode, useState } from "react";
import { signUpUrl } from "../../lib/origins";
import { localizedPath } from "../../lib/routes";
import { buttonClass } from "../Button";
import { ArrowLink } from "./ArrowLink";
import { Added, AssistantChat } from "./AssistantChat";
import { AssistantMarksWithMore } from "./AssistantMarks";
import type { SampleCard } from "./cards";
import { DeckPath } from "./DeckPath";
import { FeatureSection, Wide } from "./FeatureSection";
import { HandExamples } from "./HandExamples";
import { HandOfCards } from "./HandOfCards";
import type { HandCard } from "./hand-cards";
import { ReturnLane } from "./ReturnLane";
import { SharedDeckDemo } from "./SharedDeckDemo";
import { VoiceTiles } from "./VoiceTiles";

/** The language's name in its own script, over the headline. */
export function LanguageName({ lang, children }: { lang: string; children: ReactNode }) {
  return (
    <p lang={lang} className="mb-5 text-md tracking-[0.06em] text-amber-text">
      {children}
    </p>
  );
}

interface HeroProps {
  /** Over the headline: a `LanguageName`, or a mark of the page's own. */
  kicker: ReactNode;
  title: ReactNode;
  lede: ReactNode;
  /** The second button, which adds the deck a beginner starts with. */
  start?: { href: string; label: ReactNode } | undefined;
  cards: readonly HandCard[];
  /** Sentences that drift around the hand, by the id of the card in front. */
  examples: Record<string, string[]>;
  /** The language of the cards and their sentences. */
  lang: string;
  /** A tighter measure, for a headline whose last word would otherwise sit alone. */
  narrow?: boolean | undefined;
}

/** A language page's top: the headline beside a hand of that language's cards, lit from behind. */
export function LanguageHero({
  kicker,
  title,
  lede,
  start,
  cards,
  examples,
  lang,
  narrow,
}: HeroProps) {
  const [front, setFront] = useState<string>();
  return (
    <div className="relative overflow-x-clip">
      {/* The lantern's light, pooled behind the hand. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_48%_62%_at_74%_56%,var(--color-pool),transparent_70%)]"
      />
      <div className="relative mx-auto grid max-w-[1120px] items-center gap-12 px-5 pt-12 pb-20 @2xl:px-10 @4xl:pt-14 @5xl:min-h-[700px] @5xl:grid-cols-[minmax(0,1fr)_minmax(0,500px)] @5xl:gap-14">
        <div className="min-w-0 max-w-[560px]">
          {kicker}
          <h1
            className={`${narrow ? "max-w-[460px]" : "max-w-[480px]"} text-5xl font-medium tracking-[-0.038em] text-balance text-text @4xl:text-[3.5rem] @4xl:leading-[1.02]`}
          >
            {title}
          </h1>
          <p className="mt-6 max-w-[44ch] text-lg text-pretty text-text-2 @2xl:text-xl">{lede}</p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <a href={signUpUrl()} className={buttonClass("primary", "lg")}>
              <Trans>Get started</Trans>
            </a>
            {start && (
              <a href={start.href} className={buttonClass("secondary", "lg")}>
                {start.label}
              </a>
            )}
          </div>
        </div>
        <div className="relative pt-20 pb-4 @5xl:py-20">
          <HandExamples front={front} examples={examples} lang={lang} />
          <div className="relative">
            <HandOfCards cards={cards} onFront={setFront} quiet ordered />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ReturnProps {
  lang: string;
  /** The card's face at one review, told whether the card is Known by then. */
  term: (known: boolean) => ReactNode;
}

/** One card coming back later each time it is remembered. */
export function ReturnSection({ lang, term }: ReturnProps) {
  return (
    <Wide
      title={<Trans>It comes back just before you’d forget.</Trans>}
      body={
        <Trans>
          Each time you remember a word, Lymi waits a little longer before showing it again. A few
          minutes a day is enough, and the words you learned months ago stay with you.
        </Trans>
      }
    >
      <ReturnLane lang={lang} term={term} />
    </Wide>
  );
}

interface StartProps {
  title: ReactNode;
  body: ReactNode;
  steps: ComponentProps<typeof DeckPath>["steps"];
  lang: string;
}

/** The free beginner decks in the order to take them. */
export function StartSection({ title, body, steps, lang }: StartProps) {
  return (
    <Wide id="start" title={title} body={body}>
      <DeckPath steps={steps} lang={lang} />
    </Wide>
  );
}

interface VoiceProps extends ComponentProps<typeof VoiceTiles> {
  /** Says how the language's own sounds come through. */
  body: ReactNode;
  title?: ReactNode;
}

/** Words to tap and hear in the native voice that reads every card. */
export function VoiceSection({ title, body, words, lang, folder }: VoiceProps) {
  return (
    <Wide title={title ?? <Trans>Hear how it’s really said.</Trans>} body={body}>
      <VoiceTiles words={words} lang={lang} folder={folder} />
    </Wide>
  );
}

/** One word typed, and the rest of its card filled in by AI. */
export function EnrichSection({ body, children }: { body: ReactNode; children: ReactNode }) {
  return (
    <FeatureSection title={<Trans>Type one word. Get a whole card.</Trans>} body={body}>
      {children}
    </FeatureSection>
  );
}

interface OwnAiProps {
  body: ReactNode;
  /** What the learner sends: an `Attachment`. */
  attachment: ReactNode;
  ask: ReactNode;
  /** One of the cards the assistant added. */
  card: SampleCard;
  /** The assistant's reply: what it added, and what it skipped. */
  added: ReactNode;
  /** The assistant's answer to how many cards are waiting tonight. */
  waiting: ReactNode;
  /** Adds a line for people who'd rather build on the API. */
  api?: boolean | undefined;
}

/** The assistant the learner already uses, adding a lesson's words to their deck. */
export function OwnAiSection({ body, attachment, ask, card, added, waiting, api }: OwnAiProps) {
  return (
    <FeatureSection
      id="ai"
      title={<Trans>Bring your own AI.</Trans>}
      body={body}
      after={
        api ? (
          <>
            <AssistantMarksWithMore />
            <p className="mt-8 text-md text-pretty text-text-2">
              <Trans>
                Building something of your own? Lymi has a full API.{" "}
                <a
                  href="/docs/api"
                  className="font-medium text-text underline decoration-edge-2 underline-offset-4 hoverable:hover:decoration-text"
                >
                  Read the API docs
                </a>
              </Trans>
            </p>
          </>
        ) : (
          <AssistantMarksWithMore />
        )
      }
    >
      <AssistantChat
        conversation={[
          {
            from: "you",
            body: (
              <>
                {attachment}
                {ask}
              </>
            ),
          },
          { from: "them", body: <Added card={card}>{added}</Added> },
          { from: "you", body: <Trans>How many are waiting for me tonight?</Trans> },
          { from: "them", body: waiting },
        ]}
      />
    </FeatureSection>
  );
}

interface TogetherProps {
  /** The shared deck's name, such as a weekly class. */
  name: MessageDescriptor;
  language: string;
  cards: ComponentProps<typeof SharedDeckDemo>["cards"];
  /** Who studies together, where a class isn't the usual word. */
  body?: ReactNode;
}

/** One deck shared by a class, with the way on to the teachers' page. */
export function TogetherSection({ name, language, cards, body }: TogetherProps) {
  const { i18n } = useLingui();
  return (
    <FeatureSection
      demoFirst
      title={<Trans>Learning is more fun together.</Trans>}
      body={
        body ?? (
          <Trans>
            Study a deck with your class, your tutor or a friend. One of you adds the words after
            each lesson and shares a link, and everyone reviews on their own schedule.
          </Trans>
        )
      }
      after={
        <ArrowLink href={localizedPath("teachers", i18n.locale)}>
          <Trans>Lymi for teachers</Trans>
        </ArrowLink>
      }
    >
      <SharedDeckDemo name={name} language={language} cards={cards} />
    </FeatureSection>
  );
}

/** The language's own small touches, gathered in a bento. */
export function DetailsSection({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <Wide
      title={title}
      body={<Trans>The small things that matter once you’re a few weeks in.</Trans>}
    >
      {children}
    </Wide>
  );
}
