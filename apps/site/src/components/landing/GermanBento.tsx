import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { EXAMS } from "../../lib/exams";
import {
  BENTO_HUES,
  CheckList,
  ExamLink,
  Examples,
  LanguageBento,
  Meanings,
  Tile,
} from "./LanguageBento";

const GOETHE = EXAMS.find((exam) => exam.id === "goethe");

const EXAMPLES = [
  { text: "Mach bitte das Fenster zu.", translation: msg`Please close the window.` },
  { text: "Wir steigen in Köln um.", translation: msg`We change trains in Cologne.` },
];

const MEANINGS = [
  { language: "English", lang: "en", meaning: "Window" },
  { language: "Українська", lang: "uk", meaning: "Вікно" },
  { language: "Русский", lang: "ru", meaning: "Окно" },
];

/** German learners' own needs, with examples you can hear across the top. */
export function GermanBento() {
  return (
    <LanguageBento layout="wide">
      <Tile
        wide
        hue={BENTO_HUES[0]}
        title={<Trans>Examples you can hear</Trans>}
        body={
          <Trans>
            Every example comes with a translation, and a native voice reads the whole sentence.
          </Trans>
        }
      >
        <Examples lang="de" examples={EXAMPLES} />
      </Tile>

      <Tile
        hue={BENTO_HUES[1]}
        title={<Trans>Meanings in your language</Trans>}
        body={
          <Trans>
            The ready-made German decks come with meanings in English, Ukrainian or Russian, and
            Lymi itself is in all three.
          </Trans>
        }
      >
        <Meanings lang="de" term="das Fenster" meanings={MEANINGS} />
      </Tile>

      <Tile
        hue={BENTO_HUES[2]}
        title={<Trans>Ready for the Goethe-Zertifikat</Trans>}
        body={
          <Trans>
            Free decks teach the words for Goethe-Zertifikat A1, A2 and B1, one level at a time.
          </Trans>
        }
      >
        <ExamLink exam={GOETHE} />
      </Tile>

      <Tile
        hue={BENTO_HUES[3]}
        title={<Trans>Bring your old decks</Trans>}
        body={
          <Trans>
            Studied German somewhere else? Bring your cards along. From Anki they keep their
            recordings and their schedule.
          </Trans>
        }
      >
        <CheckList items={["Anki", "Quizlet", "Mochi", "Noji"]} />
      </Tile>
    </LanguageBento>
  );
}
