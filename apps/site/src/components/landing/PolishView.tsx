import "@fontsource/caveat/500.css";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { ArrowRight } from "lucide-react";
import { type ReactNode, useState } from "react";
import { openLymiUrl, signUpUrl } from "../../lib/origins";
import { type Locale, localizedPath } from "../../lib/routes";
import { buttonClass } from "../Button";
import { addUrl } from "../deck/DeckView";
import { Added, AssistantChat, Attachment } from "./AssistantChat";
import { AssistantMarksWithMore } from "./AssistantMarks";
import { DeckPath } from "./DeckPath";
import { FeatureSection, Wide } from "./FeatureSection";
import { POLISH_QUESTIONS } from "./faq";
import { HandExamples } from "./HandExamples";
import { HandOfCards } from "./HandOfCards";
import { LanguageDecks } from "./LanguageDecks";
import { LookAlikes } from "./LookAlikes";
import { OfficeDeck } from "./OfficeDeck";
import { EnrichPolish } from "./PolishAi";
import { PolishForms } from "./PolishForms";
import {
  lookAlikesFor,
  OFFICE_WORDS,
  POLISH_CLASS_CARDS,
  POLISH_EXAMPLES,
  POLISH_PATH,
  POLISH_VOICE_WORDS,
  polishHand,
} from "./polish";
import { Questions } from "./Questions";
import { ReturnLane } from "./ReturnLane";
import { SharedDeckDemo } from "./SharedDeckDemo";
import { SignUpSection } from "./SignUpSection";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";
import { VoiceTiles } from "./VoiceTiles";

const FIRST_DECK = "polish-a1-vocabulary";
const OFFICE_DECK = "polish-for-offices-and-paperwork";
const B1_DECK = "polish-b1-vocabulary";

/** The edition a deck row was read in, which rides along so the learner gets the same meanings. */
const editionOf = (deck: PublicDeckSummary) =>
  deck.meaningLanguage === "en" ? undefined : deck.meaningLanguage;

const Pl = ({ children }: { children: ReactNode }) => <span lang="pl">{children}</span>;

function Hero({ locale, firstDeck }: { locale: Locale; firstDeck: PublicDeckSummary | undefined }) {
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
          <p lang="pl" className="mb-5 text-md tracking-[0.06em] text-amber-text">
            Polski
          </p>
          <h1 className="max-w-[480px] text-5xl font-medium tracking-[-0.038em] text-balance text-text @4xl:text-[3.5rem] @4xl:leading-[1.02]">
            <Trans>The flashcard app that gets Polish.</Trans>
          </h1>
          <p className="mt-6 max-w-[44ch] text-lg text-pretty text-text-2 @2xl:text-xl">
            {locale === "en" ? (
              <Trans>
                Learn Polish words in a few minutes a day, each with the forms you need to use it. A
                native voice reads every card, and free decks take you from <Pl>dzień dobry</Pl> to
                B1.
              </Trans>
            ) : (
              <Trans>
                Polish looks close to your language, until <Pl>sklep</Pl> turns out to be a shop.
                Learn the words in a few minutes a day, with a note wherever a word only looks
                familiar and a native voice on every card.
              </Trans>
            )}
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <a href={signUpUrl()} className={buttonClass("primary", "lg")}>
              <Trans>Get started</Trans>
            </a>
            {firstDeck && (
              <a
                href={addUrl(firstDeck.slug, editionOf(firstDeck))}
                className={buttonClass("secondary", "lg")}
              >
                <Trans>Start with A1 words</Trans>
              </a>
            )}
          </div>
        </div>
        <div className="relative pt-20 pb-4 @5xl:py-20">
          <HandExamples front={front} examples={POLISH_EXAMPLES} lang="pl" />
          <div className="relative">
            <HandOfCards cards={polishHand(locale)} onFront={setFront} quiet ordered />
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  /** Every published Polish deck in this locale, those a beginner starts from first. */
  decks: PublicDeckSummary[];
  locale: Locale;
}

/**
 * The page for people learning Polish, most of them Ukrainians living in Poland. Ukrainian and
 * Russian readers meet the words that look like theirs; English readers meet a word's forms.
 */
export function PolishView({ decks, locale }: Props) {
  const openAppUrl = openLymiUrl();
  const reader = locale === "en" ? null : locale;
  const office = decks.find((d) => d.slug === OFFICE_DECK);
  const b1 = decks.find((d) => d.slug === B1_DECK);
  const steps = POLISH_PATH.flatMap((step) => {
    const deck = decks.find((d) => d.slug === step.slug);
    return deck
      ? [{ ...step, name: deck.name, count: deck.cardCount, edition: editionOf(deck) }]
      : [];
  });

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <SiteNav openAppUrl={openAppUrl} current="polish" />
        <Hero locale={locale} firstDeck={decks.find((d) => d.slug === FIRST_DECK)} />
      </header>

      <main>
        {reader ? (
          <Wide
            title={<Trans>Looks familiar. Means something else.</Trans>}
            body={
              <Trans>
                <Pl>Sklep</Pl> is a shop, not a crypt, and <Pl>dynia</Pl> is a pumpkin, not a melon.
                The ready-made decks say in a card’s notes where a Polish word only looks like
                yours, and AI writes the same note for the words you add.
              </Trans>
            }
          >
            <LookAlikes words={lookAlikesFor(locale)} reader={reader} />
          </Wide>
        ) : (
          <Wide
            title={<Trans>Every word with its forms.</Trans>}
            body={
              <Trans>
                Polish changes a word’s ending, and sometimes its middle: <Pl>pies</Pl>,{" "}
                <Pl>psa</Pl>, <Pl>o psie</Pl>. Verbs come in pairs: <Pl>robić</Pl> while you do it,{" "}
                <Pl>zrobić</Pl> once it’s done. The decks keep the forms in each card’s notes, and
                AI adds them to the words you save.
              </Trans>
            }
          >
            <PolishForms />
          </Wide>
        )}

        <Wide
          title={<Trans>It comes back just before you’d forget.</Trans>}
          body={
            <Trans>
              Each time you remember a word, Lymi waits a little longer before showing it again. A
              few minutes a day is enough, and the words you learned months ago stay with you.
            </Trans>
          }
        >
          <ReturnLane lang="pl" term={() => (reader ? "sklep" : "pies")} />
        </Wide>

        {steps.length > 1 && (
          <Wide
            id="start"
            title={<Trans>Start with A1. Keep going.</Trans>}
            body={
              <Trans>
                Free decks that follow the topics of Poland’s state exams. Take A1, then A2, with
                the core words beside them. Each day adds a few new words to your reviews.
              </Trans>
            }
          >
            <DeckPath steps={steps} lang="pl" />
          </Wide>
        )}

        {office && (
          <FeatureSection
            demoFirst
            title={<Trans>Ready for the urząd.</Trans>}
            body={
              <Trans>
                Polish for Offices and Paperwork has 50 words and phrases for offices in Poland: the
                queue ticket, the window, the forms, PESEL and the residence card. Hear each one
                before you go.
              </Trans>
            }
            after={
              <>
                <p className="text-md text-pretty text-text-2">
                  <Trans>
                    Polish citizenship asks for Polish at B1. Since 1 July 2025 a post-secondary
                    school certificate no longer shows it, so most people take the state B1 exam.
                    The A1, A2 and B1 decks follow the state exams’ topics, one level after another.
                  </Trans>
                </p>
                {b1 && (
                  <a
                    href={addUrl(b1.slug, editionOf(b1))}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xs text-sm font-medium text-text-2 hoverable:hover:text-text"
                  >
                    {b1.name}
                    <ArrowRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
                  </a>
                )}
              </>
            }
          >
            <OfficeDeck deck={office} words={OFFICE_WORDS} locale={locale} />
          </FeatureSection>
        )}

        <Wide
          title={<Trans>Hear how it’s really said.</Trans>}
          body={
            <Trans>
              A native Polish AI voice reads every card, so <Pl>ą</Pl>, <Pl>ę</Pl>, <Pl>rz</Pl> and{" "}
              <Pl>szcz</Pl> sound the way they should. Tap a word to hear it. If a card has its own
              recording, that plays instead.
            </Trans>
          }
        >
          <VoiceTiles words={POLISH_VOICE_WORDS} lang="pl" folder="polish" />
        </Wide>

        <FeatureSection
          title={<Trans>Type one word. Get a whole card.</Trans>}
          body={
            reader ? (
              <Trans>
                Add a word from today’s lesson. AI writes an example, the forms you need, and a note
                when the word looks like one you know but means something else. It fills only what
                you left empty and marks what it wrote.
              </Trans>
            ) : (
              <Trans>
                Add a word from today’s lesson. AI writes an example and the forms you need, and
                marks the stress on the few words that break the rule. It fills only what you left
                empty and marks what it wrote.
              </Trans>
            )
          }
        >
          <EnrichPolish locale={locale} />
        </FeatureSection>

        <FeatureSection
          id="ai"
          title={<Trans>Bring your own AI.</Trans>}
          body={
            <Trans>
              Connect ChatGPT, Claude or another assistant. Send it a photo of today’s notes and it
              adds the new words, or ask how many cards are waiting tonight.
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
                    <Trans>Notes from today’s Polish lesson. Add the new words to my deck.</Trans>
                  </>
                ),
              },
              {
                from: "them",
                body: (
                  <Added
                    card={{
                      label: msg`Polski · new`,
                      term: "zameldowanie",
                      language: "pl",
                      meaning: msg`Address registration`,
                    }}
                  >
                    <Trans>
                      Added 9 cards to Polish. I skipped <Pl>sklep</Pl>, which you already have.
                    </Trans>
                  </Added>
                ),
              },
              { from: "you", body: <Trans>How many are waiting for me tonight?</Trans> },
              {
                from: "them",
                body: <Trans>Eighteen. The new words will come up a few at a time.</Trans>,
              },
            ]}
          />
        </FeatureSection>

        <FeatureSection
          demoFirst
          title={<Trans>Learning is more fun together.</Trans>}
          body={
            <Trans>
              Study a deck with your class, your tutor or a friend. One of you adds the words after
              each lesson and shares a link, and everyone reviews on their own schedule.
            </Trans>
          }
          after={
            <a
              href={localizedPath("teachers", locale)}
              className="inline-flex items-center gap-1.5 rounded-xs text-sm font-medium text-text-2 hoverable:hover:text-text"
            >
              <Trans>Lymi for teachers</Trans>
              <ArrowRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
            </a>
          }
        >
          <SharedDeckDemo
            name={msg`Thursday Polish class`}
            language="pl"
            cards={POLISH_CLASS_CARDS}
          />
        </FeatureSection>

        {decks.length > 0 && (
          <LanguageDecks
            decks={decks}
            locale={locale}
            shelf="polish"
            body={
              <Trans>
                Free Polish decks with a native voice on every card, with meanings in English,
                Ukrainian or Russian. Add one in a tap.
              </Trans>
            }
            all={<Trans>All Polish decks</Trans>}
          />
        )}

        <Questions title={<Trans>Questions before you start.</Trans>} items={POLISH_QUESTIONS} />

        <SignUpSection
          title={
            <Trans>
              Start with <Pl>dzień dobry</Pl> tonight.
            </Trans>
          }
        />
      </main>

      <SiteFooter openAppUrl={openAppUrl} page="polish" />
    </div>
  );
}
