import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import type { ReactNode } from "react";
import { EXAMS, examPath } from "../../lib/exams";
import type { Locale } from "../../lib/routes";
import { ArrowLink } from "./ArrowLink";
import { Attachment } from "./AssistantChat";
import { DeckWords } from "./DeckWords";
import { FeatureSection, Wide } from "./FeatureSection";
import { SPANISH_QUESTIONS } from "./faq";
import { GenderTiles } from "./GenderTiles";
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
import { addDeckUrl, pathSteps } from "./language-decks";
import { Questions } from "./Questions";
import { SignUpSection } from "./SignUpSection";
import { EnrichSpanish } from "./SpanishAi";
import {
  SPANISH_CLASS_CARDS,
  SPANISH_ESSENTIALS,
  SPANISH_EXAMPLES,
  SPANISH_GENDERS,
  SPANISH_PATH,
  SPANISH_VERBS,
  SPANISH_VOICE_WORDS,
  spanishHand,
} from "./spanish";

const FIRST_DECK = "spanish-a1-vocabulary";
const VERBS_DECK = "spanish-top-100-verbs";
const WORDS_DECK = "spanish-top-1000-words";
const ESSENTIALS_DECK = "travel-spanish";
const CCSE = EXAMS.find((exam) => exam.id === "spain");

const Es = ({ children }: { children: ReactNode }) => <span lang="es">{children}</span>;

interface Props {
  /** Every published Spanish deck in this locale, those a beginner starts from first. */
  decks: PublicDeckSummary[];
  locale: Locale;
}

/** The page for people learning Spanish: the words heard most, and the gender a noun's ending hides. */
export function SpanishView({ decks, locale }: Props) {
  const firstDeck = decks.find((d) => d.slug === FIRST_DECK);
  const verbs = decks.find((d) => d.slug === VERBS_DECK);
  const words = decks.find((d) => d.slug === WORDS_DECK);
  const essentials = decks.find((d) => d.slug === ESSENTIALS_DECK);
  const steps = pathSteps(SPANISH_PATH, decks);

  return (
    <LandingLayout
      page="spanish"
      hero={
        <LanguageHero
          kicker={<LanguageName lang="es">Español</LanguageName>}
          title={<Trans>The flashcard app that gets Spanish.</Trans>}
          lede={
            <Trans>
              Learn the Spanish words you’ll use most, a few minutes a day. A native voice reads
              every card, and free decks take you from <Es>hola</Es> to B1.
            </Trans>
          }
          start={
            firstDeck && {
              href: addDeckUrl(firstDeck),
              label: <Trans>Start with A1 words</Trans>,
            }
          }
          cards={spanishHand(locale)}
          examples={SPANISH_EXAMPLES}
          lang="es"
        />
      }
    >
      <Wide
        title={<Trans>The ending doesn’t always tell.</Trans>}
        body={
          <Trans>
            Most Spanish nouns ending in -o are masculine and most ending in -a are feminine, until{" "}
            <Es>el día</Es> and <Es>la mano</Es>. The ready-made decks keep every noun with its el
            or la, and AI notes the gender wherever the ending hides it.
          </Trans>
        }
      >
        <GenderTiles groups={SPANISH_GENDERS} locale={locale} lang="es" folder="spanish" />
      </Wide>

      <ReturnSection lang="es" term={() => "el día"} />

      {verbs && (
        <FeatureSection
          title={<Trans>The words you’ll hear most, first.</Trans>}
          body={
            <Trans>
              Spanish Top 100 Verbs starts with <Es>ser</Es>, <Es>estar</Es> and <Es>tener</Es>, the
              verbs most sentences lean on. Spanish Top 1000 Words goes on to the thousand most
              common words, fifty at a time.
            </Trans>
          }
          after={
            words && (
              <ArrowLink href={addDeckUrl(words)} className="mt-4">
                {words.name}
              </ArrowLink>
            )
          }
        >
          <DeckWords
            deck={verbs}
            words={SPANISH_VERBS}
            locale={locale}
            lang="es"
            folder="spanish"
          />
        </FeatureSection>
      )}

      {steps.length > 1 && (
        <StartSection
          title={<Trans>Start with A1. Keep going.</Trans>}
          body={
            <Trans>
              Free decks from A1 to B1, one everyday topic at a time. Take A1, then A2 and B1. Each
              day adds a few new words to your reviews.
            </Trans>
          }
          steps={steps}
          lang="es"
        />
      )}

      {essentials && (
        <FeatureSection
          demoFirst
          title={<Trans>Ready for your first day there.</Trans>}
          body={
            <Trans>
              Spanish Essentials has the phrases for a trip or your first weeks in Spain: greetings,
              cafés, trains and asking for help. Hear each one before you go.
            </Trans>
          }
          after={
            CCSE && (
              <>
                <p className="text-md text-pretty text-ink-secondary">
                  <Trans>
                    Applying for Spanish nationality? The CCSE page has every question from the
                    Instituto Cervantes manual as a free deck.
                  </Trans>
                </p>
                <ArrowLink href={examPath(CCSE, locale)} className="mt-4">
                  <Trans>CCSE Spanish nationality test</Trans>
                </ArrowLink>
              </>
            )
          }
        >
          <DeckWords
            deck={essentials}
            words={SPANISH_ESSENTIALS}
            locale={locale}
            lang="es"
            folder="spanish"
          />
        </FeatureSection>
      )}

      <VoiceSection
        body={
          <Trans>
            A native Spanish AI voice reads every card, so <Es>ñ</Es>, the rolled <Es>rr</Es> and
            the silent <Es>h</Es> sound the way they should. Tap a word to hear it. If a card has
            its own recording, that plays instead.
          </Trans>
        }
        words={SPANISH_VOICE_WORDS}
        lang="es"
        folder="spanish"
      />

      <EnrichSection
        body={
          <Trans>
            Add a word from today’s lesson. AI writes an example, a verb’s irregular forms and the
            gender a noun’s ending hides. It fills only what you left empty and marks what it wrote.
          </Trans>
        }
      >
        <EnrichSpanish locale={locale} />
      </EnrichSection>

      <OwnAiSection
        body={
          <Trans>
            Connect ChatGPT, Claude or another assistant. Send it a photo of today’s notes and it
            adds the new words, or ask how many cards are waiting tonight.
          </Trans>
        }
        attachment={<Attachment name="IMG_2041.jpg" kind={<Trans>Photo</Trans>} photo />}
        ask={<Trans>Notes from today’s Spanish lesson. Add the new words to my deck.</Trans>}
        card={{
          label: msg`Español · new`,
          term: "el billete",
          language: "es",
          meaning: msg`Ticket; banknote`,
        }}
        added={
          <Trans>
            Added 9 cards to Spanish. I skipped <Es>la cuenta</Es>, which you already have.
          </Trans>
        }
        waiting={<Trans>Eighteen. The new words will come up a few at a time.</Trans>}
      />

      <TogetherSection
        name={msg`Thursday Spanish class`}
        language="es"
        cards={SPANISH_CLASS_CARDS}
      />

      {decks.length > 0 && (
        <LanguageDecks
          decks={decks}
          locale={locale}
          shelf="spanish"
          body={
            <Trans>
              Free Spanish decks with a native voice on every card, with meanings in English,
              Ukrainian or Russian. Add one in a tap.
            </Trans>
          }
          all={<Trans>All Spanish decks</Trans>}
        />
      )}

      <Questions title={<Trans>Questions before you start.</Trans>} items={SPANISH_QUESTIONS} />

      <SignUpSection
        title={
          <Trans>
            Start with <Es>hola</Es> tonight.
          </Trans>
        }
      />
    </LandingLayout>
  );
}
