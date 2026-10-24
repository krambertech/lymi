import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import type { ReactNode } from "react";
import type { Locale } from "../../lib/routes";
import { UKRAINIAN_QUESTIONS } from "./faq";
import { type StressPage, StressView } from "./StressView";
import { EnrichUkrainian } from "./UkrainianAi";
import {
  UKRAINIAN_CLASS_CARDS,
  UKRAINIAN_EXAMPLES,
  UKRAINIAN_HAND,
  UKRAINIAN_PAIRS,
  UKRAINIAN_PATH,
  UKRAINIAN_VOICE_WORDS,
} from "./ukrainian";

const Uk = ({ children }: { children: ReactNode }) => <span lang="uk">{children}</span>;

const UKRAINIAN: StressPage = {
  page: "ukrainian",
  lang: "uk",
  kicker: "Українська",
  hand: UKRAINIAN_HAND,
  examples: UKRAINIAN_EXAMPLES,
  pairs: UKRAINIAN_PAIRS,
  returning: { plain: "неділя", marked: "неді́ля" },
  path: UKRAINIAN_PATH,
  voice: UKRAINIAN_VOICE_WORDS,
  classCards: UKRAINIAN_CLASS_CARDS,
  className: msg`Tuesday Ukrainian class`,
  questions: UKRAINIAN_QUESTIONS,
  added: { label: msg`Українська · new`, term: "по́дорож", meaning: msg`Journey` },
  enrich: <EnrichUkrainian />,
  copy: {
    headline: <Trans>The flashcard app that gets Ukrainian.</Trans>,
    lede: (
      <Trans>
        Keep the words from your lessons and your books in one place. Each card marks its stress
        until you know the word, and a native voice says it.
      </Trans>
    ),
    pairs: (
      <Trans>
        Ukrainian writes <Uk>за́мок</Uk>, a castle, and <Uk>замо́к</Uk>, a lock, the same way. Only
        the stress tells them apart. Lymi keeps each as its own card, with its own stress and its
        own sound.
      </Trans>
    ),
    returning: (
      <Trans>
        A card shows its stress mark until you know the word, then the word as Ukrainians write it.
        Each time you remember it, Lymi waits a little longer before showing it again. Turning the
        card over always shows the mark.
      </Trans>
    ),
    enrich: (
      <Trans>
        Add a word from today’s lesson. AI marks its stress, writes an example in Ukrainian with
        every stress marked, and says when a word looks Russian but means something else. It fills
        only what you left empty and marks what it wrote.
      </Trans>
    ),
    ask: <Trans>Add the new words from today’s lesson to my Ukrainian deck.</Trans>,
    skipped: (
      <Trans>
        Added 7 cards with their stress. I skipped <Uk>квито́к</Uk>, which you already have.
      </Trans>
    ),
    start: (
      <Trans>
        Free decks from the letters to everyday words. Read the alphabet, then take A1 and A2. Each
        day adds a few new words to your reviews.
      </Trans>
    ),
    voice: (
      <Trans>
        A native Ukrainian AI voice reads every card and stresses the syllable the mark shows, so{" "}
        <Uk>за́мок</Uk> and <Uk>замо́к</Uk> sound different. If a card has its own recording, that
        plays instead.
      </Trans>
    ),
    decks: (
      <Trans>
        Free Ukrainian decks with a voice on every card. Add one in a tap. More are on the way.
      </Trans>
    ),
    allDecks: <Trans>All Ukrainian decks</Trans>,
  },
};

interface Props {
  /** Every published Ukrainian deck in this locale, those a beginner starts from first. */
  decks: PublicDeckSummary[];
  locale: Locale;
}

/** The page for people learning Ukrainian: stress marked until Known, words told apart by stress, and Ukrainian, never Russian. */
export function UkrainianView({ decks, locale }: Props) {
  return <StressView page={UKRAINIAN} decks={decks} locale={locale} />;
}
