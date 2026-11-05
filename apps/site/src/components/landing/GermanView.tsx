import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import type { ReactNode } from "react";
import { type Locale, localizedPath } from "../../lib/routes";
import { ArrowLink } from "./ArrowLink";
import { Attachment } from "./AssistantChat";
import { DeckWords } from "./DeckWords";
import { FeatureSection, Wide } from "./FeatureSection";
import { GERMAN_QUESTIONS } from "./faq";
import { GenderTiles } from "./GenderTiles";
import { EnrichGerman } from "./GermanAi";
import {
  GERMAN_CLASS_CARDS,
  GERMAN_EXAMPLES,
  GERMAN_GENDERS,
  GERMAN_PATH,
  GERMAN_VERBS,
  GERMAN_VOICE_WORDS,
  germanHand,
  RENTING_WORDS,
} from "./german";
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

const FIRST_DECK = "german-a1-vocabulary";
const VERBS_DECK = "german-top-100-verbs";
const WORDS_DECK = "german-top-1000-words";
const RENTING_DECK = "german-for-renting-a-home";
const DOCTOR_DECK = "german-at-the-doctor";

const De = ({ children }: { children: ReactNode }) => <span lang="de">{children}</span>;

interface Props {
  /** Every published German deck in this locale, those a beginner starts from first. */
  decks: PublicDeckSummary[];
  locale: Locale;
}

/** The page for people learning German: every noun with its article, and the words heard most. */
export function GermanView({ decks, locale }: Props) {
  const firstDeck = decks.find((d) => d.slug === FIRST_DECK);
  const verbs = decks.find((d) => d.slug === VERBS_DECK);
  const words = decks.find((d) => d.slug === WORDS_DECK);
  const renting = decks.find((d) => d.slug === RENTING_DECK);
  const doctor = decks.find((d) => d.slug === DOCTOR_DECK);
  const steps = pathSteps(GERMAN_PATH, decks);

  return (
    <LandingLayout
      page="german"
      hero={
        <LanguageHero
          kicker={<LanguageName lang="de">Deutsch</LanguageName>}
          title={<Trans>The flashcard app that gets German.</Trans>}
          lede={
            <Trans>
              Learn German words in a few minutes a day, every noun with its der, die or das. A
              native voice reads every card, and free decks take you from <De>Guten Tag</De> to B1.
            </Trans>
          }
          start={
            firstDeck && {
              href: addDeckUrl(firstDeck),
              label: <Trans>Start with A1 words</Trans>,
            }
          }
          cards={germanHand(locale)}
          examples={GERMAN_EXAMPLES}
          lang="de"
        />
      }
    >
      <Wide
        title={<Trans>Der, die or das, on every noun.</Trans>}
        body={
          <Trans>
            German gives every noun a gender, and the word rarely says which: <De>der Tisch</De>,{" "}
            <De>die Milch</De>, <De>das Brot</De>. The ready-made decks keep each noun with its
            article, so you learn the two together, and AI adds the plural to the nouns you save.
          </Trans>
        }
      >
        <GenderTiles groups={GERMAN_GENDERS} locale={locale} lang="de" folder="german" />
      </Wide>

      <ReturnSection lang="de" term={() => "das Fenster"} />

      {verbs && (
        <FeatureSection
          title={<Trans>The words you’ll hear most, first.</Trans>}
          body={
            <Trans>
              German Top 100 Verbs starts with <De>sein</De>, <De>haben</De> and <De>werden</De>,
              the verbs most sentences lean on. German Top 1000 Words goes on to the thousand most
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
          <DeckWords deck={verbs} words={GERMAN_VERBS} locale={locale} lang="de" folder="german" />
        </FeatureSection>
      )}

      {steps.length > 1 && (
        <StartSection
          title={<Trans>Start with A1. Keep going.</Trans>}
          body={
            <Trans>
              Free decks from A1 to B1, by the topics of everyday life in Germany: home, work, the
              doctor and paperwork. Take one level, then the next. Each day adds a few new words to
              your reviews.
            </Trans>
          }
          steps={steps}
          lang="de"
        />
      )}

      {renting && (
        <FeatureSection
          demoFirst
          title={<Trans>Ready for the flat viewing.</Trans>}
          body={
            <Trans>
              German for Renting a Home has the words and phrases for finding a flat in Germany: the
              advert, the viewing, the deposit and the lease. Hear each one before you go.
            </Trans>
          }
          after={
            <>
              <p className="text-md text-pretty text-ink-secondary">
                <Trans>
                  German at the Doctor does the same for booking an appointment and saying what’s
                  wrong. Applying for citizenship? The Einbürgerungstest page has the Leben in
                  Deutschland questions and your state’s questions as free decks.
                </Trans>
              </p>
              <div className="mt-4 flex flex-col items-start gap-2">
                {doctor && <ArrowLink href={addDeckUrl(doctor)}>{doctor.name}</ArrowLink>}
                <ArrowLink href={localizedPath("einbuergerungstest", locale)}>
                  <Trans>Einbürgerungstest</Trans>
                </ArrowLink>
              </div>
            </>
          }
        >
          <DeckWords
            deck={renting}
            words={RENTING_WORDS}
            locale={locale}
            lang="de"
            folder="german"
          />
        </FeatureSection>
      )}

      <VoiceSection
        body={
          <Trans>
            A native German AI voice reads every card, so <De>ü</De>, <De>ö</De>, <De>ß</De> and the
            long words sound the way they should. Tap a word to hear it. If a card has its own
            recording, that plays instead.
          </Trans>
        }
        words={GERMAN_VOICE_WORDS}
        lang="de"
        folder="german"
      />

      <EnrichSection
        body={
          <Trans>
            Add a word from today’s lesson. AI writes an example, a noun’s plural and a strong
            verb’s forms, with ist or hat. It fills only what you left empty and marks what it
            wrote.
          </Trans>
        }
      >
        <EnrichGerman locale={locale} />
      </EnrichSection>

      <OwnAiSection
        body={
          <Trans>
            Connect ChatGPT, Claude or another assistant. Send it a photo of today’s notes and it
            adds the new words, or ask how many cards are waiting tonight.
          </Trans>
        }
        attachment={<Attachment name="IMG_2041.jpg" kind={<Trans>Photo</Trans>} photo />}
        ask={<Trans>Notes from today’s German lesson. Add the new words to my deck.</Trans>}
        card={{
          label: msg`Deutsch · new`,
          term: "die Kaution",
          language: "de",
          meaning: msg`Security deposit`,
        }}
        added={
          <Trans>
            Added 8 cards to German, each with its article. I skipped <De>die Miete</De>, which you
            already have.
          </Trans>
        }
        waiting={<Trans>Eighteen. The new words will come up a few at a time.</Trans>}
      />

      <TogetherSection name={msg`Tuesday German class`} language="de" cards={GERMAN_CLASS_CARDS} />

      {decks.length > 0 && (
        <LanguageDecks
          decks={decks}
          locale={locale}
          shelf="german"
          body={
            <Trans>
              Free German decks with a native voice on every card, with meanings in English,
              Ukrainian or Russian. Add one in a tap.
            </Trans>
          }
          all={<Trans>All German decks</Trans>}
        />
      )}

      <Questions title={<Trans>Questions before you start.</Trans>} items={GERMAN_QUESTIONS} />

      <SignUpSection
        title={
          <Trans>
            Start with <De>Guten Tag</De> tonight.
          </Trans>
        }
      />
    </LandingLayout>
  );
}
