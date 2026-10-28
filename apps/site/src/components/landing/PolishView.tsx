import "@fontsource/caveat/500.css";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import type { ReactNode } from "react";
import type { Locale } from "../../lib/routes";
import { ArrowLink } from "./ArrowLink";
import { Attachment } from "./AssistantChat";
import { FeatureSection, Wide } from "./FeatureSection";
import { POLISH_QUESTIONS } from "./faq";
import { LandingLayout } from "./LandingLayout";
import { LanguageDecks } from "./LanguageDecks";
import {
  EnrichSection,
  LanguageHero,
  LanguageName,
  OwnAiSection,
  ReturnSection,
  StartSection,
  TogetherSection,
  VoiceSection,
} from "./LanguageSections";
import { LookAlikes } from "./LookAlikes";
import { addDeckUrl, pathSteps } from "./language-decks";
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
import { SignUpSection } from "./SignUpSection";

const FIRST_DECK = "polish-a1-vocabulary";
const OFFICE_DECK = "polish-for-offices-and-paperwork";
const B1_DECK = "polish-b1-vocabulary";

const Pl = ({ children }: { children: ReactNode }) => <span lang="pl">{children}</span>;

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
  const reader = locale === "en" ? null : locale;
  const firstDeck = decks.find((d) => d.slug === FIRST_DECK);
  const office = decks.find((d) => d.slug === OFFICE_DECK);
  const b1 = decks.find((d) => d.slug === B1_DECK);
  const steps = pathSteps(POLISH_PATH, decks);

  return (
    <LandingLayout
      page="polish"
      hero={
        <LanguageHero
          kicker={<LanguageName lang="pl">Polski</LanguageName>}
          title={<Trans>The flashcard app that gets Polish.</Trans>}
          lede={
            locale === "en" ? (
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
            )
          }
          start={
            firstDeck && {
              href: addDeckUrl(firstDeck),
              label: <Trans>Start with A1 words</Trans>,
            }
          }
          cards={polishHand(locale)}
          examples={POLISH_EXAMPLES}
          lang="pl"
        />
      }
    >
      {reader ? (
        <Wide
          title={<Trans>Looks familiar. Means something else.</Trans>}
          body={
            <Trans>
              <Pl>Sklep</Pl> is a shop, not a crypt, and <Pl>dynia</Pl> is a pumpkin, not a melon.
              The ready-made decks say in a card’s notes where a Polish word only looks like yours,
              and AI writes the same note for the words you add.
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
              Polish changes a word’s ending, and sometimes its middle: <Pl>pies</Pl>, <Pl>psa</Pl>,{" "}
              <Pl>o psie</Pl>. Verbs come in pairs: <Pl>robić</Pl> while you do it, <Pl>zrobić</Pl>{" "}
              once it’s done. The decks keep the forms in each card’s notes, and AI adds them to the
              words you save.
            </Trans>
          }
        >
          <PolishForms />
        </Wide>
      )}

      <ReturnSection lang="pl" term={() => (reader ? "sklep" : "pies")} />

      {steps.length > 1 && (
        <StartSection
          title={<Trans>Start with A1. Keep going.</Trans>}
          body={
            <Trans>
              Free decks that follow the topics of Poland’s state exams. Take A1, then A2, with the
              core words beside them. Each day adds a few new words to your reviews.
            </Trans>
          }
          steps={steps}
          lang="pl"
        />
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
              <p className="text-md text-pretty text-ink-secondary">
                <Trans>
                  Polish citizenship asks for Polish at B1. Since 1 July 2025 a post-secondary
                  school certificate no longer shows it, so most people take the state B1 exam. The
                  A1, A2 and B1 decks follow the state exams’ topics, one level after another.
                </Trans>
              </p>
              {b1 && (
                <ArrowLink href={addDeckUrl(b1)} className="mt-4">
                  {b1.name}
                </ArrowLink>
              )}
            </>
          }
        >
          <OfficeDeck deck={office} words={OFFICE_WORDS} locale={locale} />
        </FeatureSection>
      )}

      <VoiceSection
        body={
          <Trans>
            A native Polish AI voice reads every card, so <Pl>ą</Pl>, <Pl>ę</Pl>, <Pl>rz</Pl> and{" "}
            <Pl>szcz</Pl> sound the way they should. Tap a word to hear it. If a card has its own
            recording, that plays instead.
          </Trans>
        }
        words={POLISH_VOICE_WORDS}
        lang="pl"
        folder="polish"
      />

      <EnrichSection
        body={
          reader ? (
            <Trans>
              Add a word from today’s lesson. AI writes an example, the forms you need, and a note
              when the word looks like one you know but means something else. It fills only what you
              left empty and marks what it wrote.
            </Trans>
          ) : (
            <Trans>
              Add a word from today’s lesson. AI writes an example and the forms you need, and marks
              the stress on the few words that break the rule. It fills only what you left empty and
              marks what it wrote.
            </Trans>
          )
        }
      >
        <EnrichPolish locale={locale} />
      </EnrichSection>

      <OwnAiSection
        body={
          <Trans>
            Connect ChatGPT, Claude or another assistant. Send it a photo of today’s notes and it
            adds the new words, or ask how many cards are waiting tonight.
          </Trans>
        }
        attachment={<Attachment name="IMG_2041.jpg" kind={<Trans>Photo</Trans>} photo />}
        ask={<Trans>Notes from today’s Polish lesson. Add the new words to my deck.</Trans>}
        card={{
          label: msg`Polski · new`,
          term: "zameldowanie",
          language: "pl",
          meaning: msg`Address registration`,
        }}
        added={
          <Trans>
            Added 9 cards to Polish. I skipped <Pl>sklep</Pl>, which you already have.
          </Trans>
        }
        waiting={<Trans>Eighteen. The new words will come up a few at a time.</Trans>}
      />

      <TogetherSection name={msg`Thursday Polish class`} language="pl" cards={POLISH_CLASS_CARDS} />

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
    </LandingLayout>
  );
}
