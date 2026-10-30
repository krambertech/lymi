import "@fontsource/caveat/500.css";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import type { Locale } from "../../lib/routes";
import { Attachment } from "./AssistantChat";
import { EnrichEstonian, NotesToCardsEstonian } from "./EstonianAi";
import { EstonianBento } from "./EstonianBento";
import { EstonianForms } from "./EstonianForms";
import {
  ESTONIAN_CLASS_CARDS,
  ESTONIAN_EXAMPLES,
  ESTONIAN_PAGE_HAND,
  ESTONIAN_PATH,
  ESTONIAN_VOICE_WORDS,
} from "./estonian";
import { Wide } from "./FeatureSection";
import { ESTONIAN_QUESTIONS } from "./faq";
import { LandingLayout } from "./LandingLayout";
import { LanguageDecks } from "./LanguageDecks";
import {
  DetailsSection,
  EnrichSection,
  LanguageHero,
  OwnAiSection,
  ReturnSection,
  StartSection,
  TogetherSection,
  VoiceSection,
} from "./LanguageSections";
import { ESTONIAN } from "./language-cards";
import { addDeckUrl, pathSteps } from "./language-decks";
import { EstonianStartup } from "./OriginBadge";
import { Questions } from "./Questions";
import { SignUpSection } from "./SignUpSection";

export const ESTONIAN_TITLE = msg`Learn Estonian vocabulary with flashcards · Lymi`;
export const ESTONIAN_BLURB = msg`A free flashcard app for Estonian, made by an Estonian startup. Every card is read by a native Estonian voice, every word comes with its three forms, and free decks take you from tere to the 1000 most common words.`;

const FIRST_DECK = "everyday-estonian";

interface Props {
  /** Every published Estonian deck in this locale, beginner decks first. */
  decks: PublicDeckSummary[];
  locale: Locale;
}

/** The page for people learning Estonian, from their first tere to the words from class. */
export function EstonianView({ decks, locale }: Props) {
  const firstDeck = decks.find((d) => d.slug === FIRST_DECK);
  const steps = pathSteps(ESTONIAN_PATH, decks);

  return (
    <LandingLayout
      page="estonian"
      hero={
        <LanguageHero
          kicker={<EstonianStartup />}
          title={<Trans>The flashcard app that gets Estonian.</Trans>}
          lede={
            <Trans>
              Learn Estonian words in a few minutes a day, from <span lang="et">tere</span> to the
              words from this week’s class. Hear every card in a native Estonian voice, and learn
              each word with its three forms.
            </Trans>
          }
          start={
            firstDeck && {
              href: addDeckUrl(firstDeck),
              label: <Trans>Start with everyday phrases</Trans>,
            }
          }
          cards={ESTONIAN_PAGE_HAND}
          examples={ESTONIAN_EXAMPLES}
          lang="et"
        />
      }
    >
      <ReturnSection lang="et" term={() => "sõber"} />

      <Wide
        title={<Trans>Every word with its three forms.</Trans>}
        body={
          <Trans>
            Estonian words change their shape: <span lang="et">vesi</span>,{" "}
            <span lang="et">vee</span>, <span lang="et">vett</span>. Learn the three forms with each
            word and the other cases follow from them. The verb deck has them on every card, and AI
            adds them to the words you save.
          </Trans>
        }
      >
        <EstonianForms />
      </Wide>

      {steps.length > 1 && (
        <StartSection
          title={
            <Trans>
              Start with <span lang="et">tere</span>. Keep going.
            </Trans>
          }
          body={
            <Trans>
              Free decks to take one after another. Each day brings a few new words, mixed in with
              your reviews.
            </Trans>
          }
          steps={steps}
          lang="et"
        />
      )}

      <VoiceSection
        body={
          <Trans>
            Every card is read aloud by a native Estonian AI voice, so õ, ü and the long vowels
            sound the way they should. Tap a word to hear it. If your deck has its own recordings,
            those play instead.
          </Trans>
        }
        words={ESTONIAN_VOICE_WORDS}
        lang="et"
        folder="estonian"
      />

      <EnrichSection
        body={
          <Trans>
            Add a word from today’s class and AI fills in the meaning, the three forms, an example
            and a hint to help you remember it. It only fills what you left empty, and marks what it
            wrote.
          </Trans>
        }
      >
        <EnrichEstonian />
      </EnrichSection>

      <Wide
        title={<Trans>Turn your class notes into cards.</Trans>}
        body={
          <Trans>
            Take a photo of your notebook or the whiteboard. The new words become cards, and the
            ones you already have are left out.
          </Trans>
        }
      >
        <NotesToCardsEstonian />
      </Wide>

      <OwnAiSection
        api
        body={
          <Trans>
            Connect Claude, ChatGPT or another assistant once. Send it a photo of today’s notes and
            it adds the new words, or ask what’s waiting for you tonight.
          </Trans>
        }
        attachment={<Attachment name="IMG_3187.jpg" kind={<Trans>Photo</Trans>} photo />}
        ask={<Trans>Notes from today’s Estonian class. Add the new words to my deck.</Trans>}
        card={{
          label: msg`Eesti · new`,
          term: "broneerima",
          language: "et",
          meaning: msg`To book; to reserve`,
        }}
        added={
          <Trans>
            Added 7 cards to Estonian. I skipped <span lang="et">palun</span>, which you already
            have.
          </Trans>
        }
        waiting={<Trans>Fifteen. The new words will come up a few at a time.</Trans>}
      />

      <TogetherSection
        name={ESTONIAN.classDeck.name}
        language="et"
        cards={ESTONIAN_CLASS_CARDS}
        body={
          <Trans>
            Review a deck with your course group, your tutor or a friend. One of you adds the words
            after each lesson and shares a link, and everyone reviews on their own schedule.
          </Trans>
        }
      />

      <DetailsSection title={<Trans>Built with Estonian in mind.</Trans>}>
        <EstonianBento />
      </DetailsSection>

      {decks.length > 0 && (
        <LanguageDecks
          decks={decks}
          locale={locale}
          shelf="estonian"
          body={
            <Trans>
              Free Estonian decks with a native voice on every card, with meanings in English,
              Russian or Ukrainian. Add one in a tap.
            </Trans>
          }
          all={<Trans>All Estonian decks</Trans>}
        />
      )}

      <Questions title={<Trans>Questions before you start.</Trans>} items={ESTONIAN_QUESTIONS} />

      <SignUpSection
        title={
          <Trans>
            Start with <span lang="et">tere</span> tonight.
          </Trans>
        }
      />
    </LandingLayout>
  );
}
