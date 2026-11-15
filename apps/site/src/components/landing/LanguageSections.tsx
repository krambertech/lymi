import type { MessageDescriptor } from "@lingui/core";
import { Trans, useLingui } from "@lingui/react/macro";
import { type ComponentProps, type ReactNode, useState } from "react";
import { localizedPath } from "../../lib/routes";
import { ArrowLink } from "./ArrowLink";
import { Added, AssistantChat } from "./AssistantChat";
import { AssistantMarksWithMore } from "./AssistantMarks";
import type { SampleCard } from "./cards";
import { DeckPath } from "./DeckPath";
import { FeatureSection, Wide } from "./FeatureSection";
import { type Example, HandExamples } from "./HandExamples";
import { HandOfCards } from "./HandOfCards";
import { Hero } from "./Hero";
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
  examples: Record<string, Example[]>;
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
      <span aria-hidden="true" className="language-pool pointer-events-none absolute inset-0" />
      <Hero visualWidth={500}>
        <Hero.Copy>
          {kicker}
          <div className={narrow ? "max-w-[460px]" : "max-w-[480px]"}>
            <Hero.Title size="page">{title}</Hero.Title>
          </div>
          <Hero.Lede>{lede}</Hero.Lede>
          <Hero.Actions secondary={start && { ...start, variant: "secondary" }} />
        </Hero.Copy>
        <Hero.Visual>
          <div className="relative pt-24 pb-4">
            <HandExamples front={front} examples={examples} lang={lang} />
            <div className="relative">
              <HandOfCards cards={cards} layout="side" onFront={setFront} quiet ordered />
            </div>
          </div>
        </Hero.Visual>
      </Hero>
    </div>
  );
}

interface ReturnProps {
  lang: string;
  /** The card's face at one review, told whether the card is Known by then. */
  term: (known: boolean) => ReactNode;
  /** A page that isn't about words says it in its own terms. */
  title?: ReactNode;
  body?: ReactNode;
}

/** One card coming back later each time it is remembered. */
export function ReturnSection({ lang, term, title, body }: ReturnProps) {
  return (
    <Wide
      title={title ?? <Trans>The gaps grow as you learn.</Trans>}
      body={
        body ?? (
          <Trans>
            Each time you remember a word, Lymi waits longer before showing it again. Forget it, and
            it comes back soon.
          </Trans>
        )
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
  /** A link under the path, such as the exam the decks lead to. */
  after?: ReactNode;
}

/** The free beginner decks in the order to take them. */
export function StartSection({ title, body, steps, lang, after }: StartProps) {
  return (
    <Wide id="start" title={title} body={body}>
      <DeckPath steps={steps} lang={lang} />
      {after && <div className="mt-8">{after}</div>}
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
    <Wide title={title ?? <Trans>Hear each word said aloud.</Trans>} body={body}>
      <VoiceTiles words={words} lang={lang} folder={folder} />
    </Wide>
  );
}

/** One word typed, and the rest of its card filled in by AI. */
export function EnrichSection({ body, children }: { body: ReactNode; children: ReactNode }) {
  return (
    <FeatureSection title={<Trans>Type a word. AI fills in the rest.</Trans>} body={body}>
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
      title={<Trans>Connect your AI assistant.</Trans>}
      body={body}
      after={
        api ? (
          <>
            <AssistantMarksWithMore />
            <p className="mt-8 text-md text-pretty text-ink-secondary">
              <Trans>
                Building something of your own? Lymi has a full API.{" "}
                <a
                  href="/docs/api"
                  className="font-medium text-ink underline decoration-edge-strong underline-offset-4 hoverable:hover:decoration-ink"
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
      title={<Trans>Share a deck with your class.</Trans>}
      body={
        body ?? (
          <Trans>
            Review a deck with your class, your tutor or a friend. One of you adds the words after
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

/** Smart add on a page of class notes: the photo becomes cards with no assistant in between. */
export function NotesSection({ children }: { children: ReactNode }) {
  return (
    <Wide
      title={<Trans>Turn your class notes into cards.</Trans>}
      body={
        <Trans>
          Take a photo of your notebook or the whiteboard, or drop in a PDF from class. The new
          words become cards, and the ones you already have are left out. No assistant needed.
        </Trans>
      }
    >
      {children}
    </Wide>
  );
}

/** The language's own small touches, gathered in a bento. */
export function DetailsSection({
  title,
  body,
  children,
}: {
  title: ReactNode;
  /** Replaces the language pages' line, which reads oddly on pages that aren't about studying. */
  body?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Wide
      title={title}
      body={body ?? <Trans>Details that help once you’re past the basics.</Trans>}
    >
      {children}
    </Wide>
  );
}
