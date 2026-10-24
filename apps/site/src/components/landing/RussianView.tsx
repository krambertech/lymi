import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import type { ReactNode } from "react";
import type { Locale } from "../../lib/routes";
import { RUSSIAN_QUESTIONS } from "./faq";
import { EnrichRussian } from "./RussianAi";
import {
  RUSSIAN_CLASS_CARDS,
  RUSSIAN_EXAMPLES,
  RUSSIAN_HAND,
  RUSSIAN_PAIRS,
  RUSSIAN_PATH,
  RUSSIAN_VOICE_WORDS,
} from "./russian";
import { type StressPage, StressView } from "./StressView";

const Ru = ({ children }: { children: ReactNode }) => <span lang="ru">{children}</span>;

const RUSSIAN: StressPage = {
  page: "russian",
  lang: "ru",
  kicker: "Русский",
  hand: RUSSIAN_HAND,
  examples: RUSSIAN_EXAMPLES,
  pairs: RUSSIAN_PAIRS,
  returning: { plain: "молоко", marked: "молоко́" },
  path: RUSSIAN_PATH,
  voice: RUSSIAN_VOICE_WORDS,
  classCards: RUSSIAN_CLASS_CARDS,
  className: msg`Thursday Russian class`,
  questions: RUSSIAN_QUESTIONS,
  added: { label: msg`Русский · new`, term: "биле́т", meaning: msg`Ticket` },
  enrich: <EnrichRussian />,
  copy: {
    headline: <Trans>The flashcard app that gets Russian.</Trans>,
    lede: (
      <Trans>
        Keep the words from your lessons and your books in one place. Each card marks its stress
        until you know the word, and a native voice says it.
      </Trans>
    ),
    pairs: (
      <Trans>
        Russian writes <Ru>за́мок</Ru>, a castle, and <Ru>замо́к</Ru>, a lock, the same way. Only the
        stress tells them apart. Lymi keeps each as its own card, with its own stress and its own
        sound.
      </Trans>
    ),
    returning: (
      <Trans>
        A card shows its stress mark until you know the word, then the word as books print it. Each
        time you remember it, Lymi waits a little longer before showing it again. Turning the card
        over always shows the mark.
      </Trans>
    ),
    enrich: (
      <Trans>
        Add a word from today’s lesson. AI marks the stress its meaning calls for, writes an example
        with every stress marked, and names the word it could be mistaken for. It fills only what
        you left empty and marks what it wrote.
      </Trans>
    ),
    ask: <Trans>Add the new words from today’s lesson to my Russian deck.</Trans>,
    skipped: (
      <Trans>
        Added 7 cards with their stress. I skipped <Ru>вокза́л</Ru>, which you already have.
      </Trans>
    ),
    start: (
      <Trans>
        Free decks from the letters to everyday words. Read the alphabet, then take A1 and the core
        words. Each day adds a few new words to your reviews.
      </Trans>
    ),
    voice: (
      <Trans>
        A native Russian AI voice reads every card and stresses the syllable the mark shows, so{" "}
        <Ru>за́мок</Ru> and <Ru>замо́к</Ru> sound different. If a card has its own recording, that
        plays instead.
      </Trans>
    ),
    decks: (
      <Trans>
        Free Russian decks with a voice on every card. Add one in a tap. More are on the way.
      </Trans>
    ),
    allDecks: <Trans>All Russian decks</Trans>,
  },
};

interface Props {
  /** Every published Russian deck in this locale, those a beginner starts from first. */
  decks: PublicDeckSummary[];
  locale: Locale;
}

/** The page for people learning Russian: stress marked until Known, and words told apart by stress. */
export function RussianView({ decks, locale }: Props) {
  return <StressView page={RUSSIAN} decks={decks} locale={locale} />;
}
